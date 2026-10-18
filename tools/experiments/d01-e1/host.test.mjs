import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { createHost } from './host.mjs'
import { exchange, hello, echo, result } from './client.mjs'
import { createProtocol, encode, decode, VERSION, MAX_FRAME, DEADLINE_MS } from './protocol.mjs'
import { frame } from './framing.mjs'
import { differentUserProbe } from './os-user-probe.mjs'

const candidates = ['loopback', ...(process.platform === 'darwin' ? ['uds'] : []), ...(process.platform === 'win32' && process.env.D01_E1_PIPE_HOST ? ['pipe'] : [])]
const active = async (t, candidate) => { const host = await createHost({ candidate }); t.after(() => host.close()); return host }
const handshake = async descriptor => result(await exchange(descriptor, hello(descriptor)))

test('experiment is a fixed synthetic protocol; the accepted domain contract is not executable', () => {
  const protocol = createProtocol()
  const descriptor = { ...protocol, candidate: 'pipe' }
  for (const method of ['system.hello', 'capabilities.list', 'mutation.status', 'notes.query', 'tasks.query', 'reminders.query', 'planning.queryRange', 'flux.getAttention', 'notes.create', 'tasks.create']) {
    assert.equal(JSON.parse(protocol.handle(encode({ ...hello(descriptor), method }))).ok, false)
  }
  assert.notEqual(VERSION, 'nexus.local.v1')
})

test('strict flat canonical ASCII frames reject duplicate keys, UTF-8 faults, BOM and excess fields', () => {
  for (const raw of [Buffer.from('{"a":1,"a":1}'), Buffer.from('{ "a":1}'), Buffer.from('\ufeff{}'), Buffer.from('{"a":"ä"}'), Buffer.from('{"a":{}}'), Buffer.from('{"a":[]}'), Buffer.from([0xff]), Buffer.alloc(MAX_FRAME + 1)]) assert.throws(() => decode(raw))
  assert.deepEqual(decode(Buffer.from('{"a":1}')), { a: 1 })
  assert.throws(() => frame(Buffer.alloc(0)))
  assert.throws(() => frame(Buffer.alloc(MAX_FRAME + 1)))
})

test('session expiry, bounded session/nonce state and replay do not silently authorize reuse', () => {
  let clock = 0
  const p = createProtocol({ now: () => clock }), descriptor = p
  const request = hello(descriptor)
  const accepted = JSON.parse(p.handle(encode(request)))
  assert.equal(accepted.ok, true)
  assert.equal(JSON.parse(p.handle(encode(request))).ok, false)
  const payload = echo(descriptor, accepted.session)
  assert.equal(JSON.parse(p.handle(encode(payload))).ok, true)
  assert.equal(JSON.parse(p.handle(encode(payload))).ok, false)
  clock = 60_000
  assert.equal(JSON.parse(p.handle(encode(echo(descriptor, accepted.session, 2)))).ok, false)
  for (let index = 0; index < 8; index++) assert.equal(JSON.parse(p.handle(encode(hello(descriptor)))).ok, true)
  assert.equal(JSON.parse(p.handle(encode(hello(descriptor)))).ok, false)
})

