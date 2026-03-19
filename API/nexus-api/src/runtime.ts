import { NexusConnectionManager, type NexusConnectionOptions } from './connection'
import { NexusPerformanceManager, type NexusPerformanceOptions } from './performance'
import type { NexusAppId } from './types'

export interface NexusRuntimeOptions {
  appId: NexusAppId
  appVersion?: string
  connection?: Omit<NexusConnectionOptions, 'appId'>
  performance?: Omit<NexusPerformanceOptions, 'appId' | 'connection'>
  debug?: boolean
}

export interface NexusRuntime {
  appId: NexusAppId
  appVersion: string
  connection: NexusConnectionManager
  performance: NexusPerformanceManager
  start: () => void
  stop: () => void
}

export const createNexusRuntime = (options: NexusRuntimeOptions): NexusRuntime => {
  const debug = options.debug ?? false
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

  const appVersion = options.appVersion ?? '0.0.0'

  return {
    appId: options.appId,
    appVersion,
    connection,
    performance,
    start: () => {
      connection.start()
      performance.start()
      connection.sendHeartbeat({
        status: 'online',
        appVersion,
      })
    },
    stop: () => {
      performance.stop()
      connection.stop()
    },
  }
}
