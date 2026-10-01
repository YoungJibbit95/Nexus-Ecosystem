import { preparePlanningDocument, planningDowngradeNotice } from '../planning/formats'
import type { PlanningDocument } from '../planning/domain'
import { emptyReminderLedger, importReminderPortable, prepareReminderPortable, type ReminderPortableState, type ReminderSource } from '../reminders/reminderDomain'
import { createRuntimeSnapshot, validateRuntimeSnapshot, type RuntimeSnapshot, type RuntimeState } from './runtimeSnapshot'

/** Schema 1 remains unchanged. Schema 2 explicitly carries the planning sidecar. */
export type RuntimeExchange<S extends RuntimeState = RuntimeState> = RuntimeSnapshot<S> | {
  version: 2; app: string; exportedAt: string; state: S & { planning: PlanningDocument; reminderOccurrences?: ReminderPortableState }
}
export function validateRuntimeExchange(raw: unknown): asserts raw is RuntimeExchange {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid runtime exchange')
  const value = raw as Record<string, any>
  if (value.version === 1) { validateRuntimeSnapshot(value); return }
  if (value.version !== 2 || !value.state || typeof value.state !== 'object' || Array.isArray(value.state)) throw new Error('Unsupported runtime exchange version')
  const { planning, reminderOccurrences, ...state } = value.state
  validateRuntimeSnapshot({ ...value, version: 1, state })
  preparePlanningDocument(planning)
  if (reminderOccurrences !== undefined) importReminderPortable(emptyReminderLedger(), reminderOccurrences, state.reminders as ReminderSource[])
}
export function parseRuntimeExchange(text: string): RuntimeExchange | null {
  try { const value: unknown = JSON.parse(text); validateRuntimeExchange(value); return value } catch { return null }
}
export function createRuntimeExchange<S extends RuntimeState>(app: string, state: S, planning: PlanningDocument, reminderOccurrences?: ReminderPortableState): RuntimeExchange<S> {
  const base = createRuntimeSnapshot(app, state)
  const exchange = { ...base, version: 2 as const, state: { ...base.state, planning: preparePlanningDocument(planning), ...(reminderOccurrences ? { reminderOccurrences: prepareReminderPortable(reminderOccurrences) } : {}) } }
  validateRuntimeExchange(exchange)
  return exchange
}
export function runtimeStateWithoutPlanning<S extends RuntimeState>(exchange: RuntimeExchange<S>): S {
  validateRuntimeExchange(exchange)
  const { planning: _planning, reminderOccurrences: _occurrences, ...state } = exchange.state as S & { planning?: PlanningDocument; reminderOccurrences?: ReminderPortableState }
  return createRuntimeSnapshot(exchange.app, state as S).state
}
export function runtimePlanning(exchange: RuntimeExchange): PlanningDocument | undefined {
  validateRuntimeExchange(exchange)
  return exchange.version === 2 ? preparePlanningDocument(exchange.state.planning) : undefined
}
export function runtimeReminderOccurrences(exchange: RuntimeExchange): ReminderPortableState | undefined {
  validateRuntimeExchange(exchange)
  return exchange.version === 2 && exchange.state.reminderOccurrences ? prepareReminderPortable(exchange.state.reminderOccurrences) : undefined
}
/** A downgrade is an explicit separate export; never overwrite the original exchange. */
export function downgradeRuntimeExchange<S extends RuntimeState>(exchange: RuntimeExchange<S>) {
  const planning = runtimePlanning(exchange)
  const losesReminderOccurrences = Boolean(runtimeReminderOccurrences(exchange)?.occurrences.length)
  const planningNotice = planning ? planningDowngradeNotice(planning) : { losesPlanning: false, message: 'Already version 1.' }
  return {
    snapshot: createRuntimeSnapshot(exchange.app, runtimeStateWithoutPlanning(exchange)),
    notice: { ...planningNotice, losesReminderOccurrences,
      message: planningNotice.message + (losesReminderOccurrences ? ' Version 1 also loses original recurrence anchors, occurrence indices and prior notification outcomes. Keep the complete version 2 export for lossless recovery.' : ''),
    },
  }
}
