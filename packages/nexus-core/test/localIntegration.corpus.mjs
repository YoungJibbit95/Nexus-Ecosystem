/** Explicit authoring/verification tool. Imported by tests; writes only with --write. */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { canonicalBytes, canonicalJson, JSON_SCHEMA_DOCUMENT, METHODS, CAPABILITY_MAPPING, PROTOCOL_VERSION, SCHEMA_VERSION, FIXTURE_VERSION, SCHEMA_ID } from '../src/local-integration/index.ts'

export const directory = new URL('./fixtures/local-integration-v1/', import.meta.url)
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
export const fileBytes = value => Buffer.from(`${canonicalJson(value)}\n`, 'utf8')
const hash = digit => digit.repeat(64)
const clone = value => structuredClone(value)
const now = '2026-10-18T10:00:00.000Z'
const context = { instanceId: 'i1', rendererEpoch: 'r1', runtimeGeneration: 'g1', sessionId: 's1', bridgeProfileId: 'b1', account: { mode: 'anonymous-local' }, scope: { kind: 'library' } }
const envelope = method => ({ protocolVersion: PROTOCOL_VERSION, schemaVersion: SCHEMA_VERSION, requestId: 'request-1', method })
const params = {
  'system.hello': { supportedSchemaVersions: [SCHEMA_VERSION] },
  'capabilities.list': {},
  'notes.query': { readConsistency: 'current', limit: 20, fields: ['id', 'title', 'updated'] },
  'tasks.query': { readConsistency: 'current', limit: 20, fields: ['id', 'title', 'deadline'] },
  'reminders.query': { readConsistency: 'current', limit: 20, fields: ['id', 'title', 'datetime'] },
  'planning.queryRange': { readConsistency: 'current', start: now, end: '2026-10-19T10:00:00.000Z', timeZone: 'Europe/Berlin', limit: 20 },
  'flux.getAttention': { readConsistency: 'current', now, timeZone: 'Europe/Berlin', limit: 20 },
  'notes.create': { title: 'Überblick 🧠', content: '# Agenda\n\nCafé / Cafe\u0301\r\n', tags: ['review'] },
  'tasks.create': { title: 'Verträge prüfen', priority: 'mid', durationMinutes: 30.5 },
}
const identity = (method = 'notes.create') => ({ actionId: 'action-1', clientId: 'client-1', method, idempotencyKey: 'stable-key-1', argumentsDigest: sha256(canonicalBytes(params[method])), origin: clone(context) })
params['mutation.status'] = { action: identity() }
export function request(method) {
  const document = { ...envelope(method), params: clone(params[method]) }
  if (method !== 'system.hello') document.context = clone(context)
  if (method.endsWith('.create')) document.mutation = { actionId: 'action-1', clientId: 'client-1', idempotencyKey: 'stable-key-1', argumentsDigest: identity(method).argumentsDigest, preconditions: { planningRevision: 27 } }
  return document
}
const receipt = (method = 'notes.create') => ({ action: identity(method), status: 'acknowledged', entities: [{ kind: method === 'notes.create' ? 'note' : 'task', id: 'entity-1' }], revision: 28, acknowledgedAt: now, retainedUntil: '2026-11-18T10:00:00.000Z', replayed: false, sideEffects: [] })
const snapshot = (data = []) => ({ consistency: 'current', durability: 'queued', snapshotEpoch: hash('a'), data, truncated: false, nextCursor: null, warnings: [] })
const descriptor = (syntaxKind = 'inline', persistence = 'preview_only') => ({ id: 'badge', version: 1, schemaHash: hash('b'), syntaxKind, label: 'Badge', description: 'Synthetic descriptor; no serializer is installed.', fields: [{ key: 'label', type: 'string', required: true, multiline: false, minLength: 1, maxLength: 64 }], serializerVersion: '1', persistence, supportedMethods: [], sideEffects: [], supportedClients: ['main'], dependencies: [] })
export function response(method, schemaHash = hash('c')) {
  const document = { ...envelope(method), status: 'accepted' }
  if (method !== 'system.hello') document.context = clone(context)
  const data = {
    'system.hello': { instanceId: 'i1', supportedProtocolVersions: [PROTOCOL_VERSION], supportedSchemaVersions: [SCHEMA_VERSION], state: 'NOT_READY' },
    'capabilities.list': { capabilities: METHODS.map(name => ({ method: name, capability: CAPABILITY_MAPPING[name], schemaId: SCHEMA_ID, schemaVersion: SCHEMA_VERSION, schemaHash, state: 'known' })), magicDescriptors: [descriptor()] },
    'mutation.status': { state: 'not_found', action: identity() },
    'notes.query': snapshot([{ id: 'n1', title: 'Notiz', updated: now }]),
    'tasks.query': snapshot([{ id: 't1', title: 'Aufgabe', deadline: { date: '2026-10-25', timeZone: 'Europe/Berlin' } }]),
    'reminders.query': snapshot([{ id: 'rm1', title: 'Erinnerung', datetime: '2026-10-25T02:30:00+02:00' }]),
    'planning.queryRange': { snapshot: snapshot([{ kind: 'event', id: 'ev1', title: 'Termin', start: now, end: '2026-10-18T11:00:00.000Z', timeZone: 'Europe/Berlin' }]), coverage: 'unknown' },
    'flux.getAttention': { snapshot: snapshot([{ entity: { kind: 'task', id: 't1' }, title: 'Aufgabe', reasons: ['unplanned'] }]), now, timeZone: 'Europe/Berlin' },
  }
  if (method.endsWith('.create')) { document.status = 'acknowledged'; document.receipt = receipt(method) }
  else document.data = clone(data[method])
  return document
}
export const errorResponse = (method, status) => ({ ...envelope(method), status, error: { message: `Synthetic ${status} outcome; no operation was performed by this corpus.` } })

