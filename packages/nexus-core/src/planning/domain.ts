import { planningDayHorizon } from './planningTime'

export type TaskRecord = Record<string, unknown> & {
  id: string; title: string; desc: string; status: 'todo' | 'doing' | 'done'; priority: 'low' | 'mid' | 'high'
  created: string; updated: string; deadline?: string; deadlineTimeZone?: string; durationMinutes?: number
  blocked?: boolean; blockedReason?: string; dependsOnTaskIds?: string[]
}
export type PlanningInterval = { start: string; end: string }
export type PlanningEvent = Record<string, unknown> & PlanningInterval & {
  id: string; title: string; timeZone: string; allDay: boolean; revision: number
  source: { kind: 'manual' | 'ics'; uid?: string; rule?: string; [key: string]: unknown }
}
export type PlanningBlock = Record<string, unknown> & PlanningInterval & {
  id: string; taskId: string; timeZone: string; revision: number; provenance: 'manual'; locked: boolean
  state: 'active' | 'inactive'; inactiveReason?: 'task-completed'; completedAt?: string
  acceptedIssues: PlanningIssue[]
}
export type Availability = Record<string, unknown> & {
  horizon: PlanningInterval; windows: PlanningInterval[]; timeZone: string
  coverage: 'unknown' | 'complete'; sourceIds: string[]; updatedAt: string
}
export type PlanningIssue = { code: 'overlap' | 'unknown-coverage' | 'outside-availability' | 'blocked' | 'dependency' | 'deadline' | 'unresolved-task'; message: string; entityId?: string }
export type PlanningReceipt = { command: string; ids: string[]; revision: number; issues: PlanningIssue[] }
export type PlanningDocument = Record<string, unknown> & {
  format: 'nexus-planning'; schemaVersion: 1; generation: string; revision: number
  events: PlanningEvent[]; blocks: PlanningBlock[]; durations: Record<string, number>
  availability: Availability | null; receipts: Record<string, PlanningReceipt>
}
export type PlanningSnapshot = { tasks: TaskRecord[]; planning: PlanningDocument }

export const emptyPlanningDocument = (generation: string): PlanningDocument => ({
  format: 'nexus-planning', schemaVersion: 1, generation, revision: 0,
  events: [], blocks: [], durations: {}, availability: null, receipts: {},
})
export const instantEpoch = (instant: string) => {
  const fields = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(instant)
  if (!fields) return NaN
  const [, year, month, day, hour, minute, second = '0', offsetHour = '0', offsetMinute = '0'] = fields.map(value => value === undefined ? undefined : value)
  const civil = new Date(0); civil.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
  if (Number(year) < 1 || civil.getUTCFullYear() !== Number(year) || civil.getUTCMonth() + 1 !== Number(month) || civil.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Number(offsetHour) > 23 || Number(offsetMinute) > 59) return NaN
  return Date.parse(instant)
}
export const validTimeZone = (zone: string) => {
  try { if (!zone || /^[+-]/.test(zone)) return false; new Intl.DateTimeFormat('en', { timeZone: zone }).format(0); return true } catch { return false }
}
export const intervalValid = (value: PlanningInterval) => Number.isFinite(instantEpoch(value.start)) && Number.isFinite(instantEpoch(value.end)) && instantEpoch(value.end) > instantEpoch(value.start)
export const intervalsOverlap = (left: PlanningInterval, right: PlanningInterval) => instantEpoch(left.start) < instantEpoch(right.end) && instantEpoch(right.start) < instantEpoch(left.end)
export const intervalContains = (outer: PlanningInterval, inner: PlanningInterval) => instantEpoch(outer.start) <= instantEpoch(inner.start) && instantEpoch(outer.end) >= instantEpoch(inner.end)
export const civilDeadlineInterval = (task: TaskRecord): PlanningInterval | null => {
  if (!task.deadline || !/^\d{4}-\d{2}-\d{2}$/.test(task.deadline) || !task.deadlineTimeZone || !validTimeZone(task.deadlineTimeZone)) return null
  try { return planningDayHorizon(task.deadline, task.deadlineTimeZone) } catch { return null }
}
export const zonedDate = (instant: string, zone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA-u-ca-iso8601', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(instantEpoch(instant))
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
/** Content identity, not an authentication checksum. Binds every supplied command field. */
export function canonicalContent(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalContent).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter(key => (value as Record<string, unknown>)[key] !== undefined).map(key => `${JSON.stringify(key)}:${canonicalContent((value as Record<string, unknown>)[key])}`).join(',')}}`
  return JSON.stringify(value)
}
export const taskRevision = (task: TaskRecord) => canonicalContent(task)

export function planningIssues(snapshot: PlanningSnapshot, interval: PlanningInterval, zone: string, task?: TaskRecord, excludingBlockId?: string): PlanningIssue[] {
  const issues: PlanningIssue[] = []
  for (const entity of [...snapshot.planning.events.filter(event => event.id !== excludingBlockId), ...snapshot.planning.blocks.filter(block => block.state === 'active' && block.id !== excludingBlockId)]) {
    if (intervalsOverlap(entity, interval)) issues.push({ code: 'overlap', entityId: entity.id, message: `Overlaps ${'taskId' in entity ? 'work block' : 'fixed event'} ${entity.id}.` })
  }
  const availability = snapshot.planning.availability
  if (!availability || availability.coverage !== 'complete' || !intervalContains(availability.horizon, interval)) {
    issues.push({ code: 'unknown-coverage', message: 'Calendar coverage is unknown for this interval; this is not a confirmed free slot.' })
  }
  if (availability && !availability.windows.some(window => intervalContains(window, interval))) issues.push({ code: 'outside-availability', message: 'Outside the explicitly supplied working windows.' })
  if (task) {
    if (task.blocked) issues.push({ code: 'blocked', entityId: task.id, message: task.blockedReason || 'This task is blocked.' })
    for (const id of task.dependsOnTaskIds || []) {
      if (snapshot.tasks.find(item => item.id === id)?.status !== 'done') issues.push({ code: 'dependency', entityId: id, message: 'A prerequisite is unfinished or unresolved.' })
    }
    if (task.deadline) {
      const deadline = instantEpoch(task.deadline)
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(task.deadline), civil = dateOnly ? civilDeadlineInterval(task) : null
      if (dateOnly && !civil) issues.push({ code: 'deadline', entityId: task.id, message: 'The civil deadline has no resolved IANA zone/date. Its original value is retained; completion cannot be confirmed against it.' })
      else if (dateOnly ? instantEpoch(interval.end) > instantEpoch(civil!.end) : !Number.isFinite(deadline) || instantEpoch(interval.end) > deadline) issues.push({ code: 'deadline', entityId: task.id, message: 'This block ends after the deadline, or its legacy deadline cannot be interpreted.' })
    }
  }
  return issues
}
