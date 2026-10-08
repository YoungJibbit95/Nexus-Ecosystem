import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { taskRevision, zonedDate, type PlanningBlock, type PlanningDocument, type TaskRecord } from './domain'
import type { PlanningCommand, PlanningCommandResult } from './commandService'
import { planningDayHorizon, planningInstantToLocal, resolvePlanningLocal } from './planningTime'
import { selectPlanningToday, type TodayReminder } from './today'
import './planningPanel.css'
import { PlanningIcsPanel } from './PlanningIcsPanel'
import { TaskContextLinks } from './TaskContextLinks'
import type { EntityCatalog, EntityRef } from './entityLinks'

export type PlanningPanelProps = {
  tasks: TaskRecord[]; reminders: TodayReminder[]; planning: PlanningDocument
  execute: (command: PlanningCommand) => Promise<PlanningCommandResult>; initialize: () => Promise<void>
  storageError?: string | null; selectedDay?: string; initialTaskId?: string; initialStart?: string
  onDayChange?: (day: string) => void; onOpenTask?: (id: string) => void; compact?: boolean
  initialMode?: 'schedule' | 'task' | 'event' | 'availability'; requestId?: string
  editorOnly?: boolean; initialBlockId?: string; timeZone?: string
  onFeedback?: (feedback: { message: string; result: PlanningCommandResult | null; error: boolean }) => void
  messageText?: (message: string) => string
  initialTitle?: string
  /** Day-first composition around the existing command-owned editor. */
  dayFirst?: boolean
  entityCatalog?: EntityCatalog; onOpenEntity?: (ref: EntityRef) => void
}
export function PlanningPanel(props: PlanningPanelProps) {
  const label = useId()
  const [zone, setZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const [day, setDay] = useState(props.selectedDay || zonedDate(new Date().toISOString(), zone))
  const [mode, setMode] = useState<'schedule' | 'task' | 'event' | 'availability'>(props.initialMode || 'schedule')
  const [taskId, setTaskId] = useState(props.initialTaskId || '')
  const [blockId, setBlockId] = useState(props.initialBlockId || '')
  const [title, setTitle] = useState(props.initialTitle || '')
  const [deadline, setDeadline] = useState('')
  const [duration, setDuration] = useState('')
  const [start, setStart] = useState(props.initialStart || '')
  const [end, setEnd] = useState('')
  const [fold, setFold] = useState('')
  const [endFold, setEndFold] = useState('')
  const [keepConflict, setKeepConflict] = useState(false)
  const [completeCoverage, setCompleteCoverage] = useState(false)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const manualRef = useRef<HTMLDetailsElement>(null)
  const [result, setResult] = useState<PlanningCommandResult | null>(null)
  const [stopReminderIds, setStopReminderIds] = useState<string[]>([])
  const lastCompletion = useRef<PlanningCommand | null>(null)
  const identity = useRef<string>(crypto.randomUUID())
  const formSignature = `${mode}|${taskId}|${blockId}|${title}|${deadline}|${duration}|${start}|${end}|${fold}|${endFold}|${zone}|${keepConflict}|${completeCoverage}`
  useEffect(() => { identity.current = crypto.randomUUID(); setResult(null); if (props.editorOnly) { setMessage(''); setMessageError(false) } }, [formSignature])
  useEffect(() => { props.initialize().then(() => setReady(true)).catch(error => setMessage(String(error instanceof Error ? error.message : error))) }, [props.initialize])
  useEffect(() => { if (props.selectedDay) setDay(props.selectedDay) }, [props.selectedDay])
  useEffect(() => { props.onFeedback?.({ message: props.storageError || message, result, error: Boolean(props.storageError || result?.ok === false || messageError) }) }, [message, result, messageError, props.storageError, props.onFeedback])
  useEffect(() => {
    identity.current = crypto.randomUUID(); setResult(null); setMessage('')
    if (props.initialTaskId) { setTaskId(props.initialTaskId); setMode('schedule'); setBlockId('') }
    if (props.initialStart !== undefined) setStart(props.initialStart)
    if (props.initialMode) setMode(props.initialMode)
    if (props.initialTitle !== undefined) setTitle(props.initialTitle)
    if (props.editorOnly || props.dayFirst) {
      const initialBlock = props.planning.blocks.find(item => item.id === props.initialBlockId)
      setBlockId(props.initialBlockId || '')
      setTaskId(props.initialTaskId || ''); setTitle(props.initialTitle || ''); setStart(props.initialStart || ''); setDeadline(''); setEnd(''); setCompleteCoverage(false); setMessageError(false)
      const minutes = initialBlock ? (Date.parse(initialBlock.end) - Date.parse(initialBlock.start)) / 60000 : props.tasks.find(item => item.id === props.initialTaskId)?.durationMinutes ?? props.planning.durations[props.initialTaskId || '']
      setDuration(minutes === undefined ? '' : String(minutes))
    }
    setFold(''); setEndFold(''); setKeepConflict(false)
    if (props.requestId || props.initialTaskId || props.initialMode || props.initialStart) openManual()
  }, [props.initialTaskId, props.initialStart, props.initialMode, props.initialTitle, props.requestId, props.initialBlockId])
  useEffect(() => { if (props.editorOnly && props.timeZone) { setZone(props.timeZone); setFold(''); setEndFold('') } }, [props.editorOnly, props.timeZone])
  const task = props.tasks.find(item => item.id === taskId)
  const block = props.planning.blocks.find(item => item.id === blockId)
  const startResolution = resolvePlanningLocal(start, zone, fold)
  const endResolution = resolvePlanningLocal(end, zone, endFold)
  const derived = useMemo(() => {
    try { return { today: selectPlanningToday({ ...props, day, timeZone: zone, horizon: planningDayHorizon(day, zone), now: new Date().toISOString() }), error: '' } }
    catch (error) { return { today: null, error: String(error instanceof Error ? error.message : error) } }
  }, [props.tasks, props.reminders, props.planning, day, zone])
  const expected = (selected?: TaskRecord) => ({ generation: props.planning.generation, revision: props.planning.revision, ...(selected ? { taskRevision: taskRevision(selected) } : {}) })
  function openManual() {
    setManualOpen(true)
    if (props.dayFirst) requestAnimationFrame(() => {
      manualRef.current?.scrollIntoView({ block: 'nearest' })
      manualRef.current?.querySelector<HTMLElement>('form input:not([type="checkbox"]), form select')?.focus({ preventScroll: true })
    })
  }
  const execute = async (command: PlanningCommand) => {
    if (command.kind === 'complete-task') lastCompletion.current = command
    setPending(true); setMessageError(false); setMessage('Wird gespeichert …')
    try {
      const response = await props.execute(command)
      setResult(response)
      setMessage(response.ok === true ? `Dauerhaft gespeichert${response.replayed ? ' (bereits bestätigt)' : ''}.` : response.message)
      return response
    } catch (error) { setMessageError(true); setMessage(String(error instanceof Error ? error.message : error)); return null }
    finally { setPending(false) }
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setMessageError(true)
    const base = { key: identity.current, expected: expected(mode === 'schedule' ? task : undefined) }
    let command: PlanningCommand
    if (mode === 'task') command = { ...base, kind: 'capture-task', fields: { title, ...(deadline ? { deadline, deadlineTimeZone: zone } : {}), ...(duration ? { durationMinutes: Number(duration) } : {}) } }
    else {
      if (startResolution.ok === false) { setMessage(startResolution.message); return }
      if (mode === 'schedule') {
        if (!task) { setMessage('Wähle eine bestehende Aufgabe.'); return }
        command = block
          ? { ...base, kind: 'move-block', blockId: block.id, start: startResolution.instant, timeZone: zone, keepConflict }
          : { ...base, kind: 'schedule-task', taskId, start: startResolution.instant, durationMinutes: duration ? Number(duration) : undefined, timeZone: zone, keepConflict }
      } else {
        if (endResolution.ok === false) { setMessage(endResolution.message); return }
        const interval = { start: startResolution.instant, end: endResolution.instant }
        command = mode === 'event'
          ? { ...base, kind: 'capture-event', fields: { title, ...interval, timeZone: zone, allDay: false, source: { kind: 'manual' } }, keepConflict }
          : { ...base, kind: 'set-availability', availability: { horizon: planningDayHorizon(day, zone), windows: [interval], timeZone: zone, coverage: completeCoverage ? 'complete' : 'unknown', sourceIds: ['explicit-user'], updatedAt: new Date().toISOString() } }
      }
    }
    await execute(command)
  }
  const schedule = (id: string) => {
    openManual()
    setMode('schedule'); setTaskId(id); setBlockId(''); setKeepConflict(false)
    const minutes = props.tasks.find(item => item.id === id)?.durationMinutes ?? props.planning.durations[id]
    setDuration(minutes === undefined ? '' : String(minutes))
  }
  const move = (item: PlanningBlock) => {
    openManual()
    setMode('schedule'); setTaskId(item.taskId); setBlockId(item.id); setZone(item.timeZone); setStart(planningInstantToLocal(item.start, item.timeZone)); setDuration(String((Date.parse(item.end) - Date.parse(item.start)) / 60000)); setKeepConflict(false); setFold('')
  }
  const today = derived.today
  const complete = (item: TaskRecord) => execute({ kind: 'complete-task', key: crypto.randomUUID(), expected: expected(item), taskId: item.id, stopAttachedReminderIds: stopReminderIds.filter(id => props.reminders.some(reminder => reminder.id === id && reminder.linkedTaskId === item.id)) })
  const timezoneControl = <label>Zeitzone<input aria-label="Planungszeitzone" value={zone} onChange={event => { setZone(event.target.value); setFold(''); setEndFold('') }} /></label>
  const messageText = props.messageText || ((value: string) => value)
  const feedback = <>
    {(message || props.storageError) && <p role={result?.ok === false || props.storageError || ((props.dayFirst || props.editorOnly) && messageError) ? 'alert' : 'status'}>{messageText(props.storageError || message)}</p>}
    {result?.ok === false && result.issues?.map((issue, index) => <p className="nx-planning-issue" key={index}>{messageText(issue.message)}</p>)}
    {result?.ok && result.issues.map((issue, index) => <p className="nx-planning-issue" key={index}>{props.editorOnly ? 'Gespeichert mit Hinweis: ' : 'Gespeichert mit sichtbarem Hinweis: '}{messageText(issue.message)}</p>)}
    {result?.ok && result.reminderStops?.map(stop => <p key={stop.id} role={stop.result.ok ? 'status' : 'alert'}>{stop.result.ok ? 'Ausgewählte verbundene Erinnerung wurde zusätzlich gestoppt.' : `Aufgabe dauerhaft abgeschlossen; Erinnerungsstopp noch unbestätigt: ${stop.result.message}`}</p>)}
    {result?.ok && result.reminderStops?.some(stop => stop.result.ok === false) && <button type="button" disabled={pending} onClick={() => { if (lastCompletion.current) void execute(lastCompletion.current) }}>Ausgewählte Erinnerungsstopps erneut versuchen</button>}
  </>
  const renderEditor = (content: React.ReactNode) => props.dayFirst
    ? <details ref={manualRef} className="nx-planning-manual" open={manualOpen}><summary onClick={event => { event.preventDefault(); setManualOpen(open => !open) }}>＋ Planen oder hinzufügen</summary>{content}</details>
    : content
  const renderAdvanced = (content: React.ReactNode) => props.dayFirst
    ? <details className="nx-planning-advanced"><summary>Weitere Optionen · Import und Reparatur</summary>{timezoneControl}<p>Nur ausdrücklich bestätigte Kalenderdaten erlauben eine vollständige Tagesabdeckung. Unbekannte Zeit bleibt unbestätigt.</p>{content}</details>
    : content
  const displayTime = (instant: string) => {
    try { const local = planningInstantToLocal(instant, zone); return `${local.slice(0, 10) === day ? '' : `${local.slice(8, 10)}.${local.slice(5, 7)}. `}${local.slice(11, 16)}` }
    catch { return instant }
  }
  const dayDate = new Date(`${day}T12:00:00Z`)
  const dayTitle = Number.isFinite(dayDate.getTime()) ? dayDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : day
  const unscheduled = props.tasks.filter(task => task.status !== 'done' && !props.planning.blocks.some(block => block.taskId === task.id && block.state === 'active' && Date.parse(block.end) > Date.now()))
  const taskMetadata = (item: TaskRecord, minutes?: number, blocked = Boolean(item.blocked)) => <div className="nx-agenda-meta">
    {item.priority && <span>{({ high: 'Hohe Priorität', mid: 'Mittlere Priorität', low: 'Niedrige Priorität' } as Record<string, string>)[String(item.priority)] || String(item.priority)}</span>}
    <span>{minutes === undefined ? 'Dauer nicht festgelegt' : `${minutes} Min.`}</span>
    {blocked && <span className="nx-agenda-badge">Blockiert</span>}
  </div>
  const scheduled = [
    ...(today?.events || []).map(item => ({ kind: 'event' as const, id: item.id, title: item.title, start: item.start, end: item.end })),
    ...(today?.blocks || []).filter(item => item.state === 'active').map(item => ({ kind: 'block' as const, id: item.id, title: props.tasks.find(task => task.id === item.taskId)?.title || 'Verknüpfte Aufgabe fehlt', start: item.start, end: item.end, block: item })),
    ...(today?.reminderPoints || []).map(item => ({ kind: 'reminder' as const, id: item.occurrenceId, title: item.title, start: item.snoozeUntil || item.datetime, overdue: item.overdue })),
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const editor = <>
    <nav aria-label="Manuelle Planung">{([['task', 'Neue Aufgabe', 'Aufgabe erfassen'], ['event', 'Neuer Termin', 'Feste Verpflichtung'], ['schedule', 'Zeit einplanen', 'Arbeitsblock'], ['availability', 'Verfügbarkeit', 'Verfügbarkeit']] as const).map(([value, modern, original]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); if (value !== 'availability') setBlockId('') }}>{props.editorOnly ? modern : original}</button>)}</nav>
    <form onSubmit={event => void submit(event)} aria-label="Manuelle Planungsaktion">
      <h3>{props.editorOnly ? mode === 'task' ? 'Was möchtest du erledigen?' : mode === 'event' ? 'Welcher Termin steht an?' : mode === 'availability' ? 'Wann kannst du arbeiten?' : block ? 'Fokuszeit verschieben' : 'Wann möchtest du daran arbeiten?' : mode === 'task' ? 'Aufgabe erfassen' : mode === 'event' ? 'Feste Verpflichtung erfassen' : mode === 'availability' ? 'Verfügbarkeit erklären' : block ? 'Arbeitsblock verschieben' : 'Aufgabe planen'}</h3>
      <fieldset disabled={pending || !ready || Boolean(props.storageError)}>
        {(mode === 'task' || mode === 'event') && <label>Titel<input aria-label="Planungstitel" required value={title} onChange={event => setTitle(event.target.value)} /></label>}
        {mode === 'schedule' && <label>Aufgabe<select aria-label="Aufgabe für Arbeitsblock" value={taskId} onChange={event => schedule(event.target.value)}><option value="">Aufgabe wählen</option>{props.tasks.filter(task => task.status !== 'done').map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label>}
        {mode === 'task' && <label>Frist (optional, nur Datum)<input aria-label="Aufgabenfrist" type="date" value={deadline} onChange={event => setDeadline(event.target.value)} /></label>}
        {mode === 'task' && <p>Eine Datumsfrist gilt bis zum Ende des genannten Tages in {zone}. Sie reserviert keine Arbeitszeit.</p>}
        {(mode === 'task' || mode === 'schedule') && <label>Dauer in Minuten{mode === 'task' ? ' (optional)' : ''}<input aria-label="Arbeitsdauer in Minuten" type="number" min="1" max="10080" step="1" readOnly={Boolean(block)} value={duration} onChange={event => setDuration(event.target.value)} placeholder="Unbekannt — Eingabe erforderlich" /></label>}
        {mode !== 'task' && <label>Beginn<input aria-label="Planungsbeginn" required type="datetime-local" value={start} onChange={event => { setStart(event.target.value); setFold('') }} /></label>}
        {(mode === 'event' || mode === 'availability') && <label>Ende<input aria-label="Planungsende" required type="datetime-local" value={end} onChange={event => { setEnd(event.target.value); setEndFold('') }} /></label>}
        {startResolution.choices.length > 1 && <label>Beginn bei Zeitumstellung<select aria-label="Beginn Uhrzeitvorkommen" value={fold} onChange={event => setFold(event.target.value)}><option value="">Früheres oder späteres Vorkommen wählen</option>{startResolution.choices.map(choice => <option key={choice.instant} value={choice.instant}>{choice.instant} {choice.offsetLabel}</option>)}</select></label>}
        {endResolution.choices.length > 1 && <label>Ende bei Zeitumstellung<select aria-label="Ende Uhrzeitvorkommen" value={endFold} onChange={event => setEndFold(event.target.value)}><option value="">Vorkommen wählen</option>{endResolution.choices.map(choice => <option key={choice.instant} value={choice.instant}>{choice.instant} {choice.offsetLabel}</option>)}</select></label>}
        {(mode === 'schedule' || mode === 'event') && <label className="nx-planning-check"><input type="checkbox" checked={keepConflict} onChange={event => setKeepConflict(event.target.checked)} />{props.dayFirst || props.editorOnly ? 'Mögliche Konflikte oder unvollständige Kalenderdaten: trotzdem einplanen.' : 'Konflikte / unbekannte Abdeckung ausdrücklich behalten'}</label>}
        {mode === 'availability' && (props.dayFirst ? <details><summary>Kalenderdaten für den Tag bestätigen</summary><label className="nx-planning-check"><input type="checkbox" checked={completeCoverage} onChange={event => setCompleteCoverage(event.target.checked)} />Alle beschäftigten Quellen für den gewählten Tag sind enthalten.</label><p>Ohne diese ausdrückliche Bestätigung bleibt die Abdeckung unbekannt.</p></details> : <label className="nx-planning-check"><input type="checkbox" checked={completeCoverage} onChange={event => setCompleteCoverage(event.target.checked)} />Alle beschäftigten Quellen für den gewählten Tag sind enthalten.</label>)}
        {mode === 'schedule' && <p>Planen oder Verschieben ändert den Arbeitsblock. Die Aufgabenfrist bleibt erhalten. Eine fehlende Dauer wird nicht geschätzt.</p>}
        <button type="submit" disabled={result?.ok === true}>{pending ? 'Wird gespeichert …' : props.editorOnly ? mode === 'task' ? 'Aufgabe hinzufügen' : mode === 'event' ? 'Termin hinzufügen' : mode === 'availability' ? 'Verfügbarkeit speichern' : block ? 'Zeitänderung speichern' : 'Fokuszeit einplanen' : 'Planungsaktion speichern'}</button>
      </fieldset>
      {!props.dayFirst && feedback}
    </form>

    </>
  if (props.editorOnly) return <section className="nx-planning-panel nx-planning-editor" aria-label="Planungseditor">{derived.error && <p role="alert">{derived.error}</p>}{editor}</section>
  return <section className={`nx-planning-panel ${props.compact ? 'is-compact' : ''} ${props.dayFirst ? 'nx-planning-panel--day-first' : ''}`} aria-labelledby={`${label}-title`}>
    <header><div className="nx-agenda-heading"><h2 id={`${label}-title`}>{props.dayFirst ? 'Agenda' : 'Agenda / Tag'}</h2>{props.dayFirst && <><p className="nx-agenda-date">{dayTitle}</p><small>Zeiten in {zone}</small></>}</div><label>Tag<input aria-label="Agenda-Tag" type="date" value={day} onChange={event => { setDay(event.target.value); props.onDayChange?.(event.target.value) }} /></label>{!props.dayFirst && timezoneControl}</header>
    <p className="nx-planning-coverage" role="status">{props.dayFirst ? <><strong>{today?.coverage === 'complete' ? 'Kalenderdaten für diesen Tag bestätigt' : 'Kalenderdaten unvollständig'}</strong>{today?.coverage !== 'complete' && <span>Freie Zeit wird nicht automatisch angenommen.</span>}</> : today?.coverage === 'complete' ? 'Kalenderabdeckung für diesen Tag ausdrücklich bestätigt.' : 'Kalenderabdeckung unbekannt — Zeit wird nicht als frei bestätigt.'}</p>
    {derived.error && <p role="alert">{derived.error}</p>}
    {props.dayFirst ? <div className="nx-agenda-day" aria-label="Agenda für den gewählten Tag">
      <p className="nx-agenda-summary">{today?.openTaskCount || 0} offene Aufgaben · {today?.commitmentCount || 0} Termine und Arbeitsblöcke · {today?.reminderCount || 0} Erinnerungen</p>
      <section aria-labelledby={`${label}-scheduled`}><h3 id={`${label}-scheduled`}>Geplant an diesem Tag</h3>
        {!scheduled.length && <p className="nx-agenda-empty">Keine Termine, Arbeitsblöcke oder Erinnerungen angezeigt. Unbestätigte Zeit ist nicht automatisch frei.</p>}
        {scheduled.map(item => <article className="nx-agenda-row" key={`${item.kind}-${item.id}`}>
          <div className="nx-agenda-identity"><span className="nx-agenda-badge">{item.kind === 'event' ? 'Termin' : item.kind === 'block' ? 'Arbeitsblock' : 'Erinnerung'}</span><strong>{item.title}</strong><div className="nx-agenda-meta"><time dateTime={item.start}>{displayTime(item.start)}{'end' in item ? ` – ${displayTime(item.end)}` : ''}</time>{item.kind === 'block' && <span>{(Date.parse(item.end) - Date.parse(item.start)) / 60000} Min.</span>}{item.kind === 'reminder' && item.overdue && <span>Fällig</span>}{item.kind === 'block' && item.block.acceptedIssues.length > 0 && <span className="nx-agenda-badge">Konflikt / Unsicherheit bestätigt</span>}</div></div>
          {item.kind === 'block' && props.tasks.find(task => task.id === item.block.taskId)?.status !== 'done' && <button type="button" onClick={() => move(item.block)}>Zeit ändern</button>}
        </article>)}
      </section>
      <section aria-labelledby={`${label}-tasks`}><h3 id={`${label}-tasks`}>Aufgaben für diesen Tag</h3>
        {!today?.tasks.length && <p className="nx-agenda-empty">Keine offenen Aufgaben mit Frist oder Arbeitsblock an diesem Tag.</p>}
        {today?.tasks.map(item => <article className="nx-agenda-row" key={item.task.id}>
          <div className="nx-agenda-identity"><strong>{item.task.title}</strong>{taskMetadata(item.task, item.durationMinutes, item.blocked)}<div className="nx-agenda-meta">{item.reasons.map(reason => <span key={reason}>{reason}</span>)}</div></div>
          <div className="nx-agenda-actions"><button type="button" onClick={() => schedule(item.task.id)}>Planen</button><button type="button" disabled={pending || !ready || Boolean(props.storageError)} onClick={() => void complete(item.task)}>Abschließen</button>{props.onOpenTask && <button type="button" onClick={() => props.onOpenTask?.(item.task.id)}>Öffnen</button>}</div>
          {props.reminders.filter(reminder => reminder.linkedTaskId === item.task.id && !reminder.done).map(reminder => <label className="nx-planning-check nx-agenda-reminder-stop" key={reminder.id}><input type="checkbox" disabled={pending} aria-label={`Beim Abschluss Erinnerung stoppen: ${reminder.title}`} checked={stopReminderIds.includes(reminder.id)} onChange={event => setStopReminderIds(ids => event.target.checked ? [...ids, reminder.id] : ids.filter(id => id !== reminder.id))} />Beim Abschluss zusätzlich stoppen: {reminder.title} (ohne Auswahl erhalten)</label>)}
        </article>)}
      </section>
      {today?.issues.map((issue, index) => <p className="nx-planning-issue" key={`${issue.blockId}-${index}`}>{issue.message}</p>)}
      {today?.unresolvedBlocks.length ? <p role="alert">{today.unresolvedBlocks.length} Arbeitsblöcke mit fehlenden Aufgaben sind zur Reparatur erhalten.</p> : null}
      <details open className="nx-agenda-unscheduled"><summary>Noch zu planen · {unscheduled.length}</summary><div className="nx-agenda-unscheduled-list">{unscheduled.map(item => <article className="nx-agenda-row" key={item.id}><div className="nx-agenda-identity"><strong>{item.title}</strong>{taskMetadata(item, item.durationMinutes ?? props.planning.durations[item.id], Boolean(item.blocked || item.dependsOnTaskIds?.some(id => props.tasks.find(task => task.id === id)?.status !== 'done')))}{item.deadline && <small>Frist: {item.deadline}</small>}</div><button type="button" onClick={() => schedule(item.id)}>Planen</button></article>)}{!unscheduled.length && <p className="nx-agenda-empty">Keine weitere offene Arbeit ohne aktiven Arbeitsblock.</p>}</div></details>
      {today?.blocks.some(item => item.state === 'inactive') && <details className="nx-agenda-history"><summary>Erhaltene frühere Arbeitsblöcke</summary>{today.blocks.filter(item => item.state === 'inactive').map(item => <p key={item.id}>{props.tasks.find(task => task.id === item.taskId)?.title || 'Verknüpfte Aufgabe fehlt'} · {displayTime(item.start)} – {displayTime(item.end)} · Inaktiv</p>)}</details>}
    </div> : <div className="nx-planning-today" aria-label="Heute abgeleitete Elemente">
      <strong>{today?.openTaskCount || 0} offene Aufgaben · {today?.commitmentCount || 0} Verpflichtungen · {today?.reminderCount || 0} Erinnerungspunkte</strong>
      {today?.tasks.map(item => <article key={`task-${item.task.id}`}><span>Aufgabe: {item.task.title} · {item.reasons.join(', ')}{item.blocked ? ' · blockiert' : ''}{item.durationMinutes === undefined ? ' · Dauer unbekannt' : ` · ${item.durationMinutes} Min.`}</span><button type="button" onClick={() => schedule(item.task.id)}>Planen</button><button type="button" disabled={pending || !ready} onClick={() => void complete(item.task)}>Abschließen</button>{props.onOpenTask && <button type="button" onClick={() => props.onOpenTask?.(item.task.id)}>Öffnen</button>}{props.reminders.filter(reminder => reminder.linkedTaskId === item.task.id && !reminder.done).map(reminder => <label className="nx-planning-check" key={reminder.id}><input type="checkbox" disabled={pending} aria-label={`Beim Abschluss Erinnerung stoppen: ${reminder.title}`} checked={stopReminderIds.includes(reminder.id)} onChange={event => setStopReminderIds(ids => event.target.checked ? [...ids, reminder.id] : ids.filter(id => id !== reminder.id))} />Beim Abschluss zusätzlich stoppen: {reminder.title} (ohne Auswahl erhalten)</label>)}</article>)}
      {today?.events.map(item => <article key={`event-${item.id}`}>Feste Verpflichtung: {item.title} · {planningInstantToLocal(item.start, item.timeZone)} – {planningInstantToLocal(item.end, item.timeZone)}</article>)}
      {today?.blocks.map(item => <article key={`block-${item.id}`} className={item.state === 'inactive' ? 'is-inactive' : ''}><span>Arbeitsblock: {props.tasks.find(task => task.id === item.taskId)?.title || 'Verknüpfte Aufgabe fehlt'} · {planningInstantToLocal(item.start, item.timeZone)} – {planningInstantToLocal(item.end, item.timeZone)} · {item.state === 'inactive' ? 'inaktiv nach Abschluss (erhalten)' : 'aktiv'}{item.acceptedIssues.length ? ' · bestätigter Konflikt / Unsicherheit' : ''}</span>{item.state === 'active' && props.tasks.find(task => task.id === item.taskId)?.status !== 'done' && <button type="button" onClick={() => move(item)}>Zeit ändern</button>}</article>)}
      {today?.reminderPoints.map(item => <article key={item.occurrenceId}>Erinnerungspunkt: {item.title} · {planningInstantToLocal(item.snoozeUntil || item.datetime, zone)}</article>)}
      {today?.issues.map((issue, index) => <p className="nx-planning-issue" key={`${issue.blockId}-${index}`}>{issue.message}</p>)}
      {today?.unresolvedBlocks.length ? <p role="alert">{today.unresolvedBlocks.length} Arbeitsblöcke mit fehlenden Aufgaben sind zur Reparatur erhalten.</p> : null}
    </div>}
    {!props.dayFirst && <details open className="nx-planning-unscheduled"><summary>Ungeplante Arbeit</summary>{unscheduled.map(task => <div key={task.id}><span>{task.title}{task.blocked ? ' · blockiert' : ''}</span><button type="button" onClick={() => schedule(task.id)}>Planen</button></div>)}</details>}
    {props.dayFirst && feedback}
    {renderEditor(editor)}

    {renderAdvanced(<>
    {props.entityCatalog && <details><summary>Aufgaben-Kontext und Reparatur</summary>{props.tasks.map(item => <TaskContextLinks key={item.id} task={item} catalog={props.entityCatalog!} planning={props.planning} execute={props.execute} onOpen={props.onOpenEntity} />)}</details>}
    <PlanningIcsPanel planning={props.planning} timeZone={zone} ready={ready && !pending && !props.storageError} execute={props.execute} />
    </>)}
  </section>
}
