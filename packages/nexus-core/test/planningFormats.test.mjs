import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { preparePlanningDocument, preparePlanningSnapshot, mergePlanningDocuments, renewPlanningGeneration, initializeLegacyPlanning, planningDowngradeNotice } from '../src/planning/formats.ts'
import { emptyPlanningDocument } from '../src/planning/domain.ts'
import { resolvePlanningLocal, planningDayHorizon } from '../src/planning/planningTime.ts'

const fixture = JSON.parse(await readFile(new URL('./fixtures/planning-v1.json', import.meta.url), 'utf8'))
test('same declared fixture round-trips Main -> Mobile -> Main with unknown provenance and unsupported recurrence retained', () => {
  const main = preparePlanningDocument(fixture), mobile = preparePlanningDocument(JSON.parse(JSON.stringify(main))), back = preparePlanningDocument(JSON.parse(JSON.stringify(mobile)))
  assert.deepEqual(back, fixture); assert.equal(back.events[0].source.rule, fixture.events[0].source.rule); assert.equal(back.events[0].source.raw, fixture.events[0].source.raw)
  assert.deepEqual(back.futurePlanning, fixture.futurePlanning); assert.equal(back.blocks[0].taskId, 'task-fixture')
  mobile.blocks[0].futureBlock.push('local change'); assert.deepEqual(main.blocks[0].futureBlock, ['preserve'])
})
test('legacy initialization creates no inferred duration, block, event or coverage; future formats reject', () => {
  assert.deepEqual(initializeLegacyPlanning('new-generation'), emptyPlanningDocument('new-generation'))
  assert.equal(planningDowngradeNotice(fixture).losesPlanning, true)
  assert.throws(() => preparePlanningDocument({ ...fixture, schemaVersion: 7 }), /unsupported version/)
})
test('malformed issue and dependency records fail before rendering; receipts-only downgrade still reports loss', () => {
  for (const issue of [null, { code: 'future-unknown', message: 'Unsupported issue' }, { code: 'overlap' }]) {
    const invalid = structuredClone(fixture); invalid.blocks[0].acceptedIssues = [issue]
    assert.throws(() => preparePlanningDocument(invalid), /acceptedIssues/)
  }
  const receiptOnly = emptyPlanningDocument('receipt-only')
  receiptOnly.receipts.complete = { command: '{"kind":"complete-task"}', ids: ['task'], revision: 1, issues: [] }
  assert.equal(planningDowngradeNotice(receiptOnly).losesPlanning, true)
  receiptOnly.receipts.complete.issues = [null]
  assert.throws(() => preparePlanningDocument(receiptOnly), /receipt/)
  const invalidTask = { id: 'task', title: 'Task', desc: '', status: 'todo', priority: 'mid', created: '', updated: '', dependsOnTaskIds: 'not an array' }
  assert.throws(() => preparePlanningSnapshot({ tasks: [invalidTask], planning: emptyPlanningDocument('tasks') }), /dependencies/)
})
test('explicit planning merge incoming identities/durations win, availability replaces, metadata persists', () => {
  const current = preparePlanningDocument(fixture), incoming = preparePlanningDocument(fixture)
  incoming.events[0].title = 'Incoming'; incoming.durations['task-fixture'] = 90; incoming.futurePlanning.incoming = true
  current.availability = { horizon: { start: '2026-10-01T00:00:00Z', end: '2026-10-02T00:00:00Z' }, windows: [], timeZone: 'UTC', coverage: 'unknown', sourceIds: ['manual'], updatedAt: '2026-09-30T12:00:00Z', futureCoverage: true }
  const merged = mergePlanningDocuments(current, incoming)
  assert.equal(merged.events.length, 1); assert.equal(merged.events[0].title, 'Incoming'); assert.equal(merged.durations['task-fixture'], 90); assert.equal(merged.availability, null); assert.equal(merged.blocks[0].futureBlock[0], 'preserve')
  assert.equal(current.events[0].title, 'Synthetic fixed event'); assert.equal(current.availability.futureCoverage, true)
  const renewed = renewPlanningGeneration(merged, 'accepted-new-generation'); assert.equal(renewed.generation, 'accepted-new-generation'); assert.equal(merged.generation, 'cross-client-fixture')
})
test('receipts cannot be rebound by merge; same canonical content preserves original acknowledgment', () => {
  const current = preparePlanningDocument(fixture), incoming = preparePlanningDocument(fixture)
  current.receipts.once = { command: '{"full":"content"}', ids: ['saved'], revision: 1, issues: [], futureReceipt: true }
  incoming.receipts.once = { command: '{"full":"content"}', ids: ['incoming'], revision: 9, issues: [] }
  assert.deepEqual(mergePlanningDocuments(current, incoming).receipts.once, current.receipts.once)
  incoming.receipts.once.command = '{"different":"content"}'
  assert.throws(() => mergePlanningDocuments(current, incoming), /identity collision/)
})
test('explicit work times reject DST gaps and require fold occurrence choice; day horizons reflect 23/25h', () => {
  assert.equal(resolvePlanningLocal('2026-03-29T02:30', 'Europe/Berlin').code, 'NONEXISTENT_LOCAL_TIME')
  const ambiguous = resolvePlanningLocal('2026-10-25T02:30', 'Europe/Berlin')
  assert.equal(ambiguous.code, 'AMBIGUOUS_LOCAL_TIME'); assert.equal(ambiguous.choices.length, 2)
  assert.equal(resolvePlanningLocal('2026-10-25T02:30', 'Europe/Berlin', ambiguous.choices[1].instant).instant, '2026-10-25T01:30:00.000Z')
  const spring = planningDayHorizon('2026-03-29', 'Europe/Berlin'), autumn = planningDayHorizon('2026-10-25', 'Europe/Berlin')
  assert.equal((Date.parse(spring.end) - Date.parse(spring.start)) / 3600000, 23); assert.equal((Date.parse(autumn.end) - Date.parse(autumn.start)) / 3600000, 25)
  assert.equal(resolvePlanningLocal('2026-09-06T00:00', 'America/Santiago').code, 'NONEXISTENT_LOCAL_TIME')
  const midnightGap = planningDayHorizon('2026-09-06', 'America/Santiago')
  assert.equal(midnightGap.start, '2026-09-06T04:00:00.000Z'); assert.equal((Date.parse(midnightGap.end) - Date.parse(midnightGap.start)) / 3600000, 23)
})
