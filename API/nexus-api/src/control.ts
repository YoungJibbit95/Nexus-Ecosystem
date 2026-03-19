import type { NexusAppId, NexusConnectionEvent, NexusPerformanceMetric } from './types'

const now = () => Date.now()

const normalizeBaseUrl = (baseUrl?: string) => {
  if (!baseUrl) return ''
  return baseUrl.replace(/\/$/, '')
}

const isBrowser = typeof window !== 'undefined'

export interface NexusControlOptions {
  enabled?: boolean
  baseUrl?: string
  token?: string
  ingestKey?: string
  flushIntervalMs?: number
  maxQueueSize?: number
  maxBatchSize?: number
  requestTimeoutMs?: number
  sampleRate?: number
  debug?: boolean
}

export interface NexusControlClientOptions extends NexusControlOptions {
  appId: NexusAppId
  appVersion: string
}

export interface NexusControlBatch {
  appId: NexusAppId
  appVersion: string
  sentAt: number
  events: NexusConnectionEvent[]
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const shouldSample = (sampleRate: number) => {
  if (sampleRate >= 1) return true
  if (sampleRate <= 0) return false
  return Math.random() <= sampleRate
}

const abortableFetch = async (url: string, init: RequestInit, timeoutMs: number) => {
  const abort = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = abort
    ? setTimeout(() => {
      abort.abort()
    }, timeoutMs)
    : null

  try {
    return await fetch(url, {
      ...init,
      signal: abort?.signal,
    })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export class NexusControlClient {
  private appId: NexusAppId
  private appVersion: string
  private enabled: boolean
  private baseUrl: string
  private token: string
  private ingestKey: string
  private flushIntervalMs: number
  private maxQueueSize: number
  private maxBatchSize: number
  private requestTimeoutMs: number
  private sampleRate: number
  private debug: boolean

  private queue: NexusConnectionEvent[] = []
  private started = false
  private timer: ReturnType<typeof setInterval> | null = null
  private flushing = false

  constructor(options: NexusControlClientOptions) {
    this.appId = options.appId
    this.appVersion = options.appVersion
    this.enabled = options.enabled ?? Boolean(options.baseUrl)
    this.baseUrl = normalizeBaseUrl(options.baseUrl)
    this.token = options.token ?? ''
    this.ingestKey = options.ingestKey ?? ''
    this.flushIntervalMs = options.flushIntervalMs ?? 5_000
    this.maxQueueSize = options.maxQueueSize ?? 500
    this.maxBatchSize = options.maxBatchSize ?? 150
    this.requestTimeoutMs = options.requestTimeoutMs ?? 4_000
    this.sampleRate = clamp(options.sampleRate ?? 1, 0, 1)
    this.debug = options.debug ?? false
  }

  start() {
    if (this.started || !this.enabled || !isBrowser || !this.baseUrl) return
    this.started = true

    this.timer = setInterval(() => {
      void this.flush()
    }, this.flushIntervalMs)

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] control client started`) // eslint-disable-line no-console
    }
  }

  stop() {
    if (!this.started) return
    this.started = false

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    void this.flush()

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] control client stopped`) // eslint-disable-line no-console
    }
  }

  setToken(token: string) {
    this.token = token || ''
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = normalizeBaseUrl(baseUrl)
    this.enabled = Boolean(this.baseUrl)
  }

  ingestConnectionEvent(event: NexusConnectionEvent) {
    if (!this.enabled || !this.baseUrl) return
    if (event.source !== this.appId) return
    if (!shouldSample(this.sampleRate)) return

    this.pushEvent(event)
  }

  ingestPerformanceMetric(metric: NexusPerformanceMetric) {
    if (!this.enabled || !this.baseUrl) return
    if (metric.appId !== this.appId) return
    if (!shouldSample(this.sampleRate)) return

    const wrapped: NexusConnectionEvent = {
      id: metric.id,
      timestamp: metric.timestamp,
      source: metric.appId,
      target: 'all',
      type: 'performance-metric',
      payload: metric,
    }

    this.pushEvent(wrapped)
  }

  async fetchRemoteConfig() {
    if (!this.baseUrl) return null
    if (!this.token) return null

    try {
      const response = await abortableFetch(`${this.baseUrl}/api/v1/config/apps/${this.appId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }, this.requestTimeoutMs)

      if (!response.ok) return null
      const data = await response.json()
      return data?.item ?? null
    } catch {
      return null
    }
  }

  private pushEvent(event: NexusConnectionEvent) {
    this.queue.push(event)

    if (this.queue.length > this.maxQueueSize) {
      this.queue.splice(0, this.queue.length - this.maxQueueSize)
    }
  }

  async flush() {
    if (this.flushing || this.queue.length === 0 || !this.baseUrl) return
    this.flushing = true

    const batch = this.queue.splice(0, this.maxBatchSize)

    const payload: NexusControlBatch = {
      appId: this.appId,
      appVersion: this.appVersion,
      sentAt: now(),
      events: batch,
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Nexus-App-Id': this.appId,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    if (this.ingestKey) {
      headers['X-Nexus-Ingest-Key'] = this.ingestKey
    }

    try {
      const response = await abortableFetch(`${this.baseUrl}/api/v1/events/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }, this.requestTimeoutMs)

      if (!response.ok) {
        this.requeue(batch)

        if (this.debug) {
          console.warn(`[NexusAPI:${this.appId}] control flush failed (${response.status})`) // eslint-disable-line no-console
        }
      }
    } catch {
      this.requeue(batch)
      if (this.debug) {
        console.warn(`[NexusAPI:${this.appId}] control flush failed (network)`) // eslint-disable-line no-console
      }
    } finally {
      this.flushing = false
    }
  }

  private requeue(batch: NexusConnectionEvent[]) {
    if (batch.length === 0) return
    this.queue = [...batch, ...this.queue]

    if (this.queue.length > this.maxQueueSize) {
      this.queue.splice(this.maxQueueSize)
    }
  }
}
