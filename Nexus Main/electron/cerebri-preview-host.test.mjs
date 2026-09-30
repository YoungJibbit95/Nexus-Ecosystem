import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createCerebriPreviewHost } from './cerebri-preview-host.mjs'
import { artifactSha256, REVIEWED_CEREBRI_SOURCE } from './cerebri-host.mjs'
import { createSuggestionOwner } from '../../packages/nexus-core/src/planning/cerebri/owner.ts'
import { prepareSuggestion } from '../../packages/nexus-core/src/planning/cerebri/adapter.ts'
import { validPreviewRequest } from '../../packages/nexus-core/src/planning/cerebri/inputContracts.ts'
import { previewReasons } from '../../packages/nexus-core/src/planning/cerebri/previewReasons.ts'
import { createPreviewFlow } from '../../packages/nexus-core/src/planning/cerebri/previewFlow.ts'
import { createPlanningCommandOwner } from '../../packages/nexus-core/src/planning/commandService.ts'
import { emptyPlanningDocument } from '../../packages/nexus-core/src/planning/domain.ts'
import { syntheticSnapshot } from '../../packages/nexus-core/test/fixtures/cerebriSynthetic.ts'

const source = process.env.NEXUS_CEREBRI_N1_SOURCE, real = { skip: !source }
const inputs = { durationMinutes: 30, timeZone: 'Europe/Berlin', window: syntheticSnapshot().window }
const request = { taskId: 'task-one', requestId: 'preview-one', traceId: 'trace-one', ...inputs }
let configuration
async function setup() {
  if (!configuration) {
    assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, windowsHide: true, encoding: 'utf8' }).trim(), REVIEWED_CEREBRI_SOURCE)
    const binary = path.join(source, 'target/debug/cerebri-node-bridge' + (process.platform === 'win32' ? '.exe' : ''))
    configuration = { sourceSha: REVIEWED_CEREBRI_SOURCE, binary, binarySha256: await artifactSha256(binary), nodeModule: path.join(source, 'bindings/node/index.mjs'), timeoutMs: 10000 }
  }
  return configuration
}
function host(context, config, patch = {}) {
  return createCerebriPreviewHost({ consumer: createSuggestionOwner, prepare: prepareSuggestion, validRequest: validPreviewRequest, enabled: true,
    configuration: config, capture: async () => structuredClone(context), currentSnapshot: () => context, ...patch })
}
function nexus(host, patch = {}) {
  const task = { id: 'task-one', title: 'Private synthetic title', desc: 'Private synthetic note', status: 'todo', priority: 'mid', created: '2026-09-30T00:00:00Z', updated: '2026-09-30T00:00:00Z', futureField: { retained: true } }
  let state = { tasks: [task], planning: emptyPlanningDocument('generation-one') }, saved = structuredClone(state), pending = null, id = 0, fails = [], calls = []
  const owner = createPlanningCommandOwner({ initialize: async () => {}, capture: () => structuredClone(state), apply: next => { state = structuredClone(next) },
    journal: { read: async () => pending, write: async (before, after) => { pending = { before, after } }, clear: async () => { pending = null } },
    flush: async () => { if (fails.shift()) return false; saved = structuredClone(state); return true }, isFrozen: () => false, id: () => `block-${++id}`, now: () => '2026-09-30T00:00:00Z' })
  const flow = createPreviewFlow({ enabled: true, host, capture: () => structuredClone(state), execute: command => { calls.push(structuredClone(command)); return owner.execute(command) }, id: () => `nexus-${++id}`, ...patch })
  return { flow, owner, calls, fails, state: () => state, saved: () => saved, task, mutate: fn => fn(state) }
}

