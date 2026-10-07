import React from 'react'
import { ArrowRight, Bell, CalendarDays, CheckSquare, FileText, Link2 } from 'lucide-react'
import { openApplicationCapture } from '@nexus/core/application/captureNavigation'
import { requestPlanningNavigation } from '@nexus/core/planning/planningNavigation'
import { requestEntityNavigation } from '@nexus/core/planning/entityNavigation'
import { taskEntityLinks, type EntityCatalog } from '@nexus/core/planning/entityLinks'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { persistenceRegistry } from '@nexus/core/storage/browserPersistence'
import { useApp } from '../../store/appStore'
import { useCanvas } from '../../store/canvasStore'
import { openProductTarget } from '../../app/useProductNavigation'
import { attentionReasonLabels, type AttentionItem, type Commitment } from './productAttention'
import type { useProductOverview } from './useProductOverview'
import './productOverview.css'

export type Navigate = (view: string) => void
export function ProductCapture({ navigate, disabled = false }: { navigate?: Navigate; disabled?: boolean }) {
  return <div className="nx-product-actions" aria-label="Schnell erfassen">
    {([{ kind: 'task', label: 'Neue Aufgabe', Icon: CheckSquare }, { kind: 'note', label: 'Neue Notiz', Icon: FileText }, { kind: 'reminder', label: 'Erinnerung', Icon: Bell }, { kind: 'event', label: 'Neuer Termin', Icon: CalendarDays }] as const).map(({ kind, label, Icon }) =>
      <button key={kind} type="button" disabled={disabled || !navigate} onClick={() => { if (!workspaceOperation.isActive()) openApplicationCapture('main', kind, navigate) }}><Icon size={16} aria-hidden="true" />{label}</button>)}
  </div>
}
export function ProductStatus({ state }: { state: ReturnType<typeof useProductOverview> }) {
  const [retrying, setRetrying] = React.useState(false)
  return <>
    {state.operation.kind !== 'idle' && <p role="status" className="nx-product-notice">{state.operation.message || 'Workspace wird übernommen …'}</p>}
    {state.error ? <div role="alert" className="nx-product-notice"><p>Die Übersicht konnte nicht vollständig geladen werden. Angezeigte Daten können unvollständig sein.</p><button type="button" onClick={() => void state.retry()}>Erneut laden</button></div> : !state.ready && <p role="status" className="nx-product-notice">Deine Übersicht wird geladen …</p>}
    {state.storageError && <div role="alert" className="nx-product-notice"><p>Änderungen konnten nicht sicher gespeichert werden. Bitte Nexus geöffnet lassen und erneut speichern.</p><button type="button" disabled={retrying || state.operation.kind !== 'idle'} onClick={async () => { setRetrying(true); try { await persistenceRegistry.flush() } catch { /* The registry retains the failed queue and its error. */ } finally { setRetrying(false) } }}>{retrying ? 'Speichern …' : 'Speichern erneut versuchen'}</button></div>}
  </>
}
function ContextActions({ item, navigate }: { item: AttentionItem; navigate?: Navigate }) {
  const notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases)
  const links = taskEntityLinks(item.task!, { notes, canvases } as unknown as EntityCatalog)
  return <>{links.map((link, index) => link.ref && link.resolved ? <button key={index} type="button" disabled={!navigate} onClick={() => { if (!workspaceOperation.isActive()) { requestEntityNavigation('main', link.ref!); navigate?.(link.ref!.kind === 'note' ? 'notes' : 'canvas') } }} aria-label={`${link.kind === 'note' ? 'Notiz' : 'Canvas'} öffnen: ${link.resolved.title}`}><Link2 size={14} aria-hidden="true" />{link.kind === 'note' ? 'Notiz' : 'Canvas'}</button> : <button key={index} type="button" disabled={!navigate} onClick={() => openProductTarget(item.target, navigate)}>Kontext prüfen</button>)}</>
}
export function AttentionRow({ item, navigate }: { item: AttentionItem; navigate?: Navigate }) {
  const Icon = item.kind === 'task' ? CheckSquare : item.kind === 'reminder' ? Bell : CalendarDays
  const hasContext = item.task && (item.task.linkedNoteId || item.task.linkedCanvasNodeId || Array.isArray(item.task.entityLinks) && item.task.entityLinks.length)
  return <li className="nx-product-row" data-product-item={item.key}>
    <Icon size={18} aria-hidden="true" className="nx-product-row-icon" />
    <div className="nx-product-row-body"><h3>{item.title}</h3><p className="nx-product-reasons">{item.reasons.map(reason => attentionReasonLabels[reason]).join(' · ')}</p>{item.detail && <p>{item.detail}</p>}</div>
    <div className="nx-product-actions">
      <button type="button" disabled={!navigate} onClick={() => openProductTarget(item.target, navigate)} aria-label={`${item.kind === 'task' ? 'Aufgabe' : item.kind === 'reminder' ? 'Erinnerung' : 'Agenda'} öffnen: ${item.title}`}>Öffnen <ArrowRight size={14} aria-hidden="true" /></button>
      {item.task && <button type="button" disabled={!navigate} onClick={() => { if (!workspaceOperation.isActive()) { requestPlanningNavigation('main', { mode: 'schedule', taskId: item.task!.id, localStart: '' }); navigate?.('calendar') } }} aria-label={`Zeit planen: ${item.title}`}>Zeit planen</button>}
      {hasContext ? <ContextActions item={item} navigate={navigate} /> : null}
    </div>
  </li>
}
export function CommitmentRow({ item, zone, navigate, current = false }: { item: Commitment; zone: string; navigate?: Navigate; current?: boolean }) {
  const time = (value: string) => new Date(value).toLocaleString('de-DE', { timeZone: zone, ...(current ? {} : { day: '2-digit' as const, month: '2-digit' as const }), hour: '2-digit', minute: '2-digit' })
  return <li className="nx-product-row" data-product-commitment={item.key}><CalendarDays className="nx-product-row-icon" size={18} aria-hidden="true" /><div className="nx-product-row-body"><h3>{item.title}</h3><p>{item.kind === 'block' ? 'Arbeitsblock' : 'Termin'} · {time(item.start)} – {time(item.end)}</p>{item.unresolved && <p>Die verknüpfte Aufgabe fehlt.</p>}</div><div className="nx-product-actions"><button type="button" disabled={!navigate} onClick={() => openProductTarget(current && item.taskId ? { kind: 'task', id: item.taskId } : item.target, navigate)}>{current && item.taskId ? 'Aufgabe öffnen' : 'In Agenda öffnen'}<ArrowRight size={14} aria-hidden="true" /></button></div></li>
}
