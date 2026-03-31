import React, { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  Bell,
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

const TYPE_META: Record<Activity['type'], { icon: any; color: string; label: string }> = {
  note: { icon: FileText, color: '#0A84FF', label: 'Notes' },
  code: { icon: Code, color: '#BF5AF2', label: 'Code' },
  task: { icon: CheckSquare, color: '#FF9F0A', label: 'Tasks' },
  reminder: { icon: Bell, color: '#FF453A', label: 'Reminders' },
  system: { icon: Package, color: '#34C759', label: 'System' },
}

const PRIORITY_WEIGHT: Record<string, number> = { low: 0, mid: 1, high: 2 }

export function FluxView() {
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
    }),
    shallow,
  )

  const [filter, setFilter] = useState<Activity['type'] | 'all'>('all')
  const [query, setQuery] = useState('')

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks])
  const dueReminders = useMemo(
    () => reminders.filter((reminder) => !reminder.done && new Date(reminder.snoozeUntil || reminder.datetime).getTime() <= Date.now()),
    [reminders],
  )

  const bottlenecks = useMemo(() => {
    const taskIssues = pendingTasks
      .slice()
      .sort((a, b) => {
        const aPriority = PRIORITY_WEIGHT[a.priority] ?? 0
        const bPriority = PRIORITY_WEIGHT[b.priority] ?? 0
        if (bPriority !== aPriority) return bPriority - aPriority
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY
        return aDeadline - bDeadline
      })
      .slice(0, 4)
      .map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        detail: `Task · ${task.priority.toUpperCase()} · ${task.status}`,
        color: TYPE_META.task.color,
      }))

    const reminderIssues = dueReminders.slice(0, 4).map((reminder) => ({
      id: `rem-${reminder.id}`,
      title: reminder.title,
      detail: `Reminder · faellig ${new Date(reminder.snoozeUntil || reminder.datetime).toLocaleString()}`,
      color: TYPE_META.reminder.color,
    }))

    return [...taskIssues, ...reminderIssues].slice(0, 6)
  }, [dueReminders, pendingTasks])

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase()
    return activities.filter((entry) => {
      if (filter !== 'all' && entry.type !== filter) return false
      if (!q) return true
      return (
        entry.targetName.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.type.toLowerCase().includes(q)
      )
    })
  }, [activities, filter, query])

  const runQuickAction = (action: 'note' | 'code' | 'task' | 'reminder') => {
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
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', padding: 14, minHeight: 0 }}>
      <Glass style={{ padding: '14px 16px', flexShrink: 0 }} glow>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, fontWeight: 900 }}>
              <Zap size={18} style={{ color: t.accent }} />
              Flux Ops
            </div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Workspace Monitoring + Quick Actions + Activity Stream</div>
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
      </Glass>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, flexShrink: 0 }}>
        {[
          { label: 'Notes', value: notes.length, color: TYPE_META.note.color },
          { label: 'Code Files', value: codes.length, color: TYPE_META.code.color },
          { label: 'Open Tasks', value: pendingTasks.length, color: TYPE_META.task.color },
          { label: 'Due Reminders', value: dueReminders.length, color: TYPE_META.reminder.color },
        ].map((metric) => (
          <Glass key={metric.label} style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 10, opacity: 0.58, textTransform: 'uppercase', letterSpacing: 0.6 }}>{metric.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: metric.color, lineHeight: 1.1 }}>{metric.value}</div>
          </Glass>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) minmax(0,1fr)', gap: 12, flex: 1, minHeight: 0 }}>
        <Glass style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>Bottlenecks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, overflowY: 'auto' }}>
            {bottlenecks.length === 0 && (
              <div style={{ fontSize: 11, opacity: 0.55, padding: '10px 8px' }}>Keine akuten Bottlenecks erkannt.</div>
            )}
            {bottlenecks.map((entry) => (
              <div key={entry.id} style={{ padding: '8px 9px', borderRadius: 9, border: `1px solid ${entry.color}33`, background: `${entry.color}14` }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{entry.title}</div>
                <div style={{ fontSize: 10, opacity: 0.68 }}>{entry.detail}</div>
              </div>
            ))}
          </div>
        </Glass>

        <Glass style={{ padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0 }} glow>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Activity Stream</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'note', 'code', 'task', 'reminder'] as const).map((type) => (
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
                >
                  {type}
                </button>
              ))}
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.55 }} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Suchen"
                  style={{
                    width: 140,
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.36, fontSize: 12, gap: 8 }}>
                <ActivityIcon size={16} /> Keine Aktivitaeten für den aktuellen Filter.
              </div>
            )}
            {filteredActivities.map((entry) => {
              const meta = TYPE_META[entry.type] || TYPE_META.system
              const Icon = meta.icon
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
                </div>
              )
            })}
          </div>
        </Glass>
      </div>
    </div>
  )
}
