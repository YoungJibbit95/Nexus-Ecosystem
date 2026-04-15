import type { NexusUserTier } from '../types'

export type NexusControlUserContext = {
  userId?: string
  username?: string
  userTier?: NexusUserTier
}

type UnknownRecord = Record<string, unknown>

const isRecord = (value: unknown): value is UnknownRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const toCleanString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const normalizeTier = (value: unknown): NexusUserTier | undefined => {
  const raw = toCleanString(value)?.toLowerCase()
  if (!raw) return undefined
  if (raw === 'free') return 'free'
  if (
    raw === 'paid' ||
    raw === 'pro' ||
    raw === 'premium' ||
    raw === 'plus' ||
    raw === 'business' ||
    raw === 'enterprise' ||
    raw === 'lifetime' ||
    raw === 'owner' ||
    raw === 'admin'
  ) return 'paid'
  return undefined
}

const WEBSITE_SESSION_STORAGE_KEY = 'nexus.website.session.v1'
const CONTROL_CONTEXT_STORAGE_KEY = 'nexus.user.context.v1'
const TIER_STORAGE_KEYS = [
  'nexus.user.tier',
  'nexus.payment.tier',
  'nexus.account.tier',
]
const PAYMENT_STATUS_STORAGE_KEYS = [
  'nexus.payment.status',
  'nexus.subscription.status',
  'nexus.account.status',
]
const PAYMENT_FLAG_STORAGE_KEYS = [
  'nexus.payment.active',
  'nexus.subscription.active',
  'nexus.billing.active',
  'nexus.user.isPaid',
]

const readStorageJson = (storage: Storage | null, key: string): unknown => {
  if (!storage) return undefined
  try {
    const raw = storage.getItem(key)
    if (!raw) return undefined
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  const raw = toCleanString(value)?.toLowerCase()
  if (!raw) return undefined
  if (['1', 'true', 'yes', 'y', 'active', 'paid', 'on'].includes(raw)) return true
  if (['0', 'false', 'no', 'n', 'inactive', 'off'].includes(raw)) return false
  return undefined
}

const normalizeStatusTier = (value: unknown): NexusUserTier | undefined => {
  const raw = toCleanString(value)?.toLowerCase()
  if (!raw) return undefined
  if (['active', 'trial', 'trialing', 'paid', 'premium', 'plus', 'pro', 'business', 'enterprise', 'lifetime'].includes(raw)) {
    return 'paid'
  }
  if (['free', 'inactive', 'expired', 'cancelled', 'canceled', 'unpaid', 'none'].includes(raw)) {
    return 'free'
  }
  return undefined
}

const resolveTierFromWebsiteSession = (value: unknown): NexusUserTier | undefined => {
  if (!isRecord(value)) return undefined
  const rootTier = normalizeTier(value.tier)
    || normalizeTier(value.planTier)
    || normalizeTier((value.plan as UnknownRecord | undefined)?.tier)
    || normalizeTier((value.subscription as UnknownRecord | undefined)?.tier)
  if (rootTier) return rootTier

  const rootStatusTier = normalizeStatusTier(value.status)
    || normalizeStatusTier(value.billingStatus)
    || normalizeStatusTier((value.payment as UnknownRecord | undefined)?.status)
    || normalizeStatusTier((value.plan as UnknownRecord | undefined)?.status)
    || normalizeStatusTier((value.subscription as UnknownRecord | undefined)?.status)
  if (rootStatusTier) return rootStatusTier

  const paidFlag = normalizeBoolean(value.isPaid)
    ?? normalizeBoolean((value.payment as UnknownRecord | undefined)?.active)
    ?? normalizeBoolean((value.subscription as UnknownRecord | undefined)?.active)
  if (paidFlag != null) return paidFlag ? 'paid' : 'free'

  if (!isRecord(value.user)) return undefined
  const user = value.user
  return (
    normalizeTier(user.tier)
    || normalizeTier(user.planTier)
    || normalizeTier(user.role)
    || normalizeStatusTier(user.status)
    || normalizeStatusTier((user.plan as UnknownRecord | undefined)?.status)
    || normalizeStatusTier((user.subscription as UnknownRecord | undefined)?.status)
    || (normalizeBoolean(user.isPaid) ? 'paid' : normalizeBoolean(user.isPaid) === false ? 'free' : undefined)
  )
}

const resolveStoredContext = (): NexusControlUserContext => {
  if (typeof window === 'undefined') return {}
  const storages: Array<Storage | null> = [window.sessionStorage, window.localStorage]
  const result: NexusControlUserContext = {}

  for (const storage of storages) {
    if (!storage) continue
    const direct = readStorageJson(storage, CONTROL_CONTEXT_STORAGE_KEY)
    if (isRecord(direct)) {
      result.userId = result.userId || toCleanString(direct.userId) || toCleanString(direct.id)
      result.username = result.username || toCleanString(direct.username)
      result.userTier = result.userTier || normalizeTier(direct.userTier) || normalizeTier(direct.tier)
    }

    const websiteSession = readStorageJson(storage, WEBSITE_SESSION_STORAGE_KEY)
    if (isRecord(websiteSession)) {
      const sessionUser = isRecord(websiteSession.user) ? websiteSession.user : undefined
      result.userId = result.userId
        || toCleanString(websiteSession.userId)
        || toCleanString(sessionUser?.id)
      result.username = result.username
        || toCleanString(websiteSession.username)
        || toCleanString(sessionUser?.username)
      result.userTier = result.userTier || resolveTierFromWebsiteSession(websiteSession)
    }

    if (!result.userTier) {
      for (const key of TIER_STORAGE_KEYS) {
        const rawTier = storage.getItem(key)
        const normalized = normalizeTier(rawTier)
        if (normalized) {
          result.userTier = normalized
          break
        }
      }
    }

    if (!result.userTier) {
      for (const key of PAYMENT_STATUS_STORAGE_KEYS) {
        const rawStatus = storage.getItem(key)
        const normalized = normalizeStatusTier(rawStatus)
        if (normalized) {
          result.userTier = normalized
          break
        }
      }
    }

    if (!result.userTier) {
      for (const key of PAYMENT_FLAG_STORAGE_KEYS) {
        const rawFlag = storage.getItem(key)
        const parsedFlag = normalizeBoolean(rawFlag)
        if (parsedFlag == null) continue
        result.userTier = parsedFlag ? 'paid' : 'free'
        break
      }
    }
  }

  return result
}

export const resolveNexusControlUserContext = (input: NexusControlUserContext = {}): NexusControlUserContext => {
  const userId = toCleanString(input.userId)
  const username = toCleanString(input.username)
  const userTier = normalizeTier(input.userTier)
  const envResolved: NexusControlUserContext = {
    userId,
    username,
    userTier,
  }
  if (envResolved.userId || envResolved.username || envResolved.userTier) {
    return envResolved
  }

  return resolveStoredContext()
}
