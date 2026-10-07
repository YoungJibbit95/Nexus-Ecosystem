import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyPlanningDocument } from '../../../../packages/nexus-core/src/planning/domain.ts'
import { selectProductAttention } from './productAttention.ts'
import * as productAttention from './productAttention.ts'
import { createProductNavigation } from '../../app/productNavigation.ts'

const task = (id, extra = {}) => ({ id, title: id, desc: '', status: 'todo', priority: 'mid', created: '2026-10-01T00:00:00Z', updated: '2026-10-01T00:00:00Z', ...extra })
const block = (id, taskId, start = '2026-10-07T09:00:00Z', end = '2026-10-07T10:00:00Z', extra = {}) => ({ id, taskId, start, end, state: 'active', timeZone: 'Europe/Berlin', revision: 1, provenance: 'manual', locked: false, acceptedIssues: [], ...extra })
const select = (extra = {}) => selectProductAttention({ tasks: [], reminders: [], planning: emptyPlanningDocument('test'), now: '2026-10-07T08:00:00Z', timeZone: 'Europe/Berlin', ...extra })

test('civil deadline is due throughout its own day, overdue only at the next boundary, including DST', () => {
  const tasks = [task('civil', { deadline: '2026-10-25', deadlineTimeZone: 'Europe/Berlin' })]
  assert.ok(!select({ tasks, now: '2026-10-25T22:59:59Z' }).attention[0].reasons.includes('overdue'))
  assert.ok(select({ tasks, now: '2026-10-25T23:00:00Z' }).attention[0].reasons.includes('overdue'))
  assert.ok(!select({ tasks, now: '2026-10-24T22:00:00Z', timeZone: 'America/New_York' }).attention[0].reasons.includes('overdue'))
})
test('legacy civil/invalid deadlines are visible uncertainty and never suggested work', () => {
  for (const deadline of ['2026-10-07', 'invalid', '2026-02-30T12:00:00Z']) {
    const result = select({ tasks: [task('legacy', { deadline })] })
    assert.ok(result.attention[0].reasons.includes('unresolved')); assert.equal(result.suggestion, null)
  }
})
test('timed deadlines use instants; reminder snooze replaces occurrence display time', () => {
  const result = select({ tasks: [task('timed', { deadline: '2026-10-07T09:59:59+02:00' })], reminders: [
    { id: 'snoozed', title: 'snoozed', datetime: '2026-10-01T09:00:00Z', snoozeUntil: '2026-10-07T10:00:00Z', done: false },
    { id: 'done', title: 'done', datetime: '2026-10-01T09:00:00Z', done: true },
  ] })
  assert.ok(result.attention.find(item => item.key === 'task:timed').reasons.includes('overdue'))
  assert.deepEqual(result.attention.find(item => item.key === 'reminder:snoozed').reasons, ['due-soon'])
  assert.equal(result.attention.length, 2)
})
test('blocked/missing prerequisites are attention but not a local start suggestion', () => {
  const result = select({ tasks: [task('blocked', { blocked: true }), task('dependency', { dependsOnTaskIds: ['missing'] }), task('done', { status: 'done' }), task('ready', { dependsOnTaskIds: ['done'] })] })
  assert.equal(result.suggestion.task.id, 'ready')
  assert.equal(result.attention.filter(item => item.reasons.includes('blocked')).length, 2)
  assert.ok(!result.attention.some(item => item.key === 'task:done'))
})
test('backlog is derived from active remaining blocks, not task status; history stays inactive', () => {
  const planning = emptyPlanningDocument('test')
  planning.blocks = [block('future', 'scheduled'), block('past', 'past', '2026-10-06T09:00:00Z', '2026-10-06T10:00:00Z'), block('inactive', 'inactive', undefined, undefined, { state: 'inactive' }), block('complete', 'complete')]
  const result = select({ planning, tasks: [task('scheduled'), task('past', { status: 'doing' }), task('inactive'), task('complete', { status: 'done' })] })
  assert.deepEqual(result.next.map(item => item.taskId), ['scheduled'])
  assert.deepEqual(result.attention.filter(item => item.kind === 'task').map(item => item.task.id).sort(), ['inactive', 'past'])
})
test('due and scheduled task is counted once, with deterministic immutable projection', () => {
  const planning = emptyPlanningDocument('test'); planning.blocks = [block('one', 'a')]
  const input = { planning, tasks: [task('b'), task('a', { deadline: '2026-10-07T13:00:00Z' })] }
  const before = structuredClone(input), result = select(input)
  assert.equal(result.todayTaskCount, 1)
  assert.equal(result.attention.filter(item => item.key === 'task:a').length, 1)
  assert.deepEqual(input, before); assert.deepEqual(select(input), result)
  assert.deepEqual(select({ tasks: [task('b'), task('a')] }).attention.map(item => item.key), ['task:a', 'task:b'])
})
test('orphan work remains visible and overlaps are reviewable, never automatic resolution', () => {
  const planning = emptyPlanningDocument('test')
  planning.blocks = [block('orphan', 'missing', '2026-10-07T07:00:00Z', '2026-10-07T09:00:00Z'), block('normal', 'normal', '2026-10-07T07:30:00Z', '2026-10-07T09:00:00Z')]
  const result = select({ planning, tasks: [task('normal')] })
  assert.equal(result.current.length, 2); assert.equal(result.overlappingNow, true)
  assert.ok(result.attention.some(item => item.key === 'planning:orphan'))
  assert.ok(result.attention.some(item => item.reasons.includes('conflict')))
})
test('navigation is once-only, cached-owner scoped and generation bound', () => {
  const nav = createProductNavigation(), target = { kind: 'task', id: 'one' }
  const first = nav.request(target, 'g1')
  assert.equal(nav.consume(first, 'g1', false), 'pending'); assert.equal(nav.getSnapshot(), first)
  assert.equal(nav.consume(first, 'g2', true), 'stale'); assert.equal(nav.getSnapshot(), null)
  const second = nav.request(target, 'g2'), third = nav.request(target, 'g2')
  assert.equal(nav.consume(second, 'g2', true), 'pending')
  assert.equal(nav.consume(third, 'g2', true), 'ready')
  assert.equal(nav.consume(third, 'g2', true), 'pending')
})

