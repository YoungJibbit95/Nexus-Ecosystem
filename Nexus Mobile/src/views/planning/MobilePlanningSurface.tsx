import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { PlanningPanel } from '@nexus/core/planning/PlanningPanel'
import { zonedDate, type TaskRecord } from '@nexus/core/planning/domain'
import { consumePlanningNavigation, usePlanningNavigation, type PlanningNavigationRequest } from '@nexus/core/planning/planningNavigation'
import { draftRegistry } from '@nexus/core/storage/draftRegistry'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'
import type { EntityCatalog } from '@nexus/core/planning/entityLinks'
import { useApp } from '../../store/appStore'
import { useCanvas } from '../../store/canvasStore'
import { planningCommands, usePlanning, usePlanningError } from '../../store/planningStore'
import { isViewCommandScopeActive, useActiveViewCommandScope } from '../../app/ViewCommandScope'
import { openProductTarget, useProductNavigationTarget } from '../../app/useProductNavigation'
import { openMobileContext } from '../product/MobileContext'
import { MobileProductFrame, NavigationNotice } from '../product/MobileProductParts'

export function MobilePlanningSurface(props: { selectedDay?: string; onDayChange?: (day: string) => void; onOpenTask?: (id: string) => void; setView?: (view: string) => void }) {
  const active = useActiveViewCommandScope(), planning = usePlanning(), storageError = usePlanningError()
  const operation = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot)
  const generation = useSyncExternalStore(draftRegistry.subscribe, draftRegistry.getGeneration)
  const tasks = useApp(state => state.tasks), reminders = useApp(state => state.reminders), notes = useApp(state => state.notes), canvases = useCanvas(state => state.canvases)
  const request = usePlanningNavigation('mobile'), [intent, setIntent] = useState<PlanningNavigationRequest | null>(null)
  const [day, setDay] = useState(props.selectedDay || zonedDate(new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'))
  const [message, setMessage] = useState(''), [readSequence, setReadSequence] = useState(0), [ready, setReady] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const initialize = () => { setMessage(''); void planningCommands.ready().then(() => setReady(true)).catch(() => setMessage('Die Planung konnte nicht geladen werden. Bitte erneut laden.')) }
  useEffect(() => { initialize() }, [])
  useEffect(() => { if (props.selectedDay) setDay(props.selectedDay) }, [props.selectedDay])
  useEffect(() => {
    if (!request || !ready || !isViewCommandScopeActive(active)) return
    const result = consumePlanningNavigation('mobile', request, true)
    if (result === 'pending') return
    if (result === 'stale') { setMessage('Der Workspace hat sich geändert. Bitte die Aufgabe erneut zur Planung öffnen.'); return }
    if (request.taskId && tasks.filter(task => task.id === request.taskId).length !== 1) { setMessage('Diese Aufgabe ist nicht mehr eindeutig verfügbar.'); return }
    setMessage(''); setIntent(request)
  }, [request, active, ready, operation, generation, tasks])
  const navigationMessage = useProductNavigationTarget('agenda', target => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(target.day)) return false
    setDay(target.day); props.onDayChange?.(target.day); setIntent(null); setReadSequence(value => value + 1)
    requestAnimationFrame(() => heading.current?.focus()); return true
  })
  const validIntent = intent?.generation === generation ? intent : null
  return <>
    <NavigationNotice message={navigationMessage || message} />
    <MobileProductFrame><h2 ref={heading} tabIndex={-1}>Dein Tag. Bewusst geplant.</h2><details><summary>Manuell planen</summary><p>Du wählst Zeit und Dauer. Zeitvorschläge sind auf Mobile nicht verfügbar. Aufgabenfristen und Kalenderabdeckung werden nicht geschätzt.</p></details>{!ready && <><p role="status">Planung wird geladen …</p>{message && <button type="button" onClick={initialize}>Erneut laden</button>}</>}</MobileProductFrame>
    <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }} disabled={!ready || operation.kind !== 'idle'}>
      <PlanningPanel key={`${planning.generation}:${generation}:${readSequence}`} dayFirst compact entityCatalog={{ notes, canvases } as unknown as EntityCatalog}
        onOpenEntity={ref => openMobileContext(ref, props.setView)} selectedDay={day} onDayChange={value => { setDay(value); props.onDayChange?.(value) }}
        onOpenTask={id => props.onOpenTask ? props.onOpenTask(id) : openProductTarget({ kind: 'task', id }, props.setView)}
        initialTaskId={validIntent?.taskId} initialStart={validIntent?.localStart} initialMode={validIntent?.mode} initialTitle={validIntent?.initialTitle} requestId={validIntent?.requestId}
        tasks={tasks as unknown as TaskRecord[]} reminders={reminders} planning={planning} execute={planningCommands.execute} initialize={planningCommands.ready} storageError={storageError} />
    </fieldset>
  </>
}
