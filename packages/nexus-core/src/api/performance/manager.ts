import type { NexusPerformanceMetric } from '../types'
import { NexusConnectionManager } from '../connection'
import { createLongTaskObserver, createPaintObserver, emitMemorySnapshot } from './observers'
import type { MetricListener, NexusPerformanceOptions } from './options'
import { metricId, now, perfNow, summarizeMetrics } from './utils'

export class NexusPerformanceManager {
  private appId: NexusPerformanceOptions['appId']
  private connection?: NexusConnectionManager
  private collectMemoryMs: number
  private longTaskThresholdMs: number
  private reportToBus: boolean
  private maxMetricsPerMinute: number
  private summaryIntervalMs: number
  private maxRecentMetrics: number
  private debug: boolean

  private listeners = new Set<MetricListener>()
  private memoryTimer: ReturnType<typeof setInterval> | null = null
  private summaryTimer: ReturnType<typeof setInterval> | null = null
  private longTaskObserver: PerformanceObserver | null = null
  private paintObserver: PerformanceObserver | null = null
  private recentMetrics: NexusPerformanceMetric[] = []
  private summaryBuffer: NexusPerformanceMetric[] = []
  private sentInCurrentWindow = 0
  private droppedInCurrentWindow = 0
  private metricWindowStartedAt = now()
  private started = false

  constructor(options: NexusPerformanceOptions) {
    this.appId = options.appId
    this.connection = options.connection
    this.collectMemoryMs = options.collectMemoryMs ?? 30_000
    this.longTaskThresholdMs = options.longTaskThresholdMs ?? 50
    this.reportToBus = options.reportToBus ?? true
    this.maxMetricsPerMinute = options.maxMetricsPerMinute ?? 120
    this.summaryIntervalMs = options.summaryIntervalMs ?? 15_000
    this.maxRecentMetrics = options.maxRecentMetrics ?? 400
    this.debug = options.debug ?? false
  }

  start() {
    if (this.started || typeof window === 'undefined') return
    this.started = true

    this.paintObserver = createPaintObserver(this.appId, (metric) => this.emitMetric(metric))
    this.longTaskObserver = createLongTaskObserver(this.appId, this.longTaskThresholdMs, (metric) => this.emitMetric(metric))
    emitMemorySnapshot(this.appId, (metric) => this.emitMetric(metric))

    this.memoryTimer = setInterval(() => {
      emitMemorySnapshot(this.appId, (metric) => this.emitMetric(metric))
    }, this.collectMemoryMs)

    this.summaryTimer = setInterval(() => {
      this.emitSummary()
    }, this.summaryIntervalMs)

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
    if (this.summaryTimer) {
      clearInterval(this.summaryTimer)
      this.summaryTimer = null
    }

    this.longTaskObserver?.disconnect()
    this.longTaskObserver = null

    this.paintObserver?.disconnect()
    this.paintObserver = null
    this.emitSummary()

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

  private emitMetric(metric: NexusPerformanceMetric) {
    this.recentMetrics.push(metric)
    this.summaryBuffer.push(metric)
    if (this.recentMetrics.length > this.maxRecentMetrics) {
      this.recentMetrics.splice(0, this.recentMetrics.length - this.maxRecentMetrics)
    }

    for (const listener of this.listeners) {
      listener(metric)
    }

    if (this.reportToBus && this.connection) {
      if (this.canPublishMetric()) {
        this.connection.publish('performance-metric', metric)
      } else {
        this.droppedInCurrentWindow += 1
      }
    }

    if (this.debug) {
      console.info(`[NexusAPI:${this.appId}] metric`, metric)
    }
  }

  private canPublishMetric() {
    const current = now()
    if (current - this.metricWindowStartedAt >= 60_000) {
      this.metricWindowStartedAt = current
      this.sentInCurrentWindow = 0
      this.droppedInCurrentWindow = 0
    }

    if (this.sentInCurrentWindow >= this.maxMetricsPerMinute) {
      return false
    }

    this.sentInCurrentWindow += 1
    return true
  }

  private emitSummary() {
    if (!this.connection || this.summaryBuffer.length === 0) return

    this.connection.publish('performance-summary', {
      appId: this.appId,
      measuredAt: now(),
      totalMetrics: this.summaryBuffer.length,
      droppedInCurrentWindow: this.droppedInCurrentWindow,
      byType: summarizeMetrics(this.summaryBuffer),
    })

    this.summaryBuffer = []
  }
}
