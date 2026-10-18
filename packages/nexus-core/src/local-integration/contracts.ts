import { array, boolean, enumeration, integer, literal, number, object, string, union, validateSchema, type Infer, type Schema, type Validation } from './schema'
import { canonicalBytes } from './canonical'

export const PROTOCOL_VERSION = 'nexus.local.v1'
export const SCHEMA_VERSION = '1.0.0'
export const SCHEMA_ID = 'urn:nexus:local:wire:1.0.0'
export const FIXTURE_VERSION = '1.0.0'
export const MAX_DOCUMENT_BYTES = 131_072
export const CAPABILITY_MAPPING = Object.freeze({
  'system.hello': 'nexus.system.hello',
  'capabilities.list': 'nexus.capabilities.list',
  'mutation.status': 'nexus.mutation.status',
  'notes.query': 'nexus.notes.query',
  'tasks.query': 'nexus.tasks.query',
  'reminders.query': 'nexus.reminders.query',
  'planning.queryRange': 'nexus.planning.queryRange',
  'flux.getAttention': 'nexus.flux.getAttention',
  'notes.create': 'nexus.notes.create',
  'tasks.create': 'nexus.tasks.create',
} as const)
export type Method = keyof typeof CAPABILITY_MAPPING
export const METHODS = Object.freeze(Object.keys(CAPABILITY_MAPPING) as Method[])
const definitions: Record<string, Schema> = Object.create(null)
const define = <T>(name: string, schema: Schema<T>): Schema<T> => {
  definitions[name] = schema
  return { $ref: `#/$defs/${name}` }
}
const id = define('Id', string(200, { minLength: 1, pattern: '^[^\\u0000-\\u0020\\u007f]+$' }))
const digest = define('Digest', string(64, { minLength: 64, pattern: '^[0-9a-f]{64}$' }))
const title = define('Title', string(512, { minLength: 1, pattern: '[^\\u0009-\\u000d\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]' }))
const instant = define('Instant', string(40, { format: 'date-time', pattern: '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\\.[0-9]{1,9})?(Z|\\+([01][0-9]|2[0-3]):[0-5][0-9]|-(?!00:00$)([01][0-9]|2[0-3]):[0-5][0-9])$(?![\\s\\S])' }))
const timeZone = define('TimeZone', string(100, { minLength: 1, pattern: '^(UTC|[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+.-]+)+)$(?![\\s\\S])' }))
const nullableInstant = union(instant, literal(null))
const method = enumeration(...METHODS)
const writeMethod = enumeration('notes.create', 'tasks.create')
const empty = object({})
const tags = array(string(64, { minLength: 1 }), 32, 0, true)
const deadline = define('Deadline', union(instant, object({ date: string(10, { format: 'date', pattern: '^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$' }), timeZone }), literal(null)))

