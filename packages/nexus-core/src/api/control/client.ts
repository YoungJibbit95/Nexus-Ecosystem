import type {
  NexusCapabilityReport,
  NexusCompatibilityResult,
  NexusConnectionEvent,
  NexusFeatureCatalog,
  NexusPerformanceMetric,
  NexusReleaseSnapshot,
  NexusUiSchemaDocument,
  NexusUserTier,
  NexusViewAccessResult,
} from '../types'
import type {
  NexusBundleFetchOptions,
  NexusCatalogFetchOptions,
  NexusControlBatch,
  NexusControlClientOptions,
  NexusFetchResult,
  NexusLayoutFetchOptions,
  NexusReleaseFetchOptions,
  NexusReleaseSubscriptionOptions,
  NexusViewAccessCheckOptions,
  NexusViewWarmupOptions,
  NexusViewWarmupResult,
} from './options'
import { clamp, isBrowser, normalizeBaseUrl, normalizeReleaseChannel, normalizeUserId, normalizeUserTier, shouldSample } from './utils'
import { clearRemoteCaches } from './client/common'
import { reportCapabilities } from './client/capabilities'
import { resolveFeatureCompatibility } from './client/compatibility'
import { fetchCatalog, fetchCurrentRelease, fetchLayoutSchema, fetchLiveBundle } from './client/fetch-v2'
import { flush, pushEvent } from './client/flush'
import { subscribeReleaseUpdates } from './client/subscription'
import { validateViewAccess } from './client/view-access'
import { warmupViewAccess } from './client/warmup'
export class NexusControlClient {
  private appId: NexusControlClientOptions['appId']
  private appVersion: string
  private enabled: boolean
  private baseUrl: string
  private localFallbackEnabled: boolean
  private localFallbackLatencyMs: number
  private token: string
  private ingestKey: string
  private flushIntervalMs: number
  private maxQueueSize: number
  private maxBatchSize: number
  private requestTimeoutMs: number
  private sampleRate: number
  private debug: boolean
  private viewValidationEnabled: boolean
  private viewValidationFailOpen: boolean
  private viewValidationCacheMs: number
  private defaultUserId: string
  private defaultUsername: string
  private defaultUserTier: NexusUserTier
  private maxFlushRetries: number
  private flushRetryBaseMs: number
  private releasePollIntervalMs: number
  private defaultReleaseChannel: any
  private queue: NexusConnectionEvent[] = []
  private started = false
  private timer: ReturnType<typeof setInterval> | null = null
  private flushing = false
  private viewAccessCache = new Map<string, { expiresAt: number; result: NexusViewAccessResult }>()
  private catalogCache = new Map<string, { fetchedAt: number; etag: string | null; item: NexusFeatureCatalog }>()
  private layoutCache = new Map<string, { fetchedAt: number; etag: string | null; item: NexusUiSchemaDocument }>()
  private releaseCache = new Map<string, { fetchedAt: number; etag: string | null; item: NexusReleaseSnapshot }>()
  constructor(options: NexusControlClientOptions) {
    this.appId = options.appId
    this.appVersion = options.appVersion
    this.enabled = options.enabled ?? Boolean(options.baseUrl)
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    // Hosted-only runtime: local API fallbacks remain hard-disabled.
    this.localFallbackEnabled = false
    this.localFallbackLatencyMs = clamp(Math.floor(options.localFallbackLatencyMs ?? 80), 0, 2_000)
    this.token = options.token ?? ''
    this.ingestKey = options.ingestKey ?? ''
    this.flushIntervalMs = options.flushIntervalMs ?? 5_000
    this.maxQueueSize = options.maxQueueSize ?? 500
    this.maxBatchSize = options.maxBatchSize ?? 150
    this.requestTimeoutMs = options.requestTimeoutMs ?? 4_000
    this.sampleRate = clamp(options.sampleRate ?? 1, 0, 1)
    this.debug = options.debug ?? false
    this.viewValidationEnabled = options.viewValidationEnabled ?? Boolean(options.baseUrl)
    this.viewValidationFailOpen = false
    this.viewValidationCacheMs = clamp(options.viewValidationCacheMs ?? 15_000, 0, 300_000)
    this.defaultUserId = normalizeUserId(options.defaultUserId || '')
    this.defaultUsername = normalizeUserId(options.defaultUsername || '')
    this.defaultUserTier = normalizeUserTier(options.defaultUserTier) || 'free'
    this.maxFlushRetries = clamp(Math.floor(options.maxFlushRetries ?? 2), 0, 5)
    this.flushRetryBaseMs = clamp(Math.floor(options.flushRetryBaseMs ?? 300), 50, 3_000)
    this.releasePollIntervalMs = clamp(Math.floor(options.releasePollIntervalMs ?? 15_000), 2_000, 120_000)
    this.defaultReleaseChannel = normalizeReleaseChannel(options.defaultReleaseChannel, 'production')
  }
  start() {
    if (this.started || !this.enabled || !isBrowser || !this.baseUrl) return
    this.started = true
    this.timer = setInterval(() => { void this.flush() }, this.flushIntervalMs)
    if (this.debug) console.info(`[NexusAPI:${this.appId}] control client started`) // eslint-disable-line no-console
  }
  stop() {
    if (!this.started) return
    this.started = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    void this.flush()
    if (this.debug) console.info(`[NexusAPI:${this.appId}] control client stopped`) // eslint-disable-line no-console
  }
  setToken(token: string) {
    this.token = token || ''
    clearRemoteCaches(this)
  }
  setBaseUrl(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.enabled = Boolean(this.baseUrl)
    clearRemoteCaches(this)
  }
  ingestConnectionEvent(event: NexusConnectionEvent) {
    if (!this.enabled || !this.baseUrl || event.source !== this.appId || !shouldSample(this.sampleRate)) return
    pushEvent(this, event)
  }
  ingestPerformanceMetric(metric: NexusPerformanceMetric) {
    if (!this.enabled || !this.baseUrl || metric.appId !== this.appId || !shouldSample(this.sampleRate)) return
    const wrapped: NexusConnectionEvent = {
      id: metric.id,
      timestamp: metric.timestamp,
      source: metric.appId,
      target: 'all',
      type: 'performance-metric',
      payload: metric,
    }
    pushEvent(this, wrapped)
  }
  async fetchRemoteConfig() {
    if (!this.baseUrl || !this.token) return null
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/config/apps/${this.appId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.token}` },
      })
      if (!response.ok) return null
      const data = await response.json()
      return data?.item ?? null
    } catch {
      return null
    }
  }
  setViewValidationDefaults(options: { userId?: string; username?: string; userTier?: NexusUserTier } = {}) {
    if (options.userId != null) this.defaultUserId = normalizeUserId(options.userId)
    if (options.username != null) this.defaultUsername = normalizeUserId(options.username)
    if (options.userTier != null) {
      const nextTier = normalizeUserTier(options.userTier)
      if (nextTier) this.defaultUserTier = nextTier
    }
  }
  validateViewAccess(viewId: string, options: NexusViewAccessCheckOptions = {}): Promise<NexusViewAccessResult> {
    return validateViewAccess(this, viewId, options)
  }
  warmupViewAccess(viewIds: string[], options: NexusViewWarmupOptions = {}): Promise<NexusViewWarmupResult> {
    return warmupViewAccess(this, viewIds, options)
  }
  fetchCatalog(options: NexusCatalogFetchOptions = {}): Promise<NexusFetchResult<NexusFeatureCatalog>> {
    return fetchCatalog(this, options)
  }
  fetchLayoutSchema(options: NexusLayoutFetchOptions = {}): Promise<NexusFetchResult<NexusUiSchemaDocument>> {
    return fetchLayoutSchema(this, options)
  }
  fetchCurrentRelease(options: NexusReleaseFetchOptions = {}): Promise<NexusFetchResult<NexusReleaseSnapshot>> {
    return fetchCurrentRelease(this, options)
  }
  fetchLiveBundle(options: NexusBundleFetchOptions = {}) {
    return fetchLiveBundle(this, options)
  }
  resolveFeatureCompatibility(input: {
    appId?: any
    appVersion?: string
    channel?: any
    catalog?: NexusFeatureCatalog | null
    layoutSchema?: NexusUiSchemaDocument | null
    release?: NexusReleaseSnapshot | null
  } = {}): NexusCompatibilityResult {
    return resolveFeatureCompatibility(this, input)
  }
  reportCapabilities(report: Partial<NexusCapabilityReport> = {}) {
    return reportCapabilities(this, report)
  }
  subscribeReleaseUpdates(options: NexusReleaseSubscriptionOptions = {}, listener: (event: any) => void) {
    return subscribeReleaseUpdates(this, options, listener)
  }
  async flush() {
    return flush(this)
  }
}
