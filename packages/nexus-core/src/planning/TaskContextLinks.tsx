import React, { useState } from 'react'
import { taskRevision, type PlanningDocument, type TaskRecord } from './domain'
import { taskEntityLinks, type EntityCatalog, type EntityRef } from './entityLinks'
import type { PlanningCommand, PlanningCommandResult } from './commandService'

export function TaskContextLinks({ task, catalog, planning, execute, onOpen }: { key?: string; task: TaskRecord; catalog: EntityCatalog; planning: PlanningDocument; execute: (command: PlanningCommand) => Promise<PlanningCommandResult>; onOpen?: (ref: EntityRef) => void }) {
  const [selection, setSelection] = useState(''), [result, setResult] = useState<PlanningCommandResult | null>(null), [pending, setPending] = useState(false), [open, setOpen] = useState(false)
  const options = open ? [...catalog.notes.map(note => ({ ref: { kind: 'note' as const, id: note.id }, label: `Notiz: ${note.title || note.id}` })), ...catalog.canvases.flatMap(canvas => canvas.nodes.map(node => ({ ref: { kind: 'canvas-node' as const, canvasId: canvas.id, id: node.id }, label: `Canvas: ${canvas.name} / ${node.title || node.id}` })))] : []
  const repair = async (kind: EntityRef['kind'], ref: EntityRef | null) => {
    setPending(true)
    try { setResult(await execute({ kind: 'repair-task-link', key: crypto.randomUUID(), expected: { generation: planning.generation, revision: planning.revision, taskRevision: taskRevision(task) }, taskId: task.id, linkKind: kind, ref })) }
    catch (error) { setResult({ ok: false, code: 'storage-failure', message: String(error instanceof Error ? error.message : error) }) }
    finally { setPending(false) }
  }
  return <details aria-label={`Kontextverknüpfungen: ${task.title}`} onToggle={event => setOpen(event.currentTarget.open)}><summary>{task.title}: Notiz / Canvas Kontext</summary>{open && <>
    {taskEntityLinks(task, catalog).map((link, index) => <p key={index}>{link.resolved ? `${link.kind === 'note' ? 'Notiz' : 'Canvas'}: ${link.resolved.title}` : link.message || 'Verknüpftes Ziel fehlt; Referenz ist zur Reparatur erhalten.'}{link.ref && link.resolved && onOpen && <button type="button" onClick={() => onOpen(link.ref!)}>Ziel fokussieren</button>}<button type="button" disabled={pending} onClick={() => void repair(link.kind, null)}>Diese Verknüpfung ausdrücklich entfernen</button></p>)}
    <label>Ziel auswählen<select aria-label={`Typisiertes Kontextziel: ${task.title}`} value={selection} disabled={pending} onChange={event => setSelection(event.target.value)}><option value="">Notiz oder Canvas-Knoten wählen</option>{options.map(({ ref, label }) => <option key={JSON.stringify(ref)} value={JSON.stringify(ref)}>{label}</option>)}</select></label>
    <button type="button" disabled={pending || !selection} onClick={() => { const ref = JSON.parse(selection) as EntityRef; void repair(ref.kind, ref) }}>Verknüpfung dauerhaft speichern</button>
    {result && <p role={result.ok === true ? 'status' : 'alert'}>{result.ok === true ? `Verknüpfung dauerhaft bestätigt: ${result.ids.join(', ')}.` : result.message}</p>}
  </>}</details>
}
