import type { NexusAppId, NexusUserTier } from '../../types'

export const buildViewAccessCacheKey = (client: any, viewId: string, userId: string, username: string, tier: NexusUserTier) => (
  [client.appId, viewId, userId || '-', username || '-', tier].join('|')
)

export const clearRemoteCaches = (client: any) => {
  client.viewAccessCache.clear()
  client.catalogCache.clear()
  client.layoutCache.clear()
  client.releaseCache.clear()
}

export const pickEtag = (_client: any, response: Response, fallback: unknown) => {
  const header = response.headers.get('etag')
  if (header && header.trim()) return header.trim()
  const raw = String(fallback || '').trim()
  return raw || null
}

export const buildReadHeaders = (client: any, appId: NexusAppId, etag: string | null = null) => {
  const headers: Record<string, string> = {
    'X-Nexus-App-Id': appId,
  }

  if (client.token) {
    headers.Authorization = `Bearer ${client.token}`
  }
  if (client.ingestKey) {
    headers['X-Nexus-Ingest-Key'] = client.ingestKey
  }
  if (etag) {
    headers['If-None-Match'] = etag
  }

  return headers
}

export const buildWriteHeaders = (client: any, appId: NexusAppId) => ({
  ...buildReadHeaders(client, appId),
  'Content-Type': 'application/json',
})

export const inferPlatformFromApp = (_client: any, appId: NexusAppId) => {
  if (appId === 'mobile' || appId === 'code-mobile') return 'mobile'
  if (appId === 'main' || appId === 'code') return 'desktop'
  return 'web'
}

export const getViewValidationErrorReason = (_client: any, error: unknown, failOpen: boolean) => {
  const raw = String((error as Error | undefined)?.message || '')
  const suffix = failOpen ? 'FAIL_OPEN' : 'FAIL_CLOSED'

  if ((error as Error | undefined)?.name === 'AbortError') {
    return `VIEW_VALIDATION_TIMEOUT_${suffix}`
  }

  if (raw.includes('VIEW_VALIDATION_HTTP_401')) return `VIEW_VALIDATION_HTTP_401_${suffix}`
  if (raw.includes('VIEW_VALIDATION_HTTP_403')) return `VIEW_VALIDATION_HTTP_403_${suffix}`
  if (raw.includes('VIEW_VALIDATION_HTTP_404')) return `VIEW_VALIDATION_HTTP_404_${suffix}`
  if (raw.includes('VIEW_VALIDATION_HTTP_408')) return `VIEW_VALIDATION_HTTP_408_${suffix}`
  if (raw.includes('VIEW_VALIDATION_HTTP_429')) return `VIEW_VALIDATION_HTTP_429_${suffix}`
  if (raw.includes('VIEW_VALIDATION_HTTP_5')) return `VIEW_VALIDATION_HTTP_5XX_${suffix}`
  if (raw.includes('VIEW_VALIDATION_HTTP_')) return `VIEW_VALIDATION_HTTP_${suffix}`

  return `VIEW_VALIDATION_NETWORK_ERROR_${suffix}`
}

export const shouldRetryStatus = (_client: any, status: number) => status === 408 || status === 429 || status >= 500

export const requeue = (client: any, batch: any[]) => {
  if (batch.length === 0) return
  client.queue = [...batch, ...client.queue]

  if (client.queue.length > client.maxQueueSize) {
    client.queue.splice(client.maxQueueSize)
  }
}
