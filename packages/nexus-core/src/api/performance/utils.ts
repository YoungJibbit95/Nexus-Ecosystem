import type { NexusPerformanceMetric } from '../types'

export const now = () => Date.now()
export const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
export const metricId = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const summarizeMetrics = (metrics: NexusPerformanceMetric[]) => metrics.reduce<Record<string, {
  count: number
  avg: number
  max: number
}>>((acc, metric) => {
  const current = acc[metric.type] ?? { count: 0, avg: 0, max: 0 }
  const nextCount = current.count + 1
  const nextAvg = ((current.avg * current.count) + metric.value) / nextCount
  acc[metric.type] = {
    count: nextCount,
    avg: Number(nextAvg.toFixed(2)),
    max: Math.max(current.max, metric.value),
  }
  return acc
}, {})
