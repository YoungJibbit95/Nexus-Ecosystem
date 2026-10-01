import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareSuggestion } from '../src/planning/cerebri/adapter'
import { decodeManifest } from '../src/planning/cerebri/decoder'
import { createSuggestionOwner } from '../src/planning/cerebri/owner'
import { instant, type SuggestionSnapshot, type SuggestionIntent } from '../src/planning/cerebri/contracts'

import { intent, syntheticSnapshot, manifest } from './fixtures/cerebriSynthetic'
const ready = (s = syntheticSnapshot()) => { const p = prepareSuggestion(intent, s); assert.equal(p.status, 'ready'); return p.status === 'ready' ? p.value : assert.fail('not ready') }
const key = (s: SuggestionSnapshot, i = intent) => { const p = prepareSuggestion(i, s); return p.status === 'ready' ? p.value.freshnessKey : null }

test('N1 maps explicit synthetic facts immutably to one analysis-only Event with separate task identity', () => {
  const snapshot = syntheticSnapshot()
  const before = structuredClone(snapshot)
  const p = ready(snapshot), request = p.envelope.request as any
  assert.deepEqual(snapshot, before)
  assert.notEqual(p.targetId, snapshot.task.id)
  assert.equal(request.operation, 'FIND_SLOT')
  assert.deepEqual(request.target_ids, [p.targetId])
  assert.equal(request.context.objects[0].revision, null)
  assert.equal(request.context.objects[0].time.value.knowledge.state, 'MISSING')
  assert.deepEqual(request.context.objects[1].time.value.knowledge.data, snapshot.busy[0].range)
  assert.equal(request.duration.provenance, 'USER_EXPLICIT')
  assert.equal(request.scope.max_mutations, 0)
  assert.deepEqual(request.scope.movable_object_ids, [])
  assert.deepEqual(request.policy.snapshot.mutation, { max_mutations: 0, allowed_actions: [] })
  assert.deepEqual(request.planning_capability.mutations, [])
  assert.deepEqual(request.context.temporal.series, [])
  assert.deepEqual(request.constraints, []) // workflow dependencies/reminders never become occupied intervals
  assert.equal(JSON.stringify(p.envelope).includes('task-one'), false)
  for (const objectIds of [undefined, null, [], [p.targetId]]) {
    assert.deepEqual((ready({ ...snapshot, objectIds }).envelope.request as any).scope.object_ids, objectIds ?? null)
  }
  const noisy = { ...snapshot, title: 'private-title', notes: 'private-notes', reminders: [{ body: 'private-reminder' }] }
  assert.equal(JSON.stringify(ready(noisy).envelope).includes('private-'), false)
})

test('unknown duration, zone, civil deadline/recurrence and workflow readiness require clarification without guesses', () => {
  const s = syntheticSnapshot()
  for (const state of ['MISSING', 'UNKNOWN', 'UNCERTAIN', 'AMBIGUOUS', 'UNRESOLVED'] as const) {
    assert.equal(prepareSuggestion(intent, { ...s, task: { ...s.task, durationSeconds: { state } } }).status, 'clarification')
    assert.equal(prepareSuggestion(intent, { ...s, timezone: { state } }).status, 'clarification')
  }
  for (const patch of [{ task: { ...s.task, deadline: { state: 'DATE_ONLY' as const } } }, { task: { ...s.task, workflowReady: false } }, { unsupportedRecurrence: true }]) {
    assert.equal(prepareSuggestion(intent, { ...s, ...patch }).status, 'clarification')
  }
  assert.equal((ready({ ...s, coverage: 'Incomplete' }).envelope.request as any).context.temporal.coverage, 'Incomplete')
  assert.equal((ready({ ...s, busy: [] }).envelope.request as any).context.temporal.coverage, 'Complete') // explicit synthetic assertion retained, never inferred
  const deadline = '2026-10-01T11:00:00Z'
  assert.deepEqual((ready({ ...s, task: { ...s.task, deadline: { state: 'KNOWN', data: deadline } } }).envelope.request as any).constraints,
    [{ object_id: ready(s).targetId, rule: { kind: 'LATEST_END', value: deadline }, evidence: [] }])
})

test('unsafe revisions/budgets, invalid resolved instants/zone and arbitrary renderer authority fail closed', () => {
  const s = syntheticSnapshot()
  for (const patch of [{ contextRevision: Number.MAX_SAFE_INTEGER + 1 }, { permissionRevision: -1 }, { maxCandidates: 4097 }, { granularitySeconds: 0 },
    { task: { ...s.task, durationSeconds: { state: 'KNOWN' as const, data: Number.MAX_SAFE_INTEGER + 1 } } },
    { window: { start: '2026-02-30T09:00:00Z', end: s.window.end } }, { window: { start: '2026-10-25T02:30:00', end: s.window.end } },
    { timezone: { state: 'KNOWN' as const, data: 'Not/AZone' } }]) assert.throws(() => prepareSuggestion(intent, { ...s, ...patch }), { code: 'invalid_snapshot' })
  assert.throws(() => prepareSuggestion({ ...intent, binary: 'private-command' } as any, s), { code: 'invalid_intent' })
  assert.equal(instant('2026-10-01T09:00:00.000000001Z')! - instant('2026-10-01T09:00:00Z')!, 1n)
})

