import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CheckSquare,
  Clock,
  Code,
  FileText,
  Package,
  Plus,
  Search,
  Zap,
} from 'lucide-react'
import { shallow } from 'zustand/shallow'
import { Glass } from '../components/Glass'
import { useApp, Activity } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'

type FluxFilter = Activity['type'] | 'all'
type OpsPreset = 'all' | 'overdue' | 'due-soon' | 'high-priority' | 'focus' | 'reminder-triage' | 'task-backlog'
type QueueItem = {
  id: string
  type: 'task' | 'reminder'
  targetId: string
  title: string
  detail: string
  severity: number
  dueTs: number
  overdue: boolean
  dueSoon: boolean
  highPriority: boolean
  focusCandidate: boolean
  backlogCandidate: boolean
  color: string
  openLabel: string
  open: () => void
  resolveLabel: string
  resolve: () => void
}
type BottleneckItem = {
  id: string
  title: string
  detail: string
  severity: number
  color: string
  actionLabel: string
  action: () => void
}

const TYPE_META: Record<Activity['type'], { icon: any; color: string; label: string }> = {
  note: { icon: FileText, color: '#0A84FF', label: 'Notes' },
  code: { icon: Code, color: '#BF5AF2', label: 'Code' },
  task: { icon: CheckSquare, color: '#FF9F0A', label: 'Tasks' },
  reminder: { icon: Bell, color: '#FF453A', label: 'Reminders' },
  system: { icon: Package, color: '#34C759', label: 'System' },
}

const PRIORITY_WEIGHT: Record<string, number> = { low: 1, mid: 2, high: 3 }
const FILTER_OPTIONS: FluxFilter[] = ['all', 'note', 'code', 'task', 'reminder']
const QUEUE_FILTERS: Array<'all' | 'task' | 'reminder'> = ['all', 'task', 'reminder']
const PRESET_META: Record<OpsPreset, { label: string; detail: string }> = {
  all: { label: 'All', detail: 'Gesamte Queue' },
  overdue: { label: 'Overdue', detail: 'Überfällige Items' },
  'due-soon': { label: 'Due Soon', detail: 'Nächste 24h' },
  'high-priority': { label: 'High Priority', detail: 'Kritische Priorität' },
  focus: { label: 'Focus', detail: 'Nur Fokus-relevante Arbeit' },
  'reminder-triage': { label: 'Reminder Triage', detail: 'Reminder zuerst abarbeiten' },
  'task-backlog': { label: 'Task Backlog', detail: 'Nur offene Backlog-Tasks' },
}

const computeTaskSeverity = (task: { priority: string; status: string; deadline?: string }, nowTs: number) => {
  const deadlineTs = parseTs(task.deadline)
  const overdue = Number.isFinite(deadlineTs) && deadlineTs < nowTs
  const baseSeverity = PRIORITY_WEIGHT[task.priority] ?? 1
  const statusBoost = task.status === 'doing' ? 1 : 0
  const deadlineBoost = overdue ? 2 : 0
  return baseSeverity + statusBoost + deadlineBoost
}

const parseTs = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY
}

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

