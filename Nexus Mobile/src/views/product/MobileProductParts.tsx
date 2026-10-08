import React, { useEffect, useRef } from 'react'
import { openApplicationCapture } from '@nexus/core/application/captureNavigation'
import { requestPlanningNavigation } from '@nexus/core/planning/planningNavigation'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { persistenceRegistry } from '@nexus/core/storage/browserPersistence'
import { openProductTarget } from '../../app/useProductNavigation'
import { useTheme } from '../../store/themeStore'
import { attentionReasonLabels, type AttentionItem, type Commitment } from './productAttention'
import type { useProductOverview } from './useProductOverview'
import './mobileProduct.css'

export type Navigate = ((view: string) => void) | undefined
export function MobileProductFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const mode = useTheme(state => state.mode), accent = useTheme(state => state.accent)
  return <section className={`nx-mobile-product ${className}`} style={{ '--mobile-product-accent': accent, '--mobile-product-text': mode === 'dark' ? '#edf1f8' : '#182135', '--mobile-product-surface': mode === 'dark' ? 'rgba(18,25,40,.85)' : 'rgba(255,255,255,.88)' } as React.CSSProperties}>{children}</section>
}
export function NavigationNotice({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (message) ref.current?.focus() }, [message])
  return message ? <p ref={ref} tabIndex={-1} role="alert" className="nx-mobile-navigation-notice">{message}</p> : null
}
export function ProductStatus({ state }: { state: ReturnType<typeof useProductOverview> }) {
  const [saving, setSaving] = React.useState(false)
  return <>{state.operation.kind !== 'idle' && <p role="status">{state.operation.message || 'Workspace wird übernommen …'}</p>}
    {state.error ? <div role="alert"><p>Die Übersicht ist nicht vollständig verfügbar. Deine Inhalte bleiben erhalten.</p><button type="button" onClick={() => void state.retry()}>Erneut laden</button></div> : !state.ready && <p role="status">Übersicht wird geladen …</p>}
    {state.storageError && <div role="alert"><p>Änderungen sind noch nicht sicher gespeichert. Bitte Nexus geöffnet lassen.</p><button type="button" disabled={saving || state.operation.kind !== 'idle'} onClick={async () => { setSaving(true); try { await persistenceRegistry.flush() } catch { /* Existing owner retains the failed queue. */ } finally { setSaving(false) } }}>{saving ? 'Speichern …' : 'Speichern erneut versuchen'}</button></div>}</>
}
export function CaptureActions({ navigate, disabled }: { navigate: Navigate; disabled: boolean }) {
  return <details className="nx-mobile-product-capture"><summary>Erfassen</summary><div className="nx-mobile-product-actions">{([['task','Neue Aufgabe'],['note','Neue Notiz'],['reminder','Neue Erinnerung'],['event','Neuer Termin']] as const).map(([kind,label]) => <button key={kind} type="button" disabled={disabled || !navigate} onClick={() => { if (!workspaceOperation.isActive()) openApplicationCapture('mobile', kind, navigate) }}>{label}</button>)}</div></details>
}
export function planTask(taskId: string, navigate: Navigate) {
  if (!navigate || workspaceOperation.isActive()) return
  requestPlanningNavigation('mobile', { mode: 'schedule', taskId, localStart: '' }); navigate('calendar')
}
export function AttentionRow({ item, navigate }: { item: AttentionItem; navigate: Navigate }) {
  return <li className="nx-mobile-product-row" data-product-item={item.key}>
    <p className="nx-mobile-product-reason">{item.reasons.map(reason => attentionReasonLabels[reason]).join(' · ')}</p><h3>{item.title}</h3>{item.detail && <p>{item.detail}</p>}
    <div className="nx-mobile-product-actions"><button type="button" disabled={!navigate} aria-label={`${item.kind === 'task' ? 'Aufgabe' : item.kind === 'reminder' ? 'Erinnerung' : 'Agenda'} öffnen: ${item.title}`} onClick={() => openProductTarget(item.target, navigate)}>Öffnen</button>{item.task && <button type="button" disabled={!navigate} aria-label={`Zeit planen: ${item.title}`} onClick={() => planTask(item.task!.id, navigate)}>Zeit planen</button>}</div>
  </li>
}
export function CommitmentRow({ item, zone, navigate }: { item: Commitment; zone: string; navigate: Navigate }) {
  const time = (value: string) => new Date(value).toLocaleString('de-DE', { timeZone: zone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  return <li className="nx-mobile-product-row" data-product-commitment={item.key}><h3>{item.title}</h3><p>{item.kind === 'block' ? 'Arbeitsblock' : 'Termin'} · {time(item.start)} – {time(item.end)}</p>{item.unresolved && <p>Die verknüpfte Aufgabe fehlt.</p>}<button type="button" disabled={!navigate} aria-label={`Agenda öffnen: ${item.title}`} onClick={() => openProductTarget(item.target, navigate)}>In Agenda öffnen</button></li>
}
