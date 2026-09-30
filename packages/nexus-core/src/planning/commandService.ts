import { canonicalContent, civilDeadlineInterval, instantEpoch, intervalValid, planningIssues, taskRevision, validTimeZone, type Availability, type PlanningEvent, type PlanningIssue, type PlanningSnapshot, type TaskRecord } from './domain'
import { preparePlanningSnapshot } from './formats'
import type { ReminderCommandResult } from '../reminders/reminderDomain'
import { previewPlanningIcs } from './icsPlanning'
import { entityIdentity, validEntityRef, type EntityRef, type ResolvedEntity } from './entityLinks'

type Expected = { generation: string; revision: number; taskRevision?: string }
type Base = { key: string; expected: Expected }
export type PlanningCommand = Base & (
  | { kind: 'capture-task'; fields: Partial<TaskRecord> & { title: string } }
  | { kind: 'capture-event'; fields: Omit<PlanningEvent, 'id' | 'revision'>; keepConflict?: boolean }
  | { kind: 'schedule-task'; taskId: string; start: string; durationMinutes?: number; timeZone: string; keepConflict?: boolean; locked?: boolean }
  | { kind: 'move-block'; blockId: string; start: string; timeZone: string; keepConflict?: boolean }
  | { kind: 'complete-task'; taskId: string; stopAttachedReminderIds?: string[] }
  | { kind: 'set-availability'; availability: Availability }
  | { kind: 'import-ics'; raw: string; fileName?: string; timeZone: string; includeBaseOccurrences: boolean; keepConflict?: boolean }
  | { kind: 'promote-entity'; ref: EntityRef; sourceRevision: string }
  | { kind: 'repair-task-link'; taskId: string; linkKind: EntityRef['kind']; ref: EntityRef | null }
)
export type PlanningCommandResult =
  | { ok: true; acknowledged: true; ids: string[]; revision: number; issues: PlanningIssue[]; replayed: boolean; reminderStops?: { id: string; result: ReminderCommandResult }[] }
  | { ok: false; code: 'validation' | 'conflict' | 'stale' | 'unavailable' | 'storage-failure'; message: string; issues?: PlanningIssue[] }
