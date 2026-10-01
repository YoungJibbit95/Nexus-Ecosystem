import React from 'react'
import { PlanningTodayCard } from '@nexus/core/planning/PlanningTodayCard'
import { requestPlanningNavigation } from '@nexus/core/planning/planningNavigation'
import { usePlanningToday } from './usePlanningToday'

export function MainPlanningTodayCard({ setView }: { setView?: (view: string) => void }) {
  return <PlanningTodayCard today={usePlanningToday()} onOpenAgenda={() => setView?.('calendar')} onSchedule={taskId => { requestPlanningNavigation('main', { mode: 'schedule', taskId, localStart: '' }); setView?.('calendar') }} />
}
