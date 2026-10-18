import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { canonicalJson, canonicalBytes, parseCanonicalFile, validateContract, METHODS, CAPABILITY_MAPPING, JSON_SCHEMA_DOCUMENT, MAX_DOCUMENT_BYTES } from '../src/local-integration/index.ts'
import { directory, verifyCorpus, sha256, request } from './localIntegration.corpus.mjs'

const corpus = name => parseCanonicalFile(readFileSync(new URL(name, directory)))

test('published schema, fixtures and reproducible corpus manifest have no drift', () => {
  const manifest = verifyCorpus()
  assert.equal(manifest.entries.length, 4)
  const bytes = manifest.entries.map(entry => {
    const actual = readFileSync(new URL(entry.path, directory))
    assert.equal(actual.length, entry.bytes)
    assert.equal(sha256(actual), entry.sha256)
    return `${entry.sha256}  ${entry.path}\n`
  }).join('')
  assert.equal(sha256(Buffer.from(bytes, 'utf8')), manifest.corpusSha256)
  assert.equal(canonicalJson(corpus('wire-v1.schema.json')), canonicalJson(JSON_SCHEMA_DOCUMENT))
})

for (const vector of corpus('conformance.json').cases) {
  test(`schema-only: ${vector.id}`, () => {
    assert.equal(validateContract(vector.schema, vector.document).valid, vector.valid, vector.id)
  })
}

test('exactly ten explicit method/capability pairs; no dynamic provider registration', () => {
  assert.deepEqual(METHODS, ['system.hello', 'capabilities.list', 'mutation.status', 'notes.query', 'tasks.query', 'reminders.query', 'planning.queryRange', 'flux.getAttention', 'notes.create', 'tasks.create'])
  assert.equal(new Set(Object.values(CAPABILITY_MAPPING)).size, 10)
  assert.ok(Object.isFrozen(CAPABILITY_MAPPING))
  assert.ok(Object.isFrozen(JSON_SCHEMA_DOCUMENT.$defs))
  assert.throws(() => validateContract('arbitrary.method', {}), /Unknown contract/)
})

for (const vector of corpus('canonicalization.json').cases) {
  test(`canonical UTF-8: ${vector.id}`, () => {
    const input = JSON.parse(vector.input)
    assert.equal(canonicalJson(input), vector.canonical)
    const bytes = canonicalBytes(input)
    assert.equal(Buffer.from(bytes).toString('hex'), vector.utf8Hex)
    assert.equal(sha256(bytes), vector.sha256)
  })
}

test('non-JSON values, lone surrogates, accessors and cycles cannot be silently canonicalized', () => {
  const cyclic = {}; cyclic.self = cyclic
  for (const value of [NaN, Infinity, undefined, 1n, new Date(), /x/, '\ud800', '\udfff', { bad: undefined }, cyclic, [, 1], Object.defineProperty({}, 'bad', { enumerable: true, get() { throw new Error('must not run') } })]) assert.throws(() => canonicalJson(value))
  assert.equal(canonicalJson({ ['__proto__']: 1, a: 2 }), '{"__proto__":1,"a":2}')
  assert.notEqual(canonicalJson('é'), canonicalJson('e\u0301'))
})

test('corpus decoding rejects BOM, malformed UTF-8, duplicate keys, CRLF and extra whitespace', () => {
  for (const source of ['\ufeff{}\n', '{}\r\n', '{"a":1,"a":1}\n', '{ "a":1}\n', '{}', '{}\n\n']) assert.throws(() => parseCanonicalFile(Buffer.from(source)))
  assert.throws(() => parseCanonicalFile(new Uint8Array([0xff, 0x0a])))
  assert.deepEqual(parseCanonicalFile(Buffer.from('{"a":1}\n')), { a: 1 })
})

test('Unicode codepoint lengths and total UTF-8 byte budget are different constraints', () => {
  const value = request('notes.create')
  value.params.content = 'x'.repeat(65_536)
  assert.equal(validateContract('Request', value).valid, true)
  value.params.content += 'x'
  assert.equal(validateContract('Request', value).valid, false)
  value.params.content = '🧠'.repeat(33_000)
  assert.ok(canonicalBytes(value).length > MAX_DOCUMENT_BYTES)
  const result = validateContract('Request', value)
  assert.equal(result.valid, false)
  assert.equal(result.issues[0].keyword, 'maxDocumentBytes')
  value.params.content = '\ud800'
  assert.equal(validateContract('Request', value).valid, false)
})

