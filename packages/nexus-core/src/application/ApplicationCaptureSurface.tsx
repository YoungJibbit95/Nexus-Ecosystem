import React, { useEffect, useId, useRef, useState } from 'react'
import { closeApplicationCapture, useApplicationCapture, type CaptureClient, type CaptureRequest } from './captureNavigation'
import type { ApplicationCaptureCommand, createApplicationCommandOwner } from './applicationCommands'
import './applicationCapture.css'

type Owner = ReturnType<typeof createApplicationCommandOwner>
export function ApplicationCaptureSurface({ client, owner, navigate }: { client: CaptureClient; owner: Owner; navigate: (view: string) => void }) {
  const request = useApplicationCapture(client)
  return request ? <CaptureDialog key={request.requestId} client={client} request={request} owner={owner} navigate={navigate} /> : null
}
function CaptureDialog({ client, request, owner, navigate }: { key?: string; client: CaptureClient; request: CaptureRequest; owner: Owner; navigate: (view: string) => void }) {
  const label = useId(), dialog = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState(request.initialTitle ?? (request.kind === 'note' ? 'Untitled' : 'New Reminder'))
  const [content, setContent] = useState(request.kind === 'note' ? '# Untitled\n\n' : '')
  const [datetime, setDatetime] = useState(request.reminderInstant), [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [expected, setExpected] = useState(owner.expected), [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Noch nicht gespeichert.'), [savedId, setSavedId] = useState<string | null>(null)
  const destination = request.kind === 'note' ? 'notes' : 'reminders'
  const close = () => { if (!busy) closeApplicationCapture(client, request.requestId) }
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.querySelector<HTMLInputElement>('input')?.focus(); return () => { if (previous?.isConnected) previous.focus() } }, [])
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy || savedId) return
    const base = { key: `application:${request.requestId}`, expected }
    const command: ApplicationCaptureCommand = request.kind === 'note' ? { ...base, kind: 'capture-note', fields: { title, content } } : { ...base, kind: 'capture-reminder', fields: { title, msg: content, datetime, repeat } }
    setBusy(true); setMessage('Speicherung wird bestätigt …')
    try {
      const result = await owner.execute(command)
      if (result.ok === true) { setSavedId(result.id); setMessage(`Gespeichert. ID: ${result.id}`) }
      else { setMessage(result.message); if (result.code === 'stale') setExpected(owner.expected()) }
    } finally { setBusy(false) }
  }
  return <div data-application-capture={client} className="nx-application-capture">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${label}-heading`} aria-describedby={`${label}-status`} className="nx-application-capture-dialog" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
      if (event.key === 'Tab') { const focusable = [...dialog.current!.querySelectorAll<HTMLElement>('input:not(:disabled),textarea:not(:disabled),select:not(:disabled),button:not(:disabled)')]; const first = focusable[0], last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() } }
    }}>
      <h2 id={`${label}-heading`}>{request.kind === 'note' ? 'Notiz erfassen' : 'Reminder erfassen'}</h2>
      <p>Ziel: {destination === 'notes' ? 'Notes' : 'Reminders'}. Erst „Speichern“ erstellt einen Datensatz.</p>
      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label htmlFor={`${label}-title`}>Titel</label><input id={`${label}-title`} value={title} onChange={event => setTitle(event.target.value)} required disabled={busy || Boolean(savedId)} />
        <label htmlFor={`${label}-content`}>{request.kind === 'note' ? 'Inhalt' : 'Nachricht'}</label><textarea id={`${label}-content`} value={content} onChange={event => setContent(event.target.value)} rows={5} disabled={busy || Boolean(savedId)} />
        {request.kind === 'reminder' && <><label htmlFor={`${label}-datetime`}>Zeitpunkt (ISO 8601 mit UTC/Offset)</label><input id={`${label}-datetime`} value={datetime} onChange={event => setDatetime(event.target.value)} required disabled={busy || Boolean(savedId)} /><p>Vorgabe: eine Stunde nach Öffnen. Wiederholungen verwenden die bestehende UTC-Kadenz.</p><label htmlFor={`${label}-repeat`}>Wiederholung</label><select id={`${label}-repeat`} value={repeat} onChange={event => setRepeat(event.target.value as typeof repeat)} disabled={busy || Boolean(savedId)}><option value="none">Keine</option><option value="daily">Täglich (UTC)</option><option value="weekly">Wöchentlich (UTC)</option><option value="monthly">Monatlich (UTC)</option></select></>}
        <p id={`${label}-status`} role="status" aria-live="polite">{message}</p>
        <div className="nx-application-capture-actions"><button type="button" onClick={close} disabled={busy}>{savedId ? 'Schließen' : 'Abbrechen'}</button>{savedId ? <button type="button" onClick={() => { close(); navigate(destination) }}>Öffnen</button> : <button type="submit" disabled={busy}>Speichern</button>}</div>
      </form>
    </div>
  </div>
}
