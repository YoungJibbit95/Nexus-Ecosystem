import { prepareSuggestion } from './adapter'
import { decodeManifest, decodeSuggestion } from './decoder'
import { CerebriConsumerError, isIntent, type ConsumerOutcome, type JsonObject, type SuggestionIntent, type SuggestionSnapshot } from './contracts'

export type SuggestionPort = Readonly<{
  describe(signal: AbortSignal): Promise<unknown>
  suggest(request: JsonObject, signal: AbortSignal): Promise<unknown>
}>
export type OwnerOptions = Readonly<{
  platform: 'desktop' | 'browser' | 'mobile'
  enabled?: boolean
  port: SuggestionPort
  capture(intent: SuggestionIntent): Promise<SuggestionSnapshot>
  // Synchronous freshness check after the final asynchronous boundary.
  currentFreshnessKey(intent: SuggestionIntent): string | null
}>

const transportCodes = new Set(['aborted', 'timeout', 'bridge_unavailable', 'bridge_failed', 'invalid_response', 'incompatible_bridge', 'request_too_large', 'response_too_large', 'invalid_request', 'invalid_options', 'artifact_mismatch', 'busy'])
export function createSuggestionOwner(options: OwnerOptions) {
  let enabled = options.enabled === true
  let disposed = false
  let epoch = 0
  let active: AbortController | null = null
  const invalidate = () => { epoch++; active?.abort(); active = null }
  return {
    setEnabled(value: boolean) { enabled = value === true; invalidate() },
    invalidate,
    dispose() { disposed = true; invalidate() },
    async request(intent: SuggestionIntent): Promise<ConsumerOutcome> {
      if (options.platform !== 'desktop') return { status: 'unavailable', reason: options.platform }
      if (!enabled || disposed) return { status: 'unavailable', reason: 'disabled' }
      if (!isIntent(intent)) { invalidate(); return { status: 'error', code: 'invalid_intent' } }
      invalidate()
      const generation = epoch
      const controller = new AbortController()
      active = controller
      const obsolete = () => disposed || !enabled || generation !== epoch || controller.signal.aborted
      try {
        const snapshot = await options.capture(intent)
        if (obsolete()) return { status: 'cancelled' }
        const prepared = prepareSuggestion(intent, snapshot)
        if (prepared.status !== 'ready') return prepared
        if (options.currentFreshnessKey(intent) !== prepared.value.freshnessKey) return { status: 'stale' }
        const manifest = await options.port.describe(controller.signal)
        if (obsolete()) return { status: 'cancelled' }
        decodeManifest(manifest)
        if (options.currentFreshnessKey(intent) !== prepared.value.freshnessKey) return { status: 'stale' }
        const raw = await options.port.suggest(prepared.value.envelope, controller.signal)
        if (obsolete()) return { status: 'cancelled' }
        const decoded = decodeSuggestion(raw, prepared.value)
        if (options.currentFreshnessKey(intent) !== prepared.value.freshnessKey) return { status: 'stale' }
        return decoded
      } catch (error) {
        if (obsolete()) return { status: 'cancelled' }
        if (error instanceof CerebriConsumerError) return { status: 'error', code: error.code }
        const code = error && typeof error === 'object' && 'code' in error ? error.code : null
        return { status: 'error', code: typeof code === 'string' && transportCodes.has(code) ? code : 'bridge_failed' }
      } finally { if (generation === epoch) active = null }
    },
  }
}
