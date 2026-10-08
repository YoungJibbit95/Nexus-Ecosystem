import { useEffect, useState, useSyncExternalStore } from 'react'
import { validEntityRef, type EntityRef } from './entityLinks'
import { draftRegistry } from '../storage/draftRegistry'
import { workspaceOperation } from '../storage/workspaceOperation'

type Client = 'main' | 'mobile'
// A whole Canvas is a library destination, never a new persisted Task context kind.
export type EntityNavigationTarget = EntityRef | { kind: 'canvas'; id: string }
export type EntityNavigationRequest = { requestId: string; ref: EntityNavigationTarget; generation: number }
const requests: Record<Client, EntityNavigationRequest | null> = { main: null, mobile: null }
const listeners = new Set<() => void>()
export function requestEntityNavigation(client: Client, ref: EntityNavigationTarget) {
  if (!validEntityRef(ref) && !(ref?.kind === 'canvas' && typeof ref.id === 'string' && ref.id)) throw new Error('A typed entity reference is required')
  if (workspaceOperation.isActive()) return null
  requests[client] = { requestId: crypto.randomUUID(), ref: structuredClone(ref), generation: draftRegistry.getGeneration() }; listeners.forEach(listener => listener())
  return requests[client]!
}
export function consumeEntityNavigation(client: Client, requestId: string) {
  if (requests[client]?.requestId !== requestId) return false
  requests[client] = null; listeners.forEach(listener => listener()); return true
}
export const useEntityNavigation = (client: Client) => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => requests[client], () => requests[client])
export function entityNavigationState(client: Client, request: EntityNavigationRequest, active: boolean) {
  if (!active || workspaceOperation.isActive() || requests[client] !== request) return 'pending'
  return request.generation === draftRegistry.getGeneration() ? 'ready' : 'stale'
}

/** Cached targets consume only when their shell becomes active. Handler validates membership again. */
export function useEntityNavigationTarget<K extends EntityNavigationTarget['kind']>(client: Client, kind: K, handler: (ref: Extract<EntityNavigationTarget, { kind: K }>) => boolean, active?: boolean) {
  const request = useEntityNavigation(client)
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const generation = useSyncExternalStore(draftRegistry.subscribe, draftRegistry.getGeneration)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!request) return
    if (request.ref.kind !== kind) { if (request.generation === generation) setMessage(''); return }
    const view = kind === 'note' ? 'notes' : 'canvas'
    // Main supplies its existing command scope; retain the Mobile shell adapter.
    const shell = active === undefined ? document.querySelector(`${client === 'main' ? '.nx-v6-view-shell' : '.nx-mobile-v6-view-shell'}[data-view="${view}"]`) : null
    const consume = () => {
      const state = entityNavigationState(client, request, active ?? (!shell || shell.getAttribute('data-active') === 'true'))
      if (state === 'pending') return
      if (state === 'stale') { consumeEntityNavigation(client, request.requestId); setMessage('Der Workspace hat sich geändert. Bitte den Kontext erneut öffnen.'); return }
      try {
        if (handler(request.ref as Extract<EntityNavigationTarget, { kind: K }>)) { consumeEntityNavigation(client, request.requestId); setMessage('') }
      } catch { consumeEntityNavigation(client, request.requestId); setMessage('Der Kontext konnte nicht geöffnet werden. Deine Inhalte bleiben erhalten.') }
    }
    consume()
    if (!shell) return
    const observer = new MutationObserver(consume); observer.observe(shell, { attributes: true, attributeFilter: ['data-active'] }); return () => observer.disconnect()
  }, [client, kind, request, handler, active, generation, operation])
  return message
}
