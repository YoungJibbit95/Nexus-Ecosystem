import { canonicalContent, taskRevision, type PlanningSnapshot } from '../domain'
import type { PlanningCommand, PlanningCommandResult } from '../commandService'
import { identifier, type ConsumerOutcome, type DecodedCandidate } from './contracts'
import { candidateFits, validPreviewInputs, type HostPreview, type PreviewHostPort, type PreviewInputs } from './inputContracts'
import { previewReasons, type RustReason } from './previewReasons'

export type PreviewState = Readonly<{
  status: 'disabled' | 'idle' | 'loading' | 'preview' | 'stale' | 'revalidating' | 'saving' | 'acknowledged' | 'command-error' | 'invalid-input' | 'error'
  result?: ConsumerOutcome; coverage?: HostPreview['coverage']; reasons?: readonly RustReason[]; selectedId?: string
  commandResult?: PlanningCommandResult
}>
type ScheduleCommand = Extract<PlanningCommand, { kind: 'schedule-task' }>
export function createPreviewFlow(ports: {
  enabled?: boolean; host: PreviewHostPort; capture(): PlanningSnapshot
  execute(command: PlanningCommand): Promise<PlanningCommandResult>; id(): string
}) {
  let enabled = ports.enabled === true, disposed = false, epoch = 0, state: PreviewState = { status: enabled ? 'idle' : 'disabled' }
  let bound: { taskId: string; inputs: PreviewInputs; expected: ScheduleCommand['expected']; planning: string; ticket: string | null; candidates: readonly DecodedCandidate[] } | null = null
  let command: ScheduleCommand | null = null
  const listeners = new Set<() => void>()
  const publish = (next: PreviewState) => { state = next; listeners.forEach(fn => fn()) }
  const invalidate = () => { epoch++; bound = null; command = null; ports.host.invalidate(); publish({ status: enabled && !disposed ? 'idle' : 'disabled' }) }
  const fresh = () => {
    if (!bound) return false
    const current = ports.capture(), task = current.tasks.find(item => item.id === bound!.taskId)
    return Boolean(task && task.status !== 'done' && current.planning.generation === bound.expected.generation
      && current.planning.revision === bound.expected.revision && taskRevision(task) === bound.expected.taskRevision
      && canonicalContent(current.planning) === bound.planning)
  }
  const stale = () => { bound = null; command = null; ports.host.invalidate(); publish({ status: 'stale' }) }
  return {
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } },
    getSnapshot: () => state,
    invalidate,
    setEnabled(value: boolean) { enabled = value === true; invalidate() },
    dispose() { disposed = true; enabled = false; invalidate(); listeners.clear() },
    async preview(taskId: string, rawInputs: PreviewInputs) {
      if (!enabled || disposed || state.status === 'saving') return
      invalidate()
      const snapshot = ports.capture(), task = snapshot.tasks.find(item => item.id === taskId)
      if (!identifier(taskId) || !task || task.status === 'done' || !validPreviewInputs(rawInputs)) { publish({ status: 'invalid-input' }); return }
      const inputs = structuredClone(rawInputs), generation = epoch
      bound = { taskId, inputs, expected: { generation: snapshot.planning.generation, revision: snapshot.planning.revision, taskRevision: taskRevision(task) }, planning: canonicalContent(snapshot.planning), ticket: null, candidates: [] }
      publish({ status: 'loading' })
      try {
        const response = await ports.host.preview({ taskId, requestId: ports.id(), traceId: ports.id(), ...inputs })
        if (generation !== epoch || disposed || !enabled) return
        if (!fresh()) { stale(); return }
        const result = response.result
        if (!response || !['Complete', 'Incomplete', null].includes(response.coverage)) throw new Error('invalid response')
        const reasons = result.status === 'planned' ? previewReasons(result) : []
        if (result.status === 'planned') {
          if (result.outcome === 'Solution' && (!identifier(response.ticket) || !result.candidates.length || result.candidates.some(candidate => !candidateFits(candidate, inputs)))) throw new Error('invalid candidates')
          bound!.ticket = response.ticket; bound!.candidates = structuredClone(result.candidates)
        }
        publish({ status: result.status === 'stale' ? 'stale' : 'preview', result, coverage: response.coverage, reasons })
      } catch { if (generation === epoch) { bound = null; publish({ status: 'error' }) } }
    },
    select(candidateId: string) {
      if (state.status !== 'preview' && state.status !== 'command-error') return
      if (!fresh()) { stale(); return }
      if (!bound?.candidates.some(item => item.id === candidateId)) return
      command = null; publish({ ...state, status: 'preview', selectedId: candidateId, commandResult: undefined })
    },
    async confirm(confirmation: { confirmed: boolean; keepConflict: boolean }) {
      if (confirmation?.confirmed !== true || typeof confirmation.keepConflict !== 'boolean' || !enabled || disposed || !['preview', 'command-error'].includes(state.status) || !bound?.ticket || !state.selectedId) return
      if (!fresh()) { stale(); return }
      const generation = epoch, current = bound, selectedId = state.selectedId, previous = state
      publish({ ...state, status: 'revalidating' })
      try {
        const checked = await ports.host.revalidate({ ticket: current.ticket, candidateId: selectedId })
        if (generation !== epoch || disposed || !enabled) return
        // Fresh Nexus identity after the last async host boundary; the command owner
        // checks it again before and after journaling. This is a manual Nexus write.
        if (!fresh() || checked.status !== 'fresh') { stale(); return }
        const candidate = current.candidates.find(item => item.id === selectedId)!
        if (canonicalContent(checked.candidate) !== canonicalContent(candidate) || checked.durationMinutes !== current.inputs.durationMinutes || checked.timeZone !== current.inputs.timeZone) { publish({ status: 'error' }); return }
        if (command && command.keepConflict !== confirmation.keepConflict) command = null
        command ??= { kind: 'schedule-task', key: ports.id(), expected: { ...current.expected }, taskId: current.taskId, start: candidate.start, durationMinutes: current.inputs.durationMinutes, timeZone: current.inputs.timeZone, keepConflict: confirmation.keepConflict }
        publish({ ...previous, status: 'saving' })
        const result = await ports.execute(structuredClone(command))
        if (generation !== epoch || disposed) return
        publish({ ...previous, status: result.ok ? 'acknowledged' : 'command-error', commandResult: result })
      } catch { if (generation === epoch) publish({ ...previous, status: 'error' }) }
    },
  }
}
