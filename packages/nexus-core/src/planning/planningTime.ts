import { resolveReminderTimeEdit, reminderInstantToLocalInput } from '../time/reminderTimeEdit'

/** Shared round-trip temporal resolver; no inferred start or implicit reminder commitment. */
export const resolvePlanningLocal = (local: string, timeZone: string, occurrence = '') =>
  resolveReminderTimeEdit({ timeZone, initialLocal: '', sourceInstant: '' }, local, occurrence)
export const planningInstantToLocal = reminderInstantToLocalInput
export const nextCivilDay = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
export function planningDayHorizon(day: string, timeZone: string) {
  // A day boundary is the first actual minute of the civil day, including zones
  // whose clock transition skips/folds midnight. Explicit work inputs stay strict.
  const boundary = (date: string) => {
    for (let minute = 0; minute < 1440; minute++) {
      const local = `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
      const result = resolvePlanningLocal(local, timeZone)
      if (result.ok === true) return result.instant
      if (result.code === 'AMBIGUOUS_LOCAL_TIME') return result.choices[0].instant
      if (result.code !== 'NONEXISTENT_LOCAL_TIME') throw new Error(result.message)
    }
    throw new Error(`The civil date ${date} does not exist in ${timeZone}. Choose another day.`)
  }
  return { start: boundary(day), end: boundary(nextCivilDay(day)) }
}
