import React, { useEffect, useMemo, useRef, useState } from 'react'
import { openApplicationCapture, getApplicationCapture } from '@nexus/core/application/captureNavigation'
import { requestEntityNavigation } from '@nexus/core/planning/entityNavigation'
import { canHandleViewKeyboardEvent, hasPlainShortcutModifiers, isEditableShortcutTarget, useActiveViewCommandScope } from '../app/ViewCommandScope'
import { openProductTarget } from '../app/useProductNavigation'
import { useApp, type Activity } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { AttentionRow, ProductCapture, ProductStatus } from './product/ProductOverviewParts'
import { attentionReasonLabels, compareAttention, type AttentionReason } from './product/productAttention'
import { useProductOverview } from './product/useProductOverview'

const presets = ['all', 'overdue', 'due-soon', 'high-priority', 'blocked', 'unresolved', 'focus', 'reminder-triage', 'task-backlog'] as const
type Preset = typeof presets[number]
const labels: Record<Preset, string> = { all: 'Alles', overdue: 'Überfällig', 'due-soon': 'Nächste 48 Stunden', 'high-priority': 'Hohe Priorität', blocked: 'Blockiert', unresolved: 'Klärung nötig', focus: 'Handlungsfähig', 'reminder-triage': 'Erinnerungen', 'task-backlog': 'Noch nicht eingeplant' }
const sources = ['all', 'note', 'code', 'task', 'reminder', 'system'] as const
function usePreference<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => { try { const stored = localStorage.getItem(key) as T; return allowed.includes(stored) ? stored : fallback } catch { return fallback } })
  const [error, setError] = useState(false)
  useEffect(() => { try { localStorage.setItem(key, value); setError(false) } catch { setError(true) } }, [key, value])
  return [value, setValue, error] as const
}

