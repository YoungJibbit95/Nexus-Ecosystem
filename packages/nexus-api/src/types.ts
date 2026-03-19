export type NexusAppId = 'main' | 'mobile' | 'code' | 'code-mobile'

export type NexusEventType =
  | 'heartbeat'
  | 'state-sync'
  | 'navigation'
  | 'performance-metric'
  | 'performance-summary'
  | 'custom'

export type NexusEventTarget = NexusAppId | 'all'

export interface NexusConnectionEvent<T = unknown> {
  id: string
  timestamp: number
  source: NexusAppId
  target: NexusEventTarget
  type: NexusEventType
  payload: T
}

export interface NexusPeerStatus {
  appId: NexusAppId
  lastSeenAt: number
  stale: boolean
}

export type NexusMetricType =
  | 'view-render'
  | 'long-task'
  | 'paint'
  | 'memory'
  | 'custom'

export interface NexusPerformanceMetric {
  id: string
  appId: NexusAppId
  type: NexusMetricType
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'score'
  timestamp: number
  tags?: Record<string, string>
}
