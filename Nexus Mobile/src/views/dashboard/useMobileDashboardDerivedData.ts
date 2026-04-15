import { useCallback, useMemo } from 'react'
import { computeTodayLayerSummary, createCaptureIntent, type CaptureIntentType } from '@nexus/core'

type Entity = Record<string, any>

export function useMobileDashboardDerivedData({
  notes,
  tasks,
  reminders,
  activities,
  codes,
  workspaces,
  activeWorkspaceId,
  setView,
  addNote,
  addTask,
  addRem,
  addCode,
  addCanvas,
  updateReminder,
}: {
  notes: Entity[]
  tasks: Entity[]
  reminders: Entity[]
  activities: Entity[]
  codes: Entity[]
  workspaces: Entity[]
  activeWorkspaceId?: string | null
  setView?: (v: string) => void
  addNote: () => void
  addTask: (title?: string, status?: string, desc?: string, prio?: string) => void
  addRem: (payload: { title: string; msg?: string; datetime: string; repeat?: string }) => void
  addCode: (name?: string, language?: string) => void
  addCanvas: (name?: string) => void
  updateReminder: (id: string, patch: Record<string, any>) => void
}) {
  const doneTasks = useMemo(() => tasks.filter((x) => x.status === 'done').length, [tasks])
  const openTasks = useMemo(() => tasks.filter((x) => x.status !== 'done').length, [tasks])
  const overdueReminders = useMemo(
    () => reminders.filter((x) => !x.done && new Date(x.datetime) < new Date()).length,
    [reminders],
  )
  const upcomingReminders = useMemo(
    () => reminders.filter((x) => !x.done).sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)).slice(0, 5),
    [reminders],
  )
  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)).slice(0, 5),
    [notes],
  )
  const recentActivity = useMemo(() => activities.slice(0, 7), [activities])
  const pinnedNotes = useMemo(() => notes.filter((n) => n.pinned).length, [notes])
  const now = useMemo(() => new Date(), [])
  const todaySummary = useMemo(
    () => computeTodayLayerSummary(tasks as any[], reminders as any[], now),
    [tasks, reminders, now],
  )
  const taskProgress = useMemo(
    () => (tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0),
    [doneTasks, tasks.length],
  )
  const greeting = useMemo(
    () => (now.getHours() < 12 ? 'Guten Morgen' : now.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'),
    [now],
  )

  const resumeLane = useMemo(() => {
    const lastNote = [...notes].sort((a, b) => +new Date(b.updated) - +new Date(a.updated))[0]
    const lastCode = [...codes].sort((a, b) => +new Date(b.updated) - +new Date(a.updated))[0]
    const nextReminder = reminders
      .filter((r) => !r.done)
      .sort((a, b) => +new Date(a.snoozeUntil || a.datetime) - +new Date(b.snoozeUntil || b.datetime))[0]
    return [
      lastNote ? { label: 'Note', title: lastNote.title || 'Untitled', action: () => setView?.('notes') } : null,
      lastCode ? { label: 'Code', title: lastCode.name, action: () => setView?.('code') } : null,
      nextReminder ? { label: 'Reminder', title: nextReminder.title, action: () => setView?.('reminders') } : null,
    ].filter((entry): entry is { label: string; title: string; action: () => void } => Boolean(entry))
  }, [codes, notes, reminders, setView])

  const runCaptureIntent = useCallback((intentType: CaptureIntentType) => {
    const intent = createCaptureIntent(intentType)
    switch (intent.type) {
      case 'note':
        addNote()
        setView?.(intent.targetView || 'notes')
        break
      case 'task':
        addTask(intent.title || 'Quick Task', 'todo', 'Erstellt via Quick Capture', 'mid')
        setView?.(intent.targetView || 'tasks')
        break
      case 'reminder':
        addRem({
          title: intent.title || 'Quick Reminder',
          msg: 'Erstellt via Quick Capture',
          datetime: new Date(Date.now() + 15 * 60_000).toISOString(),
          repeat: 'none',
        })
        setView?.(intent.targetView || 'reminders')
        break
      case 'code':
        addCode('quick-note.ts', 'typescript')
        setView?.(intent.targetView || 'code')
        break
      case 'canvas':
        addCanvas(intent.title || 'Quick Canvas')
        setView?.(intent.targetView || 'canvas')
        break
      default:
        break
    }
  }, [addCanvas, addCode, addNote, addRem, addTask, setView])

  const snoozeOverdue = useCallback((minutes: number) => {
    if (todaySummary.overdueReminderIds.length === 0) return
    const until = new Date(Date.now() + minutes * 60_000).toISOString()
    todaySummary.overdueReminderIds.forEach((reminderId) => {
      updateReminder(reminderId, { snoozeUntil: until })
    })
  }, [todaySummary.overdueReminderIds, updateReminder])

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) || null,
    [activeWorkspaceId, workspaces],
  )

  return {
    doneTasks,
    openTasks,
    overdueReminders,
    upcomingReminders,
    recentNotes,
    recentActivity,
    pinnedNotes,
    now,
    todaySummary,
    taskProgress,
    greeting,
    resumeLane,
    runCaptureIntent,
    snoozeOverdue,
    activeWorkspace,
  }
}
