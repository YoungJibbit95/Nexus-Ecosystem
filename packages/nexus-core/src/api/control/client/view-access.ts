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
import { buildViewAccessCacheKey, getViewValidationErrorReason } from './common'

const OFFLINE_FREE_VIEWS_BY_APP: Record<string, Set<string>> = {
  main: new Set(['dashboard', 'notes', 'tasks', 'reminders', 'files', 'settings', 'info']),
  mobile: new Set([]),
  code: new Set([]),
  'code-mobile': new Set([]),
}

const isOfflineFreeViewAllowed = (appId: string, viewId: string) => {
  const allowed = OFFLINE_FREE_VIEWS_BY_APP[appId]
  if (!allowed) return false
  return allowed.has(viewId)
}

const extractOfflineHttpCode = (messageRaw: string) => {
  const match = messageRaw.match(/VIEW_VALIDATION_HTTP_(\d{3})/)
  if (!match) return ''
  return `HTTP_${match[1]}`
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
    return buildFallbackResult(client, normalizedView, requestedTier, options, {
      allowed: false,
      reason: 'VIEW_VALIDATION_UNAVAILABLE_FAIL_CLOSED',
      paywallEnabled: true,
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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Nexus-App-Id': client.appId,
  }
  if (client.token) headers.Authorization = `Bearer ${client.token}`
  if (client.ingestKey) headers['X-Nexus-Ingest-Key'] = client.ingestKey

  try {
    const response = await requestJsonWithPolicy<any>(`${client.baseUrl}/api/v1/views/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      timeoutMs: client.requestTimeoutMs,
      maxRetries: 0,
      parseJson: true,
    })

    if (!response.ok) throw new Error(`VIEW_VALIDATION_HTTP_${response.status}`)
    if (response.parseError) throw new Error('VIEW_VALIDATION_INVALID_JSON')

    const data = response.data
    const item = data?.item ?? {}
    if (typeof item !== 'object' || item == null || Array.isArray(item)) {
      throw new Error('VIEW_VALIDATION_INVALID_SCHEMA')
    }

    const userTier = normalizeUserTier(item.userTier) || requestedTier
    const requiredTier = normalizeUserTier(item.requiredTier) || null
    const sourceRaw = String(item.userTierSource || '').trim().toLowerCase()
    const userTierSource = sourceRaw === 'request' || sourceRaw === 'template' || sourceRaw === 'default'
      ? sourceRaw
      : (options.userTier ? 'request' : 'default')

    const result: NexusViewAccessResult = {
      appId: client.appId,
      viewId: normalizedView,
      allowed: item.allowed !== false,
      reason: typeof item.reason === 'string' && item.reason.length > 0 ? item.reason : 'VIEW_VALIDATED',
      userTier,
      userTierSource,
      userTemplateKey: typeof item.userTemplateKey === 'string' ? item.userTemplateKey : null,
      paywallEnabled: item.paywallEnabled === true,
      requiredTier,
      evaluatedAt: typeof item.evaluatedAt === 'string' ? item.evaluatedAt : new Date().toISOString(),
      cacheHit: false,
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
      const offlineAllowed = isOfflineFreeViewAllowed(client.appId, normalizedView)
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: offlineAllowed,
        reason: offlineAllowed ? 'OFFLINE_FREE_TIER_ALLOW' : 'OFFLINE_FREE_TIER_BLOCKED',
        paywallEnabled: !offlineAllowed,
        requiredTier: offlineAllowed ? null : 'pro',
        userTier: 'free',
        userTierSource: 'offline',
      })
    }

    if (error instanceof NexusControlError) {
      const mapped = new Error(`VIEW_VALIDATION_${error.code}`)
      ;(mapped as any).name = error.code === 'TIMEOUT' ? 'AbortError' : 'Error'
      error = mapped
    }

    const allowed = client.viewValidationFailOpen
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