export const scopeSchema = define('Scope', union(object({ kind: literal('library') }), object({ kind: literal('workspace'), workspaceId: id })))
const account = define('Account', union(object({ mode: literal('anonymous-local') }), object({ mode: literal('authenticated'), subject: id })))
export const runtimeContextSchema = define('RuntimeContext', object({
  instanceId: id, rendererEpoch: id, runtimeGeneration: id, sessionId: id,
  bridgeProfileId: id, account, scope: scopeSchema,
}))
export const entityRefSchema = define('EntityRef', union(
  object({ kind: enumeration('note', 'task', 'reminder', 'canvas', 'planning-event', 'planning-block'), id }),
  object({ kind: literal('canvas-node'), canvasId: id, id }),
))
const actionFields = {
  actionId: id, clientId: id, idempotencyKey: id, argumentsDigest: digest,
  origin: runtimeContextSchema,
}
export const actionIdentitySchema = define('ActionIdentity', object({ ...actionFields, method: writeMethod }))
const preconditions = define('CreatePreconditions', object({ planningRevision: integer(0) }))
const mutation = define('CreateMutation', object({
  actionId: id, clientId: id, idempotencyKey: id, argumentsDigest: digest, preconditions,
}))
const sideEffect = define('SideEffect', object({ kind: literal('native_delivery'), entity: entityRefSchema, state: enumeration('pending', 'unknown') }))
const receiptFields = {
  entities: array(entityRefSchema, 32, 1, true), revision: integer(0), acknowledgedAt: instant,
  retainedUntil: instant, replayed: boolean,
}
const receiptFor = <A, const S extends 'acknowledged' | 'completed_with_pending_side_effect'>(action: Schema<A>, status: S) => object({
  ...receiptFields, action, status: literal(status), sideEffects: array(sideEffect, status === 'acknowledged' ? 0 : 32, status === 'acknowledged' ? 0 : 1),
})
export const receiptSchema = define('Receipt', union(receiptFor(actionIdentitySchema, 'acknowledged'), receiptFor(actionIdentitySchema, 'completed_with_pending_side_effect')))
export const cursorBindingSchema = define('CursorBinding', object({
  clientId: id, grantId: id, context: runtimeContextSchema, queryFingerprint: digest,
  membershipFingerprint: digest, snapshotEpoch: digest, nextPosition: integer(0), expiresAt: instant,
}))
const field = define('MagicField', union(
  object({ key: id, type: enumeration('string', 'datetime', 'entity-ref'), required: boolean, multiline: boolean, minLength: integer(0, 65_536), maxLength: integer(0, 65_536) }),
  object({ key: id, type: literal('enum'), required: boolean, values: array(string(512), 64, 1, true) }),
  object({ key: id, type: literal('number'), required: boolean, minimum: number(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), maximum: number(-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) }),
  object({ key: id, type: literal('boolean'), required: boolean }),
))
export const magicDescriptorSchema = define('MagicDescriptorV1', object({
  id, version: literal(1), schemaHash: digest, syntaxKind: enumeration('fenced', 'inline', 'planning-linked'),
  label: title, description: string(2_048), fields: array(field, 32), serializerVersion: id,
  persistence: enumeration('preview_only', 'persistent', 'domain_linked'),
  supportedMethods: array(method, 10, 0, true), sideEffects: array(enumeration('task_creation', 'reminder_creation'), 2, 0, true),
  supportedClients: array(enumeration('main', 'mobile'), 2, 1, true), dependencies: array(id, 32, 0, true),
}))
export type CapabilityDescriptor = { [M in Method]: {
  method: M; capability: (typeof CAPABILITY_MAPPING)[M]; schemaId: typeof SCHEMA_ID
  schemaVersion: typeof SCHEMA_VERSION; schemaHash: string
  state: 'known' | 'offered' | 'ready' | 'authorized' | 'policy_allowed'
} }[Method]
const capability = define('Capability', union(...METHODS.map(name => object({
  method: literal(name), capability: literal(CAPABILITY_MAPPING[name]), schemaId: literal(SCHEMA_ID),
  schemaVersion: literal(SCHEMA_VERSION), schemaHash: digest,
  state: enumeration('known', 'offered', 'ready', 'authorized', 'policy_allowed'),
}))) as Schema<CapabilityDescriptor>)
const cursor = union(string(2_048, { minLength: 16, pattern: '^[A-Za-z0-9_-]+$(?![\\s\\S])' }), literal(null))
const query = <const T extends readonly string[]>(fields: T) => object({
  readConsistency: literal('current'), limit: integer(1, 100), fields: array(enumeration(...fields), fields.length, 1, true),
  query: string(256), cursor,
}, ['query', 'cursor'])
const noteMetadata = define('NoteMetadata', object({ id, title, tags, updated: instant }, ['title', 'tags', 'updated']))
const taskMetadata = define('TaskMetadata', object({
  id, title, status: enumeration('todo', 'doing', 'done'), priority: enumeration('low', 'mid', 'high'),
  deadline, updated: instant,
}, ['title', 'status', 'priority', 'deadline', 'updated']))
const reminderMetadata = define('ReminderMetadata', object({
  id, title, datetime: instant, repeat: enumeration('none', 'daily', 'weekly', 'monthly'), done: boolean,
  snoozeUntil: nullableInstant,
}, ['title', 'datetime', 'repeat', 'done', 'snoozeUntil']))
const planningMetadata = define('PlanningMetadata', union(
  object({ kind: literal('event'), id, title, start: instant, end: instant, timeZone }),
  object({ kind: literal('block'), id, task: object({ kind: literal('task'), id }), start: instant, end: instant, timeZone }),
))
const fluxMetadata = define('FluxMetadata', object({
  entity: entityRefSchema, title, reasons: array(enumeration('overdue', 'due-soon', 'high-priority', 'blocked', 'unresolved', 'unplanned', 'conflict'), 7, 1, true),
}))
const warning = define('ReadWarning', object({ code: literal('unresolved'), entity: entityRefSchema }))
const snapshotFields = <T>(items: Schema<T>) => ({
  consistency: literal('current'), durability: enumeration('queued', 'acknowledged', 'unknown'), snapshotEpoch: digest,
  data: array(items, 100), warnings: array(warning, 100),
})
const unpagedRead = <T>(items: Schema<T>) => object({ ...snapshotFields(items), truncated: literal(false), nextCursor: literal(null) })
const read = <T>(items: Schema<T>) => union(unpagedRead(items), object({ ...snapshotFields(items), truncated: literal(true), nextCursor: cursor }))
const statusResult = define('MutationStatusResult', union(
  object({ state: literal('acknowledged'), receipt: receiptFor(actionIdentitySchema, 'acknowledged') }),
  object({ state: literal('completed_with_pending_side_effect'), receipt: receiptFor(actionIdentitySchema, 'completed_with_pending_side_effect') }),
  object({ state: enumeration('not_found', 'recovery_pending', 'expired_or_unknown', 'unknown_outcome'), action: actionIdentitySchema }),
))
const common = { protocolVersion: literal(PROTOCOL_VERSION), schemaVersion: literal(SCHEMA_VERSION), requestId: id }
const request = <const M extends Method, P>(name: M, params: Schema<P>) => object({ ...common, method: literal(name), context: runtimeContextSchema, params })
const writeRequest = <const M extends 'notes.create' | 'tasks.create', P>(name: M, params: Schema<P>) => object({ ...common, method: literal(name), context: runtimeContextSchema, params, mutation })
export const REQUEST_SCHEMAS = {
  'system.hello': define('HelloRequest', object({ ...common, method: literal('system.hello'), params: object({ supportedSchemaVersions: array(string(32, { pattern: '^[0-9]+\\.[0-9]+\\.[0-9]+$(?![\\s\\S])' }), 8, 1, true) }) })),
  'capabilities.list': define('CapabilitiesRequest', request('capabilities.list', empty)),
  'mutation.status': define('MutationStatusRequest', request('mutation.status', object({ action: actionIdentitySchema }))),
  'notes.query': define('NotesQueryRequest', request('notes.query', query(['id', 'title', 'tags', 'updated'] as const))),
  'tasks.query': define('TasksQueryRequest', request('tasks.query', query(['id', 'title', 'status', 'priority', 'deadline', 'updated'] as const))),
  'reminders.query': define('RemindersQueryRequest', request('reminders.query', query(['id', 'title', 'datetime', 'repeat', 'done', 'snoozeUntil'] as const))),
  'planning.queryRange': define('PlanningQueryRequest', request('planning.queryRange', object({ readConsistency: literal('current'), start: instant, end: instant, timeZone, limit: integer(1, 100), cursor }, ['cursor']))),
  'flux.getAttention': define('FluxRequest', request('flux.getAttention', object({ readConsistency: literal('current'), now: instant, timeZone, limit: integer(1, 100) }))),
  'notes.create': define('NotesCreateRequest', writeRequest('notes.create', object({ title, content: string(65_536), tags }, ['tags']))),
  'tasks.create': define('TasksCreateRequest', writeRequest('tasks.create', object({ title, desc: string(8_192), priority: enumeration('low', 'mid', 'high'), durationMinutes: number(0.01, 10_080), deadline, tags }, ['desc', 'priority', 'durationMinutes', 'deadline', 'tags']))),
} as const

