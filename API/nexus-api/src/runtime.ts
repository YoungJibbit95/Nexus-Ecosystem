import { NexusConnectionManager, type NexusConnectionOptions } from './connection'
import { NexusPerformanceManager, type NexusPerformanceOptions } from './performance'
import { NexusControlClient, type NexusControlOptions } from './control'
import type { NexusAppId, NexusConnectionEvent, NexusPerformanceMetric } from './types'

export interface NexusRuntimeOptions {
  appId: NexusAppId
  appVersion?: string
  connection?: Omit<NexusConnectionOptions, 'appId'>
  performance?: Omit<NexusPerformanceOptions, 'appId' | 'connection'>
  control?: NexusControlOptions
  debug?: boolean
}

export interface NexusRuntime {
  appId: NexusAppId
  appVersion: string
  connection: NexusConnectionManager
  performance: NexusPerformanceManager
  control: NexusControlClient
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

  return {
    appId: options.appId,
    appVersion,
    connection,
    performance,
    control,
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

      performance.stop()
      connection.stop()
      control.stop()
    },
  }
}
