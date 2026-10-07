import type { ProductTarget } from '../views/product/productAttention'

export type ProductNavigationRequest = { sequence: number; generation: string; target: ProductTarget }
/** Ephemeral selection, never workspace data. A new request supersedes an older one. */
export function createProductNavigation() {
  let sequence = 0, request: ProductNavigationRequest | null = null
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(listener => listener())
  return {
    getSnapshot: () => request,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    request(target: ProductTarget, generation: string) { request = { sequence: ++sequence, generation, target: { ...target } }; notify(); return request },
    consume(expected: ProductNavigationRequest, generation: string, active: boolean) {
      if (!active || request !== expected) return 'pending' as const
      request = null; notify()
      return expected.generation === generation ? 'ready' as const : 'stale' as const
    },
  }
}
export const productNavigation = createProductNavigation()
