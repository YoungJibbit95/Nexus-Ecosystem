import { createRuntimeSnapshot, type RuntimeState } from './runtimeSnapshot'

export type SnapshotSection = 'notes' | 'codes' | 'tasks' | 'reminders' | 'canvases' | 'workspaces'
export type HandoffSelection = Record<SnapshotSection, boolean>
const sections: SnapshotSection[] = ['notes', 'codes', 'tasks', 'reminders', 'canvases', 'workspaces']
const mergeById = <T extends { id: string }>(current: T[], incoming: T[]) => {
  const result = new Map(current.map(item => [item.id, item]))
  incoming.forEach(item => result.set(item.id, item))
  return [...result.values()]
}

/** Only navigation references are normalized. Entity metadata and unresolved relations survive. */
export function normalizeRuntimeSelection<S extends RuntimeState>(state: S): S {
  const result = { ...state }
  const active = (id: string | null, items: { id: string }[], fallback?: string[]) =>
    id && items.some(item => item.id === id) ? id : fallback?.[0] ?? items[0]?.id ?? null
  result.openNoteIds = [...new Set(state.openNoteIds.filter(id => state.notes.some(item => item.id === id)))]
  result.openCodeIds = [...new Set(state.openCodeIds.filter(id => state.codes.some(item => item.id === id)))]
  result.activeNoteId = active(state.activeNoteId, state.notes, result.openNoteIds)
  result.activeCodeId = active(state.activeCodeId, state.codes, result.openCodeIds)
  result.activeCanvasId = active(state.activeCanvasId, state.canvases)
  result.activeWorkspaceId = active(state.activeWorkspaceId, state.workspaces)
  return result
}

/** Incoming IDs win only in selected sections; merge never treats an empty section as deletion. */
export function mergeRuntimeState<S extends RuntimeState>(current: S, incoming: S, mode: 'replace' | 'merge', selected: HandoffSelection): S {
  // Validate both full states before selecting anything; malformed unselected data is not ignored.
  createRuntimeSnapshot('Handoff current', current)
  createRuntimeSnapshot('Handoff incoming', incoming)
  if (mode === 'replace') return normalizeRuntimeSelection(createRuntimeSnapshot('Handoff replacement', incoming).state)
  const result = { ...current }
  for (const section of sections) {
    if (selected[section]) result[section] = mergeById(current[section], incoming[section]) as S[typeof section]
  }
  for (const [section, openKey, activeKey] of [
    ['notes', 'openNoteIds', 'activeNoteId'], ['codes', 'openCodeIds', 'activeCodeId'],
  ] as const) {
    if (selected[section]) result[openKey] = [...new Set([...current[openKey], ...incoming[openKey]])]
    if (selected[section] && !result[section].some(item => item.id === current[activeKey])) result[activeKey] = incoming[activeKey]
  }
  if (selected.canvases && !result.canvases.some(item => item.id === current.activeCanvasId)) result.activeCanvasId = incoming.activeCanvasId
  if (selected.workspaces && !result.workspaces.some(item => item.id === current.activeWorkspaceId)) result.activeWorkspaceId = incoming.activeWorkspaceId

  // Include definitions (and ancestor definitions) used by imported selected records. A folder
  // collision preserves the current definition so unselected local records do not change folders.
  const needed = new Set<string>()
  for (const section of ['notes', 'codes', 'tasks', 'reminders'] as const) {
    if (selected[section]) for (const item of incoming[section]) {
      const folderId = (item as { folderId?: unknown }).folderId
      if (typeof folderId === 'string') needed.add(folderId)
    }
  }
  const definitions = new Map(incoming.folders.map(item => [item.id, item]))
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    const folder = definitions.get(id)
    if (!folder) return // Preserve a broken relation for later repair, never invent a folder.
    const parentId = (folder as { parentId?: unknown }).parentId
    if (typeof parentId === 'string') visit(parentId)
    if (!result.folders.some(item => item.id === id)) result.folders = [...result.folders, folder]
  }
  needed.forEach(visit)
  return normalizeRuntimeSelection(createRuntimeSnapshot('Handoff merged', result).state)
}
