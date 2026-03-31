import type { NexusReleaseChannel, NexusUserTier } from '../types'

export const now = () => Date.now()
export const NEXUS_CONTROL_CANONICAL_URL = 'https://nexus-api.cloud'
const NEXUS_CONTROL_CANONICAL_HOST = 'nexus-api.cloud'

export const normalizeBaseUrl = (baseUrl?: string) => {
  const raw = String(baseUrl || '').trim()
  if (!raw) return NEXUS_CONTROL_CANONICAL_URL

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return NEXUS_CONTROL_CANONICAL_URL
    if (parsed.hostname !== NEXUS_CONTROL_CANONICAL_HOST) return NEXUS_CONTROL_CANONICAL_URL
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return NEXUS_CONTROL_CANONICAL_URL
    return NEXUS_CONTROL_CANONICAL_URL
  } catch {
    return NEXUS_CONTROL_CANONICAL_URL
  }
}

export const isBrowser = typeof window !== 'undefined'

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const VALID_TIERS: NexusUserTier[] = ['free', 'paid']
const VALID_RELEASE_CHANNELS: NexusReleaseChannel[] = ['staging', 'production']

export const normalizeViewId = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\-_:/.]/g, '')
  .slice(0, 80)

export const normalizeUserId = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]/g, '')
  .slice(0, 64)

export const normalizeUserTier = (value: string | undefined): NexusUserTier | null => {
  const normalized = String(value || '').trim().toLowerCase() as NexusUserTier
  return VALID_TIERS.includes(normalized) ? normalized : null
}

export const normalizeReleaseChannel = (
  value: string | undefined,
  fallback: NexusReleaseChannel = 'production',
): NexusReleaseChannel => {
  const normalized = String(value || '').trim().toLowerCase() as NexusReleaseChannel
  return VALID_RELEASE_CHANNELS.includes(normalized) ? normalized : fallback
}

export const parseSemver = (value: string) => {
  const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  }
}

export const compareSemver = (a: string, b: string) => {
  const left = parseSemver(a)
  const right = parseSemver(b)
  if (!left || !right) return 0
  if (left.major !== right.major) return left.major > right.major ? 1 : -1
  if (left.minor !== right.minor) return left.minor > right.minor ? 1 : -1
  if (left.patch !== right.patch) return left.patch > right.patch ? 1 : -1
  return 0
}

export const semverSatisfies = (versionRaw: string, constraintRaw: string) => {
  const version = String(versionRaw || '').trim()
  const constraint = String(constraintRaw || '').trim()
  if (!constraint || constraint === '*') return true
  if (!parseSemver(version)) return false

  const clauses = constraint
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (clauses.length === 0) return true

  for (const clause of clauses) {
    if (clause === '*') continue
    const match = clause.match(/^(>=|<=|>|<|=)?\s*([0-9]+\.[0-9]+\.[0-9]+(?:[-+][a-z0-9.-]+)?)$/i)
    if (!match) return false

    const op = match[1] || '='
    const target = match[2]
    const cmp = compareSemver(version, target)

    const ok = (
      (op === '=' && cmp === 0)
      || (op === '>' && cmp > 0)
      || (op === '>=' && cmp >= 0)
      || (op === '<' && cmp < 0)
      || (op === '<=' && cmp <= 0)
    )

    if (!ok) return false
  }

  return true
}

export const shouldSample = (sampleRate: number) => {
  if (sampleRate >= 1) return true
  if (sampleRate <= 0) return false
  return Math.random() <= sampleRate
}

