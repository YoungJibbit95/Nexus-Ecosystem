import type { NexusAppId, NexusConnectionEvent } from '../types'

export interface NexusConnectionOptions {
  appId: NexusAppId
  channelName?: string
  heartbeatMs?: number
  staleAfterMs?: number
  storageKey?: string
  maxRecentEventIds?: number
  maxPayloadBytes?: number
  maxEventAgeMs?: number
  debug?: boolean
}

export type ConnectionListener = (event: NexusConnectionEvent) => void
