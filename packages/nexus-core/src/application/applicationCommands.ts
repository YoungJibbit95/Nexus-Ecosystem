import { canonicalContent, instantEpoch, type PlanningDocument } from '../planning/domain'
import { preparePlanningDocument } from '../planning/formats'
import { validateRuntimeSnapshot, type RuntimeState } from '../workspace/runtimeSnapshot'

export type ApplicationSnapshot = { state: RuntimeState; planning: PlanningDocument }
type Base = { key: string; expected: { generation: string; revision: number } }
export type ApplicationCaptureCommand = Base & (
  | { kind: 'capture-note'; fields: { title: string; content: string; tags?: string[]; [key: string]: unknown } }
  | { kind: 'capture-reminder'; fields: { title: string; msg: string; datetime: string; repeat: 'none' | 'daily' | 'weekly' | 'monthly'; [key: string]: unknown } }
)
export type ApplicationCaptureResult =
  | { ok: true; acknowledged: true; id: string; destination: 'notes' | 'reminders'; replayed: boolean }
  | { ok: false; code: 'validation' | 'stale' | 'conflict' | 'unavailable' | 'storage-failure'; message: string }
class RejectedCommand extends Error {
  constructor(readonly code: Extract<ApplicationCaptureResult, { ok: false }>['code'], message: string) { super(message) }
}
const reject = (code: RejectedCommand['code'], message: string): never => { throw new RejectedCommand(code, message) }
export type ApplicationCapturePorts = {
  transaction: (builder: (current: ApplicationSnapshot) => ApplicationSnapshot) => Promise<void>
  expected: () => Base['expected']; isFrozen: () => boolean; id: () => string; now: () => string
}
/** The application facade delegates persistence to the existing whole-workspace journal.
 * Its builder runs on the latest flushed preimage and never calls a mutating store action.
 * Planning/task/event commands retain their existing owner; this facade shares its receipt format. */
export function createApplicationCommandOwner(ports: ApplicationCapturePorts) {
  let tail: Promise<unknown> = Promise.resolve()
  const execute = (command: ApplicationCaptureCommand): Promise<ApplicationCaptureResult> => {
    const next = tail.then(async (): Promise<ApplicationCaptureResult> => {
      if (ports.isFrozen()) return { ok: false, code: 'unavailable', message: 'Workspace-Vorgang oder Wiederherstellung ist aktiv.' }
      try {
        if (!command || !['capture-note', 'capture-reminder'].includes(command.kind) || !command.fields || typeof command.fields.title !== 'string' || !command.fields.title.trim()
          || typeof command.key !== 'string' || !command.key || command.key.length > 200
          || !command.expected || typeof command.expected.generation !== 'string' || !Number.isSafeInteger(command.expected.revision) || command.expected.revision < 0) reject('validation', 'Titel und stabile Command-Identität fehlen.')
        if (command.kind === 'capture-note' && (typeof command.fields.content !== 'string' || command.fields.tags !== undefined && (!Array.isArray(command.fields.tags) || command.fields.tags.some(tag => typeof tag !== 'string')))) reject('validation', 'Notizinhalt oder Tags sind ungültig.')
        if (command.kind === 'capture-reminder' && (typeof command.fields.msg !== 'string' || !Number.isFinite(instantEpoch(command.fields.datetime)) || !['none', 'daily', 'weekly', 'monthly'].includes(command.fields.repeat))) reject('validation', 'Reminder benötigt einen gültigen Zeitpunkt mit UTC/Offset und eine unterstützte Wiederholung.')
        const content = canonicalContent(command)
        let result: Extract<ApplicationCaptureResult, { ok: true }> | undefined
        await ports.transaction(current => {
          const planning = preparePlanningDocument(current.planning)
          if (command.expected.generation !== planning.generation) reject('stale', 'Workspace wurde ersetzt. Prüfe die aktuellen Daten und bestätige erneut.')
          const prior = Object.prototype.hasOwnProperty.call(planning.receipts, command.key) ? planning.receipts[command.key] : undefined
          const destination = command.kind === 'capture-note' ? 'notes' : 'reminders'
          if (prior) {
            if (prior.command !== content || prior.ids.length !== 1) reject('conflict', 'Diese Command-Identität wurde bereits für anderen Inhalt verwendet.')
            result = { ok: true, acknowledged: true, id: prior.ids[0], destination, replayed: true }
            return current
          }
          if (command.expected.revision !== planning.revision) reject('stale', 'Planungsdaten haben sich geändert. Prüfe die aktuellen Daten und bestätige erneut.')
          const state = structuredClone(current.state), id = ports.id(), now = ports.now()
          if (!id || state.notes.some(item => item.id === id) || state.reminders.some(item => item.id === id)) reject('conflict', 'Neue Objektidentität ist bereits belegt.')
          if (command.kind === 'capture-note') {
            const note = { tags: [], ...structuredClone(command.fields), id, title: command.fields.title.trim(), created: now, updated: now, dirty: false }
            state.notes = [note, ...state.notes]
            state.openNoteIds = [id, ...state.openNoteIds.filter(openId => openId !== id)]
            state.activeNoteId = id
          } else {
            const reminder = { ...structuredClone(command.fields), id, title: command.fields.title.trim(), done: false }
            state.reminders = [reminder, ...state.reminders]
          }
          validateRuntimeSnapshot({ version: 1, app: 'Application capture', exportedAt: now, state })
          planning.revision++
          Object.defineProperty(planning.receipts, command.key, { value: { command: content, ids: [id], revision: planning.revision, issues: [] }, enumerable: true, configurable: true, writable: true })
          result = { ok: true, acknowledged: true, id, destination, replayed: false }
          return { state, planning: preparePlanningDocument(planning) }
        })
        // The result cannot escape before journal/apply/flush/cleanup acknowledgement.
        if (!result) throw new Error('Capture transaction did not produce a result')
        return result
      } catch (error) {
        return error instanceof RejectedCommand ? { ok: false, code: error.code, message: error.message }
          : { ok: false, code: 'storage-failure', message: 'Erfassung wurde nicht bestätigt. Eingaben bleiben erhalten; prüfe Speicher/Wiederherstellung und versuche erneut.' }
      }
    })
    tail = next.catch(() => {})
    return next
  }
  return { execute, expected: ports.expected, drain: () => tail.then(() => {}) }
}
