import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { draftRegistry } from '../../packages/nexus-core/src/storage/draftRegistry'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { WorkspaceMutationGuard } from '../../packages/nexus-core/src/storage/WorkspaceMutationGuard'
import { createRuntimeSnapshot } from '../../packages/nexus-core/src/workspace/runtimeSnapshot'

const selected = { notes: true, codes: true, tasks: true, reminders: true, canvases: true, workspaces: true }
const empty = () => ({ notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null })
const state = (tag: string) => ({ ...empty(),
  notes: [{ id: 'same-note', title: tag, content: tag, tags: [], dirty: false, created: '2026-01-01', updated: '2026-01-01', future: { preserve: tag } }],
  openNoteIds: ['same-note'], activeNoteId: 'same-note',
  canvases: [{ id: 'same-board', name: tag, nodes: [], connections: [], created: '2026-01-01', updated: '2026-01-01', future: tag }], activeCanvasId: 'same-board',
  workspaces: [{ id: 'same-workspace', name: tag, icon: 'box', color: '#123456', description: '', noteIds: ['same-note'], codeIds: [], taskIds: [], reminderIds: [], canvasIds: ['same-board'], created: '2026-01-01', lastAccessed: '2026-01-01', future: tag }], activeWorkspaceId: 'same-workspace',
})
type Assert = (condition: unknown, message: string) => void

