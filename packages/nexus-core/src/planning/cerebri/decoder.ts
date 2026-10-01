import { CerebriConsumerError, instant, integer, range, record, type DecodedCandidate, type DecodedResult, type Json, type JsonObject, type PreparedSuggestion } from './contracts'

function fail(): never { throw new CerebriConsumerError('invalid_response') }
const has = (v: object, key: string) => Object.prototype.hasOwnProperty.call(v, key)
const exactVersion = (v: unknown, minor: number) => record(v) && Object.keys(v).length === 2 && v.major === 0 && v.minor === minor
const rejectionCodes = new Set(['invalid_request', 'request_too_large', 'unsupported_integration_version', 'unsupported_cpir_version', 'unsupported_operation', 'mutation_authority_forbidden', 'unsupported_deployment_mode', 'prospective_event_required', 'temporal_coverage_required', 'uncertain_duration_forbidden'])
const preferenceSources = new Set(['ExplicitCurrentRequest', 'SessionContext', 'PersonalLearned', 'GlobalLearned', 'Default'])

// Evidence stays JSON, never an executable proof. Bound recursive shape and unsafe numbers.
function json(value: unknown, depth = 0, budget = { nodes: 0 }): asserts value is Json {
  if (++budget.nodes > 400000 || depth > 40) fail()
  if (value === null || typeof value === 'boolean') return
  if (typeof value === 'string') { if (value.length > 262144) fail(); return }
  if (typeof value === 'number') { if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) fail(); return }
  if (Array.isArray(value)) { value.forEach(v => json(v, depth + 1, budget)); return }
  if (!record(value)) fail()
  for (const [key, child] of Object.entries(value)) { if (key === '__proto__' || key === 'constructor' || key === 'prototype') fail(); json(child, depth + 1, budget) }
}

export function decodeManifest(value: unknown): JsonObject {
  if (!record(value) || !exactVersion(value.integration_version, 1) || !exactVersion(value.cpir_schema_version, 2)
    || value.profile !== 'single_event_suggestion' || value.temporal_coverage_required !== true || value.execution_supported !== false
    || value.max_request_bytes !== 262144 || typeof value.software_version !== 'string' || value.software_version.length > 128
    || JSON.stringify(value.operations) !== '["FIND_SLOT"]' || JSON.stringify(value.deployment_modes) !== '["Test","Shadow","Suggestion"]') throw new CerebriConsumerError('incompatible_bridge')
  json(value)
  return structuredClone(value) as JsonObject
}

export function decodeSuggestion(value: unknown, expected: PreparedSuggestion): DecodedResult {
  if (!record(value) || !exactVersion(value.integration_version, 1)) throw new CerebriConsumerError('incompatible_bridge')
  json(value)
  if (value.status === 'rejected') {
    if (typeof value.code !== 'string' || !rejectionCodes.has(value.code)) fail()
    return { status: 'rejected', code: value.code }
  }
  if (value.status !== 'planned' || value.request_id !== expected.intent.requestId || value.trace_id !== expected.intent.traceId
    || value.context_revision !== expected.contextRevision || !record(value.result)) fail()
  const result = value.result as Record<string, unknown>
  if (!['Solution', 'NoSolution', 'NeedsRelaxation', 'InsufficientInformation'].includes(result.outcome as string)
    || !['ProvenOptimal', 'Complete', 'BestFound'].includes(result.assessment as string)
    || !record(result.validation) || !['Valid', 'ValidWithUncertainty', 'InsufficientInformation'].includes(result.validation.state as string) || !Array.isArray(result.validation.issues)
    || !Array.isArray(result.candidates) || result.candidates.length > 4096
    || !record(result.conflicts) || !Array.isArray(result.conflicts.rejections)
    || !record(result.search_space) || !range(result.search_space.horizon) || instant(result.search_space.horizon.start) !== instant(expected.window.start) || instant(result.search_space.horizon.end) !== instant(expected.window.end)
    || !integer(result.search_space.granularity, 1) || !integer(result.search_space.evaluated, 0, 4096) || typeof result.search_space.exhausted !== 'boolean' || typeof result.search_space.objective !== 'string'
    || !(result.compilation === null || record(result.compilation)) || !record(result.dependency_graph) || !Array.isArray(result.dependency_graph.issues)) fail()
  if ((result.assessment === 'ProvenOptimal' || result.assessment === 'Complete') && result.search_space.exhausted !== true) fail()
  if ((result.outcome === 'Solution') !== (result.candidates.length > 0) || (result.outcome === 'Solution' && result.validation.state === 'InsufficientInformation')) fail()
  const candidates: DecodedCandidate[] = []
  const identities = new Set<string>()
  for (const raw of result.candidates) {
    if (!record(raw) || !record(raw.proposed) || typeof raw.proposed.id !== 'string' || !/^p-[0-9a-f]{64}$/.test(raw.proposed.id) || identities.has(raw.proposed.id)
      || raw.proposed.source_revision !== expected.contextRevision || !Array.isArray(raw.proposed.placements) || raw.proposed.placements.length !== 1
      || raw.object_id !== expected.targetId || instant(raw.start) === null || !integer(raw.cost) || raw.mutation_count !== 0 || raw.shifted_seconds !== 0
      || !Array.isArray(raw.explanation) || !record(raw.ordering_key) || !record(raw.ranking_features)) fail()
    const placement = raw.proposed.placements[0]
    if (!record(placement) || placement.object_id !== expected.targetId || !range(placement.range) || placement.range.start !== raw.start) fail()
    const p = placement.range
    if (instant(p.start)! < instant(expected.window.start)! || instant(p.end)! > instant(expected.window.end)! || instant(p.end)! - instant(p.start)! !== BigInt(expected.durationSeconds) * 1_000_000_000n) fail()
    const features = raw.ranking_features
    if (Object.keys(features).length !== 5 || !exactVersion(features.schema_version, 1) || features.mutation_count !== 0 || features.shift_seconds !== 0
      || !has(features, 'preferred_start_distance_seconds') || !has(features, 'preferred_start_source')
      || !(features.preferred_start_distance_seconds === null || integer(features.preferred_start_distance_seconds))
      || !(features.preferred_start_source === null || preferenceSources.has(features.preferred_start_source as string))
      || (features.preferred_start_distance_seconds === null) !== (features.preferred_start_source === null)) fail()
    if (raw.ordering_key.start !== raw.start || raw.ordering_key.object_id !== expected.targetId || raw.ordering_key.mutation_count !== 0 || raw.ordering_key.shifted_seconds !== 0
      || raw.ordering_key.preference_distance_seconds !== (features.preferred_start_distance_seconds ?? 0)) fail()
    for (const explanation of raw.explanation) if (!record(explanation) || !integer(explanation.cost) || !has(explanation, 'reason')) fail()
    identities.add(raw.proposed.id)
    candidates.push({ id: raw.proposed.id, start: raw.start as string, placement: { ...p }, sourceRevision: expected.contextRevision,
      rankingFeatures: structuredClone(features) as JsonObject, evidence: structuredClone(raw) as JsonObject })
  }
  return { status: 'planned', requestId: expected.intent.requestId, traceId: expected.intent.traceId, contextRevision: expected.contextRevision,
    outcome: result.outcome as 'Solution', assessment: result.assessment as 'BestFound', candidates, evidence: structuredClone(result) as JsonObject }
}
