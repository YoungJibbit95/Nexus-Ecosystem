import { createBrowserReminderController } from '@nexus/core/reminders/browserReminderController'
import { useApp } from '../store/appStore'

export const reminderController=createBrowserReminderController({client:'main',store:useApp,notify:async reminder=>{
  // Electron acknowledges a show request, not device delivery; without the
  // bridge the persistent application overlay is the foreground capability.
  await (window as any).api?.notify(reminder.title,reminder.msg)
}})
export const reminderService=reminderController
export const useReminderApplication=reminderService.useApplication
