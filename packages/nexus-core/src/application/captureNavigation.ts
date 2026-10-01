import { useSyncExternalStore } from 'react'
import { requestPlanningNavigation } from '../planning/planningNavigation'

export type CaptureClient = 'main' | 'mobile'
export type CaptureRequest = { requestId: string; kind: 'note' | 'reminder'; createdAt: string; reminderInstant: string; initialTitle?: string }
const requests: Record<CaptureClient, CaptureRequest | null> = { main: null, mobile: null }
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())
/** All entrypoints open the same unsaved destination. Creation occurs only on explicit submit. */
export function openApplicationCapture(client: CaptureClient, kind: 'note' | 'reminder' | 'task' | 'event', navigate?: (view: string) => void, initialTitle?: string) {
  if (kind === 'task' || kind === 'event') { requestPlanningNavigation(client, { mode: kind, initialTitle }); navigate?.('calendar'); return 'opened' as const }
  const now = new Date()
  requests[client] = { requestId: crypto.randomUUID(), kind, createdAt: now.toISOString(), reminderInstant: new Date(now.getTime() + 60 * 60000).toISOString(), initialTitle }
  notify()
  return 'opened' as const
}
export const closeApplicationCapture = (client: CaptureClient, requestId: string) => { if (requests[client]?.requestId === requestId) { requests[client] = null; notify() } }
export const getApplicationCapture = (client: CaptureClient) => requests[client]
export const useApplicationCapture = (client: CaptureClient) => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => requests[client], () => requests[client])
export function routeShellCapture(client: CaptureClient, commandId: string, navigate?: (view: string) => void) {
  const kinds: Record<string, 'note' | 'reminder' | 'task' | 'event'> = { 'dashboard.quick-capture': 'note', 'notes.new-note': 'note', 'tasks.new-task': 'task', 'calendar.new-calendar-item': 'event', 'reminders.new-reminder': 'reminder' }
  const kind = Object.prototype.hasOwnProperty.call(kinds, commandId) ? kinds[commandId] : undefined
  return kind ? openApplicationCapture(client, kind, navigate) : false
}
