const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const strings = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === 'string')
const nullableString = (value: unknown) => value === null || typeof value === 'string'
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
function requireValue(ok: unknown, path: string): asserts ok { if (!ok) throw new Error(`Invalid backup field: ${path}`) }
function records(value: unknown, path: string): Record<string, unknown>[] {
  requireValue(Array.isArray(value), path)
  const ids = new Set<string>()
  for (const item of value) {
    requireValue(record(item) && typeof item.id === 'string' && item.id.length > 0 && !ids.has(item.id), `${path}.id`)
    ids.add(item.id)
  }
  return value
}
function slice(value: unknown, path: string, keys: string[]): Record<string, unknown> {
  requireValue(record(value), path)
  requireValue(Object.keys(value).every(key => keys.includes(key)), `${path} (unsupported fields)`)
  return value
}

/** Strict at state boundaries, preserving unknown metadata inside valid entities. */
export function validateWorkspaceBackupData(value: unknown) {
  const data = slice(value, 'data', ['app', 'canvas', 'workspaces', 'workspaceFs', 'terminal', 'theme'])
  const app = slice(data.app, 'app', ['notes', 'openNoteIds', 'activeNoteId', 'codes', 'openCodeIds', 'activeCodeId', 'tasks', 'reminders', 'folders', 'activities'])
  for (const key of ['openNoteIds', 'openCodeIds']) requireValue(strings(app[key]), `app.${key}`)
  for (const key of ['activeNoteId', 'activeCodeId']) requireValue(nullableString(app[key]), `app.${key}`)
  for (const note of records(app.notes, 'notes')) {
    for (const key of ['title', 'content', 'created', 'updated']) requireValue(typeof note[key] === 'string', `notes.${key}`)
    requireValue(strings(note.tags) && typeof note.dirty === 'boolean', 'notes.tags/dirty')
  }
  for (const code of records(app.codes, 'codes')) {
    for (const key of ['name', 'lang', 'content', 'created', 'updated']) requireValue(typeof code[key] === 'string', `codes.${key}`)
    requireValue(typeof code.dirty === 'boolean', 'codes.dirty')
  }
  for (const task of records(app.tasks, 'tasks')) {
    for (const key of ['title', 'desc', 'created', 'updated']) requireValue(typeof task[key] === 'string', `tasks.${key}`)
    requireValue(['todo', 'doing', 'done'].includes(String(task.status)), 'tasks.status')
    requireValue(['low', 'mid', 'high'].includes(String(task.priority)), 'tasks.priority')
    requireValue(strings(task.tags), 'tasks.tags')
    for (const sub of records(task.subtasks, 'tasks.subtasks')) requireValue(typeof sub.title === 'string' && typeof sub.done === 'boolean', 'tasks.subtasks')
  }
  for (const rem of records(app.reminders, 'reminders')) {
    for (const key of ['title', 'msg', 'datetime']) requireValue(typeof rem[key] === 'string', `reminders.${key}`)
    requireValue(typeof rem.done === 'boolean' && ['none', 'daily', 'weekly', 'monthly'].includes(String(rem.repeat)), 'reminders.done/repeat')
  }
  for (const folder of records(app.folders, 'folders')) requireValue(typeof folder.name === 'string' && nullableString(folder.parentId), 'folders.name/parentId')
  for (const activity of records(app.activities, 'activities')) {
    for (const key of ['type', 'action', 'targetName', 'timestamp']) requireValue(typeof activity[key] === 'string', `activities.${key}`)
  }
  const canvas = slice(data.canvas, 'canvas', ['canvases', 'activeCanvasId', 'viewport'])
  requireValue(nullableString(canvas.activeCanvasId), 'canvas.activeCanvasId')
  requireValue(record(canvas.viewport) && ['panX', 'panY', 'zoom'].every(key => finite(canvas.viewport[key])) && Number(canvas.viewport.zoom) > 0, 'canvas.viewport')
  for (const board of records(canvas.canvases, 'canvases')) {
    requireValue(typeof board.name === 'string', 'canvases.name')
    for (const node of records(board.nodes, 'canvases.nodes')) {
      for (const key of ['type', 'title', 'content']) requireValue(typeof node[key] === 'string', `nodes.${key}`)
      for (const key of ['x', 'y', 'width', 'height']) requireValue(finite(node[key]), `nodes.${key}`)
    }
    for (const edge of records(board.connections, 'canvases.connections')) requireValue(typeof edge.fromId === 'string' && typeof edge.toId === 'string', 'connections.endpoints')
  }
  const workspaces = slice(data.workspaces, 'workspaces', ['workspaces', 'activeWorkspaceId'])
  requireValue(nullableString(workspaces.activeWorkspaceId), 'workspaces.activeWorkspaceId')
  for (const workspace of records(workspaces.workspaces, 'workspaces.workspaces')) {
    for (const key of ['name', 'icon', 'color', 'created', 'lastAccessed']) requireValue(typeof workspace[key] === 'string', `workspaces.${key}`)
    for (const key of ['noteIds', 'codeIds', 'taskIds', 'reminderIds', 'canvasIds']) requireValue(strings(workspace[key]), `workspaces.${key}`)
  }
  const fs = slice(data.workspaceFs, 'workspaceFs', ['rootPath', 'autoSync', 'lastSyncAt', 'lastSyncMode'])
  requireValue(typeof fs.rootPath === 'string' && typeof fs.autoSync === 'boolean' && nullableString(fs.lastSyncAt), 'workspaceFs')
  requireValue(fs.lastSyncMode === null || ['import', 'export', 'runtime-import', 'runtime-export'].includes(String(fs.lastSyncMode)), 'workspaceFs.lastSyncMode')
  const terminal = slice(data.terminal, 'terminal', ['history', 'lastCommand', 'macros', 'recordingMacro', 'undoStack', 'redoStack'])
  requireValue(Array.isArray(terminal.history) && typeof terminal.lastCommand === 'string', 'terminal.history/lastCommand')
  requireValue(record(terminal.macros) && Object.values(terminal.macros).every(strings), 'terminal.macros')
  requireValue(nullableString(terminal.recordingMacro) && strings(terminal.undoStack) && strings(terminal.redoStack), 'terminal.stacks')
  if (data.theme !== undefined) requireValue(record(data.theme) && ['v5', 'v6'].includes(String(data.theme.version)), 'theme.version')
}
