/** Reminder forms edit a minute of wall time in one captured IANA zone. */
export type ReminderTimeEdit = {
  timeZone: string
  initialLocal: string
  sourceInstant: string
}

export type ReminderTimeChoice = { instant: string; offsetLabel: string }
export type ReminderTimeResolution = {
  ok: true
  instant: string
  choices: ReminderTimeChoice[]
  selectedOccurrence: string
} | {
  ok: false
  code: 'INVALID_DATE_TIME' | 'INVALID_TIME_ZONE' | 'NONEXISTENT_LOCAL_TIME' | 'AMBIGUOUS_LOCAL_TIME'
  message: string
  choices: ReminderTimeChoice[]
  selectedOccurrence: string
}

const formatters = new Map<string, Intl.DateTimeFormat>()
const offsetCache = new Map<string, number[]>()
const formatter = (timeZone: string) => {
  if (/^[+-]/.test(timeZone)) throw new RangeError('An IANA zone is required')
  let value = formatters.get(timeZone)
  if (!value) {
    value = new Intl.DateTimeFormat('en-GB-u-ca-iso8601-nu-latn', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    })
    if (formatters.size >= 16) formatters.delete(formatters.keys().next().value)
    formatters.set(timeZone, value)
  }
  return value
}
const partsAt = (epoch: number, timeZone: string) => Object.fromEntries(
  formatter(timeZone).formatToParts(epoch).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]),
)
const wallEpoch = (parts: Record<string, number>) => {
  const value = new Date(0)
  value.setUTCFullYear(parts.year, parts.month - 1, parts.day)
  value.setUTCHours(parts.hour, parts.minute, parts.second || 0, 0)
  return value.getTime()
}
const pad = (value: number, length = 2) => String(value).padStart(length, '0')
const localText = (parts: Record<string, number>) => `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
const instantEpoch = (instant: string) => {
  // A reminder is an instant; a zone-less timestamp must not pick up the host zone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(instant)) return NaN
  return Date.parse(instant)
}

export const currentReminderTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

export const reminderInstantToLocalInput = (instant: string, timeZone: string): string => {
  const epoch = instantEpoch(instant)
  if (!Number.isFinite(epoch)) return ''
  try { return localText(partsAt(epoch, timeZone)) } catch { return '' }
}

export const createReminderTimeEdit = (
  originalInstant?: string,
  timeZone = currentReminderTimeZone(),
  now = new Date(),
): ReminderTimeEdit => {
  const sourceInstant = originalInstant ?? new Date(now.getTime() + 15 * 60_000).toISOString()
  return { timeZone, initialLocal: reminderInstantToLocalInput(sourceInstant, timeZone), sourceInstant }
}

const invalid = (code: Extract<ReminderTimeResolution, { ok: false }>['code'], message: string, choices: ReminderTimeChoice[] = []): ReminderTimeResolution => (
  { ok: false, code, message, choices, selectedOccurrence: '' }
)

/** Resolve only actual round-tripping candidates; never normalize a DST gap. */
export const resolveReminderTimeEdit = (edit: ReminderTimeEdit, local: string, occurrence = ''): ReminderTimeResolution => {
  try { formatter(edit.timeZone) } catch { return invalid('INVALID_TIME_ZONE', 'Choose a valid IANA time zone.') }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!match) return invalid('INVALID_DATE_TIME', 'Enter a valid date and time.')
  const [, year, month, day, hour, minute] = match.map(Number)
  const requested = { year, month, day, hour, minute, second: 0 }
  const wall = wallEpoch(requested)
  const parsed = new Date(wall)
  if (year < 1 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59
    || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
    return invalid('INVALID_DATE_TIME', 'Enter a valid date and time.')
  }
  const key = `${edit.timeZone}:${local.slice(0, 10)}`
  let offsets = offsetCache.get(key)
  if (!offsets) {
    const dayStart = wallEpoch({ ...requested, hour: 0, minute: 0 })
    const found = new Set<number>()
    // Both sides of a transition are included, including a whole-day offset
    // change. Candidate round-tripping below decides gap/unique/fold behavior.
    for (let hours = -36; hours <= 36; hours += 1) {
      const sample = dayStart + hours * 3_600_000
      found.add(wallEpoch(partsAt(sample, edit.timeZone)) - sample)
    }
    offsets = [...found]
    if (offsetCache.size >= 64) offsetCache.delete(offsetCache.keys().next().value)
    offsetCache.set(key, offsets)
  }
  const candidates = offsets.map(offset => ({ epoch: wall - offset, offset })).filter(candidate => {
    const actual = partsAt(candidate.epoch, edit.timeZone)
    return localText(actual) === local && actual.second === 0
  }).sort((left, right) => left.epoch - right.epoch)
  const choices = candidates.map(({ epoch, offset }) => {
    const seconds = Math.abs(offset) / 1000
    const offsetLabel = `UTC${offset < 0 ? '-' : '+'}${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}${seconds % 60 ? `:${pad(seconds % 60)}` : ''}`
    return { instant: new Date(epoch).toISOString(), offsetLabel }
  })
  if (!choices.length) return invalid('NONEXISTENT_LOCAL_TIME', `This time does not exist in ${edit.timeZone} because the clocks move forward. Choose another time.`)

  const source = instantEpoch(edit.sourceInstant)
  const sourceCandidate = candidates.find(candidate => source >= candidate.epoch && source < candidate.epoch + 60_000)
  // Re-saving a title/details edit must keep precision and the original fold.
  if (local === edit.initialLocal && sourceCandidate && (!occurrence || occurrence === new Date(sourceCandidate.epoch).toISOString())) {
    return { ok: true, instant: edit.sourceInstant, choices, selectedOccurrence: new Date(sourceCandidate.epoch).toISOString() }
  }
  if (choices.length === 1) return { ok: true, instant: choices[0].instant, choices, selectedOccurrence: choices[0].instant }
  const selected = choices.find(choice => choice.instant === occurrence)
  if (!selected) return invalid('AMBIGUOUS_LOCAL_TIME', `This time occurs twice in ${edit.timeZone}. Choose the earlier or later occurrence.`, choices)
  return { ok: true, instant: selected.instant, choices, selectedOccurrence: selected.instant }
}
