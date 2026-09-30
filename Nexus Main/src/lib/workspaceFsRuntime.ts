import { createRuntimeSnapshot, parseRuntimeSnapshot as parseSharedRuntimeSnapshot } from '@nexus/core/workspace/runtimeSnapshot'
import type { Note, CodeFile, Task, Reminder, Folder } from '../store/appStore'
import type { Workspace } from '../store/workspaceStore'
import type { Canvas } from '../store/canvasStore'
import { WORKSPACE_EXPORT_DIRNAME } from '../store/workspaceFsStore'

export const WORKSPACE_RUNTIME_FILE = 'state/runtime.json'

export type FsApi = {
  read?: (path: string) => Promise<{ ok: boolean; data?: string; error?: string; code?: string }>
  write?: (path: string, content: string) => Promise<{ ok: boolean; error?: string }>
}

export type WorkspaceRuntimeSnapshot = {
  version: 1
  exportedAt: string
  app: string
  state: {
    notes: Note[]
    openNoteIds: string[]
    activeNoteId: string | null
    codes: CodeFile[]
    openCodeIds: string[]
    activeCodeId: string | null
    tasks: Task[]
    reminders: Reminder[]
    folders: Folder[]
    canvases: Canvas[]
    activeCanvasId: string | null
    workspaces: Workspace[]
    activeWorkspaceId: string | null
  }
}

const stripTrailingSeparators = (value: string) => value.replace(/[\\/]+$/, '')

export const joinFsPath = (root: string, ...segments: string[]) =>
  `${stripTrailingSeparators(root)}/${segments.join('/')}`

export const resolveWorkspaceRootPath = (rootPath: string) =>
  joinFsPath(rootPath, WORKSPACE_EXPORT_DIRNAME)

export const resolveWorkspaceRuntimePath = (rootPath: string) =>
  joinFsPath(resolveWorkspaceRootPath(rootPath), WORKSPACE_RUNTIME_FILE)

export const buildWorkspaceRuntimeSnapshot = (payload: {
  notes: Note[]
  openNoteIds: string[]
  activeNoteId: string | null
  codes: CodeFile[]
  openCodeIds: string[]
  activeCodeId: string | null
  tasks: Task[]
  reminders: Reminder[]
  folders: Folder[]
  canvases: Canvas[]
  activeCanvasId: string | null
  workspaces: Workspace[]
  activeWorkspaceId: string | null
}): WorkspaceRuntimeSnapshot => createRuntimeSnapshot('Nexus Main', payload)

export const buildWorkspaceRuntimeFingerprint = (snapshot: WorkspaceRuntimeSnapshot) => {
  const { state } = snapshot
  const noteSig = state.notes.map((note) => `${note.id}:${note.updated}`).join('|')
  const codeSig = state.codes.map((code) => `${code.id}:${code.updated}`).join('|')
  const taskSig = state.tasks.map((task) => `${task.id}:${task.updated}`).join('|')
  const remSig = state.reminders.map((reminder) => `${reminder.id}:${reminder.datetime}:${reminder.done ? 1 : 0}`).join('|')
  const canvasSig = state.canvases.map((canvas) => `${canvas.id}:${canvas.updated ?? ''}:${canvas.nodes.length}:${canvas.connections.length}`).join('|')
  const workspaceSig = state.workspaces
    .map(
      (workspace) =>
        `${workspace.id}:${workspace.lastAccessed}:${workspace.noteIds.length}:${workspace.codeIds.length}:${workspace.taskIds.length}:${workspace.reminderIds.length}:${workspace.canvasIds.length}`,
    )
    .join('|')

  return [
    noteSig,
    codeSig,
    taskSig,
    remSig,
    canvasSig,
    workspaceSig,
    state.openNoteIds.join(','),
    state.activeNoteId || '',
    state.openCodeIds.join(','),
    state.activeCodeId || '',
    state.activeCanvasId || '',
    state.activeWorkspaceId || '',
  ].join('::')
}

export const parseRuntimeSnapshot = (raw: string): WorkspaceRuntimeSnapshot | null =>
  parseSharedRuntimeSnapshot(raw) as WorkspaceRuntimeSnapshot | null

function requireRuntimeSnapshot(raw: string): WorkspaceRuntimeSnapshot {
  const snapshot = parseRuntimeSnapshot(raw)
  if (!snapshot) throw new Error('runtime.json ist unvollständig, ungültig oder hat eine nicht unterstützte Version. Der Workspace wurde nicht verändert.')
  return snapshot
}

export const readWorkspaceRuntimeSnapshot = async (
  rootPath: string,
  fsApi: FsApi | undefined,
): Promise<WorkspaceRuntimeSnapshot | null> => {
  if (!rootPath || !fsApi?.read) return null

  const primaryPath = resolveWorkspaceRuntimePath(rootPath)
  const primary = await fsApi.read(primaryPath)
  if (primary.ok && typeof primary.data === 'string') {
    return requireRuntimeSnapshot(primary.data)
  }
  if (primary.ok || !(primary.code === 'ENOENT' || /^ENOENT(?=:|$)/.test(primary.error ?? ''))) {
    throw new Error(`runtime.json could not be read. The workspace was retained: ${primary.error || 'unknown read failure'}`)
  }

  const fallbackPath = joinFsPath(rootPath, WORKSPACE_RUNTIME_FILE)
  const fallback = await fsApi.read(fallbackPath)
  if (!fallback.ok && (fallback.code === 'ENOENT' || /^ENOENT(?=:|$)/.test(fallback.error ?? ''))) return null
  if (!fallback.ok || typeof fallback.data !== 'string') throw new Error(`runtime.json could not be read. The workspace was retained: ${fallback.error || 'invalid read result'}`)
  return requireRuntimeSnapshot(fallback.data)
}

export const writeWorkspaceRuntimeSnapshot = async (
  rootPath: string,
  snapshot: WorkspaceRuntimeSnapshot,
  fsApi: FsApi | undefined,
): Promise<{ ok: boolean; error?: string }> => {
  if (!rootPath || !fsApi?.write) {
    return { ok: false, error: 'fs write unavailable' }
  }
  const runtimePath = resolveWorkspaceRuntimePath(rootPath)
  return fsApi.write(runtimePath, JSON.stringify(snapshot, null, 2))
}
