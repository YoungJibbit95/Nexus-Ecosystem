import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { persistenceRegistry } from '@nexus/core/storage/browserPersistence'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import type { TaskRecord } from '@nexus/core/planning/domain'
import { useActiveViewCommandScope } from '../../app/ViewCommandScope'
import { useApp } from '../../store/appStore'
import { planningCommands, usePlanning, usePlanningError } from '../../store/planningStore'
import { readProductAttention } from './productAttention'

const hasStorageError = () => persistenceRegistry.getStatuses().some(status => Boolean(status.error))
export function useProductOverview() {
  const active = useActiveViewCommandScope()
  const tasks = useApp(state => state.tasks), reminders = useApp(state => state.reminders)
  const planning = usePlanning(), error = usePlanningError()
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const storageError = useSyncExternalStore(persistenceRegistry.subscribe, hasStorageError)
  const [clock, setClock] = useState(() => ({ now: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }))
  const [ready, setReady] = useState(false), [loadError, setLoadError] = useState('')
  const retry = useCallback(async () => {
    setLoadError(''); setClock(value => ({ ...value }))
    try { await planningCommands.ready(); setReady(true) } catch { setLoadError('Die Planung konnte nicht geladen werden.') }
  }, [])
  useEffect(() => { if (active) void retry() }, [active, retry])
  useEffect(() => {
    if (!active || operation.kind !== 'idle') return
    const refresh = () => { if (document.visibilityState !== 'hidden') setClock({ now: new Date().toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' }) }
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [active, operation.kind])
  const projection = useMemo(() => active && ready ? readProductAttention({ tasks: tasks as unknown as TaskRecord[], reminders, planning, ...clock }) : { overview: null, error: '' }, [active, ready, tasks, reminders, planning, clock])
  return { overview: projection.overview, ready, error: projection.error || loadError || error, storageError, operation, retry }
}
