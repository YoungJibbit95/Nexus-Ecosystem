import { instantEpoch, intervalValid, validTimeZone, type PlanningEvent } from './domain'
import { nextCivilDay, planningDayHorizon, resolvePlanningLocal } from './planningTime'

export type IcsPreviewRow = { index: number; title: string; uid?: string; raw: string; warnings: string[]; event?: Omit<PlanningEvent, 'id' | 'revision'>; recurring: boolean }
export type IcsPreview = { format: 'nexus-ics-preview'; version: 1; raw: string; timeZone: string; rows: IcsPreviewRow[]; warnings: string[] }
type Property = { name: string; value: string; params: Record<string, string> }
const text = (value: string) => value.replace(/\\([nN,;\\])/g, (_, character: string) => /[nN]/.test(character) ? '\n' : character)
function property(line: string): Property | null {
  let quoted = false, separator = -1
  for (let index = 0; index < line.length; index++) { if (line[index] === '"') quoted = !quoted; if (line[index] === ':' && !quoted) { separator = index; break } }
  if (separator < 1) return null
  const [name, ...parameters] = line.slice(0, separator).split(';')
  const params: Record<string, string> = Object.create(null)
  for (const parameter of parameters) { const equals = parameter.indexOf('='); if (equals > 0) params[parameter.slice(0, equals).toUpperCase()] = parameter.slice(equals + 1).replace(/^"|"$/g, '') }
  return { name: name.toUpperCase(), params, value: line.slice(separator + 1) }
}
function temporal(value: Property, fallbackZone: string, embeddedZones: Set<string>) {
  if (value.params.TZID && embeddedZones.has(value.params.TZID)) throw new Error('Eingebettete VTIMEZONE-Regeln werden nicht ausgeführt; Original bleibt im Roharchiv.')
  const date = /^(\d{4})(\d{2})(\d{2})$/.exec(value.value)
  if (value.params.VALUE === 'DATE' || date) {
    if (!date) throw new Error('Ungültiges ganztägiges Datum.')
    const day = `${date[1]}-${date[2]}-${date[3]}`
    const horizon = planningDayHorizon(day, fallbackZone)
    return { instant: horizon.start, timeZone: fallbackZone, allDay: true, day }
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value.value)
  if (!match || value.params.VALUE && value.params.VALUE !== 'DATE-TIME') throw new Error('Datum/Zeitformat wird nicht ausgeführt; Rohdaten bleiben erhalten.')
  const [, year, month, day, hour, minute, second, utc] = match
  if (Number(second) > 59) throw new Error('Schaltsekunden werden nicht ausgeführt.')
  const local = `${year}-${month}-${day}T${hour}:${minute}`, zone = utc ? 'UTC' : value.params.TZID || fallbackZone
  if (!validTimeZone(zone)) throw new Error('TZID ist keine unterstützte IANA-Zeitzone; VTIMEZONE wird nicht ausgeführt.')
  if (utc) {
    const instant = `${local}:${second}.000Z`
    if (!Number.isFinite(instantEpoch(instant))) throw new Error('Ungültiger UTC-Zeitpunkt.')
    return { instant, timeZone: zone, allDay: false }
  }
  const resolved = resolvePlanningLocal(local, zone)
  if (resolved.ok === false) throw new Error(resolved.message)
  return { instant: new Date(Date.parse(resolved.instant) + Number(second) * 1000).toISOString(), timeZone: zone, allDay: false }
}
/** Bounded import of fixed VEVENT intervals. Unsupported semantics remain in the acknowledged archive. */
export function previewPlanningIcs(raw: string, timeZone: string): IcsPreview {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 262144) throw new Error('ICS muss Text enthalten und darf höchstens 256 KiB Zeichen umfassen.')
  if (!validTimeZone(timeZone)) throw new Error('Wähle eine IANA-Zeitzone für schwebende und ganztägige Termine.')
  const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n')
  if (!lines.some(line => line.toUpperCase() === 'BEGIN:VCALENDAR') || !lines.some(line => line.toUpperCase() === 'END:VCALENDAR')) throw new Error('Vollständiges VCALENDAR wird benötigt; Originaltext bleibt in der Eingabe.')
  const embeddedZones = new Set<string>(); let inZone = false
  for (const line of lines) { if (line.toUpperCase() === 'BEGIN:VTIMEZONE') inZone = true; else if (line.toUpperCase() === 'END:VTIMEZONE') inZone = false; else if (inZone) { const item = property(line); if (item?.name === 'TZID') embeddedZones.add(item.value) } }
  const components: string[][] = [], warnings: string[] = [], stack: string[] = []; let current: string[] | null = null, closed = false
  for (const line of lines) {
    const boundary = /^(BEGIN|END):([A-Z0-9-]+)$/i.exec(line)
    if (boundary?.[1].toUpperCase() === 'BEGIN' && boundary[2].toUpperCase() === 'VCALENDAR') {
      if (stack.length || closed) throw new Error('Genau ein vollständiges VCALENDAR wird benötigt.')
      stack.push('VCALENDAR'); continue
    }
    if (!stack.length) { if (line.trim()) throw new Error('Inhalt außerhalb VCALENDAR wird nicht als Termin importiert.'); continue }
    if (boundary) {
      const kind = boundary[1].toUpperCase(), name = boundary[2].toUpperCase()
      if (kind === 'BEGIN') {
        if (name === 'VEVENT' && current) throw new Error('Verschachtelte VEVENT-Komponenten sind ungültig.')
        if (name === 'VEVENT' && stack.length === 1) current = [line]
        else {
          if (current) current.push(line)
          else if (stack.length === 1 || name === 'VEVENT') warnings.push(`Komponente ${name}${name === 'VEVENT' ? ` innerhalb ${stack[stack.length - 1]}` : ''} wird nur im Roharchiv erhalten.`)
        }
        stack.push(name)
      } else {
        if (stack[stack.length - 1] !== name) throw new Error('Unvollständiger oder falsch verschachtelter ICS-Baustein wird nicht als Teilimport bestätigt.')
        if (current) {
          current.push(line)
          if (name === 'VEVENT' && stack.length === 2) { components.push(current); current = null }
        }
        stack.pop()
        if (name === 'VCALENDAR') closed = true
      }
    } else if (current) current.push(line)
    if (components.length > 200) throw new Error('Höchstens 200 Termine pro Import; Datei unverändert behalten.')
  }
  if (stack.length) throw new Error('Unvollständiger ICS-Baustein wird nicht als Teilimport bestätigt.')
  const rows = components.map((component, index): IcsPreviewRow => {
    let depth = 0
    const properties = component.slice(1, -1).flatMap(line => { if (/^BEGIN:/i.test(line)) { depth++; return [] }; if (/^END:/i.test(line)) { depth--; return [] }; const parsed = depth === 0 ? property(line) : null; return parsed ? [parsed] : [] })
    const get = (name: string) => properties.filter(item => item.name === name)
    const row: IcsPreviewRow = { index, title: text(get('SUMMARY')[0]?.value || 'Importierter Termin'), uid: get('UID')[0]?.value, raw: component.join('\r\n'), warnings: [], recurring: ['RRULE', 'RDATE', 'EXDATE', 'RECURRENCE-ID'].some(name => get(name).length > 0) }
    if (row.recurring) row.warnings.push('Serie / Ausnahmen werden nicht ausgeführt. Nur den angegebenen Basistermin ausdrücklich übernehmen oder ausschließlich Rohdaten behalten.')
    if (component.some(line => /^BEGIN:(?!VEVENT)/i.test(line))) row.warnings.push('Unterkomponenten (z. B. Alarme) werden nur im Roharchiv erhalten.')
    try {
      if (get('DTSTART').length !== 1 || get('DTEND').length > 1 || get('DURATION').length || get('RECURRENCE-ID').length) throw new Error('Start/Ende fehlt, ist mehrdeutig, oder DURATION/RECURRENCE-ID wird nicht ausgeführt.')
      if (get('STATUS').some(item => item.value.toUpperCase() === 'CANCELLED')) throw new Error('Abgesagter Termin wird nur im Roharchiv erhalten.')
      const start = temporal(get('DTSTART')[0], timeZone, embeddedZones)
      const end = get('DTEND')[0] ? temporal(get('DTEND')[0], timeZone, embeddedZones) : start.allDay ? { ...start, instant: planningDayHorizon(nextCivilDay(start.day!), timeZone).start } : null
      if (!end || start.allDay !== end.allDay || !intervalValid({ start: start.instant, end: end.instant })) throw new Error('Gültiges exklusives Ende gleicher Zeitart erforderlich.')
      if (!get('DTSTART')[0].params.TZID && !get('DTSTART')[0].value.endsWith('Z')) row.warnings.push(`Schwebender / ganztägiger Termin wird ausdrücklich in ${timeZone} interpretiert.`)
      row.event = { title: row.title, start: start.instant, end: end.instant, timeZone: start.timeZone, allDay: start.allDay, source: { kind: 'ics', ...(row.uid ? { uid: row.uid } : {}), ...(get('RRULE')[0] ? { rule: get('RRULE')[0].value } : {}), raw: row.raw, recurrenceStatus: row.recurring ? 'unsupported-base-only' : 'none', warnings: [...row.warnings] } }
    } catch (error) { row.warnings.push(String(error instanceof Error ? error.message : error)) }
    return row
  })
  return { format: 'nexus-ics-preview', version: 1, raw, timeZone, rows, warnings }
}
