/** Legacy repeat values carry instants but no civil-time zone. V1 therefore uses
 * explicit UTC cadence. A civil recurrence must use a future, separately
 * versioned rule; it is never inferred from the current device's zone. */
export type ReminderSource = {
  id: string; title: string; msg: string; datetime: string
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'; done: boolean; snoozeUntil?: string
}
export type DispatchState = 'idle' | 'claimed' | 'foreground-requested' | 'native-scheduled' | 'native-observed' | 'uncertain'
export type ReminderOccurrence = {
  reminderId: string; anchor: string; repeat: ReminderSource['repeat']; index: number
  datetime: string; snoozeUntil?: string; done: boolean; nativeId: number
  dispatch: DispatchState; requestFingerprint?: string; skipped: number
  suppressCurrentDelivery?:boolean; transferredOutcome?:DispatchState
}
export type ReminderDeliveryLedger = {
  format: 'nexus-reminder-delivery'; version: 1; cadence: 'UTC'
  nextNativeId: number; occurrences: ReminderOccurrence[]
}
export type ReminderPortableOccurrence = Omit<ReminderOccurrence,'nativeId'|'dispatch'|'requestFingerprint'|'suppressCurrentDelivery'|'transferredOutcome'> & {outcome:DispatchState}
export type ReminderPortableState = {format:'nexus-reminder-occurrence-transfer';version:1;cadence:'UTC';occurrences:ReminderPortableOccurrence[]}
export type ReminderCommandResult = { ok: true; skipped: number } | { ok: false; code: 'validation' | 'conflict' | 'storage-unavailable' | 'delivery-unavailable' | 'owner-unavailable'; message: string }
export type ReminderCommand = { kind: 'complete' | 'stop'; id: string } | { kind: 'snooze'; id: string; minutes: number }
export const emptyReminderLedger = (): ReminderDeliveryLedger => ({format:'nexus-reminder-delivery',version:1,cadence:'UTC',nextNativeId:1,occurrences:[]})
export const validInstant = (value: unknown): value is string => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
export function validateReminder(source: ReminderSource) {
  if (!source || typeof source.id !== 'string' || !source.id || typeof source.title !== 'string' || typeof source.msg !== 'string' || !validInstant(source.datetime) || !['none','daily','weekly','monthly'].includes(source.repeat) || typeof source.done !== 'boolean' || (source.snoozeUntil !== undefined && !validInstant(source.snoozeUntil))) throw new Error('Reminder contains an unsupported instant or recurrence')
}
export function prepareReminderLedger(value: unknown): ReminderDeliveryLedger {
  const raw = value as ReminderDeliveryLedger
  if (!raw || raw.format !== 'nexus-reminder-delivery' || raw.version !== 1 || raw.cadence !== 'UTC' || !Number.isSafeInteger(raw.nextNativeId) || raw.nextNativeId < 1 || !Array.isArray(raw.occurrences)) throw new Error('Unsupported reminder delivery format; data retained')
  const ids = new Set<string>(), nativeIds = new Set<number>()
  for (const item of raw.occurrences) {
    validateReminder({...item,id:item.reminderId,title:'',msg:''})
    if (ids.has(item.reminderId) || nativeIds.has(item.nativeId) || !validInstant(item.anchor) || !Number.isSafeInteger(item.index) || item.index < 0 || !Number.isSafeInteger(item.nativeId) || item.nativeId < 1 || item.nativeId >= raw.nextNativeId || !Number.isSafeInteger(item.skipped) || item.skipped < 0 || !['idle','claimed','foreground-requested','native-scheduled','native-observed','uncertain'].includes(item.dispatch) || (item.requestFingerprint !== undefined && typeof item.requestFingerprint !== 'string')) throw new Error('Invalid reminder delivery ledger; data retained')
    ids.add(item.reminderId); nativeIds.add(item.nativeId)
    if(item.suppressCurrentDelivery!==undefined&&typeof item.suppressCurrentDelivery!=='boolean')throw new Error('Invalid delivery suppression')
    if(item.transferredOutcome!==undefined&&!['idle','claimed','foreground-requested','native-scheduled','native-observed','uncertain'].includes(item.transferredOutcome))throw new Error('Invalid transferred outcome')
  }
  return structuredClone(raw)
}
export function prepareReminderPortable(value:unknown):ReminderPortableState {
  const raw=value as ReminderPortableState
  if(!raw||raw.format!=='nexus-reminder-occurrence-transfer'||raw.version!==1||raw.cadence!=='UTC'||!Array.isArray(raw.occurrences)||Object.keys(raw).some(key=>!['format','version','cadence','occurrences'].includes(key)))throw new Error('Unsupported reminder occurrence transfer format')
  const ids=new Set<string>()
  for(const item of raw.occurrences) {
    validateReminder({...item,id:item.reminderId,title:'',msg:''})
    if(Object.keys(item).some(key=>!['reminderId','anchor','repeat','index','datetime','snoozeUntil','done','skipped','outcome'].includes(key))||ids.has(item.reminderId)||!validInstant(item.anchor)||!Number.isSafeInteger(item.index)||item.index<0||!Number.isSafeInteger(item.skipped)||item.skipped<0||!['idle','claimed','foreground-requested','native-scheduled','native-observed','uncertain'].includes(item.outcome))throw new Error('Invalid reminder occurrence transfer; native bindings cannot be transferred')
    ids.add(item.reminderId)
  }
  return structuredClone(raw)
}
export function exportReminderPortable(ledger:ReminderDeliveryLedger,sources:ReminderSource[]):ReminderPortableState {
  const portable:ReminderPortableState={format:'nexus-reminder-occurrence-transfer',version:1,cadence:'UTC',occurrences:[]}
  for(const source of sources) {
    const item=ledger.occurrences.find(item=>item.reminderId===source.id)
    if(!item||item.datetime!==source.datetime||item.repeat!==source.repeat||item.done!==source.done||item.snoozeUntil!==source.snoozeUntil)throw new Error('Reminder occurrence must be reconciled before capture')
    portable.occurrences.push({reminderId:item.reminderId,anchor:item.anchor,repeat:item.repeat,index:item.index,datetime:item.datetime,...(item.snoozeUntil?{snoozeUntil:item.snoozeUntil}:{}),done:item.done,skipped:item.skipped,outcome:item.transferredOutcome??item.dispatch})
  }
  return prepareReminderPortable(portable)
}
export function importReminderPortable(local:ReminderDeliveryLedger,value:unknown,sources:ReminderSource[]):ReminderDeliveryLedger {
  const portable=prepareReminderPortable(value), next=reconcileReminderSources(local,sources)
  if(portable.occurrences.length!==sources.length)throw new Error('Occurrence transfer does not cover the reminder source snapshot')
  for(const source of sources) {
    const imported=portable.occurrences.find(item=>item.reminderId===source.id), target=next.occurrences.find(item=>item.reminderId===source.id)!
    if(!imported||imported.datetime!==source.datetime||imported.repeat!==source.repeat||imported.done!==source.done||imported.snoozeUntil!==source.snoozeUntil)throw new Error('Occurrence transfer conflicts with reminder source snapshot')
    const suppress=imported.outcome!=='idle'
    Object.assign(target,{anchor:imported.anchor,repeat:imported.repeat,index:imported.index,datetime:imported.datetime,snoozeUntil:imported.snoozeUntil,done:imported.done,skipped:imported.skipped,dispatch:suppress?'uncertain':'idle',suppressCurrentDelivery:suppress,transferredOutcome:suppress?imported.outcome:undefined,requestFingerprint:undefined})
  }
  return next
}
export const sourceFingerprint = (source: ReminderSource) => JSON.stringify(source)
export const occurrenceDue = (item: ReminderOccurrence) => Date.parse(item.snoozeUntil || item.datetime)
export const requestFingerprint = (source: ReminderSource, item: ReminderOccurrence) => JSON.stringify([source.id,item.index,item.datetime,item.snoozeUntil ?? null,source.title,source.msg])

