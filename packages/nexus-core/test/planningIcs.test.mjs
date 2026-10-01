import test from 'node:test'
import assert from 'node:assert/strict'
import { previewPlanningIcs } from '../src/planning/icsPlanning.ts'

const calendar = component => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${component}\r\nEND:VCALENDAR`
const event = lines => `BEGIN:VEVENT\r\nUID:uid-1\r\nSUMMARY:Context\\, retained\r\n${lines}\r\nEND:VEVENT`
test('fixed ICS start/end retains seconds, UID and raw provenance without deadline projection', () => {
  const raw = calendar(event('DTSTART:20261001T090012Z\r\nDTEND:20261001T100013Z'))
  const preview = previewPlanningIcs(raw, 'Europe/Berlin'), row = preview.rows[0]
  assert.equal(row.event.start, '2026-10-01T09:00:12.000Z'); assert.equal(row.event.end, '2026-10-01T10:00:13.000Z')
  assert.equal(row.event.timeZone, 'UTC'); assert.equal(row.title, 'Context, retained'); assert.equal(row.event.source.uid, 'uid-1'); assert.equal(preview.raw, raw)
  assert.equal(row.recurring, false); assert.equal(row.event.deadline, undefined)
})
test('unsupported interval/count series and exceptions are visible and never expanded', () => {
  const row = previewPlanningIcs(calendar(event('DTSTART;TZID=Europe/Berlin:20261001T090000\r\nDTEND;TZID=Europe/Berlin:20261001T100000\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3\r\nEXDATE:20261015T070000Z')), 'UTC').rows[0]
  assert.equal(row.event.start, '2026-10-01T07:00:00.000Z'); assert.equal(row.recurring, true)
  assert.match(row.warnings.join(' '), /nicht ausgeführt/); assert.equal(row.event.source.rule, 'FREQ=WEEKLY;INTERVAL=2;COUNT=3')
  assert.match(row.raw, /EXDATE:/); assert.equal(row.event.source.recurrenceStatus, 'unsupported-base-only')
})
test('floating and all-day dates require selected zone; 23/25h days retain exclusive boundary', () => {
  const spring = previewPlanningIcs(calendar(event('DTSTART;VALUE=DATE:20260329\r\nDTEND;VALUE=DATE:20260330')), 'Europe/Berlin').rows[0]
  assert.equal((Date.parse(spring.event.end) - Date.parse(spring.event.start)) / 3600000, 23)
  const fall = previewPlanningIcs(calendar(event('DTSTART;VALUE=DATE:20261025')), 'Europe/Berlin').rows[0]
  assert.equal((Date.parse(fall.event.end) - Date.parse(fall.event.start)) / 3600000, 25)
  const floating = previewPlanningIcs(calendar(event('DTSTART:20261001T090000\r\nDTEND:20261001T100000')), 'America/New_York').rows[0]
  assert.equal(floating.event.start, '2026-10-01T13:00:00.000Z'); assert.match(floating.warnings[0], /America\/New_York/)
})
test('gaps, folds, custom zones, duration and recurrence overrides retain raw without invented interval', () => {
  for (const fields of ['DTSTART;TZID=Europe/Berlin:20260329T023000\r\nDTEND;TZID=Europe/Berlin:20260329T033000', 'DTSTART;TZID=Europe/Berlin:20261025T023000\r\nDTEND;TZID=Europe/Berlin:20261025T033000', 'DTSTART;TZID=Custom/Zone:20261001T090000\r\nDTEND;TZID=Custom/Zone:20261001T100000', 'DTSTART:20261001T090000Z\r\nDURATION:PT1H', 'DTSTART:20261001T090000Z\r\nDTEND:20261001T100000Z\r\nRECURRENCE-ID:20261001T090000Z', 'DTSTART;VALUE=DATE:20260230']) {
    const row = previewPlanningIcs(calendar(event(fields)), 'UTC').rows[0]
    assert.equal(row.event, undefined); assert.ok(row.warnings.length); assert.match(row.raw, /DTSTART/)
  }
})
test('malformed/truncated and oversized inputs fail before partial import', () => {
  assert.throws(() => previewPlanningIcs('BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VCALENDAR', 'UTC'), /Unvollständiger/)
  assert.throws(() => previewPlanningIcs(calendar(event('DTSTART:20261001T090000Z')) + '\n' + event('DTSTART:20261002T090000Z'), 'UTC'), /außerhalb/)
  assert.throws(() => previewPlanningIcs('x'.repeat(262145), 'UTC'), /höchstens/)
  assert.throws(() => previewPlanningIcs(calendar(event('DTSTART:20261001T090000Z')), 'Invalid/Zone'), /IANA/)
})

test('embedded VTIMEZONE is retained instead of silently replacing its rules with host IANA data', () => {
  const raw = calendar('BEGIN:VTIMEZONE\r\nTZID:Europe/Berlin\r\nBEGIN:STANDARD\r\nTZOFFSETTO:+1100\r\nEND:STANDARD\r\nEND:VTIMEZONE\r\n' + event('DTSTART;TZID=Europe/Berlin:20261001T090000\r\nDTEND;TZID=Europe/Berlin:20261001T100000'))
  const preview = previewPlanningIcs(raw, 'UTC'); assert.equal(preview.raw, raw); assert.equal(preview.rows[0].event, undefined); assert.match(preview.rows[0].warnings.join(' '), /VTIMEZONE/)
})

test('only direct VCALENDAR VEVENT children execute; unsupported parent trees remain raw', () => {
  const fixed = event('DTSTART:20261001T090000Z\r\nDTEND:20261001T100000Z')
  for (const parent of ['VTODO', 'VTIMEZONE', 'X-UNSUPPORTED']) {
    const nested = `BEGIN:${parent}\r\n${fixed}\r\nEND:${parent}`
    const raw = calendar(nested), preview = previewPlanningIcs(raw, 'UTC')
    assert.equal(preview.raw, raw); assert.equal(preview.rows.length, 0)
    assert.match(preview.warnings.join(' '), new RegExp(`VEVENT innerhalb ${parent}`))
    const withDirect = previewPlanningIcs(calendar(`${nested}\r\n${fixed}`), 'UTC')
    assert.equal(withDirect.rows.length, 1); assert.equal(withDirect.rows[0].event.start, '2026-10-01T09:00:00.000Z')
  }
  assert.throws(() => previewPlanningIcs(calendar(`BEGIN:VTODO\r\n${fixed}\r\nEND:VTIMEZONE`), 'UTC'), /verschachtelter/)
  assert.throws(() => previewPlanningIcs(calendar(event(`BEGIN:VALARM\r\n${fixed}\r\nEND:VALARM`)), 'UTC'), /Verschachtelte VEVENT/)
})

test('mixed endpoint TZIDs resolve their real instants and retain both original properties', () => {
  const component = event('DTSTART;TZID=Europe/Berlin:20261001T090012\r\nDTEND;TZID=America/New_York:20261001T050013')
  const raw = calendar(component), preview = previewPlanningIcs(raw, 'UTC'), row = preview.rows[0]
  assert.equal(row.event.start, '2026-10-01T07:00:12.000Z'); assert.equal(row.event.end, '2026-10-01T09:00:13.000Z')
  assert.equal(row.event.timeZone, 'Europe/Berlin'); assert.equal(row.raw, component)
  assert.equal(row.event.source.raw, component); assert.equal(preview.raw, raw)
  assert.match(row.event.source.raw, /DTEND;TZID=America\/New_York:/)
})
