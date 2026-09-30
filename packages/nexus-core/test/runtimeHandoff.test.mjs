import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeRuntimeState, normalizeRuntimeSelection } from '../src/workspace/runtimeHandoff.ts'

const empty = () => ({ notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null })
const selection = { notes: true, codes: false, tasks: false, reminders: false, canvases: false, workspaces: false }
const note = (id, content) => ({ id, title: id, content, tags: [], dirty: false, created: '2026-01-01', updated: '2026-01-01', future: { keep: true } })
test('complete replacement clears every collection and invalid navigation, without mutating either input', () => {
  const current = { ...empty(), notes: [note('old', 'before')], openNoteIds: ['old'], activeNoteId: 'old' }
  const incoming = { ...empty(), openNoteIds: ['missing'], activeNoteId: 'missing', activeCanvasId: 'missing', activeWorkspaceId: 'missing' }
  const result = mergeRuntimeState(current, incoming, 'replace', selection)
  assert.deepEqual(result, empty())
  assert.equal(current.notes[0].content, 'before')
  assert.equal(incoming.activeNoteId, 'missing')
})
test('selected merge preserves unselected sections, local active selection and unknown incoming metadata', () => {
  const current = { ...empty(), notes: [note('same', 'old'), note('local', 'keep')], openNoteIds: ['local'], activeNoteId: 'local' }
  const incoming = { ...empty(), notes: [note('same', 'new')], openNoteIds: ['same'], activeNoteId: 'same' }
  const result = mergeRuntimeState(current, incoming, 'merge', selection)
  assert.equal(result.notes.length, 2)
  assert.equal(result.notes[0].content, 'new')
  assert.deepEqual(result.notes[0].future, { keep: true })
  assert.equal(result.activeNoteId, 'local')
  assert.deepEqual(result.openNoteIds, ['local', 'same'])
  result.notes[0].future.keep = false
  assert.equal(incoming.notes[0].future.keep, true)
  assert.deepEqual(mergeRuntimeState(current, empty(), 'merge', selection).notes, current.notes)
})
test('selected imported entities bring their folder ancestor definitions without replacing unselected local definitions', () => {
  const current = { ...empty(), folders: [{ id: 'root', name: 'Local name', parentId: null }] }
  const incoming = { ...empty(), notes: [{ ...note('import', 'text'), folderId: 'child' }], folders: [{ id: 'root', name: 'Incoming name', parentId: null }, { id: 'child', name: 'Child', parentId: 'root', future: true }] }
  const result = mergeRuntimeState(current, incoming, 'merge', selection)
  assert.deepEqual(result.folders.map(folder => folder.name), ['Local name', 'Child'])
  assert.equal(result.folders[1].future, true)
  assert.equal(result.notes[0].folderId, 'child')
})
test('unselected malformed entities are rejected and orphan links are retained for explicit repair', () => {
  const incoming = { ...empty(), notes: [{ ...note('import', 'text'), folderId: 'missing', linkedTaskId: 'missing-task' }] }
  const result = mergeRuntimeState(empty(), incoming, 'merge', selection)
  assert.equal(result.notes[0].folderId, 'missing')
  assert.equal(result.notes[0].linkedTaskId, 'missing-task')
  assert.throws(() => mergeRuntimeState(empty(), { ...incoming, tasks: [{ id: 'bad' }] }, 'merge', selection), /Invalid runtime/)
  assert.deepEqual(normalizeRuntimeSelection({ ...empty(), openCodeIds: ['ghost'], activeCodeId: 'ghost' }), empty())
})
