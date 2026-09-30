import assert from 'node:assert/strict'
import test from 'node:test'
import { taskDeadlineDate, taskDeadlineForSave } from './taskDeadline.ts'

test('unrelated edits keep exact temporal kind, precision and offset', () => {
  for (const deadline of [undefined, '2026-10-15', '2026-10-15T13:14:15.123456+02:00', '2026-10-15T11:14:15.123Z', 'legacy opaque value']) {
    assert.equal(taskDeadlineForSave(deadline, taskDeadlineDate(deadline)), deadline)
  }
})

test('explicit date change preserves timed suffix without device-zone conversion', () => {
  assert.equal(taskDeadlineForSave('2026-10-15T13:14:15.123456+02:00', '2026-10-18'), '2026-10-18T13:14:15.123456+02:00')
  assert.equal(taskDeadlineForSave('2026-10-15T11:14:15.123Z', '2026-10-18'), '2026-10-18T11:14:15.123Z')
  assert.equal(taskDeadlineForSave('2026-10-15', '2026-10-18'), '2026-10-18')
})

test('new deadlines remain date-only and explicit clearing removes them', () => {
  assert.equal(taskDeadlineForSave(undefined, '2026-10-18'), '2026-10-18')
  assert.equal(taskDeadlineForSave('2026-10-15', ''), undefined)
  assert.equal(taskDeadlineForSave('2026-10-15T11:14:15.123Z', ''), undefined)
})
