import test from 'node:test'
import assert from 'node:assert/strict'
import { createPlanningCommandOwner } from '../src/planning/commandService.ts'
import { emptyPlanningDocument, intervalsOverlap, planningIssues, taskRevision } from '../src/planning/domain.ts'
import { preparePlanningDocument, planningDowngradeNotice } from '../src/planning/formats.ts'
import { selectPlanningToday } from '../src/planning/today.ts'
import { resolveEntity, taskEntityLinks } from '../src/planning/entityLinks.ts'

const task = (id = 'task') => ({ id, title: id, desc: '', status: 'todo', priority: 'high', created: '2026-09-30T00:00:00Z', updated: '2026-09-30T00:00:00Z', deadline: '2026-10-01T19:00:00.123456+02:00', tags: ['keep'], subtasks: [], linkedNoteId: 'note', linkedCanvasNodeId: 'legacy', dependsOnTaskIds: [], futureMetadata: { keep: true } })
const availability = () => ({ horizon: { start: '2026-10-01T07:00:00Z', end: '2026-10-01T17:00:00Z' }, windows: [{ start: '2026-10-01T07:00:00Z', end: '2026-10-01T17:00:00Z' }], timeZone: 'Europe/Berlin', coverage: 'complete', sourceIds: ['explicit-user'], updatedAt: '2026-09-30T12:00:00Z' })
function fixture({ failFlush = [], interrupted, frozen = false, initial, failJournal = false, duringJournal, catalog = { notes: [], canvases: [] } } = {}) {
  let state = initial ? structuredClone(initial) : { tasks: [task()], planning: emptyPlanningDocument('workspace-1') }, saved = structuredClone(state), pending = interrupted || null, id = 0
  const recovery = []
  const owner = createPlanningCommandOwner({ initialize: async () => {}, capture: () => structuredClone(state), apply: snapshot => { state = structuredClone(snapshot) }, isFrozen: () => frozen,
    resolveEntity: ref => resolveEntity(catalog, ref),
    journal: { write: async (before, after) => { if (failJournal) throw new Error('Synthetic journal write fault'); pending = structuredClone({ before, after }); duringJournal?.(state) }, read: async () => pending, clear: async () => { pending = null } },
    recoveryRequired: message => recovery.push(message),
    flush: async () => { if (failFlush.shift()) return false; saved = structuredClone(state); return true }, id: () => `created-${++id}`, now: () => '2026-09-30T12:00:00Z' })
  const command = (fields, key = `command-${id}-${state.planning.revision}`) => ({ key, expected: { generation: state.planning.generation, revision: state.planning.revision, ...('taskId' in fields || fields.kind === 'move-block' ? { taskRevision: taskRevision(state.tasks.find(task => task.id === fields.taskId) || state.tasks[0]) } : {}) }, ...fields })
  return { owner, command, get: () => state, saved: () => saved, pending: () => pending, mutate: fn => fn(state), recovery }
}
test('half-open adjacency is not overlap; actual overlap is explicit', () => {
  assert.equal(intervalsOverlap({ start: '2026-10-01T08:00:00Z', end: '2026-10-01T09:00:00Z' }, { start: '2026-10-01T09:00:00Z', end: '2026-10-01T10:00:00Z' }), false)
  assert.equal(intervalsOverlap({ start: '2026-10-01T08:00:00Z', end: '2026-10-01T09:00:00Z' }, { start: '2026-10-01T08:30:00Z', end: '2026-10-01T10:00:00Z' }), true)
})
test('missing duration and unknown coverage never become invented/free time', async () => {
  const f = fixture()
  assert.equal((await f.owner.execute(f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'Europe/Berlin' }))).code, 'validation')
  const command = f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'Europe/Berlin', durationMinutes: 30 })
  const result = await f.owner.execute(command)
  assert.equal(result.code, 'conflict'); assert.equal(result.issues[0].code, 'unknown-coverage'); assert.equal(f.get().planning.blocks.length, 0)
  const retained = await f.owner.execute({ ...command, keepConflict: true }); assert.equal(retained.ok, true); assert.equal(retained.issues[0].code, 'unknown-coverage')
})
test('new civil deadline capture declares a zone; scheduling compares its end-of-day, legacy dates remain unresolved', async () => {
  const f = fixture()
  assert.equal((await f.owner.execute(f.command({ kind: 'capture-task', fields: { title: 'Civil date', deadline: '2026-10-01' } }))).code, 'validation')
  const result = await f.owner.execute(f.command({ kind: 'capture-task', fields: { title: 'Civil date', deadline: '2026-10-01', deadlineTimeZone: 'Europe/Berlin' } }))
  assert.equal(result.acknowledged, true)
  const captured = f.get().tasks.find(task => task.id === result.ids[0])
  assert.equal(captured.deadline, '2026-10-01'); assert.equal(captured.deadlineTimeZone, 'Europe/Berlin'); assert.equal(f.get().planning.blocks.length, 0)
  const interval = { start: '2026-10-01T21:30:00Z', end: '2026-10-01T22:00:00Z' }
  assert.equal(planningIssues(f.get(), interval, 'America/New_York', captured).some(issue => issue.code === 'deadline'), false)
  assert.equal(planningIssues(f.get(), { ...interval, end: '2026-10-01T22:01:00Z' }, 'America/New_York', captured).some(issue => issue.code === 'deadline'), true)
  const legacy = { ...captured }; delete legacy.deadlineTimeZone
  assert.ok(planningIssues(f.get(), interval, 'America/New_York', legacy).find(issue => issue.code === 'deadline').message.includes('no resolved IANA'))
})
test('schedule/move preserve canonical deadline, identity, links and unknown metadata; full-content replay survives reload', async () => {
  const f = fixture(), original = structuredClone(f.get().tasks[0])
  await f.owner.execute(f.command({ kind: 'set-availability', availability: availability() }))
  const command = f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'Europe/Berlin', durationMinutes: 45 }, 'stable')
  const result = await f.owner.execute(command)
  assert.equal(result.acknowledged, true); assert.deepEqual(f.get().tasks[0], original); assert.equal(f.saved().planning.blocks.length, 1)
  assert.equal((await f.owner.execute(command)).replayed, true)
  assert.equal((await f.owner.execute({ ...command, durationMinutes: 90 })).code, 'conflict')
  const block = f.get().planning.blocks[0]; f.mutate(state => state.planning.blocks[0].future = { preserved: true })
  const moved = await f.owner.execute(f.command({ kind: 'move-block', blockId: block.id, start: '2026-10-01T10:00:00Z', timeZone: 'Europe/Berlin' }))
  assert.equal(moved.ok, true); assert.equal(f.get().planning.blocks[0].id, block.id); assert.deepEqual(f.get().planning.blocks[0].future, { preserved: true }); assert.deepEqual(f.get().tasks[0], original)
  const reloaded = fixture({ initial: JSON.parse(JSON.stringify(f.saved())) })
  assert.equal((await reloaded.owner.execute(command)).replayed, true)
  assert.equal(reloaded.get().planning.blocks.length, 1)
})
test('stale task, generation and availability revisions reject without mutation', async () => {
  for (const alter of [state => { state.tasks[0].blocked = true }, state => { state.planning.generation = 'different' }, state => { state.planning.revision++ }]) {
    const f = fixture(), command = f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'UTC', durationMinutes: 30, keepConflict: true })
    f.mutate(alter); assert.equal((await f.owner.execute(command)).code, 'stale'); assert.equal(f.get().planning.blocks.length, 0)
  }
})
test('completion retains history and inactive future blocks; stops new scheduling', async () => {
  const f = fixture()
  await f.owner.execute(f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-09-29T09:00:00Z', timeZone: 'UTC', durationMinutes: 30, keepConflict: true }))
  await f.owner.execute(f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'UTC', durationMinutes: 30, keepConflict: true }))
  assert.equal((await f.owner.execute(f.command({ kind: 'complete-task', taskId: 'task' }))).ok, true)
  assert.equal(f.get().planning.blocks.length, 2); assert.deepEqual(f.get().planning.blocks.map(block => block.state), ['active', 'inactive']); assert.equal(f.get().tasks[0].futureMetadata.keep, true)
  assert.equal((await f.owner.execute(f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-02T09:00:00Z', timeZone: 'UTC', durationMinutes: 30, keepConflict: true }))).code, 'validation')
})
test('acknowledgement failure rolls back; double failure retains journal and recovers on reload', async () => {
  const f = fixture({ failFlush: [true, true] }), original = structuredClone(f.get())
  const result = await f.owner.execute(f.command({ kind: 'capture-task', fields: { title: 'Failure must not appear saved' } }))
  assert.equal(result.code, 'storage-failure'); assert.deepEqual(f.get(), original); assert.ok(f.pending())
  const recovered = fixture({ interrupted: f.pending() }); await recovered.owner.ready(); assert.deepEqual(recovered.get(), original); assert.equal(recovered.pending(), null)
})
test('a workspace freeze and malformed command reject before journaling without false recovery', async () => {
  const frozen = fixture({ frozen: true }), original = structuredClone(frozen.get())
  assert.equal((await frozen.owner.execute(frozen.command({ kind: 'capture-task', fields: { title: 'Blocked' } }))).code, 'unavailable')
  assert.deepEqual(frozen.get(), original); assert.equal(frozen.pending(), null)
  const f = fixture()
  for (const command of [null, { key: 'bad', kind: 'unsupported', expected: { generation: 'workspace-1', revision: 0 } }, { key: 'bad', kind: 'capture-task' }, f.command({ kind: 'capture-task', fields: { title: 42 } })]) {
    assert.equal((await f.owner.execute(command)).code, 'validation')
  }
  assert.equal(f.recovery.length, 0); assert.equal(f.pending(), null); assert.equal(f.get().tasks.length, 1)
})
test('journal failure and a source change during journaling freeze safely; divergent reload retains current data for repair', async () => {
  const failed = fixture({ failJournal: true }), original = structuredClone(failed.get())
  assert.equal((await failed.owner.execute(failed.command({ kind: 'capture-task', fields: { title: 'Never acknowledged' } }))).code, 'storage-failure')
  assert.deepEqual(failed.get(), original); assert.equal(failed.recovery.length, 1)
  const diverged = fixture({ duringJournal: state => { state.tasks[0].title = 'Separate source edit' } })
  const result = await diverged.owner.execute(diverged.command({ kind: 'capture-task', fields: { title: 'Never applied' } }))
  assert.equal(result.code, 'stale'); assert.equal(diverged.get().tasks.length, 1); assert.equal(diverged.recovery.length, 1); assert.ok(diverged.pending())
  const reloaded = fixture({ initial: diverged.get(), interrupted: diverged.pending() })
  await assert.rejects(reloaded.owner.ready(), /differs from current sources/)
  assert.equal(reloaded.get().tasks[0].title, 'Separate source edit'); assert.ok(reloaded.pending()); assert.equal(reloaded.recovery.length, 1)
})
test('a deleted task rejects a stale placement without deleting the retained block', async () => {
  const f = fixture()
  await f.owner.execute(f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'UTC', durationMinutes: 30, keepConflict: true }))
  const command = f.command({ kind: 'move-block', blockId: f.get().planning.blocks[0].id, start: '2026-10-01T10:00:00Z', timeZone: 'UTC', keepConflict: true })
  f.mutate(state => { state.tasks = [] })
  assert.equal((await f.owner.execute(command)).code, 'stale'); assert.equal(f.get().planning.blocks.length, 1)
})
test('concurrent duplicate commands serialize into one acknowledged entity', async () => {
  const f = fixture(), command = f.command({ kind: 'capture-task', fields: { title: 'Only once', futureCapture: { retained: true } } }, 'parallel-once')
  const results = await Promise.all(Array.from({ length: 12 }, () => f.owner.execute(command)))
  assert.equal(results.filter(result => result.ok && !result.replayed).length, 1)
  assert.equal(results.filter(result => result.ok && result.replayed).length, 11)
  assert.equal(f.get().tasks.length, 2); assert.deepEqual(f.get().tasks[1].futureCapture, { retained: true })
})
test('Today counts a due and scheduled task once; reminders are points, inactive and orphan blocks remain visible', async () => {
  const f = fixture(); f.mutate(state => { state.tasks[0].deadline = '2026-10-01' })
  await f.owner.execute(f.command({ kind: 'schedule-task', taskId: 'task', start: '2026-10-01T09:00:00Z', timeZone: 'UTC', durationMinutes: 30, keepConflict: true }))
  f.mutate(state => {
    const block = state.planning.blocks[0]
    state.planning.blocks.push({ ...block, id: 'retained-inactive', state: 'inactive', inactiveReason: 'task-completed' }, { ...block, id: 'orphan-block', taskId: 'deleted-task' })
  })
  const result = selectPlanningToday({ ...f.get(), reminders: [{ id: 'r', title: 'Point', datetime: '2026-10-01T09:00:00Z', done: false }], day: '2026-10-01', timeZone: 'UTC', horizon: { start: '2026-10-01T00:00:00Z', end: '2026-10-02T00:00:00Z' }, now: '2026-10-01T08:00:00Z' })
  assert.equal(result.openTaskCount, 1); assert.equal(result.reminderCount, 1); assert.equal(result.commitmentCount, 2); assert.equal(result.coverage, 'unknown')
  assert.equal(result.blocks.find(block => block.id === 'retained-inactive').state, 'inactive'); assert.equal(result.unresolvedBlocks[0].id, 'orphan-block')
})
test('unknown versions and impossible intervals fail closed; downgrade has explicit loss', () => {
  const document = emptyPlanningDocument('w'); assert.throws(() => preparePlanningDocument({ ...document, schemaVersion: 2 }), /unsupported version/)
  document.events = [{ id: 'e', title: 'Invalid date', start: '2026-02-30T10:00:00Z', end: '2026-03-01T11:00:00Z', timeZone: 'UTC', allDay: false, revision: 1, source: { kind: 'manual' } }]
  assert.throws(() => preparePlanningDocument(document), /event/); assert.equal(planningDowngradeNotice(document).losesPlanning, true)
})