export type PlanningCommandPorts = {
  initialize: () => Promise<void>; capture: () => PlanningSnapshot; apply: (snapshot: PlanningSnapshot) => void
  journal: { write: (before: PlanningSnapshot, after: PlanningSnapshot) => Promise<void>; clear: () => Promise<void>; read: () => Promise<{ before: PlanningSnapshot; after: PlanningSnapshot } | null> }
  flush: () => Promise<boolean>; isFrozen: () => boolean; id: () => string; now: () => string
  recoveryRequired?: (message: string) => void
  resolveEntity?: (ref: EntityRef) => ResolvedEntity | null
}
const failure = (code: Extract<PlanningCommandResult, { ok: false }>['code'], message: string, issues?: PlanningIssue[]): PlanningCommandResult => ({ ok: false, code, message, ...(issues ? { issues } : {}) })
const validDuration = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 10080
const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key)
/** One serialized owner per application. Workspace replacement must freeze new calls and await drain before capture. */
export function createPlanningCommandOwner(ports: PlanningCommandPorts) {
  let tail: Promise<unknown> = Promise.resolve()
  let ready = false
  let blocked = false
  const serial = <T>(operation: () => Promise<T>): Promise<T> => { const next = tail.then(operation); tail = next.catch(() => {}); return next }
  const initialize = async () => {
    if (ready) return
    await ports.initialize()
    const pending = await ports.journal.read()
    if (pending) {
      const current = preparePlanningSnapshot(ports.capture())
      const sameTasks = [pending.before.tasks, pending.after.tasks].some(tasks => canonicalContent(tasks) === canonicalContent(current.tasks))
      const emptyLegacyPlanning = current.planning.revision === 0 && !current.planning.events.length && !current.planning.blocks.length && !Object.keys(current.planning.durations).length && !Object.keys(current.planning.receipts).length && current.planning.availability === null
      const samePlanning = emptyLegacyPlanning || [pending.before.planning, pending.after.planning].some(planning => canonicalContent(planning) === canonicalContent(current.planning))
      if (!sameTasks || !samePlanning) throw new Error('Planning journal differs from current sources. Data and journal retained for explicit repair.')
      ports.apply(preparePlanningSnapshot(pending.before))
      if (!await ports.flush()) throw new Error('Planning recovery could not be acknowledged; journal retained')
      await ports.journal.clear()
    }
    preparePlanningSnapshot(ports.capture())
    ready = true
  }
  const execute = (command: PlanningCommand): Promise<PlanningCommandResult> => serial(async () => {
    if (ports.isFrozen()) return failure('unavailable', 'A workspace replacement or recovery is active.')
    try {
      await initialize()
      if (blocked) return failure('unavailable', 'Planning storage recovery is required.')
      if (ports.isFrozen()) return failure('unavailable', 'A workspace replacement or recovery is active.')
      const before = preparePlanningSnapshot(ports.capture())
      if (!command || typeof command !== 'object' || !['capture-task', 'capture-event', 'schedule-task', 'move-block', 'complete-task', 'set-availability', 'import-ics', 'promote-entity', 'repair-task-link'].includes(command.kind)) return failure('validation', 'Choose a supported planning command.')
      if (typeof command.key !== 'string' || !command.key || command.key.length > 200) return failure('validation', 'A stable command identity is required.')
      if (!command.expected || typeof command.expected.generation !== 'string' || !Number.isSafeInteger(command.expected.revision) || command.expected.revision < 0) return failure('validation', 'A workspace generation and planning revision are required.')
      if (command.expected.generation !== before.planning.generation) return failure('stale', 'The workspace generation changed. Review current data before retrying.')
      const content = canonicalContent(command)
      const prior = own(before.planning.receipts, command.key) ? before.planning.receipts[command.key] : undefined
      if (prior) return prior.command === content
        ? { ok: true, acknowledged: true, ids: [...prior.ids], revision: prior.revision, issues: structuredClone(prior.issues), replayed: true }
        : failure('conflict', 'This command identity was already used with different content.')
      if (command.expected.generation !== before.planning.generation || command.expected.revision !== before.planning.revision) return failure('stale', 'The workspace or planning revision changed. Review current data before retrying.')
      const after = preparePlanningSnapshot(before)
      const ids: string[] = []
      let issues: PlanningIssue[] = []
      let boundEntity: ResolvedEntity | null = null
      const taskId = 'taskId' in command ? command.taskId : command.kind === 'move-block' ? before.planning.blocks.find(block => block.id === command.blockId)?.taskId : undefined
      const task = taskId ? before.tasks.find(item => item.id === taskId) : undefined
      if (taskId && !task) return failure('stale', 'The linked task is missing; its blocks are retained for repair.')
      if (task && command.expected.taskRevision !== taskRevision(task)) return failure('stale', 'The canonical task changed. Review status, deadline and relationships before retrying.')
      if (command.kind === 'promote-entity') {
        if (!validEntityRef(command.ref) || typeof command.sourceRevision !== 'string' || !command.sourceRevision) return failure('validation', 'Choose a typed Note or Canvas node source.')
        boundEntity = ports.resolveEntity?.(command.ref) || null
        if (!boundEntity || boundEntity.revision !== command.sourceRevision) return failure('stale', 'Source is missing, ambiguous or changed. Nothing was promoted.')
        const existing = before.tasks.filter(task => validEntityRef(task.promotionSource) && entityIdentity(task.promotionSource) === entityIdentity(command.ref)
          || command.ref.kind === 'note' && task.linkedNoteId === command.ref.id
          || Array.isArray(task.entityLinks) && task.entityLinks.some((ref: unknown) => validEntityRef(ref) && entityIdentity(ref) === entityIdentity(command.ref)))
        if (existing.length > 1) return failure('conflict', 'Several tasks already reference this promotion source. Review existing tasks; no duplicate was created.')
        if (existing.length) ids.push(existing[0].id)
        else {
          const id = ports.id(), now = ports.now()
          after.tasks.push({ id, title: boundEntity.title, desc: boundEntity.summary, status: 'todo', priority: 'mid', created: now, updated: now, tags: [], subtasks: [], entityLinks: [structuredClone(command.ref)], promotionSource: structuredClone(command.ref), ...(command.ref.kind === 'note' ? { linkedNoteId: command.ref.id } : { linkedCanvasNodeId: command.ref.id }) })
          ids.push(id)
        }
      } else if (command.kind === 'repair-task-link') {
        if (!task || !['note', 'canvas-node'].includes(command.linkKind) || command.ref !== null && (!validEntityRef(command.ref) || command.ref.kind !== command.linkKind)) return failure('validation', 'Choose an existing typed destination or explicitly clear the broken link.')
        if (command.ref) { boundEntity = ports.resolveEntity?.(command.ref) || null; if (!boundEntity) return failure('stale', 'Selected destination is missing or ambiguous. Original link retained.') }
        const links = (Array.isArray(task.entityLinks) ? task.entityLinks : []).filter((ref: unknown) => !validEntityRef(ref) || ref.kind !== command.linkKind)
        if (command.ref) links.push(structuredClone(command.ref))
        after.tasks = after.tasks.map(item => item.id === task.id ? { ...item, entityLinks: links, ...(command.linkKind === 'note' ? { linkedNoteId: command.ref?.id } : { linkedCanvasNodeId: command.ref?.id }), updated: ports.now() } : item)
        ids.push(task.id)
      } else if (command.kind === 'capture-task') {
        if (!command.fields || typeof command.fields.title !== 'string' || !command.fields.title.trim()) return failure('validation', 'Enter a task title.')
        if (command.fields.deadline) {
          const civil = /^\d{4}-\d{2}-\d{2}$/.test(command.fields.deadline)
          if (civil ? !civilDeadlineInterval(command.fields as TaskRecord) : !Number.isFinite(instantEpoch(command.fields.deadline))) return failure('validation', 'A new deadline needs a valid instant or a civil date with an explicit IANA zone.')
        }
        if (command.fields.durationMinutes !== undefined && !validDuration(command.fields.durationMinutes)) return failure('validation', 'Duration must be a known positive number of minutes, at most one week.')
        const id = ports.id(), now = ports.now()
        after.tasks.push({ desc: '', status: 'todo', priority: 'mid', tags: [], subtasks: [], ...structuredClone(command.fields), id, title: command.fields.title.trim(), created: now, updated: now })
        ids.push(id)
      } else if (command.kind === 'capture-event') {
        if (!command.fields || !command.fields.title || !intervalValid(command.fields as any) || !validTimeZone(String(command.fields.timeZone))) return failure('validation', 'A fixed event needs a title, a valid start/end and IANA time zone.')
        issues = planningIssues(before, command.fields as any, String(command.fields.timeZone))
        // A fixed commitment is itself a coverage fact, but its overlaps still require explicit acknowledgement.
        issues = issues.filter(issue => issue.code === 'overlap')
        if (issues.length && !command.keepConflict) return failure('conflict', 'The event overlaps an existing commitment. Choose keep conflict explicitly.', issues)
        const id = ports.id()
        after.planning.events.push({ ...structuredClone(command.fields), id, revision: 1 } as PlanningEvent)
        ids.push(id)
      } else if (command.kind === 'schedule-task' || command.kind === 'move-block') {
        if (!task || task.status === 'done') return failure('validation', 'Completed tasks cannot receive new or moved work blocks.')
        const block = command.kind === 'move-block' ? before.planning.blocks.find(item => item.id === command.blockId) : undefined
        if (command.kind === 'move-block' && (!block || block.state !== 'active')) return failure('stale', 'This block is missing or inactive.')
        const duration = command.kind === 'schedule-task' ? command.durationMinutes ?? task.durationMinutes ?? (own(before.planning.durations, task.id) ? before.planning.durations[task.id] : undefined) : (Date.parse(block!.end) - Date.parse(block!.start)) / 60000
        if (!validDuration(duration)) return failure('validation', 'Task duration is unknown. Enter positive minutes before scheduling.')
        if (!Number.isFinite(Date.parse(command.start)) || !validTimeZone(command.timeZone)) return failure('validation', 'Choose a valid start instant and IANA time zone.')
        const interval = { start: command.start, end: new Date(Date.parse(command.start) + duration * 60000).toISOString() }
        if (!intervalValid(interval)) return failure('validation', 'Choose a valid interval; local gaps/folds require an explicit valid time.')
        issues = planningIssues(before, interval, command.timeZone, task, block?.id)
        if (issues.length && !command.keepConflict) return failure('conflict', 'Review overlap, dependency, deadline and coverage facts. Keep an explicit conflict/uncertainty only after review.', issues)
        if (block) {
          after.planning.blocks = after.planning.blocks.map(item => item.id === block.id ? { ...item, ...interval, timeZone: command.timeZone, revision: item.revision + 1, acceptedIssues: issues } : item)
          ids.push(block.id)
        } else {
          const id = ports.id()
          after.planning.blocks.push({ id, taskId: task.id, ...interval, timeZone: command.timeZone, revision: 1, provenance: 'manual', locked: command.kind === 'schedule-task' && Boolean(command.locked), state: 'active', acceptedIssues: issues })
          Object.defineProperty(after.planning.durations, task.id, { value: duration, enumerable: true, configurable: true, writable: true })
          ids.push(id)
        }
      } else if (command.kind === 'complete-task') {
        if (!task) return failure('stale', 'The task no longer exists.')
        if (command.stopAttachedReminderIds !== undefined && (!Array.isArray(command.stopAttachedReminderIds) || command.stopAttachedReminderIds.some(id => typeof id !== 'string' || !id) || new Set(command.stopAttachedReminderIds).size !== command.stopAttachedReminderIds.length)) return failure('validation', 'Choose each attached reminder once.')
        const now = ports.now()
        after.tasks = after.tasks.map(item => item.id === task.id ? { ...item, status: 'done', updated: now } : item)
        after.planning.blocks = after.planning.blocks.map(block => block.taskId === task.id && Date.parse(block.end) > Date.parse(now) ? { ...block, state: 'inactive', inactiveReason: 'task-completed', completedAt: now, revision: block.revision + 1 } : block)
        ids.push(task.id)
        // Attached reminder cancellation is a separately acknowledged reminder-owner command; independent reminders stay unchanged.
      } else if (command.kind === 'import-ics') {
        if (typeof command.includeBaseOccurrences !== 'boolean' || command.fileName !== undefined && (typeof command.fileName !== 'string' || command.fileName.length > 300)) return failure('validation', 'Choose explicit ICS import options.')
        let preview
        try { preview = previewPlanningIcs(command.raw, command.timeZone) }
        catch (error) { return failure('validation', String(error instanceof Error ? error.message : error)) }
        const archiveId = ports.id()
        for (const row of preview.rows) {
          if (!row.event || row.recurring && !command.includeBaseOccurrences) continue
          const id = ports.id()
          const conflicts = planningIssues(after, row.event as any, command.timeZone).filter(issue => issue.code === 'overlap')
          issues.push(...conflicts)
          if (conflicts.length && !command.keepConflict) return failure('conflict', 'ICS fixed events overlap commitments. Review and explicitly keep conflicts before importing.', issues)
          after.planning.events.push({ ...row.event, id, revision: 1, source: { ...row.event.source, archiveId } } as PlanningEvent)
          ids.push(id)
        }
        const existing = after.planning.icsImports as unknown[] | undefined
        if (existing !== undefined && !Array.isArray(existing)) return failure('validation', 'Existing ICS archive metadata is unsupported; it was retained.')
        after.planning.icsImports = [...(existing || []), { id: archiveId, format: 'nexus-ics-archive', version: 1, importedAt: ports.now(), fileName: command.fileName || '', raw: preview.raw, timeZone: preview.timeZone, warnings: preview.warnings, rows: preview.rows.map(({ event, ...row }) => ({ ...row, imported: Boolean(event && (!row.recurring || command.includeBaseOccurrences)) })), eventIds: [...ids] }]
        ids.push(archiveId)
      } else if (command.kind === 'set-availability') {
        after.planning.availability = structuredClone(command.availability)
      }
      after.planning.revision++
      Object.defineProperty(after.planning.receipts, command.key, { value: { command: content, ids, revision: after.planning.revision, issues }, enumerable: true, configurable: true, writable: true })
      try { preparePlanningSnapshot(after) } catch (error) { return failure('validation', String(error instanceof Error ? error.message : error)) }
      if (ports.isFrozen() || canonicalContent(ports.capture()) !== canonicalContent(before) || boundEntity && ports.resolveEntity?.(boundEntity.ref)?.revision !== boundEntity.revision) return failure('stale', 'Sources changed before the transaction. Nothing was applied.')
      await ports.journal.write(before, after)
      if (canonicalContent(ports.capture()) !== canonicalContent(before) || boundEntity && ports.resolveEntity?.(boundEntity.ref)?.revision !== boundEntity.revision) {
        blocked = true
        ports.recoveryRequired?.('Sources changed while journaling. Planning recovery is required; nothing was applied.')
        return failure('stale', 'Sources changed while journaling. Recovery is required; nothing was applied.')
      }
      try {
        ports.apply(after)
        if (!await ports.flush()) throw new Error('Planning storage acknowledgement failed')
        await ports.journal.clear()
      } catch (error) {
        try {
          ports.apply(before)
          if (!await ports.flush()) throw new Error('Planning rollback could not be acknowledged')
          await ports.journal.clear()
        } catch { blocked = true; ports.recoveryRequired?.('Planning transaction and rollback failed; recovery journal retained.') }
        return failure('storage-failure', blocked ? 'Planning transaction failed; recovery journal retained.' : 'Planning transaction failed; previous records were durably restored.')
      }
      return { ok: true, acknowledged: true, ids, revision: after.planning.revision, issues, replayed: false }
    } catch (error) {
      blocked = true
      ports.recoveryRequired?.(String(error instanceof Error ? error.message : error))
      return failure('storage-failure', String(error instanceof Error ? error.message : error))
    }
  })
  return {
    execute, drain: () => serial(async () => {}),
    ready: () => serial(async () => {
      try { await initialize() }
      catch (error) { blocked = true; ports.recoveryRequired?.(String(error instanceof Error ? error.message : error)); throw error }
    }),
    retryRecovery: () => serial(async () => { ready = false; blocked = false; await initialize() }),
  }
}
