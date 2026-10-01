import { randomUUID } from 'node:crypto'
import { createCerebriHost } from './cerebri-host.mjs'

/** Local N2 composition seam only. No product IPC, collector or execution authority.
 * capture/currentSnapshot are trusted host functions; the renderer supplies only
 * explicit user parameters. Complete coverage must concern precisely that horizon.
 * validators/prepare/consumer are injected shared modules, never renderer callbacks.
 */
export function createCerebriPreviewHost({ consumer, prepare, validRequest, enabled = false, platform = 'desktop', configuration, capture, currentSnapshot }) {
  let active = null, ticket = null, epoch = 0, disposed = false, running = false
  const merged = (request, source) => {
    if (!source || source.task?.id !== request.taskId || source.window?.start !== request.window.start || source.window?.end !== request.window.end) throw new Error('invalid_snapshot')
    return { ...source, task: { ...source.task, durationSeconds: { state: 'KNOWN', data: request.durationMinutes * 60 } }, timezone: { state: 'KNOWN', data: request.timeZone } }
  }
  const key = request => {
    try { const prepared = prepare({ taskId: request.taskId, requestId: request.requestId, traceId: request.traceId }, merged(request, currentSnapshot(request))); return prepared.status === 'ready' ? prepared.value.freshnessKey : null }
    catch { return null }
  }
  const invalidate = () => { epoch++; ticket = null; active?.invalidate(); active = null }
  return {
    invalidate,
    setEnabled(value) { enabled = value === true; invalidate() },
    dispose() { disposed = true; invalidate() },
    async preview(raw) {
      if (!enabled || disposed || platform !== 'desktop') return { result: { status: 'unavailable', reason: platform === 'desktop' ? 'disabled' : platform }, ticket: null, coverage: null }
      if (!validRequest(raw)) { invalidate(); return { result: { status: 'error', code: 'invalid_intent' }, ticket: null, coverage: null } }
      invalidate()
      // Abort superseded work and reject an overlapping call until it has exited.
      // Creating another composition owner must never create a process queue.
      if (running) return { result: { status: 'error', code: 'busy' }, ticket: null, coverage: null }
      running = true
      const request = structuredClone(raw), generation = epoch
      let capturedKey = null, coverage = null
      const intent = { taskId: request.taskId, requestId: request.requestId, traceId: request.traceId }
      const owner = createCerebriHost({ consumer, enabled: true, platform, configuration,
        capture: async () => {
          const snapshot = merged(request, await capture(request))
          const prepared = prepare(intent, snapshot)
          capturedKey = prepared.status === 'ready' ? prepared.value.freshnessKey : null
          coverage = snapshot.coverage
          return snapshot
        }, currentFreshnessKey: () => key(request),
      })
      active = owner
      let result
      try { result = await owner.request(intent) }
      finally { running = false }
      if (generation !== epoch || disposed || !enabled) return { result: { status: 'cancelled' }, ticket: null, coverage: null }
      if (result.status === 'planned' && result.outcome === 'Solution' && result.candidates.length && capturedKey && key(request) === capturedKey) {
        ticket = { id: randomUUID(), request, key: capturedKey, candidates: structuredClone(result.candidates) }
      }
      return { result, ticket: ticket?.id ?? null, coverage }
    },
    async revalidate(selection) {
      if (!enabled || disposed) return { status: 'unavailable' }
      if (!selection || typeof selection !== 'object' || Array.isArray(selection) || Object.keys(selection).length !== 2 || !Object.hasOwn(selection, 'ticket') || !Object.hasOwn(selection, 'candidateId')) return { status: 'error' }
      const bound = ticket
      if (!bound || selection.ticket !== bound.id || key(bound.request) !== bound.key) { ticket = null; return { status: 'stale' } }
      const candidate = bound.candidates.find(item => item.id === selection.candidateId)
      if (!candidate) return { status: 'error' }
      return { status: 'fresh', candidate: structuredClone(candidate), durationMinutes: bound.request.durationMinutes, timeZone: bound.request.timeZone }
    },
  }
}