test('SCENARIO FIXTURES ONLY: messages are well-formed; future runtime behavior is NOT executed', () => {
  const scenarios = corpus('scenarios.json').scenarios
  assert.ok(scenarios.length >= 30)
  assert.equal(new Set(scenarios.map(value => value.id)).size, scenarios.length)
  for (const scenario of scenarios) {
    assert.equal(scenario.runtimeEvidenceRequired, true)
    for (const request of scenario.requests) assert.equal(validateContract('Request', request).valid, scenario.requestValid, scenario.id)
    assert.equal(validateContract('Response', scenario.expectedResponse).valid, true, scenario.id)
  }
  const recovery = scenarios.find(value => value.id === 'new-session-reconciles-original-action-and-key')
  const [original, query] = recovery.requests
  assert.notEqual(query.context.sessionId, original.context.sessionId)
  assert.equal(query.params.action.origin.sessionId, original.context.sessionId)
  assert.equal(query.params.action.idempotencyKey, original.mutation.idempotencyKey)
  assert.deepEqual(recovery.expectedResponse.data.receipt.action, query.params.action)
  for (const scenario of scenarios.filter(value => value.id.startsWith('flux-bounded-prefix:'))) {
    const snapshot = scenario.expectedResponse.data.snapshot
    assert.equal(snapshot.nextCursor, null)
    assert.equal(snapshot.data.length, Math.min(scenario.facts.completeAuthorizedProjectionCount, scenario.requests[0].params.limit))
    assert.equal(snapshot.truncated, scenario.facts.completeAuthorizedProjectionCount > snapshot.data.length)
  }
  const byteLimited = scenarios.find(value => value.id === 'flux-byte-budget-overflow-is-explicit').expectedResponse.data.snapshot
  assert.equal(byteLimited.truncated, true)
  assert.equal(byteLimited.nextCursor, null)
  const policyBoundary = scenarios.find(value => value.id === 'nexus-authorization-does-not-claim-jarvis-policy')
  assert.equal(policyBoundary.facts.jarvisExecutionPermitted, false)
  for (const capability of policyBoundary.expectedResponse.data.capabilities) {
    assert.equal(capability.nexusState, 'authorized')
    assert.equal(Object.hasOwn(capability, 'jarvisPolicyVerdict'), false)
    assert.equal(Object.hasOwn(capability, 'state'), false)
  }
  for (const scenario of scenarios.filter(value => value.id.startsWith('receipt-original-planning-revision:'))) {
    const revision = scenario.expectedResponse.data.receipt.revision
    assert.deepEqual(revision, { source: 'planning-document', value: scenario.facts.originalCommandReceiptRevision })
    assert.notEqual(revision.value, scenario.facts.currentPlanningRevision)
  }
})

test('isolated subpath remains dependency-free and is not imported by the product barrel', () => {
  const sourceDirectory = new URL('../src/local-integration/', import.meta.url)
  for (const name of readdirSync(sourceDirectory).filter(value => value.endsWith('.ts'))) {
    const text = readFileSync(new URL(name, sourceDirectory), 'utf8')
    for (const [, dependency] of text.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)) assert.match(dependency, /^\.\/(schema|canonical|contracts)$/)
  }
  assert.doesNotMatch(readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8'), /local-integration/)
})

test('wire contract and negative compile-time examples pass TypeScript strict mode', () => {
  const candidates = ['../../../Nexus Main/node_modules/typescript/bin/tsc', '../node_modules/typescript/bin/tsc', '../../../Nexus Mobile/node_modules/typescript/bin/tsc']
  const compiler = candidates.map(value => new URL(value, import.meta.url)).find(value => existsSync(value))
  assert.ok(compiler, 'Install a public client TypeScript dependency, as required by the core typecheck')
  const result = spawnSync(process.execPath, [fileURLToPath(compiler), '-p', fileURLToPath(new URL('../src/local-integration/tsconfig.json', import.meta.url))], { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stdout + result.stderr)
})
