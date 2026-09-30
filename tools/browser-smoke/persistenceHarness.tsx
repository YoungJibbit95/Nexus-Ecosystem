import React, { useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createIndexedDbStorage } from '../../packages/nexus-core/src/storage/browserPersistence'
import { createLocalFileRepository } from '../../packages/nexus-core/src/storage/localFileRepository'
import { useEditorPersistence } from '../../packages/nexus-core/src/storage/useEditorPersistence'
import { EditorMutationGuard } from '../../packages/nexus-core/src/storage/EditorMutationGuard'
import { useNotesDraftState } from '../../Nexus Main/src/views/notes/useNotesDraftState'
import { draftRegistry } from '../../packages/nexus-core/src/storage/draftRegistry'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { createWorkspaceBackupSnapshot } from '../../Nexus Main/src/app/workspaceBackup'
import { writeWorkspaceRestoreJournal, hasPendingWorkspaceRestore } from '../../Nexus Main/src/app/workspaceRestoreJournal'

const checks: string[] = []
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); checks.push(message) }
const settle = () => new Promise(resolve => setTimeout(resolve, 30))
const createStore = () => createIndexedDbStorage<{ notes: { id: string; content: string }[] }>({ dbName: 'nexus-persistence-smoke', debounceMs: 60000, segmentStateKeys: ['notes'] })
const value = { state: { notes: [{ id: 'note', content: 'IndexedDB roundtrip ü' }] }, version: 4 }
const repository = createLocalFileRepository({ storage: () => localStorage, debounceMs: 60000 })
let editor: ReturnType<typeof useEditorPersistence>
let switchTab: (id: string) => void
let readTabs: () => { id: string; modified: boolean }[]
let unmount: () => void
const initialNote = { id: 'n1', title: 'Note', content: 'Before', tags: [], dirty: false, created: '2026-01-01', updated: '2026-01-01' }
let noteSession: ReturnType<typeof useNotesDraftState>
let replaceNote: (content: string) => void
let currentNote = initialNote
const nativeWrites: [string, string][] = []
let nativeEditor: ReturnType<typeof useEditorPersistence>
function NativeEditorFixture() {
  const [files, setFiles] = useState([{ id: 'loaded', type: 'file', content: 'old', fsPath: '/workspace/loaded.txt' }, { id: 'unopened', type: 'file', fsPath: '/workspace/unopened.txt' }])
  const [, setTabs] = useState([{ id: 'loaded', modified: false }])
  nativeEditor = useEditorPersistence({ files, setFiles, activeTabId: 'loaded', setOpenTabs: setTabs, workspacePath: '/workspace', autoSave: true, repository, writeFile: (path, content) => { nativeWrites.push([path, content]); return true } })
  return <><EditorMutationGuard active={nativeEditor.isMutating} /><textarea value={nativeEditor.editorCode} onChange={event => nativeEditor.handleCodeChange(event.target.value)} /></>
}
function NotesFixture() {
  const [note, setNote] = useState(initialNote)
  currentNote = note
  const update = useCallback((_id: string, patch: object) => setNote(note => ({ ...note, ...patch })), [])
  const save = useCallback(() => setNote(note => ({ ...note, dirty: false })), [])
  noteSession = useNotesDraftState({ active: note, autosave: false, autosaveInterval: 3000, updateNote: update, saveNote: save })
  replaceNote = content => setNote(note => ({ ...note, content, dirty: false }))
  return <textarea aria-label="Note draft" value={noteSession.draftContent} onChange={event => noteSession.handleChange(event.target.value)} />
}

