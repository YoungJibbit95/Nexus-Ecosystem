import { persistenceRegistry } from '@nexus/core/storage/browserPersistence'
import { projectCanvasPlanning } from '@nexus/core/canvas/planningCompatibility'
import { draftRegistry } from '@nexus/core/storage/draftRegistry'
import { applySnapshotTransaction } from '@nexus/core/storage/snapshotTransaction'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { awaitHydration } from '@nexus/core/storage/awaitHydration'
import { useApp } from '../store/appStore'
import { useCanvas } from '../store/canvasStore'
import { useTerminal } from '../store/terminalStore'
import { useTheme } from '../store/themeStore'
import { useWorkspaceFs } from '../store/workspaceFsStore'
import { useWorkspaces } from '../store/workspaceStore'
import { planningStore } from '../store/planningStore'
import { renewPlanningGeneration } from '@nexus/core/planning/formats'
import { exportReminderPortable, importReminderPortable, reconcileReminderSources, type ReminderSource } from '@nexus/core/reminders/reminderDomain'
import { reminderController } from '../lib/reminderService'
import { applyThemeTransferPayload, buildThemeTransferPayload } from '../views/settings/themeTransfer'
import { createWorkspaceBackupSnapshot, parseWorkspaceBackupSnapshot, saveWorkspaceBackup, type WorkspaceBackupSnapshot } from './workspaceBackup'
import { clearWorkspaceRestoreJournal, hasPendingWorkspaceRestore, prepareWorkspaceRecovery, readWorkspaceRestoreJournal, writeWorkspaceRestoreJournal, type WorkspaceRecoverySnapshot } from './workspaceRestoreJournal'

