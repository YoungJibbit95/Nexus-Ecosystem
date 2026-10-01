import { useSyncExternalStore } from 'react'
import { createBrowserPlanningStore } from '@nexus/core/planning/browserPlanningStore'
import { awaitHydration } from '@nexus/core/storage/awaitHydration'
import type { TaskRecord } from '@nexus/core/planning/domain'
import { useApp } from './appStore'
import { useCanvas } from './canvasStore'
import { resolveEntity, type EntityCatalog } from '@nexus/core/planning/entityLinks'

export const planningStore = createBrowserPlanningStore('main', {
  initialize: () => awaitHydration([useApp, useCanvas]),
  resolveEntity: ref => resolveEntity({ notes: useApp.getState().notes, canvases: useCanvas.getState().canvases } as unknown as EntityCatalog, ref),
  getTasks: () => useApp.getState().tasks as unknown as TaskRecord[],
  getReminders: () => useApp.getState().reminders,
  applyTasks: tasks => useApp.setState({ tasks: tasks as any }),
})
export const planningCommands = planningStore.commandOwner
export const usePlanning = () => useSyncExternalStore(planningStore.subscribe, planningStore.getSnapshot, planningStore.getSnapshot)
export const usePlanningError = () => useSyncExternalStore(planningStore.subscribe, planningStore.getError, planningStore.getError)
