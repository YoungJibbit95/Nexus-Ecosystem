import type { NexusReleaseChannel, NexusUserTier } from '../types'

export const now = () => Date.now()

export const normalizeBaseUrl = (baseUrl?: string) => {
  const raw = String(baseUrl || '').trim()
  if (!raw) return ''

  try {
    const parsed = new URL(raw)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    if (parsed.username || parsed.password) return ''
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname || ''}`
    return normalized.replace(/\/$/, '')
  } catch {
    return ''
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
