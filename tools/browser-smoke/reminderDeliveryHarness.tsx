import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { useApp as mainStore } from '../../Nexus Main/src/store/appStore'
import { useApp as mobileStore } from '../../Nexus Mobile/src/store/appStore'
import { reminderService } from '../../Nexus Main/src/lib/reminderService'
import { mobileReminderController, mobileReminderService } from '../../Nexus Mobile/src/lib/mobileReminderService'
import { ReminderCard as MainCard } from '../../Nexus Main/src/views/reminders/ReminderViewParts'
import { ReminderDeliveryFixtureCard as MobileCard } from '../../Nexus Mobile/src/views/RemindersView'
import { awaitHydration } from '../../packages/nexus-core/src/storage/awaitHydration'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { createBrowserReminderController } from '../../packages/nexus-core/src/reminders/browserReminderController'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'

const checks:string[]=[], results:unknown[]=[], root=createRoot(document.getElementById('root')!)
const assert=(condition:unknown,label:string)=>{if(!condition)throw Error(label);checks.push(label)}
const settle=()=>new Promise(resolve=>setTimeout(resolve,50))
const until=async(condition:()=>boolean,label:string)=>{for(let n=0;n<200;n++){if(condition())return;await settle()}throw Error(`Timeout: ${label}`)}
const restart=new URLSearchParams(location.search).get('phase')==='restart'
const previous=restart?JSON.parse(sessionStorage.getItem('reminder-delivery-fixture-checkpoint')!):null
const calls:string[]=previous?.calls||[], nativeRequests=new Map<number,any>(previous?.nativeRequests||[])
const competingOwner=createBrowserReminderController({client:'main',store:mainStore,notify:async()=>{calls.push('duplicate-owner-notify')}})
;(window as any).api={notify:async()=>{calls.push('foreground-notify')}}
;(window as any).__nativeReminderFixture={
  checkPermissions:async()=>{calls.push('check-permissions');return {display:'granted'}},
  requestPermissions:async()=>{calls.push('request-permissions');return {display:'granted'}},
  getPending:async()=>({notifications:[...nativeRequests.values()]}),
  getDeliveredNotifications:async()=>({notifications:[]}),
  schedule:async({notifications}:any)=>{for(const item of notifications){calls.push(`schedule:${item.id}`);nativeRequests.set(item.id,item)}return {notifications}},
  cancel:async({notifications}:any)=>{for(const item of notifications){calls.push(`cancel:${item.id}`);nativeRequests.delete(item.id)}},
}
function Owners({card}:{card?:'main'|'mobile'}) {
  const mainOverlay=reminderService.useApplication(), mobileOverlay=mobileReminderController.useApplication()
  const competingOverlay=competingOwner.useApplication()
  const main=mainStore(),mobile=mobileStore()
  return <><div data-testid="current-view">{card?'Reminders':'Dashboard'}</div>{mainOverlay}{mobileOverlay}{competingOverlay}
    {card==='main'&&main.reminders[0]&&<MainCard r={main.reminders[0]} now={new Date()} onEdit={()=>{}} />}
    {card==='mobile'&&mobile.reminders[0]&&<MobileCard r={mobile.reminders[0]} now={new Date()} onEdit={()=>{}} />}</>
}
const render=(card?:'main'|'mobile')=>flushSync(()=>root.render(<StrictMode><Owners card={card}/></StrictMode>))
async function run() {
  await awaitHydration([mainStore,mobileStore])
  await reminderService.initialize();await mobileReminderController.initialize()
  if(!restart)assert(!calls.includes('foreground-notify')&&!calls.some(item=>item.startsWith('schedule:')),'controller startup initialize loads sidecars without delivery effects before App attach')
  if(restart) {
    render()
    await until(()=>reminderService.getStatus().ready&&mobileReminderController.getStatus().ready,'fresh-page hydration and reconciliation')
    await reminderService.runtime.drain();await mobileReminderController.runtime.drain()
    assert(calls.filter(item=>item==='foreground-notify').length===previous.foregroundCount,'fresh page does not repeat persisted due dispatch')
    assert(calls.filter(item=>item.startsWith('schedule:')).length===previous.scheduleCount,'fresh page reconciles existing native request without rescheduling')
    assert(reminderService.getStatus().alerts.some(item=>item.id==='main-restart-due'),'fresh page restores unresolved due occurrence overlay')
    assert(!competingOwner.getStatus().owner,'competing application owner cannot acquire held Web Lock')
    mobileStore.getState().delRem('mobile-restart-future')
    await until(()=>nativeRequests.size===0,'deletion cancellation after fresh page')
    assert(nativeRequests.size===0,'fresh page retained native ownership for deleted reminder cancellation')
    results.push({calls,mainLedger:reminderService.runtime.getLedger(),mobileLedger:mobileReminderController.runtime.getLedger()})
    flushSync(()=>root.unmount())
    return {ok:true,phase:'restart',zone:Intl.DateTimeFormat().resolvedOptions().timeZone,results,checks}
  }
  const due=new Date(Date.now()-60_000).toISOString(),future=new Date(Date.now()+7_200_000).toISOString()
  mainStore.setState({reminders:[{id:'main-synthetic',title:'Main synthetic',msg:'',datetime:due,repeat:'daily',done:false}]})
  mobileStore.setState({reminders:[{id:'mobile-synthetic',title:'Mobile synthetic',msg:'',datetime:future,repeat:'daily',done:false}]})
  assert(await persistenceRegistry.flush(),'real client source queues acknowledge fixtures')
  render()
  await until(()=>reminderService.getStatus().ready&&mobileReminderController.getStatus().ready&&nativeRequests.size===1,'App owners ready')
  assert(document.querySelector('[data-testid="current-view"]')?.textContent==='Dashboard','delivery operates outside Reminder view')
  assert(calls.filter(item=>item==='foreground-notify').length===1,'StrictMode creates one foreground request')
  assert(!competingOwner.getStatus().owner&&!calls.includes('duplicate-owner-notify'),'Web Lock excludes competing application owner')
  assert(!calls.includes('request-permissions'),'native lifecycle startup never requests permission')
  assert(Boolean(document.querySelector('aside[aria-label="Reminder delivery"]')),'global due occurrence overlay is visible outside view')
  const originalNativeId=[...nativeRequests.keys()][0]
  assert([...nativeRequests.values()].every(item=>item.isExactNotification===false&&item.isExactMandatory===false),'native payload avoids automatic exact-alarm permission/settings flow')
  render('main');await settle()
  const complete=document.querySelector<HTMLButtonElement>('button[aria-label="Complete occurrence"]')!
  complete.click();await until(()=>mainStore.getState().reminders[0].datetime!==due,'Main repeat completion')
  await reminderService.runtime.drain()
  assert(mainStore.getState().reminders[0].done===false,'Main card completes occurrence and keeps series open')
  assert(Date.parse(mainStore.getState().reminders[0].datetime)===Date.parse(due)+86_400_000,'Main card advances UTC daily cadence')
  assert(document.body.textContent?.includes('(UTC)'),'Main card exposes UTC cadence')
  render('mobile');await settle()
  assert(document.body.textContent?.includes('(UTC)'),'Mobile card exposes UTC cadence')
  document.querySelector<HTMLButtonElement>('button[aria-label="Complete occurrence"]')!.click()
  await until(()=>mobileStore.getState().reminders[0].datetime!==future,'Mobile repeat completion')
  await mobileReminderController.runtime.drain()
  assert(mobileStore.getState().reminders[0].done===false,'Mobile card completes occurrence and keeps series open')
  assert([...nativeRequests.keys()][0]===originalNativeId,'occurrence advancement keeps stable native ID')
  assert(calls.some(item=>item===`cancel:${originalNativeId}`),'old native occurrence is canceled before replacement')
  await mobileStore.getState().snoozeRem('mobile-synthetic',5)
  const anchor=mobileReminderController.runtime.getLedger().occurrences[0].anchor
  assert(anchor===future,'Mobile snooze preserves original series anchor')
  assert(Boolean(mobileStore.getState().reminders[0].snoozeUntil),'Mobile snooze is persisted in actual store')
  const stop=Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(item=>item.textContent==='Stop series')!
  stop.click();await until(()=>mobileStore.getState().reminders[0].done,'Mobile stop series')
  await mobileReminderController.runtime.drain()
  assert(nativeRequests.size===0,'Stop series reconciles native cancellation')
  await mobileReminderService.requestPermissions()
  assert(calls.filter(item=>item==='request-permissions').length===1,'only explicit permission action invokes requestPermissions')
  const requestCount=calls.filter(item=>item==='foreground-notify').length
  flushSync(()=>root.render(null));await settle();render();await settle();await reminderService.runtime.drain()
  assert(calls.filter(item=>item==='foreground-notify').length===requestCount,'application detach/reattach does not repeat foreground request')
  const preFreezeForeground=calls.filter(item=>item==='foreground-notify').length
  await workspaceOperation.run(async()=>{
    await reminderService.drain();await mobileReminderController.drain()
    mainStore.setState({reminders:[...mainStore.getState().reminders,{id:'freeze-main',title:'Freeze synthetic',msg:'',datetime:due,repeat:'none',done:false}]})
    mobileStore.setState({reminders:[...mobileStore.getState().reminders,{id:'freeze-mobile',title:'Freeze synthetic',msg:'',datetime:future,repeat:'none',done:false}]})
    assert(await persistenceRegistry.flush(),'source replacement acknowledges while frozen')
    const portable=await mobileReminderController.capturePortable()
    assert(!JSON.stringify(portable).includes('nativeId')&&!JSON.stringify(portable).includes('Fingerprint'),'controller portable capture excludes native bindings')
    await mobileReminderController.replacePortable(portable)
    const local=await reminderService.captureLocalLedger();await reminderService.replaceLocalLedger(local)
    await settle()
    assert(nativeRequests.size===0&&calls.filter(item=>item==='foreground-notify').length===preFreezeForeground,'freeze blocks effects through acknowledged source+sidecar replacement')
  })
  await until(()=>nativeRequests.size===1&&calls.filter(item=>item==='foreground-notify').length===preFreezeForeground+1,'reconcile after workspace freeze idle')
  assert(nativeRequests.size===1,'native requests resume only after workspace freeze idle')
  mainStore.getState().delRem('freeze-main');mobileStore.getState().delRem('freeze-mobile')
  await mobileReminderController.refresh();await mobileReminderController.drain();assert(nativeRequests.size===0,'temporary frozen occurrence cleanup retains owned native cancellation')
  assert(await persistenceRegistry.flush(),'final source and delivery queues acknowledge')
  mainStore.setState({reminders:[...mainStore.getState().reminders,{id:'main-restart-due',title:'Restart synthetic',msg:'',datetime:due,repeat:'none',done:false}]})
  mobileStore.setState({reminders:[...mobileStore.getState().reminders,{id:'mobile-restart-future',title:'Restart synthetic',msg:'',datetime:future,repeat:'none',done:false}]})
  await until(()=>reminderService.runtime.getLedger().occurrences.some(item=>item.reminderId==='main-restart-due'&&item.dispatch==='foreground-requested')&&nativeRequests.size===1,'restart checkpoint effects acknowledged')
  await reminderService.runtime.drain();await mobileReminderController.runtime.drain();assert(await persistenceRegistry.flush(),'restart checkpoint acknowledged in real IndexedDB')
  sessionStorage.setItem('reminder-delivery-fixture-checkpoint',JSON.stringify({calls,nativeRequests:[...nativeRequests.entries()],foregroundCount:calls.filter(item=>item==='foreground-notify').length,scheduleCount:calls.filter(item=>item.startsWith('schedule:')).length}))
  results.push({calls,main:mainStore.getState().reminders,mobile:mobileStore.getState().reminders,mainLedger:reminderService.runtime.getLedger(),mobileLedger:mobileReminderController.runtime.getLedger()})
  flushSync(()=>root.unmount())
  return {ok:true,phase:'after',zone:Intl.DateTimeFormat().resolvedOptions().timeZone,results,checks}
}
run().then(result=>{(window as any).reminderTimeTestResult=result}).catch(error=>{(window as any).reminderTimeTestResult={ok:false,error:error.stack,results,checks,calls,main:reminderService.getStatus(),mobile:mobileReminderController.getStatus(),visibility:document.visibilityState,locks:Boolean(navigator.locks)}})
