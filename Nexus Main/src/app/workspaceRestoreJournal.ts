import { createRecoveryJournal } from '@nexus/core/storage/recoveryJournal'
import { parseWorkspaceBackupSnapshot, type WorkspaceBackupSnapshot } from './workspaceBackup'
import { prepareReminderLedger, type ReminderDeliveryLedger } from '@nexus/core/reminders/reminderDomain'

export type WorkspaceRecoverySnapshot = {
  format: 'nexus-main-workspace-recovery'; version: 2; snapshot: WorkspaceBackupSnapshot; reminderLedger?: ReminderDeliveryLedger
}
export function prepareWorkspaceRecovery(value: unknown): WorkspaceRecoverySnapshot {
  const raw = value as WorkspaceRecoverySnapshot
  // Retain the September journal's before/after backup reader verbatim.
  const legacy = raw && 'schemaVersion' in raw
  if (!legacy && (!raw || raw.format !== 'nexus-main-workspace-recovery' || raw.version !== 2 || Object.keys(raw).some(key => !['format', 'version', 'snapshot', 'reminderLedger'].includes(key)))) throw new Error('Unsupported Main recovery format')
  const parsed = parseWorkspaceBackupSnapshot(legacy ? value : raw.snapshot)
  if (!parsed.ok) throw new Error(parsed.message)
  return { format: 'nexus-main-workspace-recovery', version: 2, snapshot: parsed.snapshot,
    ...(!legacy && raw.reminderLedger ? { reminderLedger: prepareReminderLedger(raw.reminderLedger) } : {}),
  }
}
const journal = createRecoveryJournal<WorkspaceRecoverySnapshot>({
  databaseName: 'nexus-workspace-recovery-v1', markerKey: 'nx-workspace-restore-pending-v1',
  prepare: prepareWorkspaceRecovery,
})
export const hasPendingWorkspaceRestore = journal.hasPending
export const writeWorkspaceRestoreJournal = journal.write
export const readWorkspaceRestoreJournal = journal.read
export const clearWorkspaceRestoreJournal = journal.clear
