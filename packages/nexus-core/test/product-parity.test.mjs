import assert from 'node:assert/strict'
import test from 'node:test'
import { emptyPlanningDocument } from '../src/planning/domain.ts'
import { selectProductAttention, readProductAttention } from '../src/planning/productAttention.ts'
import { selectProductAttention as main } from '../../../Nexus Main/src/views/product/productAttention.ts'
import { selectProductAttention as mobile } from '../../../Nexus Mobile/src/views/product/productAttention.ts'
import { getProductNavigation } from '../src/planning/productNavigation.ts'

const now = '2026-10-08T10:00:00Z', timeZone = 'Europe/Berlin'
const task = (id, fields = {}) => ({ id, title: id, status: 'todo', priority: 'mid', ...fields })
const block = (id, taskId, start, end) => ({ id, taskId, start, end, state: 'active', timeZone, revision: 1, provenance: 'manual', locked: false, acceptedIssues: [] })
function fixture() {
  const planning = emptyPlanningDocument('parity')
  planning.blocks = [block('current', 'scheduled', '2026-10-08T09:30:00Z', '2026-10-08T10:30:00Z'), block('next', 'next', '2026-10-08T11:00:00Z', '2026-10-08T12:00:00Z')]
  return { now, timeZone, planning, tasks: [task('late', { deadline: '2026-10-08T09:59:59Z' }), task('soon', { deadline: '2026-10-10T10:00:00Z' }), task('later', { deadline: '2026-10-10T10:00:01Z' }), task('blocked', { blocked: true }), task('dependency', { dependsOnTaskIds: ['missing'] }), task('unresolved', { deadline: '2026-10-08' }), task('done', { status: 'done', priority: 'high' }), task('scheduled'), task('next')], reminders: [{ id: 'snoozed', title: 'Snoozed', datetime: '2026-10-01T10:00:00Z', snoozeUntil: '2026-10-08T11:00:00Z', done: false }] }
}
test('both client adapters use the identical pure authority and preserve canonical input', () => {
  assert.equal(main, selectProductAttention); assert.equal(mobile, selectProductAttention)
  const input = fixture(), before = structuredClone(input)
  assert.deepEqual(main(input), mobile(input)); assert.deepEqual(input, before)
})
test('shared fixture freezes overdue, 48h boundary, blocked/dependency and unplanned meaning', () => {
  const result = main(fixture()), reasons = id => result.attention.find(item => item.key === `task:${id}`)?.reasons
  assert.deepEqual(reasons('late'), ['overdue', 'unplanned'])
  assert.deepEqual(reasons('soon'), ['due-soon', 'unplanned'])
  assert.deepEqual(reasons('later'), ['unplanned'])
  assert.deepEqual(reasons('blocked'), ['blocked', 'unplanned'])
  assert.deepEqual(reasons('dependency'), ['blocked', 'unplanned'])
  assert.deepEqual(reasons('unresolved'), ['unresolved', 'unplanned'])
  assert.equal(reasons('done'), undefined); assert.equal(reasons('scheduled'), undefined)
  assert.equal(result.suggestion.target.id, 'late')
  assert.deepEqual(result.current.map(item => item.key), ['block:current'])
  assert.deepEqual(result.next.map(item => item.key), ['block:next'])
  assert.deepEqual(result.attention.find(item => item.key === 'reminder:snoozed').reasons, ['due-soon'])
})
test('conflicts and missing work have equivalent read-only meaning on both clients', () => {
  const input = fixture(); input.planning.blocks.push(block('orphan', 'missing', '2026-10-08T09:45:00Z', '2026-10-08T10:15:00Z'))
  const result = mobile(input)
  assert.deepEqual(result, main(input)); assert.equal(result.overlappingNow, true)
  assert.ok(result.attention.some(item => item.reasons.includes('conflict')))
  assert.ok(result.attention.some(item => item.key === 'planning:orphan'))
})
test('source failure is not no work; explicit clock/zone keeps output deterministic', () => {
  const input = fixture(); input.tasks[0].dependsOnTaskIds = 42
  assert.equal(readProductAttention(input).overview, null)
  assert.ok(readProductAttention(input).error)
  assert.deepEqual(main(fixture()), main(fixture()))
})
test('client navigation is isolated, once-only, active-scoped and generation-safe', () => {
  const mainNav = getProductNavigation('main'), mobileNav = getProductNavigation('mobile')
  const request = mobileNav.request({ kind: 'task', id: 'late' }, 'old')
  assert.equal(mainNav.getSnapshot(), null)
  assert.equal(mobileNav.consume(request, 'old', false), 'pending')
  assert.equal(mobileNav.consume(request, 'new', true), 'stale')
  const next = mobileNav.request({ kind: 'reminder', id: 'snoozed' }, 'new')
  assert.equal(mobileNav.consume(next, 'new', true), 'ready')
  assert.equal(mobileNav.consume(next, 'new', true), 'pending')
})

test('Mobile scheduling intent waits for active consumer and rejects replacement generations', async () => {
  const { requestPlanningNavigation, consumePlanningNavigation } = await import('../src/planning/planningNavigation.ts')
  const { draftRegistry } = await import('../src/storage/draftRegistry.ts')
  const request = requestPlanningNavigation('mobile', { mode: 'schedule', taskId: 'late' })
  assert.equal(consumePlanningNavigation('mobile', request, false), 'pending')
  assert.equal(consumePlanningNavigation('main', request, true), 'pending')
  draftRegistry.invalidate()
  assert.equal(consumePlanningNavigation('mobile', request, true), 'stale')
  const next = requestPlanningNavigation('mobile', { mode: 'schedule', taskId: 'late' })
  assert.equal(consumePlanningNavigation('mobile', next, true), 'ready')
  assert.equal(consumePlanningNavigation('mobile', next, true), 'pending')
})