export const ERROR_STATUSES = Object.freeze([
  'validation', 'unsupported', 'unsupported_scope', 'unsupported_consistency', 'stale', 'stale_cursor', 'conflict',
  'denied', 'scope_denied', 'not_paired', 'not_ready', 'draft_pending', 'recovery_pending', 'storage_failure',
] as const)
const error = object({ message: string(512, { minLength: 1 }) })
const failure = <const M extends Method>(name: M) => object({ ...common, method: literal(name), status: enumeration(...ERROR_STATUSES), error })
const success = <const M extends Method, D>(name: M, data: Schema<D>) => object({ ...common, method: literal(name), status: literal('accepted'), context: runtimeContextSchema, data })
const response = <const M extends Method, D>(name: M, data: Schema<D>) => union(success(name, data), failure(name))
const writeResponse = <const M extends 'notes.create' | 'tasks.create'>(name: M) => union(
  object({ ...common, method: literal(name), status: literal('accepted'), context: runtimeContextSchema, action: object({ ...actionFields, method: literal(name) }) }),
  object({ ...common, method: literal(name), status: literal('acknowledged'), context: runtimeContextSchema, receipt: receiptFor(object({ ...actionFields, method: literal(name) }), 'acknowledged') }),
  object({ ...common, method: literal(name), status: literal('completed_with_pending_side_effect'), context: runtimeContextSchema, receipt: receiptFor(object({ ...actionFields, method: literal(name) }), 'completed_with_pending_side_effect') }),
  object({ ...common, method: literal(name), status: literal('unknown_outcome'), action: object({ ...actionFields, method: literal(name) }), error }),
  failure(name),
)
export const RESPONSE_SCHEMAS = {
  'system.hello': define('HelloResponse', union(object({ ...common, method: literal('system.hello'), status: literal('accepted'), data: object({ instanceId: id, supportedProtocolVersions: array(literal(PROTOCOL_VERSION), 1, 1), supportedSchemaVersions: array(literal(SCHEMA_VERSION), 1, 1), state: enumeration('STARTING', 'NOT_READY', 'NOT_PAIRED', 'LOCKED', 'RECOVERY_PENDING', 'READY') }) }), failure('system.hello'))),
  'capabilities.list': define('CapabilitiesResponse', response('capabilities.list', object({ capabilities: array(capability, 10), magicDescriptors: array(magicDescriptorSchema, 32) }))),
  'mutation.status': define('MutationStatusResponse', response('mutation.status', statusResult)),
  'notes.query': define('NotesQueryResponse', response('notes.query', read(noteMetadata))),
  'tasks.query': define('TasksQueryResponse', response('tasks.query', read(taskMetadata))),
  'reminders.query': define('RemindersQueryResponse', response('reminders.query', read(reminderMetadata))),
  'planning.queryRange': define('PlanningQueryResponse', response('planning.queryRange', object({ snapshot: read(planningMetadata), coverage: enumeration('known', 'unknown') }))),
  'flux.getAttention': define('FluxResponse', response('flux.getAttention', object({ snapshot: unpagedRead(fluxMetadata), now: instant, timeZone }))),
  'notes.create': define('NotesCreateResponse', writeResponse('notes.create')),
  'tasks.create': define('TasksCreateResponse', writeResponse('tasks.create')),
} as const
define('Request', union(...Object.values(REQUEST_SCHEMAS)))
define('Response', union(...Object.values(RESPONSE_SCHEMAS)))
Object.freeze(REQUEST_SCHEMAS)
Object.freeze(RESPONSE_SCHEMAS)

