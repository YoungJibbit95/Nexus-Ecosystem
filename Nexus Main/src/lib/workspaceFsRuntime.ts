import type { Note, CodeFile, Task, Reminder, Folder } from '../store/appStore'
import type { Workspace } from '../store/workspaceStore'
import type { Canvas } from '../store/canvasStore'
import { WORKSPACE_EXPORT_DIRNAME } from '../store/workspaceFsStore'

export const WORKSPACE_RUNTIME_FILE = 'state/runtime.json'

export type FsApi = {
  read?: (path: string) => Promise<{ ok: boolean; data?: string; error?: string }>
  write?: (path: string, content: string) => Promise<{ ok: boolean; error?: string }>
}

export type WorkspaceRuntimeSnapshot = {
  version: 1
  exportedAt: string
  app: 'Nexus Main'
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
}): WorkspaceRuntimeSnapshot => ({
  version: 1,
  exportedAt: new Date().toISOString(),
  app: 'Nexus Main',
  state: {
    notes: payload.notes,
    openNoteIds: payload.openNoteIds,
    activeNoteId: payload.activeNoteId,
    codes: payload.codes,
    openCodeIds: payload.openCodeIds,
    activeCodeId: payload.activeCodeId,
    tasks: payload.tasks,
    reminders: payload.reminders,
    folders: payload.folders,
    canvases: payload.canvases,
    activeCanvasId: payload.activeCanvasId,
    workspaces: payload.workspaces,
    activeWorkspaceId: payload.activeWorkspaceId,
  },
})

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
        `${workspace.id}:${workspace.lastAccessed}:${workspace.noteIds.length}:${workspace.codeIds.length}:${workspace.taskIds.length}:${workspace.reminderIds.length}`,
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

const parseRuntimeSnapshot = (raw: string): WorkspaceRuntimeSnapshot | null => {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (Number((parsed as any).version || 0) !== 1) return null
    const state = (parsed as any).state
    if (!state || typeof state !== 'object') return null
    if (!Array.isArray(state.notes) || !Array.isArray(state.codes)) return null
    if (!Array.isArray(state.tasks) || !Array.isArray(state.reminders)) return null
    if (!Array.isArray(state.canvases) || !Array.isArray(state.workspaces)) return null
    return parsed as WorkspaceRuntimeSnapshot
  } catch {
    return null
  }
}

export const readWorkspaceRuntimeSnapshot = async (
  rootPath: string,
  fsApi: FsApi | undefined,
): Promise<WorkspaceRuntimeSnapshot | null> => {
  if (!rootPath || !fsApi?.read) return null

  const primaryPath = resolveWorkspaceRuntimePath(rootPath)
  const primary = await fsApi.read(primaryPath)
  if (primary.ok && typeof primary.data === 'string') {
    return parseRuntimeSnapshot(primary.data)
  }

  const fallbackPath = joinFsPath(rootPath, WORKSPACE_RUNTIME_FILE)
  const fallback = await fsApi.read(fallbackPath)
  if (!fallback.ok || typeof fallback.data !== 'string') return null
  return parseRuntimeSnapshot(fallback.data)
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
