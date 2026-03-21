import type { NexusConnectionEvent, NexusPeerStatus } from '../types'
import { getPayloadBytes, isBrowser, isValidEvent, isValidTarget, isValidType, now, uid } from './constants'
import type { ConnectionListener, NexusConnectionOptions } from './options'

export class NexusConnectionManager {
  private appId: NexusConnectionOptions['appId']
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
  private peers = new Map<NexusConnectionOptions['appId'], number>()
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
      this.channel.onmessage = (msg) => this.handleIncoming(msg.data)
    }
    window.addEventListener('storage', this.onStorage)
    this.sendHeartbeat({ status: 'online' })
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat({ status: 'online' }), this.heartbeatMs)
    if (this.debug) console.info(`[NexusAPI:${this.appId}] connection started`) // eslint-disable-line no-console
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
    if (this.debug) console.info(`[NexusAPI:${this.appId}] connection stopped`) // eslint-disable-line no-console
  }

  subscribe(listener: ConnectionListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  publish<T = unknown>(type: NexusConnectionEvent<T>['type'], payload: T, target: NexusConnectionEvent['target'] = 'all') {
    if (!isValidType(type) || !isValidTarget(target)) return
    const payloadBytes = getPayloadBytes(payload)
    if (!Number.isFinite(payloadBytes) || payloadBytes > this.maxPayloadBytes) {
      if (this.debug) console.warn(`[NexusAPI:${this.appId}] payload blocked (${payloadBytes} bytes)`) // eslint-disable-line no-console
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

  syncState(key: string, value: unknown, target: NexusConnectionEvent['target'] = 'all') { this.publish('state-sync', { key, value }, target) }
  sendNavigation(route: string, target: NexusConnectionEvent['target'] = 'all') { this.publish('navigation', { route }, target) }
  sendHeartbeat(extra: Record<string, unknown> = {}) { this.publish('heartbeat', { at: now(), ...extra }, 'all') }

  getPeerStatus(): NexusPeerStatus[] {
    const ts = now()
    const peers = [...this.peers.entries()].map(([appId, lastSeenAt]) => ({ appId, lastSeenAt, stale: ts - lastSeenAt > this.staleAfterMs }))
    return peers.sort((a, b) => a.appId.localeCompare(b.appId))
  }

  getConnectedPeers() { return this.getPeerStatus().filter((peer) => !peer.stale) }

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
      this.handleIncoming(JSON.parse(ev.newValue) as NexusConnectionEvent)
    } catch {
      // Ignore malformed storage payloads.
    }
  }

  private handleIncoming(rawEvent: unknown) {
    if (!isValidEvent(rawEvent)) return
    const event = rawEvent as NexusConnectionEvent
    if (this.hasSeenEvent(event.id) || event.source === this.appId) return
    if (now() - event.timestamp > this.maxEventAgeMs) return
    this.markEventSeen(event.id)
    if (event.target !== 'all' && event.target !== this.appId) return
    if (event.type === 'heartbeat') this.peers.set(event.source, event.timestamp)
    this.dispatch(event)
  }

  private dispatch(event: NexusConnectionEvent) {
    for (const listener of this.listeners) listener(event)
  }

  private hasSeenEvent(eventId: string) { return this.recentEventIds.has(eventId) }

  private markEventSeen(eventId: string) {
    this.recentEventIds.add(eventId)
    this.recentEventOrder.push(eventId)
    if (this.recentEventOrder.length <= this.maxRecentEventIds) return
    const trim = this.recentEventOrder.length - this.maxRecentEventIds
    const removed = this.recentEventOrder.splice(0, trim)
    for (const id of removed) this.recentEventIds.delete(id)
  }
}
