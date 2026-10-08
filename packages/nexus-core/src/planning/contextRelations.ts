import type { TaskRecord } from './domain'
import { entityIdentity, validEntityRef, type EntityCatalog, type EntityRef } from './entityLinks'

export type ContextLink = {
  key: string; kind: EntityRef['kind']; ref: EntityRef | null; legacyId?: string
  state: 'resolved' | 'missing' | 'ambiguous'; title: string; summary: string; canvasTitle?: string
}
export type ContextUsage = Pick<TaskRecord, 'id' | 'title' | 'status'>
export const activeContextUsage = (usage: ContextUsage[] = []) => usage.filter(task => task.status !== 'done')

/** Reconstructable relationship index. Tasks alone own links; content owners stay untouched. */
export function buildContextRelations(tasks: TaskRecord[], catalog: EntityCatalog) {
  type Source = { title: string; content: string; canvasTitle?: string; ambiguous?: boolean }
  const sources = new Map<string, Source[]>(), legacyNodes = new Map<string, EntityRef[]>()
  const canvasIds = new Map<string, number>()
  for (const canvas of catalog.canvases) canvasIds.set(canvas.id, (canvasIds.get(canvas.id) || 0) + 1)
  const append = <T>(map: Map<string, T[]>, key: string, value: T) => { const values = map.get(key); if (values) values.push(value); else map.set(key, [value]) }
  for (const note of catalog.notes) append(sources, entityIdentity({ kind: 'note', id: note.id }), note)
  for (const canvas of catalog.canvases) for (const node of canvas.nodes) {
    const ref: EntityRef = { kind: 'canvas-node', canvasId: canvas.id, id: node.id }
    // Retain the source object so only referenced content is summarized, once per identity.
    append(sources, entityIdentity(ref), { get title() { return node.title }, get content() { return node.content }, canvasTitle: canvas.name, ambiguous: canvasIds.get(canvas.id)! > 1 })
    append(legacyNodes, node.id, ref)
  }
  const resolved = new Map<string, ContextLink>()
  const read = (ref: EntityRef): ContextLink => {
    const key = entityIdentity(ref), cached = resolved.get(key)
    if (cached) return cached
    const matches = sources.get(key) || [], source = matches.length === 1 && !matches[0].ambiguous ? matches[0] : null
    const link: ContextLink = { key, kind: ref.kind, ref: { ...ref }, state: source ? 'resolved' : matches.length ? 'ambiguous' : 'missing',
      title: source?.title || (ref.kind === 'note' ? 'Verknüpfte Notiz' : 'Verknüpfter Canvas-Knoten'),
      summary: source ? source.content.replace(/[#*`\[\]()]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220) : '', canvasTitle: source?.canvasTitle }
    resolved.set(key, link)
    return link
  }
  const byTask = new Map<string, ContextLink[]>(), byEntity = new Map<string, ContextUsage[]>(), byCanvas = new Map<string, ContextUsage[]>()
  for (const task of tasks) {
    const typed = Array.isArray(task.entityLinks) ? task.entityLinks.filter(validEntityRef) : []
    const refs = [...typed]
    if (typeof task.linkedNoteId === 'string' && task.linkedNoteId && !typed.some(ref => ref.kind === 'note' && ref.id === task.linkedNoteId)) refs.push({ kind: 'note', id: task.linkedNoteId })
    let legacy: ContextLink | undefined
    if (typeof task.linkedCanvasNodeId === 'string' && task.linkedCanvasNodeId && !typed.some(ref => ref.kind === 'canvas-node' && ref.id === task.linkedCanvasNodeId)) {
      const matches = legacyNodes.get(task.linkedCanvasNodeId) || []
      if (matches.length === 1) refs.push(matches[0])
      else legacy = { key: `legacy:${task.linkedCanvasNodeId}`, kind: 'canvas-node', ref: null, legacyId: task.linkedCanvasNodeId, state: matches.length ? 'ambiguous' : 'missing', title: 'Alter Canvas-Link', summary: '' }
    }
    const links = [...new Map(refs.map(ref => [entityIdentity(ref), read(ref)])).values(), ...(legacy ? [legacy] : [])]
    byTask.set(task.id, links)
    const usage: ContextUsage = { id: task.id, title: task.title, status: task.status }, usedCanvases = new Set<string>()
    for (const link of links) if (link.state === 'resolved' && link.ref) {
      append(byEntity, link.key, usage)
      if (link.ref.kind === 'canvas-node') usedCanvases.add(link.ref.canvasId)
    }
    for (const id of usedCanvases) append(byCanvas, id, usage)
  }
  for (const index of [byEntity, byCanvas]) for (const usage of index.values()) usage.sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return { byTask, byEntity, byCanvas }
}

export function readContextRelations(tasks: TaskRecord[], catalog: EntityCatalog) {
  try { return { model: buildContextRelations(tasks, catalog), error: '' } }
  catch { return { model: null, error: 'Kontext konnte nicht ausgewertet werden. Deine Inhalte und Verknüpfungen bleiben erhalten.' } }
}
