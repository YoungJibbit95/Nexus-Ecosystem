import { CerebriConsumerError, identifier, instant, integer, isIntent, range, zone, type JsonObject, type Preparation, type SuggestionIntent, type SuggestionSnapshot } from './contracts'

const fail = (): never => { throw new CerebriConsumerError('invalid_snapshot') }
const evidence = (state: JsonObject, provenance: string): JsonObject => ({ value: { processing: 'RESOLVED', knowledge: state }, provenance, confidence: null, evidence: [] })

export function prepareSuggestion(intent: SuggestionIntent, snapshot: SuggestionSnapshot): Preparation {
  if (!isIntent(intent)) throw new CerebriConsumerError('invalid_intent')
  const s = snapshot
  if (!s || !s.task || s.task.id !== intent.taskId || !identifier(s.principalId) || !identifier(s.calendarId) || !identifier(s.integrationId)
    || !integer(s.workspaceGeneration) || !integer(s.permissionRevision) || !integer(s.contextRevision) || !integer(s.task.revision)
    || instant(s.capturedAt) === null || !range(s.window) || typeof s.read !== 'boolean' || typeof s.plan !== 'boolean'
    || !['Complete', 'Incomplete'].includes(s.coverage) || !integer(s.granularitySeconds, 1, 86400) || !integer(s.maxCandidates, 1, 4096)
    || !Array.isArray(s.busy) || s.busy.length > 255 || typeof s.task.workflowReady !== 'boolean') fail()
  if (s.unsupportedRecurrence) return { status: 'clarification', code: 'unsupported_recurrence' }
  if (!s.task.workflowReady) return { status: 'clarification', code: 'workflow_not_ready' }
  if (s.task.durationSeconds?.state !== 'KNOWN') return { status: 'clarification', code: s.task.durationSeconds?.state === 'MISSING' ? 'missing_duration' : 'unresolved_duration' }
  if (!integer(s.task.durationSeconds.data, 1, 31_536_000)) fail()
  if (s.timezone?.state !== 'KNOWN') return { status: 'clarification', code: s.timezone?.state === 'MISSING' ? 'missing_timezone' : 'unresolved_timezone' }
  if (!zone(s.timezone.data)) fail()
  if (s.task.deadline?.state === 'DATE_ONLY') return { status: 'clarification', code: 'date_only_deadline' }
  if (!s.task.deadline || !['KNOWN', 'MISSING'].includes(s.task.deadline.state)) return { status: 'clarification', code: 'unresolved_deadline' }
  if (s.task.deadline.state === 'KNOWN' && instant(s.task.deadline.data) === null) fail()
  if (s.objectIds !== undefined && s.objectIds !== null && (!Array.isArray(s.objectIds) || s.objectIds.length > 256 || !s.objectIds.every(identifier))) fail()
  const targetId = `n1-${intent.requestId}`
  const ids = new Set([targetId])
  const objects: JsonObject[] = [{ id: targetId, revision: null, kind: { kind: 'EVENT' }, calendar_id: s.calendarId, integration_id: s.integrationId, resource_ids: [],
    time: evidence({ state: 'MISSING' }, 'USER_EXPLICIT'), timezone: s.timezone.data, semantics: null }]
  for (const busy of s.busy) {
    if (!busy || !identifier(busy.id) || ids.has(busy.id) || !integer(busy.revision) || !range(busy.range) || !zone(busy.timezone) || !identifier(busy.calendarId) || !identifier(busy.integrationId)) fail()
    ids.add(busy.id)
    objects.push({ id: busy.id, revision: busy.revision, kind: { kind: 'EVENT' }, calendar_id: busy.calendarId, integration_id: busy.integrationId, resource_ids: [],
      time: evidence({ state: 'KNOWN', data: { ...busy.range } }, 'INTEGRATION_FACT'), timezone: busy.timezone, semantics: null })
  }
  // A known deadline limits the latest end, never creates occupied time.
  const constraints: JsonObject[] = s.task.deadline.state === 'KNOWN'
    ? [{ object_id: targetId, rule: { kind: 'LATEST_END', value: s.task.deadline.data }, evidence: [] }] : []
  const request: JsonObject = {
    schema_version: { major: 0, minor: 2 }, request_id: intent.requestId, trace_id: intent.traceId, principal_id: s.principalId, operation: 'FIND_SLOT',
    scope: { time_range: { ...s.window }, calendar_ids: null, object_ids: s.objectIds == null ? null : [...s.objectIds], resource_ids: null, integration_ids: null, movable_object_ids: [], max_mutations: 0 },
    context: { revision: s.contextRevision, captured_at: s.capturedAt, objects, facts: [], temporal: { horizon: { ...s.window }, coverage: s.coverage, limits: { max_dates: 31, max_occurrences: 128 }, series: [] } },
    target_ids: [targetId], duration: evidence({ state: 'KNOWN', data: s.task.durationSeconds.data }, 'USER_EXPLICIT'), constraints,
    preferences: { preferences: [] }, policy: { policy_set_id: 'nexus-n1-analysis', policy_version: 1, snapshot: { allow_uncertain_duration: false, confirmation: { all_mutations: true, deletion: true }, mutation: { max_mutations: 0, allowed_actions: [] }, mode: 'Suggestion' } },
    planning_capability: { read: s.read, plan: s.plan, mutations: [] }, granularity: s.granularitySeconds, budget: { max_candidates: s.maxCandidates, max_repairs: 0, max_moved_objects: 1, max_depth: 0 },
  }
  const envelope = { integration_version: { major: 0, minor: 1 }, request }
  if (new TextEncoder().encode(JSON.stringify(envelope)).length > 262144) throw new CerebriConsumerError('request_too_large')
  // Capture time is observational metadata, never a replacement for source identity.
  const freshnessContext = { ...(request.context as JsonObject) }
  delete freshnessContext.captured_at
  const freshnessKey = JSON.stringify({ request: { ...request, context: freshnessContext }, workspaceGeneration: s.workspaceGeneration, permissionRevision: s.permissionRevision, taskRevision: s.task.revision })
  return { status: 'ready', value: { envelope, intent: { ...intent }, targetId, window: { ...s.window }, durationSeconds: s.task.durationSeconds.data, contextRevision: s.contextRevision, freshnessKey } }
}
