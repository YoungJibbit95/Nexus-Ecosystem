import type {
  NexusFeatureCatalog,
  NexusLiveBundle,
  NexusReleaseChannel,
  NexusReleaseSnapshot,
  NexusUiSchemaDocument,
} from '../../types'
import type {
  NexusBundleFetchOptions,
  NexusCatalogFetchOptions,
  NexusFetchResult,
  NexusLayoutFetchOptions,
  NexusReleaseFetchOptions,
} from '../options'
import { abortableFetch, clamp, normalizeReleaseChannel } from '../utils'
import { buildReadHeaders, pickEtag } from './common'
import {
  buildLocalFallbackCatalog,
  buildLocalFallbackLayoutSchema,
  buildLocalFallbackRelease,
  maybeDelayLocalFallback,
} from './local-fallback'

const buildNoBaseUrlResult = <T>(cached: any) => ({
  item: cached?.item ?? null,
  etag: cached?.etag ?? null,
  fetchedAt: Date.now(),
  fromCache: false,
  notModified: false,
  errorCode: 'NO_BASE_URL',
} as NexusFetchResult<T>)

const buildNetworkResult = <T>(cached: any, error: unknown) => ({
  item: cached?.item ?? null,
  etag: cached?.etag ?? null,
  fetchedAt: Date.now(),
  fromCache: false,
  notModified: false,
  errorCode: (error as Error | undefined)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
} as NexusFetchResult<T>)

const buildHttpResult = <T>(cached: any, status: number) => ({
  item: cached?.item ?? null,
  etag: cached?.etag ?? null,
  fetchedAt: Date.now(),
  fromCache: false,
  notModified: false,
  errorCode: `HTTP_${status}`,
} as NexusFetchResult<T>)

const fetchCachedResource = async <T>(client: any, input: {
  appId: string
  channel: NexusReleaseChannel
  cache: Map<string, any>
  cacheTtlMs: number
  forceRefresh: boolean
  endpoint: string
  fallbackItem: () => T
}): Promise<NexusFetchResult<T>> => {
  const cacheKey = `${input.appId}|${input.channel}`
  const cached = input.cache.get(cacheKey)
  const fallbackEtag = `local-fallback:${input.appId}:${input.channel}`
  const buildLocalFallbackResult = async (errorCode: string): Promise<NexusFetchResult<T>> => {
    const item = input.fallbackItem()
    const fetchedAt = Date.now()
    await maybeDelayLocalFallback(client)
    input.cache.set(cacheKey, { item, etag: fallbackEtag, fetchedAt })
    return {
      item,
      etag: fallbackEtag,
      fetchedAt,
      fromCache: false,
      notModified: false,
      errorCode,
    }
  }

  if (!input.forceRefresh && cached && input.cacheTtlMs > 0 && (Date.now() - cached.fetchedAt) <= input.cacheTtlMs) {
    return {
      item: cached.item,
      etag: cached.etag,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      notModified: false,
    }
  }

  if (!client.baseUrl) {
    if (client.localFallbackEnabled) {
      return buildLocalFallbackResult('LOCAL_FALLBACK_NO_BASE_URL')
    }
    return buildNoBaseUrlResult<T>(cached)
  }

  try {
    const response = await abortableFetch(input.endpoint, {
      method: 'GET',
      headers: buildReadHeaders(client, input.appId as any, cached?.etag || null),
    }, client.requestTimeoutMs)

    if (response.status === 304 && cached) {
      return {
        item: cached.item,
        etag: cached.etag,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        notModified: true,
      }
    }

    if (!response.ok) {
      if (client.localFallbackEnabled) {
        return buildLocalFallbackResult(`LOCAL_FALLBACK_HTTP_${response.status}`)
      }
      return buildHttpResult<T>(cached, response.status)
    }

    const data = await response.json()
    const item = (data?.item || null) as T | null
    if (!item) {
      if (client.localFallbackEnabled) {
        return buildLocalFallbackResult('LOCAL_FALLBACK_INVALID_PAYLOAD')
      }
      return {
        ...buildNoBaseUrlResult<T>(cached),
        errorCode: 'INVALID_PAYLOAD',
      }
    }

    const etag = pickEtag(client, response, data?.etag)
    const fetchedAt = Date.now()
    input.cache.set(cacheKey, {
      item,
      etag,
      fetchedAt,
    })

    return {
      item,
      etag,
      fetchedAt,
      fromCache: false,
      notModified: false,
    }
  } catch (error) {
    if (client.localFallbackEnabled) {
      return buildLocalFallbackResult('LOCAL_FALLBACK_NETWORK')
    }
    return buildNetworkResult<T>(cached, error)
  }
}

