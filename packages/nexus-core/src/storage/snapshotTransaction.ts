/** Compensating multi-store transaction with a durable recovery point before any mutation.
 * The journal remains until either application or rollback has durably completed.
 */
export async function applySnapshotTransaction<T>(target: T, ports: {
  prepare: (snapshot: T) => T
  capture: () => T
  journal: (before: T, after: T) => Promise<void>
  clearJournal: () => Promise<void>
  apply: (snapshot: T) => void
  flush: () => Promise<boolean>
  beforeCapture?: () => void
  invalidateDrafts?: () => void
}) {
  const after = ports.prepare(target)
  ports.beforeCapture?.()
  const before = ports.prepare(ports.capture())
  await ports.journal(before, after)
  try {
    ports.apply(after)
    ports.invalidateDrafts?.()
    if (!await ports.flush()) throw new Error('Restore could not be committed')
    await ports.clearJournal()
  } catch (error) {
    try {
      ports.apply(before)
      ports.invalidateDrafts?.()
      if (!await ports.flush()) throw new Error('Rollback could not be committed')
      await ports.clearJournal()
    } catch (rollbackError) {
      throw new Error(`Restore failed and needs recovery: ${String(error)}; ${String(rollbackError)}`)
    }
    throw new Error(`Restore failed; previous state was recovered: ${String(error)}`)
  }
}
