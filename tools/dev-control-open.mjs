import assert from 'node:assert/strict'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnNpm, spawnProcess } from './lib/process-utils.mjs'
import { ensureControlPlane } from './lib/control-plane-guard.mjs'
import { resolveControlUiRoot, resolveHostedControlUrl } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const args = new Set(process.argv.slice(2))

const hostedControlUrl = resolveHostedControlUrl()
const uiPort = Number(process.env.NEXUS_CONTROL_UI_PORT || 5180)
const uiUrl = process.env.NEXUS_CONTROL_UI_URL || `http://localhost:${uiPort}`
const skipOpen = String(process.env.NEXUS_CONTROL_NO_OPEN || '').toLowerCase() === 'true'

const children = []
let shuttingDown = false

const run = (label, args, cwd = ROOT) => {
  const child = spawnNpm(args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    console.error(`\n[${label}] beendet (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
    shutdown(code ?? 1)
  })

  children.push(child)
  return child
}

const waitForPort = (port, host = '127.0.0.1', timeoutMs = 90_000) => {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket()

      socket.setTimeout(1_200)
      socket.once('connect', () => {
        socket.destroy()
        resolve(true)
      })

      socket.once('timeout', () => {
        socket.destroy()
        retryOrFail()
      })

      socket.once('error', () => {
        socket.destroy()
        retryOrFail()
      })

      socket.connect(port, host)
    }

    const retryOrFail = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Port ${port} nicht erreichbar (Timeout nach ${timeoutMs}ms)`))
        return
      }
      setTimeout(tryConnect, 450)
    }

    tryConnect()
  })
}

const isPortReachable = async (port, host = '127.0.0.1', timeoutMs = 1_500) => {
  try {
    await waitForPort(port, host, timeoutMs)
    return true
  } catch {
    return false
  }
}

const isLoopbackHost = (host) => {
  const normalized = String(host || '').trim().toLowerCase().replace(/^\[|\]$/g, '')
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}

const normalizeLoopbackHttpUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    if (!isLoopbackHost(parsed.hostname)) return ''
    if (parsed.username || parsed.password) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

const buildBrowserOpenCommand = (url, platform = process.platform) => {
  const safeUrl = normalizeLoopbackHttpUrl(url)
  if (!safeUrl) return null

  if (platform === 'darwin') return { command: 'open', args: [safeUrl] }
  if (platform === 'win32') {
    return { command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', safeUrl] }
  }
  return { command: 'xdg-open', args: [safeUrl] }
}

const openBrowser = (url) => {
  if (skipOpen) {
    console.log(`\nBrowser-Open uebersprungen (NEXUS_CONTROL_NO_OPEN=true). URL: ${url}`)
    return
  }

  const openCommand = buildBrowserOpenCommand(url)
  if (!openCommand) {
    console.warn(`Browser-Open uebersprungen: nur loopback HTTP(S)-URLs sind erlaubt. URL: ${url}`)
    return
  }

  try {
    const proc = spawnProcess(openCommand.command, openCommand.args, { stdio: 'ignore', detached: true, shell: false })
    proc.unref()
  } catch (error) {
    console.warn(`Browser konnte nicht automatisch geoeffnet werden: ${error.message}`)
    console.warn(`Bitte manuell oeffnen: ${url}`)
  }
}

const shutdown = (exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
    }
    process.exit(exitCode)
  }, 900)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

const runSelfTest = () => {
  assert.equal(normalizeLoopbackHttpUrl('http://localhost:5180'), 'http://localhost:5180/')
  assert.equal(normalizeLoopbackHttpUrl('https://127.0.0.1:5180/control'), 'https://127.0.0.1:5180/control')
  assert.equal(normalizeLoopbackHttpUrl('http://[::1]:5180/'), 'http://[::1]:5180/')
  assert.equal(normalizeLoopbackHttpUrl('https://nexusproject.dev'), '')
  assert.equal(normalizeLoopbackHttpUrl('file:///C:/Windows/System32/calc.exe'), '')

  const windowsOpen = buildBrowserOpenCommand('http://localhost:5180/?next=&calc', 'win32')
  assert.equal(windowsOpen.command, 'rundll32.exe')
  assert.deepEqual(windowsOpen.args, ['url.dll,FileProtocolHandler', 'http://localhost:5180/?next=&calc'])
  assert.equal(buildBrowserOpenCommand('https://nexusproject.dev', 'win32'), null)
  console.log('[dev-control-open:self-test] PASS loopback browser-open policy')
}

if (args.has('--self-test')) {
  runSelfTest()
  process.exit(0)
}

const controlUiRoot = await resolveControlUiRoot({ root: ROOT, required: true, quiet: false })

console.log(`Pruefe Hosted API: ${hostedControlUrl}`)
await ensureControlPlane({
  root: ROOT,
  startIfMissing: false,
  timeoutMs: 10_000,
  quiet: false,
})

console.log('Starte Nexus Control UI (Hosted API Mode)...')

const controlUiRunning = await isPortReachable(uiPort)
if (controlUiRunning) {
  console.log(`Control UI laeuft bereits auf ${uiUrl}`)
} else {
  run('control-ui', ['run', 'dev'], controlUiRoot)
}

try {
  await waitForPort(uiPort)
  console.log(`\nControl UI erreichbar auf ${uiUrl}`)
  console.log(`Hosted API: ${hostedControlUrl}`)
  openBrowser(uiUrl)

  if (children.length === 0) {
    console.log('\nKeine neuen Prozesse gestartet (Control UI lief bereits).')
    process.exit(0)
  }

  console.log('\nDruecke Ctrl+C zum Beenden der gestarteten Prozesse.')
} catch (error) {
  console.error(`\nStartpruefung fehlgeschlagen: ${error.message}`)
  shutdown(1)
}
