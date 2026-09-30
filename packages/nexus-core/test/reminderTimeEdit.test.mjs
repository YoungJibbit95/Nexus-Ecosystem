import test from 'node:test'
import assert from 'node:assert/strict'
import { createReminderTimeEdit, reminderInstantToLocalInput, resolveReminderTimeEdit } from '../src/time/reminderTimeEdit.ts'

const resolve = (local, timeZone, occurrence = '') => resolveReminderTimeEdit(createReminderTimeEdit('2026-09-30T09:00:37.123Z', timeZone), local, occurrence)
const fixtures = [
  { zone: 'Europe/Berlin', local: '2026-09-30T11:00', gap: '2026-03-29T02:30', fold: '2026-10-25T02:30', early: '2026-10-25T00:30:00.000Z', late: '2026-10-25T01:30:00.000Z', earlyOffset: 'UTC+02:00', lateOffset: 'UTC+01:00' },
  { zone: 'America/New_York', local: '2026-09-30T05:00', gap: '2026-03-08T02:30', fold: '2026-11-01T01:30', early: '2026-11-01T05:30:00.000Z', late: '2026-11-01T06:30:00.000Z', earlyOffset: 'UTC-04:00', lateOffset: 'UTC-05:00' },
]
for (const fixture of fixtures) {
  test(`${fixture.zone}: unchanged minute preserves exact instant and precision`, () => {
    const edit = createReminderTimeEdit('2026-09-30T09:00:37.123Z', fixture.zone)
    assert.equal(edit.initialLocal, fixture.local)
    assert.equal(resolveReminderTimeEdit(edit, edit.initialLocal).instant, edit.sourceInstant)
    assert.equal(resolveReminderTimeEdit(edit, edit.initialLocal).ok, true)
  })
  test(`${fixture.zone}: rejects a DST gap instead of normalizing it`, () => {
    const result = resolve(fixture.gap, fixture.zone)
    assert.equal(result.ok, false)
    assert.equal(result.code, 'NONEXISTENT_LOCAL_TIME')
    assert.deepEqual(result.choices, [])
  })
  test(`${fixture.zone}: a changed fold exposes both offsets and requires an explicit choice`, () => {
    const result = resolve(fixture.fold, fixture.zone)
    assert.equal(result.ok, false)
    assert.equal(result.code, 'AMBIGUOUS_LOCAL_TIME')
    assert.deepEqual(result.choices, [{ instant: fixture.early, offsetLabel: fixture.earlyOffset }, { instant: fixture.late, offsetLabel: fixture.lateOffset }])
    assert.equal(resolve(fixture.fold, fixture.zone, fixture.early).instant, fixture.early)
    assert.equal(resolve(fixture.fold, fixture.zone, fixture.late).instant, fixture.late)
    assert.equal(resolve(fixture.fold, fixture.zone, 'unrelated-choice').ok, false)
  })
  test(`${fixture.zone}: existing earlier and later folds retain original precision`, () => {
    for (const instant of [fixture.early, fixture.late]) {
      const original = instant.replace(':00.000Z', ':42.987Z')
      const edit = createReminderTimeEdit(original, fixture.zone)
      assert.equal(edit.initialLocal, fixture.fold)
      assert.equal(resolveReminderTimeEdit(edit, fixture.fold).instant, original)
      assert.equal(resolveReminderTimeEdit(edit, fixture.fold, instant).instant, original)
      const opposite = instant === fixture.early ? fixture.late : fixture.early
      assert.equal(resolveReminderTimeEdit(edit, fixture.fold, opposite).instant, opposite)
    }
  })
}
test('the same selected wall time resolves in the selected zone, independently of host zone', () => {
  assert.equal(resolve('2026-09-30T12:00', 'Europe/Berlin').instant, '2026-09-30T10:00:00.000Z')
  assert.equal(resolve('2026-09-30T12:00', 'America/New_York').instant, '2026-09-30T16:00:00.000Z')
})
test('the new-reminder +15-minute default preserves its intended instant, including seconds', () => {
  const now = new Date('2026-09-30T09:00:45.123Z')
  for (const { zone } of fixtures) {
    const edit = createReminderTimeEdit(undefined, zone, now)
    assert.equal(edit.sourceInstant, '2026-09-30T09:15:45.123Z')
    assert.equal(resolveReminderTimeEdit(edit, edit.initialLocal).instant, edit.sourceInstant)
  }
})
test('an instant-based quick preset in the later fold retains the selected instant', () => {
  const edit = createReminderTimeEdit('2026-10-25T01:45:12.345Z', 'Europe/Berlin')
  assert.equal(edit.initialLocal, '2026-10-25T02:45')
  assert.equal(resolveReminderTimeEdit(edit, edit.initialLocal).instant, '2026-10-25T01:45:12.345Z')
})
test('non-hour offsets and thirty-minute DST transitions resolve without one-hour assumptions', () => {
  assert.equal(resolve('2026-09-30T14:46', 'Asia/Kathmandu').instant, '2026-09-30T09:01:00.000Z')
  assert.equal(resolve('2026-10-04T02:15', 'Australia/Lord_Howe').code, 'NONEXISTENT_LOCAL_TIME')
  const fold = resolve('2026-04-05T01:45', 'Australia/Lord_Howe')
  assert.deepEqual(fold.choices.map(choice => choice.instant), ['2026-04-04T14:45:00.000Z', '2026-04-04T15:15:00.000Z'])
})
test('a skipped civil day is rejected', () => {
  assert.equal(resolve('2011-12-30T12:00', 'Pacific/Apia').code, 'NONEXISTENT_LOCAL_TIME')
})
test('invalid/empty local input and unsupported zones return validation errors without throwing', () => {
  for (const local of ['', 'garbage', '2026-02-30T12:00', '2025-02-29T12:00', '0000-01-01T00:00', '2026-01-01T24:00', '2026-01-01T12:60', '2026-01-01T12:00Z']) {
    assert.equal(resolve(local, 'Europe/Berlin').code, 'INVALID_DATE_TIME', local)
  }
  assert.equal(resolve('2026-01-01T12:00', 'Unsupported/Zone').code, 'INVALID_TIME_ZONE')
  assert.equal(resolve('2026-01-01T12:00', '+01:00').code, 'INVALID_TIME_ZONE')
  assert.equal(resolve('2024-02-29T12:00', 'Europe/Berlin').ok, true)
})
test('stored explicit-offset precision survives unchanged, while zone-less values are not inferred as instants', () => {
  const original = '2026-09-30T11:00:37.123456+02:00'
  const edit = createReminderTimeEdit(original, 'Europe/Berlin')
  assert.equal(edit.initialLocal, '2026-09-30T11:00')
  assert.equal(resolveReminderTimeEdit(edit, edit.initialLocal).instant, original)
  assert.equal(reminderInstantToLocalInput('2026-09-30T11:00', 'Europe/Berlin'), '')
})
