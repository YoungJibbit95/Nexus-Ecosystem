import React from 'react'
import { openProductTarget } from '../../app/useProductNavigation'
import { AttentionRow, CaptureActions, CommitmentRow, MobileProductFrame, ProductStatus, type Navigate } from './MobileProductParts'
import type { useProductOverview } from './useProductOverview'

export function MobileDashboardOrientation({ state, navigate }: { state: ReturnType<typeof useProductOverview>; navigate: Navigate }) {
  const { overview } = state, usable = state.ready && !state.error && overview !== null
  const shownSuggestion = overview?.current.length ? null : overview?.suggestion
  const attention = overview?.attention.filter(item => item.key !== shownSuggestion?.key && item.reasons.some(reason => reason !== 'unplanned')) || []
  return <MobileProductFrame><div data-product-overview="dashboard" data-today-tasks={usable ? overview.todayTaskCount : undefined}>
    <header><div><p className="nx-mobile-product-eyebrow">DEIN NÄCHSTER SCHRITT</p><h2>Was jetzt zählt.</h2></div><CaptureActions navigate={navigate} disabled={!usable || state.operation.kind !== 'idle'} /></header>
    <ProductStatus state={state} /><fieldset disabled={!usable || state.operation.kind !== 'idle'}>{usable && <>
      <section className="nx-mobile-product-now" aria-label="Jetzt"><p className="nx-mobile-product-eyebrow">JETZT</p>{overview.current.length ? <>{overview.overlappingNow && <p>Zeitkonflikt: Mehrere Pläne laufen gleichzeitig. Bitte in der Agenda prüfen.</p>}<ul><CommitmentRow item={overview.current[0]} zone={overview.timeZone} navigate={navigate} /></ul>{overview.current.length > 1 && <p>{overview.current.length - 1} weitere laufende Planzeiten in der Agenda.</p>}</> : shownSuggestion ? <><p>Lokaler Vorschlag aus deinen offenen Aufgaben.</p><ul><AttentionRow item={shownSuggestion} navigate={navigate} /></ul></> : <><h3>Raum für deinen nächsten Schritt.</h3><p>Gerade ist nichts geplant. Wähle bewusst deine nächste Aufgabe.</p></>}
        <button type="button" onClick={() => openProductTarget({ kind: 'agenda', day: overview.day }, navigate)} disabled={!navigate}>Heutige Agenda</button>
      </section>
      <section className="nx-mobile-product-secondary" aria-label="Als Nächstes"><p className="nx-mobile-product-eyebrow">ALS NÄCHSTES</p>{overview.next.length ? <ul><CommitmentRow item={overview.next[0]} zone={overview.timeZone} navigate={navigate} /></ul> : <p>Keine weiteren Planzeiten eingetragen.</p>}</section>
      <section className="nx-mobile-product-secondary" aria-label="Aufmerksamkeit"><h3>{attention.length ? `${attention.length} Hinweise im Blick behalten` : 'Keine weiteren Hinweise'}</h3>{attention[0] && <ul><AttentionRow item={attention[0]} navigate={navigate} /></ul>}<button type="button" disabled={!navigate} onClick={() => navigate?.('flux')}>Aufmerksamkeit in Flux</button></section>
    </>}</fieldset></div></MobileProductFrame>
}