/** Exported schema is data, never a registry of executable tools. */
export const JSON_SCHEMA_DOCUMENT = deepFreeze({
  $schema: 'https://json-schema.org/draft/2020-12/schema', $id: SCHEMA_ID,
  oneOf: [{ $ref: '#/$defs/Request' }, { $ref: '#/$defs/Response' }], $defs: definitions,
})
function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value) }
  return value
}
export type Scope = Infer<typeof scopeSchema>
export type RuntimeContext = Infer<typeof runtimeContextSchema>
export type EntityRef = Infer<typeof entityRefSchema>
export type ActionIdentity = Infer<typeof actionIdentitySchema>
export type Receipt = Infer<typeof receiptSchema>
export type MagicDescriptorV1 = Infer<typeof magicDescriptorSchema>
export type WireRequest<M extends Method = Method> = Infer<(typeof REQUEST_SCHEMAS)[M]>
export type WireResponse<M extends Method = Method> = Infer<(typeof RESPONSE_SCHEMAS)[M]>

export function validateContract(name: string, value: unknown): Validation {
  const schema = definitions[name]
  if (!schema) throw new Error(`Unknown contract schema: ${name}`)
  try {
    if (canonicalBytes(value).length > MAX_DOCUMENT_BYTES) return { valid: false, issues: [{ path: '', keyword: 'maxDocumentBytes' }] }
  } catch { return { valid: false, issues: [{ path: '', keyword: 'json' }] } }
  return validateSchema(schema, value, definitions)
}