export function FluxView({ setView }: { setView?: (view: string) => void } = {}) {
  const active = useActiveViewCommandScope(), accent = useTheme(state => state.accent)
  const state = useProductOverview(), { overview } = state
  const activities = useApp(store => store.activities)
  const searchRef = useRef<HTMLInputElement>(null), historyRef = useRef<HTMLDetailsElement>(null)
  const [query, setQuery] = useState(''), [historyOpen, setHistoryOpen] = useState(false), [historyMessage, setHistoryMessage] = useState('')
  const [visibleCount, setVisibleCount] = useState(50)
  const [preset, setPreset, presetError] = usePreference('nx-flux-preset-v1', presets, 'all')
  const [kind, setKind, kindError] = usePreference('nx-flux-queue-filter-v1', ['all', 'task', 'reminder', 'planning'] as const, 'all')
  const [sort, setSort, sortError] = usePreference('nx-flux-queue-sort-v1', ['severity', 'time'] as const, 'severity')
  const [focus, setFocus, focusError] = usePreference('nx-flux-focus-mode-v1', ['0', '1'] as const, '0')
  const [source, setSource, sourceError] = usePreference('nx-flux-filter-v1', sources, 'all')
  const clear = () => { setQuery(''); setPreset('all'); setKind('all'); setFocus('0'); setSource('all') }
  const actionable = (reasons: AttentionReason[]) => !reasons.some(reason => reason === 'blocked' || reason === 'unresolved')
  const matches = (value: string) => value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  const filtered = useMemo(() => (overview?.attention || []).filter(item =>
    (kind === 'all' || item.kind === kind) &&
    (focus !== '1' || item.kind === 'task' && actionable(item.reasons)) &&
    (preset === 'all' || preset === 'focus' && item.kind === 'task' && actionable(item.reasons) || preset === 'reminder-triage' && item.kind === 'reminder' || preset === 'task-backlog' && item.reasons.includes('unplanned') || item.reasons.includes(preset as AttentionReason)) &&
    matches([item.title, item.detail, ...item.reasons.map(reason => attentionReasonLabels[reason])].join(' ')),
  ).sort((a, b) => sort === 'time' ? (a.time === b.time ? 0 : a.time < b.time ? -1 : 1) || compareAttention(a, b) : compareAttention(a, b)), [overview, kind, focus, preset, query, sort])
  const history = useMemo(() => historyOpen ? activities.filter(item => (source === 'all' || item.type === source) && matches(item.targetName + ' ' + item.action)).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 50) : [], [activities, source, query, historyOpen])
  useEffect(() => setVisibleCount(50), [kind, focus, preset, query, sort])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!canHandleViewKeyboardEvent(event, active) || event.altKey || getApplicationCapture('main') || isEditableShortcutTarget(event.target)) return
      const key = event.key.toLowerCase(), cmd = event.ctrlKey || event.metaKey
      if (cmd && !event.shiftKey && key === 'f') { event.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); return }
      if (cmd && event.shiftKey) {
        if (['n', 't', 'r'].includes(key)) { event.preventDefault(); openApplicationCapture('main', key === 'n' ? 'note' : key === 't' ? 'task' : 'reminder', setView); return }
        // Existing Code capture is outside the Task/Reminder command migration.
        if (key === 'c') { event.preventDefault(); useApp.getState().addCode('scratch.ts', 'typescript'); return }
        if (key === 'd' || key === 'b') { event.preventDefault(); setPreset(key === 'd' ? 'overdue' : 'task-backlog'); setKind('all'); setFocus('0'); return }
      }
      if (hasPlainShortcutModifiers(event)) return
      if (key === 'f') { event.preventDefault(); setFocus(value => value === '1' ? '0' : '1') }
      if (/^[0-4]$/.test(key)) { event.preventDefault(); setSource(sources[Number(key)]); if (historyRef.current) historyRef.current.open = true }
      if (key === 'escape') { event.preventDefault(); if (historyRef.current?.open) { historyRef.current.open = false; historyRef.current.querySelector('summary')?.focus() } else clear() }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [active, setView])
  const openHistory = (entry: Activity) => {
    const app = useApp.getState()
    if (entry.type === 'task' && entry.targetId) return openProductTarget({ kind: 'task', id: entry.targetId }, setView)
    if (entry.type === 'reminder' && entry.targetId) return openProductTarget({ kind: 'reminder', id: entry.targetId }, setView)
    if (entry.type === 'note') {
      const candidates = app.notes.filter(note => entry.targetId ? note.id === entry.targetId : note.title === entry.targetName)
      if (candidates.length === 1) { requestEntityNavigation('main', { kind: 'note', id: candidates[0].id }); setView?.('notes'); return }
    }
    if (entry.type === 'code') {
      const candidates = app.codes.filter(code => entry.targetId ? code.id === entry.targetId : code.name === entry.targetName)
      if (candidates.length === 1) { app.openCode(candidates[0].id); app.setCode(candidates[0].id); setView?.('code'); return }
    }
    setHistoryMessage('Das ursprüngliche Ziel ist nicht mehr eindeutig verfügbar. Der Verlauf bleibt erhalten.')
  }
  const usable = state.ready && !state.error && overview !== null
  return <div className="nx-flux-v6 nx-flux-v7 nx-release-view custom-scrollbar"><section className="nx-product-overview" data-product-overview="flux" data-today-tasks={usable ? overview.todayTaskCount : undefined} style={{ '--nx-product-accent': accent } as React.CSSProperties}>
    <header className="nx-product-header"><div><p className="nx-product-eyebrow">FLUX</p><h1>Was Aufmerksamkeit braucht.</h1><p>Aus Aufgaben, Erinnerungen und Planung. Lokal geordnet, mit nachvollziehbaren Gründen.</p></div><button type="button" disabled={!setView || !usable || state.operation.kind !== 'idle'} onClick={() => overview && openProductTarget({ kind: 'agenda', day: overview.day }, setView)}>Heutige Agenda</button></header>
    <ProductStatus state={state} />
    {(presetError || kindError || sortError || focusError || sourceError) && <p role="status" className="nx-product-notice">Filter gelten für diese Sitzung; ihre Speicherung ist derzeit nicht möglich.</p>}
    <fieldset className="nx-product-content" disabled={!usable || state.operation.kind !== 'idle'}>
      <div className="nx-product-filters">
        <label>Aufmerksamkeit durchsuchen<input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Titel oder Grund suchen" /></label>
        <label>Ansicht<select value={preset} onChange={event => setPreset(event.target.value as Preset)}>{presets.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
        <label>Quelle<select value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="all">Alle Quellen</option><option value="task">Aufgaben</option><option value="reminder">Erinnerungen</option><option value="planning">Planung</option></select></label>
        <label>Reihenfolge<select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="severity">Nach Grund</option><option value="time">Nach Zeitpunkt</option></select></label>
        <button type="button" aria-pressed={focus === '1'} onClick={() => setFocus(value => value === '1' ? '0' : '1')}>Handlungsfähig</button>
      </div>
      {usable && <><div className="nx-product-section-heading"><h2>{filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}</h2><button type="button" onClick={clear}>Filter zurücksetzen</button></div>
        {filtered.length ? <><ul className="nx-product-list">{filtered.slice(0, visibleCount).map(item => <AttentionRow key={item.key} item={item} navigate={setView} />)}</ul>{filtered.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + 50)}>Weitere Einträge anzeigen ({filtered.length - visibleCount})</button>}</> : <p className="nx-product-empty">{overview.attention.length ? 'Keine Einträge für diese Filter. Setze die Filter zurück, um alles zu sehen.' : 'Aktuell nichts zu klären. Neue Aufgaben und Erinnerungen erscheinen hier, sobald sie Aufmerksamkeit brauchen.'}</p>}</>}
      <section className="nx-product-capture"><h2>Neu festhalten</h2><ProductCapture navigate={setView} /></section>
      <details ref={historyRef} className="nx-product-history" onToggle={event => setHistoryOpen(event.currentTarget.open)}><summary>Letzte Aktivitäten</summary><p>Lokale Quellen: Notes, Code, Tasks, Reminder und Systemereignisse.</p>
        {historyOpen && <><div className="nx-product-filters"><label>Verlaufsquelle<select value={source} onChange={event => setSource(event.target.value as typeof source)}>{sources.map(value => <option key={value} value={value}>{value === 'all' ? 'Alle' : value}</option>)}</select></label></div>{historyMessage && <p role="status">{historyMessage}</p>}<ul className="nx-product-list">{history.map(entry => <li key={entry.id} className="nx-product-row"><div className="nx-product-row-body"><h3>{entry.targetName}</h3><p>{entry.type} · {entry.action} · {new Date(entry.timestamp).toLocaleString('de-DE')}</p></div>{entry.type !== 'system' && <button type="button" disabled={!setView} onClick={() => openHistory(entry)}>Ziel öffnen</button>}</li>)}</ul>{!history.length && <p className="nx-product-empty">Keine passenden Aktivitäten.</p>}</>}
      </details>
    </fieldset>
  </section></div>
}
