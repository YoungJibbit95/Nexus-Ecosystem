import React, { useMemo } from 'react'
import { Glass } from './Glass'
import { useTheme } from '../store/themeStore'
import { useApp } from '../store/appStore'
import { useCanvas } from '../store/canvasStore'
import { useTerminal } from '../store/terminalStore'
import { View } from './Sidebar'
import { hexToRgb } from '../lib/utils'
import {
  Sparkles,
  TerminalSquare,
  Search,
  Plus,
  ArrowRight,
  FileText,
  CheckSquare,
  Bell,
  GitBranch,
  Code2,
  Settings2,
} from 'lucide-react'

type Action = {
  id: string
  label: string
  icon: any
  color: string
  run: () => void
}

const VIEW_META: Record<View, { title: string; subtitle: string; accent: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Live overview and workflow pulse', accent: '#64D2FF' },
  notes: { title: 'Notes', subtitle: 'Capture ideas, link context, stay focused', accent: '#30D158' },
  code: { title: 'Code', subtitle: 'Edit, run and inspect in one space', accent: '#BF5AF2' },
  tasks: { title: 'Tasks', subtitle: 'Plan, prioritize and execute', accent: '#FF9F0A' },
  reminders: { title: 'Reminders', subtitle: 'Never miss deadlines and follow-ups', accent: '#FF453A' },
  canvas: { title: 'Canvas', subtitle: 'Visual thinking with connected nodes', accent: '#64D2FF' },
  files: { title: 'Files', subtitle: 'Unified access across your workspace', accent: '#5E5CE6' },
  flux: { title: 'Flux', subtitle: 'Focus mode with streamlined controls', accent: '#00C7BE' },
  devtools: { title: 'DevTools', subtitle: 'Inspect and tune your system', accent: '#FF6B35' },
  settings: { title: 'Settings', subtitle: 'Craft visuals, behavior and UX', accent: '#8E8E93' },
  info: { title: 'Info', subtitle: 'Product notes, docs and changelog', accent: '#7D7AFF' },
}

export function ViewEnhancer({
  view,
  setView,
  children,
}: {
  view: View
  setView: (v: View) => void
  children: React.ReactNode
}) {
  const t = useTheme()
  const app = useApp()
  const canvas = useCanvas()
  const terminal = useTerminal()
  const meta = VIEW_META[view]
  const accent = meta?.accent || t.accent
  const rgb = hexToRgb(accent)

  const openTasks = app.tasks.filter((task) => task.status !== 'done').length
  const openReminders = app.reminders.filter((r) => !r.done).length

  const openSpotlight = (query = '') => {
    window.dispatchEvent(new CustomEvent('nx-open-spotlight', { detail: { query } }))
  }

  const quickActions: Action[] = useMemo(() => {
    const base: Action[] = [
      {
        id: 'new-note',
        label: 'Notiz',
        icon: FileText,
        color: '#30D158',
        run: () => {
          app.addNote()
          setView('notes')
        },
      },
      {
        id: 'new-task',
        label: 'Task',
        icon: CheckSquare,
        color: '#FF9F0A',
        run: () => {
          app.addTask('Quick Task', 'todo')
          setView('tasks')
        },
      },
      {
        id: 'new-reminder',
        label: 'Reminder',
        icon: Bell,
        color: '#FF453A',
        run: () => {
          app.addRem({
            title: 'Quick Reminder',
            msg: 'Added from quick actions',
            datetime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            repeat: 'none',
          })
          setView('reminders')
        },
      },
    ]

    if (view === 'code') {
      base.unshift({
        id: 'new-code',
        label: 'Codefile',
        icon: Code2,
        color: '#BF5AF2',
        run: () => {
          app.addCode('quick-snippet.ts', 'typescript')
          setView('code')
        },
      })
    }

    if (view === 'canvas' || view === 'dashboard') {
      base.unshift({
        id: 'new-canvas',
        label: 'Canvas',
        icon: GitBranch,
        color: '#64D2FF',
        run: () => {
          canvas.addCanvas('Neue Idee')
          setView('canvas')
        },
      })
    }

    return base.slice(0, 4)
  }, [app, canvas, setView, view])

  return (
    <div className="nx-view-enhancer">
      <div className="nx-view-enhancer-top">
        <Glass glow hover type="panel" className="nx-view-enhancer-bar">
          <div className="nx-ve-headline">
            <div
              className="nx-ve-badge"
              style={{
                color: accent,
                borderColor: `rgba(${rgb},0.38)`,
                background: `rgba(${rgb},0.14)`,
                boxShadow: `0 0 22px rgba(${rgb},0.28)`,
              }}
            >
              <Sparkles size={11} />
              {meta.title}
            </div>
            <div className="nx-ve-subtitle">{meta.subtitle}</div>
          </div>

          <div className="nx-ve-stats">
            <span className="nx-ve-stat">Notes {app.notes.length}</span>
            <span className="nx-ve-stat">Tasks {openTasks}</span>
            <span className="nx-ve-stat">Reminders {openReminders}</span>
            <span className="nx-ve-stat">Canvas {canvas.canvases.length}</span>
          </div>

          <div className="nx-ve-actions">
            {quickActions.map((action) => {
              const actionRgb = hexToRgb(action.color)
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={action.run}
                  className="nx-ve-action"
                  style={{
                    color: action.color,
                    borderColor: `rgba(${actionRgb},0.3)`,
                    background: `linear-gradient(135deg, rgba(${actionRgb},0.16), rgba(${actionRgb},0.06))`,
                  }}
                >
                  <Icon size={12} />
                  {action.label}
                </button>
              )
            })}

            <button className="nx-ve-action" onClick={() => terminal.setOpen(!terminal.isOpen)}>
              <TerminalSquare size={12} />
              Terminal
            </button>
            <button className="nx-ve-action" onClick={() => openSpotlight()}>
              <Search size={12} />
              Spotlight
            </button>
            <button className="nx-ve-action" onClick={() => setView('settings')}>
              <Settings2 size={12} />
              Settings
            </button>
          </div>
        </Glass>
      </div>

      <div className="nx-view-enhancer-content">{children}</div>

      <div className="nx-view-enhancer-foot">
        <button onClick={() => openSpotlight(`goto ${view}`)} className="nx-ve-foot-btn">
          <Plus size={11} />
          Quick Command
        </button>
        <span className="nx-ve-foot-hint">Tip: `note: Titel` oder `task: Titel` in Spotlight</span>
        <button onClick={() => terminal.setOpen(true)} className="nx-ve-foot-btn">
          <ArrowRight size={11} />
          Terminal öffnen
        </button>
      </div>
    </div>
  )
}

