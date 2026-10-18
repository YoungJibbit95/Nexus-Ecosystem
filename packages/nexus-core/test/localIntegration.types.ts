import { type WireRequest, type WireResponse, type Scope, type EntityRef, type Method, type CapabilityDescriptor } from '../src/local-integration'

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
const invalidCapability: CapabilityDescriptor = { method: 'notes.query', capability: 'nexus.tasks.query', schemaId: 'urn:nexus:local:wire:1.0.0', schemaVersion: '1.0.0', schemaHash: 'digest', state: 'known' }

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
    return [method, status]
  }
}
function fluxResponse(value: WireResponse<'flux.getAttention'>) {
  if (value.status === 'accepted') {
    const cursor: null = value.data.snapshot.nextCursor
    const truncated: false = value.data.snapshot.truncated
    return [cursor, truncated]
  }
}
void [workspace, missingWorkspace, ambiguousScope, nakedNode, extraMethod, invalidCapability, requestNarrowing, responseNarrowing, fluxResponse]
export type { ExactMethods }
