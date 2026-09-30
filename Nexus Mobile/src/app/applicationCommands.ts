import { createApplicationCommandOwner, type ApplicationSnapshot } from '@nexus/core/application/applicationCommands'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import { planningStore } from '../store/planningStore'
import { mutateMobileWorkspaceSources } from './workspaceHandoff'

export const applicationCommands = createApplicationCommandOwner({
  isFrozen: workspaceOperation.isActive, id: () => crypto.randomUUID(), now: () => new Date().toISOString(),
  expected: () => { const { generation, revision } = planningStore.capturePlanning(); return { generation, revision } },
  transaction: async builder => { await mutateMobileWorkspaceSources((state, planning) => builder({ state, planning } as ApplicationSnapshot) as any) },
})
