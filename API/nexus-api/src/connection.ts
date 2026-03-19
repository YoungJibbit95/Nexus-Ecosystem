import type {
  NexusAppId,
  NexusConnectionEvent,
  NexusEventTarget,
  NexusEventType,
  NexusPeerStatus,
} from './types'

const now = () => Date.now()
const isBrowser = typeof window !== 'undefined'

const uid = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const EVENT_TYPES: NexusEventType[] = [
  'heartbeat',
  'state-sync',
  'navigation',
  'performance-metric',
  'performance-summary',
  'command',
  'config-update',
  'custom',
]

const APP_IDS: NexusAppId[] = ['main', 'mobile', 'code', 'code-mobile', 'control']

const getPayloadBytes = (payload: unknown) => {
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

const isValidTarget = (target: unknown): target is NexusEventTarget => (
  target === 'all' || APP_IDS.includes(target as NexusAppId)
)

const isValidType = (type: unknown): type is NexusEventType => EVENT_TYPES.includes(type as NexusEventType)

const isValidEvent = (event: unknown): event is NexusConnectionEvent => {
  if (!event || typeof event !== 'object') return false

  const candidate = event as NexusConnectionEvent

  if (!candidate.id || typeof candidate.id !== 'string') return false
  if (!Number.isFinite(candidate.timestamp)) return false
  if (!APP_IDS.includes(candidate.source)) return false
  if (!isValidTarget(candidate.target)) return false
  if (!isValidType(candidate.type)) return false

  return true
}

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

type ConnectionListener = (event: NexusConnectionEvent) => void

export class NexusConnectionManager {
  private appId: NexusAppId
  private channelName: string
  private heartbeatMs: number
  private staleAfterMs: number
  private storageKey: string
  private maxRecentEventIds: number
  private maxPayloadBytes: number
  private maxEventAgeMs: number
  private debug: boolean

  private channel: BroadcastChannel | null = null
  private listeners = new Set<ConnectionListener>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private peers = new Map<NexusAppId, number>()
  private recentEventIds = new Set<string>()
  private recentEventOrder: string[] = []
  private started = false

  constructor(options: NexusConnectionOptions) {
    this.appId = options.appId
    this.channelName = options.channelName ?? 'nexus-ecosystem-bus'
    this.heartbeatMs = options.heartbeatMs ?? 15_000
    this.staleAfterMs = options.staleAfterMs ?? 45_000
    this.storageKey = options.storageKey ?? '__nexus_ecosystem_bus__'
    this.maxRecentEventIds = options.maxRecentEventIds ?? 1_200
    this.maxPayloadBytes = options.maxPayloadBytes ?? 16_000
    this.maxEventAgeMs = options.maxEventAgeMs ?? 5 * 60_000
    this.debug = options.debug ?? false
  }

  start() {
    if (this.started || !isBrowser) return
    this.started = true

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(this.channelName)
      this.channel.onmessage = (msg) => {
        this.handleIncoming(msg.data)
      }
    }

    window.addEventListener('storage', this.onStorage)

    this.sendHeartbeat({ status: 'online' })
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat({ status: 'online' })
    }, this.heartbeatMs)

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] connection started`) // eslint-disable-line no-console
    }
  }

  stop() {
    if (!this.started || !isBrowser) return
    this.started = false

    this.sendHeartbeat({ status: 'offline' })

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.channel) {
      this.channel.close()
      this.channel = null
    }

    window.removeEventListener('storage', this.onStorage)

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] connection stopped`) // eslint-disable-line no-console
    }
  }

  subscribe(listener: ConnectionListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publish<T = unknown>(type: NexusEventType, payload: T, target: NexusEventTarget = 'all') {
    if (!isValidType(type)) return
    if (!isValidTarget(target)) return

    const payloadBytes = getPayloadBytes(payload)
    if (!Number.isFinite(payloadBytes) || payloadBytes > this.maxPayloadBytes) {
      if (this.debug) {
        console.warn(`[NexusAPI:${this.appId}] payload blocked (${payloadBytes} bytes)`) // eslint-disable-line no-console
      }
      return
    }

    const event: NexusConnectionEvent<T> = {
      id: uid(),
      timestamp: now(),
      source: this.appId,
      target,
      type,
      payload,
    }

    this.markEventSeen(event.id)
    this.dispatch(event)
    this.broadcast(event)
  }

  syncState(key: string, value: unknown, target: NexusEventTarget = 'all') {
    this.publish('state-sync', { key, value }, target)
  }

  sendNavigation(route: string, target: NexusEventTarget = 'all') {
    this.publish('navigation', { route }, target)
  }

  sendHeartbeat(extra: Record<string, unknown> = {}) {
    this.publish('heartbeat', { at: now(), ...extra }, 'all')
  }

  getPeerStatus(): NexusPeerStatus[] {
    const ts = now()
    const peers = [...this.peers.entries()].map(([appId, lastSeenAt]) => ({
      appId,
      lastSeenAt,
      stale: ts - lastSeenAt > this.staleAfterMs,
    }))

    return peers.sort((a, b) => a.appId.localeCompare(b.appId))
  }

  getConnectedPeers() {
    return this.getPeerStatus().filter((peer) => !peer.stale)
  }

  private broadcast(event: NexusConnectionEvent) {
    if (!isBrowser) return

    if (this.channel) {
      this.channel.postMessage(event)
      return
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(event))
      localStorage.removeItem(this.storageKey)
    } catch {
      // Ignore storage quota/security errors silently.
    }
  }

  private onStorage = (ev: StorageEvent) => {
    if (ev.key !== this.storageKey || !ev.newValue) return

    try {
      const event = JSON.parse(ev.newValue) as NexusConnectionEvent
      this.handleIncoming(event)
    } catch {
      // Ignore malformed storage payloads.
    }
  }

  private handleIncoming(rawEvent: unknown) {
    if (!isValidEvent(rawEvent)) return

    const event = rawEvent as NexusConnectionEvent

    if (this.hasSeenEvent(event.id)) return
    if (event.source === this.appId) return

    const isExpired = now() - event.timestamp > this.maxEventAgeMs
    if (isExpired) return

    this.markEventSeen(event.id)

    if (event.target !== 'all' && event.target !== this.appId) {
      return
    }

    if (event.type === 'heartbeat') {
      this.peers.set(event.source, event.timestamp)
    }

    this.dispatch(event)
  }

  private dispatch(event: NexusConnectionEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }

  private hasSeenEvent(eventId: string) {
    return this.recentEventIds.has(eventId)
  }

  private markEventSeen(eventId: string) {
    this.recentEventIds.add(eventId)
    this.recentEventOrder.push(eventId)

    if (this.recentEventOrder.length > this.maxRecentEventIds) {
      const trim = this.recentEventOrder.length - this.maxRecentEventIds
      const removed = this.recentEventOrder.splice(0, trim)
      for (const id of removed) {
        this.recentEventIds.delete(id)
      }
    }
  }
}