const formatDue = (ts: number) => {
  if (!Number.isFinite(ts)) return 'ohne Deadline'
  return new Date(ts).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function FluxView({ setView }: { setView?: (view: string) => void } = {}) {
  const t = useTheme()
  const accentRgb = hexToRgb(t.accent)
  const {
    activities,
    notes,
    codes,
    tasks,
    reminders,
    addNote,
    addCode,
    addTask,
    addRem,
    moveTask,
    doneRem,
    openNote,
    setNote,
    openCode,
    setCode,
  } = useApp(
    (s) => ({
      activities: s.activities,
      notes: s.notes,
      codes: s.codes,
      tasks: s.tasks,
      reminders: s.reminders,
      addNote: s.addNote,
      addCode: s.addCode,
      addTask: s.addTask,
      addRem: s.addRem,
      moveTask: s.moveTask,
      doneRem: s.doneRem,
      openNote: s.openNote,
      setNote: s.setNote,
      openCode: s.openCode,
      setCode: s.setCode,
    }),
    shallow,
  )

  const [filter, setFilter] = useState<FluxFilter>('all')
  const [query, setQuery] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [queueSort, setQueueSort] = useState<'severity' | 'time'>('severity')
  const [queueFilter, setQueueFilter] = useState<'all' | 'task' | 'reminder'>('all')
  const [preset, setPreset] = useState<OpsPreset>('all')
  const searchRef = useRef<HTMLInputElement>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 15_000)
    return () => window.clearInterval(intervalId)
  }, [])

  const openTasksView = useCallback(() => {
    setView?.('tasks')
  }, [setView])
  const openRemindersView = useCallback(() => {
    setView?.('reminders')
  }, [setView])
  const openNoteById = useCallback((noteId?: string) => {
    if (!noteId) return
    openNote(noteId)
    setNote(noteId)
    setView?.('notes')
  }, [openNote, setNote, setView])
  const openCodeById = useCallback((codeId?: string) => {
    if (!codeId) return
    openCode(codeId)
    setCode(codeId)
    setView?.('code')
  }, [openCode, setCode, setView])
  const openActivityTarget = useCallback((entry: Activity) => {
    if (entry.targetView === 'notes') {
      if (entry.targetId) {
        openNoteById(entry.targetId)
        return
      }
      const byName = notes.find((note) => note.title === entry.targetName)
      if (byName) {
        openNoteById(byName.id)
        return
      }
    }
    if (entry.targetView === 'code') {
      if (entry.targetId) {
        openCodeById(entry.targetId)
        return
      }
      const byName = codes.find((code) => code.name === entry.targetName)
      if (byName) {
        openCodeById(byName.id)
        return
      }
    }
    if (entry.targetView === 'tasks' || entry.type === 'task') {
      openTasksView()
      return
    }
    if (entry.targetView === 'reminders' || entry.type === 'reminder') {
      openRemindersView()
      return
    }
    if (entry.targetView) {
      setView?.(entry.targetView)
    }
  }, [codes, notes, openCodeById, openNoteById, openRemindersView, openTasksView, setView])

  const runQuickAction = useCallback((action: 'note' | 'code' | 'task' | 'reminder') => {
    if (action === 'note') {
      addNote()
      return
    }
    if (action === 'code') {
      addCode('scratch.ts', 'typescript')
      return
    }
    if (action === 'task') {
      addTask('Neue Aufgabe', 'todo', 'Aus Flux erstellt', 'mid')
      return
    }
    const now = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    addRem({ title: 'Neuer Reminder', msg: 'Aus Flux erstellt', datetime: now, repeat: 'none' })
  }, [addCode, addNote, addRem, addTask])

  const startTopPriorityTasks = useCallback(() => {
    const nowTs = Date.now()
    const nextTodoTasks = tasks
      .filter((task) => task.status === 'todo')
      .slice()
      .sort((a, b) => {
        const aSeverity = computeTaskSeverity(a, nowTs)
        const bSeverity = computeTaskSeverity(b, nowTs)
        if (bSeverity !== aSeverity) return bSeverity - aSeverity
        return parseTs(a.deadline) - parseTs(b.deadline)
      })
      .slice(0, 3)

    nextTodoTasks.forEach((task) => moveTask(task.id, 'doing'))
  }, [moveTask, tasks])

  const resolveUrgentNow = useCallback(() => {
    const nowTs = Date.now()

    const urgentTasks = tasks
      .filter((task) => task.status !== 'done')
      .slice()
      .sort((a, b) => {
        const aSeverity = computeTaskSeverity(a, nowTs)
        const bSeverity = computeTaskSeverity(b, nowTs)
        if (bSeverity !== aSeverity) return bSeverity - aSeverity
        return parseTs(a.deadline) - parseTs(b.deadline)
      })
      .slice(0, 2)

    urgentTasks.forEach((task) => moveTask(task.id, task.status === 'todo' ? 'doing' : 'done'))

    reminders
      .filter((reminder) => !reminder.done && parseTs(reminder.snoozeUntil || reminder.datetime) <= nowTs)
      .slice(0, 2)
      .forEach((reminder) => doneRem(reminder.id))
  }, [doneRem, moveTask, reminders, tasks])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()

      if (cmd && k === 'f') {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }

      if (isEditableTarget(e.target)) {
        return
      }

      if (cmd && e.shiftKey) {
        if (k === 'n') {
          e.preventDefault()
          runQuickAction('note')
          return
        }
        if (k === 'c') {
          e.preventDefault()
          runQuickAction('code')
          return
        }
        if (k === 't') {
          e.preventDefault()
          runQuickAction('task')
          return
        }
        if (k === 'r') {
          e.preventDefault()
          runQuickAction('reminder')
          return
        }
        if (k === 'd') {
          e.preventDefault()
          resolveUrgentNow()
          return
        }
        if (k === 'b') {
          e.preventDefault()
          startTopPriorityTasks()
          return
        }
      }

      if (e.key === '1') {
        e.preventDefault()
        setFilter('note')
        return
      }
      if (e.key === '2') {
        e.preventDefault()
        setFilter('code')
        return
      }
      if (e.key === '3') {
        e.preventDefault()
        setFilter('task')
        return
      }
      if (e.key === '4') {
        e.preventDefault()
        setFilter('reminder')
        return
      }
      if (e.key === '0') {
        e.preventDefault()
        setFilter('all')
        return
      }
      if (!cmd && !e.shiftKey && k === 'f') {
        e.preventDefault()
        setFocusMode((prev) => !prev)
        return
      }
      if (e.key === 'Escape') {
        setQuery('')
        setFilter('all')
        setFocusMode(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [resolveUrgentNow, runQuickAction, startTopPriorityTasks])

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query])
  const matchesQuery = useCallback((...parts: Array<string | undefined>) => {
    if (!normalizedQuery) return true
    return parts.some((part) => String(part || '').toLowerCase().includes(normalizedQuery))
  }, [normalizedQuery])

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks])

  const dueReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.done && parseTs(reminder.snoozeUntil || reminder.datetime) <= nowTs),
    [nowTs, reminders],
  )

  const dueNext24h = useMemo(() => {
    const upperTs = nowTs + 24 * 60 * 60 * 1000
    return reminders.filter((reminder) => {
      if (reminder.done) return false
      const dueTs = parseTs(reminder.snoozeUntil || reminder.datetime)
      return dueTs <= upperTs
    }).length
  }, [nowTs, reminders])

  const activityLast24h = useMemo(() => {
    const cutoff = nowTs - 24 * 60 * 60 * 1000
    return activities.filter((entry) => parseTs(entry.timestamp) >= cutoff).length
  }, [activities, nowTs])

  const lastActivityAgeMinutes = useMemo(() => {
    if (!activities.length) return null
    const latestTs = activities.reduce((maxTs, entry) => Math.max(maxTs, parseTs(entry.timestamp)), 0)
    if (!Number.isFinite(latestTs) || latestTs <= 0) return null
    return Math.max(0, Math.round((nowTs - latestTs) / 60000))
  }, [activities, nowTs])

  const overdueRemindersCount = useMemo(
    () => reminders.filter((reminder) => !reminder.done && parseTs(reminder.snoozeUntil || reminder.datetime) < nowTs).length,
    [nowTs, reminders],
  )
  const blockedTaskCount = useMemo(
    () => pendingTasks.filter((task) => Boolean(task.blocked)).length,
    [pendingTasks],
  )

  const bottlenecks = useMemo<BottleneckItem[]>(() => {
    const taskIssues = pendingTasks
      .slice()
      .sort((a, b) => {
        const aSeverity = computeTaskSeverity(a, nowTs)
        const bSeverity = computeTaskSeverity(b, nowTs)
        if (bSeverity !== aSeverity) return bSeverity - aSeverity
        if (Boolean(b.blocked) !== Boolean(a.blocked)) return Number(Boolean(b.blocked)) - Number(Boolean(a.blocked))
        return parseTs(a.deadline) - parseTs(b.deadline)
      })
      .slice(0, 3)
      .map((task) => {
        const severity = computeTaskSeverity(task, nowTs) + (task.blocked ? 2 : 0)
        return {
          id: `task-${task.id}`,
          title: task.title,
          detail: `Task · ${task.priority.toUpperCase()} · ${task.status}${task.blocked ? ' · blocked' : ''}`,
          color: TYPE_META.task.color,
          severity,
          actionLabel: 'Open Task Board',
          action: openTasksView,
        }
      })

    const reminderIssues = reminders
      .filter((reminder) => !reminder.done)
      .slice()
      .sort((a, b) => parseTs(a.snoozeUntil || a.datetime) - parseTs(b.snoozeUntil || b.datetime))
      .slice(0, 3)
      .map((reminder) => {
        const dueTs = parseTs(reminder.snoozeUntil || reminder.datetime)
        const overdue = dueTs < nowTs
        return {
          id: `rem-${reminder.id}`,
          title: reminder.title,
          detail: `Reminder · ${overdue ? 'überfällig' : 'fällig'} ${formatDue(dueTs)}`,
          color: TYPE_META.reminder.color,
          severity: overdue ? 5 : 3,
          actionLabel: 'Open Reminders',
          action: openRemindersView,
        }
      })

    return [...taskIssues, ...reminderIssues]
      .filter((entry) => matchesQuery(entry.title, entry.detail))
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 6)
  }, [matchesQuery, nowTs, openRemindersView, openTasksView, pendingTasks, reminders])

  const opsSignal = useMemo(() => {
    const openTaskPenalty = Math.min(28, pendingTasks.length * 1.8)
    const overduePenalty = Math.min(36, overdueRemindersCount * 9)
    const blockedPenalty = Math.min(22, blockedTaskCount * 6)
    const dueSoonPenalty = Math.min(14, dueNext24h * 1.2)
    const stalePenalty = lastActivityAgeMinutes != null && lastActivityAgeMinutes > 240
      ? Math.min(12, Math.round((lastActivityAgeMinutes - 240) / 30))
      : 0
    const activityBonus = Math.min(14, Math.round(activityLast24h * 0.7))
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - openTaskPenalty - overduePenalty - blockedPenalty - dueSoonPenalty - stalePenalty + activityBonus),
      ),
    )
    const label = score >= 78 ? 'Healthy' : score >= 56 ? 'Watch' : 'Critical'
    const summary =
      label === 'Healthy'
        ? 'Queue ist stabil, nur leichte Priorisierung nötig.'
        : label === 'Watch'
          ? 'Es gibt aktive Engpässe. Triage der Queue empfohlen.'
          : 'Kritischer Ops-Druck: zuerst überfällige Reminder und blockierte Tasks lösen.'
    return { score, label, summary }
  }, [activityLast24h, blockedTaskCount, dueNext24h, lastActivityAgeMinutes, overdueRemindersCount, pendingTasks.length])

  const queueItems = useMemo<QueueItem[]>(() => {
    const taskQueue: QueueItem[] = pendingTasks.map((task) => {
      const deadlineTs = parseTs(task.deadline)
      const severity = computeTaskSeverity(task, nowTs)
      const overdue = Number.isFinite(deadlineTs) && deadlineTs < nowTs
      const dueSoon = Number.isFinite(deadlineTs) && deadlineTs <= nowTs + 24 * 60 * 60 * 1000

      return {
        id: `task-${task.id}`,
        targetId: task.id,
        type: 'task',
        title: task.title,
        detail: `Task · ${task.priority.toUpperCase()} · ${task.status} · ${formatDue(deadlineTs)}${task.blocked ? ' · blocked' : ''}`,
        severity,
        dueTs: deadlineTs,
        overdue,
        dueSoon,
        highPriority: task.priority === 'high' || severity >= 4,
        focusCandidate: task.status === 'doing' || (task.tags || []).includes('focus'),
        backlogCandidate: task.status === 'todo',
        color: TYPE_META.task.color,
        openLabel: 'Open',
        open: openTasksView,
        resolveLabel: task.status === 'todo' ? 'Start' : 'Done',
        resolve: () => moveTask(task.id, task.status === 'todo' ? 'doing' : 'done'),
      }
    })

    const reminderQueue: QueueItem[] = reminders
      .filter((reminder) => !reminder.done)
      .map((reminder) => {
        const dueTs = parseTs(reminder.snoozeUntil || reminder.datetime)
        const overdue = dueTs < nowTs
        const severity = overdue ? 4 : 2
        const dueSoon = dueTs <= nowTs + 24 * 60 * 60 * 1000
        return {
          id: `rem-${reminder.id}`,
          targetId: reminder.id,
          type: 'reminder',
          title: reminder.title,
          detail: `Reminder · ${overdue ? 'überfällig' : 'geplant'} · ${formatDue(dueTs)}`,
          severity,
          dueTs,
          overdue,
          dueSoon,
          highPriority: overdue,
          focusCandidate: overdue || dueSoon,
          backlogCandidate: false,
          color: TYPE_META.reminder.color,
          openLabel: 'Open',
          open: openRemindersView,
          resolveLabel: 'Done',
          resolve: () => doneRem(reminder.id),
        }
      })

    let merged = [...taskQueue, ...reminderQueue]
    const effectiveFilter =
      preset === 'reminder-triage' ? 'reminder' : preset === 'task-backlog' ? 'task' : queueFilter
    if (effectiveFilter !== 'all') {
      merged = merged.filter((item) => item.type === effectiveFilter)
    }
    const effectiveFocus = focusMode || preset === 'focus'
    if (effectiveFocus) {
      merged = merged.filter((item) => item.severity >= 3 || item.focusCandidate)
    }
    if (preset === 'overdue') {
      merged = merged.filter((item) => item.overdue)
    } else if (preset === 'due-soon') {
      merged = merged.filter((item) => item.dueSoon)
    } else if (preset === 'high-priority') {
      merged = merged.filter((item) => item.highPriority)
    } else if (preset === 'task-backlog') {
      merged = merged.filter((item) => item.type === 'task' && item.backlogCandidate)
    } else if (preset === 'reminder-triage') {
      merged = merged.filter((item) => item.type === 'reminder')
    }
    if (normalizedQuery) {
      merged = merged.filter((item) => matchesQuery(item.title, item.detail, item.type))
    }

    merged.sort((a, b) => {
      if (queueSort === 'time') {
        if (a.dueTs !== b.dueTs) return a.dueTs - b.dueTs
        return b.severity - a.severity
      }
      if (b.severity !== a.severity) return b.severity - a.severity
      return a.dueTs - b.dueTs
    })

    return merged.slice(0, effectiveFocus ? 14 : 10)
  }, [doneRem, focusMode, matchesQuery, moveTask, normalizedQuery, nowTs, openRemindersView, openTasksView, pendingTasks, preset, queueFilter, queueSort, reminders])

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activities
      .filter((entry) => {
        if (filter !== 'all' && entry.type !== filter) return false
        if (preset === 'reminder-triage' && entry.type !== 'reminder') return false
        if (preset === 'task-backlog' && entry.type !== 'task') return false
        if ((preset === 'overdue' || preset === 'due-soon') && !['task', 'reminder'].includes(entry.type)) return false
        if ((preset === 'high-priority' || preset === 'focus') && entry.type !== 'task') return false
        if (!q) return true
        return (
          entry.targetName.toLowerCase().includes(q) ||
          entry.action.toLowerCase().includes(q) ||
          entry.type.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => parseTs(b.timestamp) - parseTs(a.timestamp))
  }, [activities, filter, preset, query])

  const activePresetMeta = PRESET_META[preset]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', padding: 14, minHeight: 0 }}>
      <Glass style={{ padding: '14px 16px', flexShrink: 0 }} glow>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 900 }}>
              <Zap size={18} style={{ color: t.accent }} />
              Flux Ops
            </div>
            <div style={{ fontSize: 11, opacity: 0.62 }}>Action Queue + Bottlenecks + Activity Stream mit Keyboard-Workflow</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {[
                'Ctrl+F Search',
                'Ctrl+Shift+N/C/T/R Quick Create',
                'Ctrl+Shift+D Resolve Urgent',
                'Ctrl+Shift+B Start Backlog',
                '1-4 Filter',
                'F Focus Mode',
              ].map((hint) => (
                <span
                  key={hint}
                  style={{
                    fontSize: 10,
                    padding: '3px 7px',
                    borderRadius: 999,
                    border: `1px solid rgba(${accentRgb},0.32)`,
                    background: `rgba(${accentRgb},0.12)`,
                    color: t.accent,
                  }}
                >
                  {hint}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button onClick={() => runQuickAction('note')} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+ Note</button>
            <button onClick={() => runQuickAction('code')} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+ Code</button>
            <button onClick={() => runQuickAction('task')} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+ Task</button>
            <button onClick={() => runQuickAction('reminder')} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid rgba(${accentRgb},0.36)`, background: `rgba(${accentRgb},0.14)`, color: t.accent, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              <Plus size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />Reminder
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {(Object.keys(PRESET_META) as OpsPreset[]).map((presetId) => {
            const meta = PRESET_META[presetId]
            const active = preset === presetId
            return (
              <button
                key={presetId}
                onClick={() => setPreset(presetId)}
                title={meta.detail}
                style={{
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: `1px solid ${active ? `rgba(${accentRgb},0.42)` : 'rgba(255,255,255,0.14)'}`,
                  background: active ? `rgba(${accentRgb},0.2)` : 'rgba(255,255,255,0.04)',
                  color: active ? t.accent : 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: 0.2,
                }}
              >
                {meta.label}
              </button>
            )
          })}
        </div>
      </Glass>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(132px,1fr))', gap: 8, flexShrink: 0 }}>
        {[
          {
            label: `Ops Score · ${opsSignal.label}`,
            value: `${opsSignal.score}%`,
            color: opsSignal.score < 55 ? '#FF453A' : opsSignal.score < 75 ? '#FF9F0A' : '#34C759',
          },
          { label: 'Notes', value: notes.length, color: TYPE_META.note.color },
          { label: 'Code Files', value: codes.length, color: TYPE_META.code.color },
          { label: 'Open Tasks', value: pendingTasks.length, color: TYPE_META.task.color },
          { label: 'Due Reminders', value: dueReminders.length, color: TYPE_META.reminder.color },
          { label: 'Due <=24h', value: dueNext24h, color: '#FFD60A' },
          { label: 'Activity 24h', value: activityLast24h, color: '#64D2FF' },
          {
            label: 'Last Activity',
            value: lastActivityAgeMinutes == null ? '—' : `${lastActivityAgeMinutes}m`,
            color: lastActivityAgeMinutes != null && lastActivityAgeMinutes > 180 ? '#FF453A' : '#30D158',
          },
        ].map((metric) => (
          <Glass key={metric.label} style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 10, opacity: 0.58, textTransform: 'uppercase', letterSpacing: 0.6 }}>{metric.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: metric.color, lineHeight: 1.1 }}>{metric.value}</div>
          </Glass>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, flex: 1, minHeight: 0 }}>
        <Glass style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Action Queue</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setQueueSort('severity')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: queueSort === 'severity' ? `rgba(${accentRgb},0.16)` : 'rgba(255,255,255,0.04)',
                  color: queueSort === 'severity' ? t.accent : 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Severity
              </button>
              <button
                onClick={() => setQueueSort('time')}
                style={{
                  padding: '4px 8px',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: queueSort === 'time' ? `rgba(${accentRgb},0.16)` : 'rgba(255,255,255,0.04)',
                  color: queueSort === 'time' ? t.accent : 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Time
              </button>
            </div>
          </div>
          <div
            style={{
              marginBottom: 8,
              fontSize: 10,
              opacity: 0.72,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '6px 8px',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <span style={{ fontWeight: 700, marginRight: 6 }}>{activePresetMeta.label}</span>
            <span>{activePresetMeta.detail}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {QUEUE_FILTERS.map((type) => (
              <button
                key={type}
                onClick={() => setQueueFilter(type)}
                style={{
                  padding: '4px 8px',
                  borderRadius: 7,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: queueFilter === type ? `rgba(${accentRgb},0.16)` : 'rgba(255,255,255,0.04)',
                  color: queueFilter === type ? t.accent : 'inherit',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={() => setFocusMode((prev) => !prev)}
            style={{
              marginBottom: 10,
              width: '100%',
              padding: '7px 9px',
              borderRadius: 8,
              border: `1px solid ${focusMode ? 'rgba(255,69,58,0.4)' : 'rgba(255,255,255,0.12)'}`,
              background: focusMode ? 'rgba(255,69,58,0.14)' : 'rgba(255,255,255,0.04)',
              color: focusMode ? '#ff8f88' : 'inherit',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {focusMode || preset === 'focus'
              ? 'Focus Mode aktiv (nur kritische Items)'
              : 'Focus Mode aus'}
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            <button
              onClick={resolveUrgentNow}
              style={{
                padding: '7px 9px',
                borderRadius: 8,
                border: '1px solid rgba(255,69,58,0.34)',
                background: 'rgba(255,69,58,0.16)',
                color: '#ffb4ad',
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
              title="Cmd/Ctrl+Shift+D"
            >
              Resolve Urgent
            </button>
            <button
              onClick={startTopPriorityTasks}
              style={{
                padding: '7px 9px',
                borderRadius: 8,
                border: `1px solid rgba(${accentRgb},0.34)`,
                background: `rgba(${accentRgb},0.16)`,
                color: t.accent,
                fontSize: 10,
                fontWeight: 800,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
              title="Cmd/Ctrl+Shift+B"
            >
              Start Backlog
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto' }}>
            {queueItems.length === 0 && (
              <div style={{ fontSize: 11, opacity: 0.6, padding: '10px 8px' }}>
                Keine offenen Queue-Items.
              </div>
            )}
            {queueItems.map((item) => {
              const overdue = Number.isFinite(item.dueTs) && item.dueTs < nowTs
              return (
                <div key={item.id} style={{ padding: '9px 10px', borderRadius: 9, border: `1px solid ${item.color}33`, background: `${item.color}14` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: 10, opacity: 0.72, lineHeight: 1.4 }}>{item.detail}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
                      <button
                        onClick={item.open}
                        style={{
                          padding: '4px 7px',
                          borderRadius: 7,
                          border: '1px solid rgba(255,255,255,0.18)',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'inherit',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ArrowRight size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {item.openLabel}
                      </button>
                      <button
                        onClick={item.resolve}
                        style={{
                          padding: '4px 7px',
                          borderRadius: 7,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: overdue ? 'rgba(255,69,58,0.2)' : 'rgba(255,255,255,0.1)',
                          color: 'inherit',
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.resolveLabel}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 7 }}>Bottlenecks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bottlenecks.length === 0 && (
                <div style={{ fontSize: 11, opacity: 0.58, padding: '6px 2px' }}>Keine akuten Bottlenecks erkannt.</div>
              )}
              {bottlenecks.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    padding: '7px 8px',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, opacity: 0.9 }}>
                      <AlertTriangle size={12} style={{ color: entry.color, flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</span>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.62, marginTop: 2 }}>{entry.detail}</div>
                  </div>
                  <button
                    onClick={entry.action}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 7,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'inherit',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {entry.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Glass>

        <Glass style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }} glow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Activity Stream</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {FILTER_OPTIONS.map((type, index) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: filter === type ? `rgba(${accentRgb},0.15)` : 'rgba(255,255,255,0.04)',
                    color: filter === type ? t.accent : 'inherit',
                    cursor: 'pointer',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                  title={index > 0 ? `Shortcut ${index}` : 'Shortcut 0'}
                >
                  {type}
                </button>
              ))}
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.55 }} />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Suchen"
                  style={{
                    width: 160,
                    padding: '5px 8px 5px 26px',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'inherit',
                    fontSize: 11,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {filteredActivities.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.42, fontSize: 12, gap: 8 }}>
                <ActivityIcon size={16} /> Keine Aktivitäten für den aktuellen Filter.
              </div>
            )}
            {filteredActivities.map((entry) => {
              const meta = TYPE_META[entry.type] || TYPE_META.system
              const Icon = meta.icon
              const canOpen =
                Boolean(entry.targetView) ||
                Boolean(entry.targetId) ||
                entry.type === 'task' ||
                entry.type === 'reminder'
              return (
                <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 10px', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 7, background: `${meta.color}18`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.targetName}</div>
                        <div style={{ fontSize: 10, opacity: 0.62 }}>{meta.label} · {entry.action}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.55, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Clock size={11} />
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {canOpen && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        onClick={() => openActivityTarget(entry)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 7,
                          border: `1px solid rgba(${accentRgb},0.28)`,
                          background: `rgba(${accentRgb},0.12)`,
                          color: t.accent,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Open Context
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 10, fontSize: 10, opacity: 0.65, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2
              size={12}
              style={{ color: opsSignal.label === 'Healthy' ? '#34C759' : opsSignal.label === 'Watch' ? '#FF9F0A' : '#FF453A' }}
            />
            {opsSignal.summary}
          </div>
        </Glass>
      </div>
    </div>
  )
}
