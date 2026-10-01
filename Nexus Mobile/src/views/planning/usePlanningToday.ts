import { useEffect, useMemo, useState } from 'react'
import { selectPlanningToday } from '@nexus/core/planning/today'
import { zonedDate, type TaskRecord } from '@nexus/core/planning/domain'
import { planningDayHorizon } from '@nexus/core/planning/planningTime'
import { useApp } from '../../store/appStore'
import { planningCommands, usePlanning } from '../../store/planningStore'

export function usePlanningToday() {
  const planning = usePlanning(), tasks = useApp(state => state.tasks), reminders = useApp(state => state.reminders)
  const [now, setNow] = useState(() => new Date().toISOString())
  useEffect(() => { void planningCommands.ready().catch(() => {}) }, [])
  useEffect(() => {
    const refresh = () => setNow(new Date().toISOString())
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  return useMemo(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', day = zonedDate(now, timeZone)
    return selectPlanningToday({ tasks: tasks as unknown as TaskRecord[], planning, reminders, day, timeZone, horizon: planningDayHorizon(day, timeZone), now })
  }, [tasks, reminders, planning, now])
}