// Abort real primary transactions and reject their synchronous fallback write.
// Only tagged fixture bytes in this isolated browser profile are affected.
function failWrites(key: string, tag: string, repeat = false) {
  const originalPut = IDBObjectStore.prototype.put, originalSet = Storage.prototype.setItem
  let fallbackFailures = 0, primaryFailures = 0
  IDBObjectStore.prototype.put = function(value, entryKey) {
    const request = originalPut.call(this, value, entryKey)
    if (String(entryKey) === key + '::__snapshot-v1' && String(value).includes(tag) && (repeat || fallbackFailures === 0)) {
      primaryFailures++; this.transaction.abort()
    }
    return request
  }
  Storage.prototype.setItem = function(entryKey, value) {
    if ([key, key + '::__snapshot-v1'].includes(entryKey) && value.includes(tag) && (repeat || fallbackFailures === 0)) {
      fallbackFailures++; throw new DOMException('Synthetic handoff quota failure', 'QuotaExceededError')
    }
    return originalSet.call(this, entryKey, value)
  }
  return { restore: () => { IDBObjectStore.prototype.put = originalPut; Storage.prototype.setItem = originalSet }, failures: () => ({ primaryFailures, fallbackFailures }) }
}
async function rejects(action: () => Promise<unknown>, match: RegExp) {
  try { await action(); return false } catch (error) { return match.test(String(error)) }
}
export async function runHandoffStage(stage: string, assert: Assert) {
  if (stage.startsWith('handoff-main') || stage === 'empty-reload') {
    const { useApp } = await import('../../Nexus Main/src/store/appStore')
    const { useCanvas } = await import('../../Nexus Main/src/store/canvasStore')
    const { useWorkspaces } = await import('../../Nexus Main/src/store/workspaceStore')
    const { importWorkspaceState, captureWorkspaceRuntime } = await import('../../Nexus Main/src/app/workspaceImport')
    const { hasPendingWorkspaceRestore, readWorkspaceRestoreJournal } = await import('../../Nexus Main/src/app/workspaceRestoreJournal')
    await Promise.all([useApp, useCanvas, useWorkspaces].map(store => store.persist.rehydrate()))
    if (stage === 'empty-reload') {
      assert(Object.values(captureWorkspaceRuntime().state).filter(Array.isArray).every(value => value.length === 0), 'fresh Main page preserves all complete-empty collections')
      const { useWorkspaces: mobile } = await import('../../Nexus Mobile/src/store/workspaceStore')
      await mobile.persist.rehydrate()
      assert(mobile.getState().workspaces.length === 0 && mobile.getState().activeWorkspaceId === null, 'fresh Mobile workspace hydration preserves empty replacement')
      return
    }
    if (stage === 'handoff-main-reload') {
      assert(useApp.getState().notes.length === 1 && useApp.getState().notes[0].content === 'main-after', 'fresh Main page retains the exact nonempty imported Notes collection')
      assert(useWorkspaces.getState().workspaces[0].future === 'main-after', 'fresh Main workspace hydration retains unknown metadata')
      assert(!hasPendingWorkspaceRestore(), 'successful Main import has no pending recovery marker on restart')
      return
    }
    if (stage === 'handoff-main-recover') {
      const { recoverWorkspaceRestore } = await import('../../Nexus Main/src/app/workspaceRestore')
      assert(await recoverWorkspaceRestore(), 'fresh Main page recovers an unacknowledged rollback')
      assert(useApp.getState().notes[0].content === 'main-rollback-before' && useCanvas.getState().canvases[0].name === 'main-rollback-before', 'Main startup recovery restores the complete captured preimage')
      assert(!hasPendingWorkspaceRestore(), 'Main startup clears the marker only after all recovered queues acknowledge')
      return
    }
    if (stage === 'handoff-main-rollback-fail') {
      await importWorkspaceState(state('main-rollback-before'))
      const failure = failWrites('nx-app-v3', 'main-rollback-', true)
      try {
        assert(await rejects(() => importWorkspaceState(state('main-rollback-after')), /needs recovery/), 'Main failed commit plus failed rollback reports recovery required')
        const journal = await readWorkspaceRestoreJournal()
        assert(journal?.before.data.app.notes[0].content === 'main-rollback-before' && journal.after.data.app.notes[0].content === 'main-rollback-after', 'failed Main rollback retains both complete generations')
        assert(workspaceOperation.getSnapshot().kind === 'recovery', 'failed Main rollback freezes further application commands')
      } finally { failure.restore() }
      return
    }
    if (stage === 'handoff-main-loose') {
      const { useWorkspaceSync } = await import('../../Nexus Main/src/views/files/useWorkspaceSync')
      const { useWorkspaceFs } = await import('../../Nexus Main/src/store/workspaceFsStore')
      await importWorkspaceState(state('loose-before'))
      useWorkspaceFs.setState({ rootPath: '/synthetic-workspace' })
      let sync: ReturnType<typeof useWorkspaceSync>
      function Fixture() {
        sync = useWorkspaceSync({ ...useApp.getState(), ...useCanvas.getState(), ...useWorkspaces.getState() })
        return <WorkspaceMutationGuard />
      }
      const root = createRoot(document.getElementById('root')!)
      flushSync(() => root.render(<Fixture />))
      window.api = { fs: {
        read: async (path: string) => path.endsWith('notes/plain.md') ? { ok: true, data: 'Loose note body' } : { ok: false, code: 'ENOENT' },
        readDir: async (path: string) => ({ ok: true, entries: [{ path: path + '/notes/plain.md', isDirectory: false }] }),
      } } as any
      await sync!.importWorkspaceFromDisk()
      await new Promise(resolve => setTimeout(resolve, 30))
      assert(useApp.getState().notes[0].content === 'Loose note body' && useApp.getState().notes[0].title === 'plain', 'actual loose import recognizes exported Notes paths and replaces the present section')
      assert(useCanvas.getState().canvases[0].name === 'loose-before' && useWorkspaces.getState().workspaces[0].name === 'loose-before', 'actual partial loose import preserves missing sections')
      const writes: [string,string][] = []
      window.api = { fs: { write: async (path: string, bytes: string) => { writes.push([path, bytes]); return { ok: true } } } } as any
      const unregister = draftRegistry.register(() => useApp.setState({ notes: [{ ...useApp.getState().notes[0], content: 'Last keystroke before disk export' }] }))
      try { await sync!.exportWorkspaceToDisk() } finally { unregister() }
      const runtime = writes.find(([path]) => path.endsWith('runtime.json'))
      assert(runtime && JSON.parse(runtime[1]).state.notes[0].content === 'Last keystroke before disk export', 'actual Main disk export captures the latest flushed state rather than stale render props')
      assert(writes.some(([path,bytes]) => path.endsWith('.md') && bytes.includes('Last keystroke before disk export')), 'loose files and full runtime export use one detached draft generation')
      assert(writes.some(([path,bytes]) => path.endsWith('.md') && bytes.startsWith('# plain\n\n')), 'loose Markdown export writes real line breaks')
      await new Promise(resolve => setTimeout(resolve, 30))
      const beforeFailedRead = JSON.stringify(captureWorkspaceRuntime().state)
      window.api = { fs: {
        read: async (path: string) => path.endsWith('runtime.json') ? { ok: false, code: 'ENOENT' }
          : path.endsWith('good.md') ? { ok: true, data: '# Good\nSubset should not replace local Notes' } : { ok: false, error: 'Synthetic read denied' },
        readDir: async (path: string) => ({ ok: true, entries: ['good.md','denied.md'].map(name => ({ path: path + '/notes/' + name, isDirectory: false })) }),
      } } as any
      await sync!.importWorkspaceFromDisk()
      assert(JSON.stringify(captureWorkspaceRuntime().state) === beforeFailedRead, 'failed recognized loose file aborts the whole section before any replacement')
      await new Promise(resolve => setTimeout(resolve, 30))
      let directoryReads = 0
      window.api = { fs: { read: async () => ({ ok: false, code: 'EACCES', error: 'Synthetic permission failure' }), readDir: async () => { directoryReads++; return { ok: true, entries: [] } } } } as any
      await sync!.importWorkspaceFromDisk()
      assert(directoryReads === 0 && JSON.stringify(captureWorkspaceRuntime().state) === beforeFailedRead, 'unreadable authoritative runtime never falls through to a partial directory import')
      flushSync(() => root.unmount())
      return
    }
    const root = createRoot(document.getElementById('root')!)
    flushSync(() => root.render(<WorkspaceMutationGuard />))
    await importWorkspaceState(state('main-before'))
    let releaseDraft = draftRegistry.register(() => useApp.setState({ notes: [{ ...useApp.getState().notes[0], content: 'latest uncommitted draft' }] }))
    await importWorkspaceState(current => ({ ...current, tasks: [] }))
    releaseDraft()
    assert(useApp.getState().notes[0].content === 'latest uncommitted draft', 'partial composition captures the latest flushed Main draft')
    for (const key of ['nx-app-v3', 'nx-canvas-v1', 'nx-workspaces-v1', 'nx-workspace-fs-v1', 'nx-terminal', 'nx-theme-v5']) {
      await importWorkspaceState(state('main-before'))
      const failure = failWrites(key, ['nx-app-v3','nx-canvas-v1','nx-workspaces-v1'].includes(key) ? 'main-failed-after' : '')
      try {
        assert(await rejects(() => importWorkspaceState(state('main-failed-after')), /previous state was recovered/), `${key} write failure rejects Main import after acknowledged rollback`)
        assert(failure.failures().fallbackFailures === 1, `${key} actual storage write failure was exercised`)
        assert(captureWorkspaceRuntime().state.notes[0].content === 'main-before' && useCanvas.getState().canvases[0].name === 'main-before' && useWorkspaces.getState().workspaces[0].name === 'main-before', `${key} failure restores all Main slices`)
        assert(!hasPendingWorkspaceRestore(), `${key} durable Main rollback clears marker`)
      } finally { failure.restore() }
    }
    const originalPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function(value, key) {
      const request = originalPut.call(this, value, key)
      if (this.transaction.db.name === 'nexus-workspace-recovery-v1') this.transaction.abort()
      return request
    }
    try {
      assert(await rejects(() => importWorkspaceState(state('main-journal-failed-after')), /Recovery transaction failed/), 'real Main journal abort rejects before application')
      assert(useApp.getState().notes[0].content === 'main-before' && !hasPendingWorkspaceRestore(), 'failed journal acknowledgement leaves Main state and marker unchanged')
    } finally { IDBObjectStore.prototype.put = originalPut }
    const originalWrite = IDBObjectStore.prototype.put
    let observedModal = false
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.transaction.db.name === 'nexus-workspace-recovery-v1') observedModal = !!document.querySelector('dialog:modal') && workspaceOperation.isActive()
      return originalWrite.call(this, value, key)
    }
    try { await importWorkspaceState(state('main-after')) } finally { IDBObjectStore.prototype.put = originalWrite }
    assert(observedModal, 'real Main journal IO runs while the mutation dialog makes the UI inert')
    assert(useApp.getState().notes[0].future.preserve === 'main-after' && !hasPendingWorkspaceRestore(), 'Main acknowledges complete metadata-preserving replacement')
    assert(await readWorkspaceRestoreJournal() === null, 'retained Main journal is inactive after acknowledgement')
    flushSync(() => root.unmount())
    return
  }
  const { useApp } = await import('../../Nexus Mobile/src/store/appStore')
  const { useCanvas } = await import('../../Nexus Mobile/src/store/canvasStore')
  const { useWorkspaces } = await import('../../Nexus Mobile/src/store/workspaceStore')
  const { useWorkspaceHandoff } = await import('../../Nexus Mobile/src/store/workspaceHandoffStore')
  const { applyWorkspaceHandoff, captureMobileRecovery, captureMobileRuntime, mobileHandoffJournal, recoverWorkspaceHandoff, restoreMobileCheckpoint } = await import('../../Nexus Mobile/src/app/workspaceHandoff')
  await Promise.all([useApp, useCanvas, useWorkspaces, useWorkspaceHandoff].map(store => store.persist.rehydrate()))
  const apply = (tag: string) => applyWorkspaceHandoff(createRuntimeSnapshot('Synthetic', state(tag)), 'replace', selected)
  if (stage === 'handoff-mobile-reload') {
    assert(useWorkspaceHandoff.getState().checkpoint?.state.notes[0].content === 'mobile-before', 'Mobile manual checkpoint survives a fresh page')
    await restoreMobileCheckpoint()
    assert(useApp.getState().notes[0].content === 'mobile-before' && useCanvas.getState().canvases[0].name === 'mobile-before', 'fresh-page manual Mobile rollback restores all runtime slices')
    return
  }
  if (stage === 'handoff-mobile-recover') {
    assert(await recoverWorkspaceHandoff(), 'fresh Mobile page detects interrupted handoff journal')
    assert(useApp.getState().notes[0].content === 'mobile-interruption-before' && useCanvas.getState().canvases[0].name === 'mobile-interruption-before' && useWorkspaces.getState().workspaces[0].name === 'mobile-interruption-before', 'Mobile startup recovery restores the complete preimage')
    assert(!mobileHandoffJournal.hasPending(), 'Mobile recovery clears marker only after durable rollback')
    return
  }
  if (stage === 'handoff-mobile-interrupt') {
    await apply('mobile-interruption-before')
    const before = captureMobileRecovery()
    await mobileHandoffJournal.write(before, { ...before, runtime: createRuntimeSnapshot('Synthetic', state('mobile-interruption-after')) })
    useApp.setState({ notes: state('mobile-interruption-after').notes })
    assert(await persistenceRegistry.flush(), 'Mobile interruption persists a partial generation with its preimage still journaled')
    return
  }
  await apply('mobile-before')
  for (const key of ['nx-app-v3', 'nx-canvas-v1', 'nx-workspaces-v1', 'nx-workspace-handoff-v1']) {
    const failure = failWrites(key, key === 'nx-workspace-handoff-v1' ? 'mobile-before' : 'mobile-failed-after')
    try {
      assert(await rejects(() => apply('mobile-failed-after'), /previous state was recovered/), `${key} write failure rejects Mobile handoff after rollback`)
      assert(failure.failures().fallbackFailures === 1, `${key} actual Mobile storage failure was exercised`)
      assert(captureMobileRuntime().state.notes[0].content === 'mobile-before' && useCanvas.getState().canvases[0].name === 'mobile-before' && useWorkspaces.getState().workspaces[0].name === 'mobile-before', `${key} failure restores all Mobile slices`)
      assert(!mobileHandoffJournal.hasPending(), `${key} durable Mobile rollback clears marker`)
    } finally { failure.restore() }
  }
  await apply('mobile-after')
  assert(useWorkspaceHandoff.getState().checkpoint?.state.notes[0].content === 'mobile-before', 'Mobile acknowledges the persisted preimage checkpoint with replacement')
  assert(useApp.getState().notes[0].future.preserve === 'mobile-after', 'Mobile replacement retains unknown compatible metadata')
}
