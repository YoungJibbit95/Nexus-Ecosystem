import type { NexusAppId, NexusPerformanceMetric } from './types'
import { NexusConnectionManager } from './connection'

const now = () => Date.now()
const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

const metricId = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export interface NexusPerformanceOptions {
  appId: NexusAppId
  connection?: NexusConnectionManager
  collectMemoryMs?: number
  longTaskThresholdMs?: number
  reportToBus?: boolean
  debug?: boolean
}

type MetricListener = (metric: NexusPerformanceMetric) => void

export class NexusPerformanceManager {
  private appId: NexusAppId
  private connection?: NexusConnectionManager
  private collectMemoryMs: number
  private longTaskThresholdMs: number
  private reportToBus: boolean
  private debug: boolean

  private listeners = new Set<MetricListener>()
  private memoryTimer: ReturnType<typeof setInterval> | null = null
  private longTaskObserver: PerformanceObserver | null = null
  private paintObserver: PerformanceObserver | null = null
  private started = false

  constructor(options: NexusPerformanceOptions) {
    this.appId = options.appId
    this.connection = options.connection
    this.collectMemoryMs = options.collectMemoryMs ?? 30_000
    this.longTaskThresholdMs = options.longTaskThresholdMs ?? 50
    this.reportToBus = options.reportToBus ?? true
    this.debug = options.debug ?? false
  }

  start() {
    if (this.started || typeof window === 'undefined') return
    this.started = true

    this.observePaint()
    this.observeLongTasks()
    this.collectMemorySnapshot()

    this.memoryTimer = setInterval(() => {
      this.collectMemorySnapshot()
    }, this.collectMemoryMs)

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] performance manager started`)
    }
  }

  stop() {
    if (!this.started) return
    this.started = false

    if (this.memoryTimer) {
      clearInterval(this.memoryTimer)
      this.memoryTimer = null
    }

    this.longTaskObserver?.disconnect()
    this.longTaskObserver = null

    this.paintObserver?.disconnect()
    this.paintObserver = null

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] performance manager stopped`)
    }
  }

  subscribe(listener: MetricListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  trackViewRender(viewId: string) {
    const start = perfNow()

    requestAnimationFrame(() => {
      const duration = perfNow() - start
      this.emitMetric({
        id: metricId(),
        appId: this.appId,
        type: 'view-render',
        name: viewId,
        value: Number(duration.toFixed(2)),
        unit: 'ms',
        timestamp: now(),
      })
    })
  }

  recordCustomMetric(name: string, value: number, unit: NexusPerformanceMetric['unit'] = 'count') {
    this.emitMetric({
      id: metricId(),
      appId: this.appId,
      type: 'custom',
      name,
      value,
      unit,
      timestamp: now(),
    })
  }

  private observePaint() {
    if (typeof PerformanceObserver === 'undefined') return
    const supported = PerformanceObserver.supportedEntryTypes ?? []
    if (!supported.includes('paint')) return

    this.paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.emitMetric({
          id: metricId(),
          appId: this.appId,
          type: 'paint',
          name: entry.name,
          value: Number(entry.startTime.toFixed(2)),
          unit: 'ms',
          timestamp: now(),
        })
      }
    })

    this.paintObserver.observe({ type: 'paint', buffered: true })
  }

  private observeLongTasks() {
    if (typeof PerformanceObserver === 'undefined') return
    const supported = PerformanceObserver.supportedEntryTypes ?? []
    if (!supported.includes('longtask')) return

    this.longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration < this.longTaskThresholdMs) continue

        this.emitMetric({
          id: metricId(),
          appId: this.appId,
          type: 'long-task',
          name: 'main-thread-block',
          value: Number(entry.duration.toFixed(2)),
          unit: 'ms',
          timestamp: now(),
        })
      }
    })

    this.longTaskObserver.observe({ type: 'longtask', buffered: true })
  }

  private collectMemorySnapshot() {
    const perfMem = (performance as any)?.memory
    if (!perfMem || typeof perfMem.usedJSHeapSize !== 'number') return

    this.emitMetric({
      id: metricId(),
      appId: this.appId,
      type: 'memory',
      name: 'used-js-heap',
      value: perfMem.usedJSHeapSize,
      unit: 'bytes',
      timestamp: now(),
    })
  }

  private emitMetric(metric: NexusPerformanceMetric) {
    for (const listener of this.listeners) {
      listener(metric)
    }

    if (this.reportToBus && this.connection) {
      this.connection.publish('performance-metric', metric)
    }

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] metric`, metric)
    }
  }
}
