import React from 'react'
import { createRoot } from 'react-dom/client'
import { useChecker as useMainChecker } from '../../Nexus Main/src/views/reminders/reminderHelpers'
import { ReminderDeliveryFixtureChecker as useMobileChecker } from '../../Nexus Mobile/src/views/RemindersView'
import { mobileReminderService } from '../../Nexus Mobile/src/lib/mobileReminderService'

const root = createRoot(document.getElementById('root')!)
const settle = () => new Promise(resolve => setTimeout(resolve, 120))
const calls: string[] = []
const results: unknown[] = []
;(window as any).__reminderFixtureStore = {
  reminders: [{id:'isolated-due',title:'Synthetic',msg:'',datetime:'2020-01-01T00:00:00Z',repeat:'daily',done:false}],
  doneRem() {}, snoozeRem() {},
}
;(window as any).api = {notify: () => calls.push('foreground-notify')}
localStorage.clear()
function MainOwner() { useMainChecker(() => {}); return null }
function MobileOwner() { useMobileChecker(() => {}, {enabled:false,start:'22:00',end:'07:00'}); return null }
async function run() {
  await settle()
  results.push({probe:'outside-reminder-view',calls:[...calls]})
  root.render(<MainOwner />); await settle()
  root.render(null); await settle()
  root.render(<MainOwner />); await settle()
  results.push({probe:'main-view-remount',calls:[...calls]})
  root.render(null); await settle()
  ;(window as any).Capacitor = {Plugins:{LocalNotifications:{
    checkPermissions: async () => {calls.push('check-permissions');return {display:'prompt'}},
    requestPermissions: async () => {calls.push('request-permissions');return {display:'granted'}},
    cancel: async () => {calls.push('cancel')}, schedule: async () => {calls.push('schedule')},
  }}}
  ;(window as any).__reminderFixtureStore.reminders = [{id:'isolated-future',title:'Synthetic',msg:'',datetime:'2030-01-01T00:00:00Z',repeat:'daily',done:false}]
  root.render(<MobileOwner />); await settle()
  results.push({probe:'mobile-view-mount-permission',calls:[...calls],status:mobileReminderService.getStatus()})
  root.render(null); await settle()
  return {ok:true,zone:Intl.DateTimeFormat().resolvedOptions().timeZone,results,checks:[]}
}
run().then(result => {(window as any).reminderTimeTestResult=result}).catch(error => {(window as any).reminderTimeTestResult={ok:false,error:error.stack,results}})
