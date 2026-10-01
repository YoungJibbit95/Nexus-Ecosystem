import React from 'react'
import { createRoot } from 'react-dom/client'
import { WorkspaceMutationGuard } from '../../packages/nexus-core/src/storage/WorkspaceMutationGuard'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { emptyPlanningDocument, taskRevision } from '../../packages/nexus-core/src/planning/domain'
import { runtimePlanning, runtimeReminderOccurrences } from '../../packages/nexus-core/src/workspace/runtimeExchange'
import type { RuntimeExchange } from '../../packages/nexus-core/src/workspace/runtimeExchange'

const checks: string[] = []
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); checks.push(message) }
const selected = { notes: true, codes: true, tasks: true, reminders: true, canvases: true, workspaces: true, planning: true }
const empty = () => ({ notes: [], codes: [], tasks: [], reminders: [], folders: [], canvases: [], workspaces: [], openNoteIds: [], activeNoteId: null, openCodeIds: [], activeCodeId: null, activeCanvasId: null, activeWorkspaceId: null })
createRoot(document.getElementById('root')!).render(<WorkspaceMutationGuard />)
;(window as any).exchangeReady = true

function failWrites(key: string, tag: string, repeat = false) {
  const put = IDBObjectStore.prototype.put, set = Storage.prototype.setItem
  let primary = 0, fallback = 0
  IDBObjectStore.prototype.put = function(value, entryKey) {
    const request = put.call(this, value, entryKey)
    if (String(entryKey) === key + '::__snapshot-v1' && String(value).includes(tag) && (repeat || fallback === 0)) { primary++; this.transaction.abort() }
    return request
  }
  Storage.prototype.setItem = function(entryKey, value) {
    if (entryKey === key + '::__snapshot-v1' && value.includes(tag) && (repeat || fallback === 0)) { fallback++; throw new DOMException('Synthetic quota failure', 'QuotaExceededError') }
    return set.call(this, entryKey, value)
  }
  return { restore: () => { IDBObjectStore.prototype.put = put; Storage.prototype.setItem = set }, count: () => ({ primary, fallback }) }
}
;(window as any).runExchange = async (phase: string, input?: RuntimeExchange) => {
  checks.length = 0
  if (phase === 'mobile') {
    const { applyWorkspaceHandoff, captureMobileExchange, hydrateMobileSources } = await import('../../Nexus Mobile/src/app/workspaceHandoff')
    const { mobileReminderController } = await import('../../Nexus Mobile/src/lib/mobileReminderService')
    await hydrateMobileSources()
    const destination = await mobileReminderController.captureLocalLedger()
    assert(destination.occurrences.some(item => item.reminderId === 'rem-welcome-1') && !destination.occurrences.some(item => item.reminderId === 'series'), 'Mobile starts with its own seeded Reminder ledger and no Main occurrence')
    await applyWorkspaceHandoff(input as any, 'replace', selected)
    const exchange = await captureMobileExchange()
    const ledger = await mobileReminderController.captureLocalLedger()
    assert(runtimePlanning(exchange)!.blocks[0].taskId === 'task', 'Main work block reaches Mobile with its canonical Task identity')
    assert(runtimePlanning(exchange)!.events[0].source.raw === 'retained original', 'Mobile preserves fixed-event source metadata')
    assert(runtimeReminderOccurrences(exchange)!.occurrences[0].anchor === '2026-01-31T09:00:00Z', 'Mobile retains the original month-end series anchor')
    const transferred = ledger.occurrences.find(item => item.reminderId === 'series')!
    assert(transferred.nativeId !== 50, 'Mobile allocates its own native notification ID')
    assert(transferred.suppressCurrentDelivery, 'Transferred requested occurrence remains suppressed and uncertain')
    return { checks: [...checks], exchange }
  }
  const { useApp } = await import('../../Nexus Main/src/store/appStore')
  const { planningStore } = await import('../../Nexus Main/src/store/planningStore')
  const { reminderController } = await import('../../Nexus Main/src/lib/reminderService')
  const { captureWorkspaceExchange, importWorkspaceExchange, importWorkspaceState } = await import('../../Nexus Main/src/app/workspaceImport')
  const { recoverWorkspaceRestore, hydrateWorkspaceSources } = await import('../../Nexus Main/src/app/workspaceRestore')
  if (phase === 'recover') {
    assert(await recoverWorkspaceRestore(), 'Fresh Main page detects and recovers a failed planning/delivery rollback')
    const captured = await captureWorkspaceExchange()
    assert(useApp.getState().reminders[0].datetime === '2026-02-28T09:00:00Z', 'Startup recovery restores Reminder source with its ledger')
    assert(runtimeReminderOccurrences(captured)!.occurrences[0].anchor === '2026-01-31T09:00:00Z', 'Startup recovery preserves the series anchor')
    assert(runtimePlanning(captured)!.events[0].title === 'Fixed', 'Startup recovery preserves the planning preimage')
    return { checks: [...checks], exchange: captured }
  }
  await hydrateWorkspaceSources()
  if (phase === 'source') {
    const state: any = empty()
    state.tasks = [{ id: 'task', title: 'Task', desc: '', tags: [], subtasks: [], status: 'todo', priority: 'high', created: '2026-09-30T09:00:00Z', updated: '2026-09-30T09:00:00Z', deadline: '2026-10-01T18:00:00.123+02:00', linkedNoteId: 'orphan-retained', future: { retained: true } }]
    state.reminders = [{ id: 'series', title: 'Month end', msg: '', datetime: '2026-02-28T09:00:00Z', repeat: 'monthly', done: false }]
    await importWorkspaceState(state)
    const ledger = await reminderController.captureLocalLedger()
    Object.assign(ledger.occurrences.find(item => item.reminderId === 'series')!, { anchor: '2026-01-31T09:00:00Z', index: 1, nativeId: 50, dispatch: 'foreground-requested' })
    ledger.nextNativeId = 51
    await reminderController.replaceLocalLedger(ledger)
    const document = emptyPlanningDocument('synthetic-planning')
    planningStore.restorePlanning(document); assert(await persistenceRegistry.flush(), 'Synthetic planning source durably starts empty')
    const expected = () => ({ generation: planningStore.getSnapshot().generation, revision: planningStore.getSnapshot().revision })
    const availability: any = { horizon: { start: '2026-10-01T08:00:00Z', end: '2026-10-01T16:00:00Z' }, windows: [{ start: '2026-10-01T08:00:00Z', end: '2026-10-01T16:00:00Z' }], timeZone: 'Europe/Berlin', coverage: 'complete', sourceIds: ['explicit'], updatedAt: '2026-09-30T09:00:00Z' }
    assert((await planningStore.commandOwner.execute({ kind: 'set-availability', key: 'coverage', expected: expected(), availability })).ok, 'Real application command acknowledges explicit availability')
    assert((await planningStore.commandOwner.execute({ kind: 'capture-event', key: 'event', expected: expected(), fields: { title: 'Fixed', start: '2026-10-01T09:00:00Z', end: '2026-10-01T10:00:00Z', timeZone: 'Europe/Berlin', allDay: false, source: { kind: 'manual', raw: 'retained original' } } })).ok, 'Real application command acknowledges fixed Event')
    assert((await planningStore.commandOwner.execute({ kind: 'schedule-task', key: 'schedule', expected: { ...expected(), taskRevision: taskRevision(useApp.getState().tasks[0] as any) }, taskId: 'task', start: '2026-10-01T10:00:00Z', durationMinutes: 30, timeZone: 'Europe/Berlin' })).ok, 'Real application command acknowledges a work block separately from deadline')
    const exchange = await captureWorkspaceExchange()
    assert(exchange.version === 2, 'Default complete Main export explicitly declares version 2')
    assert(!JSON.stringify(exchange).includes('nativeId') && !JSON.stringify(exchange).includes('requestFingerprint'), 'Portable export excludes local OS IDs and request fingerprints')
    return { checks: [...checks], exchange }
  }
  if (phase === 'return') {
    const originalDeadline = useApp.getState().tasks[0].deadline
    await importWorkspaceExchange(input as any)
    const exchange = await captureWorkspaceExchange(), ledger = await reminderController.captureLocalLedger()
    assert(useApp.getState().tasks[0].deadline === originalDeadline, 'Main Mobile Main roundtrip preserves exact timed Task deadline')
    assert(useApp.getState().tasks[0].future.retained, 'Cross-client exchange preserves compatible Task metadata and broken relation')
    const returned = ledger.occurrences.find(item => item.reminderId === 'series')!
    assert(returned.nativeId === 50, 'Return import retains the destination Main local native identity')
    assert(returned.anchor === '2026-01-31T09:00:00Z' && returned.index === 1, 'Roundtrip preserves anchor and occurrence index')
    const savedPlanning = structuredClone(runtimePlanning(exchange)!)
    await importWorkspaceState(empty() as any)
    assert(planningStore.getSnapshot().blocks[0].taskId === 'task', 'Legacy replacement retains planning links for visible repair')
    await importWorkspaceExchange(exchange)
    assert(planningStore.getSnapshot().generation !== savedPlanning.generation, 'Import gives proposals a fresh generation')
    return { checks: [...checks], exchange: await captureWorkspaceExchange() }
  }
  const before = await captureWorkspaceExchange()
  const changed: any = structuredClone(before)
  changed.state.planning.events[0].title = 'planning-failed'
  changed.state.reminders[0].datetime = '2026-05-31T09:00:00Z'
  Object.assign(changed.state.reminderOccurrences.occurrences[0], { datetime: '2026-05-31T09:00:00Z', index: 4 })
  const failure = failWrites(phase === 'planning-fault' ? 'nexus-main-planning-v1' : 'nexus-reminder-delivery-v1', phase === 'planning-fault' ? 'planning-failed' : phase === 'delivery-double-fault' ? 'nexus-reminder-delivery' : '2026-05-31', true)
  let rejected = ''
  try { await importWorkspaceExchange(changed) } catch (error) { rejected = String(error) }
  finally { failure.restore() }
  const writes = failure.count()
  assert(phase === 'delivery-double-fault' ? writes.fallback >= 2 : writes.primary > 0 && writes.fallback > 0,
    `Actual ${phase === 'delivery-double-fault' ? 'persisted fallback failed during both apply and rollback' : 'IndexedDB abort and fallback quota failure were exercised'}: ${JSON.stringify(writes)}`)
  assert(rejected.includes(phase === 'delivery-double-fault' ? 'needs recovery' : 'previous state was recovered'), `Failed new slice rejects without acknowledging a partial generation: ${rejected}`)
  if (phase === 'delivery-double-fault') {
    assert(workspaceOperation.getSnapshot().kind === 'recovery', 'Double failure retains the workspace freeze and recovery journal')
  } else {
    const after = await captureWorkspaceExchange()
    assert(JSON.stringify(after.state) === JSON.stringify(before.state), 'Rollback restores exact runtime planning and portable occurrence preimage')
  }
  return { checks: [...checks] }
}