export const captureWorkspaceSources = () => ({
  app: useApp.getState(), canvas: useCanvas.getState(), terminal: useTerminal.getState(),
  workspaces: useWorkspaces.getState(), workspaceFs: useWorkspaceFs.getState(), theme: buildThemeTransferPayload(useTheme.getState()),
  planning: planningStore.capturePlanning(),
})
export async function hydrateWorkspaceSources() {
  await awaitHydration([useApp, useCanvas, useWorkspaces, useWorkspaceFs, useTerminal, useTheme])
  await planningStore.commandOwner.ready()
  await planningStore.commandOwner.drain()
  await reminderController.initialize()
  await reminderController.drain()
}
function prepare(snapshot: WorkspaceBackupSnapshot) {
  const parsed = parseWorkspaceBackupSnapshot(snapshot)
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.snapshot
}
const sameData = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right)
function changedFields<T extends object>(current: T, target: Partial<T>): Partial<T> {
  return Object.fromEntries(Object.entries(target).filter(([key, value]) => !sameData(current[key as keyof T], value))) as Partial<T>
}
function apply(snapshot: WorkspaceBackupSnapshot, changedOnly = false) {
  if (changedOnly) {
    // Capture/replay must preserve unrelated session state, selection references and Canvas undo.
    const patch = <T extends object>(store: { getState: () => T; setState: (value: Partial<T>) => void }, target: Partial<T>) => {
      const changes = changedFields(store.getState(), target)
      if (Object.keys(changes).length) store.setState(changes)
    }
    patch(useApp, snapshot.data.app as Partial<ReturnType<typeof useApp.getState>>)
    patch(useCanvas, { ...snapshot.data.canvas, canvases: projectCanvasPlanning(snapshot.data.canvas.canvases, 'main') } as Partial<ReturnType<typeof useCanvas.getState>>)
    patch(useWorkspaces, snapshot.data.workspaces as Partial<ReturnType<typeof useWorkspaces.getState>>)
    patch(useWorkspaceFs, snapshot.data.workspaceFs as Partial<ReturnType<typeof useWorkspaceFs.getState>>)
    patch(useTerminal, snapshot.data.terminal as Partial<ReturnType<typeof useTerminal.getState>>)
    if (snapshot.data.theme && !sameData(buildThemeTransferPayload(useTheme.getState()), snapshot.data.theme)) applyThemeTransferPayload(useTheme.getState(), snapshot.data.theme, { includeReleaseFrozen: false })
    if (snapshot.schemaVersion === 2 && snapshot.data.planning && !sameData(planningStore.capturePlanning(), snapshot.data.planning)) planningStore.restorePlanning(snapshot.data.planning)
    return
  }
  // The schema only admits data keys. Methods and session-only history cannot be imported.
  useApp.setState(snapshot.data.app as Partial<ReturnType<typeof useApp.getState>>)
  useCanvas.setState({ ...snapshot.data.canvas, canvases: projectCanvasPlanning(snapshot.data.canvas.canvases, 'main'), canvasHistory: {} } as Partial<ReturnType<typeof useCanvas.getState>>)
  useWorkspaces.setState(snapshot.data.workspaces as Partial<ReturnType<typeof useWorkspaces.getState>>)
  useWorkspaceFs.setState(snapshot.data.workspaceFs as Partial<ReturnType<typeof useWorkspaceFs.getState>>)
  useTerminal.setState(snapshot.data.terminal as Partial<ReturnType<typeof useTerminal.getState>>)
  if (snapshot.data.theme) applyThemeTransferPayload(useTheme.getState(), snapshot.data.theme, { includeReleaseFrozen: false })
  if (snapshot.schemaVersion === 2 && snapshot.data.planning) planningStore.restorePlanning(snapshot.data.planning)
}
async function captureRecovery(): Promise<WorkspaceRecoverySnapshot> {
  const reminderLedger = await reminderController.captureLocalLedger()
  const sources = captureWorkspaceSources()
  return prepareWorkspaceRecovery({ format: 'nexus-main-workspace-recovery', version: 2, reminderLedger,
    snapshot: createWorkspaceBackupSnapshot({ ...sources,
      reminderOccurrences: exportReminderPortable(reminderLedger, sources.app.reminders),
      label: `Before restore ${new Date().toLocaleString()}`, reason: 'before-restore',
    }),
  })
}
async function applyRecovery(value: WorkspaceRecoverySnapshot, changedOnly = false) {
  apply(value.snapshot, changedOnly)
  if (value.reminderLedger) await reminderController.replaceLocalLedger(value.reminderLedger)
}
export async function captureWorkspaceBackup(label?: string) {
  return workspaceOperation.run(async () => {
    await hydrateWorkspaceSources()
    draftRegistry.flush()
    const reminderOccurrences = await reminderController.capturePortable()
    return createWorkspaceBackupSnapshot({ ...captureWorkspaceSources(), reminderOccurrences, label, reason: 'manual' })
  }, 'Backup wird vorbereitet …')
}
async function runWorkspaceReplacement(snapshot: WorkspaceBackupSnapshot | ((before: WorkspaceBackupSnapshot) => WorkspaceBackupSnapshot), retainRestoreBackup: boolean, message?: string) {
  return workspaceOperation.run(async () => {
    try {
      await hydrateWorkspaceSources()
      const target = (before: WorkspaceRecoverySnapshot): WorkspaceRecoverySnapshot => {
        const validated = prepare(typeof snapshot === 'function' ? snapshot(before.snapshot) : snapshot)
        const after = typeof snapshot === 'function' ? validated : createWorkspaceBackupSnapshot({ ...validated.data,
          planning: renewPlanningGeneration(validated.data.planning ?? before.snapshot.data.planning!, crypto.randomUUID()),
          label: validated.label, reason: validated.reason,
        })
        const reminders = after.data.app.reminders as ReminderSource[]
        const reminderLedger = after.data.reminderOccurrences
          ? importReminderPortable(before.reminderLedger!, after.data.reminderOccurrences, reminders)
          : reconcileReminderSources(before.reminderLedger!, reminders)
        return prepareWorkspaceRecovery({ ...before, snapshot: after, reminderLedger })
      }
      await applySnapshotTransaction<WorkspaceRecoverySnapshot>(target, {
        prepare: prepareWorkspaceRecovery,
        beforeCapture: draftRegistry.flush,
        capture: captureRecovery,
        journal: async (before, after) => {
          if (retainRestoreBackup) await saveWorkspaceBackup(before.snapshot)
          await writeWorkspaceRestoreJournal(before, after)
        },
        clearJournal: clearWorkspaceRestoreJournal,
        apply: value => applyRecovery(value, !retainRestoreBackup), flush: persistenceRegistry.flush, invalidateDrafts: draftRegistry.invalidate,
      })
    } catch (error) {
      if (hasPendingWorkspaceRestore()) workspaceOperation.requireRecovery('Die Übernahme benötigt Wiederherstellung. Gespeicherte Daten und Recovery-Punkt wurden beibehalten.')
      throw error
    }
  }, message)
}

export async function restoreWorkspaceBackup(snapshot: WorkspaceBackupSnapshot | ((before: WorkspaceBackupSnapshot) => WorkspaceBackupSnapshot)) {
  return runWorkspaceReplacement(snapshot, true)
}

/** Capture shares the recovery journal without consuming the user's manual backup archive. */
export async function mutateMainWorkspaceSources(builder: (before: WorkspaceBackupSnapshot) => WorkspaceBackupSnapshot) {
  return runWorkspaceReplacement(builder, false, 'Capture wird gespeichert …')
}

/** Run before mounting any interactive UI. An interrupted restore rolls back all slices. */
export async function recoverWorkspaceRestore() {
  await hydrateWorkspaceSources()
  const journal = await readWorkspaceRestoreJournal()
  if (!journal) return false
  // Await hydration before replacing state, so a late old read cannot undo recovery.
  await hydrateWorkspaceSources()
  await applyRecovery(journal.before)
  draftRegistry.invalidate()
  if (!await persistenceRegistry.flush()) throw new Error('Recovery could not be saved; journal retained. Free storage and reload.')
  await clearWorkspaceRestoreJournal()
  return true
}
