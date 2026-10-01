import { draftRegistry } from '@nexus/core/storage/draftRegistry'
import { persistenceRegistry } from '@nexus/core/storage/browserPersistence'
import { createRecoveryJournal } from '@nexus/core/storage/recoveryJournal'
import { applySnapshotTransaction } from '@nexus/core/storage/snapshotTransaction'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { awaitHydration } from '@nexus/core/storage/awaitHydration'
import { mergeRuntimeState, type HandoffSelection } from '@nexus/core/workspace/runtimeHandoff'
import { createRuntimeSnapshot, validateRuntimeSnapshot } from '@nexus/core/workspace/runtimeSnapshot'
import { createRuntimeExchange, runtimePlanning, runtimeReminderOccurrences, runtimeStateWithoutPlanning, validateRuntimeExchange } from '@nexus/core/workspace/runtimeExchange'
import { mergePlanningDocuments, preparePlanningDocument, renewPlanningGeneration } from '@nexus/core/planning/formats'
import { planningStore } from '../store/planningStore'
import type { PlanningDocument } from '@nexus/core/planning/domain'
import { mobileReminderController } from '../lib/mobileReminderService'
import { exportReminderPortable, prepareReminderLedger, type ReminderDeliveryLedger, type ReminderSource } from '@nexus/core/reminders/reminderDomain'
import { prepareReminderHandoff } from '@nexus/core/workspace/reminderHandoff'
import { useApp, type Activity } from '../store/appStore'
import { useCanvas, type Viewport } from '../store/canvasStore'
import { projectCanvasPlanning } from '@nexus/core/canvas/planningCompatibility'
import { useWorkspaces } from '../store/workspaceStore'
import { useWorkspaceHandoff, type HandoffCheckpoint } from '../store/workspaceHandoffStore'
import type { WorkspaceRuntimeSnapshot, WorkspaceRuntimeState } from '../views/files/mobileFilesTypes'

export function captureMobileRuntime(): WorkspaceRuntimeSnapshot {
  draftRegistry.flush()
  const app = useApp.getState(), canvas = useCanvas.getState(), workspaces = useWorkspaces.getState()
  return createRuntimeExchange('Nexus Mobile', {
    notes: app.notes, openNoteIds: app.openNoteIds, activeNoteId: app.activeNoteId,
    codes: app.codes, openCodeIds: app.openCodeIds, activeCodeId: app.activeCodeId,
    tasks: app.tasks, reminders: app.reminders, folders: app.folders,
    canvases: canvas.canvases, activeCanvasId: canvas.activeCanvasId,
    workspaces: workspaces.workspaces, activeWorkspaceId: workspaces.activeWorkspaceId,
  }, planningStore.capturePlanning())
}
export async function hydrateMobileSources() {
  await awaitHydration([useApp, useCanvas, useWorkspaces, useWorkspaceHandoff])
  await planningStore.commandOwner.ready()
  await planningStore.commandOwner.drain()
  await mobileReminderController.initialize()
  await mobileReminderController.drain()
}
export async function captureMobileExchange(): Promise<WorkspaceRuntimeSnapshot> {
  return workspaceOperation.run(async () => {
    await hydrateMobileSources()
    draftRegistry.flush()
    const occurrences = await mobileReminderController.capturePortable()
    const runtime = captureMobileRuntime()
    return createRuntimeExchange(runtime.app, runtimeStateWithoutPlanning(runtime), runtimePlanning(runtime)!, occurrences)
  }, 'Workspace-Export wird vorbereitet …')
}

