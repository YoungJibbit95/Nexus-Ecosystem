import net from 'node:net'
import { spawnProcessSync } from './process-utils.mjs'

const DEFAULT_LOOPBACK_HOSTS = ['127.0.0.1', '::1']

const withRetry = (executor, timeoutMs = 90_000, retryDelayMs = 450) => {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      executor()
        .then(resolve)
        .catch(() => {
          if (Date.now() - startedAt > timeoutMs) {
            reject(new Error(`Timeout nach ${timeoutMs}ms`))
            return
          }
          setTimeout(attempt, retryDelayMs)
        })
    }
    attempt()
  })
}

const tryConnect = (port, host, socketTimeoutMs = 1_200) =>
  new Promise((resolve, reject) => {
    const socket = new net.Socket()

    socket.setTimeout(socketTimeoutMs)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      reject(new Error('timeout'))
    })
    socket.once('error', () => {
      socket.destroy()
      reject(new Error('connect-error'))
    })

    socket.connect(port, host)
  })

const tryAnyHostOnce = async (port, hosts = DEFAULT_LOOPBACK_HOSTS) => {
  const attempts = hosts.map((host) =>
    tryConnect(port, host)
      .then(() => ({ ok: true, host }))
      .catch(() => ({ ok: false, host })),
  )
  const results = await Promise.all(attempts)
  const connected = results.find((entry) => entry.ok)
  if (!connected) {
    throw new Error(`Port ${port} auf keinem Host erreichbar`)
  }
  return connected.host
}

export const waitForPortAnyHost = (
  port,
  hosts = DEFAULT_LOOPBACK_HOSTS,
  timeoutMs = 90_000,
) => withRetry(() => tryAnyHostOnce(port, hosts), timeoutMs)

export const isPortReachable = async (
  port,
  hosts = DEFAULT_LOOPBACK_HOSTS,
  timeoutMs = 1_400,
) => {
  try {
    await waitForPortAnyHost(port, hosts, timeoutMs)
    return true
  } catch {
    return false
  }
}

export const describeListeningProcess = (port) => {
  const lsofResult = spawnProcessSync(
    'lsof',
    ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'],
    { encoding: 'utf8' },
  )

  if (lsofResult.status !== 0 || !lsofResult.stdout) return null
  const lines = String(lsofResult.stdout).split('\n').filter(Boolean)
  if (lines.length < 2) return null

  const cols = lines[1].trim().split(/\s+/)
  const pid = Number(cols[1] || 0)
  if (!Number.isFinite(pid) || pid <= 0) return null

  const psResult = spawnProcessSync(
    'ps',
    ['-p', String(pid), '-o', 'command='],
    { encoding: 'utf8' },
  )
  const command = psResult.status === 0
    ? String(psResult.stdout || '').trim()
    : cols[0] || ''

  return {
    pid,
    command,
    rawLine: lines[1],
  }
}

export const isLikelyMainViteProcess = (command) => {
  const value = String(command || '')
  return value.includes('/Nexus Main/') && value.includes('/vite')
}