test('N2 stays off by default and rejects renderer authority before collection', async () => {
  let captures = 0
  const h = host({}, undefined, { enabled: false, capture: async () => { captures++; return {} } })
  assert.equal((await h.preview(request)).result.status, 'unavailable'); assert.equal(captures, 0)
  h.setEnabled(true)
  for (const field of ['coverage', 'principalId', 'read', 'plan', 'busy', 'binary', 'nodeModule', 'contextRevision', 'rawNote', 'request']) {
    assert.equal((await h.preview({ ...request, [field]: 'forged' })).result.code, 'invalid_intent')
  }
  assert.equal(captures, 0)
})
test('superseding host capture cancels previous work and rejects overlapping process admission', async () => {
  let release, captures = 0
  const waiting = new Promise(resolve => { release = resolve })
  const h = host(syntheticSnapshot(), undefined, { capture: async () => { captures++; await waiting; return syntheticSnapshot() } })
  const first = h.preview(request)
  const second = await h.preview({ ...request, requestId: 'superseding' })
  assert.equal(second.result.code, 'busy'); assert.equal(captures, 1)
  release(); assert.equal((await first).result.status, 'cancelled')
})
test('real pinned Rust preview preserves order, real reason enums and no execution grant', real, async () => {
  const h = host(syntheticSnapshot(), await setup()), result = await h.preview(request)
  assert.equal(result.result.outcome, 'Solution'); assert.equal(result.coverage, 'Complete'); assert.ok(result.ticket)
  assert.equal(result.result.candidates[0].start, '2026-10-01T10:00:00Z')
  const reasons = previewReasons(result.result)
  assert.ok(reasons.some(r => r.code === 'AnalysisOnly')); assert.ok(reasons.some(r => r.code === 'HardConstraint.Overlap'))
  assert.equal((await h.revalidate({ ticket: result.ticket, candidateId: result.result.candidates[0].id })).status, 'fresh')
  assert.equal((await h.revalidate({ ticket: result.ticket, candidateId: 'invented' })).status, 'error')
  assert.equal((await h.revalidate({ ticket: result.ticket, candidateId: result.result.candidates[0].id, permission: true })).status, 'error')
  console.log('[cerebri-n2] real source=' + REVIEWED_CEREBRI_SOURCE + ' binary_sha256=' + configuration.binarySha256 + ' starts=' + result.result.candidates.map(c => c.start).join(','))
})
test('real Rust unknown coverage, denied plan, no fit and budget keep distinct outcomes/reasons', real, async () => {
  for (const [patch, outcome, code] of [
    [{ coverage: 'Incomplete' }, 'InsufficientInformation', 'IncompleteCoverage'],
    [{ plan: false }, 'InsufficientInformation', 'PlanningPermissionDenied'],
    [{ read: false }, 'InsufficientInformation', 'PlanningPermissionDenied'],
    [{ busy: [{ ...syntheticSnapshot().busy[0], range: inputs.window }] }, 'NoSolution', 'HardConstraint.Overlap'],
    [{ maxCandidates: 6 }, 'Solution', 'AnalysisOnly'],
  ]) {
    const actual = await host({ ...syntheticSnapshot(), ...patch }, await setup()).preview(request)
    assert.equal(actual.result.outcome, outcome)
    assert.ok(previewReasons(actual.result).some(r => r.code === code))
    if (outcome !== 'Solution') assert.equal(actual.ticket, null)
    if (patch.maxCandidates) assert.equal(actual.result.assessment, 'BestFound')
  }
})
test('trusted context coverage cannot be widened by a renderer horizon', real, async () => {
  const actual = await host(syntheticSnapshot(), await setup()).preview({ ...request, window: { ...inputs.window, end: '2026-10-02T12:00:00Z' } })
  assert.equal(actual.result.status, 'error'); assert.equal(actual.ticket, null)
})
test('fresh host revisions, permissions, occupancy and cancellation invalidate preview tickets', real, async () => {
  for (const mutate of [s => s.contextRevision++, s => s.permissionRevision++, s => s.plan = false, s => s.busy[0].revision++, s => s.workspaceGeneration++, s => s.task.revision++]) {
    const s = syntheticSnapshot(), h = host(s, await setup()), p = await h.preview(request)
    mutate(s)
    assert.equal((await h.revalidate({ ticket: p.ticket, candidateId: p.result.candidates[0].id })).status, 'stale')
  }
  const h = host(syntheticSnapshot(), configuration), p = await h.preview(request)
  h.invalidate(); assert.equal((await h.revalidate({ ticket: p.ticket, candidateId: p.result.candidates[0].id })).status, 'stale')
})
test('actual shared manual command persists only after explicit confirmation and acknowledges one block', real, async () => {
  const f = nexus(host(syntheticSnapshot(), await setup()))
  await f.flow.preview('task-one', inputs)
  assert.equal(f.state().planning.blocks.length, 0); assert.equal(f.calls.length, 0)
  f.flow.select(f.flow.getSnapshot().result.candidates[0].id)
  await f.flow.confirm({ confirmed: false, keepConflict: true }); assert.equal(f.calls.length, 0)
  await f.flow.confirm({ confirmed: 'yes', keepConflict: true }); assert.equal(f.calls.length, 0)
  await f.flow.confirm({ confirmed: true, keepConflict: false })
  assert.equal(f.flow.getSnapshot().commandResult.code, 'conflict'); assert.equal(f.state().planning.blocks.length, 0)
  await Promise.all([f.flow.confirm({ confirmed: true, keepConflict: true }), f.flow.confirm({ confirmed: true, keepConflict: true })])
  assert.equal(f.flow.getSnapshot().status, 'acknowledged'); assert.equal(f.state().planning.blocks.length, 1)
  assert.deepEqual(f.saved(), f.state()); assert.deepEqual(f.state().tasks[0], f.task)
  const command = f.calls.at(-1), replay = await f.owner.execute(command)
  assert.equal(replay.replayed, true); assert.equal(f.state().planning.blocks.length, 1)
  assert.equal(JSON.parse(f.state().planning.receipts[command.key].command).expected.taskRevision.includes('Private synthetic title'), true)
})
test('canonical Nexus task and planning changes after preview prevent any manual command', real, async () => {
  for (const mutate of [s => s.tasks[0].desc += ' changed', s => s.tasks[0].futureField.retained = false, s => s.tasks[0].status = 'done', s => s.planning.generation = 'replaced', s => s.planning.revision++]) {
    const f = nexus(host(syntheticSnapshot(), await setup()))
    await f.flow.preview('task-one', inputs); f.flow.select(f.flow.getSnapshot().result.candidates[0].id)
    f.mutate(mutate); await f.flow.confirm({ confirmed: true, keepConflict: true })
    assert.equal(f.flow.getSnapshot().status, 'stale'); assert.equal(f.calls.length, 0)
  }
})
test('task edit during awaited host revalidation is rechecked synchronously before command', real, async () => {
  const h = host(syntheticSnapshot(), await setup()); let f
  f = nexus({ ...h, revalidate: async selection => { const actual = await h.revalidate(selection); f.mutate(s => s.tasks[0].desc = 'Edited while awaiting'); return actual } })
  await f.flow.preview('task-one', inputs); f.flow.select(f.flow.getSnapshot().result.candidates[0].id)
  await f.flow.confirm({ confirmed: true, keepConflict: true })
  assert.equal(f.flow.getSnapshot().status, 'stale'); assert.equal(f.calls.length, 0)
})
test('storage failure restores exact previous document; explicit retry keeps the same receipt key', real, async () => {
  const f = nexus(host(syntheticSnapshot(), await setup()))
  await f.flow.preview('task-one', inputs); f.flow.select(f.flow.getSnapshot().result.candidates[0].id)
  const before = structuredClone(f.state()); f.fails.push(true, false)
  await f.flow.confirm({ confirmed: true, keepConflict: true })
  assert.equal(f.flow.getSnapshot().status, 'command-error'); assert.equal(f.flow.getSnapshot().commandResult.code, 'storage-failure')
  assert.deepEqual(f.state(), before); assert.deepEqual(f.saved(), before)
  const first = f.calls[0]
  await f.flow.confirm({ confirmed: true, keepConflict: true })
  assert.equal(f.flow.getSnapshot().status, 'acknowledged'); assert.deepEqual(f.calls[1], first); assert.equal(f.state().planning.blocks.length, 1)
})
test('renderer request excludes task contents, links and host facts; real offline outcome never writes', real, async () => {
  let captured
  const s = syntheticSnapshot(), h = host(s, { ...await setup(), binary: path.join(source, 'absent.exe') }, { capture: async r => { captured = r; return s } }), f = nexus(h)
  await f.flow.preview('task-one', inputs)
  assert.equal(f.flow.getSnapshot().result.code, 'bridge_unavailable')
  assert.deepEqual(Object.keys(captured).sort(), ['durationMinutes', 'requestId', 'taskId', 'timeZone', 'traceId', 'window'])
  assert.ok(!JSON.stringify(captured).includes('Private')); assert.equal(f.calls.length, 0); assert.equal(f.state().planning.blocks.length, 0)
})
