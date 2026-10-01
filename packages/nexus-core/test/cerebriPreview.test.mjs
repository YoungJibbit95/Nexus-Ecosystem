import test from 'node:test'
import assert from 'node:assert/strict'
import { validPreviewRequest, validPreviewInputs } from '../src/planning/cerebri/inputContracts.ts'
import { previewReasons } from '../src/planning/cerebri/previewReasons.ts'
import { createPreviewFlow } from '../src/planning/cerebri/previewFlow.ts'
import { emptyPlanningDocument } from '../src/planning/domain.ts'

const input = { durationMinutes: 30, timeZone: 'Europe/Berlin', window: { start: '2026-10-01T09:00:00Z', end: '2026-10-01T12:00:00Z' } }
const req = { taskId: 'task-one', requestId: 'request-one', traceId: 'trace-one', ...input }
test('explicit resolved inputs reject missing duration, local DST values, invented zones and excessive horizons', () => {
  assert.ok(validPreviewRequest(req))
  for (const patch of [{ durationMinutes: 0 }, { durationMinutes: 30.5 }, { durationMinutes: 10081 }, { timeZone: '+02:00' }, { timeZone: '' }, { timeZone: 'Europe/Imaginary' }, { window: { start: '2026-10-25T02:30:00', end: input.window.end } }, { window: { ...input.window, end: '2026-11-02T12:00:00Z' } }, { window: { ...input.window, start: '2026-10-01T09:00:00.000000001Z' } }]) assert.equal(validPreviewInputs({ ...input, ...patch }), false)
  assert.equal(validPreviewRequest({ ...req, coverage: 'Complete' }), false)
  assert.equal(validPreviewRequest({ ...req, window: { ...input.window, facts: [] } }), false)
})
test('reason projection accepts exact pinned unit/payload spelling, rejects arbitrary explanation messages', () => {
  const result = { evidence: { validation: { issues: ['IncompleteCoverage', 'PlanningPermissionDenied', { RequiredDuration: 'Unknown' }] }, conflicts: { rejections: [] } }, candidates: [] }
  assert.deepEqual(previewReasons(result).map(r => r.code), ['IncompleteCoverage', 'PlanningPermissionDenied', 'RequiredDuration.Unknown'])
  for (const reason of ['UNKNOWN', 'FreeSlot', 'ExecutionAuthorized', { RequiredDuration: 'Confident' }, { UserMessage: 'Private text' }, { RequiredTime: { object_id: 'one', reason: 'Unknown', extra: true } }]) assert.throws(() => previewReasons({ ...result, evidence: { ...result.evidence, validation: { issues: [reason] } } }), { code: 'invalid_response' })
})
test('disabled local flow neither invokes collector nor manual persistence', async () => {
  let calls = 0
  const flow = createPreviewFlow({ host: { preview: async () => { calls++; throw new Error('private') }, revalidate: async () => { calls++; throw new Error('private') }, invalidate() {} }, capture: () => { calls++; throw new Error('private') }, execute: async () => { calls++; throw new Error('private') }, id: () => 'id' })
  await flow.preview('task-one', input); await flow.confirm({ confirmed: true, keepConflict: true })
  assert.equal(flow.getSnapshot().status, 'disabled'); assert.equal(calls, 0)
})
test('superseded awaited preview cannot replace current UI or call persistence', async () => {
  let release, count = 0, commands = 0
  const pending = new Promise(resolve => { release = resolve })
  const flow = createPreviewFlow({ enabled: true, host: { preview: async () => { count++; return await pending }, revalidate: async () => ({ status: 'stale' }), invalidate() {} }, capture: () => ({ tasks: [{ id: 'task-one', status: 'todo' }], planning: emptyPlanningDocument('generation') }), execute: async () => { commands++; throw new Error('must not write') }, id: () => 'request' })
  const started = flow.preview('task-one', input); flow.invalidate(); release({ result: { status: 'error', code: 'timeout' }, ticket: null, coverage: null }); await started
  assert.equal(flow.getSnapshot().status, 'idle'); assert.equal(count, 1); assert.equal(commands, 0)
})
