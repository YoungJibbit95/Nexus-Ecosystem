import test from 'node:test'
import assert from 'node:assert/strict'
import { emptyReminderLedger, exportReminderPortable, reconcileReminderSources } from '../src/reminders/reminderDomain.ts'
import { prepareReminderHandoff } from '../src/workspace/reminderHandoff.ts'
const source = id => ({ id, title: id, msg: '', datetime: '2026-02-28T09:00:00Z', repeat: 'monthly', done: false })
test('selected merge preserves unselected local native claims and transfers only the imported series anchor', () => {
  const sources = [source('local'), source('imported')]
  const ledger = reconcileReminderSources(emptyReminderLedger(), sources)
  ledger.occurrences[0].dispatch = 'native-scheduled'; ledger.occurrences[0].requestFingerprint = 'local-confirmed'
  const foreign = reconcileReminderSources(emptyReminderLedger(), [source('imported')])
  Object.assign(foreign.occurrences[0], { anchor: '2026-01-31T09:00:00Z', index: 1, dispatch: 'native-observed' })
  const portable = exportReminderPortable(foreign, [source('imported')])
  const after = prepareReminderHandoff(ledger, sources, sources, portable, new Set(['imported']))
  assert.deepEqual(after.occurrences[0], ledger.occurrences[0])
  assert.equal(after.occurrences[1].anchor, '2026-01-31T09:00:00Z')
  assert.equal(after.occurrences[1].index, 1); assert.equal(after.occurrences[1].suppressCurrentDelivery, true)
  assert.equal(after.occurrences[1].nativeId, ledger.occurrences[1].nativeId)
})
test('legacy replacement preserves unchanged local recurrence but treats a changed source as an explicit new series', () => {
  const original = source('legacy'), ledger = reconcileReminderSources(emptyReminderLedger(), [original])
  Object.assign(ledger.occurrences[0], { anchor: '2026-01-31T09:00:00Z', index: 1 })
  assert.equal(prepareReminderHandoff(ledger, [original], [original]).occurrences[0].anchor, '2026-01-31T09:00:00Z')
  assert.equal(prepareReminderHandoff(ledger, [original], [{ ...original, datetime: '2026-03-15T09:00:00Z' }]).occurrences[0].anchor, '2026-03-15T09:00:00Z')
})
