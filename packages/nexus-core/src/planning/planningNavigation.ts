import { useSyncExternalStore } from 'react'

export type PlanningNavigationRequest = { requestId: string; mode: 'schedule' | 'task' | 'event'; taskId?: string; localStart?: string; initialTitle?: string }
const requests: Record<'main' | 'mobile', PlanningNavigationRequest | null> = { main: null, mobile: null }
const listeners = new Set<() => void>()
/** Navigation intent only. No record is created and no saved acknowledgement is implied. */
export function requestPlanningNavigation(client: 'main' | 'mobile', request: Omit<PlanningNavigationRequest, 'requestId'>) {
  requests[client] = { ...request, requestId: crypto.randomUUID() }
  listeners.forEach(listener => listener())
  return requests[client]!
}
export const usePlanningNavigation = (client: 'main' | 'mobile') => useSyncExternalStore(
  listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => requests[client], () => requests[client],
)
