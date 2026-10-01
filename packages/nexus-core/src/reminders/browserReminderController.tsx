import React, { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { awaitHydration } from '../storage/awaitHydration'
import { createIndexedDbStorage, persistenceRegistry } from '../storage/browserPersistence'
import { createRecoveryJournal } from '../storage/recoveryJournal'
import { workspaceOperation } from '../storage/workspaceOperation'
import { registerReminderCommandOwner, type ReminderDeliveryLedger, type ReminderPortableState, type ReminderSource } from './reminderDomain'
import { createReminderRuntime, prepareReminderJournal, type NativeReminderPort, type ReminderJournalState } from './reminderRuntime'

type ReminderStore = {
  getState:()=>{reminders:ReminderSource[]}; setState:(value:{reminders:ReminderSource[]})=>void
  subscribe:(listener:()=>void)=>()=>void
  persist:{hasHydrated:()=>boolean;rehydrate:()=>void|Promise<void>}
}
export function createBrowserReminderController(options:{client:'main'|'mobile';store:ReminderStore;native?:NativeReminderPort;notify?:(source:ReminderSource)=>Promise<void>;resume?:(refresh:()=>void)=>()=>void}) {
  const storage=createIndexedDbStorage<ReminderDeliveryLedger>({dbName:`nexus-${options.client}-reminder-delivery-v1`,debounceMs:0})
  const key='nexus-reminder-delivery-v1'
  const journal=createRecoveryJournal<ReminderJournalState>({databaseName:`nexus-${options.client}-reminder-command-journal-v1`,markerKey:`nx-${options.client}-reminder-command-pending-v1`,prepare:prepareReminderJournal})
  const runtime=createReminderRuntime({
    hydrate:()=>awaitHydration([options.store]),sources:()=>options.store.getState().reminders,
    replaceSource:source=>options.store.setState({reminders:options.store.getState().reminders.map(item=>item.id===source.id?source:item)}),
    flushSource:()=>persistenceRegistry.flush(),
    loadLedger:async()=>{const saved=await storage.getItem(key);return saved===null?null:saved.state},
    saveLedger:async ledger=>{storage.setItem(key,{state:ledger,version:1});if(!await storage.flush())throw new Error('Reminder delivery storage acknowledgement failed')},
    journal,native:options.native,
    suspended:()=>workspaceOperation.isActive(),
    allowNative:()=>{try{return !JSON.parse(localStorage.getItem(`nx-${options.client}-reminder-quiet-hours`)||'null')?.enabled}catch{return false}},
    foreground:async source=>{if(document.visibilityState==='hidden')throw new Error('Foreground reminder is pending; app is not visible');await options.notify?.(source)},
    quiet:date=>{
      if(document.visibilityState==='hidden') return true
      try {
        const quiet=JSON.parse(localStorage.getItem(`nx-${options.client}-reminder-quiet-hours`)||'null')
        if(!quiet?.enabled)return false
        if(!/^\d{2}:\d{2}$/.test(quiet.start)||!/^\d{2}:\d{2}$/.test(quiet.end))return false
        const [sh,sm]=quiet.start.split(':').map(Number),[eh,em]=quiet.end.split(':').map(Number)
        if(sh>23||eh>23||sm>59||em>59)return false
        const at=date.getHours()*60+date.getMinutes(),start=sh*60+sm,end=eh*60+em
        return start===end || (start<end?at>=start&&at<end:at>=start||at<end)
      } catch {return false}
    },
  })
  let owner=false, ownerError:string|null=null, attachments=0, release:(()=>void)|undefined, cancelElection:(()=>void)|undefined
  let detachStore:(()=>void)|undefined, interval:ReturnType<typeof setInterval>|undefined, detachCommand:(()=>void)|undefined
  let detachResume:(()=>void)|undefined
  const listeners=new Set<()=>void>()
  let snapshot={...runtime.getStatus(),owner,ownerError}
  const changed=()=>{snapshot={...runtime.getStatus(),owner,ownerError};listeners.forEach(listener=>listener())}
  runtime.subscribe(changed)
  workspaceOperation.subscribe(()=>{if(owner&&!workspaceOperation.isActive())void runtime.tick()})
  // Startup/transaction ports take the same lock when there is no attached App
  // owner. They load/recover without a delivery tick and never transfer an OS ID.
  const exclusive=async<T,>(work:()=>Promise<T>):Promise<T>=>{
    if(owner || !navigator.locks)return work()
    return navigator.locks.request(`nexus-${options.client}-reminder-owner-v1`,{ifAvailable:true},async lock=>{
      if(!lock)throw new Error('Another window owns reminder delivery; close it before replacing occurrence state')
      return work()
    })
  }
  function becomeOwner() {
    owner=true;changed()
    detachCommand=registerReminderCommandOwner(options.client,command=>runtime.command(command))
    detachStore=options.store.subscribe(()=>{void runtime.tick()})
    interval=setInterval(()=>{void runtime.tick()},15_000)
    document.addEventListener('visibilitychange',onResume)
    window.addEventListener('focus',onResume)
    detachResume=options.resume?.(()=>{void runtime.tick()})
    void runtime.tick()
  }
  function onResume() {if(document.visibilityState!=='hidden')void runtime.tick()}
  function leaveOwner() {
    owner=false;detachStore?.();detachCommand?.();detachResume?.();if(interval)clearInterval(interval)
    document.removeEventListener('visibilitychange',onResume);window.removeEventListener('focus',onResume);changed()
  }
  function attach() {
    if(++attachments===1) {
      if(navigator.locks) {
        const abort=new AbortController();cancelElection=()=>abort.abort()
        void navigator.locks.request(`nexus-${options.client}-reminder-owner-v1`,{signal:abort.signal},async()=>{
          if(!attachments)return
          becomeOwner()
          await new Promise<void>(resolve=>{release=resolve})
          leaveOwner()
          await runtime.drain() // Retain the lock until already-claimed effects finish.
        }).catch(failure=>{if(!abort.signal.aborted){ownerError=String(failure);changed()}})
      } else {
        // No uncoordinated fallback: two windows could otherwise duplicate both
        // notification effects and source/ledger commands.
        ownerError='Reminder delivery needs Web Locks on this platform. Saved reminders remain available.';changed()
      }
    }
    return()=>{
      if(--attachments===0){cancelElection?.();release?.();release=undefined}
    }
  }
  const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener)}}
  const useStatus=()=>useSyncExternalStore(subscribe,()=>snapshot,()=>snapshot)
  function useApplication() {
    useEffect(attach,[])
    const status=useStatus()
    if(typeof document==='undefined')return null
    const alert=status.alerts.at(-1)
    const issue=status.error||status.ownerError
    if(!alert&&!issue&&!status.transferred)return null
    return createPortal(<aside aria-label="Reminder delivery" style={{position:'fixed',right:16,top:16,zIndex:9999,maxWidth:360,padding:16,borderRadius:12,background:'#171827',color:'#fff',boxShadow:'0 8px 35px #0008'}}>
      {issue&&<div role="alert" style={{fontSize:12,marginBottom:8}}>{issue}<button onClick={()=>{if(owner)void runtime.retry()}} style={{marginLeft:8}}>Retry</button></div>}
      {status.transferred>0&&<div role="status" style={{fontSize:12,marginBottom:8}}>Transferred occurrences retain earlier notification outcomes. Automatic delivery is paused until you complete or snooze each current occurrence.</div>}
      {alert&&<><strong>{alert.title}</strong><div style={{fontSize:12,margin:'6px 0'}}>{alert.msg}</div>
        <div style={{fontSize:11,opacity:0.75,marginBottom:8}}>{alert.state==='uncertain'||alert.state==='claimed'?'Notification outcome uncertain. This occurrence is retained.':alert.state==='native-observed'?'Native notification event observed.':'Reminder due; notification request recorded.'}</div>
        <button onClick={()=>{void runtime.command({kind:'complete',id:alert.id})}}>Complete occurrence</button>{' '}
        <button onClick={()=>{void runtime.command({kind:'snooze',id:alert.id,minutes:5})}}>Snooze 5m</button>{' '}
        <button onClick={()=>{void runtime.command({kind:'stop',id:alert.id})}}>Stop series</button></>}
    </aside>,document.body)
  }
  return {runtime,useStatus,useApplication,subscribe,getStatus:()=>snapshot,refresh:()=>owner?runtime.tick():Promise.resolve(),
    initialize:()=>exclusive(()=>runtime.initialize()),drain:()=>runtime.drain(),
    captureLocalLedger:()=>exclusive(()=>runtime.captureLocalLedger()),
    replaceLocalLedger:(value:ReminderDeliveryLedger)=>exclusive(()=>runtime.replaceLocalLedger(value)),
    capturePortable:()=>exclusive(()=>runtime.capturePortable()),
    replacePortable:(value:ReminderPortableState)=>exclusive(()=>runtime.replacePortable(value)),
  }
}
