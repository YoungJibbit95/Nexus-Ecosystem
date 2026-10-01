import { emptyPlanningDocument, intervalValid, validTimeZone, type PlanningDocument, type PlanningSnapshot } from './domain'
import { validEntityRef } from './entityLinks'

const record = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
function requireValue(value: unknown, field: string): asserts value { if (!value) throw new Error(`Invalid planning format: ${field}`) }
const nonempty = (value: unknown) => typeof value === 'string' && value.length > 0
const revision = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0
const interval = (value: unknown) => record(value) && intervalValid(value as any)
const issue = (value: unknown) => record(value) && ['overlap', 'unknown-coverage', 'outside-availability', 'blocked', 'dependency', 'deadline', 'unresolved-task'].includes(value.code) && nonempty(value.message) && (value.entityId === undefined || nonempty(value.entityId))
function collection(value: unknown, name: string, validate: (item: Record<string, any>) => void) {
  requireValue(Array.isArray(value), name)
  const ids = new Set<string>()
  for (const item of value) {
    requireValue(record(item) && nonempty(item.id) && !ids.has(item.id), `${name}.id`)
    ids.add(item.id); validate(item)
  }
}
/** Reject unknown future versions without rewriting. Preserve unknown metadata on valid records. */
export function preparePlanningDocument(raw: unknown): PlanningDocument {
  requireValue(record(raw) && raw.format === 'nexus-planning' && raw.schemaVersion === 1, 'unsupported version')
  requireValue(nonempty(raw.generation) && revision(raw.revision), 'generation/revision')
  collection(raw.events, 'events', event => {
    requireValue(interval(event) && nonempty(event.title) && validTimeZone(event.timeZone) && typeof event.allDay === 'boolean' && revision(event.revision), 'event interval/details')
    requireValue(record(event.source) && ['manual', 'ics'].includes(event.source.kind), 'event source')
    for (const key of ['uid', 'rule']) requireValue(event.source[key] === undefined || typeof event.source[key] === 'string', `event.source.${key}`)
  })
  collection(raw.blocks, 'blocks', block => {
    requireValue(interval(block) && nonempty(block.taskId) && validTimeZone(block.timeZone) && revision(block.revision), 'block interval/task')
    requireValue(block.provenance === 'manual' && typeof block.locked === 'boolean' && ['active', 'inactive'].includes(block.state), 'block state/provenance')
    requireValue(Array.isArray(block.acceptedIssues) && block.acceptedIssues.every(issue), 'block acceptedIssues')
  })
  requireValue(record(raw.durations) && Object.entries(raw.durations).every(([id, minutes]) => nonempty(id) && Number.isFinite(minutes) && Number(minutes) > 0 && Number(minutes) <= 10080), 'durations')
  if (raw.availability !== null) {
    const coverage = raw.availability
    requireValue(record(coverage) && interval(coverage.horizon) && validTimeZone(coverage.timeZone) && ['unknown', 'complete'].includes(coverage.coverage), 'availability coverage')
    requireValue(Array.isArray(coverage.windows) && coverage.windows.every(interval) && Array.isArray(coverage.sourceIds) && coverage.sourceIds.every(nonempty) && nonempty(coverage.updatedAt), 'availability windows/source')
  }
  requireValue(record(raw.receipts), 'receipts')
  for (const receipt of Object.values(raw.receipts)) requireValue(record(receipt) && nonempty(receipt.command) && Array.isArray(receipt.ids) && receipt.ids.every(nonempty) && revision(receipt.revision) && Array.isArray(receipt.issues) && receipt.issues.every(issue), 'receipt')
  if (raw.icsImports !== undefined) collection(raw.icsImports, 'icsImports', archive => {
    requireValue(typeof archive.fileName === 'string' && nonempty(archive.importedAt), 'ICS archive label/time')
    requireValue(archive.format === 'nexus-ics-archive' && archive.version === 1 && typeof archive.raw === 'string' && validTimeZone(archive.timeZone) && Array.isArray(archive.warnings) && archive.warnings.every((warning: unknown) => typeof warning === 'string') && Array.isArray(archive.eventIds) && archive.eventIds.every(nonempty), 'ICS archive version/provenance')
    requireValue(Array.isArray(archive.rows) && archive.rows.every((row: unknown) => record(row) && typeof row.title === 'string' && typeof row.raw === 'string' && typeof row.imported === 'boolean' && typeof row.recurring === 'boolean' && Array.isArray(row.warnings) && row.warnings.every((warning: unknown) => typeof warning === 'string')), 'ICS archive rows')
  })
  return structuredClone(raw) as PlanningDocument
}
export function preparePlanningSnapshot(raw: unknown): PlanningSnapshot {
  requireValue(record(raw), 'snapshot')
  collection(raw.tasks, 'tasks', task => {
    requireValue(typeof task.title === 'string' && typeof task.desc === 'string' && ['todo', 'doing', 'done'].includes(task.status) && ['low', 'mid', 'high'].includes(task.priority) && typeof task.created === 'string' && typeof task.updated === 'string', 'canonical task')
    requireValue(task.dependsOnTaskIds === undefined || (Array.isArray(task.dependsOnTaskIds) && task.dependsOnTaskIds.every(nonempty)), 'task dependencies')
    requireValue(task.blocked === undefined || typeof task.blocked === 'boolean', 'task blocked')
    requireValue(task.blockedReason === undefined || typeof task.blockedReason === 'string', 'task blockedReason')
    requireValue(task.deadline === undefined || typeof task.deadline === 'string', 'task deadline')
    requireValue(task.deadlineTimeZone === undefined || validTimeZone(task.deadlineTimeZone), 'task deadlineTimeZone')
    requireValue(task.durationMinutes === undefined || (Number.isFinite(task.durationMinutes) && task.durationMinutes > 0 && task.durationMinutes <= 10080), 'task duration')
    requireValue(task.entityLinks === undefined || Array.isArray(task.entityLinks) && task.entityLinks.every(validEntityRef), 'typed task links')
    requireValue(task.promotionSource === undefined || validEntityRef(task.promotionSource), 'typed promotion source')
  })
  return { tasks: structuredClone(raw.tasks), planning: preparePlanningDocument(raw.planning) }
}
/** Import/export adapters use this separate sidecar; no additions to version-1 envelopes. */
export const createPlanningExchange = (planning: PlanningDocument) => preparePlanningDocument(planning)
export const initializeLegacyPlanning = (generation: string) => emptyPlanningDocument(generation)
export const planningDowngradeNotice = (planning: PlanningDocument) => ({
  losesPlanning: Boolean(planning.events.length || planning.blocks.length || Object.keys(planning.durations).length || planning.availability || Object.keys(planning.receipts).length || Array.isArray(planning.icsImports) && planning.icsImports.length),
  message: 'Version 1 does not carry events, work blocks, duration estimates, availability, command receipts or raw ICS archives. Export version 2 to retain planning. Existing task deadlines remain unchanged.',
})
/** Explicit planning selection only: incoming entity IDs/durations win; availability replaces exactly. */
export function mergePlanningDocuments(current: PlanningDocument, incoming: PlanningDocument): PlanningDocument {
  const left = preparePlanningDocument(current), right = preparePlanningDocument(incoming)
  const mergeIds = <T extends { id: string }>(before: T[], after: T[]) => Array.from(new Map([...before, ...after].map(item => [item.id, item])).values())
  const receipts = { ...left.receipts }
  for (const [key, receipt] of Object.entries(right.receipts)) {
    const existing = Object.prototype.hasOwnProperty.call(receipts, key) ? receipts[key] : undefined
    if (existing && existing.command !== receipt.command) throw new Error(`Planning receipt identity collision: ${key}`)
    if (!existing) Object.defineProperty(receipts, key, { value: receipt, enumerable: true, configurable: true, writable: true })
  }
  return preparePlanningDocument({ ...left, ...right, ...((left.icsImports || right.icsImports) ? { icsImports: mergeIds((left.icsImports || []) as any[], (right.icsImports || []) as any[]) } : {}), generation: left.generation, revision: Math.max(left.revision, right.revision) + 1,
    events: mergeIds(left.events, right.events), blocks: mergeIds(left.blocks, right.blocks), durations: { ...left.durations, ...right.durations }, availability: right.availability, receipts })
}
/** Recovery restores exact journals; only a newly accepted import/restore renews generation. */
export function renewPlanningGeneration(planning: PlanningDocument, generation: string): PlanningDocument {
  return preparePlanningDocument({ ...preparePlanningDocument(planning), generation })
}