for (const candidate of candidates) {
  test(`${candidate}: native handshake, independent reconnect, echo and replay rejection`, async t => {
    const { descriptor } = await active(t, candidate)
    const request = hello(descriptor)
    const h = result(await exchange(descriptor, request))
    assert.equal(h.ok, true)
    assert.equal(h.instance, descriptor.instance)
    const e = echo(descriptor, h.session)
    assert.equal(result(await exchange(descriptor, e)).payload, e.payload)
    assert.equal(result(await exchange(descriptor, e)).ok, false)
    assert.equal(result(await exchange(descriptor, request)).ok, false)
    assert.equal((await handshake(descriptor)).ok, true)
  })
  test(`${candidate}: wrong token/instance, unknown methods and non-synthetic payload are rejected`, async t => {
    const { descriptor } = await active(t, candidate)
    const wrong = { ...hello(descriptor), token: '0'.repeat(64) }
    assert.equal(result(await exchange(descriptor, wrong)).ok, false)
    assert.equal(result(await exchange(descriptor, { ...hello(descriptor), token: `${descriptor.token}\n` })).ok, false)
    assert.equal(result(await exchange(descriptor, { ...hello(descriptor), nonce: `${'0'.repeat(32)}\n` })).ok, false)
    assert.equal(result(await exchange(descriptor, { ...hello(descriptor), instance: '0'.repeat(32) })).ok, false)
    assert.equal(result(await exchange(descriptor, { ...hello(descriptor), method: 'notes.create' })).ok, false)
    assert.equal(result(await exchange(descriptor, { ...hello(descriptor), scope: { kind: 'library' } })).ok, false)
    const h = await handshake(descriptor)
    assert.equal(result(await exchange(descriptor, echo(descriptor, h.session, 1, 'real personal content'))).ok, false)
    assert.equal(result(await exchange(descriptor, echo(descriptor, h.session, 1, 'synthetic:00\n'))).ok, false)
    assert.equal(result(await exchange(descriptor, echo(descriptor, h.session, 1, `synthetic:${'a'.repeat(4096)}`))).ok, true)
    assert.equal(result(await exchange(descriptor, echo(descriptor, h.session, 2, `synthetic:${'a'.repeat(4097)}`))).ok, false)
  })
  test(`${candidate}: close releases endpoint and same endpoint can restart with rotated identity`, async t => {
    const first = await active(t, candidate)
    const saved = { ...first.descriptor }
    const endpoint = candidate === 'loopback' ? Number(new URL(saved.endpoint).port) : candidate === 'pipe' ? saved.endpoint.split('\\').at(-1) : undefined
    await first.close()
    const second = await createHost({ candidate, endpoint })
    t.after(() => second.close())
    assert.notEqual(saved.instance, second.descriptor.instance)
    assert.notEqual(saved.token, second.descriptor.token)
    assert.equal(result(await exchange(second.descriptor, hello(saved))).ok, false)
    assert.equal((await handshake(second.descriptor)).ok, true)
    if (candidate === 'uds') await assert.rejects(fs.lstat(saved.endpoint), { code: 'ENOENT' })
  })
  test(`${candidate}: 32 fresh connections reuse bounded server resources without exhausting slots`, async t => {
    const { descriptor } = await active(t, candidate)
    const h = await handshake(descriptor)
    for (let seq = 1; seq <= 32; seq++) assert.equal(result(await exchange(descriptor, echo(descriptor, h.session, seq))).ok, true)
  })
  if (candidate !== 'uds') test(`${candidate}: duplicate endpoint never displaces the first instance`, async t => {
    const first = await active(t, candidate)
    const endpoint = candidate === 'loopback' ? Number(new URL(first.descriptor.endpoint).port) : first.descriptor.endpoint.split('\\').at(-1)
    await assert.rejects(createHost({ candidate, endpoint }))
    assert.equal((await handshake(first.descriptor)).ok, true)
  })
}

test('native Windows ACL is inspected, remote rejection configured and first instance held', { skip: process.platform !== 'win32' || !process.env.D01_E1_PIPE_HOST ? 'NOT VERIFIED: native Windows helper unavailable' : false }, async t => {
  const host = await active(t, 'pipe')
  assert.equal(host.security.ownerMatches, true)
  assert.equal(host.security.allowCurrentUserOnly, true)
  assert.equal(host.security.rejectRemote, true)
  assert.equal(host.security.firstInstance, true)
  assert.equal(host.security.actualDifferentOsUser, 'NOT VERIFIED')
})

test('native macOS UDS owner and parent/socket permissions are verified', { skip: process.platform !== 'darwin' ? 'NOT VERIFIED: requires macOS, not a Linux substitute' : false }, async t => {
  const host = await active(t, 'uds')
  assert.equal(host.security.ownerMatches, true)
  assert.equal(host.security.directoryMode, '0700')
  assert.equal(host.security.socketMode, '0600')
  await assert.rejects(createHost({ candidate: 'uds', endpoint: host.descriptor.endpoint }))
  assert.equal((await handshake(host.descriptor)).ok, true)
})

test('native macOS different-UID client is denied by the private UDS parent', { skip: process.platform !== 'darwin' ? 'NOT VERIFIED: actual macOS user separation required' : false }, async t => {
  const host = await active(t, 'uds')
  const observed = differentUserProbe(host.descriptor)
  if (observed.status === 'NOT VERIFIED') { t.skip(observed.reason); return }
  assert.match(observed.status, /^VERIFIED:/)
})

