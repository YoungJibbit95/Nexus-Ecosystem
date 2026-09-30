import { advanceOccurrence, emptyReminderLedger, exportReminderPortable, importReminderPortable, occurrenceDue, prepareReminderLedger, reconcileReminderSources, requestFingerprint, sourceFingerprint, validateReminder, type ReminderCommand, type ReminderCommandResult, type ReminderDeliveryLedger, type ReminderOccurrence, type ReminderPortableState, type ReminderSource } from './reminderDomain'

export type ReminderJournalState = { source: ReminderSource; ledger: ReminderDeliveryLedger }
export function prepareReminderJournal(value: unknown): ReminderJournalState {
  const raw = value as ReminderJournalState
  validateReminder(raw?.source)
  return {source:structuredClone(raw.source),ledger:prepareReminderLedger(raw.ledger)}
}
export type NativeReminderPort = {
  permission: () => Promise<'granted'|'denied'|'prompt'|'unknown'>
  pending: () => Promise<{id:number;fingerprint?:string;legacyReminderId?:string}[]>
  delivered?: () => Promise<{id:number;fingerprint?:string}[]>
  schedule: (source:ReminderSource,item:ReminderOccurrence,fingerprint:string) => Promise<void>
  cancel: (id:number) => Promise<void>
}
export type ReminderRuntimePorts = {
  hydrate: () => Promise<void>; sources: () => ReminderSource[]
  replaceSource: (source:ReminderSource) => void; flushSource: () => Promise<boolean>
  loadLedger: () => Promise<unknown|null>; saveLedger: (ledger:ReminderDeliveryLedger) => Promise<void>
  journal: {read:()=>Promise<{before:ReminderJournalState;after:ReminderJournalState}|null>;write:(before:ReminderJournalState,after:ReminderJournalState)=>Promise<void>;clear:()=>Promise<void>}
  native?: NativeReminderPort; foreground: (source:ReminderSource) => Promise<void>
  allowNative?:()=>boolean
  suspended?:()=>boolean
  quiet: (date:Date) => boolean; now?:()=>number
}
export type ReminderRuntimeStatus = {
  ready:boolean; blocked:boolean; permission:'granted'|'denied'|'prompt'|'unknown'; nativeAvailable:boolean
  scheduled:number; uncertain:number; error:string|null; lastReconcileAt:string|null
  transferred:number
  alerts:{id:string;title:string;msg:string;state:string}[]
}
export function createReminderRuntime(ports:ReminderRuntimePorts) {
  let ledger = emptyReminderLedger(), initialized = false, blocked = false
  let tail:Promise<unknown> = Promise.resolve()
  let sourceSignature = '', error:string|null = null, permission:ReminderRuntimeStatus['permission']='unknown', lastReconcileAt:string|null=null
  const subscribers = new Set<()=>void>()
  const now = ports.now ?? Date.now
  const changed = () => subscribers.forEach(fn=>fn())
  const save = async (next:ReminderDeliveryLedger) => { await ports.saveLedger(next); ledger=next; changed() }
  const fail = (failure:unknown) => { error=failure instanceof Error?failure.message:String(failure);changed() }
  const serial = <T>(work:()=>Promise<T>):Promise<T> => { const result=tail.then(work);tail=result.catch(()=>{});return result }
  const findSource = (id:string) => ports.sources().find(source=>source.id===id)
  async function applyJournal(record:{before:ReminderJournalState;after:ReminderJournalState}) {
    const current=findSource(record.before.source.id)
    if (!current || ![sourceFingerprint(record.before.source),sourceFingerprint(record.after.source)].includes(sourceFingerprint(current))) throw new Error('Reminder recovery conflicts with a newer edit; journal retained')
    ports.replaceSource(record.after.source)
    if (!await ports.flushSource()) throw new Error('Reminder storage acknowledgement failed; recovery journal retained')
    await save(record.after.ledger)
    await ports.journal.clear()
  }
  async function initialize() {
    if(initialized) return
    await ports.hydrate()
    const stored=await ports.loadLedger()
    ledger=stored===null?emptyReminderLedger():prepareReminderLedger(stored)
    const pending=await ports.journal.read()
    if(pending) await applyJournal(pending)
    initialized=true; blocked=false; changed()
  }
  async function reconcileSources() {
    const sources=ports.sources(), signature=JSON.stringify(sources.map(sourceFingerprint))
    if(signature===sourceSignature) return
    const next=reconcileReminderSources(ledger,sources)
    // Source queues must acknowledge before the ledger may authorize effects.
    if(!await ports.flushSource()) throw new Error('Reminder source storage is unavailable; notifications paused')
    if(signature!==JSON.stringify(ports.sources().map(sourceFingerprint))) throw new Error('Reminder changed during persistence; retrying reconciliation')
    await save(next); sourceSignature=signature
  }
  async function reconcileNative() {
    const native=ports.native
    if(!native) return
    const allowNative=ports.allowNative?.()!==false
    permission=await native.permission()
    const pending=await native.pending(), delivered=new Map((await native.delivered?.() ?? []).map(item=>[item.id,item.fingerprint]))
    const owned=new Set(ledger.occurrences.map(item=>item.nativeId))
    // Old service notifications identify their reminder in extra. Cancel these
    // explicitly during migration; unrelated local notifications are retained.
    for(const request of pending) if(request.legacyReminderId && !owned.has(request.id)) await native.cancel(request.id)
    for(const item of ledger.occurrences) {
      const source=findSource(item.reminderId), request=pending.find(request=>request.id===item.nativeId)
      if((request && !request.fingerprint && !request.legacyReminderId) || (!request && delivered.has(item.nativeId) && !delivered.get(item.nativeId))) {
        // A numeric ID alone is not proof of ownership. Allocate around other
        // plugin users rather than canceling their notification.
        const next=structuredClone(ledger)
        const used=new Set([...pending.map(request=>request.id),...delivered.keys(),...next.occurrences.map(item=>item.nativeId)])
        while(used.has(next.nextNativeId))next.nextNativeId++
        if(next.nextNativeId>2_147_483_647)throw new Error('Native notification IDs exhausted')
        const target=next.occurrences.find(x=>x.nativeId===item.nativeId)!
        target.nativeId=next.nextNativeId++;target.dispatch='idle';delete target.requestFingerprint
        await save(next)
        throw new Error('Native ID collision retained unrelated request; reconciliation will retry')
      }
      const fingerprint=source?requestFingerprint(source,item):undefined
      const due=occurrenceDue(item)
      if(!source || item.done || item.suppressCurrentDelivery || request?.fingerprint!==fingerprint || permission!=='granted' || !allowNative || due<=now()) {
        if(request) await native.cancel(item.nativeId) // Failure retains ledger ownership for the next retry.
      }
      if(item.suppressCurrentDelivery)continue
      if(item.done || !source) {
        if(item.dispatch!=='idle' || item.requestFingerprint) { const next=structuredClone(ledger);Object.assign(next.occurrences.find(x=>x.nativeId===item.nativeId)!,{dispatch:'idle',requestFingerprint:undefined});await save(next) }
        continue
      }
      if(due<=now()) {
        if(item.dispatch==='native-scheduled' || (item.dispatch==='claimed' && item.requestFingerprint===fingerprint)) {
          const next=structuredClone(ledger); next.occurrences.find(x=>x.nativeId===item.nativeId)!.dispatch=delivered.get(item.nativeId)===fingerprint?'native-observed':'uncertain';await save(next)
        }
        continue
      }
      if(permission!=='granted'||!allowNative) {
        if(request && item.dispatch==='native-scheduled') {const next=structuredClone(ledger);Object.assign(next.occurrences.find(x=>x.nativeId===item.nativeId)!,{dispatch:'idle',requestFingerprint:undefined});await save(next)}
        continue
      }
      if(request?.fingerprint===fingerprint) {
        if(item.dispatch!=='native-scheduled' || item.requestFingerprint!==fingerprint) {const next=structuredClone(ledger);Object.assign(next.occurrences.find(x=>x.nativeId===item.nativeId)!,{dispatch:'native-scheduled',requestFingerprint:fingerprint});await save(next)}
        continue
      }
      const next=structuredClone(ledger), target=next.occurrences.find(x=>x.nativeId===item.nativeId)!
      Object.assign(target,{dispatch:'claimed',requestFingerprint:fingerprint})
      await save(next)
      if(sourceFingerprint(findSource(source.id)!)!==sourceFingerprint(source)) throw new Error('Reminder changed before native request; reconciliation required')
      await native.schedule(source,target,fingerprint!)
      const acknowledged=structuredClone(ledger);acknowledged.occurrences.find(x=>x.nativeId===item.nativeId)!.dispatch='native-scheduled';await save(acknowledged)
    }
  }
  async function foreground() {
    if(ports.quiet(new Date(now()))) return
    for(const item of ledger.occurrences) {
      const source=findSource(item.reminderId)
      if(!source || item.done || item.suppressCurrentDelivery || occurrenceDue(item)>now() || item.dispatch!=='idle') continue
      const next=structuredClone(ledger), target=next.occurrences.find(x=>x.nativeId===item.nativeId)!
      Object.assign(target,{dispatch:'claimed',requestFingerprint:requestFingerprint(source,item)})
      await save(next)
      if(sourceFingerprint(findSource(source.id)!)!==sourceFingerprint(source)) throw new Error('Reminder changed before foreground request; reconciliation required')
      try {
        await ports.foreground(source)
        const requested=structuredClone(ledger);requested.occurrences.find(x=>x.nativeId===item.nativeId)!.dispatch='foreground-requested';await save(requested)
      } catch(failure) {
        const uncertain=structuredClone(ledger);uncertain.occurrences.find(x=>x.nativeId===item.nativeId)!.dispatch='uncertain';await save(uncertain);throw failure
      }
    }
  }
  async function tickWork() {
    try {
      if(ports.suspended?.())return false
      await initialize()
      if(blocked) return false
      await reconcileSources();await reconcileNative();await foreground()
      error=null;lastReconcileAt=new Date(now()).toISOString();changed()
      return true
    } catch(failure) { if(!initialized) blocked=true;fail(failure);return false }
  }
  const tick=()=>serial(tickWork)
  const command=(command:ReminderCommand):Promise<ReminderCommandResult> => {
    const requested=findSource(command.id), expected=requested?sourceFingerprint(requested):undefined
    return serial(async()=>{
    try {
      if(ports.suspended?.())return {ok:false,code:'conflict',message:'Workspace handoff is in progress; reminder was retained'}
      await initialize()
      if(blocked) return {ok:false,code:'storage-unavailable',message:error||'Reminder recovery is pending'}
      await reconcileSources()
      const source=findSource(command.id), item=ledger.occurrences.find(item=>item.reminderId===command.id)
      if(!source || !item || sourceFingerprint(source)!==expected) return {ok:false,code:'conflict',message:'This occurrence changed before the command completed'}
      if(source.done && command.kind==='stop') {
        const reconciled=await tickWork()
        return reconciled?{ok:true,skipped:0}:{ok:false,code:'delivery-unavailable',message:`Series is closed. Notification reconciliation is pending: ${error}`}
      }
      if(source.done) return {ok:false,code:'conflict',message:'This occurrence is no longer open'}
      if(command.kind==='snooze' && (!Number.isFinite(command.minutes) || command.minutes<=0 || command.minutes>525_600)) return {ok:false,code:'validation',message:'Choose a snooze duration between 0 and one year'}
      const afterSource=structuredClone(source), afterLedger=structuredClone(ledger), target=afterLedger.occurrences.find(x=>x.reminderId===command.id)!
      let skipped=0
      if(command.kind==='snooze') {afterSource.snoozeUntil=new Date(now()+command.minutes*60_000).toISOString();target.snoozeUntil=afterSource.snoozeUntil}
      else if(command.kind==='stop' || source.repeat==='none') {afterSource.done=true;target.done=true;delete afterSource.snoozeUntil;delete target.snoozeUntil}
      else {const advanced=advanceOccurrence(target,now());skipped=advanced.skipped;Object.assign(target,{...advanced,skipped:target.skipped+skipped});afterSource.datetime=advanced.datetime;delete afterSource.snoozeUntil;delete target.snoozeUntil}
      target.dispatch='idle';delete target.requestFingerprint
      delete target.suppressCurrentDelivery;delete target.transferredOutcome
      const before={source:structuredClone(source),ledger:structuredClone(ledger)}, after={source:afterSource,ledger:afterLedger}
      await ports.journal.write(before,after)
      if(sourceFingerprint(findSource(command.id)!)!==sourceFingerprint(source)) { blocked=true;throw new Error('Reminder changed during command; recovery journal retained') }
      await applyJournal({before,after});sourceSignature=''
      const reconciled=await tickWork()
      if(!reconciled) return {ok:false,code:'delivery-unavailable',message:`Occurrence change saved. Notification reconciliation is pending: ${error}`}
      return {ok:true,skipped}
    } catch(failure) {
      blocked=true;fail(failure)
      return {ok:false,code:'storage-unavailable',message:error||'Reminder command failed; journal retained'}
    }
    })
  }
  return {
    tick,command,
    initialize:()=>serial(initialize),
    drain:()=>serial(async()=>{}),
    captureLocalLedger:()=>serial(async()=>{await initialize();if(blocked)throw new Error(error||'Reminder recovery is pending');await reconcileSources();return structuredClone(ledger)}),
    replaceLocalLedger:(value:ReminderDeliveryLedger)=>serial(async()=>{await initialize();await save(prepareReminderLedger(value));sourceSignature=''}),
    capturePortable:()=>serial(async()=>{await initialize();if(blocked)throw new Error(error||'Reminder recovery is pending');await reconcileSources();return exportReminderPortable(ledger,ports.sources())}),
    replacePortable:(value:ReminderPortableState)=>serial(async()=>{await initialize();await save(importReminderPortable(ledger,value,ports.sources()));sourceSignature=''}),
    retry:()=>serial(async()=>{initialized=false;blocked=false;sourceSignature='';await tickWork()}),
    subscribe:(listener:()=>void)=>{subscribers.add(listener);return()=>{subscribers.delete(listener)}},
    getLedger:()=>structuredClone(ledger),
    getStatus():ReminderRuntimeStatus {
      const sources=initialized?ports.sources():[]
      return {ready:initialized,blocked,permission,nativeAvailable:Boolean(ports.native),error,lastReconcileAt,
        scheduled:ledger.occurrences.filter(item=>item.dispatch==='native-scheduled').length,
        uncertain:ledger.occurrences.filter(item=>item.dispatch==='uncertain'||item.dispatch==='claimed').length,
        transferred:ledger.occurrences.filter(item=>item.suppressCurrentDelivery&&!item.done).length,
        alerts:ledger.occurrences.filter(item=>!item.done&&occurrenceDue(item)<=now()&&item.dispatch!=='idle').flatMap(item=>{const source=sources.find(source=>source.id===item.reminderId);return source?[{id:source.id,title:source.title,msg:source.msg,state:item.dispatch}]:[]}),
      }
    },
  }
}
