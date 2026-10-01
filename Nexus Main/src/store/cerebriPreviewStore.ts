import { createPreviewFlow } from '@nexus/core/planning/cerebri/previewFlow'
import type { PreviewHostPort } from '@nexus/core/planning/cerebri/inputContracts'
import { planningCommands, planningStore } from './planningStore'

const disabledHost: PreviewHostPort = {
  preview: async () => ({ result: { status: 'unavailable', reason: 'disabled' }, ticket: null, coverage: null }),
  revalidate: async () => ({ status: 'unavailable' }), invalidate() {},
}
/** Same canonical store and persistence command owner used by manual planning.
 * Host is an explicit trusted composition dependency. No product registration yet.
 */
export function createMainCerebriPreviewStore(host: PreviewHostPort = disabledHost, enabled = false) {
  const flow = createPreviewFlow({ enabled, host, capture: planningStore.captureCommandSnapshot,
    execute: command => planningCommands.execute(command), id: () => crypto.randomUUID() })
  return { ...flow, ready: planningCommands.ready }
}
export const cerebriPreviewStore = createMainCerebriPreviewStore()
export type MainCerebriPreviewStore = ReturnType<typeof createMainCerebriPreviewStore>
