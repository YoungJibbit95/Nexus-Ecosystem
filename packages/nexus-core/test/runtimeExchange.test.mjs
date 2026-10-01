import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyPlanningDocument } from '../src/planning/domain.ts'
import { createRuntimeSnapshot, parseRuntimeSnapshot } from '../src/workspace/runtimeSnapshot.ts'
import { createRuntimeExchange, parseRuntimeExchange, runtimePlanning, runtimeStateWithoutPlanning, downgradeRuntimeExchange } from '../src/workspace/runtimeExchange.ts'
import { emptyReminderLedger, reconcileReminderSources, exportReminderPortable } from '../src/reminders/reminderDomain.ts'
const state = () => ({ notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null })
const planning = () => ({ ...emptyPlanningDocument('same-generation'), events: [{ id: 'e', title: 'Fixed', start: '2026-10-01T10:00:00Z', end: '2026-10-01T11:00:00Z', timeZone: 'Europe/Berlin', allDay: false, revision: 1, source: { kind: 'manual' }, future: { preserved: true } }], future: { version: 'compatible' } })
test('both client exchanges retain complete planning and metadata while legacy schema stays strict', () => {
  for (const app of ['Nexus Main', 'Nexus Mobile']) {
    const original = planning(), value = createRuntimeExchange(app, state(), original)
    original.events[0].title = 'Later edit'
    const parsed = parseRuntimeExchange(JSON.stringify(value))
    assert.deepEqual(parsed, value); assert.equal(parsed.version, 2)
    assert.equal(runtimePlanning(parsed).events[0].title, 'Fixed')
    assert.equal(runtimePlanning(parsed).events[0].future.preserved, true)
    assert.deepEqual(runtimeStateWithoutPlanning(parsed), state())
    assert.equal(parseRuntimeSnapshot(JSON.stringify(value)), null)
  }
})
test('legacy import has no planning replacement; downgrade reports the lost fields', () => {
  const legacy = createRuntimeSnapshot('legacy', state())
  assert.deepEqual(parseRuntimeExchange(JSON.stringify(legacy)), legacy)
  assert.equal(runtimePlanning(legacy), undefined)
  const result = downgradeRuntimeExchange(createRuntimeExchange('new', state(), planning()))
  assert.equal(result.snapshot.version, 1); assert.equal(result.notice.losesPlanning, true)
  assert.ok(parseRuntimeSnapshot(JSON.stringify(result.snapshot)))
})
test('future and missing planning formats fail before any input mutation', () => {
  for (const change of [v => { v.version = 3 }, v => { delete v.state.planning }, v => { v.state.planning.schemaVersion = 2 }, v => { v.state.planning.events[0].end = 'bad' }, v => { v.state.action = 'injected' }, v => { v.version = 1 }]) {
    const value = createRuntimeExchange('new', state(), planning()); change(value)
    const before = JSON.stringify(value)
    assert.equal(parseRuntimeExchange(before), null); assert.equal(JSON.stringify(value), before)
  }
})
test('separate legacy export discloses recurrence loss and retains the original complete exchange', () => {
  const sources = [{ id: 'series', title: 'Month end', msg: '', datetime: '2026-02-28T09:00:00Z', repeat: 'monthly', done: false }]
  const ledger = reconcileReminderSources(emptyReminderLedger(), sources)
  Object.assign(ledger.occurrences[0], { anchor: '2026-01-31T09:00:00Z', index: 1, dispatch: 'uncertain' })
  const original = createRuntimeExchange('new', { ...state(), reminders: sources }, emptyPlanningDocument('g'), exportReminderPortable(ledger, sources))
  const before = JSON.stringify(original), result = downgradeRuntimeExchange(original)
  assert.equal(result.notice.losesPlanning, false)
  assert.equal(result.notice.losesReminderOccurrences, true)
  assert.match(result.notice.message, /original recurrence anchors/)
  assert.equal(JSON.stringify(original), before)
  assert.equal(result.snapshot.version, 1)
  assert.deepEqual(result.snapshot.state.reminders, sources)
})
