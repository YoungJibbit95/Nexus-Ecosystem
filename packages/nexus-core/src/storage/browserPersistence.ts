import { createDurableQueue } from './durableQueue'
import { draftRegistry } from './draftRegistry'
import { encodeSnapshot, legacyKeys, readLegacy, readSnapshot, snapshotKey, type PersistedValue } from './persistedSnapshot'

export type PersistenceOptions = {
  debounceMs?: number
  /** Retained in client configuration for compatibility; scheduling has one owner. */
  idleTimeoutMs?: number
  flushBudgetMs?: number
  segmentStateKeys?: string[]
}
type IndexedOptions = PersistenceOptions & { dbName: string; storeName?: string }
const queues = new Set<ReturnType<typeof createDurableQueue>>()
const checkpoints = new Set<() => boolean>()
const subscribers = new Set<() => void>()
let revision = 0
const changed = () => { revision++; subscribers.forEach(fn => fn()) }
export const persistenceRegistry = {
  subscribe: (fn: () => void) => { subscribers.add(fn); return () => { subscribers.delete(fn) } },
  getRevision: () => revision,
  getStatuses: () => [...queues].map(queue => queue.getStatus()),
  flush: async () => { draftRegistry.flush(); return (await Promise.all([...queues].map(queue => queue.flush()))).every(Boolean) },
  checkpoint: () => [...checkpoints].map(checkpoint => checkpoint()).every(Boolean),
}

function localStoragePort() {
  if (typeof window === 'undefined') throw new Error('Browser storage is unavailable')
  return window.localStorage
}
function readLocal(keys: string[]) {
  const storage = localStoragePort()
  const result = new Map<string, unknown>()
  for (const key of keys) { const raw = storage.getItem(key); if (raw !== null) result.set(key, raw) }
  return result
}
function writeLocal(name: string, bytes: string) { localStoragePort().setItem(snapshotKey(name), bytes) }

function indexedPort({ dbName, storeName = 'persist' }: IndexedOptions) {
  let connection: Promise<IDBDatabase> | undefined
  const open = () => connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName) }
    request.onerror = () => { connection = undefined; reject(request.error ?? new Error('IndexedDB open failed')) }
    request.onblocked = () => { connection = undefined; reject(new Error('IndexedDB upgrade is blocked by another window')) }
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); connection = undefined }; resolve(request.result) }
  })
  return {
    async read(keys: string[]) {
      const db = await open()
      return new Promise<Map<string, unknown>>((resolve, reject) => {
        const result = new Map<string, unknown>()
        const tx = db.transaction(storeName, 'readonly')
        tx.oncomplete = () => resolve(result)
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('IndexedDB read failed'))
        for (const key of keys) {
          const request = tx.objectStore(storeName).get(key)
          request.onsuccess = () => { if (request.result !== undefined) result.set(key, request.result) }
        }
      })
    },
    async write(name: string, bytes: string) {
      const db = await open()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('IndexedDB commit failed'))
        tx.objectStore(storeName).put(bytes, snapshotKey(name))
      })
    },
  }
}

function createStorage<T>(options: PersistenceOptions, indexed?: ReturnType<typeof indexedPort>) {
  const segments = [...new Set(options.segmentStateKeys ?? [])]
  // A fallback snapshot is authoritative across restarts, avoiding stale IDB resurrection.
  // Automatic promotion/cleanup is intentionally absent; migration never deletes old data.
  const localNames = new Set<string>()
  const queue = createDurableQueue({ debounceMs: options.debounceMs, write: async (name, bytes) => {
    if (indexed && !localNames.has(name)) {
      try { await indexed.write(name, bytes); return } catch { localNames.add(name) }
    }
    writeLocal(name, bytes)
  } })
  queues.add(queue)
  const unsubscribe = queue.subscribe(changed)
  const checkpoint = () => {
    draftRegistry.flush()
    return queue.checkpoint((name, bytes) => { localNames.add(name); writeLocal(name, bytes) })
  }
  checkpoints.add(checkpoint)
  const onVisibility = () => { if (document.visibilityState === 'hidden') checkpoint() }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', checkpoint)
    window.addEventListener('beforeunload', checkpoint)
    document.addEventListener('visibilitychange', onVisibility)
  }
  const readLocalValue = (name: string) => readLegacy<T>(name, segments, readLocal(legacyKeys(name, segments)))
  const getLocalItem = (name: string): PersistedValue<T> | null => {
    try { const pending = queue.getPending(name); return pending === undefined ? readLocalValue(name) : readSnapshot<T>(pending) }
    catch (error) { queue.fail(error, name); throw error }
  }
  const getIndexedItem = async (name: string): Promise<PersistedValue<T> | null> => {
    try {
      const pending = queue.getPending(name)
      if (pending !== undefined) return readSnapshot<T>(pending)
      // localStorage may be disabled while IndexedDB works. Only a present record selects fallback.
      let local: Map<string, unknown> | undefined
      try { local = readLocal([snapshotKey(name)]) } catch { /* try the primary backend */ }
      if (local?.has(snapshotKey(name))) { localNames.add(name); return readSnapshot<T>(local.get(snapshotKey(name))) }
      let values: Map<string, unknown>
      try { values = await indexed!.read(legacyKeys(name, segments)) }
      catch { localNames.add(name); return readLocalValue(name) }
      if (values.size) return readLegacy<T>(name, segments, values, 'structured')
      return readLocalValue(name)
    } catch (error) { queue.fail(error, name); throw error }
  }
  return {
    getItem: indexed ? getIndexedItem : getLocalItem,
    setItem(name: string, value: PersistedValue<T>) {
      try { queue.enqueue(name, encodeSnapshot(value)) } catch (error) { queue.reject(name, error) }
    },
    removeItem(name: string) { queue.enqueue(name, encodeSnapshot(null)); void queue.flush() },
    flush: queue.flush,
    getStatus: queue.getStatus,
    subscribe: queue.subscribe,
    dispose() {
      checkpoint()
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', checkpoint)
        window.removeEventListener('beforeunload', checkpoint)
        document.removeEventListener('visibilitychange', onVisibility)
      }
      unsubscribe(); queues.delete(queue); checkpoints.delete(checkpoint); changed()
    },
  }
}

export const createStoreManagerStorage = <T>(options: PersistenceOptions = {}) => createStorage<T>(options)
export const createIndexedDbStorage = <T>(options: IndexedOptions) => createStorage<T>(options,
  typeof window !== 'undefined' && 'indexedDB' in window ? indexedPort(options) : undefined)
