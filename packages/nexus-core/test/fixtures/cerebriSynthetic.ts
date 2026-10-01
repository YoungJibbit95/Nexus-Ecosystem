import type { SuggestionSnapshot, SuggestionIntent } from '../../src/planning/cerebri/contracts'

export const intent: SuggestionIntent = { taskId: 'task-one', requestId: 'synthetic-suggestion', traceId: 'synthetic-trace' }
export const syntheticSnapshot = (): SuggestionSnapshot => ({
  principalId: 'synthetic-user', workspaceGeneration: 2, permissionRevision: 4, contextRevision: 1, capturedAt: '2026-10-01T08:00:00Z', read: true, plan: true,
  task: { id: 'task-one', revision: 8, durationSeconds: { state: 'KNOWN', data: 1800 }, deadline: { state: 'MISSING' }, workflowReady: true },
  window: { start: '2026-10-01T09:00:00Z', end: '2026-10-01T12:00:00Z' }, timezone: { state: 'KNOWN', data: 'Europe/Berlin' }, calendarId: 'synthetic-calendar', integrationId: 'mock',
  busy: [{ id: 'busy', revision: 1, range: { start: '2026-10-01T09:00:00Z', end: '2026-10-01T10:00:00Z' }, timezone: 'Europe/Berlin', calendarId: 'synthetic-calendar', integrationId: 'mock' }],
  coverage: 'Complete', granularitySeconds: 900, maxCandidates: 32,
})
export const manifest = { integration_version: { major: 0, minor: 1 }, cpir_schema_version: { major: 0, minor: 2 }, software_version: '0.2.0', profile: 'single_event_suggestion', operations: ['FIND_SLOT'], deployment_modes: ['Test', 'Shadow', 'Suggestion'], temporal_coverage_required: true, execution_supported: false, max_request_bytes: 262144 }
