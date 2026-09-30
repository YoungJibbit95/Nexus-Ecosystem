import { draftRegistry } from '@nexus/core/storage/draftRegistry'
import { persistenceRegistry } from '@nexus/core/storage/browserPersistence'
import { createRecoveryJournal } from '@nexus/core/storage/recoveryJournal'
import { applySnapshotTransaction } from '@nexus/core/storage/snapshotTransaction'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { awaitHydration } from '@nexus/core/storage/awaitHydration'
import { mergeRuntimeState, type HandoffSelection } from '@nexus/core/workspace/runtimeHandoff'
import { createRuntimeSnapshot, validateRuntimeSnapshot } from '@nexus/core/workspace/runtimeSnapshot'
import { useApp, type Activity } from '../store/appStore'
import { useCanvas, type Viewport } from '../store/canvasStore'
import { projectCanvasPlanning } from '@nexus/core/canvas/planningCompatibility'
import { useWorkspaces } from '../store/workspaceStore'
import { useWorkspaceHandoff, type HandoffCheckpoint } from '../store/workspaceHandoffStore'
import type { WorkspaceRuntimeSnapshot } from '../views/files/mobileFilesTypes'

export function captureMobileRuntime(): WorkspaceRuntimeSnapshot {
  draftRegistry.flush()
  const app = useApp.getState(), canvas = useCanvas.getState(), workspaces = useWorkspaces.getState()
  return createRuntimeSnapshot('Nexus Mobile', {
    notes: app.notes, openNoteIds: app.openNoteIds, activeNoteId: app.activeNoteId,
    codes: app.codes, openCodeIds: app.openCodeIds, activeCodeId: app.activeCodeId,
    tasks: app.tasks, reminders: app.reminders, folders: app.folders,
    canvases: canvas.canvases, activeCanvasId: canvas.activeCanvasId,
    workspaces: workspaces.workspaces, activeWorkspaceId: workspaces.activeWorkspaceId,
  })
}
export const hydrateMobileSources = () => awaitHydration([useApp, useCanvas, useWorkspaces, useWorkspaceHandoff])

type RecoverySnapshot = {
  format: 'nexus-mobile-handoff-recovery'; version: 1; runtime: WorkspaceRuntimeSnapshot
  activities: Activity[]; viewport: Viewport; checkpoint: HandoffCheckpoint | null
}
function prepare(value: unknown): RecoverySnapshot {
  const snapshot = value as RecoverySnapshot
  if (!snapshot || snapshot.format !== 'nexus-mobile-handoff-recovery' || snapshot.version !== 1
    || Object.keys(snapshot).some(key => !['format','version','runtime','activities','viewport','checkpoint'].includes(key))) throw new Error('Unsupported Mobile recovery format')
  validateRuntimeSnapshot(snapshot.runtime)
  if (!Array.isArray(snapshot.activities) || snapshot.activities.some(item => !item || typeof item.id !== 'string')) throw new Error('Invalid Mobile recovery activities')
  if (!snapshot.viewport || ['panX','panY','zoom'].some(key => !Number.isFinite(snapshot.viewport[key]))) throw new Error('Invalid Mobile recovery viewport')
  if (snapshot.checkpoint !== null) {
    if (!snapshot.checkpoint || !Number.isFinite(Date.parse(snapshot.checkpoint.savedAt))) throw new Error('Invalid Mobile checkpoint')
    createRuntimeSnapshot('Mobile checkpoint', snapshot.checkpoint.state)
  }
  return JSON.parse(JSON.stringify(snapshot))
}
export const mobileHandoffJournal = createRecoveryJournal<RecoverySnapshot>({
  databaseName: 'nexus-mobile-workspace-recovery-v1', markerKey: 'nx-mobile-workspace-restore-pending-v1', prepare,
})
export function captureMobileRecovery(): RecoverySnapshot {
  return prepare({ format: 'nexus-mobile-handoff-recovery', version: 1, runtime: captureMobileRuntime(), activities: useApp.getState().activities, viewport: useCanvas.getState().viewport, checkpoint: useWorkspaceHandoff.getState().checkpoint })
}
function apply(snapshot: RecoverySnapshot) {
  const state = snapshot.runtime.state
  useApp.setState({ notes: state.notes, openNoteIds: state.openNoteIds, activeNoteId: state.activeNoteId, codes: state.codes, openCodeIds: state.openCodeIds, activeCodeId: state.activeCodeId, tasks: state.tasks, reminders: state.reminders, folders: state.folders, activities: snapshot.activities })
  useCanvas.setState({ canvases: projectCanvasPlanning(state.canvases, 'mobile'), activeCanvasId: state.activeCanvasId, viewport: snapshot.viewport })
  useWorkspaces.setState({ workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId })
  useWorkspaceHandoff.setState({ checkpoint: snapshot.checkpoint })
}
export async function applyWorkspaceHandoff(snapshot: WorkspaceRuntimeSnapshot, mode: 'replace' | 'merge', selected: HandoffSelection, keepCheckpoint = true) {
  validateRuntimeSnapshot(snapshot)
  const incoming = createRuntimeSnapshot(snapshot.app, snapshot.state).state
  return workspaceOperation.run(async () => {
    try {
      await hydrateMobileSources()
      await applySnapshotTransaction<RecoverySnapshot>(before => ({
        ...before,
        runtime: createRuntimeSnapshot('Nexus Mobile', mergeRuntimeState(before.runtime.state, incoming, mode, selected)),
        checkpoint: keepCheckpoint ? { savedAt: new Date().toISOString(), state: before.runtime.state } : before.checkpoint,
      }), {
        prepare, beforeCapture: draftRegistry.flush, capture: captureMobileRecovery,
        journal: mobileHandoffJournal.write, clearJournal: mobileHandoffJournal.clear,
        apply, flush: persistenceRegistry.flush, invalidateDrafts: draftRegistry.invalidate,
      })
    } catch (error) {
      if (mobileHandoffJournal.hasPending()) workspaceOperation.requireRecovery('Die Übernahme benötigt Wiederherstellung. Gespeicherte Daten und Recovery-Punkt wurden beibehalten.')
      throw error
    }
  })
}
export async function restoreMobileCheckpoint() {
  const checkpoint = useWorkspaceHandoff.getState().checkpoint
  if (!checkpoint) throw new Error('No workspace checkpoint is available')
  await applyWorkspaceHandoff(createRuntimeSnapshot('Mobile checkpoint', checkpoint.state) as WorkspaceRuntimeSnapshot, 'replace', { notes: true, codes: true, tasks: true, reminders: true, canvases: true, workspaces: true }, false)
}
/** Recover before mounting any interactive Mobile UI. */
export async function recoverWorkspaceHandoff() {
  await hydrateMobileSources()
  const journal = await mobileHandoffJournal.read()
  if (!journal) return false
  await hydrateMobileSources()
  apply(journal.before)
  draftRegistry.invalidate()
  if (!await persistenceRegistry.flush()) throw new Error('Mobile recovery could not be saved; journal retained. Free storage and reload.')
  await mobileHandoffJournal.clear()
  return true
}