function EditorFixture() {
  const [files, setFiles] = useState(repository.load() ?? [{ id: 'a', type: 'file', content: 'old A' }, { id: 'b', type: 'file', content: 'old B' }])
  const [activeTabId, setActiveTabId] = useState('a')
  const [tabs, setTabs] = useState([{ id: 'a', modified: false }, { id: 'b', modified: false }])
  editor = useEditorPersistence({ files, setFiles, activeTabId, setOpenTabs: setTabs, workspacePath: null, autoSave: true, repository, writeFile: () => { throw new Error('unexpected native IO') } })
  switchTab = setActiveTabId
  readTabs = () => tabs
  return <textarea aria-label="Draft" value={editor.editorCode} onChange={event => editor.handleCodeChange(event.target.value)} />
}

async function run() {
  const stage = new URLSearchParams(location.search).get('stage') ?? 'write'
  if (stage.startsWith('handoff-') || stage === 'empty-reload') {
    await (await import('./workspaceHandoffHarness')).runHandoffStage(stage, assert)
    return
  }
  const store = createStore()
  if (new URLSearchParams(location.search).get('stage') === 'characterize-empty') {
    const { useApp: mainApp } = await import('../../Nexus Main/src/store/appStore')
    const { useCanvas: mainCanvas } = await import('../../Nexus Main/src/store/canvasStore')
    const { useWorkspaces: mainWorkspaces } = await import('../../Nexus Main/src/store/workspaceStore')
    const { useWorkspaces: mobileWorkspaces } = await import('../../Nexus Mobile/src/store/workspaceStore')
    const { useWorkspaceSync } = await import('../../Nexus Main/src/views/files/useWorkspaceSync')
    await Promise.all([mainApp, mainCanvas, mainWorkspaces, mobileWorkspaces].map(value => value.persist.rehydrate()))
    const board = { id: 'old-board', name: 'Old board', nodes: [], connections: [], created: '2026-01-01', updated: '2026-01-01' }
    mainCanvas.setState({ canvases: [board], activeCanvasId: board.id })
    const snapshot = buildEmptyRuntime()
    window.api = { fs: { read: async () => ({ ok: true, data: JSON.stringify(snapshot) }), readDir: async () => ({ ok: true, entries: [] }) } } as any
    const { useWorkspaceFs } = await import('../../Nexus Main/src/store/workspaceFsStore')
    useWorkspaceFs.setState({ rootPath: '/synthetic-workspace' })
    let sync: ReturnType<typeof useWorkspaceSync>
    function DiskImportFixture() {
      sync = useWorkspaceSync({ ...mainApp.getState(), ...mainCanvas.getState(), ...mainWorkspaces.getState() })
      return null
    }
    const root = createRoot(document.getElementById('root')!)
    flushSync(() => root.render(<DiskImportFixture />))
    await sync!.importWorkspaceFromDisk()
    const applied = { canvases: mainCanvas.getState().canvases.length, workspaces: mainWorkspaces.getState().workspaces.length }
    mobileWorkspaces.setState({ workspaces: [], activeWorkspaceId: null })
    await persistenceRegistry.flush()
    await Promise.all([mainApp, mainWorkspaces, mobileWorkspaces].map(value => value.persist.rehydrate()))
    const hydrated = { notes: mainApp.getState().notes.length, mainWorkspaces: mainWorkspaces.getState().workspaces.length, mobileWorkspaces: mobileWorkspaces.getState().workspaces.length }
    flushSync(() => root.unmount())
    assert(Object.values(applied).every(value => value === 0) && Object.values(hydrated).every(value => value === 0), `complete empty disk replacement and hydration retain emptiness: ${JSON.stringify({ applied, hydrated })}`)
    return
  }
  if (new URLSearchParams(location.search).get('stage') === 'reload') {
    assert(JSON.stringify(await store.getItem('app')) === JSON.stringify(value), 'fresh page reads acknowledged IndexedDB bytes')
    const files = repository.load()
    assert(files?.find(file => file.id === 'a')?.content === 'A typed before tab switch', 'fresh page preserves A after tab switch')
    assert(files?.find(file => file.id === 'b')?.content === 'B typed immediately before close', 'fresh page preserves uncommitted B draft at close')
    const { recoverWorkspaceRestore } = await import('../../Nexus Main/src/app/workspaceRestore')
    const { useApp } = await import('../../Nexus Main/src/store/appStore')
    assert(await recoverWorkspaceRestore(), 'fresh page detects an interrupted multi-store restore')
    assert(useApp.getState().notes[0]?.content === 'Before', 'startup recovery restores the complete previous generation')
    assert(!hasPendingWorkspaceRestore(), 'recovery marker clears only after durable rollback')
    store.dispose()
    return
  }
  assert(await store.getItem('app') === null, 'isolated profile starts empty')
  const { readWorkspaceRuntimeSnapshot, buildWorkspaceRuntimeSnapshot } = await import('../../Nexus Main/src/lib/workspaceFsRuntime')
  const reads: string[] = []
  let invalidRejected = false
  try {
    await readWorkspaceRuntimeSnapshot('/workspace', { read: async path => { reads.push(path); return { ok: true, data: '{"version":1,"state":{}}' } } })
  } catch { invalidRejected = true }
  assert(invalidRejected && reads.length === 1, 'invalid primary runtime rejects without falling through to a partial directory import')
  const emptyRuntime = buildWorkspaceRuntimeSnapshot({ notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null })
  const readRuntime = await readWorkspaceRuntimeSnapshot('/workspace', { read: async () => ({ ok: true, data: JSON.stringify(emptyRuntime) }) })
  assert(readRuntime?.state.canvases.length === 0 && readRuntime.state.workspaces.length === 0, 'desktop runtime reader accepts intentionally empty complete snapshots')
  store.setItem('app', value)
  assert(await store.flush(), 'real IndexedDB transaction completes')
  assert(localStorage.getItem('app::__snapshot-v1') === null, 'healthy IndexedDB does not silently use fallback')
  const root = createRoot(document.getElementById('root')!)
  unmount = () => root.unmount()
  flushSync(() => root.render(<EditorFixture />))
  await settle()
  flushSync(() => editor.handleCodeChange('A typed before tab switch'))
  flushSync(() => switchTab('b'))
  await settle()
  assert(editor.editorCode === 'old B', 'switch displays the selected file')
  assert(await editor.saveFile('a'), 'manual save acknowledges the original file')
  await settle()
  assert(!readTabs().find(tab => tab.id === 'a')?.modified, 'dirty marker clears after commit')
  flushSync(() => editor.handleCodeChange('B typed immediately before close'))
  flushSync(unmount)
  store.dispose()
  assert(repository.load()?.find(file => file.id === 'b')?.content === 'B typed immediately before close', 'unmount checkpoints latest draft synchronously')
  const noteRoot = createRoot(document.getElementById('root')!)
  flushSync(() => noteRoot.render(<NotesFixture />))
  await settle()
  flushSync(() => noteSession.handleChange('Pending old draft'))
  flushSync(() => { draftRegistry.flush(); replaceNote('Restored same ID'); draftRegistry.invalidate() })
  await settle()
  assert(noteSession.draftContent === 'Restored same ID', 'same-ID restore replaces the previous Notes draft')
  flushSync(() => noteSession.handleChange('Newest note keystroke'))
  assert(await noteSession.saveActiveNow(), 'Notes save awaits durable acknowledgment')
  await settle()
  assert(currentNote.content === 'Newest note keystroke' && !noteSession.draftDirty, 'Notes save retains the immediate final keystroke')
  flushSync(() => noteRoot.unmount())
  const nativeRoot = createRoot(document.getElementById('root')!)
  flushSync(() => nativeRoot.render(<NativeEditorFixture />))
  await settle()
  flushSync(() => nativeEditor.handleCodeChange('Native edited content'))
  assert(await nativeEditor.handleSaveAll(), 'Save All acknowledges dirty native drafts')
  assert(nativeWrites.length === 1 && nativeWrites[0][0] === '/workspace/loaded.txt', 'Save All never writes empty content to unopened workspace files')
  flushSync(() => nativeEditor.handleCodeChange('Before native rename'))
  let mutatedAfterSave = false
  await nativeEditor.runFileMutation(async () => {
    mutatedAfterSave = nativeWrites.at(-1)?.[1] === 'Before native rename'
    await settle()
    assert(document.querySelector('dialog:modal'), 'editor becomes inert during native path changes')
  })
  assert(mutatedAfterSave, 'native path mutation starts only after the last draft is saved')
  flushSync(() => nativeRoot.unmount())
  const { useCanvas: mainCanvas } = await import('../../Nexus Main/src/store/canvasStore')
  const { useCanvas: mobileCanvas } = await import('../../Nexus Mobile/src/store/canvasStore')
  await Promise.all([mainCanvas.persist.rehydrate(), mobileCanvas.persist.rehydrate()])
  const pm = { status: 'review', priority: 'critical', estimate: 8, milestone: 'M2', blockedReason: 'Keep reason', futureMeta: 'keep' }
  const board = { id: 'compat-board', name: 'Compatibility', created: '2026-01-01', updated: '2026-01-01', futureBoard: true, nodes: [{ id: 'compat-node', type: 'project', title: 'Keep', content: '', x: 0, y: 0, width: 380, height: 260, pm, lane: 'Main lane', icon: 'flag', futureNode: 'keep' }], connections: [] }
  mobileCanvas.setState({ canvases: [board], activeCanvasId: board.id })
  await persistenceRegistry.flush(); await mobileCanvas.persist.rehydrate()
  mainCanvas.setState({ canvases: mobileCanvas.getState().canvases, activeCanvasId: board.id })
  await persistenceRegistry.flush(); await mainCanvas.persist.rehydrate()
  const mainNode = mainCanvas.getState().canvases[0].nodes[0]
  assert(mainNode.status === 'doing' && mainNode.pm.status === 'review', 'Main projects a Mobile status without discarding its original meaning')
  mainCanvas.getState().updateNode('compat-node', { title: 'Title edited in Main' })
  await persistenceRegistry.flush()
  assert(mainCanvas.getState().canvases[0].nodes[0].title === 'Title edited in Main', 'persistence flush includes queued Canvas frame patches')
  mobileCanvas.setState({ canvases: mainCanvas.getState().canvases, activeCanvasId: board.id })
  await persistenceRegistry.flush(); await mobileCanvas.persist.rehydrate()
  const returned = mobileCanvas.getState().canvases[0]
  assert(JSON.stringify(returned.nodes[0].pm) === JSON.stringify(pm), 'Mobile Main Mobile roundtrip retains all supported planning fields and unknown metadata')
  assert(returned.futureBoard && returned.nodes[0].futureNode === 'keep' && returned.nodes[0].lane === 'Main lane', 'Canvas roundtrip preserves client-specific and unknown node/board fields')
  const before = createWorkspaceBackupSnapshot({ app: { notes: [initialNote] }, canvas: {}, workspaces: {}, workspaceFs: {}, terminal: {} })
  const after = createWorkspaceBackupSnapshot({ app: { notes: [{ ...initialNote, content: 'After' }] }, canvas: {}, workspaces: {}, workspaceFs: {}, terminal: {} })
  await writeWorkspaceRestoreJournal(before, after)
  const { useApp } = await import('../../Nexus Main/src/store/appStore')
  await useApp.persist.rehydrate()
  useApp.setState({ notes: [{ ...initialNote, content: 'Partial application before interruption' }] })
  assert(await persistenceRegistry.flush(), 'interruption fixture persists partial state while retaining the recovery journal')
}
function buildEmptyRuntime() {
  return { version: 1, app: 'Synthetic fixture', exportedAt: '2026-09-30T00:00:00Z', state: { notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null } }
}
run().then(() => { window.persistenceTestResult = { ok: true, checks } }).catch(error => { window.persistenceTestResult = { ok: false, error: error.stack ?? String(error), checks } })
