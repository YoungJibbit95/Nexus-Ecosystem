export type DurabilityStatus = {
  pending: number
  queuedRevision: number
  durableRevision: number
  error: string | null
  blockedNames: readonly string[]
}
type Entry = { name: string; bytes: string; revision: number }

/** Revisions are acknowledged only after the backend's transaction completes. */
export function createDurableQueue(options: {
  write: (name: string, bytes: string) => void | Promise<void>
  debounceMs?: number
  schedule?: typeof setTimeout
  cancel?: typeof clearTimeout
}) {
  const schedule = options.schedule ?? setTimeout
  const cancel = options.cancel ?? clearTimeout
  const pending = new Map<string, Entry>()
  const blocked = new Set<string>()
  const rejected = new Set<string>()
  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<boolean> | undefined
  let status: DurabilityStatus = { pending: 0, queuedRevision: 0, durableRevision: 0, error: null, blockedNames: [] }
  const update = (patch: Partial<DurabilityStatus>) => {
    status = { ...status, ...patch, pending: pending.size, blockedNames: [...blocked] }
    listeners.forEach(listener => listener())
  }
  const fail = (error: unknown, blockName?: string) => {
    if (blockName) blocked.add(blockName)
    update({ error: error instanceof Error ? error.message : String(error) })
  }
  const acknowledge = (entry: Entry) => {
    if (pending.get(entry.name)?.revision === entry.revision) pending.delete(entry.name)
    // Global durable revision denotes a fully drained queue, not the last completed key.
    update({ durableRevision: pending.size === 0 && rejected.size === 0 ? status.queuedRevision : status.durableRevision, error: blocked.size || rejected.size ? status.error : null })
  }
  const clearTimer = () => { if (timer !== undefined) cancel(timer); timer = undefined }
  const flush = (): Promise<boolean> => {
    clearTimer()
    if (running) return running
    const work = async () => {
      try {
        while (pending.size) {
          const entry = pending.values().next().value as Entry
          if (blocked.has(entry.name)) return false
          await options.write(entry.name, entry.bytes)
          acknowledge(entry)
        }
        return blocked.size === 0 && rejected.size === 0
      } catch (error) { fail(error); return false }
    }
    // Install the running promise before notifying/subscribing code can enqueue again.
    running = Promise.resolve().then(work).finally(() => { running = undefined })
    return running
  }
  return {
    enqueue(name: string, bytes: string) {
      if (blocked.has(name)) return false
      rejected.delete(name)
      const revision = status.queuedRevision + 1
      pending.set(name, { name, bytes, revision })
      update({ queuedRevision: revision })
      clearTimer()
      timer = schedule(() => { void flush() }, options.debounceMs ?? 1400)
      return true
    },
    flush,
    /** Synchronous exit checkpoint; write must atomically replace a full record. */
    checkpoint(write: (name: string, bytes: string) => void) {
      clearTimer()
      for (const entry of pending.values()) {
        if (blocked.has(entry.name)) continue
        try { write(entry.name, entry.bytes); acknowledge(entry) } catch (error) { fail(error); return false }
      }
      return blocked.size === 0 && rejected.size === 0
    },
    fail,
    reject(name: string, error: unknown) { rejected.add(name); fail(error) },
    getPending: (name: string) => pending.get(name)?.bytes,
    getStatus: () => status,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
