import { SCHEMA_ID, SCHEMA_VERSION, type WireRequest, type WireResponse, type Scope, type EntityRef, type Method, type CapabilityDescriptor } from '../src/local-integration'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false
type Assert<T extends true> = T
type ExactMethods = Assert<Equal<Method, 'system.hello' | 'capabilities.list' | 'mutation.status' | 'notes.query' | 'tasks.query' | 'reminders.query' | 'planning.queryRange' | 'flux.getAttention' | 'notes.create' | 'tasks.create'>>
const workspace: Scope = { kind: 'workspace', workspaceId: 'w1' }
// @ts-expect-error workspace requires its explicit identity
const missingWorkspace: Scope = { kind: 'workspace' }
// @ts-expect-error library is not workspace(id)
const ambiguousScope: Scope = { kind: 'library', workspaceId: 'w1' }
// @ts-expect-error canvas-node cannot be addressed without its parent canvas
const nakedNode: EntityRef = { kind: 'canvas-node', id: 'node' }
// @ts-expect-error no eleventh method
const extraMethod: Method = 'notes.get'
// @ts-expect-error method and capability must be correlated at type level
const invalidCapability: CapabilityDescriptor = { method: 'notes.query', capability: 'nexus.tasks.query', schemaId: SCHEMA_ID, schemaVersion: SCHEMA_VERSION, schemaHash: 'digest', nexusState: 'known' }
// @ts-expect-error Nexus cannot claim a Jarvis policy verdict
const invalidNexusState: CapabilityDescriptor['nexusState'] = 'policy_allowed'

function requestNarrowing(value: WireRequest) {
  if (value.method === 'system.hello') {
    value.params.supportedSchemaVersions
    // @ts-expect-error hello has no profile/domain context
    value.context
    // @ts-expect-error hello is never a mutation
    value.mutation
  }
  if (value.method === 'notes.create') {
    value.params.content
    value.mutation.preconditions.planningRevision
    // @ts-expect-error a note capture has no task priority
    value.params.priority
  }
  if (value.method === 'flux.getAttention') {
    value.params.now
    // @ts-expect-error Flux has no cursor in v1
    value.params.cursor
  }
}
function responseNarrowing(value: WireResponse<'notes.create'>) {
  if (value.status === 'unknown_outcome') {
    value.action.idempotencyKey
    // @ts-expect-error an unknown outcome is not a durable receipt
    value.receipt
  }
  if (value.status === 'acknowledged') {
    const method: 'notes.create' = value.receipt.action.method
    const status: 'acknowledged' = value.receipt.status
    const source: 'planning-document' = value.receipt.revision.source
    const revision: number = value.receipt.revision.value
    // @ts-expect-error revision provenance cannot be discarded as a naked number
    const nakedRevision: number = value.receipt.revision
    return [method, status, source, revision, nakedRevision]
  }
}
function fluxResponse(value: WireResponse<'flux.getAttention'>) {
  if (value.status === 'accepted') {
    const cursor: null = value.data.snapshot.nextCursor
    const truncated: boolean = value.data.snapshot.truncated
    // @ts-expect-error truncation never creates a Flux cursor
    const nextPage: string = value.data.snapshot.nextCursor
    return [cursor, truncated, nextPage]
  }
}
function capabilityAuthority(value: CapabilityDescriptor) {
  value.nexusState
  // @ts-expect-error no unqualified cross-authority state
  value.state
  // @ts-expect-error Jarvis policy belongs to Jarvis, not the Nexus manifest
  value.jarvisPolicyVerdict
}
void [workspace, missingWorkspace, ambiguousScope, nakedNode, extraMethod, invalidCapability, invalidNexusState, requestNarrowing, responseNarrowing, fluxResponse, capabilityAuthority]
export type { ExactMethods }