type RecoverySnapshot = {
  format: 'nexus-mobile-handoff-recovery'; version: 1 | 2 | 3; runtime: WorkspaceRuntimeSnapshot
  activities: Activity[]; viewport: Viewport; checkpoint: HandoffCheckpoint | null
  reminderLedger?: ReminderDeliveryLedger
}
function prepare(value: unknown): RecoverySnapshot {
  const snapshot = value as RecoverySnapshot
  if (!snapshot || snapshot.format !== 'nexus-mobile-handoff-recovery' || ![1, 2, 3].includes(snapshot.version)
    || Object.keys(snapshot).some(key => !['format','version','runtime','activities','viewport','checkpoint', ...(snapshot.version === 3 ? ['reminderLedger'] : [])].includes(key))) throw new Error('Unsupported Mobile recovery format')
  validateRuntimeExchange(snapshot.runtime)
  if (snapshot.version === 1 && snapshot.runtime.version !== 1) throw new Error('Legacy recovery cannot carry planning')
  if (snapshot.version === 3) prepareReminderLedger(snapshot.reminderLedger)
  if (snapshot.version === 3 && snapshot.runtime.version !== 2) throw new Error('Current recovery requires a complete planning exchange')
  if (!Array.isArray(snapshot.activities) || snapshot.activities.some(item => !item || typeof item.id !== 'string')) throw new Error('Invalid Mobile recovery activities')
  if (!snapshot.viewport || ['panX','panY','zoom'].some(key => !Number.isFinite(snapshot.viewport[key]))) throw new Error('Invalid Mobile recovery viewport')
  if (snapshot.checkpoint !== null) {
    if (!snapshot.checkpoint || !Number.isFinite(Date.parse(snapshot.checkpoint.savedAt))) throw new Error('Invalid Mobile checkpoint')
    createRuntimeSnapshot('Mobile checkpoint', snapshot.checkpoint.state)
    if (snapshot.checkpoint.planning !== undefined) preparePlanningDocument(snapshot.checkpoint.planning)
    if (snapshot.checkpoint.reminderLedger !== undefined) prepareReminderLedger(snapshot.checkpoint.reminderLedger)
  }
  return JSON.parse(JSON.stringify(snapshot))
}
export const mobileHandoffJournal = createRecoveryJournal<RecoverySnapshot>({
  databaseName: 'nexus-mobile-workspace-recovery-v1', markerKey: 'nx-mobile-workspace-restore-pending-v1', prepare,
})
export async function captureMobileRecovery(): Promise<RecoverySnapshot> {
  const reminderLedger = await mobileReminderController.captureLocalLedger()
  const runtime = captureMobileRuntime()
  const complete = createRuntimeExchange(runtime.app, runtimeStateWithoutPlanning(runtime), runtimePlanning(runtime)!, exportReminderPortable(reminderLedger, useApp.getState().reminders))
  return prepare({ format: 'nexus-mobile-handoff-recovery', version: 3, runtime: complete, reminderLedger, activities: useApp.getState().activities, viewport: useCanvas.getState().viewport, checkpoint: useWorkspaceHandoff.getState().checkpoint })
}
async function apply(snapshot: RecoverySnapshot, changedOnly = false) {
  const state = snapshot.runtime.state
  if (changedOnly) {
    const sameData = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)
    const patch = <T extends object>(store: { getState: () => T; setState: (value: Partial<T>) => void }, target: Partial<T>) => {
      const changes = Object.fromEntries(Object.entries(target).filter(([key, value]) => !sameData(store.getState()[key as keyof T], value))) as Partial<T>
      if (Object.keys(changes).length) store.setState(changes)
    }
    patch(useApp, { notes: state.notes, openNoteIds: state.openNoteIds, activeNoteId: state.activeNoteId, codes: state.codes, openCodeIds: state.openCodeIds, activeCodeId: state.activeCodeId, tasks: state.tasks, reminders: state.reminders, folders: state.folders, activities: snapshot.activities })
    patch(useCanvas, { canvases: projectCanvasPlanning(state.canvases, 'mobile'), activeCanvasId: state.activeCanvasId, viewport: snapshot.viewport })
    patch(useWorkspaces, { workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId })
    patch(useWorkspaceHandoff, { checkpoint: snapshot.checkpoint })
    const planning = runtimePlanning(snapshot.runtime)
    if (planning && !sameData(planningStore.capturePlanning(), planning)) planningStore.restorePlanning(planning)
    if (snapshot.reminderLedger) await mobileReminderController.replaceLocalLedger(snapshot.reminderLedger)
    return
  }
  useApp.setState({ notes: state.notes, openNoteIds: state.openNoteIds, activeNoteId: state.activeNoteId, codes: state.codes, openCodeIds: state.openCodeIds, activeCodeId: state.activeCodeId, tasks: state.tasks, reminders: state.reminders, folders: state.folders, activities: snapshot.activities })
  useCanvas.setState({ canvases: projectCanvasPlanning(state.canvases, 'mobile'), activeCanvasId: state.activeCanvasId, viewport: snapshot.viewport })
  useWorkspaces.setState({ workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId })
  useWorkspaceHandoff.setState({ checkpoint: snapshot.checkpoint })
  const planning = runtimePlanning(snapshot.runtime)
  if (planning) planningStore.restorePlanning(planning)
  if (snapshot.reminderLedger) await mobileReminderController.replaceLocalLedger(snapshot.reminderLedger)
}
/** Local capture commands share the handoff journal, preserving generation and the user's checkpoint. */
export async function mutateMobileWorkspaceSources(builder: (state: WorkspaceRuntimeState, planning: PlanningDocument) => {
  state: WorkspaceRuntimeState; planning: PlanningDocument
}) {
  return workspaceOperation.run(async () => {
    try {
      await hydrateMobileSources()
      await applySnapshotTransaction<RecoverySnapshot>(before => {
        const previousState = runtimeStateWithoutPlanning(before.runtime)
        const next = builder(previousState, runtimePlanning(before.runtime)!)
        const reminderLedger = prepareReminderHandoff(before.reminderLedger!, previousState.reminders, next.state.reminders)
        return { ...before, reminderLedger,
          runtime: createRuntimeExchange('Nexus Mobile', next.state, next.planning, exportReminderPortable(reminderLedger, next.state.reminders)),
        }
      }, {
        prepare, beforeCapture: draftRegistry.flush, capture: captureMobileRecovery,
        journal: mobileHandoffJournal.write, clearJournal: mobileHandoffJournal.clear,
        apply: value => apply(value, true), flush: persistenceRegistry.flush, invalidateDrafts: draftRegistry.invalidate,
      })
    } catch (error) {
      if (mobileHandoffJournal.hasPending()) workspaceOperation.requireRecovery('Der Capture benötigt Wiederherstellung. Gespeicherte Daten und Recovery-Punkt wurden beibehalten.')
      throw error
    }
  }, 'Capture wird gespeichert …')
}
export async function applyWorkspaceHandoff(snapshot: WorkspaceRuntimeSnapshot, mode: 'replace' | 'merge', selected: HandoffSelection, keepCheckpoint = true, checkpointLedger?: ReminderDeliveryLedger) {
  validateRuntimeExchange(snapshot)
  const incoming = runtimeStateWithoutPlanning(snapshot)
  const incomingPlanning = runtimePlanning(snapshot)
  const incomingOccurrences = runtimeReminderOccurrences(snapshot)
  return workspaceOperation.run(async () => {
    try {
      await hydrateMobileSources()
      await applySnapshotTransaction<RecoverySnapshot>(before => {
        const state = mergeRuntimeState(runtimeStateWithoutPlanning(before.runtime), incoming, mode, selected)
        const reminderLedger = checkpointLedger ?? prepareReminderHandoff(before.reminderLedger!, before.runtime.state.reminders, state.reminders,
          mode === 'replace' || selected.reminders ? incomingOccurrences : undefined,
          mode === 'merge' && selected.reminders ? new Set(incoming.reminders.map(item => item.id)) : undefined)
        return { ...before,
        runtime: createRuntimeExchange('Nexus Mobile', state,
          renewPlanningGeneration(incomingPlanning && (mode === 'replace' || selected.planning)
            ? mode === 'replace' ? incomingPlanning : mergePlanningDocuments(runtimePlanning(before.runtime)!, incomingPlanning)
            : runtimePlanning(before.runtime)!, crypto.randomUUID()), exportReminderPortable(reminderLedger, state.reminders)),
        reminderLedger,
        checkpoint: keepCheckpoint ? { savedAt: new Date().toISOString(), state: runtimeStateWithoutPlanning(before.runtime), planning: runtimePlanning(before.runtime), reminderLedger: before.reminderLedger } : before.checkpoint,
      } }, {
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
  const snapshot = checkpoint.planning
    ? createRuntimeExchange('Mobile checkpoint', checkpoint.state, checkpoint.planning)
    : createRuntimeSnapshot('Mobile checkpoint', checkpoint.state)
  await applyWorkspaceHandoff(snapshot as WorkspaceRuntimeSnapshot, 'replace', { notes: true, codes: true, tasks: true, reminders: true, canvases: true, workspaces: true, planning: true }, false, checkpoint.reminderLedger)
}
/** Recover before mounting any interactive Mobile UI. */
export async function recoverWorkspaceHandoff() {
  await hydrateMobileSources()
  const journal = await mobileHandoffJournal.read()
  if (!journal) return false
  await hydrateMobileSources()
  await apply(journal.before)
  draftRegistry.invalidate()
  if (!await persistenceRegistry.flush()) throw new Error('Mobile recovery could not be saved; journal retained. Free storage and reload.')
  await mobileHandoffJournal.clear()
  return true
}