test('wrong-platform transports fail explicitly rather than reporting platform evidence', async () => {
  if (process.platform !== 'darwin') await assert.rejects(createHost({ candidate: 'uds' }), /NOT VERIFIED/)
  if (process.platform !== 'win32') await assert.rejects(createHost({ candidate: 'pipe' }), /NOT VERIFIED/)
})

test('loopback rejects Host/Origin/browser/proxy/preflight surfaces and never grants CORS', async t => {
  const { descriptor } = await active(t, 'loopback')
  for (const headers of [
    { Host: 'attacker.invalid' }, { Host: `localhost:${new URL(descriptor.endpoint).port}` },
    { Origin: 'https://attacker.invalid' }, { Origin: 'null' }, { Origin: descriptor.endpoint },
    { 'Sec-Fetch-Site': 'same-origin' }, { 'X-Forwarded-Host': '127.0.0.1' },
    { Forwarded: 'host=127.0.0.1' }, { 'Content-Type': 'text/plain' },
    { Forwarded: '' }, { 'Content-Encoding': '' }, { Upgrade: '' },
    { 'X-Nexus-Experiment-Token': '0'.repeat(64) }, { 'Content-Encoding': 'gzip' },
  ]) {
    const response = await exchange(descriptor, hello(descriptor), headers)
    assert.equal(response.status, 403)
    assert.equal(response.headers['access-control-allow-origin'], undefined)
  }
  assert.equal((await exchange(descriptor, Buffer.alloc(MAX_FRAME + 1, 120))).status, 413)
})

test('loopback holds at most eight connections and destroys idle/partial readers', async t => {
  const { descriptor } = await active(t, 'loopback')
  const port = Number(new URL(descriptor.endpoint).port)
  const peers = []
  t.after(() => peers.forEach(peer => peer.destroy()))
  for (let index = 0; index < 8; index++) {
    const peer = net.connect(port, '127.0.0.1'); peers.push(peer)
    peer.on('error', () => {})
    await new Promise(resolve => peer.once('connect', resolve))
  }
  const extra = net.connect(port, '127.0.0.1'); peers.push(extra)
  extra.on('error', () => {})
  await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Connection cap not enforced')), 1000); extra.once('close', () => { clearTimeout(timeout); resolve() }) })
  peers.forEach(peer => peer.destroy())
})

async function rawHttp(descriptor, raw, partial = false) {
  const { port } = new URL(descriptor.endpoint)
  return new Promise((resolve, reject) => {
    const socket = net.connect(Number(port), '127.0.0.1')
    let response = ''
    const timeout = setTimeout(() => socket.destroy(new Error('Raw probe did not terminate')), DEADLINE_MS + 2000)
    socket.once('connect', () => { socket.write(raw); if (!partial) socket.end() })
    socket.on('data', bytes => { response += bytes.toString('ascii') })
    socket.once('error', error => { if (error.code !== 'ECONNRESET') reject(error) })
    socket.once('close', () => { clearTimeout(timeout); resolve(response) })
  })
}
test('loopback rejects DNS Host aliases, duplicates, WebSocket/CONNECT, absolute targets and chunked HTTP', async t => {
  const { descriptor } = await active(t, 'loopback')
  const host = new URL(descriptor.endpoint).host
  const requests = [
    `OPTIONS /experiment HTTP/1.1\r\nHost: ${host}\r\nOrigin: https://attacker.invalid\r\nAccess-Control-Request-Method: POST\r\n\r\n`,
    `GET /experiment HTTP/1.1\r\nHost: ${host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n`,
    `CONNECT ${host} HTTP/1.1\r\nHost: ${host}\r\n\r\n`,
    `POST http://${host}/experiment HTTP/1.1\r\nHost: ${host}\r\nContent-Length: 2\r\n\r\n{}`,
    `POST /experiment HTTP/1.1\r\nHost: ${host}\r\nHost: ${host}\r\nContent-Length: 2\r\n\r\n{}`,
    `POST /experiment HTTP/1.1\r\nHost: ${host}\r\nTransfer-Encoding: chunked\r\n\r\n2\r\n{}\r\n0\r\n\r\n`,
    `POST /experiment HTTP/1.1\r\nHost: ${host}\r\nContent-Length: 99999\r\n\r\n`,
  ]
  for (const request of requests) assert.doesNotMatch(await rawHttp(descriptor, request), /200 OK|Access-Control-Allow-Origin/i)
  assert.doesNotMatch(await rawHttp(descriptor, `POST /experiment HTTP/1.1\r\nHost: ${host}\r\n`, true), /200 OK/)
})