test('ICS archive and chosen fixed intervals acknowledge together; unsupported series stay raw by default and retry is idempotent', async () => {
  const f = fixture(), beforeTasks = structuredClone(f.get().tasks)
  const raw = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:series\r\nSUMMARY:Fortnightly\r\nDTSTART:20261001T090000Z\r\nDTEND:20261001T100000Z\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3\r\nEND:VEVENT\r\nEND:VCALENDAR'
  const command = f.command({ kind: 'import-ics', raw, timeZone: 'UTC', includeBaseOccurrences: false }, 'ics-raw-once')
  const result = await f.owner.execute(command)
  assert.equal(result.acknowledged, true); assert.equal(f.get().planning.events.length, 0); assert.equal(f.get().planning.icsImports[0].raw, raw)
  assert.equal(f.get().planning.icsImports[0].rows[0].imported, false); assert.equal(f.get().planning.availability, null); assert.deepEqual(f.get().tasks, beforeTasks)
  assert.equal((await f.owner.execute(command)).replayed, true); assert.equal(f.get().planning.icsImports.length, 1)
  assert.equal((await f.owner.execute({ ...command, includeBaseOccurrences: true })).code, 'conflict')
  const included = await f.owner.execute(f.command({ kind: 'import-ics', raw, timeZone: 'UTC', includeBaseOccurrences: true }))
  assert.equal(included.acknowledged, true); assert.equal(f.get().planning.events.length, 1); assert.match(f.get().planning.events[0].source.raw, /COUNT=3/)
  assert.equal(f.get().planning.icsImports[1].rows[0].imported, true)
  const roundTrip = preparePlanningDocument(JSON.parse(JSON.stringify(f.saved().planning))); assert.deepEqual(roundTrip, f.get().planning)
})

