import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { createCerebriHost, artifactSha256, REVIEWED_CEREBRI_SOURCE } from './cerebri-host.mjs'
import { prepareSuggestion } from '../../packages/nexus-core/src/planning/cerebri/adapter.ts'
import { createSuggestionOwner } from '../../packages/nexus-core/src/planning/cerebri/owner.ts'
import { decodeManifest, decodeSuggestion } from '../../packages/nexus-core/src/planning/cerebri/decoder.ts'
import { intent, syntheticSnapshot } from '../../packages/nexus-core/test/fixtures/cerebriSynthetic.ts'

// A source worktree is explicit trusted test configuration, never a product default.
const source = process.env.NEXUS_CEREBRI_N1_SOURCE
const real = { skip: !source }
const suffix = process.platform === 'win32' ? '.exe' : ''
const ready = (snapshot = syntheticSnapshot()) => { const p = prepareSuggestion(intent, snapshot); assert.equal(p.status, 'ready'); return p.value }
const currentKey = (s, i = intent) => prepareSuggestion(i, s).value?.freshnessKey ?? null
let configuration, bridge
async function setup() {
  if (configuration) return configuration
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, windowsHide: true, encoding: 'utf8' }).trim(), REVIEWED_CEREBRI_SOURCE)
  const binary = path.join(source, 'target/debug/cerebri-node-bridge' + suffix)
  configuration = { sourceSha: REVIEWED_CEREBRI_SOURCE, binary, binarySha256: await artifactSha256(binary), nodeModule: path.join(source, 'bindings/node/index.mjs'), timeoutMs: 10000 }
  bridge = await import(pathToFileURL(configuration.nodeModule).href)
  return configuration
}
function host(snapshot, config, overrides = {}) {
  return createCerebriHost({ consumer: createSuggestionOwner, enabled: true, configuration: config,
    capture: async () => snapshot, currentFreshnessKey: i => currentKey(snapshot, i), ...overrides })
}
function cli(envelope) {
  return JSON.parse(execFileSync(configuration.binary, ['--suggest'], { input: JSON.stringify(envelope), encoding: 'utf8', windowsHide: true, maxBuffer: 16 * 1024 * 1024 }))
}

test('host is off by default; browser/mobile start no collector or process', async () => {
  let captures = 0
  for (const patch of [{}, { platform: 'browser', enabled: true }, { platform: 'mobile', enabled: true }]) {
    const owner = createCerebriHost({ consumer: createSuggestionOwner, capture: async () => { captures++; throw new Error('private') }, currentFreshnessKey: () => null, ...patch })
    assert.equal((await owner.request(intent)).status, 'unavailable')
  }
  assert.equal(captures, 0)
})

test('real pinned Rust CLI, reviewed Node wrapper and host decoder agree on all seven ordered starts', real, async () => {
  const config = await setup(), s = syntheticSnapshot(), p = ready(s)
  const started = performance.now()
  const direct = cli(p.envelope)
  const wrapped = await bridge.suggest(p.envelope, { binary: config.binary })
  assert.deepEqual(wrapped, direct)
  const actual = await host(s, config).request(intent)
  assert.equal(actual.status, 'planned')
  assert.equal(actual.outcome, 'Solution')
  assert.equal(actual.assessment, 'ProvenOptimal')
  assert.deepEqual(actual.evidence, direct.result)
  assert.deepEqual(actual.candidates.map(c => c.start), [
    '2026-10-01T10:00:00Z', '2026-10-01T10:15:00Z', '2026-10-01T10:30:00Z', '2026-10-01T10:45:00Z',
    '2026-10-01T11:00:00Z', '2026-10-01T11:15:00Z', '2026-10-01T11:30:00Z',
  ])
  assert.deepEqual(actual.candidates.map(c => c.id), direct.result.candidates.map(c => c.proposed.id))
  assert.equal(actual.candidates[0].placement.start, s.busy[0].range.end) // half-open adjacency
  console.log(`[cerebri-n1] CLI + Node + host conformance elapsed_ms=${(performance.now() - started).toFixed(2)} binary_sha256=${config.binarySha256}`)
})

