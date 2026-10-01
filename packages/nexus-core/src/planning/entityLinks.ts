import { canonicalContent, type TaskRecord } from './domain'

export type EntityRef = { kind: 'note'; id: string } | { kind: 'canvas-node'; canvasId: string; id: string }
export type EntityCatalog = { notes: { id: string; title: string; content: string; [key: string]: unknown }[]; canvases: { id: string; name: string; nodes: { id: string; title: string; content: string; [key: string]: unknown }[] }[] }
export type ResolvedEntity = { ref: EntityRef; title: string; summary: string; revision: string }
export const entityIdentity = (ref: EntityRef) => ref.kind === 'note' ? `note:${JSON.stringify(ref.id)}` : `canvas-node:${JSON.stringify([ref.canvasId, ref.id])}`
export function validEntityRef(value: unknown): value is EntityRef {
  const ref = value as EntityRef
  return Boolean(ref && typeof ref.id === 'string' && ref.id && (ref.kind === 'note' || ref.kind === 'canvas-node' && typeof ref.canvasId === 'string' && ref.canvasId))
}
export function resolveEntity(catalog: EntityCatalog, ref: EntityRef): ResolvedEntity | null {
  if (!validEntityRef(ref)) return null
  const candidates = ref.kind === 'note' ? catalog.notes.filter(note => note.id === ref.id) : catalog.canvases.filter(canvas => canvas.id === ref.canvasId).flatMap(canvas => canvas.nodes.filter(node => node.id === ref.id))
  if (candidates.length !== 1) return null
  const source = candidates[0]
  return { ref: structuredClone(ref), title: source.title || (ref.kind === 'note' ? 'Notiz' : 'Canvas-Knoten'), summary: source.content.replace(/[#*`\[\]()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220), revision: canonicalContent(source) }
}
export function taskEntityLinks(task: TaskRecord, catalog: EntityCatalog): { ref: EntityRef | null; kind: 'note' | 'canvas-node'; legacyId?: string; resolved: ResolvedEntity | null; message?: string }[] {
  const typed = Array.isArray(task.entityLinks) ? task.entityLinks.filter(validEntityRef) : []
  const rows = typed.map(ref => ({ ref, kind: ref.kind, resolved: resolveEntity(catalog, ref) }))
  if (typeof task.linkedNoteId === 'string' && task.linkedNoteId && !typed.some(ref => ref.kind === 'note' && ref.id === task.linkedNoteId)) rows.push({ ref: { kind: 'note', id: task.linkedNoteId }, kind: 'note', resolved: resolveEntity(catalog, { kind: 'note', id: task.linkedNoteId }) })
  if (typeof task.linkedCanvasNodeId === 'string' && task.linkedCanvasNodeId && !typed.some(ref => ref.kind === 'canvas-node' && ref.id === task.linkedCanvasNodeId)) {
    const matches = catalog.canvases.flatMap(canvas => canvas.nodes.filter(node => node.id === task.linkedCanvasNodeId).map(node => ({ kind: 'canvas-node' as const, canvasId: canvas.id, id: node.id })))
    if (matches.length === 1) rows.push({ ref: matches[0], kind: 'canvas-node', resolved: resolveEntity(catalog, matches[0]) })
    else return [...rows, { ref: null, kind: 'canvas-node', legacyId: task.linkedCanvasNodeId, resolved: null, message: matches.length ? 'Alte Knoten-ID ist in mehreren Canvas-Projekten vorhanden. Projekt ausdrücklich wählen.' : 'Verknüpfter Canvas-Knoten fehlt. Alte ID bleibt bis zur Reparatur erhalten.' }]
  }
  return rows
}
