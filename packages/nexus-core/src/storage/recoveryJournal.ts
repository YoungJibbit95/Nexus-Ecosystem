/** Acknowledged before/after journal shared by workspace replacement adapters.
 * Marker removal commits; the last complete journal is retained as recovery evidence.
 */
export function createRecoveryJournal<T>(options: { databaseName: string; markerKey: string; prepare: (value: unknown) => T }) {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(options.databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('recovery')
    request.onerror = () => reject(request.error ?? new Error('Recovery database unavailable'))
    request.onblocked = () => reject(new Error('Recovery database blocked by another window'))
    request.onsuccess = () => resolve(request.result)
  })
  async function transaction<R>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<R>): Promise<R> {
    const db = await open()
    try {
      return await new Promise<R>((resolve, reject) => {
        const tx = db.transaction('recovery', mode)
        const request = operation(tx.objectStore('recovery'))
        tx.oncomplete = () => resolve(request.result)
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Recovery transaction failed'))
      })
    } finally { db.close() }
  }
  const hasPending = () => localStorage.getItem(options.markerKey) === 'pending'
  return {
    hasPending,
    async write(before: T, after: T) {
      if (hasPending()) throw new Error('An interrupted workspace operation must be recovered first')
      await transaction('readwrite', store => store.put({ before: options.prepare(before), after: options.prepare(after) }, 'pending'))
      localStorage.setItem(options.markerKey, 'pending')
    },
    async read(): Promise<{ before: T; after: T } | null> {
      if (!hasPending()) return null
      const raw = await transaction('readonly', store => store.get('pending'))
      try { return { before: options.prepare(raw?.before), after: options.prepare(raw?.after) } }
      catch { throw new Error('Recovery journal is invalid; stored data has been retained') }
    },
    async clear() { localStorage.removeItem(options.markerKey) },
  }
}