test('invalid projection inputs surface a read error without clearing sources or inventing an empty day', () => {
  const input = { tasks: [task('legacy', { dependsOnTaskIds: 42 })], reminders: [], planning: emptyPlanningDocument('test'), now: '2026-10-07T08:00:00Z', timeZone: 'Europe/Berlin' }
  const before = structuredClone(input)
  const failed = productAttention.readProductAttention(input)
  assert.equal(failed.overview, null)
  assert.match(failed.error, /nicht.*ausgewertet/)
  assert.deepEqual(input, before)
  const recovered = productAttention.readProductAttention({ ...input, tasks: [task('valid', { priority: 'high' })] })
  assert.equal(recovered.error, '')
  assert.equal(recovered.overview.suggestion.target.id, 'valid')
  const invalidZone = productAttention.readProductAttention({ ...input, tasks: [], timeZone: 'Invalid/Zone' })
  assert.equal(invalidZone.overview, null)
})

test('empty input is stable; due-soon and overdue reminders retain explicit, actionable reasons', () => {
  assert.deepEqual(select().attention, [])
  assert.equal(select().suggestion, null)
  const result = select({ tasks: [task('soon', { deadline: '2026-10-08T08:00:00Z', priority: 'high' })], reminders: [{ id: 'late', title: 'Call', datetime: '2026-10-07T07:00:00Z', done: false }] })
  assert.deepEqual(result.attention.find(item => item.key === 'task:soon').reasons, ['due-soon', 'high-priority', 'unplanned'])
  assert.deepEqual(result.attention.find(item => item.key === 'reminder:late').target, { kind: 'reminder', id: 'late' })
  assert.deepEqual(result.attention.find(item => item.key === 'reminder:late').reasons, ['overdue'])
})