export function reconcileReminderSources(ledger: ReminderDeliveryLedger, sources: ReminderSource[]): ReminderDeliveryLedger {
  const next = prepareReminderLedger(ledger)
  const ids = new Set<string>()
  for (const source of sources) {
    validateReminder(source)
    if (ids.has(source.id)) throw new Error('Duplicate reminder ID')
    ids.add(source.id)
    let item = next.occurrences.find(item => item.reminderId === source.id)
    if (!item) {
      if (next.nextNativeId > 2_147_483_647) throw new Error('Native notification IDs exhausted')
      item = {reminderId:source.id,anchor:source.datetime,repeat:source.repeat,index:0,datetime:source.datetime,done:source.done,nativeId:next.nextNativeId++,dispatch:'idle',skipped:0}
      next.occurrences.push(item)
    } else if (item.datetime !== source.datetime || item.repeat !== source.repeat) {
      // Explicit date/repeat edits start a new series; ordinary title edits and
      // snoozes preserve the original anchor and month-end day.
      Object.assign(item,{anchor:source.datetime,repeat:source.repeat,index:0,datetime:source.datetime,dispatch:'idle',requestFingerprint:undefined,skipped:0,suppressCurrentDelivery:false,transferredOutcome:undefined})
    }
    if (item.done !== source.done || item.snoozeUntil !== source.snoozeUntil) { item.dispatch = 'idle'; item.requestFingerprint = undefined }
    item.done = source.done; item.snoozeUntil = source.snoozeUntil
  }
  // Removed records are retained until native cancellation is acknowledged.
  for (const item of next.occurrences) if (!ids.has(item.reminderId)) item.done = true
  return next
}

