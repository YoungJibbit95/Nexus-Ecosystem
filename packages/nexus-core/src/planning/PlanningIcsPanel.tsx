import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { PlanningDocument } from './domain'
import type { PlanningCommand, PlanningCommandResult } from './commandService'
import { previewPlanningIcs } from './icsPlanning'

export function PlanningIcsPanel({ planning, timeZone, ready, execute, embedded = false }: { planning: PlanningDocument; timeZone: string; ready: boolean; execute: (command: PlanningCommand) => Promise<PlanningCommandResult>; embedded?: boolean }) {
  const [raw, setRaw] = useState(''), [fileName, setFileName] = useState(''), [includeBase, setIncludeBase] = useState(false), [keepConflict, setKeepConflict] = useState(false)
  const [result, setResult] = useState<PlanningCommandResult | null>(null), [pending, setPending] = useState(false), [error, setError] = useState('')
  const key = useRef(crypto.randomUUID())
  const loadGeneration = useRef(0)
  const [archiveId, setArchiveId] = useState('')
  const revise = (callback: () => void) => { loadGeneration.current++; callback(); key.current = crypto.randomUUID(); setResult(null); setError('') }
  useEffect(() => { key.current = crypto.randomUUID(); setResult(null) }, [timeZone])
  const preview = useMemo(() => { try { return raw ? { value: previewPlanningIcs(raw, timeZone), error: '' } : { value: null, error: '' } } catch (failure) { return { value: null, error: String(failure instanceof Error ? failure.message : failure) } } }, [raw, timeZone])
  const importIcs = async () => {
    setPending(true); setError('')
    try { setResult(await execute({ kind: 'import-ics', key: key.current, expected: { generation: planning.generation, revision: planning.revision }, raw, fileName, timeZone, includeBaseOccurrences: includeBase, keepConflict })) }
    catch (failure) { setError(String(failure instanceof Error ? failure.message : failure)) }
    finally { setPending(false) }
  }
  const content = <>
    {embedded && <h3>Kalender importieren</h3>}
    <p>{embedded ? <>Termine werden in deinen Tagesplan übernommen. Aufgabenfristen und Erinnerungen bleiben erhalten. Die Originaldatei wird zum Nachlesen gespeichert. Zeiten ohne Zeitzone und ganztägige Einträge verwenden {timeZone}.</> : <>Ziel: Agenda-Termine und Roharchiv. Aufgabenfristen und Reminder-Serien werden nicht aus dem Kalender abgeleitet. Schwebende und ganztägige Werte verwenden ausdrücklich {timeZone}.</>}</p>
    <label>Datei<input type="file" accept=".ics,text/calendar" aria-label="ICS Datei" disabled={pending} onChange={event => { const file = event.target.files?.[0]; if (!file) return; const generation = ++loadGeneration.current; if (file.size > 262144) { setError('Datei darf höchstens 256 KiB umfassen.'); return }; void file.text().then(value => { if (generation === loadGeneration.current) revise(() => { setRaw(value); setFileName(file.name) }) }).catch(failure => { if (generation === loadGeneration.current) setError(String(failure)) }) }} /></label>
    <label>Originaltext<textarea aria-label="ICS Originaltext" value={raw} disabled={pending} onChange={event => revise(() => { setRaw(event.target.value); setFileName('') })} /></label>
    {preview.error && <p role="alert">{preview.error}</p>}
    {preview.value && <div aria-label="ICS Semantikvorschau">
      <p>{preview.value.rows.filter(row => row.event && (!row.recurring || includeBase)).length} feste Basistermine · {preview.value.rows.filter(row => !row.event || row.recurring && !includeBase).length} nur im Roharchiv. Die Abdeckung bleibt unverändert.</p>
      {preview.value.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
      {preview.value.rows.map(row => <article key={row.index}><strong>{row.title}</strong>{row.uid && <span> · UID: {row.uid}</span>}{row.event && <p>{row.event.start} bis {row.event.end} · {row.event.timeZone} · {row.event.allDay ? 'ganztägig' : 'feste Zeit'}</p>}{row.warnings.map((warning, index) => <p key={index}>{warning}</p>)}</article>)}
      <label><input type="checkbox" aria-label="ICS Basistermine trotz nicht ausgeführter Serie übernehmen" checked={includeBase} disabled={pending} onChange={event => revise(() => setIncludeBase(event.target.checked))} />Basistermine aus Serien ausdrücklich übernehmen; RRULE, COUNT, INTERVAL und Ausnahmen bleiben nicht ausgeführt.</label>
      <label><input type="checkbox" aria-label="ICS Überschneidungen ausdrücklich behalten" checked={keepConflict} disabled={pending} onChange={event => revise(() => setKeepConflict(event.target.checked))} />Überschneidungen ausdrücklich behalten.</label>
      <button type="button" disabled={!ready || pending || result?.ok === true} onClick={() => void importIcs()}>{pending ? 'ICS wird gespeichert …' : 'ICS Vorschau dauerhaft importieren'}</button>
    </div>}
    {(result || error) && <p role={error || result?.ok === false ? 'alert' : 'status'}>{error || (result?.ok === true ? embedded ? 'ICS dauerhaft gespeichert. Deine Termine sind übernommen.' : `ICS dauerhaft gespeichert${result.replayed ? ' (bereits bestätigt)' : ''}; zurückgegebene IDs: ${result.ids.join(', ')}.` : result?.message)}</p>}
    {result?.ok === false && result.issues?.map((issue, index) => <p key={index}>{issue.message}</p>)}
    {Array.isArray(planning.icsImports) && planning.icsImports.map((archive: any) => embedded ? <article key={archive.id}><button type="button" aria-expanded={archiveId === archive.id} onClick={() => setArchiveId(id => id === archive.id ? '' : archive.id)}>Import ansehen: {archive.fileName || archive.id} · {archive.eventIds.length} Termine</button>{archiveId === archive.id && <>{archive.rows.map((row: any, index: number) => <p key={index}>{row.title}: {row.imported ? 'Basistermin gespeichert' : 'nur Rohdaten erhalten'} · {row.warnings.join(' ')}</p>)}<pre>{archive.raw}</pre></>}</article> : <details key={archive.id}><summary>Roharchiv: {archive.fileName || archive.id} · {archive.eventIds.length} feste Termine</summary>{archive.rows.map((row: any, index: number) => <p key={index}>{row.title}: {row.imported ? 'Basistermin gespeichert' : 'nur Rohdaten erhalten'} · {row.warnings.join(' ')}</p>)}<pre>{archive.raw}</pre></details>)}
  </>
  return embedded ? <section className="nx-planning-ics" aria-label="ICS Ereignisimport">{content}</section> : <details className="nx-planning-ics" aria-label="ICS Ereignisimport"><summary>ICS als feste Termine importieren</summary>{content}</details>
}
