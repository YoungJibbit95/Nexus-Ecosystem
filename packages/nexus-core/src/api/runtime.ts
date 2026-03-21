import { NexusConnectionManager, type NexusConnectionOptions } from './connection'
import { NexusPerformanceManager, type NexusPerformanceOptions } from './performance'
import { NexusControlClient, type NexusControlOptions } from './control'
import type {
  NexusAppId,
  NexusCapabilityReport,
  NexusCompatibilityResult,
  NexusConnectionEvent,
  NexusLiveBundle,
  NexusPerformanceMetric,
  NexusReleaseChannel,
  NexusReleaseUpdateEvent,
} from './types'

export interface NexusRuntimeOptions {
  appId: NexusAppId
  appVersion?: string
  connection?: Omit<NexusConnectionOptions, 'appId'>
  performance?: Omit<NexusPerformanceOptions, 'appId' | 'connection'>
  control?: NexusControlOptions
  liveSync?: {
    enabled?: boolean
    channel?: NexusReleaseChannel
    pollIntervalMs?: number
    immediate?: boolean
    reportCapabilities?: Partial<NexusCapabilityReport>
    onUpdate?: (event: NexusReleaseUpdateEvent) => void
  }
  debug?: boolean
}

export interface NexusRuntime {
  appId: NexusAppId
  appVersion: string
  connection: NexusConnectionManager
  performance: NexusPerformanceManager
  control: NexusControlClient
  loadLiveBundle: (options?: { channel?: NexusReleaseChannel; forceRefresh?: boolean; cacheTtlMs?: number }) => Promise<NexusLiveBundle>
  resolveCompatibility: (bundle: Partial<NexusLiveBundle>, channel?: NexusReleaseChannel) => NexusCompatibilityResult
  start: () => void
  stop: () => void
}

export const createNexusRuntime = (options: NexusRuntimeOptions): NexusRuntime => {
  const debug = options.debug ?? false
  const appVersion = options.appVersion ?? '0.0.0'

  const connection = new NexusConnectionManager({
    appId: options.appId,
    debug,
    ...options.connection,
  })

  const performance = new NexusPerformanceManager({
    appId: options.appId,
    connection,
    debug,
    ...options.performance,
  })

  const control = new NexusControlClient({
    appId: options.appId,
    appVersion,
    debug,
    ...options.control,
  })

  let unsubscribeConnection: (() => void) | null = null
  let unsubscribePerformance: (() => void) | null = null
  let unsubscribeReleaseSync: (() => void) | null = null

  return {
    appId: options.appId,
    appVersion,
    connection,
    performance,
    control,
    loadLiveBundle: (bundleOptions = {}) => control.fetchLiveBundle({
      appId: options.appId,
      channel: bundleOptions.channel,
      forceRefresh: bundleOptions.forceRefresh,
      cacheTtlMs: bundleOptions.cacheTtlMs,
    }),
    resolveCompatibility: (bundle, channel) => control.resolveFeatureCompatibility({
      appId: options.appId,
      appVersion,
      channel: channel || bundle.channel,
      catalog: bundle.catalog || null,
      layoutSchema: bundle.layoutSchema || null,
      release: bundle.release || null,
    }),
    start: () => {
      connection.start()
      performance.start()
      control.start()

      unsubscribeConnection = connection.subscribe((event: NexusConnectionEvent) => {
        control.ingestConnectionEvent(event)
      })

      unsubscribePerformance = performance.subscribe((metric: NexusPerformanceMetric) => {
        control.ingestPerformanceMetric(metric)
      })

      connection.sendHeartbeat({
        status: 'online',
        appVersion,
      })

      const liveSync = options.liveSync || {}
      if (liveSync.enabled !== false) {
        void control.reportCapabilities({
          appId: options.appId,
          appVersion,
          ...liveSync.reportCapabilities,
        })

        unsubscribeReleaseSync = control.subscribeReleaseUpdates({
          appId: options.appId,
          channel: liveSync.channel || options.control?.defaultReleaseChannel || 'production',
          pollIntervalMs: liveSync.pollIntervalMs,
          immediate: liveSync.immediate,
        }, (event) => {
          if (typeof liveSync.onUpdate === 'function') {
            liveSync.onUpdate(event)
          }
        })
      }
    },
    stop: () => {
      if (unsubscribeConnection) {
        unsubscribeConnection()
        unsubscribeConnection = null
      }
      if (unsubscribePerformance) {
        unsubscribePerformance()
        unsubscribePerformance = null
      }
      if (unsubscribeReleaseSync) {
        unsubscribeReleaseSync()
        unsubscribeReleaseSync = null
      }

      performance.stop()
      connection.stop()
      control.stop()
    },
  }
}
