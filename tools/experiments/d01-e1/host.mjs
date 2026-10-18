// Opt-in laboratory executable. No Electron, core, domain or product imports.
import net from 'node:net'
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createProtocol, VERSION, MAX_FRAME, MAX_CONNECTIONS, DEADLINE_MS } from './protocol.mjs'
import { serveStream } from './framing.mjs'

const listen = (server, options) => new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(options, () => { server.off('error', reject); resolve() })
})
export async function createHost({ candidate, endpoint, nativeHost = process.env.D01_E1_PIPE_HOST, lifetimeMs = 300_000 } = {}) {
  if (!['loopback', 'uds', 'pipe'].includes(candidate)) throw new Error('Specify loopback, uds or pipe')
  if (!Number.isInteger(lifetimeMs) || lifetimeMs < 1000 || lifetimeMs > 300_000) throw new Error('Experiment lifetime must be 1..300 seconds')
  const protocol = createProtocol(), sockets = new Set()
  const boundary = { httpRequests: 0, httpRejected: 0, upgradeRejected: 0 }
  const security = { actualDifferentOsUser: 'NOT VERIFIED', installedElectronPythonPackaging: 'NOT VERIFIED' }
  let server, child, udsDirectory, udsIdentity, hostHeader, closed = false
  const descriptor = { experiment: true, version: VERSION, candidate, instance: protocol.instance, token: protocol.token, maxFrame: MAX_FRAME }
  const connect = socket => {
    if (sockets.size >= MAX_CONNECTIONS) { socket.destroy(); return false }
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
    return true
  }
  if (candidate === 'uds') {
    if (process.platform !== 'darwin') throw new Error('NOT VERIFIED: UDS candidate requires native macOS')
    // Never unlink a caller-provided path, including a stale or symlink endpoint.
    // Only an owned private directory can be reused after a crash, by explicit cleanup outside this API.
    udsDirectory = await fs.mkdtemp(path.join('/tmp', 'nxd01-'))
    await fs.chmod(udsDirectory, 0o700)
    descriptor.endpoint = path.join(udsDirectory, 's')
    if (endpoint !== undefined) {
      await fs.rmdir(udsDirectory)
      throw new Error('UDS endpoint is always fresh; stale endpoints are never automatically removed')
    }
    server = net.createServer(socket => { if (connect(socket)) serveStream(socket, bytes => protocol.handle(bytes)) })
    try {
      await listen(server, { path: descriptor.endpoint })
      await fs.chmod(descriptor.endpoint, 0o600)
      const parent = await fs.lstat(udsDirectory), socket = await fs.lstat(descriptor.endpoint)
      if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== process.getuid() || (parent.mode & 0o777) !== 0o700 || !socket.isSocket() || (socket.mode & 0o777) !== 0o600) throw new Error('Private UDS ownership/mode verification failed')
      udsIdentity = { dev: parent.dev, ino: parent.ino }
      Object.assign(security, { directoryMode: '0700', socketMode: '0600', ownerMatches: true })
    } catch (error) {
      sockets.forEach(s => s.destroy())
      if (server.listening) await new Promise(resolve => server.close(resolve))
      await fs.rmdir(udsDirectory).catch(() => {})
      throw error
    }
  } else if (candidate === 'loopback') {
    let port = 0
    if (endpoint !== undefined) {
      if (!Number.isInteger(endpoint) || endpoint < 1024 || endpoint > 65535) throw new Error('Explicit loopback endpoint must be a nonprivileged port')
      port = endpoint
    }
    server = http.createServer({ maxHeaderSize: 2048, requestTimeout: DEADLINE_MS, headersTimeout: DEADLINE_MS, connectionsCheckingInterval: 100 }, (req, res) => {
      boundary.httpRequests++
      res.setHeader('Connection', 'close')
      res.setHeader('Cache-Control', 'no-store')
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      const deny = status => { boundary.httpRejected++; res.writeHead(status); res.end('{"error":"rejected"}'); req.resume() }
      const counts = new Map()
      for (let i = 0; i < req.rawHeaders.length; i += 2) { const key = req.rawHeaders[i].toLowerCase(); counts.set(key, (counts.get(key) || 0) + 1) }
      if ([...counts.values()].some(count => count !== 1) || req.headers.host !== hostHeader || req.socket.remoteAddress !== '127.0.0.1'
          || req.method !== 'POST' || req.url !== '/experiment' || req.httpVersion !== '1.1'
          || Object.hasOwn(req.headers, 'origin') || Object.keys(req.headers).some(key => key.startsWith('sec-fetch-') || key.startsWith('x-forwarded-'))
          || ['forwarded', 'transfer-encoding', 'content-encoding', 'upgrade', 'expect'].some(key => Object.hasOwn(req.headers, key))
          || req.headers['content-type'] !== 'application/json' || !protocol.authentic(req.headers['x-nexus-experiment-token'])) return deny(403)
      const length = req.headers['content-length']
      if (!/^[1-9][0-9]{0,3}$/.test(length || '') || Number(length) > MAX_FRAME) return deny(413)
      const chunks = []; let bytes = 0
      const deadline = setTimeout(() => req.destroy(), DEADLINE_MS)
      req.once('close', () => clearTimeout(deadline))
      req.on('data', chunk => { bytes += chunk.length; if (bytes > Number(length) || bytes > MAX_FRAME) req.destroy(); else chunks.push(chunk) })
      req.on('end', () => {
        clearTimeout(deadline)
        if (bytes !== Number(length)) return deny(400)
        const result = protocol.handle(Buffer.concat(chunks))
        res.writeHead(200); res.end(result)
      })
      req.on('error', () => {})
    })
    server.maxRequestsPerSocket = 1
    server.keepAliveTimeout = 1
    server.on('connection', socket => { if (connect(socket)) { socket.on('error', () => {}); socket.setTimeout(DEADLINE_MS, () => socket.destroy()) } })
    server.on('upgrade', (_req, socket) => { boundary.upgradeRejected++; socket.destroy() })
    server.on('connect', (_req, socket) => socket.destroy())
    server.on('checkContinue', (req, res) => { res.writeHead(417, { Connection: 'close' }); res.end(); req.resume() })
    server.on('clientError', (_error, socket) => socket.destroy())
    await listen(server, { host: '127.0.0.1', port, exclusive: true })
    hostHeader = `127.0.0.1:${server.address().port}`
    descriptor.endpoint = `http://${hostHeader}/experiment`
    Object.assign(security, { bind: '127.0.0.1', ipv6: 'NOT VERIFIED: not bound', origin: 'all rejected', cors: 'none', token: '256-bit, memory-only, per host', browserExecution: 'NOT VERIFIED', actualDnsRebinding: 'NOT VERIFIED' })
  } else {
    if (process.platform !== 'win32') throw new Error('NOT VERIFIED: Named Pipe candidate requires native Windows')
    if (!nativeHost || !path.isAbsolute(nativeHost) || path.extname(nativeHost) !== '.dll') throw new Error('Build the opt-in native helper and set absolute D01_E1_PIPE_HOST')
    const name = endpoint ?? `nexus-d01e1-${randomBytes(16).toString('hex')}`
    if (!/^nexus-d01e1-[0-9a-f]{32}$(?![\s\S])/.test(name)) throw new Error('Invalid experiment pipe name')
    descriptor.endpoint = `\\\\.\\pipe\\${name}`
    child = spawn('dotnet', [nativeHost, name], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    child.stderr.resume() // No native identity/error details in experiment result logs.
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill(); reject(new Error('Native helper startup timeout')) }, 10_000)
      const fail = () => { clearTimeout(timeout); reject(new Error('Native pipe setup failed (ACL/duplicate instance/runtime)')) }
      child.once('error', fail); child.once('exit', fail)
      lines.on('line', line => {
        try {
          const event = JSON.parse(line)
          if (event.event === 'ready') {
            if (event.ownerMatches !== true || event.allowCurrentUserOnly !== true || event.rejectRemote !== true || event.firstInstance !== true) throw new Error('ACL proof missing')
            Object.assign(security, event); delete security.event
            clearTimeout(timeout); child.off('error', fail); child.off('exit', fail); resolve()
          } else if (event.event === 'frame') {
            const bytes = Buffer.from(event.payload, 'base64')
            if (bytes.length > MAX_FRAME || !Number.isInteger(event.connection)) throw new Error('Invalid helper frame')
            child.stdin.write(`${JSON.stringify({ connection: event.connection, payload: protocol.handle(bytes).toString('base64') })}\n`)
          }
        } catch { child.kill(); fail() }
      })
    })
    child.stdin.on('error', () => {})
    child.on('error', () => {})
  }
  const close = async () => {
    if (closed) return
    closed = true
    clearTimeout(lifetime)
    protocol.clear()
    sockets.forEach(socket => socket.destroy())
    if (server?.listening) await new Promise(resolve => server.close(resolve))
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise(resolve => {
        const timeout = setTimeout(() => { child.kill(); resolve() }, 3000)
        child.once('exit', () => { clearTimeout(timeout); resolve() })
        child.stdin.end()
      })
    }
    if (udsDirectory && udsIdentity) {
      const current = await fs.lstat(udsDirectory).catch(() => null)
      if (current?.isDirectory() && !current.isSymbolicLink() && current.dev === udsIdentity.dev && current.ino === udsIdentity.ino) await fs.rmdir(udsDirectory).catch(() => {})
    }
  }
  const lifetime = setTimeout(() => { void close() }, lifetimeMs)
  lifetime.unref()
  return { descriptor, security, get counters() { return { ...protocol.counters, ...boundary } }, close }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const options = Object.fromEntries(args.map(arg => { const match = /^--(candidate|endpoint|native-host)=(.+)$/.exec(arg); if (!match) throw new Error('Use --candidate=loopback|uds|pipe [--endpoint=port-or-pipe-name] [--native-host=absolute.dll]'); return [match[1], match[2]] }))
  const host = await createHost({ candidate: options.candidate, endpoint: options.endpoint === undefined ? undefined : options.candidate === 'loopback' ? Number(options.endpoint) : options.endpoint, nativeHost: options['native-host'] })
  // Private inherited stdout is the controller channel, never a discovery file or result log.
  process.stdout.write(`${JSON.stringify({ ...host.descriptor, security: host.security })}\n`)
  const shutdown = () => { void host.close().then(() => process.exit(0)) }
  setTimeout(shutdown, 300_000).unref()
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown)
  process.stdin.resume(); process.stdin.once('end', shutdown)
}
