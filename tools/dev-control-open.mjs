import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const controlPort = Number(process.env.NEXUS_CONTROL_PORT || 4399)
const uiPort = Number(process.env.NEXUS_CONTROL_UI_PORT || 5180)
const uiUrl = process.env.NEXUS_CONTROL_UI_URL || `http://localhost:${uiPort}`
const skipOpen = String(process.env.NEXUS_CONTROL_NO_OPEN || '').toLowerCase() === 'true'

const children = []
let shuttingDown = false

const run = (label, args) => {
  const child = spawn(npmCmd, args, {
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
    console.log(`\nBrowser-Open übersprungen (NEXUS_CONTROL_NO_OPEN=true). URL: ${url}`)
    return
  }

  try {
    if (process.platform === 'darwin') {
      const proc = spawn('open', [url], { stdio: 'ignore', detached: true })
      proc.unref()
      return
    }

    if (process.platform === 'win32') {
      const proc = spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true })
      proc.unref()
      return
    }

    const proc = spawn('xdg-open', [url], { stdio: 'ignore', detached: true })
    proc.unref()
  } catch (error) {
    console.warn(`Browser konnte nicht automatisch geöffnet werden: ${error.message}`)
    console.warn(`Bitte manuell öffnen: ${url}`)
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

console.log('Starte Nexus Control Plane und Nexus Control UI...')

const controlPlaneRunning = await isPortReachable(controlPort)
const controlUiRunning = await isPortReachable(uiPort)

if (controlPlaneRunning) {
  console.log(`Control Plane laeuft bereits auf http://localhost:${controlPort}`)
} else {
  run('control-plane', ['--prefix', './API/nexus-control-plane', 'run', 'dev'])
}

if (controlUiRunning) {
  console.log(`Control UI laeuft bereits auf http://localhost:${uiPort}`)
} else {
  run('control-ui', ['--prefix', './Nexus Control', 'run', 'dev'])
}

try {
  await waitForPort(controlPort)
  await waitForPort(uiPort)
  console.log(`\nControl Plane erreichbar auf http://localhost:${controlPort}`)
  console.log(`Control UI erreichbar auf ${uiUrl}`)
  openBrowser(uiUrl)
  if (children.length === 0) {
    console.log('\nKeine neuen Prozesse gestartet (beide Services liefen bereits).')
    process.exit(0)
  }
  console.log('\nDrücke Ctrl+C zum Beenden der gestarteten Prozesse.')
} catch (error) {
  console.error(`\nStartprüfung fehlgeschlagen: ${error.message}`)
  shutdown(1)
}