export const fetchCatalog = (client: any, options: NexusCatalogFetchOptions = {}) => {
  const appId = options.appId || client.appId
  const channel = normalizeReleaseChannel(options.channel, client.defaultReleaseChannel)
  const cacheTtlMs = clamp(Math.floor(options.cacheTtlMs ?? 20_000), 0, 300_000)
  return fetchCachedResource<NexusFeatureCatalog>(client, {
    appId,
    channel,
    cache: client.catalogCache,
    cacheTtlMs,
    forceRefresh: options.forceRefresh === true,
    endpoint: `${client.baseUrl}/api/v2/features/catalog?appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channel)}`,
    fallbackItem: () => buildLocalFallbackCatalog(appId as any, channel),
  })
}

export const fetchLayoutSchema = (client: any, options: NexusLayoutFetchOptions = {}) => {
  const appId = options.appId || client.appId
  const channel = normalizeReleaseChannel(options.channel, client.defaultReleaseChannel)
  const cacheTtlMs = clamp(Math.floor(options.cacheTtlMs ?? 20_000), 0, 300_000)
  return fetchCachedResource<NexusUiSchemaDocument>(client, {
    appId,
    channel,
    cache: client.layoutCache,
    cacheTtlMs,
    forceRefresh: options.forceRefresh === true,
    endpoint: `${client.baseUrl}/api/v2/layout/schema?appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channel)}`,
    fallbackItem: () => buildLocalFallbackLayoutSchema(appId as any, channel),
  })
}

export const fetchCurrentRelease = (client: any, options: NexusReleaseFetchOptions = {}) => {
  const appId = options.appId || client.appId
  const channel = normalizeReleaseChannel(options.channel, client.defaultReleaseChannel)
  const cacheTtlMs = clamp(Math.floor(options.cacheTtlMs ?? 10_000), 0, 300_000)
  return fetchCachedResource<NexusReleaseSnapshot>(client, {
    appId,
    channel,
    cache: client.releaseCache,
    cacheTtlMs,
    forceRefresh: options.forceRefresh === true,
    endpoint: `${client.baseUrl}/api/v2/releases/current?appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channel)}`,
    fallbackItem: () => buildLocalFallbackRelease(appId as any, channel),
  })
}

export const fetchLiveBundle = async (client: any, options: NexusBundleFetchOptions = {}): Promise<NexusLiveBundle> => {
  const appId = options.appId || client.appId
  const channel = normalizeReleaseChannel(options.channel, client.defaultReleaseChannel)
  const forceRefresh = options.forceRefresh === true
  const cacheTtlMs = options.cacheTtlMs

  const [catalog, layoutSchema, release] = await Promise.all([
    fetchCatalog(client, { appId, channel, forceRefresh, cacheTtlMs }),
    fetchLayoutSchema(client, { appId, channel, forceRefresh, cacheTtlMs }),
    fetchCurrentRelease(client, { appId, channel, forceRefresh, cacheTtlMs }),
  ])

  return {
    appId,
    channel,
    catalog: catalog.item,
    layoutSchema: layoutSchema.item,
    release: release.item,
  }
}
