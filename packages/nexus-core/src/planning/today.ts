import { civilDeadlineInterval, instantEpoch, intervalContains, intervalsOverlap, planningIssues, zonedDate, type PlanningDocument, type TaskRecord } from './domain'

export type TodayReminder = { id: string; title: string; datetime: string; snoozeUntil?: string; done: boolean; linkedTaskId?: string }
export function selectPlanningToday(input: { tasks: TaskRecord[]; planning: PlanningDocument; reminders: TodayReminder[]; day: string; timeZone: string; horizon: { start: string; end: string }; now: string }) {
  const { tasks, planning, reminders, day, timeZone, horizon, now } = input
  const blocks = planning.blocks.filter(block => intervalsOverlap(block, horizon))
  const events = planning.events.filter(event => intervalsOverlap(event, horizon))
  const points = reminders.filter(reminder => {
    const time = reminder.snoozeUntil || reminder.datetime
    return !reminder.done && Number.isFinite(instantEpoch(time)) && (zonedDate(time, timeZone) === day || instantEpoch(time) < instantEpoch(now))
  }).map(reminder => ({ ...reminder, kind: 'reminder' as const, overdue: instantEpoch(reminder.snoozeUntil || reminder.datetime) < instantEpoch(now), occurrenceId: `${reminder.id}@${reminder.snoozeUntil || reminder.datetime}` }))
  const due = (task: TaskRecord) => {
    if (!task.deadline) return false
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) {
      const civil = civilDeadlineInterval(task)
      return civil ? intervalsOverlap(civil, horizon) || instantEpoch(now) >= instantEpoch(civil.end) : task.deadline <= day
    }
    return Number.isFinite(instantEpoch(task.deadline)) && (zonedDate(task.deadline, timeZone) === day || instantEpoch(task.deadline) < instantEpoch(now))
  }
  const overdue = (task: TaskRecord) => {
    if (!task.deadline) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) return Number.isFinite(instantEpoch(task.deadline)) && instantEpoch(task.deadline) < instantEpoch(now)
    const civil = civilDeadlineInterval(task)
    return civil ? instantEpoch(now) >= instantEpoch(civil.end) : task.deadline < day
  }
  const dueOnDay = (task: TaskRecord) => {
    if (!task.deadline) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.deadline)) return Number.isFinite(instantEpoch(task.deadline)) && zonedDate(task.deadline, timeZone) === day
    const civil = civilDeadlineInterval(task)
    return civil ? intervalsOverlap(civil, horizon) : task.deadline === day
  }
  const taskItems = tasks.filter(task => task.status !== 'done' && (due(task) || blocks.some(block => block.taskId === task.id && block.state === 'active'))).map(task => {
    const scheduled = blocks.filter(block => block.taskId === task.id && block.state === 'active')
    return { task, reasons: [...(dueOnDay(task) ? ['Frist heute'] : []), ...(overdue(task) ? ['überfällige Frist'] : []), ...(task.deadline && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline) && !civilDeadlineInterval(task) ? ['Frist-Zeitzone / Datum ungeklärt'] : []), ...(scheduled.length ? ['Arbeitsblock heute'] : [])], scheduled, durationMinutes: task.durationMinutes ?? (Object.prototype.hasOwnProperty.call(planning.durations, task.id) ? planning.durations[task.id] : undefined), blocked: Boolean(task.blocked || (task.dependsOnTaskIds || []).some(id => tasks.find(dependency => dependency.id === id)?.status !== 'done')) }
  })
  const unresolved = planning.blocks.filter(block => !tasks.some(task => task.id === block.taskId))
  const issues = [...blocks.filter(block => block.state === 'active').flatMap(block => planningIssues({ tasks, planning }, block, block.timeZone, tasks.find(task => task.id === block.taskId), block.id).map(issue => ({ ...issue, blockId: block.id }))), ...events.flatMap(event => planningIssues({ tasks, planning }, event, event.timeZone, undefined, event.id).filter(issue => issue.code === 'overlap').map(issue => ({ ...issue, blockId: event.id })))]
  return { tasks: taskItems, events, blocks, reminderPoints: points, unresolvedBlocks: unresolved, issues, coverage: planning.availability?.coverage === 'complete' && intervalContains(planning.availability.horizon, horizon) ? 'complete' : 'unknown', openTaskCount: taskItems.length, dueTaskCount: taskItems.filter(item => dueOnDay(item.task)).length, overdueTaskCount: taskItems.filter(item => overdue(item.task)).length, commitmentCount: events.length + blocks.filter(block => block.state === 'active').length, reminderCount: new Set(points.map(point => point.occurrenceId)).size, dueReminderCount: points.filter(point => zonedDate(point.snoozeUntil || point.datetime, timeZone) === day).length }
}
