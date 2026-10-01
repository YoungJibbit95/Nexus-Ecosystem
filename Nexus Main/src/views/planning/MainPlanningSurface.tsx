import React from 'react'
import { PlanningPanel } from '@nexus/core/planning/PlanningPanel'
import type { TaskRecord } from '@nexus/core/planning/domain'
import { useApp } from '../../store/appStore'
import { usePlanningNavigation } from '@nexus/core/planning/planningNavigation'
import { planningCommands, usePlanning, usePlanningError } from '../../store/planningStore'
import { useCanvas } from '../../store/canvasStore'
import type { EntityCatalog } from '@nexus/core/planning/entityLinks'
import { requestEntityNavigation } from '@nexus/core/planning/entityNavigation'

export function MainPlanningSurface(props: { selectedDay?: string; initialTaskId?: string; initialStart?: string; onDayChange?: (day: string) => void; onOpenTask?: (id: string) => void; setView?: (view: string) => void }) {
  const tasks = useApp(state => state.tasks), reminders = useApp(state => state.reminders)
  const notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases)
  const request = usePlanningNavigation('main')
  return <PlanningPanel dayFirst entityCatalog={{ notes, canvases } as unknown as EntityCatalog} onOpenEntity={props.setView ? ref => { requestEntityNavigation('main', ref); props.setView?.(ref.kind === 'note' ? 'notes' : 'canvas') } : undefined} initialTaskId={request?.taskId} initialStart={request?.localStart} initialMode={request?.mode} initialTitle={request?.initialTitle} requestId={request?.requestId} {...props} tasks={tasks as unknown as TaskRecord[]} reminders={reminders} planning={usePlanning()} execute={planningCommands.execute} initialize={planningCommands.ready} storageError={usePlanningError()} />
}
