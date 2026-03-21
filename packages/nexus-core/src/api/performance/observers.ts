import type { NexusAppId, NexusPerformanceMetric } from '../types'
import { metricId, now } from './utils'

type EmitMetric = (metric: NexusPerformanceMetric) => void

export const createPaintObserver = (appId: NexusAppId, emitMetric: EmitMetric) => {
  if (typeof PerformanceObserver === 'undefined') return null
  const supported = PerformanceObserver.supportedEntryTypes ?? []
  if (!supported.includes('paint')) return null

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      emitMetric({
        id: metricId(),
        appId,
        type: 'paint',
        name: entry.name,
        value: Number(entry.startTime.toFixed(2)),
        unit: 'ms',
        timestamp: now(),
      })
    }
  })

  observer.observe({ type: 'paint', buffered: true })
  return observer
}

export const createLongTaskObserver = (appId: NexusAppId, thresholdMs: number, emitMetric: EmitMetric) => {
  if (typeof PerformanceObserver === 'undefined') return null
  const supported = PerformanceObserver.supportedEntryTypes ?? []
  if (!supported.includes('longtask')) return null

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration < thresholdMs) continue

      emitMetric({
        id: metricId(),
        appId,
        type: 'long-task',
        name: 'main-thread-block',
        value: Number(entry.duration.toFixed(2)),
        unit: 'ms',
        timestamp: now(),
      })
    }
  })

  observer.observe({ type: 'longtask', buffered: true })
  return observer
}

export const emitMemorySnapshot = (appId: NexusAppId, emitMetric: EmitMetric) => {
  const perfMem = (performance as any)?.memory
  if (!perfMem || typeof perfMem.usedJSHeapSize !== 'number') return

  emitMetric({
    id: metricId(),
    appId,
    type: 'memory',
    name: 'used-js-heap',
    value: perfMem.usedJSHeapSize,
    unit: 'bytes',
    timestamp: now(),
  })
}
