import { useMemo } from 'react'
import { readContextRelations } from '@nexus/core/planning/contextRelations'
import type { TaskRecord } from '@nexus/core/planning/domain'
import type { EntityCatalog } from '@nexus/core/planning/entityLinks'
import { useApp } from '../../store/appStore'
import { useCanvas } from '../../store/canvasStore'

// All mounted context surfaces reuse one index for the same canonical references.
let cached: { tasks: unknown; notes: unknown; canvases: unknown; value: ReturnType<typeof readContextRelations> } | undefined
export function selectContextRelations(tasks: unknown, notes: unknown, canvases: unknown) {
  if (!cached || cached.tasks !== tasks || cached.notes !== notes || cached.canvases !== canvases) {
    cached = { tasks, notes, canvases, value: readContextRelations(tasks as TaskRecord[], { notes, canvases } as EntityCatalog) }
  }
  return cached.value
}
export function useContextRelations() {
  const tasks = useApp(state => state.tasks), notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases)
  return useMemo(() => selectContextRelations(tasks, notes, canvases), [tasks, notes, canvases])
}
