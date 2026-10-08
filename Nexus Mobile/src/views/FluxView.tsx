import React, { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store/appStore'
import { AttentionRow, CaptureActions, MobileProductFrame, ProductStatus } from './product/MobileProductParts'
import { attentionReasonLabels, type AttentionReason } from './product/productAttention'
import { useProductOverview } from './product/useProductOverview'

export function FluxView({ setView }: { setView?: (view: string) => void } = {}) {
  const state = useProductOverview(), { overview } = state
  const activities = useApp(source => source.activities)
  const [query, setQuery] = useState(''), [reason, setReason] = useState<AttentionReason | 'all'>('all')
  const [kind, setKind] = useState('all'), [history, setHistory] = useState(false)
  const [limit, setLimit] = useState(50)
  useEffect(() => { setLimit(50) }, [query, reason, kind])
  const usable = state.ready && !state.error && overview !== null
  const filtered = useMemo(() => overview?.attention.filter(item => (reason === 'all' || item.reasons.includes(reason)) && (kind === 'all' || item.kind === kind) && `${item.title} ${item.detail}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) || [], [overview, reason, kind, query])
  return <MobileProductFrame className="nx-mobile-product-flux"><div data-product-overview="flux" data-today-tasks={usable ? overview.todayTaskCount : undefined}>
    <header><div><p className="nx-mobile-product-eyebrow">FLUX</p><h2>Was braucht Aufmerksamkeit?</h2><p>Konkrete Gründe. Deine Entscheidung.</p></div><CaptureActions navigate={setView} disabled={!usable || state.operation.kind !== 'idle'} /></header>
    <ProductStatus state={state} />
    <label>Hinweise suchen<input type="search" aria-label="Aufmerksamkeit durchsuchen" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <details><summary>Filtern{reason !== 'all' || kind !== 'all' ? ' · aktiv' : ''}</summary>
      <label>Grund<select aria-label="Aufmerksamkeitsgrund" value={reason} onChange={event => setReason(event.target.value as AttentionReason | 'all')}><option value="all">Alle Gründe</option>{Object.entries(attentionReasonLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Inhalt<select aria-label="Aufmerksamkeitstyp" value={kind} onChange={event => setKind(event.target.value)}><option value="all">Alle Inhalte</option><option value="task">Aufgaben</option><option value="reminder">Erinnerungen</option><option value="planning">Planung</option></select></label>
    </details>
    <fieldset disabled={!usable || state.operation.kind !== 'idle'}>{usable && <>
      {filtered.length ? <ul>{filtered.slice(0, limit).map(item => <AttentionRow key={item.key} item={item} navigate={setView} />)}</ul> : overview.attention.length ? <p role="status">Keine passenden Hinweise. Passe Suche oder Filter an.</p> : <p role="status">Keine offenen Hinweise. Du kannst etwas erfassen oder deine Agenda öffnen.</p>}
      {filtered.length > limit && <button type="button" onClick={() => setLimit(value => value + 50)}>Weitere Hinweise ({filtered.length - limit})</button>}
      <button type="button" disabled={!setView} onClick={() => setView?.('calendar')}>Agenda öffnen</button>
    </>}</fieldset>
    <details onToggle={event => setHistory(event.currentTarget.open)}><summary>Letzte Aktivitäten</summary>{history && <><p>Verlauf deiner Änderungen, keine Prioritätenliste.</p><ul>{activities.slice(0, 30).map(activity => <li className="nx-mobile-product-row" key={activity.id}><strong>{activity.action + " · " + activity.targetName}</strong><p>{new Date(activity.timestamp).toLocaleString()}</p></li>)}</ul>{!activities.length && <p>Noch keine Aktivitäten.</p>}</>}</details>
  </div></MobileProductFrame>
}