test('real Rust NoSolution, incomplete coverage, denied read/plan, scope exclusion and BestFound stay distinct', real, async () => {
  const config = await setup(), s = syntheticSnapshot()
  for (const [snapshot, outcome, assessment] of [
    [{ ...s, busy: [{ ...s.busy[0], range: s.window }] }, 'NoSolution', 'Complete'],
    [{ ...s, coverage: 'Incomplete' }, 'InsufficientInformation', 'BestFound'],
    [{ ...s, read: false }, 'InsufficientInformation', 'BestFound'],
    [{ ...s, plan: false }, 'InsufficientInformation', 'BestFound'],
    [{ ...s, objectIds: [] }, 'InsufficientInformation', 'BestFound'],
    [{ ...s, maxCandidates: 6 }, 'Solution', 'BestFound'],
  ]) {
    const direct = cli(ready(snapshot).envelope)
    const actual = await host(snapshot, config).request(intent)
    assert.equal(actual.status, 'planned')
    assert.equal(actual.outcome, outcome)
    assert.equal(actual.assessment, assessment)
    assert.deepEqual(actual.evidence, direct.result)
    if (outcome !== 'Solution') assert.deepEqual(actual.candidates, [])
    if (snapshot.coverage === 'Incomplete') {
      assert.ok(actual.evidence.validation.issues.includes('IncompleteCoverage'))
      assert.deepEqual(actual.evidence.compilation.availability.free, [])
    }
    if (snapshot.read === false || snapshot.plan === false) assert.ok(actual.evidence.validation.issues.includes('PlanningPermissionDenied'))
  }
})

test('real Rust consumes explicit latest-end; missing duration never invokes bridge', real, async () => {
  const config = await setup(), s = syntheticSnapshot()
  const actual = await host({ ...s, task: { ...s.task, deadline: { state: 'KNOWN', data: '2026-10-01T11:00:00Z' } } }, config).request(intent)
  assert.equal(actual.status, 'planned')
  assert.equal(actual.candidates.length, 3)
  const missing = { ...s, task: { ...s.task, durationSeconds: { state: 'MISSING' } } }
  assert.deepEqual(await host(missing, { ...config, binary: '/absent' }).request(intent), { status: 'clarification', code: 'missing_duration' })
})

test('Rust canonical UTC serialization retains the exact subsecond instant without false staleness or rounding', real, async () => {
  const config = await setup(), s = syntheticSnapshot()
  const fractional = { ...s, window: { start: '2026-10-01T09:00:00.100000000Z', end: '2026-10-01T12:00:00.100000000Z' } }
  const actual = await host(fractional, config).request(intent)
  assert.equal(actual.status, 'planned')
  assert.equal(actual.outcome, 'Solution')
  assert.equal(actual.candidates[0].start, '2026-10-01T10:00:00.100Z')
})

test('real response decoder rejects forged correlations, unsafe numbers, missing feature nulls, execution claims and malformed fields', real, async () => {
  await setup()
  const p = ready(), raw = cli(p.envelope)
  for (const change of [
    r => { r.context_revision++ }, r => { r.request_id = 'other' }, r => { r.trace_id = 'other' },
    r => { r.result.candidates[0].proposed.source_revision++ }, r => { r.result.candidates[0].cost = Number.MAX_SAFE_INTEGER + 1 },
    r => { delete r.result.candidates[0].ranking_features.preferred_start_source }, r => { r.result.candidates[0].mutation_count = 1 },
    r => { r.result.candidates[0].proposed.placements[0].range.start = '2026-10-01T02:30:00' },
    r => { r.result.assessment = 'Optimal' }, r => { r.result.search_space.exhausted = false },
    r => { r.result.outcome = 'NoSolution' }, r => { r.result.validation.issues = 'private-text' },
  ]) {
    const corrupt = structuredClone(raw); change(corrupt)
    assert.throws(() => decodeSuggestion(corrupt, p), { code: 'invalid_response' })
  }
  assert.throws(() => decodeManifest({ integration_version: { major: 0, minor: 1 }, profile: 'wrong' }), { code: 'incompatible_bridge' })
})