for (const candidate of candidates.filter(value => value !== 'loopback')) test(`${candidate}: fragmented frame, oversize header and partial deadline are bounded`, async t => {
  const { descriptor } = await active(t, candidate)
  const socket = net.connect(descriptor.endpoint)
  t.after(() => socket.destroy())
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject) })
  const packet = frame(encode(hello(descriptor)))
  const chunks = []
  const response = new Promise((resolve, reject) => { socket.on('data', b => chunks.push(b)); socket.once('end', resolve); socket.once('error', reject); socket.once('close', resolve) })
  socket.write(packet.subarray(0, 2)); await delay(5); socket.write(packet.subarray(2))
  // The native pipe waits for the reader to close; read one bounded frame then close.
  if (candidate === 'pipe') {
    await new Promise(resolve => {
      const finish = () => { const bytes = Buffer.concat(chunks); if (bytes.length >= 4 && bytes.length === bytes.readUInt32BE() + 4) { socket.off('data', finish); socket.end(); resolve() } }
      socket.on('data', finish); finish()
    })
  }
  await response
  assert.equal(JSON.parse(Buffer.concat(chunks).subarray(4).toString()).ok, true)
  for (const bytes of [Buffer.from([0, 1, 0, 0]), Buffer.from([0, 0])]) {
    const start = performance.now()
    await new Promise((resolve, reject) => {
      const peer = net.connect(descriptor.endpoint, () => peer.write(bytes))
      const timeout = setTimeout(() => { peer.destroy(); reject(new Error('Unbounded partial frame')) }, DEADLINE_MS + 1500)
      peer.on('error', () => {}); peer.once('close', () => { clearTimeout(timeout); resolve() })
    })
    assert.ok(performance.now() - start < DEADLINE_MS + 1500)
  }
})

export async function startProcess(candidate, endpoint) {
  const args = [fileURLToPath(new URL('./host.mjs', import.meta.url)), `--candidate=${candidate}`]
  if (endpoint !== undefined) args.push(`--endpoint=${endpoint}`)
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  child.stderr.resume()
  const lines = createInterface({ input: child.stdout })
  const descriptor = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('CLI startup timeout')) }, 12_000)
    child.once('error', reject)
    child.once('exit', () => { clearTimeout(timeout); reject(new Error('CLI exited before startup')) })
    lines.once('line', line => { clearTimeout(timeout); lines.close(); resolve(JSON.parse(line)) })
  })
  return { child, descriptor }
}

for (const candidate of candidates) test(`${candidate}: hard process crash, stale descriptor rejection, restart and cleanup`, async t => {
  const first = await startProcess(candidate)
  t.after(() => { first.child.kill(); first.child.stdin.destroy() })
  assert.equal((await handshake(first.descriptor)).ok, true)
  const exited = new Promise(resolve => first.child.once('exit', resolve))
  first.child.kill('SIGKILL'); await exited
  if (candidate === 'uds') {
    const stale = await fs.lstat(first.descriptor.endpoint)
    assert.equal(stale.isSocket(), true)
    await assert.rejects(createHost({ candidate, endpoint: first.descriptor.endpoint }))
    // Remove only our exact socket inode; no recursive cleanup or link traversal.
    const current = await fs.lstat(first.descriptor.endpoint)
    assert.equal(current.ino, stale.ino); assert.equal(current.dev, stale.dev)
    await fs.unlink(first.descriptor.endpoint)
    await fs.rmdir(path.dirname(first.descriptor.endpoint))
  }
  const endpoint = candidate === 'loopback' ? Number(new URL(first.descriptor.endpoint).port) : candidate === 'pipe' ? first.descriptor.endpoint.split('\\').at(-1) : undefined
  let second
  const until = Date.now() + 5000
  while (!second) { try { second = await createHost({ candidate, endpoint }) } catch (error) { if (Date.now() > until) throw error; await delay(50) } }
  t.after(() => second.close())
  assert.equal(result(await exchange(second.descriptor, hello(first.descriptor))).ok, false)
  assert.equal((await handshake(second.descriptor)).ok, true)
  await second.close()
})
