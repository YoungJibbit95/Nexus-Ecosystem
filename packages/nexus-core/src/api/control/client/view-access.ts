import type { NexusUserTier, NexusViewAccessResult } from '../../types'
import type { NexusViewAccessCheckOptions } from '../options'
import {
  NexusControlError,
  isOfflineControlErrorCode,
  normalizeUserId,
  normalizeUserTier,
  normalizeViewId,
  requestJsonWithPolicy,
} from '../utils'
import { buildViewAccessCacheKey, buildWriteHeaders, getViewValidationErrorReason } from './common'

const LOCAL_FREE_VIEWS_BY_APP: Record<string, Set<string>> = {
  main: new Set([
    'dashboard',
    'calendar',
    'notes',
    'code',
    'tasks',
    'reminders',
    'canvas',
    'files',
    'flux',
    'settings',
    'info',
  ]),
  mobile: new Set(['dashboard', 'calendar', 'notes', 'tasks', 'reminders', 'files', 'settings', 'info']),
  code: new Set([]),
  'code-mobile': new Set([]),
}

const isLocalFreeViewAllowed = (appId: string, viewId: string) => {
  const allowed = LOCAL_FREE_VIEWS_BY_APP[appId]
  if (!allowed) return false
  return allowed.has(viewId)
}

const shouldTrustLocalFreeView = (
  client: any,
  viewId: string,
) => isLocalFreeViewAllowed(client.appId, viewId)

const ALWAYS_FAIL_CLOSED_VIEWS = new Set(['devtools'])
const REQUIRED_TIER_BY_VIEW: Record<string, NexusUserTier> = {
  devtools: 'pro',
}

const TIER_RANK: Record<NexusUserTier, number> = {
  free: 0,
  pro: 1,
  lifetime: 1,
  lifetime_pro: 2,
}

const meetsLocalTierPolicy = (viewId: string, tier: NexusUserTier) => {
  const required = REQUIRED_TIER_BY_VIEW[viewId]
  return !required || TIER_RANK[tier] >= TIER_RANK[required]
}

const extractOfflineHttpCode = (messageRaw: string) => {
  const match = messageRaw.match(/VIEW_VALIDATION_HTTP_(\d{3})/)
  if (!match) return ''
  return `HTTP_${match[1]}`
}

const getLocalFreeValidationFallbackReason = (messageRaw: string) => {
  const httpCode = extractOfflineHttpCode(messageRaw)
  return httpCode ? `LOCAL_FREE_VIEW_ALLOW_${httpCode}` : 'LOCAL_FREE_VIEW_ALLOW_VALIDATION_ERROR'
}

const buildFallbackResult = (
  client: any,
  viewIdRaw: string,
  requestedTier: NexusUserTier,
  options: NexusViewAccessCheckOptions,
  input: {
    allowed: boolean
    reason: string
    paywallEnabled?: boolean
    requiredTier?: NexusUserTier | null
    userTier?: NexusUserTier
    userTierSource?: 'request' | 'template' | 'default' | 'offline'
  },
): NexusViewAccessResult => ({
  appId: client.appId,
  viewId: viewIdRaw,
  allowed: input.allowed,
  reason: input.reason,
  userTier: input.userTier || requestedTier,
  userTierSource: input.userTierSource || (options.userTier ? 'request' : 'default'),
  userTemplateKey: null,
  paywallEnabled: input.paywallEnabled ?? false,
  requiredTier: input.requiredTier ?? null,
  evaluatedAt: new Date().toISOString(),
  cacheHit: false,
})

