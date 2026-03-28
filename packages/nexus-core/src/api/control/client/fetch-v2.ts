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
import {
  NexusControlError,
  clamp,
  normalizeReleaseChannel,
  requestJsonWithPolicy,
} from '../utils'
import { buildReadHeaders, pickEtag } from './common'

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)
const nonEmpty = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const validateCatalogItem = (item: unknown, appId: string, channel: NexusReleaseChannel) => {
  if (!isObject(item)) return false
  if (!nonEmpty(item.schemaVersion) || !nonEmpty(item.featureVersion)) return false
  if (String(item.channel || '').trim() !== channel) return false
  if (!Array.isArray(item.features)) return false
  const compatMatrix = isObject(item.compatMatrix) ? item.compatMatrix : null
  if (!compatMatrix || !nonEmpty(compatMatrix[appId])) return false
  return true
}

const validateLayoutItem = (item: unknown, appId: string, channel: NexusReleaseChannel) => {
  if (!isObject(item)) return false
  if (!nonEmpty(item.schemaVersion) || !nonEmpty(item.featureVersion) || !nonEmpty(item.minClientVersion)) return false
  if (String(item.appId || '').trim() !== appId) return false
  if (String(item.channel || '').trim() !== channel) return false
  if (!Array.isArray(item.screens) || !isObject(item.layoutProfile)) return false
  return true
}

const validateReleaseItem = (item: unknown, appId: string, channel: NexusReleaseChannel) => {
  if (!isObject(item)) return false
  if (!nonEmpty(item.id) || !nonEmpty(item.schemaVersion) || !nonEmpty(item.featureVersion)) return false
  if (String(item.appId || '').trim() !== appId) return false
  if (String(item.channel || '').trim() !== channel) return false
  return true
}

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
  errorCode: (
    error instanceof NexusControlError
      ? error.code
      : ((error as Error | undefined)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK')
  ),
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
  validateItem?: (item: unknown) => boolean
}): Promise<NexusFetchResult<T>> => {
  const cacheKey = `${input.appId}|${input.channel}`
  const cached = input.cache.get(cacheKey)

  if (!input.forceRefresh && cached && input.cacheTtlMs > 0 && (Date.now() - cached.fetchedAt) <= input.cacheTtlMs) {
    return {
      item: cached.item,
      etag: cached.etag,
      fetchedAt: cached.fetchedAt,
      fromCache: true,
      notModified: false,
    }
  }

  if (!client.baseUrl) return buildNoBaseUrlResult<T>(cached)

  try {
    const response = await requestJsonWithPolicy<any>(input.endpoint, {
      method: 'GET',
      headers: buildReadHeaders(client, input.appId as any, cached?.etag || null),
      timeoutMs: client.requestTimeoutMs,
      maxRetries: client.readRetryMax,
      retryBaseMs: client.readRetryBaseMs,
      retryMaxMs: client.readRetryMaxMs,
      dedupeKey: client.requestDedupeEnabled ? `${input.endpoint}|${cached?.etag || '-'}` : '',
      dedupeMap: client.requestDedupeEnabled ? client.inflightGetRequests : undefined,
    })

    if (response.status === 304 && cached) {
      return {
        item: cached.item,
        etag: cached.etag,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        notModified: true,
      }
    }

    if (!response.ok) return buildHttpResult<T>(cached, response.status)

    if (response.parseError) {
      return {
        ...buildNoBaseUrlResult<T>(cached),
        errorCode: 'INVALID_JSON',
      }
    }

    const data = response.data
    const item = (data?.item || null) as T | null
    if (!item) {
      return {
        ...buildNoBaseUrlResult<T>(cached),
        errorCode: 'INVALID_PAYLOAD',
      }
    }

    if (typeof input.validateItem === 'function' && !input.validateItem(item)) {
      return {
        ...buildNoBaseUrlResult<T>(cached),
        errorCode: 'INVALID_SCHEMA',
      }
    }

    const etag = pickEtag(client, { headers: response.headers } as Response, data?.etag)
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
    validateItem: (item) => validateCatalogItem(item, appId, channel),
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
    validateItem: (item) => validateLayoutItem(item, appId, channel),
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
    validateItem: (item) => validateReleaseItem(item, appId, channel),
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
