type PersistedStore = { persist: { hasHydrated: () => boolean; rehydrate: () => Promise<void> | void } }

/** Zustand reports read failures through its callback rather than rejecting.
 * Check completion explicitly; never capture default state after a failed read.
 * Rehydrate supersedes an earlier in-flight read through Zustand's generation guard.
 */
export async function awaitHydration(stores: PersistedStore[]) {
  await Promise.all(stores.map(async store => {
    if (!store.persist.hasHydrated()) await store.persist.rehydrate()
    if (!store.persist.hasHydrated()) throw new Error('Saved workspace data could not be hydrated. Data was retained; retry after resolving storage access.')
  }))
}
