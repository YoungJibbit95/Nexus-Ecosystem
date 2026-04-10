type LagProbeEvent =
  | {
      kind: 'long-task'
      durationMs: number
      name: string
      at: number
    }
  | {
      kind: 'interaction-lag'
      durationMs: number
      interaction: 'click' | 'pointerdown' | 'keydown'
      at: number
    }

type InstallLagProbeOptions = {
  enabled?: boolean
  maxReportsPerMinute?: number
  longTaskThresholdMs?: number
  interactionThresholdMs?: number
  onEvent?: (event: LagProbeEvent) => void
}

const DEFAULT_MAX_REPORTS_PER_MINUTE = 36
const DEFAULT_LONG_TASK_THRESHOLD_MS = 70
const DEFAULT_INTERACTION_THRESHOLD_MS = 90

export const installRuntimeLagProbe = ({
  enabled = true,
  maxReportsPerMinute = DEFAULT_MAX_REPORTS_PER_MINUTE,
  longTaskThresholdMs = DEFAULT_LONG_TASK_THRESHOLD_MS,
  interactionThresholdMs = DEFAULT_INTERACTION_THRESHOLD_MS,
  onEvent,
}: InstallLagProbeOptions = {}) => {
  if (!enabled || typeof window === 'undefined' || typeof performance === 'undefined') {
    return () => {}
  }

  const minuteWindowMs = 60_000
  const reportTimestamps: number[] = []
  const canEmit = () => {
    const now = performance.now()
    while (reportTimestamps.length > 0 && now - reportTimestamps[0] > minuteWindowMs) {
      reportTimestamps.shift()
    }
    if (reportTimestamps.length >= maxReportsPerMinute) return false
    reportTimestamps.push(now)
    return true
  }

  const emit = (event: LagProbeEvent) => {
    if (!canEmit()) return
    onEvent?.(event)
  }

  const perfObserverSupported =
    typeof PerformanceObserver !== 'undefined' &&
    typeof (PerformanceObserver as any).supportedEntryTypes !== 'undefined' &&
    Array.isArray((PerformanceObserver as any).supportedEntryTypes) &&
    (PerformanceObserver as any).supportedEntryTypes.includes('longtask')

  let perfObserver: PerformanceObserver | null = null
  if (perfObserverSupported) {
    perfObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      for (const entry of entries) {
        const durationMs = Number(entry.duration || 0)
        if (durationMs < longTaskThresholdMs) continue
        emit({
          kind: 'long-task',
          durationMs,
          name: String(entry.name || 'unknown'),
          at: performance.now(),
        })
      }
    })
    perfObserver.observe({ type: 'longtask', buffered: true })
  }

  const trackInteraction = (interaction: 'click' | 'pointerdown' | 'keydown') => {
    const startedAt = performance.now()
    requestAnimationFrame(() => {
      const durationMs = performance.now() - startedAt
      if (durationMs < interactionThresholdMs) return
      emit({
        kind: 'interaction-lag',
        durationMs,
        interaction,
        at: performance.now(),
      })
    })
  }

  const onPointerDown = () => trackInteraction('pointerdown')
  const onClick = () => trackInteraction('click')
  const onKeyDown = () => trackInteraction('keydown')

  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('click', onClick, { passive: true })
  window.addEventListener('keydown', onKeyDown, { passive: true })

  return () => {
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('click', onClick)
    window.removeEventListener('keydown', onKeyDown)
    perfObserver?.disconnect()
  }
}