export const validateViewAccess = async (
  client: any,
  viewId: string,
  options: NexusViewAccessCheckOptions = {},
): Promise<NexusViewAccessResult> => {
  const normalizedView = normalizeViewId(viewId)
  const userId = normalizeUserId(options.userId || client.defaultUserId)
  const username = normalizeUserId(options.username || client.defaultUsername)
  const requestedTier = normalizeUserTier(options.userTier) || client.defaultUserTier

  if (!normalizedView) {
    return buildFallbackResult(client, normalizedView || viewId, requestedTier, options, {
      allowed: false,
      reason: 'INVALID_VIEW_ID',
      paywallEnabled: false,
    })
  }

  if (!client.baseUrl || !client.viewValidationEnabled) {
    const freeAllowed = shouldTrustLocalFreeView(client, normalizedView)
    return buildFallbackResult(client, normalizedView, requestedTier, options, {
      allowed: freeAllowed,
      reason: freeAllowed ? 'LOCAL_FREE_VIEW_ALLOW' : 'VIEW_VALIDATION_UNAVAILABLE_FAIL_CLOSED',
      paywallEnabled: !freeAllowed,
      requiredTier: freeAllowed ? null : 'pro',
    })
  }

  const cacheKey = buildViewAccessCacheKey(client, normalizedView, userId, username, requestedTier)
  if (!options.forceRefresh && client.viewValidationCacheMs > 0) {
    const cached = client.viewAccessCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ...cached.result,
        cacheHit: true,
      }
    }
  }

  const body = {
    appId: client.appId,
    viewId: normalizedView,
    userId: userId || undefined,
    username: username || undefined,
    userTier: requestedTier,
  }

  if (!client.token && !client.ingestKey) {
    const localAllowed = shouldTrustLocalFreeView(client, normalizedView)
    return buildFallbackResult(client, normalizedView, requestedTier, options, {
      allowed: localAllowed,
      reason: localAllowed ? 'LOCAL_FREE_VIEW_ALLOW_AUTH_SKIPPED' : 'AUTH_REQUIRED_SKIPPED',
      paywallEnabled: !localAllowed,
      requiredTier: localAllowed ? null : 'pro',
    })
  }

  const headers = buildWriteHeaders(client, client.appId)

  try {
    const response = await requestJsonWithPolicy<any>(`${client.baseUrl}/api/v1/views/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      timeoutMs: client.requestTimeoutMs,
      maxRetries: 0,
      parseJson: true,
    })

    if (response.status === 401 || response.status === 403) {
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: false,
        reason: `VIEW_VALIDATION_HTTP_${response.status}_FAIL_CLOSED`,
        paywallEnabled: true,
        requiredTier: REQUIRED_TIER_BY_VIEW[normalizedView] || 'pro',
      })
    }
    if (!response.ok) throw new Error(`VIEW_VALIDATION_HTTP_${response.status}`)
    if (response.parseError) {
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: false,
        reason: 'VIEW_VALIDATION_INVALID_JSON_FAIL_CLOSED',
        paywallEnabled: true,
        requiredTier: REQUIRED_TIER_BY_VIEW[normalizedView] || 'pro',
      })
    }

    const data = response.data
    const item = data?.item ?? {}
    if (typeof item !== 'object' || item == null || Array.isArray(item)) {
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: false,
        reason: 'VIEW_VALIDATION_INVALID_SCHEMA_FAIL_CLOSED',
        paywallEnabled: true,
        requiredTier: REQUIRED_TIER_BY_VIEW[normalizedView] || 'pro',
      })
    }

    const userTier = normalizeUserTier(item.userTier)
    const requiredTier = item.requiredTier == null
      ? null
      : normalizeUserTier(item.requiredTier)
    if (
      typeof item.allowed !== 'boolean'
      || !userTier
      || (item.requiredTier != null && !requiredTier)
      || typeof item.paywallEnabled !== 'boolean'
      || typeof item.reason !== 'string'
      || item.reason.length === 0
      || typeof item.evaluatedAt !== 'string'
      || item.evaluatedAt.length === 0
    ) {
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: false,
        reason: 'VIEW_VALIDATION_INVALID_SCHEMA_FAIL_CLOSED',
        paywallEnabled: true,
        requiredTier: REQUIRED_TIER_BY_VIEW[normalizedView] || 'pro',
      })
    }
    const sourceRaw = String(item.userTierSource || '').trim().toLowerCase()
    const userTierSource = sourceRaw === 'request' || sourceRaw === 'template' || sourceRaw === 'default'
      ? sourceRaw
      : (options.userTier ? 'request' : 'default')

    const result: NexusViewAccessResult = {
      appId: client.appId,
      viewId: normalizedView,
      allowed: item.allowed,
      reason: item.reason,
      userTier,
      userTierSource,
      userTemplateKey: typeof item.userTemplateKey === 'string' ? item.userTemplateKey : null,
      paywallEnabled: item.paywallEnabled,
      requiredTier,
      evaluatedAt: item.evaluatedAt,
      cacheHit: false,
    }

    if (result.allowed && !meetsLocalTierPolicy(normalizedView, result.userTier)) {
      result.allowed = false
      result.reason = 'LOCAL_VIEW_TIER_POLICY_BLOCKED'
      result.paywallEnabled = true
      result.requiredTier = REQUIRED_TIER_BY_VIEW[normalizedView]
    }

    if (client.viewValidationCacheMs > 0) {
      client.viewAccessCache.set(cacheKey, {
        expiresAt: Date.now() + client.viewValidationCacheMs,
        result,
      })
    }

    return result
  } catch (error) {
    const rawMessage = String((error as Error | undefined)?.message || '')
    const offlineFromHttpCode = extractOfflineHttpCode(rawMessage)

    if (
      (error instanceof NexusControlError && isOfflineControlErrorCode(error.code))
      || (offlineFromHttpCode && isOfflineControlErrorCode(offlineFromHttpCode))
    ) {
      const offlineAllowed = isLocalFreeViewAllowed(client.appId, normalizedView)
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: offlineAllowed,
        reason: offlineAllowed ? 'OFFLINE_FREE_TIER_ALLOW' : 'OFFLINE_FREE_TIER_BLOCKED',
        paywallEnabled: !offlineAllowed,
        requiredTier: offlineAllowed ? null : 'pro',
        userTier: 'free',
        userTierSource: 'offline',
      })
    }

    if (shouldTrustLocalFreeView(client, normalizedView)) {
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: true,
        reason: getLocalFreeValidationFallbackReason(rawMessage),
        paywallEnabled: false,
        requiredTier: null,
      })
    }

    if (error instanceof NexusControlError) {
      const mapped = new Error(`VIEW_VALIDATION_${error.code}`)
      ;(mapped as any).name = error.code === 'TIMEOUT' ? 'AbortError' : 'Error'
      error = mapped
    }

    const allowed = !ALWAYS_FAIL_CLOSED_VIEWS.has(normalizedView) && client.viewValidationFailOpen
    const reason = getViewValidationErrorReason(client, error, allowed)
    if (client.debug) {
      const mode = allowed ? 'fail-open' : 'fail-closed'
      console.warn(`[NexusAPI:${client.appId}] view validation failed (${mode})`, error) // eslint-disable-line no-console
    }

    return buildFallbackResult(client, normalizedView, requestedTier, options, {
      allowed,
      reason,
      paywallEnabled: true,
    })
  }
}
