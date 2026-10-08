import React, { useMemo, useState, useSyncExternalStore } from 'react'
import { activeContextUsage, readContextRelations } from '@nexus/core/planning/contextRelations'
import { entityIdentity, type EntityCatalog, type EntityRef } from '@nexus/core/planning/entityLinks'
import type { TaskRecord } from '@nexus/core/planning/domain'
import { TaskContextLinks } from '@nexus/core/planning/TaskContextLinks'
import { requestEntityNavigation } from '@nexus/core/planning/entityNavigation'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { useApp } from '../../store/appStore'
import { useCanvas } from '../../store/canvasStore'
import { planningCommands, usePlanning } from '../../store/planningStore'
import { openProductTarget } from '../../app/useProductNavigation'
import { MobileProductFrame, planTask, type Navigate } from './MobileProductParts'

let cached: { tasks: unknown; notes: unknown; canvases: unknown; result: ReturnType<typeof readContextRelations> } | undefined
export function selectMobileContext(tasks: unknown, notes: unknown, canvases: unknown) {
  if (!cached || cached.tasks !== tasks || cached.notes !== notes || cached.canvases !== canvases) cached = { tasks, notes, canvases, result: readContextRelations(tasks as TaskRecord[], { notes, canvases } as EntityCatalog) }
  return cached.result
}
function useContext() {
  const tasks = useApp(state => state.tasks), notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases)
  return useMemo(() => selectMobileContext(tasks, notes, canvases), [tasks, notes, canvases])
}
export function openMobileContext(ref: EntityRef | { kind: 'canvas'; id: string }, navigate: Navigate) {
  if (!navigate || workspaceOperation.isActive()) return
  requestEntityNavigation('mobile', ref); navigate(ref.kind === 'note' ? 'notes' : 'canvas')
}
function LinkManager({ taskId, navigate }: { taskId: string; navigate: Navigate }) {
  const task = useApp(state => state.tasks.find(item => item.id === taskId)), notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases), planning = usePlanning()
  return task ? <TaskContextLinks embedded task={task as unknown as TaskRecord} catalog={{ notes, canvases } as unknown as EntityCatalog} planning={planning} execute={planningCommands.execute} onOpen={ref => openMobileContext(ref, navigate)} /> : <p>Diese Aufgabe ist nicht mehr verfügbar.</p>
}
export function MobileTaskContext({ taskId, navigate }: { taskId: string; navigate: Navigate }) {
  const { model, error } = useContext(), [manage, setManage] = useState(false)
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const links = model?.byTask.get(taskId) || []
  return <MobileProductFrame><fieldset disabled={operation.kind !== 'idle'}><h3>Kontext & Zeit</h3><button type="button" onClick={() => planTask(taskId, navigate)} disabled={!navigate}>Zeit für diese Aufgabe planen</button>
    {error ? <p role="alert">{error}</p> : !links.length ? <p>Noch kein Kontext verknüpft.</p> : <ul>{links.map(link => <li className="nx-mobile-product-row" data-context-state={link.state} key={link.key}><strong>{link.title}</strong><p>{link.kind === 'note' ? 'Notiz' : `Canvas · ${link.canvasTitle || 'Projekt prüfen'}`}</p>{link.state === 'resolved' && link.ref ? <button type="button" disabled={!navigate} aria-label={`Kontext öffnen: ${link.title}`} onClick={() => openMobileContext(link.ref!, navigate)}>Kontext öffnen</button> : <p>{link.state === 'ambiguous' ? 'Mehrdeutige Verknüpfung. Bitte das richtige Projekt wählen.' : 'Das verknüpfte Ziel fehlt. Die Referenz bleibt erhalten.'}</p>}</li>)}</ul>}
    <details onToggle={event => setManage(event.currentTarget.open)}><summary>Verknüpfungen verwalten</summary>{manage && <LinkManager taskId={taskId} navigate={navigate} />}</details>
  </fieldset></MobileProductFrame>
}
export function MobileContextUsage({ target, navigate }: { target: EntityRef | { kind: 'canvas'; id: string }; navigate: Navigate }) {
  const { model, error } = useContext(), [open, setOpen] = useState(false)
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const all = target.kind === 'canvas' ? model?.byCanvas.get(target.id) : model?.byEntity.get(entityIdentity(target)), usage = activeContextUsage(all)
  return <MobileProductFrame className="nx-mobile-context"><details data-context-usage onToggle={event => setOpen(event.currentTarget.open)}><summary>{error ? 'Kontext nicht verfügbar' : `Verwendet von ${usage.length} offenen Aufgaben`}</summary>{open && <>{error ? <p role="alert">{error}</p> : <>{!usage.length && <p>Derzeit von keiner offenen Aufgabe verwendet.</p>}<ul>{usage.map(task => <li className="nx-mobile-product-row" key={task.id}><strong>{task.title}</strong><button type="button" disabled={!navigate || operation.kind !== 'idle'} aria-label={`Aufgabe öffnen: ${task.title}`} onClick={() => openProductTarget({ kind: 'task', id: task.id }, navigate)}>Aufgabe öffnen</button></li>)}</ul>{(all?.length || 0) > usage.length && <p>Abgeschlossene Aufgaben behalten ihre Verknüpfung.</p>}</>}</>}</details></MobileProductFrame>
}
