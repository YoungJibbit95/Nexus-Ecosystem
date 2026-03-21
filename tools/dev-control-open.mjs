import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnNpm, spawnProcess } from './lib/process-utils.mjs'
import { ensureControlPlane } from './lib/control-plane-guard.mjs'
import { resolveHostedControlUrl } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const hostedControlUrl = resolveHostedControlUrl()
const uiPort = Number(process.env.NEXUS_CONTROL_UI_PORT || 5180)
const uiUrl = process.env.NEXUS_CONTROL_UI_URL || `http://localhost:${uiPort}`
const skipOpen = String(process.env.NEXUS_CONTROL_NO_OPEN || '').toLowerCase() === 'true'

const children = []
let shuttingDown = false

const run = (label, args) => {
  const child = spawnNpm(args, {
    cwd: ROOT,
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

const openBrowser = (url) => {
  if (skipOpen) {
    console.log(`\nBrowser-Open uebersprungen (NEXUS_CONTROL_NO_OPEN=true). URL: ${url}`)
    return
  }

  try {
    if (process.platform === 'darwin') {
      const proc = spawnProcess('open', [url], { stdio: 'ignore', detached: true, shell: false })
      proc.unref()
      return
    }

    if (process.platform === 'win32') {
      const proc = spawnProcess('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true, shell: false })
      proc.unref()
      return
    }

    const proc = spawnProcess('xdg-open', [url], { stdio: 'ignore', detached: true, shell: false })
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
  run('control-ui', ['--prefix', '../Nexus Control', 'run', 'dev'])
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
