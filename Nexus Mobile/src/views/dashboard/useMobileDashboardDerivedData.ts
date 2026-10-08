import { useCallback, useMemo } from 'react'
import { openApplicationCapture } from '@nexus/core/application/captureNavigation'
import { createCaptureIntent, type CaptureIntentType } from '@nexus/core'
import type { selectProductAttention } from '../product/productAttention'

type Entity = Record<string, any>
export type MobileDashboardResumeEntry = { label: 'Note' | 'Code' | 'Task' | 'Reminder' | 'Canvas'; title: string; subtitle: string; reason: string; relevance: number; action: () => void }
export function useMobileDashboardDerivedData({ notes, tasks, reminders, activities, codes, workspaces, activeWorkspaceId, setView, addCode, addCanvas, overview }: {
  notes: Entity[]; tasks: Entity[]; reminders: Entity[]; activities: Entity[]; codes: Entity[]; canvases: Entity[]; activeCanvasId?: string | null; workspaces: Entity[]; activeWorkspaceId?: string | null
  setView?: (view: string) => void; addNote: () => void; addTask: (...args: any[]) => void; addRem: (...args: any[]) => void; addCode: (name?: string, language?: string) => void; addCanvas: (name?: string) => void; updateReminder: (...args: any[]) => void
  overview: ReturnType<typeof selectProductAttention> | null
}) {
  const doneTasks = useMemo(() => tasks.filter(item => item.status === 'done').length, [tasks])
  const openTasks = tasks.length - doneTasks
  const overdueReminders = overview ? overview.attention.filter(item => item.kind === 'reminder' && item.reasons.includes('overdue')).length : null
  const upcomingReminders = useMemo(() => reminders.filter(item => !item.done).sort((a,b) => Date.parse(a.snoozeUntil || a.datetime) - Date.parse(b.snoozeUntil || b.datetime)).slice(0,5), [reminders])
  const recentNotes = useMemo(() => [...notes].sort((a,b) => Date.parse(b.updated) - Date.parse(a.updated)).slice(0,5), [notes])
  const recentActivity = useMemo(() => activities.slice(0,7), [activities])
  const pinnedNotes = useMemo(() => notes.filter(item => item.pinned).length, [notes])
  const taskProgress = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0
  const hour = new Date(overview?.now || Date.now()).getHours(), greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const runCaptureIntent = useCallback((kind: CaptureIntentType) => {
    const intent = createCaptureIntent(kind)
    if (intent.type === 'code') { addCode('quick-note.ts', 'typescript'); setView?.('code') }
    else if (intent.type === 'canvas') { addCanvas(intent.title || 'Quick Canvas'); setView?.('canvas') }
    else if (intent.type === 'task' || intent.type === 'note' || intent.type === 'event' || intent.type === 'reminder') openApplicationCapture('mobile', intent.type, setView)
  }, [addCanvas, addCode, setView])
  const activeWorkspace = useMemo(() => workspaces.find(item => item.id === activeWorkspaceId) || null, [workspaces, activeWorkspaceId])
  return { doneTasks, openTasks, overdueReminders, upcomingReminders, recentNotes, recentActivity, pinnedNotes, taskProgress, greeting, runCaptureIntent, activeWorkspace }
}
