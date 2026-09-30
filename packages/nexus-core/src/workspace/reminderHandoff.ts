import { exportReminderPortable, importReminderPortable, reconcileReminderSources, type ReminderDeliveryLedger, type ReminderPortableState, type ReminderSource } from '../reminders/reminderDomain'

/** Only selected imported reminders receive foreign delivery uncertainty. */
export function prepareReminderHandoff(local: ReminderDeliveryLedger, beforeSources: ReminderSource[], afterSources: ReminderSource[], incoming?: ReminderPortableState, importedIds?: ReadonlySet<string>): ReminderDeliveryLedger {
  const reconciled = reconcileReminderSources(local, afterSources)
  if (!incoming) return reconciled
  if (!importedIds) return importReminderPortable(reconciled, incoming, afterSources)
  const retained = exportReminderPortable(local, beforeSources)
  const current = new Map(retained.occurrences.map(item => [item.reminderId, item]))
  const foreign = new Map(incoming.occurrences.map(item => [item.reminderId, item]))
  const composed: ReminderPortableState = { ...incoming, occurrences: afterSources.map(source => {
    const item = importedIds.has(source.id) ? foreign.get(source.id) : current.get(source.id)
    if (!item) throw new Error('Selected reminder transfer has incomplete occurrence coverage')
    return item
  }) }
  const transferred = importReminderPortable(reconciled, composed, afterSources)
  // Local, unselected occurrences keep their exact local dispatch evidence.
  transferred.occurrences = transferred.occurrences.map(item => importedIds.has(item.reminderId) ? item : reconciled.occurrences.find(previous => previous.reminderId === item.reminderId)!)
  return transferred
}
