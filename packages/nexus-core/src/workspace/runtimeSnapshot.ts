export type RuntimeState = {
  notes: { id: string }[]; codes: { id: string }[]; tasks: { id: string }[]
  reminders: { id: string }[]; folders: { id: string }[]
  canvases: { id: string }[]; workspaces: { id: string }[]
  openNoteIds: string[]; activeNoteId: string | null
  openCodeIds: string[]; activeCodeId: string | null
  activeCanvasId: string | null; activeWorkspaceId: string | null
}
export type RuntimeSnapshot<S extends RuntimeState = RuntimeState> = { version: 1; app: string; exportedAt: string; state: S }
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const strings = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string')
function requireField(ok: unknown, path: string): asserts ok { if (!ok) throw new Error(`Invalid runtime snapshot: ${path}`) }
function entities(value: unknown, path: string): Record<string, unknown>[] {
  requireField(Array.isArray(value), path)
  const ids = new Set<string>()
  for (const item of value) {
    requireField(record(item) && typeof item.id === 'string' && item.id.length && !ids.has(item.id), `${path}.id`)
    ids.add(item.id)
  }
  return value
}
function textFields(item: Record<string, unknown>, keys: string[], path: string) {
  for (const key of keys) requireField(typeof item[key] === 'string', `${path}.${key}`)
}

/** Complete version-1 input only. Unknown entity metadata is preserved, never spread into a store. */
export function validateRuntimeSnapshot(value: unknown): asserts value is RuntimeSnapshot {
  requireField(record(value) && value.version === 1, 'version')
  requireField(typeof value.app === 'string' && typeof value.exportedAt === 'string' && Number.isFinite(Date.parse(value.exportedAt)), 'app/exportedAt')
  requireField(record(value.state), 'state')
  const s = value.state
  const keys = ['notes', 'codes', 'tasks', 'reminders', 'folders', 'canvases', 'workspaces', 'openNoteIds', 'activeNoteId', 'openCodeIds', 'activeCodeId', 'activeCanvasId', 'activeWorkspaceId']
  requireField(Object.keys(s).every(key => keys.includes(key)), 'unsupported state fields')
  for (const key of ['openNoteIds', 'openCodeIds']) requireField(strings(s[key]), key)
  for (const key of ['activeNoteId', 'activeCodeId', 'activeCanvasId', 'activeWorkspaceId']) requireField(s[key] === null || typeof s[key] === 'string', key)
  for (const n of entities(s.notes, 'notes')) {
    textFields(n, ['title', 'content', 'created', 'updated'], 'notes')
    requireField(strings(n.tags) && typeof n.dirty === 'boolean', 'notes.tags/dirty')
  }
  for (const c of entities(s.codes, 'codes')) {
    textFields(c, ['name', 'content', 'lang', 'created', 'updated'], 'codes')
    requireField(typeof c.dirty === 'boolean', 'codes.dirty')
  }
  for (const t of entities(s.tasks, 'tasks')) {
    textFields(t, ['title', 'desc', 'created', 'updated'], 'tasks')
    requireField(['todo', 'doing', 'done'].includes(String(t.status)) && ['low', 'mid', 'high'].includes(String(t.priority)) && strings(t.tags), 'tasks.status/priority/tags')
    for (const sub of entities(t.subtasks, 'tasks.subtasks')) requireField(typeof sub.title === 'string' && typeof sub.done === 'boolean', 'tasks.subtasks')
  }
  for (const r of entities(s.reminders, 'reminders')) {
    textFields(r, ['title', 'msg', 'datetime'], 'reminders')
    requireField(typeof r.done === 'boolean' && ['none', 'daily', 'weekly', 'monthly'].includes(String(r.repeat)), 'reminders.done/repeat')
  }
  for (const f of entities(s.folders, 'folders')) requireField(typeof f.name === 'string' && (f.parentId === null || typeof f.parentId === 'string'), 'folders.name/parentId')
  for (const b of entities(s.canvases, 'canvases')) {
    textFields(b, ['name'], 'canvases')
    for (const n of entities(b.nodes, 'canvases.nodes')) {
      textFields(n, ['type', 'title', 'content'], 'nodes')
      for (const key of ['x', 'y', 'width', 'height']) requireField(typeof n[key] === 'number' && Number.isFinite(n[key]), `nodes.${key}`)
    }
    for (const e of entities(b.connections, 'connections')) textFields(e, ['fromId', 'toId'], 'connections')
  }
  for (const w of entities(s.workspaces, 'workspaces')) {
    textFields(w, ['name', 'icon', 'color', 'created', 'lastAccessed'], 'workspaces')
    for (const key of ['noteIds', 'codeIds', 'taskIds', 'reminderIds', 'canvasIds']) requireField(strings(w[key]), `workspaces.${key}`)
  }
}

export function parseRuntimeSnapshot(raw: string): RuntimeSnapshot | null {
  try { const parsed: unknown = JSON.parse(raw); validateRuntimeSnapshot(parsed); return parsed } catch { return null }
}
export function createRuntimeSnapshot<S extends RuntimeState>(app: string, state: S): RuntimeSnapshot<S> {
  const snapshot = JSON.parse(JSON.stringify({ version: 1, app, exportedAt: new Date().toISOString(), state }))
  validateRuntimeSnapshot(snapshot)
  return snapshot as RuntimeSnapshot<S>
}
