import { identifier, instant, integer, record, zone, type ConsumerOutcome, type DecodedCandidate, type InstantRange, type SuggestionIntent } from './contracts'

export type PreviewInputs = Readonly<{ durationMinutes: number; timeZone: string; window: InstantRange }>
export type PreviewRequest = SuggestionIntent & PreviewInputs
export type HostPreview = Readonly<{ result: ConsumerOutcome; ticket: string | null; coverage: 'Complete' | 'Incomplete' | null }>
export type FreshCandidate = Readonly<{ status: 'fresh'; candidate: DecodedCandidate; durationMinutes: number; timeZone: string }>
export type PreviewHostPort = Readonly<{
  preview(request: PreviewRequest): Promise<HostPreview>
  revalidate(selection: { ticket: string; candidateId: string }): Promise<FreshCandidate | { status: 'stale' | 'unavailable' | 'error' }>
  invalidate(): void
}>
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.prototype.hasOwnProperty.call(value, key))
/** UTC instants represent resolved user input; never infer a zone or DST resolution. */
export function validPreviewInputs(value: unknown): value is PreviewInputs {
  if (!record(value) || !integer(value.durationMinutes, 1, 10080) || !zone(value.timeZone) || !record(value.window) || !keys(value.window, ['start', 'end'])) return false
  const start = instant(value.window.start), end = instant(value.window.end)
  return start !== null && end !== null && start % 1_000_000n === 0n && end % 1_000_000n === 0n
    && end > start && end - start <= 31n * 86400n * 1_000_000_000n
}
/** No authority, facts, paths, raw content or CPIR can enter this renderer envelope. */
export function validPreviewRequest(value: unknown): value is PreviewRequest {
  return record(value) && keys(value, ['taskId', 'requestId', 'traceId', 'durationMinutes', 'timeZone', 'window'])
    && identifier(value.taskId) && identifier(value.requestId) && identifier(value.traceId) && validPreviewInputs(value)
}
export function candidateFits(candidate: DecodedCandidate, inputs: PreviewInputs): boolean {
  const start = instant(candidate?.start), a = instant(candidate?.placement?.start), b = instant(candidate?.placement?.end)
  const lo = instant(inputs.window.start), hi = instant(inputs.window.end)
  return identifier(candidate?.id) && start !== null && a !== null && b !== null && lo !== null && hi !== null
    && start === a && a % 1_000_000n === 0n && b % 1_000_000n === 0n && a >= lo && b <= hi
    && b - a === BigInt(inputs.durationMinutes) * 60n * 1_000_000_000n
}