test('ICS apply failure rolls back archive and event as one generation', async () => {
  const f = fixture({ failFlush: [true, false] }), original = structuredClone(f.get())
  const raw = 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Fixed\nDTSTART:20261001T090000Z\nDTEND:20261001T100000Z\nEND:VEVENT\nEND:VCALENDAR'
  assert.equal((await f.owner.execute(f.command({ kind: 'import-ics', raw, timeZone: 'UTC', includeBaseOccurrences: false }))).code, 'storage-failure')
  assert.deepEqual(f.get(), original); assert.deepEqual(f.saved(), original); assert.equal(f.pending(), null)
})

test('Note and scoped Canvas promotion return stable canonical IDs across repeat/reload; sources stay unchanged', async () => {
  const catalog = { notes: [{ id: 'note', title: 'Note context', content: '# Full context', futureSource: { keep: true } }], canvases: [{ id: 'canvas-a', name: 'A', nodes: [{ id: 'shared-node-id', title: 'First', content: 'A content' }] }, { id: 'canvas-b', name: 'B', nodes: [{ id: 'shared-node-id', title: 'Second', content: 'B content' }] }] }
  const original = structuredClone(catalog), f = fixture({ catalog })
  f.mutate(state => { delete state.tasks[0].linkedNoteId })
  const refs = [{ kind: 'note', id: 'note' }, { kind: 'canvas-node', canvasId: 'canvas-b', id: 'shared-node-id' }]
  for (const ref of refs) {
    const first = await f.owner.execute(f.command({ kind: 'promote-entity', ref, sourceRevision: resolveEntity(catalog, ref).revision }))
    const second = await f.owner.execute(f.command({ kind: 'promote-entity', ref, sourceRevision: resolveEntity(catalog, ref).revision }))
    assert.equal(first.acknowledged, true); assert.deepEqual(first.ids, second.ids)
  }
  assert.equal(f.get().tasks.length, 3); assert.equal(f.get().tasks.at(-1).title, 'Second'); assert.equal(f.get().tasks.at(-1).entityLinks[0].canvasId, 'canvas-b'); assert.deepEqual(catalog, original)
  const reload = fixture({ catalog, initial: f.saved() }), ref = refs[0]
  const again = await reload.owner.execute(reload.command({ kind: 'promote-entity', ref, sourceRevision: resolveEntity(catalog, ref).revision }))
  assert.equal(again.ids[0], f.get().tasks[1].id); assert.equal(reload.get().tasks.length, 3)
  catalog.notes = []
  assert.equal((await reload.owner.execute(reload.command({ kind: 'promote-entity', ref, sourceRevision: 'old source' }))).code, 'stale'); assert.equal(reload.get().tasks.length, 3)
  assert.equal(taskEntityLinks(reload.get().tasks[1], catalog)[0].resolved, null)
})

