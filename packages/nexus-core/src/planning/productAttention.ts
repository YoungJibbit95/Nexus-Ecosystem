import { civilDeadlineInterval, instantEpoch, intervalValid, intervalsOverlap, zonedDate, type PlanningDocument, type TaskRecord } from './domain'
import { planningDayHorizon } from './planningTime'
import { selectPlanningToday, type TodayReminder } from './today'

export type AttentionReason = 'overdue' | 'due-soon' | 'high-priority' | 'blocked' | 'unresolved' | 'unplanned' | 'conflict'
export type ProductTarget = { kind: 'task'; id: string } | { kind: 'reminder'; id: string } | { kind: 'agenda'; day: string }
export type AttentionItem = {
  key: string; title: string; kind: 'task' | 'reminder' | 'planning'; target: ProductTarget
  reasons: AttentionReason[]; detail: string; time: number; task?: TaskRecord
}
export type Commitment = { key: string; title: string; start: string; end: string; kind: 'event' | 'block'; target: ProductTarget; taskId?: string; unresolved: boolean }
export const attentionReasonLabels: Record<AttentionReason, string> = {
  overdue: 'Überfällig', 'due-soon': 'Bald fällig', 'high-priority': 'Hohe Priorität', blocked: 'Blockiert',
  unresolved: 'Klärung nötig', unplanned: 'Noch nicht eingeplant', conflict: 'Zeitkonflikt',
}
const rank: Record<AttentionReason, number> = { conflict: 0, overdue: 1, unresolved: 2, blocked: 3, 'due-soon': 4, 'high-priority': 5, unplanned: 6 }
export type ProductAttentionInput = { tasks: TaskRecord[]; reminders: TodayReminder[]; planning: PlanningDocument; now: string; timeZone: string }
export const compareAttention = (a: AttentionItem, b: AttentionItem) =>
  Math.min(...a.reasons.map(reason => rank[reason])) - Math.min(...b.reasons.map(reason => rank[reason])) ||
  (a.time === b.time ? 0 : a.time < b.time ? -1 : 1) || a.key.localeCompare(b.key, 'en')

