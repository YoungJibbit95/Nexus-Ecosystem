import { useCallback, useMemo } from 'react'
import { Activity, Bell, CheckSquare, Code, FileText, Zap } from 'lucide-react'

type Entity = Record<string, any>
type Input = { notes: Entity[]; tasks: Entity[]; reminders: Entity[]; activities: Entity[]; accent: string; accent2: string }
// Kept solely for existing user widgets. Product orientation has one canonical projection.
function dailySeries(entries: Entity[]) {
  const dates = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - 6 + index); return date.toLocaleDateString() })
  const counts = new Map(dates.map(day => [day, 0]))
  for (const entry of entries) { const day = new Date(entry.updated || entry.created).toLocaleDateString(); if (counts.has(day)) counts.set(day, counts.get(day)! + 1) }
  return dates.map(day => counts.get(day)!)
}
export function useDashboardDerivedData({ notes, tasks, reminders, activities, accent, accent2 }: Input) {
  const doneTasks = useMemo(() => tasks.filter(task => task.status === 'done').length, [tasks])
  const pendingTasks = tasks.length - doneTasks
  const overdueReminders = reminders.filter(reminder => !reminder.done && new Date(reminder.snoozeUntil || reminder.datetime).getTime() < Date.now()).length
  const pinnedNotes = useMemo(() => notes.filter(note => note.pinned).length, [notes])
  const recentActivity = useMemo(() => activities.slice(0, 8), [activities])
  const recentNotes = useMemo(() => [...notes].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()).slice(0, 4), [notes])
  const urgentReminders = useMemo(() => reminders.filter(reminder => !reminder.done).sort((a, b) => new Date(a.snoozeUntil || a.datetime).getTime() - new Date(b.snoozeUntil || b.datetime).getTime()).slice(0, 4), [reminders])
  const noteSpark = useMemo(() => dailySeries(notes), [notes])
  const taskSpark = useMemo(() => dailySeries(tasks.filter(task => task.status === 'done')), [tasks])
  const tasksByStatus = useMemo(() => { const counts: Record<string, number> = {}; tasks.forEach(task => { counts[task.status] = (counts[task.status] || 0) + 1 }); return counts }, [tasks])
  const actIcon = useCallback((type: string) => ({ note: FileText, code: Code, task: CheckSquare, reminder: Bell, system: Zap })[type] || Activity, [])
  const actColor = useCallback((type: string) => type === 'system' ? accent2 : accent, [accent, accent2])
  return { doneTasks, pendingTasks, overdueReminders, pinnedNotes, recentActivity, recentNotes, urgentReminders, noteSpark, taskSpark, tasksByStatus, actIcon, actColor }
}