test('typed repair keeps unrelated metadata, rejects missing targets, and rollback restores exact original links', async () => {
  const catalog = { notes: [{ id: 'repair-note', title: 'Repair', content: 'Retain' }], canvases: [{ id: 'canvas', name: 'Canvas', nodes: [{ id: 'node', title: 'Node', content: 'Context' }] }] }
  const f = fixture({ catalog }), original = structuredClone(f.get().tasks[0])
  assert.equal((await f.owner.execute(f.command({ kind: 'repair-task-link', taskId: 'task', linkKind: 'canvas-node', ref: { kind: 'canvas-node', canvasId: 'wrong', id: 'node' } }))).code, 'stale')
  const repaired = await f.owner.execute(f.command({ kind: 'repair-task-link', taskId: 'task', linkKind: 'canvas-node', ref: { kind: 'canvas-node', canvasId: 'canvas', id: 'node' } }))
  assert.equal(repaired.acknowledged, true); assert.equal(f.get().tasks[0].entityLinks[0].canvasId, 'canvas'); assert.deepEqual(f.get().tasks[0].futureMetadata, original.futureMetadata); assert.equal(f.get().tasks[0].deadline, original.deadline)
  const failed = fixture({ catalog, initial: f.saved(), failFlush: [true, false] }), before = structuredClone(failed.get())
  assert.equal((await failed.owner.execute(failed.command({ kind: 'repair-task-link', taskId: 'task', linkKind: 'canvas-node', ref: null }))).code, 'storage-failure'); assert.deepEqual(failed.get(), before)
  const clear = await f.owner.execute(f.command({ kind: 'repair-task-link', taskId: 'task', linkKind: 'canvas-node', ref: null }))
  assert.equal(clear.acknowledged, true); assert.equal(f.get().tasks[0].linkedCanvasNodeId, undefined); assert.equal(f.get().tasks[0].linkedNoteId, original.linkedNoteId)
})

test('ambiguous legacy Canvas IDs are retained for explicit project selection; changed sources cannot be promoted during journaling', async () => {
  const catalog = { notes: [{ id: 'source', title: 'Before', content: 'Context' }], canvases: [{ id: 'a', name: 'A', nodes: [{ id: 'legacy', title: 'A', content: '' }] }, { id: 'b', name: 'B', nodes: [{ id: 'legacy', title: 'B', content: '' }] }] }
  const links = taskEntityLinks(task(), catalog); assert.equal(links.at(-1).ref, null); assert.equal(links.at(-1).legacyId, 'legacy'); assert.match(links.at(-1).message, /mehreren/)
  const f = fixture({ catalog, duringJournal: () => { catalog.notes[0].title = 'Concurrent source edit' } }), ref = { kind: 'note', id: 'source' }
  assert.equal((await f.owner.execute(f.command({ kind: 'promote-entity', ref, sourceRevision: resolveEntity(catalog, ref).revision }))).code, 'stale')
  assert.equal(f.get().tasks.length, 1); assert.ok(f.pending()); assert.equal(f.recovery.length, 1)
})
