import type { NexusUserTier, NexusViewAccessResult } from '../../types'
import type { NexusViewAccessCheckOptions } from '../options'
import { abortableFetch, normalizeUserId, normalizeUserTier, normalizeViewId } from '../utils'
import { buildViewAccessCacheKey, getViewValidationErrorReason } from './common'

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
    userTierSource?: 'request' | 'template' | 'default'
  },
): NexusViewAccessResult => ({
  appId: client.appId,
  viewId: viewIdRaw,
  allowed: input.allowed,
  reason: input.reason,
  userTier: requestedTier,
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
      allowed: true,
      reason: client.localFallbackEnabled ? 'LOCAL_FALLBACK_ALLOW' : 'VIEW_VALIDATION_DISABLED',
      paywallEnabled: false,
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
    const response = await abortableFetch(`${client.baseUrl}/api/v1/views/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, client.requestTimeoutMs)

    if (!response.ok) throw new Error(`VIEW_VALIDATION_HTTP_${response.status}`)

    const data = await response.json()
    const item = data?.item ?? {}

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
    if (client.localFallbackEnabled) {
      return buildFallbackResult(client, normalizedView, requestedTier, options, {
        allowed: true,
        reason: 'LOCAL_FALLBACK_ALLOW',
        paywallEnabled: false,
      })
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
