import { useEffect, useSyncExternalStore } from 'react'
import { validEntityRef, type EntityRef } from './entityLinks'

type Client = 'main' | 'mobile'
export type EntityNavigationRequest = { requestId: string; ref: EntityRef }
const requests: Record<Client, EntityNavigationRequest | null> = { main: null, mobile: null }
const listeners = new Set<() => void>()
export function requestEntityNavigation(client: Client, ref: EntityRef) {
  if (!validEntityRef(ref)) throw new Error('A typed entity reference is required')
  requests[client] = { requestId: crypto.randomUUID(), ref: structuredClone(ref) }; listeners.forEach(listener => listener())
  return requests[client]!
}
export function consumeEntityNavigation(client: Client, requestId: string) {
  if (requests[client]?.requestId !== requestId) return false
  requests[client] = null; listeners.forEach(listener => listener()); return true
}
export const useEntityNavigation = (client: Client) => useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener) } }, () => requests[client], () => requests[client])

/** Cached targets consume only when their shell becomes active. Handler validates membership again. */
export function useEntityNavigationTarget(client: Client, kind: EntityRef['kind'], handler: (ref: EntityRef) => boolean) {
  const request = useEntityNavigation(client)
  useEffect(() => {
    if (!request || request.ref.kind !== kind) return
    const view = kind === 'note' ? 'notes' : 'canvas'
    const shell = document.querySelector(`${client === 'main' ? '.nx-v6-view-shell' : '.nx-mobile-v6-view-shell'}[data-view="${view}"]`)
    const consume = () => { if ((!shell || shell.getAttribute('data-active') === 'true') && handler(request.ref)) consumeEntityNavigation(client, request.requestId) }
    consume()
    if (!shell) return
    const observer = new MutationObserver(consume); observer.observe(shell, { attributes: true, attributeFilter: ['data-active'] }); return () => observer.disconnect()
  }, [client, kind, request, handler])
}
