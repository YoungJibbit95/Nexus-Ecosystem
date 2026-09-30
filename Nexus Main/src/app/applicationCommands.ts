import { createApplicationCommandOwner, type ApplicationSnapshot } from '@nexus/core/application/applicationCommands'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { buildWorkspaceRuntimeSnapshot } from '../lib/workspaceFsRuntime'
import { planningStore } from '../store/planningStore'
import { mutateMainWorkspaceSources } from './workspaceRestore'
import { createWorkspaceBackupSnapshot } from './workspaceBackup'

export const applicationCommands = createApplicationCommandOwner({
  isFrozen: workspaceOperation.isActive, id: () => crypto.randomUUID(), now: () => new Date().toISOString(),
  expected: () => { const { generation, revision } = planningStore.capturePlanning(); return { generation, revision } },
  transaction: async builder => {
    await mutateMainWorkspaceSources(before => {
      const { app, canvas, workspaces } = before.data
      const current = buildWorkspaceRuntimeSnapshot({ notes: app.notes, openNoteIds: app.openNoteIds, activeNoteId: app.activeNoteId, codes: app.codes, openCodeIds: app.openCodeIds, activeCodeId: app.activeCodeId, tasks: app.tasks, reminders: app.reminders, folders: app.folders, canvases: canvas.canvases, activeCanvasId: canvas.activeCanvasId, workspaces: workspaces.workspaces, activeWorkspaceId: workspaces.activeWorkspaceId } as any).state
      const after = builder({ state: current, planning: before.data.planning! } as ApplicationSnapshot)
      return createWorkspaceBackupSnapshot({ ...before.data, planning: after.planning, reminderOccurrences: undefined,
        app: { ...app, notes: after.state.notes, openNoteIds: after.state.openNoteIds, activeNoteId: after.state.activeNoteId, reminders: after.state.reminders }, label: 'Application capture', reason: 'import-preview' })
    })
  },
})
