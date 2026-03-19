import http from 'node:http'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawnNpm } from './process-utils.mjs'
import { resolveApiSource } from './api-source.mjs'

export const DEFAULT_CONTROL_PORT = 4399
export const DEFAULT_CONTROL_HOST = '127.0.0.1'
const DEFAULT_TIMEOUT_MS = 90_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const toPort = (value) => {
  const raw = Number(value)
  if (!Number.isInteger(raw) || raw <= 0 || raw > 65535) return DEFAULT_CONTROL_PORT
  return raw
}

export const resolveControlPlaneTarget = () => ({
  host: DEFAULT_CONTROL_HOST,
  port: toPort(process.env.NEXUS_CONTROL_PORT || DEFAULT_CONTROL_PORT),
})

const requestHealth = ({ host, port, timeoutMs }) => new Promise((resolve) => {
  const req = http.request({
    host,
    port,
    path: '/health',
    method: 'GET',
    timeout: timeoutMs,
  }, (res) => {
    const chunks = []
    res.on('data', (chunk) => chunks.push(chunk))
    res.on('end', () => {
      let data = null
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        data = null
      }

      resolve({
        ok: res.statusCode === 200 && data?.ok === true && data?.status === 'healthy',
        status: res.statusCode ?? 0,
      })
    })
  })

  req.on('timeout', () => {
    req.destroy()
    resolve({ ok: false, status: 0 })
  })

  req.on('error', () => {
    resolve({ ok: false, status: 0 })
  })

  req.end()
})

export const isControlPlaneHealthy = async ({ host, port, timeoutMs = 1_200 }) => {
  const res = await requestHealth({ host, port, timeoutMs })
  return res.ok
}

export const waitForControlPlane = async ({
  host,
  port,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  probeIntervalMs = 450,
}) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt <= timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await isControlPlaneHealthy({ host, port, timeoutMs: 1_400 })
    if (ok) return true
    // eslint-disable-next-line no-await-in-loop
    await sleep(probeIntervalMs)
  }

  throw new Error(`Control Plane nicht erreichbar auf http://${host}:${port} (Timeout ${timeoutMs}ms)`)
}

const startControlPlaneDetached = async ({ root, host, port, controlPlaneDir }) => {
  const logDir = path.join(root, 'build', 'logs')
  await fs.mkdir(logDir, { recursive: true })

  const child = spawnNpm(['--prefix', controlPlaneDir, 'run', 'dev'], {
    cwd: root,
    env: {
      ...process.env,
      NEXUS_CONTROL_HOST: host,
      NEXUS_CONTROL_PORT: String(port),
    },
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  if (child.pid) {
    const pidFile = path.join(logDir, 'control-plane.pid')
    await fs.writeFile(pidFile, `${child.pid}\n`, 'utf8')
  }

  return child.pid ?? null
}

export const ensureControlPlane = async ({
  root,
  startIfMissing = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  quiet = false,
} = {}) => {
  if (!root) throw new Error('ensureControlPlane benoetigt root')

  const { host, port } = resolveControlPlaneTarget()
  const apiSource = await resolveApiSource({ root, quiet: true })
  const controlPlaneDir = apiSource.controlPlaneDir

  const alreadyUp = await isControlPlaneHealthy({ host, port })
  if (alreadyUp) {
    if (!quiet) {
      console.log(`[control-plane-guard] aktiv: http://${host}:${port} (${apiSource.mode})`)
    }
    return {
      host,
      port,
      url: `http://${host}:${port}`,
      started: false,
      pid: null,
      sourceMode: apiSource.mode,
      controlPlaneDir,
    }
  }

  if (!startIfMissing) {
    throw new Error(`Control Plane ist nicht aktiv: http://${host}:${port}`)
  }

  if (!quiet) {
    console.log(`[control-plane-guard] starte Control Plane auf http://${host}:${port} (${apiSource.mode}) ...`)
  }

  const pid = await startControlPlaneDetached({ root, host, port, controlPlaneDir })
  await waitForControlPlane({ host, port, timeoutMs })

  if (!quiet) {
    const pidMsg = pid ? ` (pid ${pid})` : ''
    console.log(`[control-plane-guard] bereit: http://${host}:${port}${pidMsg}`)
  }

  return {
    host,
    port,
    url: `http://${host}:${port}`,
    started: true,
    pid,
    sourceMode: apiSource.mode,
    controlPlaneDir,
  }
}
