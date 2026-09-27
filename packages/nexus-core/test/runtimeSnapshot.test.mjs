import test from 'node:test'
import assert from 'node:assert/strict'
import { createRuntimeSnapshot, parseRuntimeSnapshot } from '../src/workspace/runtimeSnapshot.ts'
const state = () => ({
  notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [],
  openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null,
})
const snapshot = () => ({ version: 1, app: 'Nexus Mobile', exportedAt: '2026-09-27T10:00:00.000Z', state: state() })
const note = () => ({ id: 'n1', title: 'Keep', content: 'Final draft', created: '2026-09-27', updated: '2026-09-27', tags: [], dirty: false, extra: { retained: true } })

test('runtime preserves intentional empty collections and unknown entity metadata', () => {
  assert.deepEqual(parseRuntimeSnapshot(JSON.stringify(snapshot())), snapshot())
  const value = snapshot(); value.state.notes.push(note())
  assert.deepEqual(parseRuntimeSnapshot(JSON.stringify(value)), value)
})
test('incomplete, unsupported and malformed runtime snapshots never become empty replacements', () => {
  for (const mutate of [
    v => { delete v.state.notes }, v => { delete v.state.folders }, v => { v.state.tasks = null },
    v => { v.version = '1' }, v => { v.version = 2 }, v => { v.state.delNote = 'injected action' },
    v => { v.state.notes = [note(), note()] }, v => { v.state.notes = [null] },
    v => { v.state.notes = [{ ...note(), content: null }] },
    v => { v.state.canvases = [{ id: 'c', name: 'Incomplete' }] },
    v => { v.state.workspaces = [{ id: 'w', name: 'Incomplete' }] },
    v => { v.state.openNoteIds = [null] }, v => { v.exportedAt = 'not a date' },
  ]) {
    const value = snapshot(); mutate(value)
    assert.equal(parseRuntimeSnapshot(JSON.stringify(value)), null)
  }
  assert.equal(parseRuntimeSnapshot('{'), null)
  assert.equal(parseRuntimeSnapshot('null'), null)
})
test('runtime capture detaches live object references before a later edit', () => {
  const live = state(); live.notes.push(note())
  const captured = createRuntimeSnapshot('Nexus Main', live)
  live.notes[0].content = 'Later edit'
  live.notes[0].extra.retained = false
  assert.equal(captured.state.notes[0].content, 'Final draft')
  assert.equal(captured.state.notes[0].extra.retained, true)
})
