import { useSyncExternalStore } from 'react'
import { draftRegistry } from '../storage/draftRegistry'

export type PlanningNavigationRequest = { requestId: string; generation: number; mode: 'schedule' | 'task' | 'event'; taskId?: string; localStart?: string; initialTitle?: string }
const requests: Record<'main' | 'mobile', PlanningNavigationRequest | null> = { main: null, mobile: null }
const listeners = new Set<() => void>()
/** Navigation intent only. No record is created and no saved acknowledgement is implied. */
export function requestPlanningNavigation(client: 'main' | 'mobile', request: Omit<PlanningNavigationRequest, 'requestId' | 'generation'>) {
  requests[client] = { ...request, requestId: crypto.randomUUID(), generation: draftRegistry.getGeneration() }
  listeners.forEach(listener => listener())
  return requests[client]!
}
export function consumePlanningNavigation(client: 'main' | 'mobile', request: PlanningNavigationRequest, active: boolean) {
  if (!active || requests[client] !== request) return 'pending' as const
  requests[client] = null; listeners.forEach(listener => listener())
  return request.generation === draftRegistry.getGeneration() ? 'ready' as const : 'stale' as const
}
export const usePlanningNavigation = (client: 'main' | 'mobile') => useSyncExternalStore(
  listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => requests[client], () => requests[client],
)