export function recurrenceInstant(anchor: string, repeat: ReminderSource['repeat'], index: number): string {
  if (!validInstant(anchor) || !Number.isSafeInteger(index) || index < 0) throw new Error('Invalid recurrence')
  if (index === 0) return anchor
  const date = new Date(anchor)
  if (repeat === 'daily' || repeat === 'weekly') date.setUTCDate(date.getUTCDate() + index * (repeat === 'daily' ? 1 : 7))
  else if (repeat === 'monthly') {
    const day = date.getUTCDate()
    date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + index)
    const last = new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate()
    date.setUTCDate(Math.min(day,last))
  } else throw new Error('One-time reminders have no next occurrence')
  if (!Number.isFinite(date.getTime())) throw new Error('Recurrence exceeds supported date range')
  return date.toISOString()
}
export function advanceOccurrence(item: ReminderOccurrence, now: number): {index:number; datetime:string; skipped:number} {
  const anchor = new Date(item.anchor)
  let index = item.index + 1
  if (item.repeat === 'daily' || item.repeat === 'weekly') index = Math.max(index,Math.floor((now-anchor.getTime())/(86_400_000*(item.repeat==='daily'?1:7)))+1)
  else if (item.repeat === 'monthly') {
    const today = new Date(now)
    index = Math.max(index,(today.getUTCFullYear()-anchor.getUTCFullYear())*12+today.getUTCMonth()-anchor.getUTCMonth())
  }
  let datetime = recurrenceInstant(item.anchor,item.repeat,index)
  if (Date.parse(datetime) <= now) datetime = recurrenceInstant(item.anchor,item.repeat,++index)
  return {index,datetime,skipped:index-item.index-1}
}

// Stores route occurrence commands through their App-owned runtime. Returning a
// structured failure keeps a click from silently changing only in-memory state.
const commandOwners = new Map<string,(command:ReminderCommand)=>Promise<ReminderCommandResult>>()
export function registerReminderCommandOwner(client: string, owner:(command:ReminderCommand)=>Promise<ReminderCommandResult>) {
  commandOwners.set(client,owner)
  return () => { if(commandOwners.get(client)===owner) commandOwners.delete(client) }
}
export async function executeReminderCommand(client: string, command:ReminderCommand): Promise<ReminderCommandResult> {
  const owner = commandOwners.get(client)
  return owner ? owner(command) : {ok:false,code:'owner-unavailable',message:'Reminder service is not ready. The reminder was retained.'}
}
