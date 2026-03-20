import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnNpm, spawnProcess } from './lib/process-utils.mjs'
import { resolveControlPlanePrefixArg } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const cliArgs = new Set(process.argv.slice(2))
const includeControlPlane = !cliArgs.has('--without-control-plane') && !cliArgs.has('--apps-only')
const controlPlaneTarget = includeControlPlane
  ? await resolveControlPlanePrefixArg({ root: ROOT, quiet: false })
  : null

const skipOpen = String(process.env.NEXUS_CONTROL_NO_OPEN || '').toLowerCase() === 'true'
const openControlUrl = String(process.env.NEXUS_DEV_OPEN_CONTROL || 'true').toLowerCase() !== 'false'

const SERVICES = []

if (includeControlPlane && controlPlaneTarget) {
  SERVICES.push(
    {
      id: 'control-plane',
      label: 'Control Plane',
      args: [...controlPlaneTarget.prefixArgs, 'run', 'dev'],
      port: Number(process.env.NEXUS_CONTROL_PORT || 4399),
      url: `http://localhost:${Number(process.env.NEXUS_CONTROL_PORT || 4399)}`,
    },
    {
      id: 'control-ui',
      label: 'Control UI',
      args: ['--prefix', './Nexus Control', 'run', 'dev'],
      port: Number(process.env.NEXUS_CONTROL_UI_PORT || 5180),
      url: `http://localhost:${Number(process.env.NEXUS_CONTROL_UI_PORT || 5180)}`,
    },
  )
}

SERVICES.push(
  {
    id: 'main',
    label: 'Nexus Main (Electron + Vite)',
    args: ['--prefix', './Nexus Main', 'run', 'electron:dev'],
    fallbackArgsIfPortBusy: ['--prefix', './Nexus Main', 'run', 'start'],
    port: 5173,
    url: 'http://localhost:5173',
  },
  {
    id: 'code',
    label: 'Nexus Code',
    args: ['--prefix', './Nexus Code', 'run', 'electron:dev'],
    port: 5175,
    url: 'http://localhost:5175',
  },
)

const children = []
let shuttingDown = false

const run = (service, args) => {
  const child = spawnNpm(args, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return

    console.error(`\n[${service.id}] beendet (code=${code ?? 'null'}, signal=${signal ?? 'null'})`)
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

const isPortReachable = async (port, host = '127.0.0.1', timeoutMs = 1_400) => {
  try {
    await waitForPort(port, host, timeoutMs)
    return true
  } catch {
    return false
  }
}

const openBrowser = (url) => {
  if (skipOpen || !openControlUrl) {
    console.log(`\nBrowser-Open uebersprungen. URL: ${url}`)
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
    if (!child.killed) child.kill('SIGTERM')
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) child.kill('SIGKILL')
    }
    process.exit(exitCode)
  }, 900)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

const stackLabel = includeControlPlane
  ? `Control + Main + Code [api-source=${controlPlaneTarget.source.mode}]`
  : 'Main + Code (API extern)'
console.log(`Starte Nexus Dev Stack (${stackLabel})...`)

for (const service of SERVICES) {
  const running = await isPortReachable(service.port)

  if (running) {
    if (service.id === 'main' && service.fallbackArgsIfPortBusy) {
      console.log(`[${service.id}] Port ${service.port} bereits aktiv, starte nur Electron.`)
      run(service, service.fallbackArgsIfPortBusy)
      continue
    }

    console.log(`[${service.id}] Port ${service.port} bereits aktiv, starte Service nicht doppelt.`)
    continue
  }

  run(service, service.args)
}

try {
  await Promise.all(SERVICES.map((service) => waitForPort(service.port)))

  console.log('\nAlle Dev Services sind erreichbar:')
  for (const service of SERVICES) {
    console.log(`- ${service.label}: ${service.url}`)
  }

  const controlUi = SERVICES.find((service) => service.id === 'control-ui')
  if (controlUi) {
    openBrowser(controlUi.url)
  }

  if (children.length === 0) {
    console.log('\nKeine neuen Prozesse gestartet (alle Services liefen bereits).')
    process.exit(0)
  }

  console.log('\nMobile Apps starten nativ via Capacitor:')
  console.log('- npm run dev:mobile:android   # build + cap sync + Android Studio')
  console.log('- npm run dev:mobile:ios       # build + cap sync + Xcode')
  console.log('- npm run dev:code-mobile:android')
  console.log('- npm run dev:code-mobile:ios')

  console.log('\nDruecke Ctrl+C zum Beenden der gestarteten Prozesse.')
} catch (error) {
  console.error(`\nStartpruefung fehlgeschlagen: ${error.message}`)
  shutdown(1)
}
