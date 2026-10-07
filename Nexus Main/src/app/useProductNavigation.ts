import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { planningCommands, planningStore } from '../store/planningStore'
import { isViewCommandScopeActive, useActiveViewCommandScope } from './ViewCommandScope'
import { productNavigation } from './productNavigation'
import type { ProductTarget } from '../views/product/productAttention'

export function openProductTarget(target: ProductTarget, navigate?: (view: string) => void) {
  if (!navigate || workspaceOperation.isActive()) return
  productNavigation.request(target, planningStore.getSnapshot().generation)
  navigate(target.kind === 'agenda' ? 'calendar' : target.kind === 'task' ? 'tasks' : 'reminders')
}

export function useProductNavigationTarget<K extends ProductTarget['kind']>(kind: K, handler: (target: Extract<ProductTarget, { kind: K }>) => boolean) {
  const active = useActiveViewCommandScope()
  const request = useSyncExternalStore(productNavigation.subscribe, productNavigation.getSnapshot)
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const latest = useRef(handler); latest.current = handler
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!request || request.target.kind !== kind || !isViewCommandScopeActive(active)) return
    let cancelled = false
    void planningCommands.ready().then(() => {
      if (cancelled || !isViewCommandScopeActive(active)) return
      const state = productNavigation.consume(request, planningStore.getSnapshot().generation, true)
      if (state === 'pending') return
      setMessage(state === 'stale' ? 'Der Workspace hat sich geändert. Bitte das Ziel erneut öffnen.' : latest.current(request.target as Extract<ProductTarget, { kind: K }>) ? '' : 'Dieses Ziel ist nicht mehr verfügbar. Bitte die aktuelle Übersicht öffnen.')
    }).catch(() => { if (!cancelled) setMessage('Das Ziel konnte nicht geladen werden. Bitte die Übersicht erneut öffnen.') })
    return () => { cancelled = true }
  }, [request, kind, active, operation])
  return message
}
