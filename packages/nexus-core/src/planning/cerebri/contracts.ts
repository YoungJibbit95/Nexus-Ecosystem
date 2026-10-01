// N1 is a non-executing, platform-neutral consumer of the reviewed Rust profile.
export const CEREBRI_SOURCE_SHA = '1e1ecd6a2b38fde70c7d6ba8f6573404089334ac'
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
export type JsonObject = { [key: string]: Json }
export type Knowledge<T> = { state: 'KNOWN'; data: T } | { state: 'MISSING' | 'UNKNOWN' | 'UNCERTAIN' | 'AMBIGUOUS' | 'UNRESOLVED' }
export type InstantRange = Readonly<{ start: string; end: string }>
export type SuggestionIntent = Readonly<{ taskId: string; requestId: string; traceId: string }>
export type BusyFact = Readonly<{ id: string; revision: number; range: InstantRange; timezone: string; calendarId: string; integrationId: string }>
export type SuggestionSnapshot = Readonly<{
  principalId: string
  workspaceGeneration: number
  permissionRevision: number
  contextRevision: number
  capturedAt: string
  read: boolean
  plan: boolean
  task: Readonly<{ id: string; revision: number; durationSeconds: Knowledge<number>; deadline: Knowledge<string> | { state: 'DATE_ONLY' }; workflowReady: boolean }>
  window: InstantRange
  timezone: Knowledge<string>
  calendarId: string
  integrationId: string
  busy: readonly BusyFact[]
  coverage: 'Complete' | 'Incomplete'
  // N1 does not translate reminder recurrence or workflow edges into temporal facts.
  unsupportedRecurrence?: boolean
  objectIds?: readonly string[] | null
  granularitySeconds: number
  maxCandidates: number
}>
export type ClarificationCode = 'missing_duration' | 'unresolved_duration' | 'missing_timezone' | 'unresolved_timezone' | 'date_only_deadline' | 'unresolved_deadline' | 'workflow_not_ready' | 'unsupported_recurrence'
export type PreparedSuggestion = Readonly<{ envelope: JsonObject; intent: SuggestionIntent; targetId: string; window: InstantRange; durationSeconds: number; contextRevision: number; freshnessKey: string }>
export type Preparation = { status: 'ready'; value: PreparedSuggestion } | { status: 'clarification'; code: ClarificationCode }
export class CerebriConsumerError extends Error {
  constructor(public readonly code: 'invalid_intent' | 'invalid_snapshot' | 'invalid_response' | 'incompatible_bridge' | 'request_too_large') {
    super(`Cerebri consumer: ${code}`)
    this.name = 'CerebriConsumerError'
  }
}
export function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) }
export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max }
export function identifier(value: unknown): value is string { return typeof value === 'string' && /^[A-Za-z0-9._-]{1,96}$/.test(value) }
export function isIntent(value: unknown): value is SuggestionIntent {
  return record(value) && Object.keys(value).length === 3 && identifier(value.taskId) && identifier(value.requestId) && identifier(value.traceId)
}
// Resolved UTC identity only; preserve nanoseconds rather than rounding through Date.
export function instant(value: unknown): bigint | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$/.exec(value)
  if (!match) return null
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number)
  if (year < 1970 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return BigInt(date.getTime()) * 1_000_000n + BigInt((match[7] ?? '').padEnd(9, '0'))
}
export function range(value: unknown): value is InstantRange {
  if (!record(value)) return false
  const start = instant(value.start), end = instant(value.end)
  return start !== null && end !== null && start < end
}
export function zone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 128) return false
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return value === 'UTC' || value.includes('/') } catch { return false }
}
export type DecodedCandidate = Readonly<{ id: string; start: string; placement: InstantRange; sourceRevision: number; rankingFeatures: JsonObject; evidence: JsonObject }>
export type DecodedResult = Readonly<{
  status: 'planned'
  requestId: string
  traceId: string
  contextRevision: number
  outcome: 'Solution' | 'NoSolution' | 'NeedsRelaxation' | 'InsufficientInformation'
  assessment: 'ProvenOptimal' | 'Complete' | 'BestFound'
  candidates: readonly DecodedCandidate[]
  // Valid JSON evidence preserved in Rust order. No client solver or lifecycle proof.
  evidence: JsonObject
}> | Readonly<{ status: 'rejected'; code: string }>
export type ConsumerOutcome = DecodedResult | { status: 'clarification'; code: ClarificationCode } | { status: 'unavailable'; reason: 'disabled' | 'browser' | 'mobile' } | { status: 'cancelled' | 'stale' } | { status: 'error'; code: string }