test('real raw Rust fixture recurrence/dependency/DST evidence is retained, without claiming adapter support', real, async () => {
  await setup()
  for (const name of ['recurrence-busy', 'dependency-order', 'dst-skipped-planning']) {
    const request = JSON.parse(await readFile(path.join(source, 'examples/planner', name + '.json'), 'utf8'))
    request.schema_version = { major: 0, minor: 2 }
    request.operation = 'FIND_SLOT'
    request.scope.max_mutations = 0
    request.policy.snapshot.mutation = { max_mutations: 0, allowed_actions: [] }
    request.planning_capability.mutations = []
    request.policy.snapshot.allow_uncertain_duration = false
    request.context.temporal ??= { horizon: request.scope.time_range, coverage: 'Complete', limits: { max_dates: 31, max_occurrences: 128 }, series: [] }
    const envelope = { integration_version: { major: 0, minor: 1 }, request }
    const raw = await bridge.suggest(envelope, { binary: configuration.binary })
    assert.equal(raw.status, 'planned')
    const expected = { intent: { taskId: 'fixture-only', requestId: request.request_id, traceId: request.trace_id }, targetId: request.target_ids[0], contextRevision: request.context.revision,
      durationSeconds: request.duration.value.knowledge.data, window: request.scope.time_range }
    const decoded = decodeSuggestion(raw, expected)
    assert.equal(decoded.status, 'planned')
    assert.deepEqual(decoded.evidence.compilation, raw.result.compilation)
    assert.deepEqual(decoded.evidence.dependency_graph, raw.result.dependency_graph)
    if (name === 'recurrence-busy') assert.ok(decoded.evidence.compilation.occurrences.length > 0)
    if (name === 'dependency-order') assert.ok(decoded.evidence.dependency_graph.edges.length > 0)
    if (name === 'dst-skipped-planning') assert.ok(JSON.stringify(decoded.evidence.compilation).includes('2026-03-29'))
  }
})

test('trusted host rejects binary/module/source pin mismatch and closed renderer authority before spawn', real, async () => {
  const config = await setup(), s = syntheticSnapshot()
  for (const patch of [{ sourceSha: 'b'.repeat(40) }, { binarySha256: '0'.repeat(64) }, { timeoutMs: 0 }]) {
    assert.deepEqual(await host(s, { ...config, ...patch }).request(intent), { status: 'error', code: 'artifact_mismatch' })
  }
  assert.deepEqual(await host(s, config).request({ ...intent, binary: config.binary, principalId: 'other', mutations: ['CREATE_EVENT'] }), { status: 'error', code: 'invalid_intent' })
  assert.deepEqual(await host(s, { ...config, binary: path.join(source, 'absent.exe') }).request(intent), { status: 'error', code: 'bridge_unavailable' })
})

