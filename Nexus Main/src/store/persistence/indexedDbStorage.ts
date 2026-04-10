import type { PersistStorage, StorageValue } from 'zustand/middleware'
import { createStoreManagerStorage } from './storeManager'

type IndexedDbStorageOptions<T> = {
  dbName: string
  storeName?: string
  debounceMs?: number
  idleTimeoutMs?: number
  flushBudgetMs?: number
  segmentStateKeys?: string[]
}

type PersistedValueLike = {
  state?: Record<string, unknown>
  version?: number
}

const REMOVE_TOKEN = Symbol('indexeddb-remove')

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
  globalThis.setTimeout(task, Math.min(180, timeoutMs))
}

const scheduleFrame = (task: () => void): number => {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    return window.requestAnimationFrame(task)
  }
  return globalThis.setTimeout(task, 16) as unknown as number
}

const cancelScheduledFrame = (handle: number) => {
  if (typeof window !== 'undefined' && 'cancelAnimationFrame' in window) {
    window.cancelAnimationFrame(handle)
    return
  }
  globalThis.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>)
}

export const createIndexedDbStorage = <T>(
  options: IndexedDbStorageOptions<T>,
): PersistStorage<T> => {
  const {
    dbName,
    storeName = 'persist',
    debounceMs: rawDebounceMs = 1_400,
    idleTimeoutMs: rawIdleTimeoutMs = 1_100,
    flushBudgetMs: rawFlushBudgetMs = 11,
    segmentStateKeys: rawSegmentStateKeys = [],
  } = options

  const fallbackStorage = createStoreManagerStorage<T>({
    debounceMs: rawDebounceMs,
    idleTimeoutMs: rawIdleTimeoutMs,
    flushBudgetMs: rawFlushBudgetMs,
    segmentStateKeys: rawSegmentStateKeys,
  })

  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return fallbackStorage
  }

  const segmentStateKeys = Array.isArray(rawSegmentStateKeys)
    ? Array.from(new Set(rawSegmentStateKeys.map((key) => String(key).trim()).filter(Boolean)))
    : []
  const segmentedMode = segmentStateKeys.length > 0
  const debounceMs = Math.max(250, rawDebounceMs)
  const idleTimeoutMs = Math.max(200, rawIdleTimeoutMs)
  const flushBudgetMs = Math.max(4, rawFlushBudgetMs)

  const segmentRefCache = new Map<string, unknown>()
  const legacyCleared = new Set<string>()
  const pending = new Map<string, unknown | typeof REMOVE_TOKEN>()
  let flushTimer: number | null = null
  let flushQueued = false
  let flushFrame: number | null = null
  let flushRunning = false
  let indexedDbDisabled = false

  const segmentMetaKey = (name: string) => `${name}::__meta`
  const segmentDataKey = (name: string, stateKey: string) => `${name}::${stateKey}`

  let dbPromise: Promise<IDBDatabase> | null = null
  const disableIndexedDb = (reason: string, error?: unknown) => {
    if (indexedDbDisabled) return
    indexedDbDisabled = true
    dbPromise = null
    pending.clear()
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
      flushTimer = null
    }
    if (flushFrame !== null) {
      cancelScheduledFrame(flushFrame)
      flushFrame = null
    }
    flushQueued = false
    flushRunning = false
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(
        `[nexus-storage] indexeddb disabled (${reason}); falling back to localStorage storage manager`,
        error,
      )
    }
  }
  const getDb = () => {
    if (indexedDbDisabled) {
      return Promise.reject(new Error('INDEXEDDB_DISABLED'))
    }
    if (dbPromise) return dbPromise
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(dbName, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error || new Error(`IndexedDB open failed for ${dbName}`))
    })
    return dbPromise
  }

  const readValue = async (key: string) => {
    if (indexedDbDisabled) {
      throw new Error('INDEXEDDB_DISABLED')
    }
    const db = await getDb()
    return await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error || tx.error || new Error('IndexedDB read failed'))
    })
  }

  const readValues = async (keys: string[]) => {
    if (indexedDbDisabled) {
      throw new Error('INDEXEDDB_DISABLED')
    }
    const db = await getDb()
    return await new Promise<Map<string, unknown>>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const result = new Map<string, unknown>()
      let remaining = keys.length

      if (remaining === 0) {
        resolve(result)
        return
      }

      keys.forEach((key) => {
        const req = store.get(key)
        req.onsuccess = () => {
          result.set(key, req.result)
          remaining -= 1
          if (remaining === 0) {
            resolve(result)
          }
        }
        req.onerror = () => reject(req.error || tx.error || new Error('IndexedDB read failed'))
      })

      tx.onerror = () => reject(tx.error || new Error('IndexedDB read failed'))
      tx.onabort = () => reject(tx.error || new Error('IndexedDB read aborted'))
    })
  }

  const writeChunk = async (entries: Array<[string, unknown | typeof REMOVE_TOKEN]>) => {
    if (entries.length === 0) return
    if (indexedDbDisabled) {
      throw new Error('INDEXEDDB_DISABLED')
    }
    const db = await getDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      entries.forEach(([key, value]) => {
        if (value === REMOVE_TOKEN) {
          store.delete(key)
          return
        }
        store.put(value, key)
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'))
      tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'))
    })
  }

  const queueFlush = () => {
    if (indexedDbDisabled) return
    if (flushQueued) return
    flushQueued = true
    runIdle(() => {
      if (flushFrame !== null) return
      flushFrame = scheduleFrame(async () => {
        flushFrame = null
        if (flushRunning) return
        flushRunning = true
        try {
          while (pending.size > 0) {
            const startedAt = typeof performance !== 'undefined' ? performance.now() : 0
            const entries = Array.from(pending.entries())
            pending.clear()
            await writeChunk(entries)
            if (typeof performance !== 'undefined' && performance.now() - startedAt > flushBudgetMs) {
              // Yield if the last chunk was expensive.
              break
            }
          }
        } catch (error) {
          disableIndexedDb('flush-failed', error)
        } finally {
          flushRunning = false
          flushQueued = false
          if (!indexedDbDisabled && pending.size > 0) {
            queueFlush()
          }
        }
      })
    }, idleTimeoutMs)
  }

  const scheduleFlush = () => {
    if (indexedDbDisabled) return
    if (flushTimer !== null) {
      window.clearTimeout(flushTimer)
    }
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      queueFlush()
    }, debounceMs)
  }

  const ensureLegacyCleared = (name: string) => {
    if (legacyCleared.has(name)) return
    legacyCleared.add(name)
    try {
      fallbackStorage.removeItem(name)
    } catch {
      // best-effort migration cleanup
    }
  }

  const queuePersistedValue = (name: string, value: StorageValue<T>) => {
    if (indexedDbDisabled) {
      fallbackStorage.setItem(name, value)
      return
    }
    if (segmentedMode) {
      const normalized = normalizePersistedValue(value)
      if (normalized) {
        pending.set(segmentMetaKey(name), { version: normalized.version })
        for (const stateKey of segmentStateKeys) {
          const key = segmentDataKey(name, stateKey)
          if (!Object.prototype.hasOwnProperty.call(normalized.state, stateKey)) {
            pending.set(key, REMOVE_TOKEN)
            segmentRefCache.delete(key)
            continue
          }
          const segmentValue = normalized.state[stateKey]
          if (segmentRefCache.get(key) === segmentValue && !pending.has(key)) {
            continue
          }
          segmentRefCache.set(key, segmentValue)
          pending.set(key, segmentValue)
        }
        pending.set(name, REMOVE_TOKEN)
        ensureLegacyCleared(name)
        scheduleFlush()
        return
      }
    }

    pending.set(name, value)
    ensureLegacyCleared(name)
    scheduleFlush()
  }

  return {
    getItem: async (name) => {
      if (indexedDbDisabled) {
        return await Promise.resolve(
          fallbackStorage.getItem(name) as StorageValue<T> | null,
        )
      }
      try {
        if (segmentedMode) {
          let hasData = false
          let version = 0
          const state: Record<string, unknown> = {}
          const keysToRead = [
            segmentMetaKey(name),
            ...segmentStateKeys.map((stateKey) => segmentDataKey(name, stateKey)),
          ]
          const values = await readValues(keysToRead)
          const meta = values.get(segmentMetaKey(name))
          if (isRecord(meta) && typeof meta.version === 'number') {
            version = meta.version
            hasData = true
          }

          for (const stateKey of segmentStateKeys) {
            const key = segmentDataKey(name, stateKey)
            const value = values.get(key)
            if (typeof value === 'undefined') continue
            state[stateKey] = value
            segmentRefCache.set(key, value)
            hasData = true
          }

          if (hasData) {
          return {
              state: state as T,
              version,
            } as StorageValue<T>
          }
        } else {
          const value = await readValue(name)
          if (typeof value !== 'undefined') {
            return value as StorageValue<T>
          }
        }
      } catch (error) {
        disableIndexedDb('read-failed', error)
      }

      const fallbackValue = await Promise.resolve(
        fallbackStorage.getItem(name) as StorageValue<T> | null,
      )
      if (fallbackValue == null) return null
      if (!indexedDbDisabled) {
        queuePersistedValue(name, fallbackValue)
        ensureLegacyCleared(name)
      }
      return fallbackValue
    },
    setItem: (name, value) => {
      if (indexedDbDisabled) {
        fallbackStorage.setItem(name, value)
        return
      }
      queuePersistedValue(name, value)
    },
    removeItem: (name) => {
      if (indexedDbDisabled) {
        fallbackStorage.removeItem(name)
        return
      }
      pending.set(name, REMOVE_TOKEN)
      if (segmentedMode) {
        pending.set(segmentMetaKey(name), REMOVE_TOKEN)
        for (const stateKey of segmentStateKeys) {
          const key = segmentDataKey(name, stateKey)
          pending.set(key, REMOVE_TOKEN)
          segmentRefCache.delete(key)
        }
      }
      ensureLegacyCleared(name)
      if (flushTimer !== null) {
        window.clearTimeout(flushTimer)
        flushTimer = null
      }
      if (flushFrame !== null) {
        cancelScheduledFrame(flushFrame)
        flushFrame = null
      }
      queueFlush()
    },
  }
}
