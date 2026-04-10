import type { PersistStorage } from 'zustand/middleware'

type StoreManagerOptions = {
  debounceMs?: number
  idleTimeoutMs?: number
  flushBudgetMs?: number
  segmentStateKeys?: string[]
}

const REMOVE_TOKEN = Symbol('store-manager-remove')

type PersistedValueLike = {
  state?: Record<string, unknown>
  version?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizePersistedValue = (
  value: unknown,
): { state: Record<string, unknown>; version: number } | null => {
  if (!isRecord(value)) return null
  const maybeState = (value as PersistedValueLike).state
  if (!isRecord(maybeState)) return null
  const maybeVersion = (value as PersistedValueLike).version
  return {
    state: maybeState,
    version: typeof maybeVersion === 'number' ? maybeVersion : 0,
  }
}

const runIdle = (task: () => void, timeoutMs: number) => {
  const browserWindow = typeof window !== 'undefined' ? window : undefined
  if (browserWindow && 'requestIdleCallback' in browserWindow) {
    ;(browserWindow as any).requestIdleCallback(task, { timeout: timeoutMs })
    return
  }
  globalThis.setTimeout(task, Math.min(200, timeoutMs))
}

export const createStoreManagerStorage = <T>(
  options: StoreManagerOptions = {},
): PersistStorage<T> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }

  const base = window.localStorage
  const debounceMs = Math.max(300, options.debounceMs ?? 1_400)
  const idleTimeoutMs = Math.max(200, options.idleTimeoutMs ?? 1_200)
  const flushBudgetMs = Math.max(4, options.flushBudgetMs ?? 9)
  const segmentStateKeys = Array.isArray(options.segmentStateKeys)
    ? Array.from(new Set(options.segmentStateKeys.map((key) => String(key).trim()).filter(Boolean)))
    : []
  const segmentedMode = segmentStateKeys.length > 0
  const pending = new Map<string, unknown | typeof REMOVE_TOKEN>()
  const lastSerialized = new Map<string, string>()
  const segmentRefs = new Map<string, unknown>()
  const removedLegacyKeys = new Set<string>()
  let flushTimer: number | null = null
  let flushQueued = false

  const segmentMetaKey = (name: string) => `${name}::__meta`
  const segmentDataKey = (name: string, stateKey: string) => `${name}::${stateKey}`

  const flushNow = () => {
    if (pending.size === 0) {
      flushQueued = false
      return
    }

    const entries = Array.from(pending.entries())
    pending.clear()
    const startedAt = typeof performance !== 'undefined' ? performance.now() : 0

    for (let i = 0; i < entries.length; i += 1) {
      const [key, value] = entries[i]
      try {
        if (value === REMOVE_TOKEN) {
          base.removeItem(key)
          lastSerialized.delete(key)
          segmentRefs.delete(key)
        } else {
          const serialized = JSON.stringify(value)
          if (lastSerialized.get(key) !== serialized) {
            base.setItem(key, serialized)
            lastSerialized.set(key, serialized)
          }
        }
      } catch {
        // Ignore quota/serialization errors to keep UI responsive.
      }

      if (i < entries.length - 1 && typeof performance !== 'undefined') {
        if (performance.now() - startedAt > flushBudgetMs) {
          for (let j = i + 1; j < entries.length; j += 1) {
            const [restKey, restValue] = entries[j]
            pending.set(restKey, restValue)
          }
          break
        }
      }
    }

    flushQueued = false
    if (pending.size > 0) {
      queueFlush()
    }
  }

  const queueFlush = () => {
    if (flushQueued) return
    flushQueued = true
    runIdle(flushNow, idleTimeoutMs)
  }

  const scheduleFlush = () => {
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
    }
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      queueFlush()
    }, debounceMs)
  }

  const flushSync = () => {
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
      flushTimer = null
    }
    const entries = Array.from(pending.entries())
    pending.clear()
    flushQueued = false
    entries.forEach(([key, value]) => {
      try {
        if (value === REMOVE_TOKEN) {
          base.removeItem(key)
          lastSerialized.delete(key)
          segmentRefs.delete(key)
        } else {
          const serialized = JSON.stringify(value)
          if (lastSerialized.get(key) !== serialized) {
            base.setItem(key, serialized)
            lastSerialized.set(key, serialized)
          }
        }
      } catch {
        // Ignore errors during teardown flush.
      }
    })
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      flushSync()
    }
  }

  window.addEventListener('beforeunload', flushSync)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return {
    getItem: (name) => {
      if (segmentedMode) {
        const segmentState: Record<string, unknown> = {}
        let hasSegmentData = false
        let version = 0
        const metaRaw = base.getItem(segmentMetaKey(name))
        if (metaRaw) {
          try {
            const meta = JSON.parse(metaRaw)
            if (typeof meta?.version === 'number') {
              version = meta.version
            }
            hasSegmentData = true
            lastSerialized.set(segmentMetaKey(name), metaRaw)
          } catch {
            // ignore malformed segment meta and continue with fallback.
          }
        }

        for (const stateKey of segmentStateKeys) {
          const storageKey = segmentDataKey(name, stateKey)
          const rawSegment = base.getItem(storageKey)
          if (!rawSegment) continue
          try {
            const parsedSegment = JSON.parse(rawSegment)
            segmentState[stateKey] = parsedSegment
            segmentRefs.set(storageKey, parsedSegment)
            lastSerialized.set(storageKey, rawSegment)
            hasSegmentData = true
          } catch {
            // ignore malformed segments and continue with other chunks.
          }
        }

        if (hasSegmentData) {
          return {
            state: segmentState as T,
            version,
          }
        }
      }

      const raw = base.getItem(name)
      if (!raw) return null
      try {
        lastSerialized.set(name, raw)
        return JSON.parse(raw)
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      if (segmentedMode) {
        const normalized = normalizePersistedValue(value)
        if (normalized) {
          pending.set(segmentMetaKey(name), { version: normalized.version })
          for (const stateKey of segmentStateKeys) {
            const storageKey = segmentDataKey(name, stateKey)
            if (!Object.prototype.hasOwnProperty.call(normalized.state, stateKey)) {
              if (segmentRefs.has(storageKey)) {
                segmentRefs.delete(storageKey)
                pending.set(storageKey, REMOVE_TOKEN)
              }
              continue
            }
            const segmentValue = normalized.state[stateKey]
            if (segmentRefs.get(storageKey) === segmentValue && !pending.has(storageKey)) {
              continue
            }
            segmentRefs.set(storageKey, segmentValue)
            pending.set(storageKey, segmentValue)
          }
          if (!removedLegacyKeys.has(name)) {
            removedLegacyKeys.add(name)
            pending.set(name, REMOVE_TOKEN)
          }
          scheduleFlush()
          return
        }
      }

      pending.set(name, value)
      scheduleFlush()
    },
    removeItem: (name) => {
      pending.delete(name)
      lastSerialized.delete(name)
      if (segmentedMode) {
        pending.set(segmentMetaKey(name), REMOVE_TOKEN)
        lastSerialized.delete(segmentMetaKey(name))
        base.removeItem(segmentMetaKey(name))
        for (const stateKey of segmentStateKeys) {
          const storageKey = segmentDataKey(name, stateKey)
          pending.set(storageKey, REMOVE_TOKEN)
          lastSerialized.delete(storageKey)
          segmentRefs.delete(storageKey)
          base.removeItem(storageKey)
        }
      }
      if (flushTimer !== null && pending.size === 0) {
        window.clearTimeout(flushTimer)
        flushTimer = null
      }
      base.removeItem(name)
    },
  }
}
