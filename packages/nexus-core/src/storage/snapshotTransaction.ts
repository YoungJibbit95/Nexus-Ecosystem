/** Compensating multi-store transaction with a durable recovery point before any mutation.
 * The journal remains until either application or rollback has durably completed.
 */
export async function applySnapshotTransaction<T>(target: T | ((before: T) => T | Promise<T>), ports: {
  prepare: (snapshot: T) => T
  capture: () => T | Promise<T>
  journal: (before: T, after: T) => Promise<void>
  clearJournal: () => Promise<void>
  apply: (snapshot: T) => void | Promise<void>
  flush: () => Promise<boolean>
  beforeCapture?: () => void | Promise<void>
  invalidateDrafts?: () => void
}) {
  // Partial imports are composed from the flushed preimage, never stale render props.
  const prepared = typeof target === 'function' ? undefined : ports.prepare(target)
  await ports.beforeCapture?.()
  const before = ports.prepare(await ports.capture())
  const after = typeof target === 'function' ? ports.prepare(await (target as (before: T) => T | Promise<T>)(before)) : prepared!
  await ports.journal(before, after)
  try {
    await ports.apply(after)
    ports.invalidateDrafts?.()
    if (!await ports.flush()) throw new Error('Restore could not be committed')
    await ports.clearJournal()
  } catch (error) {
    try {
      await ports.apply(before)
      ports.invalidateDrafts?.()
      if (!await ports.flush()) throw new Error('Rollback could not be committed')
      await ports.clearJournal()
    } catch (rollbackError) {
      throw new Error(`Restore failed and needs recovery: ${String(error)}; ${String(rollbackError)}`)
    }
    throw new Error(`Restore failed; previous state was recovered: ${String(error)}`)
  }
}
