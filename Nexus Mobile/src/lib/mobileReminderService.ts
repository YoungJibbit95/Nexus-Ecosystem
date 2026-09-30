import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { App as CapacitorApp } from '@capacitor/app'
import { createBrowserReminderController } from '@nexus/core/reminders/browserReminderController'
import type { NativeReminderPort } from '@nexus/core/reminders/reminderRuntime'
import { useApp } from '../store/appStore'

type PermissionState='granted'|'denied'|'prompt'|'unknown'
export type ReminderPermissionSync={nativeAvailable:boolean;permission:PermissionState;canSchedule:boolean}
export type ReminderHealthStatus={nativeAvailable:boolean;permission:PermissionState;fallback:boolean;scheduled:number;nextReminderAt:string|null;lastRescheduleAt:string|null;lastRescheduleReason:string|null;uncertain:number}
const permission=(value:unknown):PermissionState=>value==='granted'?'granted':value==='denied'?'denied':typeof value==='string'&&value.startsWith('prompt')?'prompt':'unknown'
// Use the installed Capacitor plugin proxy rather than a legacy global registry.
const nativeAvailable=Capacitor.isNativePlatform()&&Capacitor.isPluginAvailable('LocalNotifications')
const native:NativeReminderPort|undefined=nativeAvailable?{
  permission:async()=>permission((await LocalNotifications.checkPermissions()).display),
  pending:async()=>(await LocalNotifications.getPending()).notifications.map(item=>({id:item.id,
    fingerprint:item.extra?.nexusReminderFormat==='delivery-v1'?item.extra.fingerprint:undefined,
    legacyReminderId:item.extra?.nexusReminderFormat?undefined:item.extra?.reminderId,
  })),
  delivered:async()=>(await LocalNotifications.getDeliveredNotifications()).notifications.map(item=>({id:item.id,fingerprint:item.extra?.nexusReminderFormat==='delivery-v1'?item.extra.fingerprint:undefined})),
  cancel:async id=>{await LocalNotifications.cancel({notifications:[{id}]})},
  schedule:async(source,item,fingerprint)=>{
    // Some plugin versions prompt if schedule runs without permission. Check
    // immediately before schedule; explicit requests stay in the UI handler.
    if(permission((await LocalNotifications.checkPermissions()).display)!=='granted')throw new Error('Notification permission is unavailable')
    // 8.3's default exact schedule can open Android settings from a background
    // reconciliation. Explicit inexact requests avoid that permission flow.
    await LocalNotifications.schedule({notifications:[{id:item.nativeId,title:source.title||'Reminder',body:source.msg||'',isExactNotification:false,isExactMandatory:false,schedule:{at:new Date(item.snoozeUntil||item.datetime)},extra:{nexusReminderFormat:'delivery-v1',reminderId:source.id,fingerprint}}]})
  },
}:undefined
export const mobileReminderController=createBrowserReminderController({client:'mobile',store:useApp,native,resume:refresh=>{
  if(!nativeAvailable)return()=>{}
  let active=true,remove:(()=>void)|undefined
  void CapacitorApp.addListener('appStateChange',state=>{if(active&&state.isActive)refresh()}).then(handle=>{
    if(!active)void handle.remove();else remove=()=>{void handle.remove()}
  }).catch(()=>{})
  return()=>{active=false;remove?.()}
}})
export const useReminderApplication=mobileReminderController.useApplication
export const mobileReminderService={
  async syncPermissions():Promise<ReminderPermissionSync>{
    const state=native?await native.permission():'unknown'
    return {nativeAvailable,permission:state,canSchedule:state==='granted'}
  },
  async requestPermissions():Promise<ReminderPermissionSync>{
    if(!native)return {nativeAvailable:false,permission:'unknown',canSchedule:false}
    const state=permission((await LocalNotifications.requestPermissions()).display)
    await mobileReminderController.refresh()
    return {nativeAvailable:true,permission:state,canSchedule:state==='granted'}
  },
  async rescheduleFromStore(_reminders?:unknown){await mobileReminderController.refresh();return this.getStatus()},
  getStatus():ReminderHealthStatus {
    const state=mobileReminderController.getStatus()
    let quiet=false
    try {quiet=Boolean(JSON.parse(localStorage.getItem('nx-mobile-reminder-quiet-hours')||'null')?.enabled)} catch {quiet=true}
    const next=useApp.getState().reminders.filter(item=>!item.done).map(item=>item.snoozeUntil||item.datetime).sort((a,b)=>Date.parse(a)-Date.parse(b))[0]||null
    return {nativeAvailable,permission:state.permission,fallback:!nativeAvailable||state.permission!=='granted'||quiet||Boolean(state.error),scheduled:state.scheduled,nextReminderAt:next,lastRescheduleAt:state.lastReconcileAt,lastRescheduleReason:state.error||(state.blocked?'RECOVERY_PENDING':quiet?'QUIET_HOURS_FOREGROUND_ONLY':state.ready?'OK':'NOT_READY'),uncertain:state.uncertain}
  },
  async openSystemSettings():Promise<boolean>{return false},
}
