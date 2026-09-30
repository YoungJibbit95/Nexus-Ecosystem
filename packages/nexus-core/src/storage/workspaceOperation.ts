type WorkspaceOperation = { kind: 'idle' | 'applying' | 'recovery'; message: string }
let status: WorkspaceOperation = { kind: 'idle', message: '' }
const listeners = new Set<() => void>()
const update = (value: WorkspaceOperation) => { status = value; listeners.forEach(listener => listener()) }
export const workspaceOperation = {
  getSnapshot: () => status,
  isActive: () => status.kind !== 'idle',
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
  requireRecovery(message: string) { update({ kind: 'recovery', message }) },
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (status.kind !== 'idle') throw new Error('A workspace operation is already running or requires recovery')
    update({ kind: 'applying', message: 'Workspace wird sicher übernommen …' })
    try { return await operation() }
    finally { if (workspaceOperation.getSnapshot().kind === 'applying') update({ kind: 'idle', message: '' }) }
  },
}
