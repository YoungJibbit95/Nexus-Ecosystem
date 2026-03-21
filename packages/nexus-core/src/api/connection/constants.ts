import type {
  NexusAppId,
  NexusConnectionEvent,
  NexusEventTarget,
  NexusEventType,
} from '../types'

export const now = () => Date.now()
export const isBrowser = typeof window !== 'undefined'

export const uid = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const EVENT_TYPES: NexusEventType[] = [
  'heartbeat',
  'state-sync',
  'navigation',
  'performance-metric',
  'performance-summary',
  'command',
  'config-update',
  'custom',
]

export const APP_IDS: NexusAppId[] = ['main', 'mobile', 'code', 'code-mobile', 'control']

export const getPayloadBytes = (payload: unknown) => {
  try {
    const text = JSON.stringify(payload)
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(text).byteLength
    }

    return unescape(encodeURIComponent(text)).length
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

export const isValidTarget = (target: unknown): target is NexusEventTarget => (
  target === 'all' || APP_IDS.includes(target as NexusAppId)
)

export const isValidType = (type: unknown): type is NexusEventType => EVENT_TYPES.includes(type as NexusEventType)

export const isValidEvent = (event: unknown): event is NexusConnectionEvent => {
  if (!event || typeof event !== 'object') return false

  const candidate = event as NexusConnectionEvent

  if (!candidate.id || typeof candidate.id !== 'string') return false
  if (!Number.isFinite(candidate.timestamp)) return false
  if (!APP_IDS.includes(candidate.source)) return false
  if (!isValidTarget(candidate.target)) return false
  if (!isValidType(candidate.type)) return false

  return true
}
