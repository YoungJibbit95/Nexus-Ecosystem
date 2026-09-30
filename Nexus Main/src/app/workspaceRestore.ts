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
import { applyThemeTransferPayload, buildThemeTransferPayload } from '../views/settings/themeTransfer'
import { createWorkspaceBackupSnapshot, parseWorkspaceBackupSnapshot, saveWorkspaceBackup, type WorkspaceBackupSnapshot } from './workspaceBackup'
import { clearWorkspaceRestoreJournal, hasPendingWorkspaceRestore, readWorkspaceRestoreJournal, writeWorkspaceRestoreJournal } from './workspaceRestoreJournal'

export const captureWorkspaceSources = () => ({
  app: useApp.getState(), canvas: useCanvas.getState(), terminal: useTerminal.getState(),
  workspaces: useWorkspaces.getState(), workspaceFs: useWorkspaceFs.getState(), theme: buildThemeTransferPayload(useTheme.getState()),
})
export const hydrateWorkspaceSources = () => awaitHydration([useApp, useCanvas, useWorkspaces, useWorkspaceFs, useTerminal, useTheme])
function prepare(snapshot: WorkspaceBackupSnapshot) {
  const parsed = parseWorkspaceBackupSnapshot(snapshot)
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.snapshot
}
function apply(snapshot: WorkspaceBackupSnapshot) {
  // The schema only admits data keys. Methods and session-only history cannot be imported.
  useApp.setState(snapshot.data.app as Partial<ReturnType<typeof useApp.getState>>)
  useCanvas.setState({ ...snapshot.data.canvas, canvases: projectCanvasPlanning(snapshot.data.canvas.canvases, 'main'), canvasHistory: {} } as Partial<ReturnType<typeof useCanvas.getState>>)
  useWorkspaces.setState(snapshot.data.workspaces as Partial<ReturnType<typeof useWorkspaces.getState>>)
  useWorkspaceFs.setState(snapshot.data.workspaceFs as Partial<ReturnType<typeof useWorkspaceFs.getState>>)
  useTerminal.setState(snapshot.data.terminal as Partial<ReturnType<typeof useTerminal.getState>>)
  if (snapshot.data.theme) applyThemeTransferPayload(useTheme.getState(), snapshot.data.theme, { includeReleaseFrozen: false })
}
export async function restoreWorkspaceBackup(snapshot: WorkspaceBackupSnapshot | ((before: WorkspaceBackupSnapshot) => WorkspaceBackupSnapshot)) {
  return workspaceOperation.run(async () => {
    try {
      await hydrateWorkspaceSources()
      await applySnapshotTransaction(snapshot, {
        prepare,
        beforeCapture: draftRegistry.flush,
        capture: () => createWorkspaceBackupSnapshot({ ...captureWorkspaceSources(), label: `Before restore ${new Date().toLocaleString()}`, reason: 'before-restore' }),
        journal: async (before, after) => { await saveWorkspaceBackup(before); await writeWorkspaceRestoreJournal(before, after) },
        clearJournal: clearWorkspaceRestoreJournal,
        apply, flush: persistenceRegistry.flush, invalidateDrafts: draftRegistry.invalidate,
      })
    } catch (error) {
      if (hasPendingWorkspaceRestore()) workspaceOperation.requireRecovery('Die Übernahme benötigt Wiederherstellung. Gespeicherte Daten und Recovery-Punkt wurden beibehalten.')
      throw error
    }
  })
}

/** Run before mounting any interactive UI. An interrupted restore rolls back all slices. */
export async function recoverWorkspaceRestore() {
  await hydrateWorkspaceSources()
  const journal = await readWorkspaceRestoreJournal()
  if (!journal) return false
  // Await hydration before replacing state, so a late old read cannot undo recovery.
  await hydrateWorkspaceSources()
  apply(journal.before)
  draftRegistry.invalidate()
  if (!await persistenceRegistry.flush()) throw new Error('Recovery could not be saved; journal retained. Free storage and reload.')
  await clearWorkspaceRestoreJournal()
  return true
}
