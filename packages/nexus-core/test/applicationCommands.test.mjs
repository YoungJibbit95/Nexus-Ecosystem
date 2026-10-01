import test from 'node:test'
import assert from 'node:assert/strict'
import { createApplicationCommandOwner } from '../src/application/applicationCommands.ts'
import { emptyPlanningDocument } from '../src/planning/domain.ts'
const initial = () => ({ state: { notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], openCodeIds: [], activeNoteId: null, activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null }, planning: emptyPlanningDocument('capture-generation') })
function fixture(transaction) {
  let state = initial(), ids = 0, frozen = false
  const owner = createApplicationCommandOwner({ transaction: async builder => transaction ? transaction(builder, () => state, value => { state = value }) : void (state = builder(state)), expected: () => ({ generation: state.planning.generation, revision: state.planning.revision }), isFrozen: () => frozen, id: () => `capture-${++ids}`, now: () => '2026-10-01T09:00:00Z' })
  return { owner, get: () => state, set: value => { state = value }, freeze: () => { frozen = true } }
}
const note = (f, key = 'note-command') => ({ kind: 'capture-note', key, expected: f.owner.expected(), fields: { title: 'Title', content: '# exact\n\n', tags: ['keep'], futureMetadata: { retained: true } } })
test('capture returns ID only after durable transaction acknowledgement and preserves unrelated metadata', async () => {
  let release, entered
  const reached = new Promise(resolve => { entered = resolve })
  const f = fixture(async (builder, get, set) => { const after = builder(get()); entered(); await new Promise(resolve => { release = resolve }); set(after) })
  f.get().state.notes.push({ id: 'existing', title: 'Old', content: 'draft', tags: [], created: '2026-10-01T08:00:00Z', updated: '2026-10-01T08:00:00Z', dirty: true, unknown: ['retained'] })
  let settled = false
  const pending = f.owner.execute(note(f)).then(result => { settled = true; return result })
  await reached
  assert.equal(settled, false); assert.equal(f.get().state.notes.length, 1)
  release()
  const result = await pending
  assert.deepEqual(result, { ok: true, acknowledged: true, id: 'capture-1', destination: 'notes', replayed: false })
  assert.equal(f.get().state.activeNoteId, result.id)
  assert.equal(f.get().state.notes[0].content, '# exact\n\n')
  assert.deepEqual(f.get().state.notes[0].futureMetadata, { retained: true })
  assert.deepEqual(f.get().state.notes[1].unknown, ['retained'])
})
test('identical command retry after lost response retains the original ID and does not duplicate', async () => {
  let attempts = 0
  const f = fixture(async (builder, get, set) => { set(builder(get())); if (++attempts === 1) throw new Error('lost acknowledgement') })
  const command = note(f)
  assert.equal((await f.owner.execute(command)).ok, false)
  const retry = await f.owner.execute({ ...command, fields: { futureMetadata: command.fields.futureMetadata, content: command.fields.content, title: command.fields.title, tags: command.fields.tags } })
  assert.equal(retry.ok, true); assert.equal(retry.replayed, true); assert.equal(retry.id, 'capture-1'); assert.equal(f.get().state.notes.length, 1)
})
test('a command key binds every supplied field and rejects changed content without mutation', async () => {
  const f = fixture(), command = note(f)
  assert.equal((await f.owner.execute(command)).ok, true)
  const before = structuredClone(f.get())
  assert.equal((await f.owner.execute({ ...command, fields: { ...command.fields, content: 'different' } })).code, 'conflict')
  assert.deepEqual(f.get(), before)
})
test('replacement generation rejects old receipts; another accepted command makes old revision stale', async () => {
  const f = fixture(), command = note(f)
  assert.equal((await f.owner.execute(command)).ok, true)
  assert.equal((await f.owner.execute({ ...command, key: 'other' })).code, 'stale')
  f.get().planning.generation = 'replacement'
  assert.equal((await f.owner.execute(command)).code, 'stale')
})
test('Reminder requires an explicit valid instant; exact offset, precision and message survive', async () => {
  const f = fixture(), base = { kind: 'capture-reminder', key: 'reminder-command', expected: f.owner.expected(), fields: { title: 'Reminder', msg: 'Exact message', datetime: '2026-10-25T02:30:00.123+02:00', repeat: 'monthly' } }
  for (const datetime of ['2026-10-25', '2026-10-25T02:30:00', '2026-02-30T09:00:00Z']) assert.equal((await f.owner.execute({ ...base, fields: { ...base.fields, datetime } })).code, 'validation')
  const result = await f.owner.execute(base)
  assert.equal(result.ok, true); assert.equal(result.destination, 'reminders')
  assert.equal(f.get().state.reminders[0].datetime, base.fields.datetime); assert.equal(f.get().state.reminders[0].msg, base.fields.msg)
})
test('application owner serializes conflicting captures and refuses work during recovery', async () => {
  const f = fixture(), first = note(f), second = { ...note(f, 'second'), fields: { title: 'Second', content: '' } }
  const results = await Promise.all([f.owner.execute(first), f.owner.execute(second)])
  assert.equal(results[0].ok, true); assert.equal(results[1].code, 'stale'); assert.equal(f.get().state.notes.length, 1)
  f.freeze(); assert.equal((await f.owner.execute(note(f, 'frozen'))).code, 'unavailable')
})
test('fresh transaction builder observes flushed source edits rather than request-time state', async () => {
  const f = fixture(async (builder, get, set) => { get().state.folders.push({ id: 'fresh-folder', name: 'Latest', parentId: null, unknown: 'retained' }); set(builder(get())) })
  assert.equal((await f.owner.execute(note(f))).ok, true)
  assert.equal(f.get().state.folders[0].unknown, 'retained')
})