test('reviewed Node transport sanitizes errors, bounds bytes, and kills disposable hanging processes on abort/timeout', real, async t => {
  await setup()
  const directory = await mkdtemp(path.join(tmpdir(), 'nexus-cerebri-n1-'))
  t.after(async () => {
    const resolved = path.resolve(directory), root = path.resolve(tmpdir())
    assert.ok(resolved.startsWith(root + path.sep) && path.basename(resolved).startsWith('nexus-cerebri-n1-'))
    await rm(resolved, { recursive: true, force: true })
  })
  const binary = path.join(directory, 'fixture' + suffix)
  execFileSync('rustc', ['--edition=2024', path.join(source, 'bindings/node/test-fixtures/bridge.rs'), '-o', binary], { windowsHide: true })
  const hasCode = code => error => error.code === code && !error.message.includes('private-') && error.cause === undefined
  for (const [mode, code] of [['malformed', 'invalid_response'], ['failure', 'bridge_failed'], ['oversize', 'response_too_large'], ['incompatible', 'incompatible_bridge'], ['mismatch', 'invalid_response']]) {
    const program = path.join(directory, mode + suffix)
    await copyFile(binary, program)
    await assert.rejects(bridge.suggest(ready().envelope, { binary: program }), hasCode(code))
  }
  await assert.rejects(bridge.suggest({ private: 'x'.repeat(262144) }), hasCode('request_too_large'))
  const hanging = path.join(directory, 'hang' + suffix)
  await copyFile(binary, hanging)
  const delay = ms => new Promise(r => setTimeout(r, ms))
  const waitPid = async () => { for (let n = 0; n < 500; n++) { try { return Number(await readFile(path.join(directory, 'hang.pid'), 'utf8')) } catch { await delay(10) } } throw new Error('synthetic child missing') }
  const assertExited = async pid => { for (let n = 0; n < 200; n++) { try { process.kill(pid, 0) } catch (e) { if (e.code === 'ESRCH') return; throw e } await delay(10) } assert.fail('synthetic child not killed') }
  const controller = new AbortController()
  const aborted = assert.rejects(bridge.suggest(ready().envelope, { binary: hanging, signal: controller.signal }), hasCode('aborted'))
  const pid = await waitPid(); controller.abort(); await aborted; await assertExited(pid)
  await rm(path.join(directory, 'hang.pid'))
  const timed = assert.rejects(bridge.suggest(ready().envelope, { binary: hanging, timeoutMs: 700 }), hasCode('timeout'))
  const timedPid = await waitPid(); await timed; await assertExited(timedPid)
  const already = new AbortController(); already.abort()
  await assert.rejects(bridge.suggest(ready().envelope, { binary: configuration.binary, signal: already.signal }), hasCode('aborted'))
  // Exercise the actual host owner and configured reviewed Node module as well.
  await rm(path.join(directory, 'hang.pid'))
  // Leave OS process startup scheduling room; the deadline is failure isolation,
  // not a latency target. Read a PID before testing actual child termination.
  const hostConfig = { ...configuration, binary: hanging, binarySha256: await artifactSha256(hanging), timeoutMs: 3000 }
  const owner = host(syntheticSnapshot(), hostConfig)
  const hostPending = owner.request(intent)
  const hostPid = await waitPid()
  owner.setEnabled(false)
  assert.deepEqual(await hostPending, { status: 'cancelled' })
  await assertExited(hostPid)
  await rm(path.join(directory, 'hang.pid'))
  owner.setEnabled(true)
  const hostTimeout = owner.request(intent)
  const hostTimedPid = await Promise.race([waitPid(), hostTimeout.then(result => { throw new Error(`Host ended before pid: ${JSON.stringify(result)}`) })])
  assert.deepEqual(await hostTimeout, { status: 'error', code: 'timeout' })
  await assertExited(hostTimedPid)
  // Hashing/import is bounded to one active host call; superseding an in-flight
  // call cancels it, and any overlapping verification is rejected rather than queued.
  await rm(path.join(directory, 'hang.pid'))
  const first = owner.request(intent)
  const firstPid = await Promise.race([waitPid(), first.then(result => { throw new Error(`Host supersession call ended before pid: ${JSON.stringify(result)}`) })])
  const second = owner.request({ ...intent, requestId: 'superseding' })
  assert.deepEqual(await first, { status: 'cancelled' })
  const secondResult = await second
  assert.equal(secondResult.status, 'error')
  assert.ok(['busy', 'timeout'].includes(secondResult.code))
  await assertExited(firstPid)
  await assertExited(Number(await readFile(path.join(directory, 'hang.pid'), 'utf8')))
  const badIndex = path.join(directory, 'index.mjs')
  await writeFile(badIndex, 'throw new Error("private-module-must-never-import")')
  await copyFile(path.join(source, 'bindings/node/integration.mjs'), path.join(directory, 'integration.mjs'))
  assert.deepEqual(await host(syntheticSnapshot(), { ...configuration, nodeModule: badIndex }).request(intent), { status: 'error', code: 'artifact_mismatch' })
})
