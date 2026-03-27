import http from 'node:http'
import https from 'node:https'
import { resolveApiSource, resolveHostedControlUrl } from './api-source.mjs'

export const DEFAULT_CONTROL_HOST = 'nexus-api.cloud'
export const DEFAULT_CONTROL_PORT = 443
const DEFAULT_TIMEOUT_MS = 90_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const normalizePort = (value, protocol) => {
  const raw = Number(value)
  if (Number.isInteger(raw) && raw > 0 && raw <= 65535) return raw
  return protocol === 'http:' ? 80 : 443
}

const buildHealthPath = (pathname) => {
  const trimmed = String(pathname || '/').trim()
  const base = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  const normalizedBase = base || ''
  return `${normalizedBase}/health`.replace(/\/\/+/, '/')
}

export const resolveControlPlaneTarget = () => {
  const configured = resolveHostedControlUrl()
  let parsed

  try {
    parsed = new URL(configured)
  } catch {
    throw new Error(`NEXUS_CONTROL_URL ist ungueltig: ${configured}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`NEXUS_CONTROL_URL nutzt kein HTTP(S)-Schema: ${configured}`)
  }

  const port = normalizePort(parsed.port, parsed.protocol)
  const host = parsed.hostname || DEFAULT_CONTROL_HOST
  const basePath = parsed.pathname || '/'
  const healthPath = buildHealthPath(basePath)

  return {
    baseUrl: parsed.origin + (basePath === '/' ? '' : basePath.replace(/\/$/, '')),
    protocol: parsed.protocol,
    host,
    port,
    healthPath,
    healthUrl: `${parsed.origin}${healthPath}`,
  }
}

const requestHealth = ({ protocol, host, port, path, timeoutMs }) => new Promise((resolve) => {
  const transport = protocol === 'http:' ? http : https

  const req = transport.request({
    protocol,
    host,
    port,
    path,
    method: 'GET',
    timeout: timeoutMs,
  }, (res) => {
    const chunks = []
    res.on('data', (chunk) => chunks.push(chunk))
    res.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      let data = null
      try {
        data = JSON.parse(body)
      } catch {
        data = null
      }

      const healthyByPayload = data?.ok === true || data?.status === 'healthy'
      resolve({
        ok: (res.statusCode === 200) && healthyByPayload,
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

export const isControlPlaneHealthy = async ({ timeoutMs = 1_500 } = {}) => {
  const target = resolveControlPlaneTarget()
  const res = await requestHealth({
    protocol: target.protocol,
    host: target.host,
    port: target.port,
    path: target.healthPath,
    timeoutMs,
  })
  return res.ok
}

export const waitForControlPlane = async ({
  timeoutMs = DEFAULT_TIMEOUT_MS,
  probeIntervalMs = 700,
} = {}) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt <= timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await isControlPlaneHealthy({ timeoutMs: 2_000 })
    if (ok) return true
    // eslint-disable-next-line no-await-in-loop
    await sleep(probeIntervalMs)
  }

  const target = resolveControlPlaneTarget()
  throw new Error(`Hosted Control API nicht erreichbar: ${target.healthUrl} (Timeout ${timeoutMs}ms)`)
}

export const ensureControlPlane = async ({
  root,
  startIfMissing = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  quiet = false,
} = {}) => {
  if (!root) throw new Error('ensureControlPlane benoetigt root')

  const apiSource = await resolveApiSource({ root, quiet: true })
  const target = resolveControlPlaneTarget()

  const alreadyUp = await isControlPlaneHealthy()
  if (!alreadyUp) {
    if (!startIfMissing) {
      throw new Error(`Hosted Control API ist nicht erreichbar: ${target.healthUrl}`)
    }

    if (!quiet) {
      console.log(`[control-plane-guard] pruefe Hosted API: ${target.healthUrl} ...`)
    }

    await waitForControlPlane({ timeoutMs })
  }

  if (!quiet) {
    console.log(`[control-plane-guard] erreichbar: ${target.healthUrl} (${apiSource.mode})`)
  }

  return {
    host: target.host,
    port: target.port,
    url: target.baseUrl,
    healthUrl: target.healthUrl,
    started: false,
    pid: null,
    sourceMode: apiSource.mode,
    controlPlaneDir: null,
  }
}