export const abortableFetch = async (url: string, init: RequestInit, timeoutMs: number) => {
  const abort = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = abort
    ? setTimeout(() => {
      abort.abort()
    }, timeoutMs)
    : null

  try {
    return await fetch(url, {
      ...init,
      signal: abort?.signal,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD'])
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504])
const OFFLINE_ERROR_CODES = new Set([
  'NO_BASE_URL',
  'TIMEOUT',
  'NETWORK',
  'OFFLINE',
  'HTTP_408',
  'HTTP_425',
  'HTTP_429',
  'HTTP_500',
  'HTTP_502',
  'HTTP_503',
  'HTTP_504',
])

export class NexusControlError extends Error {
  code: string
  status: number
  retriable: boolean

  constructor(input: { code: string; message: string; status?: number; retriable?: boolean; cause?: unknown }) {
    super(input.message)
    this.name = 'NexusControlError'
    this.code = input.code
    this.status = input.status ?? 0
    this.retriable = input.retriable === true
    if (input.cause !== undefined) {
      // `cause` is optional runtime feature in JS engines.
      ;(this as any).cause = input.cause
    }
  }
}

export const isOfflineControlErrorCode = (codeRaw: unknown) => {
  const code = String(codeRaw || '').trim().toUpperCase()
  if (!code) return false
  return OFFLINE_ERROR_CODES.has(code)
}

export interface NexusRequestResult<T = unknown> {
  ok: boolean
  status: number
  headers: Headers
  data: T | null
  parseError: boolean
  attempts: number
  fromDedupe: boolean
}

export interface NexusRequestPolicyInput {
  method?: string
  headers?: Record<string, string>
  body?: string
  timeoutMs: number
  maxRetries?: number
  retryBaseMs?: number
  retryMaxMs?: number
  parseJson?: boolean
  dedupeKey?: string
  dedupeMap?: Map<string, Promise<NexusRequestResult<any>>>
}

const normalizeMethod = (methodRaw?: string) => String(methodRaw || 'GET').trim().toUpperCase() || 'GET'
const isBrowserOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const isSafeRetryMethod = (method: string) => SAFE_RETRY_METHODS.has(method)

const computeRetryDelayMs = (attempt: number, baseMs: number, maxMs: number) => {
  const exp = Math.min(maxMs, baseMs * (2 ** attempt))
  const jitter = Math.floor(Math.random() * Math.max(16, Math.floor(exp * 0.35)))
  return Math.min(maxMs, exp + jitter)
}

const shouldRetryStatus = (method: string, status: number) => (
  isSafeRetryMethod(method) && RETRYABLE_STATUS.has(status)
)

const shouldRetryError = (method: string, errorCode: string) => (
  isSafeRetryMethod(method) && (errorCode === 'TIMEOUT' || errorCode === 'NETWORK')
)

const toControlError = (error: unknown) => {
  if (error instanceof NexusControlError) return error
  const isAbort = (error as Error | undefined)?.name === 'AbortError'
  const code = isAbort ? 'TIMEOUT' : 'NETWORK'
  return new NexusControlError({
    code,
    status: 0,
    retriable: shouldRetryError('GET', code),
    message: `control request failed (${code})`,
    cause: error,
  })
}

const readJsonMaybe = async (response: Response, method: string, parseJson: boolean) => {
  if (!parseJson) return { data: null, parseError: false }
  if (method === 'HEAD' || response.status === 204 || response.status === 205 || response.status === 304) {
    return { data: null, parseError: false }
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase()
  const expectsJson = contentType.includes('application/json') || contentType.includes('+json')
  if (!expectsJson) {
    return { data: null, parseError: true }
  }

  try {
    const data = await response.json()
    return { data, parseError: false }
  } catch {
    return { data: null, parseError: true }
  }
}

const requestJsonInternal = async <T = any>(url: string, input: NexusRequestPolicyInput): Promise<NexusRequestResult<T>> => {
  const method = normalizeMethod(input.method)
  const maxRetries = clamp(Math.floor(input.maxRetries ?? 0), 0, 5)
  const retryBaseMs = clamp(Math.floor(input.retryBaseMs ?? 220), 50, 2_000)
  const retryMaxMs = clamp(Math.floor(input.retryMaxMs ?? 2_500), retryBaseMs, 10_000)
  const parseJson = input.parseJson !== false
  let attempt = 0

  while (true) {
    if (isBrowserOffline()) {
      throw new NexusControlError({
        code: "OFFLINE",
        status: 0,
        retriable: false,
        message: "control request skipped because browser is offline",
      })
    }
    try {
      const response = await abortableFetch(url, {
        method,
        headers: input.headers,
        body: input.body,
      }, input.timeoutMs)

      if (!response.ok && shouldRetryStatus(method, response.status) && attempt < maxRetries) {
        const delayMs = computeRetryDelayMs(attempt, retryBaseMs, retryMaxMs)
        attempt += 1
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs)
        continue
      }

      const parsed = await readJsonMaybe(response, method, parseJson)
      return {
        ok: response.ok,
        status: response.status,
        headers: response.headers,
        data: parsed.data as T | null,
        parseError: parsed.parseError,
        attempts: attempt + 1,
        fromDedupe: false,
      }
    } catch (error) {
      const controlError = toControlError(error)
      if (shouldRetryError(method, controlError.code) && attempt < maxRetries) {
        const delayMs = computeRetryDelayMs(attempt, retryBaseMs, retryMaxMs)
        attempt += 1
        // eslint-disable-next-line no-await-in-loop
        await sleep(delayMs)
        continue
      }
      throw controlError
    }
  }
}

export const requestJsonWithPolicy = async <T = any>(url: string, input: NexusRequestPolicyInput): Promise<NexusRequestResult<T>> => {
  const dedupeKey = String(input.dedupeKey || '').trim()
  if (!dedupeKey || !input.dedupeMap) {
    return requestJsonInternal<T>(url, input)
  }

  const existing = input.dedupeMap.get(dedupeKey)
  if (existing) {
    const result = await existing
    return {
      ...result,
      fromDedupe: true,
    }
  }

  const pending = requestJsonInternal<T>(url, input)
    .finally(() => {
      input.dedupeMap?.delete(dedupeKey)
    })

  input.dedupeMap.set(dedupeKey, pending)
  return pending
}
