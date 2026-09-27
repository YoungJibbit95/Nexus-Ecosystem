import { parseWorkspaceBackupSnapshot, type WorkspaceBackupSnapshot } from './workspaceBackup'

const MARKER = 'nx-workspace-restore-pending-v1'
type Journal = { before: WorkspaceBackupSnapshot; after: WorkspaceBackupSnapshot }
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('nexus-workspace-recovery-v1', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('recovery')
  request.onerror = () => reject(request.error ?? new Error('Recovery database unavailable'))
  request.onblocked = () => reject(new Error('Recovery database blocked by another window'))
  request.onsuccess = () => resolve(request.result)
})
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('recovery', mode)
      const request = operation(tx.objectStore('recovery'))
      tx.oncomplete = () => resolve(request.result)
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('Recovery transaction failed'))
    })
  } finally { db.close() }
}
export function hasPendingWorkspaceRestore() { return localStorage.getItem(MARKER) === 'pending' }
export async function writeWorkspaceRestoreJournal(before: WorkspaceBackupSnapshot, after: WorkspaceBackupSnapshot) {
  if (hasPendingWorkspaceRestore()) throw new Error('An interrupted restore must be recovered first')
  await transaction('readwrite', store => store.put({ before, after }, 'pending'))
  // No state mutation may occur before both journal and marker succeed.
  localStorage.setItem(MARKER, 'pending')
}
export async function readWorkspaceRestoreJournal(): Promise<Journal | null> {
  if (!hasPendingWorkspaceRestore()) return null
  const raw = await transaction('readonly', store => store.get('pending'))
  const before = parseWorkspaceBackupSnapshot(raw?.before)
  const after = parseWorkspaceBackupSnapshot(raw?.after)
  if (!before.ok || !after.ok) throw new Error('Recovery journal is invalid; stored data has been retained')
  return { before: before.snapshot, after: after.snapshot }
}
export async function clearWorkspaceRestoreJournal() {
  // Removing the marker is the commit point. Keep the last journal as recovery evidence.
  localStorage.removeItem(MARKER)
}
