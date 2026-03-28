import type {
  NexusAppId,
  NexusConnectionEvent,
  NexusFeatureCatalog,
  NexusReleaseChannel,
  NexusReleaseSnapshot,
  NexusUiSchemaDocument,
  NexusUserTier,
  NexusViewAccessResult,
} from '../types'

export interface NexusControlOptions {
  enabled?: boolean
  baseUrl?: string
  // Deprecated: hosted-only runtime ignores local fallback knobs.
  localFallbackEnabled?: boolean
  localFallbackLatencyMs?: number
  token?: string
  ingestKey?: string
  flushIntervalMs?: number
  maxQueueSize?: number
  maxQueueBytes?: number
  maxBatchSize?: number
  requestTimeoutMs?: number
  requestDedupeEnabled?: boolean
  readRetryMax?: number
  readRetryBaseMs?: number
  readRetryMaxMs?: number
  sampleRate?: number
  debug?: boolean
  viewValidationEnabled?: boolean
  viewValidationFailOpen?: boolean
  viewValidationCacheMs?: number
  defaultUserId?: string
  defaultUsername?: string
  defaultUserTier?: NexusUserTier
  maxFlushRetries?: number
  flushRetryBaseMs?: number
  releasePollIntervalMs?: number
  defaultReleaseChannel?: NexusReleaseChannel
}

export interface NexusControlClientOptions extends NexusControlOptions {
  appId: NexusAppId
  appVersion: string
}

export interface NexusControlBatch {
  appId: NexusAppId
  appVersion: string
  sentAt: number
  events: NexusConnectionEvent[]
}

export interface NexusViewAccessCheckOptions {
  userId?: string
  username?: string
  userTier?: NexusUserTier
  forceRefresh?: boolean
}

export interface NexusViewWarmupOptions extends NexusViewAccessCheckOptions {
  concurrency?: number
}

export interface NexusViewWarmupResult {
  appId: NexusAppId
  checkedViews: string[]
  allowedViews: string[]
  blockedViews: string[]
  resultByView: Record<string, NexusViewAccessResult>
  durationMs: number
  checkedAt: string
}

export interface NexusFetchResult<T> {
  item: T | null
  etag: string | null
  fetchedAt: number
  fromCache: boolean
  notModified: boolean
  errorCode?: string
}

export interface NexusCatalogFetchOptions {
  appId?: NexusAppId
  channel?: NexusReleaseChannel
  forceRefresh?: boolean
  cacheTtlMs?: number
}

export interface NexusLayoutFetchOptions {
  appId?: NexusAppId
  channel?: NexusReleaseChannel
  forceRefresh?: boolean
  cacheTtlMs?: number
}

export interface NexusReleaseFetchOptions {
  appId?: NexusAppId
  channel?: NexusReleaseChannel
  forceRefresh?: boolean
  cacheTtlMs?: number
}

export interface NexusBundleFetchOptions {
  appId?: NexusAppId
  channel?: NexusReleaseChannel
  forceRefresh?: boolean
  cacheTtlMs?: number
}

export interface NexusReleaseSubscriptionOptions {
  appId?: NexusAppId
  channel?: NexusReleaseChannel
  pollIntervalMs?: number
  immediate?: boolean
}

export type {
  NexusFeatureCatalog,
  NexusUiSchemaDocument,
  NexusReleaseSnapshot,
  NexusViewAccessResult,
}
