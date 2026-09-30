import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'
import { useApp } from '../../store/appStore'
import { cerebriPreviewStore, type MainCerebriPreviewStore } from '../../store/cerebriPreviewStore'

const outcomeText = {
  Solution: 'Die Vorschau enthält mögliche Arbeitsblöcke.',
  NoSolution: 'Im angegebenen Zeitraum und Suchraster wurde kein passender Block gefunden.',
  NeedsRelaxation: 'Mit den aktuellen Bedingungen wurde kein passender Block gefunden.',
  InsufficientInformation: 'Kontext, Abdeckung oder Berechtigung reichen für eine verlässliche Vorschau nicht aus.',
}
const transportText: Record<string, string> = {
  timeout: 'Die Vorschau hat das Zeitlimit erreicht.', bridge_unavailable: 'Der Vorschauhost ist nicht erreichbar.',
  busy: 'Der Vorschauhost ist beschäftigt.', artifact_mismatch: 'Der geprüfte Vorschauhost ist nicht verfügbar.',
}
const reasonText: Record<string, string> = {
  IncompleteCoverage: 'Die Kalenderabdeckung ist unvollständig.', PlanningPermissionDenied: 'Lesen oder Planen ist nicht erlaubt.',
  AnalysisOnly: 'Dieses Ergebnis ist eine Vorschau.', FeasibleWithinScope: 'Dieser Kandidat erfüllt die geprüften Bedingungen im angegebenen Zeitraum.',
  EarliestTieBreak: 'Bei gleichem Wert steht der frühere Beginn zuerst.', 'HardConstraint.Overlap': 'Andere Kandidaten überschneiden sich mit festen Terminen.',
  'HardConstraint.OutsideBounds': 'Andere Kandidaten liegen außerhalb einer festen Zeitgrenze.',
}
/** Deliberately unregistered until the production collector/activation gate is met. */
export function CerebriPreviewPanel({ store = cerebriPreviewStore, onManualPlanning }: { store?: MainCerebriPreviewStore; onManualPlanning: () => void }) {
  const tasks = useApp(state => state.tasks)
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const [taskId, setTaskId] = useState(''), [duration, setDuration] = useState(''), [zone, setZone] = useState('')
  const [start, setStart] = useState(''), [end, setEnd] = useState(''), [confirmed, setConfirmed] = useState(false), [keepConflict, setKeepConflict] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => { let live = true; store.ready().then(() => { if (live) setReady(true) }).catch(() => { if (live) setReady(false) }); return () => { live = false } }, [store])
  const edit = (setter: (value: string) => void) => (value: string) => { store.invalidate(); setConfirmed(false); setKeepConflict(false); setter(value) }
  const pending = ['loading', 'revalidating', 'saving'].includes(state.status)
  const submit = (event: FormEvent) => { event.preventDefault(); setConfirmed(false); setKeepConflict(false); void store.preview(taskId, { durationMinutes: Number(duration), timeZone: zone, window: { start, end } }) }
  const result = state.result
  return <section aria-label="Cerebri Vorschau" style={{ maxWidth: 800, padding: 20, border: '1px solid #53627b', borderRadius: 12, background: '#172033', color: '#edf1f8' }}>
    <h2>Arbeitsblock vorschlagen</h2>
    <p>Wähle eine Aufgabe und gib Dauer, Zeitzone sowie einen begrenzten Zeitraum an. Ein Arbeitsblock wird erst nach deiner Bestätigung gespeichert.</p>
    {state.status === 'disabled' && <p role="status">Cerebri-Vorschau ist deaktiviert. Die manuelle Planung ist verfügbar.</p>}
    <form aria-label="Cerebri Vorschauparameter" onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
      <label>Aufgabe <select aria-label="Vorschauaufgabe" value={taskId} onChange={e => edit(setTaskId)(e.target.value)} disabled={pending}><option value="">Aufgabe auswählen</option>{tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>
      <label>Dauer in Minuten <input aria-label="Vorschaudauer" type="number" min="1" max="10080" step="1" value={duration} onChange={e => edit(setDuration)(e.target.value)} disabled={pending} required /></label>
      <label>IANA-Zeitzone <input aria-label="Vorschauzeitzone" placeholder="Europe/Berlin" value={zone} onChange={e => edit(setZone)(e.target.value)} disabled={pending} required /></label>
      <label>Beginn als UTC-Zeitpunkt <input aria-label="Vorschauzeitraum Beginn" placeholder="2026-10-01T09:00:00Z" value={start} onChange={e => edit(setStart)(e.target.value)} disabled={pending} required /></label>
      <label>Ende als UTC-Zeitpunkt <input aria-label="Vorschauzeitraum Ende" placeholder="2026-10-01T12:00:00Z" value={end} onChange={e => edit(setEnd)(e.target.value)} disabled={pending} required /></label>
      <small>Höchstens 31 Tage. UTC-Zeitpunkte müssen bereits eindeutig aufgelöst sein.</small>
      <button type="submit" disabled={!ready || pending || state.status === 'disabled'}>Vorschau berechnen</button>
    </form>
    {pending && <p role="status">{state.status === 'loading' ? 'Vorschau wird berechnet …' : state.status === 'revalidating' ? 'Aktueller Kontext wird geprüft …' : 'Arbeitsblock wird gespeichert …'}</p>}
    {state.status === 'invalid-input' && <p role="alert">Wähle eine aktuelle Aufgabe, eine positive ganze Dauer, eine IANA-Zone und einen gültigen UTC-Zeitraum.</p>}
    {state.status === 'stale' && <p role="alert">Aufgabe, Planung oder Hostkontext wurden geändert. Berechne eine neue Vorschau.</p>}
    {state.status === 'error' && <p role="alert">Die Vorschau konnte nicht verlässlich geprüft werden. Manuelle Planung bleibt möglich.</p>}
    {result && <div aria-label="Vorschauergebnis">
      <p role="status">{result.status === 'planned' ? outcomeText[result.outcome] : result.status === 'error' ? transportText[result.code] || 'Die Vorschau ist zurzeit nicht verfügbar.' : result.status === 'clarification' ? 'Ein eindeutiger Hostkontext fehlt. Manuelle Planung bleibt möglich.' : 'Die Vorschau ist zurzeit nicht verfügbar.'}</p>
      {result.status === 'planned' && <>
        <p>Kalenderabdeckung: {state.coverage === 'Complete' ? 'vollständig für diesen Zeitraum' : 'unvollständig'}.</p>
        {result.outcome === 'Solution' && result.assessment === 'BestFound' && <p>Das Suchbudget wurde ausgeschöpft. Angezeigt werden die besten gefundenen Kandidaten; ein optimaler Plan ist nicht nachgewiesen.</p>}
        <ul aria-label="Rust Gründe">{state.reasons?.map(reason => <li key={`${reason.source}:${reason.code}`}>{reasonText[reason.code] || 'Rust meldet eine geprüfte Bedingung.'} <code>{reason.code}</code></li>)}</ul>
        {result.outcome === 'Solution' && <fieldset disabled={pending || state.status === 'acknowledged'}><legend>Kandidat auswählen</legend>{result.candidates.map((candidate, index) => <label key={candidate.id} style={{ display: 'block', marginBottom: 8 }}><input type="radio" name="cerebri-candidate" aria-label={`Kandidat ${index + 1}`} checked={state.selectedId === candidate.id} onChange={() => { store.select(candidate.id); setConfirmed(false); setKeepConflict(false) }} /> {candidate.placement.start} bis {candidate.placement.end} ({zone})</label>)}</fieldset>}
      </>}
    </div>}
    {state.selectedId && state.status !== 'acknowledged' && <div style={{ display: 'grid', gap: 8, margin: '16px 0' }}>
      <label><input aria-label="Vorschau ausdrücklich bestätigen" type="checkbox" checked={confirmed} disabled={pending} onChange={e => setConfirmed(e.target.checked)} /> Diesen Kandidaten als manuellen Nexus-Arbeitsblock speichern.</label>
      <label><input aria-label="Nexus Planungskonflikte ausdrücklich übernehmen" type="checkbox" checked={keepConflict} disabled={pending} onChange={e => setKeepConflict(e.target.checked)} /> Von Nexus gemeldete Konflikte ausdrücklich übernehmen.</label>
      <button disabled={!confirmed || pending} onClick={() => void store.confirm({ confirmed, keepConflict })}>Bestätigten Arbeitsblock speichern</button>
    </div>}
    {state.commandResult?.ok === false && <p role="alert">{state.commandResult.message}</p>}
    {state.status === 'acknowledged' && state.commandResult?.ok && <p role="status">Dauerhaft gespeichert. {state.commandResult.issues.length > 0 ? 'Die ausdrücklich übernommenen Planungshinweise sind beim Arbeitsblock erhalten.' : ''}</p>}
    <button type="button" onClick={onManualPlanning} disabled={state.status === 'saving'}>Manuell planen</button>
  </section>
}
