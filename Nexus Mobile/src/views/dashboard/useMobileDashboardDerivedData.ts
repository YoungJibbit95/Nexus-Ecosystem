import { useCallback, useMemo } from 'react'
import { computeTodayLayerSummary, createCaptureIntent, type CaptureIntentType } from '@nexus/core'

type Entity = Record<string, any>

export type MobileDashboardResumeEntry = {
  label: "Note" | "Code" | "Task" | "Reminder" | "Canvas"
  title: string
  subtitle: string
  reason: string
  relevance: number
  action: () => void
}

export function useMobileDashboardDerivedData({
  notes,
  tasks,
  reminders,
  activities,
  codes,
  canvases,
  activeCanvasId,
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
  canvases: Entity[]
  activeCanvasId?: string | null
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
    const nowTs = Date.now()
    const priorityRank: Record<string, number> = {
      critical: 0,
      high: 1,
      mid: 2,
      low: 3,
    }
    const lastNote = [...notes].sort((a, b) => +new Date(b.updated) - +new Date(a.updated))[0]
    const lastCode = [...codes].sort((a, b) => +new Date(b.updated) - +new Date(a.updated))[0]
    const nextReminder = reminders
      .filter((r) => !r.done)
      .sort((a, b) => +new Date(a.snoozeUntil || a.datetime) - +new Date(b.snoozeUntil || b.datetime))[0]
    const focusTask = tasks
      .filter((task) => task.status !== 'done')
      .sort((a, b) => {
        const aDue = a.deadline ? +new Date(a.deadline) : Number.POSITIVE_INFINITY
        const bDue = b.deadline ? +new Date(b.deadline) : Number.POSITIVE_INFINITY
        const aOverdue = Number.isFinite(aDue) && aDue < nowTs
        const bOverdue = Number.isFinite(bDue) && bDue < nowTs
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
        const aPrio = priorityRank[a.priority] ?? 10
        const bPrio = priorityRank[b.priority] ?? 10
        if (aPrio !== bPrio) return aPrio - bPrio
        if (aDue !== bDue) return aDue - bDue
        return +new Date(b.updated || b.created || 0) - +new Date(a.updated || a.created || 0)
      })[0]
    const activeCanvas =
      canvases.find((canvas) => canvas.id === activeCanvasId)
      || [...canvases].sort((a, b) => +new Date(b.updated || b.created || 0) - +new Date(a.updated || a.created || 0))[0]

    const entries: MobileDashboardResumeEntry[] = [
      lastNote
        ? {
          label: 'Note',
          title: lastNote.title || 'Untitled',
          subtitle: `${new Date(lastNote.updated || lastNote.created).toLocaleString()}${lastNote.tags?.[0] ? ` · #${lastNote.tags[0]}` : ''}`,
          reason: 'Zuletzt bearbeitet',
          relevance: 60,
          action: () => setView?.('notes'),
        }
        : null,
      lastCode
        ? {
          label: 'Code',
          title: lastCode.name,
          subtitle: `${new Date(lastCode.updated || lastCode.created).toLocaleString()}${lastCode.lang ? ` · ${lastCode.lang}` : ''}`,
          reason: 'Letzte aktive Datei',
          relevance: 56,
          action: () => setView?.('code'),
        }
        : null,
      nextReminder
        ? {
          label: 'Reminder',
          title: nextReminder.title,
          subtitle: new Date(nextReminder.snoozeUntil || nextReminder.datetime).toLocaleString(),
          reason:
            +new Date(nextReminder.snoozeUntil || nextReminder.datetime) < nowTs
              ? 'Überfällig'
              : 'Als Nächstes fällig',
          relevance:
            +new Date(nextReminder.snoozeUntil || nextReminder.datetime) < nowTs
              ? 100
              : 78,
          action: () => setView?.('reminders'),
        }
        : null,
      focusTask
        ? {
          label: 'Task',
          title: focusTask.title,
          subtitle:
            focusTask.deadline
              ? `Deadline ${new Date(focusTask.deadline).toLocaleDateString()}`
              : `Priorität ${focusTask.priority || 'mid'}`,
          reason:
            focusTask.deadline && +new Date(focusTask.deadline) < nowTs
              ? 'Überfällig priorisiert'
              : 'Nächster Fokus-Task',
          relevance:
            focusTask.deadline && +new Date(focusTask.deadline) < nowTs
              ? 94
              : 72 - (priorityRank[focusTask.priority] ?? 2) * 4,
          action: () => setView?.('tasks'),
        }
        : null,
      activeCanvas
        ? {
          label: 'Canvas',
          title: activeCanvas.name || 'Canvas',
          subtitle: `${activeCanvas.nodes?.length || 0} Nodes · ${new Date(activeCanvas.updated || activeCanvas.created).toLocaleString()}`,
          reason: 'Letzter visueller Kontext',
          relevance: 50,
          action: () => setView?.('canvas'),
        }
        : null,
    ].filter((entry): entry is MobileDashboardResumeEntry => Boolean(entry))

    return entries.sort((a, b) => b.relevance - a.relevance).slice(0, 5)
  }, [activeCanvasId, canvases, codes, notes, reminders, setView, tasks])

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
