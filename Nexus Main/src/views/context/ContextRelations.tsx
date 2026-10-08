import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { activeContextUsage, type ContextLink } from '@nexus/core/planning/contextRelations'
import { entityIdentity, type EntityCatalog, type EntityRef } from '@nexus/core/planning/entityLinks'
import { requestEntityNavigation } from '@nexus/core/planning/entityNavigation'
import { TaskContextLinks } from '@nexus/core/planning/TaskContextLinks'
import type { TaskRecord } from '@nexus/core/planning/domain'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { openProductTarget } from '../../app/useProductNavigation'
import { useApp } from '../../store/appStore'
import { useCanvas } from '../../store/canvasStore'
import { planningCommands, usePlanning } from '../../store/planningStore'
import { useTheme } from '../../store/themeStore'
import { useContextRelations } from './useContextRelations'
import './contextRelations.css'

type Navigate = ((view: string) => void) | undefined
export function openContext(ref: EntityRef, navigate: Navigate) {
  if (!navigate || workspaceOperation.isActive()) return
  requestEntityNavigation('main', ref); navigate(ref.kind === 'note' ? 'notes' : 'canvas')
}
function Frame({ children }: { children: React.ReactNode }) {
  const accent = useTheme(state => state.accent)
  return <section className="nx-context" style={{ '--nx-context-accent': accent } as React.CSSProperties}>{children}</section>
}
function LinkRow({ link, navigate }: { link: ContextLink; navigate: Navigate }) {
  return <li data-context-state={link.state}>
    <div><strong>{link.title}</strong><p>{link.kind === 'note' ? 'Notiz' : link.canvasTitle ? `Canvas · ${link.canvasTitle}` : 'Canvas-Knoten'}</p>
      {link.state === 'resolved' ? link.summary && <p>{link.summary}</p> : <p>{link.state === 'ambiguous' ? 'Diese Verknüpfung ist mehrdeutig. Wähle das richtige Ziel in der Verknüpfungsverwaltung.' : 'Das verknüpfte Ziel ist nicht mehr verfügbar. Die Referenz bleibt erhalten.'}</p>}</div>
    {link.ref && link.state === 'resolved' && <button type="button" disabled={!navigate} aria-label={`Kontext öffnen: ${link.title}`} onClick={() => openContext(link.ref!, navigate)}>Öffnen</button>}
  </li>
}
export function TaskContextSummary({ taskId, navigate }: { taskId: string; navigate: Navigate }) {
  const { model, error } = useContextRelations(), links = model?.byTask.get(taskId) || []
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  return <Frame><h3>Kontext</h3>{error ? <p role="alert">{error}</p> : !model?.byTask.has(taskId) ? <p role="status">Die Aufgabe ist nicht mehr verfügbar.</p> : links.length ? <fieldset disabled={operation.kind !== 'idle'}><ul>{links.map(link => <LinkRow key={link.key} link={link} navigate={navigate} />)}</ul></fieldset> : <p>Noch kein Kontext verknüpft.</p>}</Frame>
}
function ContextManager({ taskId, navigate }: { taskId: string; navigate: Navigate }) {
  const task = useApp(state => state.tasks.find(item => item.id === taskId)), notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases), planning = usePlanning()
  return task ? <TaskContextLinks embedded task={task as unknown as TaskRecord} catalog={{ notes, canvases } as unknown as EntityCatalog} planning={planning} execute={planningCommands.execute} onOpen={navigate ? ref => openContext(ref, navigate) : undefined} /> : <p>Die Aufgabe ist nicht mehr verfügbar.</p>
}
export function TaskContextSection({ taskId, navigate, manageInline = false }: { taskId: string; navigate: Navigate; manageInline?: boolean }) {
  const [manage, setManage] = useState(false)
  return <div className="nx-context-section"><TaskContextSummary taskId={taskId} navigate={navigate} /><Frame>{manageInline ? <ContextManager taskId={taskId} navigate={navigate} /> : <details onToggle={event => setManage(event.currentTarget.open)}><summary>Verknüpfungen verwalten</summary>{manage && <ContextManager taskId={taskId} navigate={navigate} />}</details>}</Frame></div>
}
export function ContextUsagePanel({ target, navigate }: { target: EntityRef | { kind: 'canvas'; id: string }; navigate: Navigate }) {
  const { model, error } = useContextRelations(), [open, setOpen] = useState(false)
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const all = target.kind === 'canvas' ? model?.byCanvas.get(target.id) : model?.byEntity.get(entityIdentity(target))
  const usage = activeContextUsage(all), completed = (all?.length || 0) - usage.length
  return <Frame><details data-context-usage onToggle={event => setOpen(event.currentTarget.open)}><summary>{error ? 'Kontext nicht verfügbar' : `Verwendet von ${usage.length} offenen ${usage.length === 1 ? 'Aufgabe' : 'Aufgaben'}`}</summary>
    {open && <>{error ? <p role="alert">{error}</p> : <><p>{usage.length ? 'Öffne die zugehörige Arbeit.' : 'Derzeit von keiner offenen Aufgabe verwendet.'}</p><ul className="nx-context-usage-list">{usage.map(task => <li key={task.id}><strong>{task.title}</strong><button type="button" disabled={!navigate || operation.kind !== 'idle'} onClick={() => openProductTarget({ kind: 'task', id: task.id }, navigate)} aria-label={`Aufgabe öffnen: ${task.title}`}>Aufgabe öffnen</button></li>)}</ul>{completed > 0 && <p>{completed === 1 ? '1 abgeschlossene Aufgabe behält ihre Verknüpfung.' : `${completed} abgeschlossene Aufgaben behalten ihre Verknüpfung.`}</p>}</>}</>}
  </details></Frame>
}
export function ContextNavigationNotice({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (message) ref.current?.focus() }, [message])
  return message ? <p className="nx-context-navigation-notice" role="alert" tabIndex={-1} ref={ref}>{message}</p> : null
}
