import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const hashSecret = (value) => createHash('sha256').update(String(value)).digest('hex')

export const verifySecret = (plain, hashed) => {
  const expected = Buffer.from(hashSecret(plain), 'utf8')
  const actual = Buffer.from(String(hashed || ''), 'utf8')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

export const createAccessToken = () => `nxt_${randomBytes(24).toString('base64url')}`

export class SlidingWindowRateLimiter {
  constructor(limit = 1200, windowMs = 60_000) {
    this.limit = limit
    this.windowMs = windowMs
    this.windows = new Map()
  }

  setLimit(limit) {
    this.limit = limit
  }

  check(key) {
    const now = Date.now()
    const record = this.windows.get(key) ?? []
    const fresh = record.filter((ts) => now - ts <= this.windowMs)

    if (fresh.length >= this.limit) {
      const oldest = fresh[0]
      const retryAfterMs = Math.max(1, this.windowMs - (now - oldest))
      this.windows.set(key, fresh)
      return { ok: false, retryAfterMs, remaining: 0 }
    }

    fresh.push(now)
    this.windows.set(key, fresh)
    return {
      ok: true,
      retryAfterMs: 0,
      remaining: Math.max(0, this.limit - fresh.length),
    }
  }
}

export const asJson = (res, status, payload, headers = {}) => {
  const body = JSON.stringify(payload, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  })
  res.end(body)
}

export const readJsonBody = async (req, maxBytes = 512_000) => {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) {
      throw new Error('REQUEST_TOO_LARGE')
    }
    chunks.push(chunk)
  }

  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text.trim()) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('INVALID_JSON')
  }
}

export const getBearerToken = (req) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return null
  return auth.slice(7).trim()
}

export const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return ''
  return origin.trim().toLowerCase()
}