/** Shared read-only product semantics. Client presentation stays outside core. */
export function selectProductAttention(input: ProductAttentionInput) {
  const { tasks, reminders, planning, now, timeZone } = input
  const nowMs = instantEpoch(now), day = zonedDate(now, timeZone), horizon = planningDayHorizon(day, timeZone)
  const soon = nowMs + 48 * 60 * 60_000
  const taskById = new Map(tasks.map(task => [task.id, task]))
  const activeBlocks = planning.blocks.filter(block => block.state === 'active')
  const upcomingBlocks = activeBlocks.filter(block => intervalValid(block) && instantEpoch(block.end) > nowMs)
  const plannedTasks = new Set(upcomingBlocks.map(block => block.taskId))
  const attention: AttentionItem[] = []
  for (const task of tasks) {
    if (task.status === 'done') continue
    const reasons: AttentionReason[] = [], details: string[] = []
    let time = Infinity
    if (task.deadline) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) {
        const civil = civilDeadlineInterval(task)
        if (civil) {
          time = instantEpoch(civil.end)
          if (nowMs >= time) reasons.push('overdue')
          else if (instantEpoch(civil.start) < soon) reasons.push('due-soon')
          details.push(`Frist ${new Date(`${task.deadline}T12:00:00Z`).toLocaleDateString('de-DE', { timeZone: 'UTC' })}${task.deadlineTimeZone !== timeZone ? ` · ${task.deadlineTimeZone}` : ''}`)
        } else {
          reasons.push('unresolved')
          details.push(`Frist ${task.deadline}: Datum oder Zeitzone prüfen`)
        }
      } else {
        time = instantEpoch(task.deadline)
        if (!Number.isFinite(time)) { reasons.push('unresolved'); time = Infinity; details.push('Frist prüfen') }
        else {
          if (time < nowMs) reasons.push('overdue')
          else if (time <= soon) reasons.push('due-soon')
          details.push(`Frist ${new Date(time).toLocaleString('de-DE', { timeZone, dateStyle: 'short', timeStyle: 'short' })}`)
        }
      }
    }
    if (task.blocked || (task.dependsOnTaskIds || []).some(id => taskById.get(id)?.status !== 'done')) {
      reasons.push('blocked'); details.push(task.blockedReason || 'Voraussetzung fehlt oder ist noch offen')
    }
    if (task.priority === 'high') reasons.push('high-priority')
    if (!plannedTasks.has(task.id)) reasons.push('unplanned')
    if (reasons.length) attention.push({ key: `task:${task.id}`, title: task.title, kind: 'task', target: { kind: 'task', id: task.id }, reasons, detail: details.join(' · '), time, task })
  }
  for (const reminder of reminders) {
    if (reminder.done) continue
    const time = instantEpoch(reminder.snoozeUntil || reminder.datetime)
    const reasons: AttentionReason[] = !Number.isFinite(time) ? ['unresolved'] : time < nowMs ? ['overdue'] : time <= soon ? ['due-soon'] : []
    if (reasons.length) attention.push({ key: `reminder:${reminder.id}`, title: reminder.title, kind: 'reminder', target: { kind: 'reminder', id: reminder.id }, reasons,
      time: Number.isFinite(time) ? time : Infinity, detail: Number.isFinite(time) ? `${reminder.snoozeUntil ? 'Schlummert bis' : 'Erinnerung'} ${new Date(time).toLocaleString('de-DE', { timeZone, dateStyle: 'short', timeStyle: 'short' })}` : 'Erinnerungszeit prüfen' })
  }
  const commitments: Commitment[] = [
    ...planning.events.filter(intervalValid).filter(event => instantEpoch(event.end) > nowMs).map(event => ({ key: `event:${event.id}`, title: event.title, start: event.start, end: event.end, kind: 'event' as const, target: { kind: 'agenda' as const, day: zonedDate(event.start, timeZone) }, unresolved: false })),
    ...upcomingBlocks.filter(block => taskById.get(block.taskId)?.status !== 'done').map(block => ({ key: `block:${block.id}`, title: taskById.get(block.taskId)?.title || 'Arbeitsblock ohne Aufgabe', start: block.start, end: block.end, kind: 'block' as const, target: { kind: 'agenda' as const, day: zonedDate(block.start, timeZone) }, taskId: taskById.has(block.taskId) ? block.taskId : undefined, unresolved: !taskById.has(block.taskId) })),
  ].sort((a, b) => instantEpoch(a.start) - instantEpoch(b.start) || a.key.localeCompare(b.key, 'en'))
  // Historic orphan blocks remain reviewable; inactive history never becomes current work.
  for (const block of activeBlocks) {
    if (!taskById.has(block.taskId) || !intervalValid(block)) attention.push({ key: `planning:${block.id}`, title: taskById.get(block.taskId)?.title || 'Arbeitsblock ohne Aufgabe', kind: 'planning', reasons: ['unresolved'], detail: !taskById.has(block.taskId) ? 'Die verknüpfte Aufgabe fehlt. In der Agenda prüfen.' : 'Die Blockzeit ist ungültig.', time: Number.isFinite(instantEpoch(block.start)) ? instantEpoch(block.start) : Infinity, target: { kind: 'agenda', day: Number.isFinite(instantEpoch(block.start)) ? zonedDate(block.start, timeZone) : day } })
  }
  const today = selectPlanningToday({ ...input, day, horizon })
  // Surface conflicts on this day; do not turn unknown calendar coverage into a warning on every row.
  const conflicts = new Set(today.issues.filter(issue => issue.code === 'overlap').map(issue => issue.blockId))
  if (conflicts.size) attention.push({ key: `conflict:${day}`, title: 'Planzeiten überschneiden sich', kind: 'planning', reasons: ['conflict'], detail: 'Die Agenda zeigt die betroffenen Termine und Arbeitsblöcke.', time: nowMs, target: { kind: 'agenda', day } })
  attention.sort(compareAttention)
  const current = commitments.filter(item => instantEpoch(item.start) <= nowMs)
  const next = commitments.filter(item => instantEpoch(item.start) > nowMs)
  const suggestion = attention.find(item => item.kind === 'task' && !plannedTasks.has(item.task!.id) && !item.reasons.some(reason => reason === 'blocked' || reason === 'unresolved')) || null
  return { day, timeZone, now, current, next, attention, suggestion, todayTaskCount: today.openTaskCount,
    overlappingNow: current.some((item, index) => current.slice(index + 1).some(other => intervalsOverlap(item, other))) }
}

/** A failed read is never an empty plan and never repairs or replaces source data. */
export function readProductAttention(input: ProductAttentionInput) {
  try { return { overview: selectProductAttention(input), error: '' } }
  catch { return { overview: null, error: 'Deine Übersicht konnte nicht ausgewertet werden. Deine Einträge bleiben erhalten.' } }
}
