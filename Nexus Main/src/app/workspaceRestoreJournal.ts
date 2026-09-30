import { createRecoveryJournal } from '@nexus/core/storage/recoveryJournal'
import { parseWorkspaceBackupSnapshot, type WorkspaceBackupSnapshot } from './workspaceBackup'

const journal = createRecoveryJournal<WorkspaceBackupSnapshot>({
  databaseName: 'nexus-workspace-recovery-v1', markerKey: 'nx-workspace-restore-pending-v1',
  prepare(value) {
    const parsed = parseWorkspaceBackupSnapshot(value)
    if (!parsed.ok) throw new Error(parsed.message)
    return parsed.snapshot
  },
})
export const hasPendingWorkspaceRestore = journal.hasPending
export const writeWorkspaceRestoreJournal = journal.write
export const readWorkspaceRestoreJournal = journal.read
export const clearWorkspaceRestoreJournal = journal.clear
