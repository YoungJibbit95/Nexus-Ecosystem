import { draftRegistry } from '@nexus/core/storage/draftRegistry'
import { normalizeRuntimeSelection } from '@nexus/core/workspace/runtimeHandoff'
import { validateRuntimeSnapshot } from '@nexus/core/workspace/runtimeSnapshot'
import { buildWorkspaceRuntimeSnapshot, type WorkspaceRuntimeSnapshot } from '../lib/workspaceFsRuntime'
import { createWorkspaceBackupSnapshot } from './workspaceBackup'
import { captureWorkspaceSources, restoreWorkspaceBackup } from './workspaceRestore'

export function captureWorkspaceRuntime(): WorkspaceRuntimeSnapshot {
  draftRegistry.flush()
  const { app, canvas, workspaces } = captureWorkspaceSources()
  return buildWorkspaceRuntimeSnapshot(selectState(app, canvas, workspaces))
}

type RuntimeState = WorkspaceRuntimeSnapshot['state']
const selectState = (app: any, canvas: any, workspaces: any): RuntimeState => ({
  notes: app.notes, openNoteIds: app.openNoteIds, activeNoteId: app.activeNoteId,
  codes: app.codes, openCodeIds: app.openCodeIds, activeCodeId: app.activeCodeId,
  tasks: app.tasks, reminders: app.reminders, folders: app.folders,
  canvases: canvas.canvases, activeCanvasId: canvas.activeCanvasId,
  workspaces: workspaces.workspaces, activeWorkspaceId: workspaces.activeWorkspaceId,
})
export async function importWorkspaceState(incoming: RuntimeState | ((current: RuntimeState) => RuntimeState)) {
  const prepared = typeof incoming === 'function' ? incoming : buildWorkspaceRuntimeSnapshot(incoming).state
  await restoreWorkspaceBackup(before => {
    const current = buildWorkspaceRuntimeSnapshot(selectState(before.data.app, before.data.canvas, before.data.workspaces)).state
    const state = normalizeRuntimeSelection(typeof prepared === 'function' ? prepared(current) : prepared)
    validateRuntimeSnapshot({ version: 1, app: 'Nexus Main import', exportedAt: new Date().toISOString(), state })
    return createWorkspaceBackupSnapshot({
      ...before.data,
      app: { ...before.data.app, notes: state.notes, openNoteIds: state.openNoteIds, activeNoteId: state.activeNoteId, codes: state.codes, openCodeIds: state.openCodeIds, activeCodeId: state.activeCodeId, tasks: state.tasks, reminders: state.reminders, folders: state.folders },
      canvas: { ...before.data.canvas, canvases: state.canvases, activeCanvasId: state.activeCanvasId },
      workspaces: { workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId },
      label: 'Disk workspace import', reason: 'import-preview',
    })
  })
}