export function buildCorpus() {
  const schemaFile = fileBytes(JSON_SCHEMA_DOCUMENT), schemaHash = sha256(schemaFile)
  const cases = []
  const add = (id, schema, document, valid) => cases.push({ id, schema, document: clone(document), valid })
  const invalid = (id, schema, source, mutate) => { const value = clone(source); mutate(value); add(id, schema, value, false) }
  for (const method of METHODS) {
    add(`request:${method}`, 'Request', request(method), true)
    add(`response:${method}`, 'Response', response(method, schemaHash), true)
    invalid(`unknown-request-field:${method}`, 'Request', request(method), value => { value.injected = true })
    invalid(`wrong-response-type:${method}`, 'Response', response(method), value => { value.requestId = 42 })
  }
  const note = request('notes.query'), create = request('notes.create'), read = response('notes.query')
  add('null-request', 'Request', null, false)
  add('array-request', 'Request', [], false)
  add('null-response', 'Response', null, false)
  for (const method of METHODS.filter(name => name !== 'system.hello')) {
    const ws = request(method); ws.context.scope = { kind: 'workspace', workspaceId: 'w1' }
    add(`workspace-request:${method}`, 'Request', ws, true) // Scope support is a runtime decision.
  }
  const signedIn = clone(note); signedIn.context.account = { mode: 'authenticated', subject: 'account-1' }; add('authenticated-context', 'Request', signedIn, true)
  for (const [id, mutate] of [
    ['missing-scope', value => { delete value.context.scope }],
    ['null-scope-is-not-library', value => { value.context.scope = null }],
    ['ambiguous-scope', value => { value.context.scope.workspaceId = 'w1' }],
    ['workspace-without-id', value => { value.context.scope = { kind: 'workspace' } }],
    ['implicit-active-workspace', value => { value.context.activeWorkspaceId = null }],
    ['missing-generation', value => { delete value.context.runtimeGeneration }],
    ['numeric-generation', value => { value.context.runtimeGeneration = 1 }],
    ['generation-is-not-membership', value => { value.context.runtimeGeneration = { workspaceId: 'w1' } }],
    ['missing-renderer-epoch', value => { delete value.context.rendererEpoch }],
    ['old-account-shape', value => { value.context.account = { mode: 'authenticated' } }],
    ['client-security-flag-is-not-authority', value => { value.context.jarvisSecurityVerified = true }],
    ['past-protocol', value => { value.protocolVersion = 'nexus.local.v0' }],
    ['future-protocol', value => { value.protocolVersion = 'nexus.local.v2' }],
    ['future-schema', value => { value.schemaVersion = '2.0.0' }],
    ['unknown-method', value => { value.method = 'notes.get' }],
    ['durable-not-in-initial-request-schema', value => { value.params.readConsistency = 'durable' }],
    ['zero-limit', value => { value.params.limit = 0 }],
    ['excessive-limit', value => { value.params.limit = 101 }],
    ['fractional-limit', value => { value.params.limit = 1.5 }],
    ['unknown-projection', value => { value.params.fields = ['content'] }],
    ['duplicate-projection', value => { value.params.fields = ['id', 'id'] }],
    ['empty-projection', value => { value.params.fields = [] }],
    ['raw-cursor', value => { value.params.cursor = 'note:n1 secret' }],
  ]) invalid(id, 'Request', note, mutate)
  invalid('mutation-required', 'Request', create, value => { delete value.mutation })
  invalid('precondition-required', 'Request', create, value => { delete value.mutation.preconditions })
  invalid('operation-precondition', 'Request', create, value => { value.mutation.preconditions = { canvasETag: 'etag' } })
  invalid('unsafe-integer-revision', 'Request', create, value => { value.mutation.preconditions.planningRevision = 9007199254740992 })
  invalid('bad-arguments-digest', 'Request', create, value => { value.mutation.argumentsDigest = 'ABC' })
  invalid('blank-title', 'Request', create, value => { value.params.title = ' \n\t' })
  invalid('new-workspace-command-forbidden', 'Request', create, value => { value.method = 'notes.createAndAssign' })
  invalid('unknown-task-input', 'Request', request('tasks.create'), value => { value.params.workspaceId = 'w1' })
  const civilTask = request('tasks.create'); civilTask.params.deadline = { date: '2026-10-25', timeZone: 'Europe/Berlin' }; civilTask.mutation.argumentsDigest = sha256(canonicalBytes(civilTask.params)); add('task-civil-deadline-preserves-timezone', 'Request', civilTask, true)
  invalid('invalid-civil-date', 'Request', civilTask, value => { value.params.deadline.date = '2026-02-29' })
  invalid('unknown-nested-field', 'Response', read, value => { value.data.data[0].content = 'private body' })
  invalid('invented-durability', 'Response', read, value => { value.data.durability = 'saved' })
  invalid('bad-snapshot-fingerprint', 'Response', read, value => { value.data.snapshotEpoch = 'g1' })
  invalid('old-offset-paging', 'Request', note, value => { value.params.offset = 20 })
  const cursorBinding = { clientId: 'client-1', grantId: 'grant-1', context: clone(context), queryFingerprint: hash('a'), membershipFingerprint: hash('b'), snapshotEpoch: hash('c'), nextPosition: 20, expiresAt: '2026-10-18T10:02:00.000Z' }
  add('cursor-binding', 'CursorBinding', cursorBinding, true)
  invalid('cursor-binding-missing-scope', 'CursorBinding', cursorBinding, value => { delete value.context.scope })
  invalid('cursor-binding-negative-position', 'CursorBinding', cursorBinding, value => { value.nextPosition = -1 })
  const page = clone(read); page.data.truncated = true; page.data.nextCursor = 'opaque_cursor_0123456789'; add('paged-read', 'Response', page, true)
  invalid('next-cursor-requires-truncated', 'Response', page, value => { value.data.truncated = false })
  for (const status of ['validation', 'unsupported', 'unsupported_scope', 'unsupported_consistency', 'stale', 'stale_cursor', 'conflict', 'denied', 'scope_denied', 'not_paired', 'not_ready', 'draft_pending', 'recovery_pending', 'storage_failure']) add(`error:${status}`, 'Response', errorResponse('notes.query', status), true)
  for (const durability of ['queued', 'acknowledged', 'unknown']) { const value = clone(read); value.data.durability = durability; add(`durability:${durability}`, 'Response', value, true) }
  const unknown = { ...errorResponse('notes.create', 'unknown_outcome'), action: identity() }; add('UNKNOWN_OUTCOME-wire-lowercase', 'Response', unknown, true)
  invalid('unknown-outcome-needs-original-action', 'Response', unknown, value => { delete value.action })
  invalid('unknown-outcome-not-boolean', 'Response', unknown, value => { value.success = false })
  invalid('uppercase-status-not-wire-enum', 'Response', unknown, value => { value.status = 'UNKNOWN_OUTCOME' })
  for (const state of ['not_found', 'recovery_pending', 'expired_or_unknown', 'unknown_outcome']) { const value = response('mutation.status'); value.data = { state, action: identity() }; add(`mutation-status:${state}`, 'Response', value, true) }
  for (const method of ['notes.create', 'tasks.create']) {
    const value = response(method); add(`receipt:${method}`, 'Receipt', value.receipt, true)
    const pending = clone(value); pending.status = pending.receipt.status = 'completed_with_pending_side_effect'; pending.receipt.sideEffects = [{ kind: 'native_delivery', entity: pending.receipt.entities[0], state: 'unknown' }]; add(`pending-side-effect:${method}`, 'Response', pending, true)
    invalid(`pending-needs-side-effect:${method}`, 'Response', pending, v => { v.receipt.sideEffects = [] })
    invalid(`receipt-status-mismatch:${method}`, 'Response', value, v => { v.receipt.status = 'completed_with_pending_side_effect' })
    invalid(`receipt-method-mismatch:${method}`, 'Response', value, v => { v.receipt.action.method = method === 'notes.create' ? 'tasks.create' : 'notes.create' })
    invalid(`untyped-entities:${method}`, 'Response', value, v => { v.receipt.entities = ['entity-1'] })
    invalid(`receipt-retention-required:${method}`, 'Response', value, v => { delete v.receipt.retainedUntil })
    invalid(`receipt-invalid-retention:${method}`, 'Response', value, v => { v.receipt.retainedUntil = 'sometime' })
    const accepted = { ...envelope(method), status: 'accepted', context: clone(context), action: identity(method) }; add(`accepted-is-not-durable:${method}`, 'Response', accepted, true)
  }
  for (const kind of ['note', 'task', 'reminder', 'canvas', 'planning-event', 'planning-block']) add(`entity:${kind}`, 'EntityRef', { kind, id: 'same-id' }, true)
  for (const state of ['acknowledged', 'completed_with_pending_side_effect']) {
    const value = response('mutation.status'); value.data = { state, receipt: receipt() }
    value.data.receipt.status = state
    if (state === 'completed_with_pending_side_effect') value.data.receipt.sideEffects = [{ kind: 'native_delivery', entity: { kind: 'reminder', id: 'rm1' }, state: 'pending' }]
    add(`mutation-status:${state}`, 'Response', value, true)
  }
  add('entity:canvas-node', 'EntityRef', { kind: 'canvas-node', canvasId: 'c1', id: 'same-id' }, true)
  add('canvas-node-missing-canvas-id', 'EntityRef', { kind: 'canvas-node', id: 'same-id' }, false)
  for (const [syntaxKind, persistence] of [['fenced', 'persistent'], ['inline', 'preview_only'], ['planning-linked', 'domain_linked']]) add(`magic:${syntaxKind}`, 'MagicDescriptorV1', descriptor(syntaxKind, persistence), true)
  const allFields = descriptor('planning-linked', 'domain_linked'); allFields.fields.push({ key: 'choice', type: 'enum', required: true, values: ['one', 'two'] }, { key: 'amount', type: 'number', required: false, minimum: 0.5, maximum: 100 }, { key: 'checked', type: 'boolean', required: false }, { key: 'when', type: 'datetime', required: true, multiline: false, minLength: 1, maxLength: 40 }, { key: 'target', type: 'entity-ref', required: true, multiline: false, minLength: 1, maxLength: 200 }); add('magic-all-field-types', 'MagicDescriptorV1', allFields, true)
  invalid('magic-serializer-version-required', 'MagicDescriptorV1', descriptor(), value => { delete value.serializerVersion })
  invalid('magic-unknown-field-type', 'MagicDescriptorV1', descriptor(), value => { value.fields[0].type = 'javascript' })
  invalid('magic-cannot-register-new-method', 'MagicDescriptorV1', descriptor(), value => { value.supportedMethods = ['magic.preview'] })
  invalid('schema-hash-shape', 'MagicDescriptorV1', descriptor(), value => { value.schemaHash = 'sha256:not-a-digest' })
  const capabilities = response('capabilities.list', schemaHash)
  invalid('capability-method-mapping', 'Response', capabilities, value => { value.data.capabilities[0].capability = 'nexus.notes.query' })
  invalid('manifest-unknown-method', 'Response', capabilities, value => { value.data.capabilities[0].method = 'notes.get' })
  for (const stamp of ['2026-10-25T02:30:00+02:00', '2026-10-25T02:30:00+01:00', '2026-10-18T10:00:00Z', '2028-02-29T12:00:00+01:00']) { const value = request('flux.getAttention'); value.params.now = stamp; add(`instant:${stamp}`, 'Request', value, true) }
  for (const stamp of ['2026-10-25T02:30:00', '2026-02-29T12:00:00Z', '2026-04-31T12:00:00Z', '2026-10-18T24:00:00Z', '2026-10-18T10:00:60Z', '2026-10-18T10:00:00-00:00']) invalid(`invalid-instant:${stamp}`, 'Request', request('flux.getAttention'), value => { value.params.now = stamp })
  invalid('flux-no-paging-request', 'Request', request('flux.getAttention'), value => { value.params.cursor = 'opaque_cursor_0123456789' })
  invalid('cursor-with-final-newline', 'Request', note, value => { value.params.cursor = 'opaque_cursor_0123456789\n' })
  invalid('instant-with-final-newline', 'Request', request('flux.getAttention'), value => { value.params.now += '\n' })
  invalid('timezone-with-final-newline', 'Request', request('flux.getAttention'), value => { value.params.timeZone += '\n' })
  invalid('schema-version-with-final-newline', 'Request', request('system.hello'), value => { value.params.supportedSchemaVersions = ['1.0.0\n'] })
  invalid('flux-no-paging-response', 'Response', response('flux.getAttention'), value => { value.data.snapshot.nextCursor = 'opaque_cursor_0123456789' })

  const scenarios = []
  const scenario = (id, gate, facts, requests, expectedResponse, requestValid = true) => scenarios.push({ id, gate, runtimeEvidenceRequired: true, facts, requests, requestValid, expectedResponse })
  const library = request('notes.query'), workspace = clone(library); workspace.context.scope = { kind: 'workspace', workspaceId: 'w1' }
  scenario('null-active-workspace-does-not-grant-library', 'G2A', { activeWorkspaceId: null, grants: ['workspace:w1'] }, [library], errorResponse('notes.query', 'scope_denied'))
  scenario('multiple-memberships-check-selected-workspace', 'G2A', { noteMemberships: ['w1', 'w2'], grants: ['workspace:w1'] }, [workspace], response('notes.query'))
  scenarios.at(-1).expectedResponse.context.scope = clone(workspace.context.scope)
  scenario('foreign-or-unassigned-note-not-a-fallback', 'G2A', { selectedMembership: [], globalNoteIds: ['foreign', 'unassigned'] }, [workspace], { ...response('notes.query'), context: clone(workspace.context), data: snapshot() })
  const unresolved = { ...response('notes.query'), context: clone(workspace.context), data: snapshot() }; unresolved.data.warnings = [{ code: 'unresolved', entity: { kind: 'note', id: 'missing-member' } }]
  scenario('orphan-membership-warning-without-foreign-content', 'G2A', { membership: ['missing-member'], sourceMissing: true }, [workspace], unresolved)
  scenario('deleted-workspace-denied', 'G2A', { workspaceExists: false }, [workspace], errorResponse('notes.query', 'scope_denied'))
  const draft = response('notes.query'); draft.data.data[0].updated = '2026-10-18T10:01:00.000Z'
  scenario('draft-drain-then-source-capture-without-await', 'G2A', { registeredDraft: true, storePatchesPending: true, phases: ['draft', 'store', 'capture'], persistenceAcknowledged: false }, [library], draft)
  scenario('undrainable-draft-is-not-old-success', 'G2A', { registeredDraft: false, dirtyEditor: true }, [library], errorResponse('notes.query', 'draft_pending'))
  scenario('storage-failure-is-not-empty-success', 'G2A', { storageFailure: true }, [library], errorResponse('notes.query', 'storage_failure'))
  scenario('recovery-blocks-snapshot', 'G2A', { workspaceRecovery: true }, [library], errorResponse('notes.query', 'recovery_pending'))
  for (const changed of ['source', 'membership', 'query', 'grant', 'rendererEpoch', 'runtimeGeneration', 'account', 'profile', 'ttl']) {
    const next = clone(library); next.params.cursor = 'opaque_cursor_0123456789'
    scenario(`cursor-stale:${changed}`, 'G2A', { changedAfterFirstPage: changed }, [library, next], errorResponse('notes.query', 'stale_cursor'))
  }
  scenario('current-runtime-change-after-hydration', 'G2A', { generationAfterAwait: 'g2', originalGeneration: 'g1' }, [library], errorResponse('notes.query', 'stale'))
  for (const method of ['planning.queryRange', 'flux.getAttention']) { const value = request(method); value.context.scope = { kind: 'workspace', workspaceId: 'w1' }; scenario(`unsupported-workspace-projection:${method}`, 'G2B', { scopeCorrectProjectionProven: false }, [value], errorResponse(method, 'unsupported_scope')) }
  scenario('unknown-calendar-coverage-is-not-free-time', 'G2B', { calendarCoverageKnown: false }, [request('planning.queryRange')], response('planning.queryRange'))
  const wsCreate = request('notes.create'); wsCreate.context.scope = { kind: 'workspace', workspaceId: 'w1' }
  scenario('create-does-not-assign-workspace', 'G3', { createAndAssignOwnerExists: false }, [wsCreate], errorResponse('notes.create', 'unsupported_scope'))
  const conflict = request('notes.create'); conflict.params.title = 'Changed arguments'; conflict.mutation.argumentsDigest = sha256(canonicalBytes(conflict.params))
  scenario('same-key-different-arguments-conflict', 'G3', { originalAction: identity(), receiptRetained: true }, [request('notes.create'), conflict], errorResponse('notes.create', 'conflict'))
  const reconnect = request('mutation.status'); reconnect.context.sessionId = 's2'; reconnect.context.rendererEpoch = 'r2'; reconnect.context.instanceId = 'i2'
  const recovered = response('mutation.status'); recovered.context = clone(reconnect.context); recovered.data = { state: 'acknowledged', receipt: receipt() }
  scenario('new-session-reconciles-original-action-and-key', 'G3', { authorizedAgain: true, originalKeyUnchanged: true, domainOutcome: 'acknowledged' }, [request('notes.create'), reconnect], recovered)
  for (const state of ['not_found', 'expired_or_unknown', 'recovery_pending', 'unknown_outcome']) {
    const value = response('mutation.status'); value.context = clone(reconnect.context); value.data = { state, action: identity() }
    scenario(`reconcile:${state}:never-new-key`, 'G3', { newCreateForbidden: true, originalAction: identity(), authoritativeReceiptAvailable: false }, [reconnect], value)
  }
  scenario('crash-after-dispatch-intent-is-unknown', 'G3', { dispatchIntentDurable: true, receiptUnavailable: true }, [request('notes.create')], unknown)
  scenario('revoke-or-account-change-denies-reconciliation', 'G3', { currentGrantValid: false }, [reconnect], errorResponse('mutation.status', 'scope_denied'))
  const badVersion = clone(library); badVersion.protocolVersion = 'nexus.local.v2'
  scenario('version-mismatch-is-not-domain-read', 'G0-B', { peerProtocolUnsupported: true }, [badVersion], errorResponse('notes.query', 'unsupported'), false)
  scenario('well-formed-schema-hash-still-needs-peer-check', 'G1B', { expectedSchemaHash: schemaHash, advertisedSchemaHash: hash('f'), executeForbidden: true }, [request('capabilities.list')], errorResponse('capabilities.list', 'unsupported'))
  scenario('ambiguous-local-datetime-is-validation-not-now-plus-hour', 'G4A', { magicInput: { datetime: '2026-10-25T02:30:00' }, timezoneDisambiguationAbsent: true, descriptorOnlyInNXB0: true }, [], errorResponse('notes.create', 'validation'))

  const canonicalization = [
    { id: 'sorted-properties', input: '{"b":2,"a":1}', canonical: '{"a":1,"b":2}' },
    { id: 'numeric-looking-keys-sort-as-strings', input: '{"2":"b","10":"a"}', canonical: '{"10":"a","2":"b"}' },
    { id: 'numeric-ecmascript', input: '{"n":[333333333.33333329,1E30,4.50,2e-3,1e-27,-0]}', canonical: '{"n":[333333333.3333333,1e+30,4.5,0.002,1e-27,0]}' },
    { id: 'unicode-not-normalized', input: '{"text":"Café / Cafe\\u0301 🧠"}', canonical: '{"text":"Café / Café 🧠"}' },
    { id: 'content-newlines-preserved', input: '{"text":"a\\r\\nb\\nc"}', canonical: '{"text":"a\\r\\nb\\nc"}' },
    { id: 'utf16-key-order', input: '{"\\ue000":1,"😀":2,"a":3}', canonical: '{"a":3,"😀":2,"":1}' },
    { id: 'array-order-preserved', input: '[{"b":2,"a":1},3,2,1]', canonical: '[{"a":1,"b":2},3,2,1]' },
  ].map(value => ({ ...value, utf8Hex: Buffer.from(value.canonical, 'utf8').toString('hex'), sha256: sha256(Buffer.from(value.canonical, 'utf8')) }))
  const files = {
    'canonicalization.json': fileBytes({ fixtureVersion: FIXTURE_VERSION, cases: canonicalization }),
    'conformance.json': fileBytes({ fixtureVersion: FIXTURE_VERSION, cases }),
    'scenarios.json': fileBytes({ fixtureVersion: FIXTURE_VERSION, scenarios }),
    'wire-v1.schema.json': schemaFile,
  }
  const entries = Object.keys(files).sort().map(path => ({ path, bytes: files[path].length, sha256: sha256(files[path]) }))
  // Exact grammar: lowercase file hash, two spaces, ASCII relative path, LF.
  const hashInput = entries.map(entry => `${entry.sha256}  ${entry.path}\n`).join('')
  const manifest = { fixtureVersion: FIXTURE_VERSION, schemaVersion: SCHEMA_VERSION, schemaId: SCHEMA_ID, canonicalization: 'RFC8785', fileEncoding: 'UTF-8-no-BOM', fileFinalNewline: 'LF', entries, corpusSha256: sha256(Buffer.from(hashInput, 'utf8')) }
  return { files, manifest, schemaHash }
}

export function verifyCorpus() {
  const { files, manifest } = buildCorpus()
  const expected = { ...files, 'manifest.json': fileBytes(manifest) }
  const actualNames = readdirSync(directory).sort()
  if (JSON.stringify(actualNames) !== JSON.stringify(Object.keys(expected).sort())) throw new Error('Unexpected corpus file inventory')
  for (const [name, expectedBytes] of Object.entries(expected)) {
    if (!readFileSync(new URL(name, directory)).equals(expectedBytes)) throw new Error(`Corpus drift: ${name}; regenerate intentionally and review version/hash changes`)
  }
  return manifest
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--write')) {
    const { files, manifest } = buildCorpus()
    for (const [name, bytes] of Object.entries({ ...files, 'manifest.json': fileBytes(manifest) })) writeFileSync(new URL(name, directory), bytes)
  }
  console.log(JSON.stringify(verifyCorpus(), null, 2))
}
