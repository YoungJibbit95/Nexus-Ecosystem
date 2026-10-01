import { createIndexedDbStorage, persistenceRegistry } from '../storage/browserPersistence'
import { workspaceOperation } from '../storage/workspaceOperation'
import { createPlanningCommandOwner, type PlanningCommand, type PlanningCommandResult } from './commandService'
import { emptyPlanningDocument, type PlanningDocument, type PlanningSnapshot, type TaskRecord } from './domain'
import { preparePlanningDocument, preparePlanningSnapshot } from './formats'
import { executeReminderCommand, type ReminderCommandResult } from '../reminders/reminderDomain'
import type { EntityRef, ResolvedEntity } from './entityLinks'
import { draftRegistry } from '../storage/draftRegistry'

export type PlanningTaskSource = { initialize: () => Promise<void>; getTasks: () => TaskRecord[]; applyTasks: (tasks: TaskRecord[]) => void; getReminders?: () => { id: string; linkedTaskId?: string }[]; resolveEntity?: (ref: EntityRef) => ResolvedEntity | null }
/** Separate opt-in planning storage. Empty legacy planning is not persisted until an acknowledged command. */
export function createBrowserPlanningStore(client: 'main' | 'mobile', tasks: PlanningTaskSource) {
  const storage = createIndexedDbStorage<PlanningDocument>({ dbName: `nexus-${client}-planning-v1`, debounceMs: 0 })
  const key = `nexus-${client}-planning-v1`
  let document = emptyPlanningDocument(crypto.randomUUID())
  let initialized = false
  let initializing: Promise<void> | undefined
  let error: string | null = null
  let ownsWorkspaceOperation = false
  const inFlight = new Set<Promise<PlanningCommandResult>>()
  const listeners = new Set<() => void>()
  const changed = () => listeners.forEach(listener => listener())
  const journalOpen = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(`nexus-${client}-planning-journal-v1`, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('commands')
    request.onerror = () => reject(request.error || new Error('Planning journal unavailable'))
    request.onblocked = () => reject(new Error('Planning journal is blocked by another window'))
    request.onsuccess = () => resolve(request.result)
  })
  async function journalTransaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) {
    const db = await journalOpen()
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction('commands', mode)
        const request = operation(transaction.objectStore('commands'))
        transaction.oncomplete = () => resolve(request.result)
        transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Planning journal transaction failed'))
      })
    } finally { db.close() }
  }
  const initialize = async () => {
    if (initialized) return
    initializing ??= (async () => {
      await tasks.initialize()
      const stored = await storage.getItem(key)
      if (stored !== null) document = preparePlanningDocument(stored.state)
      initialized = true; error = null; changed()
    })().catch(failure => { initializing = undefined; error = String(failure instanceof Error ? failure.message : failure); changed(); throw failure })
    return initializing
  }
  const capturePlanning = () => preparePlanningDocument(document)
  const restorePlanning = (incoming: PlanningDocument) => {
    document = preparePlanningDocument(incoming)
    storage.setItem(key, { state: document, version: 1 })
    changed()
  }
  const owner = createPlanningCommandOwner({
    initialize,
    resolveEntity: tasks.resolveEntity,
    capture: () => ({ tasks: structuredClone(tasks.getTasks()), planning: capturePlanning() }),
    apply: snapshot => { tasks.applyTasks(snapshot.tasks); restorePlanning(snapshot.planning) },
    flush: () => persistenceRegistry.flush(),
    isFrozen: () => workspaceOperation.getSnapshot().kind === 'recovery' || (workspaceOperation.isActive() && !ownsWorkspaceOperation),
    recoveryRequired: message => { error = message; changed(); workspaceOperation.requireRecovery(message) },
    id: () => crypto.randomUUID(), now: () => new Date().toISOString(),
    journal: {
      read: async () => {
        const pending = await journalTransaction<any>('readonly', store => store.get('pending'))
        return pending ? { before: preparePlanningSnapshot(pending.before), after: preparePlanningSnapshot(pending.after) } : null
      },
      write: async (before, after) => { await journalTransaction('readwrite', store => store.put({ before: preparePlanningSnapshot(before), after: preparePlanningSnapshot(after) }, 'pending')) },
      clear: async () => { await journalTransaction('readwrite', store => store.delete('pending')) },
    },
  })
  const perform = async (command: PlanningCommand): Promise<PlanningCommandResult> => {
    if (workspaceOperation.isActive()) return { ok: false, code: 'unavailable', message: 'Workspace replacement or another acknowledged command is active.' }
    const result = await workspaceOperation.run(async () => {
      ownsWorkspaceOperation = true
      try { return await owner.execute(command) }
      finally { ownsWorkspaceOperation = false }
    }, 'Plan wird sicher gespeichert …')
    if (result.ok === false || command.kind !== 'complete-task' || !command.stopAttachedReminderIds?.length) return result
    // Explicit user selection only; legacy linked reminders have no automatic
    // discriminator. Native/source stop belongs to the elected App reminder owner.
    const reminderStops: { id: string; result: ReminderCommandResult }[] = []
    for (const id of command.stopAttachedReminderIds) {
      const currentTask = tasks.getTasks().find(task => task.id === command.taskId)
      if (document.generation !== command.expected.generation || currentTask?.status !== 'done') {
        reminderStops.push({ id, result: { ok: false, code: 'conflict', message: 'The workspace or completed task changed before the reminder follow-up. Review it before retrying.' } })
        continue
      }
      const source = tasks.getReminders?.().find(reminder => reminder.id === id && reminder.linkedTaskId === command.taskId)
      if (!source) reminderStops.push({ id, result: { ok: false, code: 'conflict', message: 'The selected reminder is missing or no longer linked. It was retained for review.' } })
      else {
        try { reminderStops.push({ id, result: await executeReminderCommand(client, { kind: 'stop', id }) }) }
        catch (error) { reminderStops.push({ id, result: { ok: false, code: 'owner-unavailable', message: String(error instanceof Error ? error.message : error) } }) }
      }
    }
    return { ...result, reminderStops }
  }
  const execute = (command: PlanningCommand): Promise<PlanningCommandResult> => {
    const work = perform(command)
    inFlight.add(work)
    void work.then(() => inFlight.delete(work), () => inFlight.delete(work))
    return work
  }
  return {
    promoteEntity: async (ref: EntityRef): Promise<PlanningCommandResult> => {
      await owner.ready()
      if (workspaceOperation.isActive()) return { ok: false, code: 'unavailable', message: 'Workspace operation is active; source retained.' }
      draftRegistry.flush()
      if (!await persistenceRegistry.flush()) return { ok: false, code: 'storage-failure', message: 'Source drafts could not be acknowledged. No task was created.' }
      const source = tasks.resolveEntity?.(ref)
      if (!source) return { ok: false, code: 'stale', message: 'Source is missing or ambiguous. No task was created.' }
      return execute({ kind: 'promote-entity', key: crypto.randomUUID(), expected: { generation: document.generation, revision: document.revision }, ref, sourceRevision: source.revision })
    },
    initialize, getSnapshot: () => document, getError: () => error,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    capturePlanning, restorePlanning, flushPlanning: () => storage.flush(),
    commandOwner: { execute, drain: async () => { await Promise.allSettled([...inFlight]); await owner.drain() }, ready: owner.ready, retryRecovery: owner.retryRecovery },
    captureCommandSnapshot: (): PlanningSnapshot => ({ tasks: structuredClone(tasks.getTasks()), planning: capturePlanning() }),
  }
}