test('freshness binds content/source/generation/permission; capture clock is not a revision', () => {
  const s = syntheticSnapshot(), k = key(s)
  assert.equal(key({ ...s, capturedAt: '2026-10-01T08:00:01Z' }), k)
  for (const patch of [{ workspaceGeneration: 3 }, { permissionRevision: 5 }, { contextRevision: 2 }, { read: false }, { task: { ...s.task, revision: 9 } },
    { busy: [{ ...s.busy[0], range: { ...s.busy[0].range, end: '2026-10-01T10:00:00.000000001Z' } }] }]) assert.notEqual(key({ ...s, ...patch }), k)
})

test('manifest exact profile/version axes reject incompatible metadata', () => {
  assert.deepEqual(decodeManifest(manifest), manifest)
  for (const patch of [{ profile: 'other' }, { integration_version: { major: 0, minor: 2 } }, { cpir_schema_version: { major: 0, minor: 1 } }, { execution_supported: true }, { operations: ['CREATE'] }]) {
    assert.throws(() => decodeManifest({ ...manifest, ...patch }), { code: 'incompatible_bridge' })
  }
})

test('off/browser/mobile and clarification start no transport or capture; errors expose fixed code only', async () => {
  let calls = 0
  const options = { capture: async () => { calls++; return syntheticSnapshot() }, currentFreshnessKey: () => key(syntheticSnapshot()),
    port: { describe: async () => { calls++; return manifest }, suggest: async () => { calls++; throw new Error('private-child-content') } } }
  for (const platform of ['desktop', 'browser', 'mobile'] as const) {
    const owner = createSuggestionOwner({ ...options, platform, enabled: platform !== 'desktop' })
    assert.equal((await owner.request(intent)).status, 'unavailable')
  }
  assert.equal(calls, 0)
  const missing = createSuggestionOwner({ ...options, platform: 'desktop', enabled: true, capture: async () => ({ ...syntheticSnapshot(), timezone: { state: 'MISSING' } }) })
  assert.equal((await missing.request(intent)).status, 'clarification')
  assert.equal(calls, 0)
  const owner = createSuggestionOwner({ ...options, platform: 'desktop', enabled: true })
  assert.deepEqual(await owner.request(intent), { status: 'error', code: 'bridge_failed' })
  assert.deepEqual(await owner.request({ ...intent, principalId: 'evil' } as any), { status: 'error', code: 'invalid_intent' })
})

test('owner discards late replies, source changes, permission changes, disable and disposal even if transport ignores abort', async () => {
  let current = syntheticSnapshot()
  let resolve!: (v: unknown) => void
  let called!: () => void
  const reached = () => new Promise<void>(r => { called = r })
  const owner = createSuggestionOwner({ platform: 'desktop', enabled: true, capture: async () => current, currentFreshnessKey: i => key(current, i),
    port: { describe: async () => manifest, suggest: async () => { called(); return new Promise(r => { resolve = r }) } } })
  for (const action of [() => { current = { ...current, permissionRevision: current.permissionRevision + 1 } }, () => owner.invalidate(), () => owner.setEnabled(false), () => owner.dispose()]) {
    owner.setEnabled(true)
    const started = reached(), pending = owner.request(intent)
    await started
    action()
    resolve({ integration_version: { major: 0, minor: 1 }, status: 'rejected', code: 'invalid_request' })
    assert.ok(['stale', 'cancelled'].includes((await pending).status))
  }
})

test('new intent cancels old work and discards its out-of-order reply even when transport ignores cancellation', async () => {
  const s = syntheticSnapshot()
  const pending = new Map<string, (value: unknown) => void>()
  const signals: AbortSignal[] = []
  const owner = createSuggestionOwner({ platform: 'desktop', enabled: true, capture: async () => s, currentFreshnessKey: i => key(s, i),
    port: { describe: async () => manifest, suggest: async (request: any, signal) => { signals.push(signal); return new Promise(r => pending.set(request.request.request_id, r)) } } })
  const first = owner.request(intent)
  for (let n = 0; n < 10 && !pending.has(intent.requestId); n++) await Promise.resolve()
  assert.ok(pending.has(intent.requestId))
  assert.deepEqual(await owner.request({ ...intent, executable: 'private-command' } as any), { status: 'error', code: 'invalid_intent' })
  assert.equal(signals[0].aborted, true)
  const next = { ...intent, requestId: 'next-request', traceId: 'next-trace' }
  const second = owner.request(next)
  for (let n = 0; n < 10 && !pending.has(next.requestId); n++) await Promise.resolve()
  assert.equal(signals[0].aborted, true)
  pending.get(next.requestId)!({ integration_version: { major: 0, minor: 1 }, status: 'rejected', code: 'invalid_request' })
  assert.deepEqual(await second, { status: 'rejected', code: 'invalid_request' })
  pending.get(intent.requestId)!({ integration_version: { major: 0, minor: 1 }, status: 'rejected', code: 'invalid_request' })
  assert.deepEqual(await first, { status: 'cancelled' })
})
