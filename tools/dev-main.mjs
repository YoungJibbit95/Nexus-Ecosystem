import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnNpm } from './lib/process-utils.mjs'
import {
  describeListeningProcess,
  isLikelyMainViteProcess,
  isPortReachable,
} from './lib/dev-port-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const LOOPBACK_HOSTS = ['127.0.0.1', '::1']
const MAIN_PORT = 5173

const startArgs = ['--prefix', './Nexus Main', 'run', 'electron:dev']
const fallbackArgs = ['--prefix', './Nexus Main', 'run', 'start']

const occupied = await isPortReachable(MAIN_PORT, LOOPBACK_HOSTS)

let args = startArgs
if (occupied) {
  const listener = describeListeningProcess(MAIN_PORT)
  if (listener?.command && isLikelyMainViteProcess(listener.command)) {
    console.log(`[main] Port ${MAIN_PORT} bereits durch Nexus Main Vite belegt (PID ${listener.pid}), starte nur Electron.`)
    args = fallbackArgs
  } else {
    console.error(
      `[main] Port ${MAIN_PORT} ist belegt und blockiert den Dev-Start.\n`
      + `Bitte den Prozess beenden und danach erneut starten.\n`
      + (listener ? `Belegt durch PID ${listener.pid}: ${listener.command}` : 'Prozess konnte nicht eindeutig erkannt werden.'),
    )
    process.exit(1)
  }
}

const child = spawnNpm(args, {
  cwd: ROOT,
  env: process.env,
  stdio: 'inherit',
})

let shuttingDown = false
const shutdown = (signal = 'SIGTERM') => {
  if (shuttingDown) return
  shuttingDown = true
  if (!child.killed) {
    child.kill(signal)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(0)
    return
  }
  process.exit(code ?? 0)
})

