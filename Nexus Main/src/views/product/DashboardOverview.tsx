import React from 'react'
import { ArrowRight, CalendarDays, SlidersHorizontal } from 'lucide-react'
import { useTheme } from '../../store/themeStore'
import { openProductTarget } from '../../app/useProductNavigation'
import { AttentionRow, CommitmentRow, ProductCapture, ProductStatus, type Navigate } from './ProductOverviewParts'
import { useProductOverview } from './useProductOverview'

export function DashboardOverview({ navigate, editLayout, onEditLayout }: { navigate?: Navigate; editLayout: boolean; onEditLayout: () => void }) {
  const state = useProductOverview(), { overview } = state
  const accent = useTheme(theme => theme.accent)
  const shownSuggestion = overview?.current.length ? null : overview?.suggestion
  const attention = overview?.attention.filter(item => item.key !== shownSuggestion?.key && item.reasons.some(reason => reason !== 'unplanned')) || []
  const usable = state.ready && !state.error && overview !== null
  return <section className="nx-product-overview nx-product-dashboard" style={{ '--nx-product-accent': accent } as React.CSSProperties} data-product-overview="dashboard" data-today-tasks={usable ? overview.todayTaskCount : undefined}>
    <header className="nx-product-header"><div><p className="nx-product-eyebrow">{overview ? new Date(overview.now).toLocaleDateString('de-DE', { timeZone: overview.timeZone, weekday: 'long', day: 'numeric', month: 'long' }) : 'Deine Übersicht'}</p><h1>Dein nächster Schritt.</h1><p>Was jetzt zählt. Was als Nächstes ansteht.</p></div><ProductCapture navigate={navigate} disabled={!usable || state.operation.kind !== 'idle'} /></header>
    <ProductStatus state={state} />
    <fieldset className="nx-product-content" disabled={state.operation.kind !== 'idle' || !usable}>
      {usable && <>
        <div className="nx-product-orientation">
          <section className="nx-product-now" aria-label="Jetzt"><p className="nx-product-eyebrow">JETZT</p>
            {overview.current.length ? <><h2>{overview.overlappingNow ? 'Mehrere Pläne zur gleichen Zeit.' : 'Deine geplante Zeit.'}</h2>{overview.overlappingNow && <p className="nx-product-notice">Zeitkonflikt: Öffne die Agenda, um deine Planung zu prüfen.</p>}<ul className="nx-product-list">{overview.current.map(item => <CommitmentRow key={item.key} item={item} zone={overview.timeZone} navigate={navigate} current />)}</ul></> : overview.suggestion ? <><h2>Ein möglicher nächster Schritt.</h2><p>Lokaler Vorschlag aus deinen offenen Aufgaben.</p><ul className="nx-product-list"><AttentionRow item={overview.suggestion} navigate={navigate} /></ul></> : <><h2>Raum für deinen nächsten Schritt.</h2><p>Gerade ist kein Arbeitsblock oder Termin eingetragen. Wähle bewusst, was du angehen möchtest.</p></>}
            <button className="nx-product-primary" type="button" disabled={!navigate} onClick={() => openProductTarget({ kind: 'agenda', day: overview.day }, navigate)}><CalendarDays size={17} aria-hidden="true" />Heutige Agenda</button>
          </section>
          <section aria-label="Als Nächstes"><p className="nx-product-eyebrow">ALS NÄCHSTES</p><h2>Deine nächsten Planzeiten</h2>{overview.next.length ? <ul className="nx-product-list">{overview.next.slice(0, 3).map(item => <CommitmentRow key={item.key} item={item} zone={overview.timeZone} navigate={navigate} />)}</ul> : <p className="nx-product-empty">Keine weiteren Planzeiten eingetragen. Deine Agenda bleibt der Ort für bewusste Planung.</p>}</section>
        </div>
        <section className="nx-product-attention" aria-label="Braucht Aufmerksamkeit"><div className="nx-product-section-heading"><div><p className="nx-product-eyebrow">IM BLICK BEHALTEN</p><h2>Braucht Aufmerksamkeit <span>{attention.length}</span></h2></div><button type="button" disabled={!navigate} onClick={() => navigate?.('flux')}>Alles in Flux <ArrowRight size={16} aria-hidden="true" /></button></div>
          {attention.length ? <ul className="nx-product-list">{attention.slice(0, 3).map(item => <AttentionRow key={item.key} item={item} navigate={navigate} />)}</ul> : <p className="nx-product-empty">Keine weiteren Hinweise. Neue Aufgaben oder Erinnerungen kannst du hier erfassen.</p>}
        </section>
      </>}
    </fieldset>
    <section className="nx-product-capture"><h2>Deine Widgets</h2><button type="button" disabled={state.operation.kind !== 'idle'} aria-pressed={editLayout} onClick={onEditLayout}><SlidersHorizontal size={16} aria-hidden="true" />{editLayout ? 'Layout fertig' : 'Widgets anpassen'}</button></section>
  </section>
}
