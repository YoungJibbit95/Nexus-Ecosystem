import type { NexusAppId, NexusPerformanceMetric } from '../types'
import { NexusConnectionManager } from '../connection'

export interface NexusPerformanceOptions {
  appId: NexusAppId
  connection?: NexusConnectionManager
  collectMemoryMs?: number
  longTaskThresholdMs?: number
  reportToBus?: boolean
  maxMetricsPerMinute?: number
  summaryIntervalMs?: number
  maxRecentMetrics?: number
  debug?: boolean
}

export type MetricListener = (metric: NexusPerformanceMetric) => void
