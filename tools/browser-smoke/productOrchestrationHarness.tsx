import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import '../../Nexus Main/src/index.css'
import '../../Nexus Main/src/app/NexusV6ViewShell.css'
import { MainViewHost } from '../../Nexus Main/src/app/mainViewHost'
import { MainShellLayout } from '../../Nexus Main/src/app/MainShellLayout'
import { useApp } from '../../Nexus Main/src/store/appStore'
import { useCanvas } from '../../Nexus Main/src/store/canvasStore'
import { useTheme } from '../../Nexus Main/src/store/themeStore'
import { planningCommands, planningStore } from '../../Nexus Main/src/store/planningStore'
import { openProductTarget } from '../../Nexus Main/src/app/useProductNavigation'
import { productNavigation } from '../../Nexus Main/src/app/productNavigation'
import { getApplicationCapture } from '../../packages/nexus-core/src/application/captureNavigation'
import { emptyPlanningDocument, zonedDate } from '../../packages/nexus-core/src/planning/domain'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { ProductStatus } from '../../Nexus Main/src/views/product/ProductOverviewParts'
import { hexToRgb } from '../../Nexus Main/src/lib/utils'

const root = createRoot(document.getElementById('root')!), checks: string[] = []
const pause = () => new Promise(resolve => setTimeout(resolve, 50))
const wait = async (condition: () => unknown, label: string) => { for (let n = 0; n < 400; n++) { if (condition()) { await pause(); return }; await pause() }; throw new Error(`Timed out: ${label}`) }
const assert = (value: unknown, label: string) => { if (!value) throw new Error(label); checks.push(label) }
const views = ['dashboard','flux','tasks','reminders','calendar','notes','canvas'] as any
let cachedViews = views
const initialTheme = { mode: useTheme.getState().mode, accent: useTheme.getState().accent, bg: useTheme.getState().bg }
let view = 'dashboard'
const navigate = (next: string) => { view = next; render() }
const active = () => document.querySelector<HTMLElement>(`.nx-v6-view-shell[data-view="${view}"][data-active="true"]`)!
const overview = () => active()?.querySelector<HTMLElement>('[data-product-overview]')
const render = () => flushSync(() => root.render(<Frame />))
function Frame() {
  const theme = useTheme()
  return <MainShellLayout theme={theme} lowPowerMode={false} motionCssVars={{}} backgroundStyles={{ background: theme.bg }} accentRgb={hexToRgb(theme.accent)} accent2Rgb={hexToRgb(theme.accent2)} sidebarLeft sidebarAutoHideEnabled={false} sidebarExpanded effectiveSidebarWidth={190} toolbarBottom={false} toolbarVisible={false} terminalOpen={false} view={view as any} availableViews={views} viewGuardState={{checking:false,blockedView:null,requiredTier:null,reason:null}} motionRuntime={{quickMs:0,pageInitial:false,pageAnimate:{opacity:1},pageExit:{opacity:1},pageTransition:{duration:0}}} onRequestViewChange={navigate} onPrefetchView={() => {}} onSidebarAutoPeek={() => {}} mainViewNode={<MainViewHost view={view as any} mountedViews={cachedViews} availableViews={views} reducedMotion onRequestViewChange={navigate} onPrefetchView={() => {}} onOpenWalkthrough={() => {}} />} />
}
const go = async (next: string) => { navigate(next); await wait(() => active() && !active().textContent?.includes('Lade View...') && (['dashboard','flux'].includes(next) ? overview()?.hasAttribute('data-today-tasks') : active().querySelector('input,button')), next); await pause() }
const click = (label: string, container: Element = active()) => { const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === label && button.checkVisibility() && !button.disabled); assert(button, `Rendered button: ${label}`); flushSync(() => button!.click()) }
const named = (label: string) => active().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!
const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.activeElement || document.body) => { const event = new KeyboardEvent('keydown', {key,bubbles:true,cancelable:true,...init}); flushSync(() => target.dispatchEvent(event)); return event.defaultPrevented }
const change = (input: HTMLInputElement | HTMLSelectElement, value: string) => { const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; flushSync(() => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})) }) }
const task = (id: string, title: string, extra = {}) => ({ id,title,desc:'Synthetic product fixture',status:'todo',priority:'mid',tags:[],subtasks:[],created:new Date().toISOString(),updated:new Date().toISOString(),...extra })
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone, day = zonedDate(new Date().toISOString(), zone)
const at = (offset: number) => new Date(Date.now() + offset * 60_000).toISOString()
async function seed(empty = false) {
  const planning = emptyPlanningDocument('product-fixture')
  if (!empty) {
    planning.blocks = [{id:'current-block',taskId:'current',start:at(-20),end:at(40),timeZone:zone,revision:1,provenance:'manual',locked:false,state:'active',acceptedIssues:[]}]
    planning.events = [{id:'next-event',title:'Projektgespräch – nächste Entscheidungen',start:at(80),end:at(110),timeZone:zone,revision:1,allDay:false,source:{kind:'manual'}}]
  }
  useApp.setState({ tasks: empty ? [] : [task('current','Konzept für den nächsten Release ausarbeiten'), task('urgent','Angebot prüfen und Rückfragen klären',{priority:'high',deadline:at(-90),linkedNoteId:'context'}),task('blocked','Freigabe für das neue Material abwarten',{blocked:true,blockedReason:'Rückmeldung des Teams fehlt'}), task('civil','Entwurf mit sehr langem Titel: Entscheidungen und offene Fragen für den nächsten gemeinsamen Projektschritt dokumentieren',{deadline:day,deadlineTimeZone:zone})] as any, reminders: empty ? [] : [{id:'reminder',title:'Rückruf beim Projektpartner',msg:'Notiz bereithalten',datetime:at(-15),repeat:'none',done:false,created:at(-200)}] as any, notes: [{id:'context',title:'Projektkontext',content:'Nachvollziehbare Entscheidungen',tags:[],created:at(-300),updated:at(-1),dirty:false}],activities:[],codes:[] })
  await planningStore.restorePlanning(planning)
  await persistenceRegistry.flush()
}
async function interactions() {
  const planningBefore = JSON.stringify(planningStore.capturePlanning())
  await go('dashboard')
  assert(overview()?.textContent?.includes('Konzept für den nächsten Release'), 'Dashboard shows actual current commitment')
  assert(overview()?.querySelector('[data-product-commitment="event:next-event"]'), 'Dashboard shows actual next commitment')
  assert(overview()?.querySelector('.nx-product-attention')?.textContent?.includes('Angebot prüfen'), 'A current commitment does not hide a separate urgent Task')
  click('Aufgabe öffnen')
  await wait(() => active().querySelector('.nx-task-modal-sheet'), 'exact Task modal')
  assert(active().querySelector<HTMLInputElement>('input[placeholder="Task title…"]')?.value === 'Konzept für den nächsten Release ausarbeiten', 'Current commitment opens its exact Task')
  press('Escape'); await wait(() => !active().querySelector('.nx-task-modal-sheet'), 'close Task')
  await wait(() => document.activeElement === active().querySelector('input[placeholder="Search tasks..."]'), 'Task focus return after exit transition')
  assert(document.activeElement === active().querySelector('input[placeholder="Search tasks..."]'), 'Cross-view Task Escape returns to visible local search')
  await go('flux'); named('Erinnerung öffnen: Rückruf beim Projektpartner').click()
  await wait(() => active().querySelector('[role="dialog"]'), 'exact reminder modal')
  assert([...active().querySelectorAll<HTMLInputElement>('input')].some(input => input.value === 'Rückruf beim Projektpartner'), 'Flux opens exact Reminder independently of view filters')
  const dialog = active().querySelector('[role="dialog"]')!, controls = [...dialog.querySelectorAll<HTMLElement>('button,input,select,textarea')].filter(item => item.checkVisibility() && !(item as HTMLButtonElement).disabled)
  controls[controls.length - 1].focus(); assert(press('Tab') && document.activeElement === controls[0], 'Reminder dialog contains keyboard focus')
  press('Escape'); await wait(() => !active().querySelector('[role="dialog"]'), 'close reminder')
  await wait(() => document.activeElement === active().querySelector('input'), 'Reminder focus return after exit transition')
  assert(document.activeElement === active().querySelector('input'), `Reminder Escape returns to visible local search (actual: ${document.activeElement?.outerHTML.slice(0,200)})`)
  await go('flux'); named('Zeit planen: Angebot prüfen und Rückfragen klären').click()
  await wait(() => active().querySelector('.nx-agenda-editor-layer:not([hidden]) .nx-agenda-editor'), 'schedule selected task')
  await wait(() => active().querySelector<HTMLSelectElement>('[aria-label="Aufgabe für Arbeitsblock"]')?.value === 'urgent', 'selected task reaches planning form')
  assert([...active().querySelectorAll<HTMLSelectElement>('select')].some(select => select.value === 'urgent'), 'Flux schedule selects the exact Task')
  press('Escape'); await go('dashboard'); click('Heutige Agenda')
  await wait(() => active().querySelector('.nx-agenda-workspace') && !active().querySelector('.nx-agenda-editor-layer:not([hidden]) .nx-agenda-editor'), 'read-only Agenda')
  assert(active().textContent?.includes('Agenda'), 'Today opens Agenda without replaying old planning editor')
  openProductTarget({kind:'agenda',day:'2026-11-03'},navigate); await pause(); await go('dashboard'); click('Heutige Agenda'); await pause()
  assert(active().querySelector<HTMLInputElement>('input[type="date"]')?.value === day, 'Today resets an unrelated selected civil day')
  await go('flux'); named('Zeit planen: Angebot prüfen und Rückfragen klären').click(); await wait(() => active().querySelector('.nx-agenda-editor-layer:not([hidden]) .nx-agenda-editor'), 'schedule after day request')
  await wait(() => active().querySelector<HTMLSelectElement>('[aria-label="Aufgabe für Arbeitsblock"]')?.value === 'urgent', 'selected task after day intent')
  assert([...active().querySelectorAll<HTMLSelectElement>('select')].some(select => select.value === 'urgent'), 'New scheduling intent wins over an earlier read-only day intent'); press('Escape')
  await go('flux'); named('Notiz öffnen: Projektkontext').click(); await wait(() => view === 'notes' && useApp.getState().activeNoteId === 'context', 'typed Note context')
  assert(useApp.getState().activeNoteId === 'context', 'Flux opens linked Note context by identity')
  await go('dashboard')
  const pending = productNavigation.request({kind:'task',id:'urgent'},planningStore.getSnapshot().generation)
  await pause(); assert(productNavigation.getSnapshot() === pending, 'Cached hidden Tasks does not consume intent')
  await go('tasks'); await wait(() => active().querySelector('.nx-task-modal-sheet'), 'delayed task target'); press('Escape'); await wait(() => !active().querySelector('.nx-task-modal-sheet'), 'task close')
  openProductTarget({kind:'task',id:'urgent'},navigate); await wait(() => active().querySelector('.nx-task-modal-sheet'), 'repeat exact target'); assert(true,'Repeated same target opens again'); press('Escape'); await wait(() => !active().querySelector('.nx-task-modal-sheet'),'closed')
  openProductTarget({kind:'task',id:'deleted'},navigate); await wait(() => active().textContent?.includes('nicht mehr verfügbar'),'deleted target notice'); assert(!active().querySelector('.nx-task-modal-sheet'),'Deleted target never opens a new Task form')
  await go('dashboard'); productNavigation.request({kind:'task',id:'urgent'},'previous-generation'); await go('tasks'); await wait(() => active().textContent?.includes('Workspace hat sich geändert'),'stale target notice'); assert(!active().querySelector('.nx-task-modal-sheet'),'Workspace generation invalidates same-ID target')
  await go('flux'); const before = useApp.getState().tasks.length
  press('t',{ctrlKey:true,shiftKey:true},document.body); await wait(() => active().querySelector('.nx-agenda-editor-layer:not([hidden]) .nx-agenda-editor'),'keyboard task capture')
  assert(useApp.getState().tasks.length === before, 'Keyboard capture creates no placeholder before acknowledged submit'); press('Escape')
  await go('dashboard'); click('Neue Notiz'); await wait(() => getApplicationCapture('main'),'capture surface')
  const notesBefore = useApp.getState().notes.length; press('Escape'); await wait(() => !getApplicationCapture('main'),'cancel capture'); assert(useApp.getState().notes.length === notesBefore,'Cancelled Dashboard capture preserves sources')
  click('Neuer Termin'); await wait(() => active().querySelector('.nx-agenda-editor-layer:not([hidden]) input[aria-label="Planungsende"]'), 'Dashboard Event capture')
  assert(planningStore.capturePlanning().events.length === 1 && active().querySelector<HTMLInputElement>('[aria-label="Planungstitel"]')?.value === '', 'Dashboard Event capture opens a fresh unsaved PlanningCommand form'); press('Escape')
  assert(JSON.stringify(planningStore.capturePlanning()) === planningBefore, 'Dashboard/Flux Open, Plan and cancelled capture never write Planning data')
  await go('flux'); const search = overview()!.querySelector<HTMLInputElement>('input[type="search"]')!; search.focus(); change(search,'no-such-entry'); assert(overview()?.textContent?.includes('Keine Einträge für diese Filter'),'Filtered empty state explains how to recover'); change(search,''); search.blur()
  assert(press('f',{ctrlKey:true},document.body) && document.activeElement === search,'Flux Ctrl+F focuses its own search'); assert(!press('t',{ctrlKey:true,shiftKey:true},search),'Editable input retains capture shortcut')
  await go('dashboard'); assert(!press('t',{ctrlKey:true,shiftKey:true},document.body) && useApp.getState().tasks.length === before,'Cached hidden Flux cannot create or open capture')
  await workspaceOperation.run(async () => { assert(!press('t',{ctrlKey:true,shiftKey:true},document.body),'Workspace replacement pauses view commands') })
  await go('flux'); const selected = overview()!.querySelector<HTMLButtonElement>('[aria-pressed]')!; selected.click(); await pause(); assert(selected.getAttribute('aria-pressed') === 'true','Focus filter has visible and semantic selected state'); selected.click()
  await planningStore.restorePlanning(emptyPlanningDocument('large-attention-fixture'))
  useApp.setState({tasks:Array.from({length:53},(_,index)=>task(`many-${index}`,`Arbeit ${index}`)) as any,reminders:[]}); await pause()
  assert(overview()!.querySelectorAll('[data-product-item]').length === 50,'Large attention collections initially mount only 50 rows')
  click('Weitere Einträge anzeigen (3)'); await pause(); assert(overview()!.querySelectorAll('[data-product-item]').length === 53,'Explicit load more reveals remaining attention without changing sources')
  await seed()
  return checks
}
function geometry() {
  const product = overview()!, rect = product.getBoundingClientRect()
  const clipped = [...product.querySelectorAll<HTMLElement>('h1,h2,h3,p,button,input,select')].filter(element => element.checkVisibility() && (element.getBoundingClientRect().left < rect.left - 3 || element.getBoundingClientRect().right > rect.right + 3)).map(element => element.textContent?.slice(0,70))
  const smallTargets = [...product.querySelectorAll<HTMLElement>('button,input,select')].filter(element => element.checkVisibility() && element.getBoundingClientRect().height < 43).length
  return {view,width:innerWidth,height:innerHeight,clipped,smallTargets,documentOverflow:document.documentElement.scrollWidth > innerWidth + 2,accent:getComputedStyle(product).getPropertyValue('--nx-product-accent'),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}
}
async function setup() {
  await Promise.all([useApp.persist.rehydrate(),useCanvas.persist.rehydrate(),useTheme.persist.rehydrate()]); await planningCommands.ready(); await seed(); render(); await go('dashboard')
  return true
}
Object.assign(window, {
  productReady: setup(), productInteractions: interactions, productChecks: checks,
  productVisual: async (next: string, variant: string) => {
    if (variant === 'empty') await seed(true); else await seed()
    if (variant === 'non-urgent') { await planningStore.restorePlanning(emptyPlanningDocument('non-urgent')); useApp.setState({tasks:[task('later','Idee für den nächsten Workshop festhalten',{priority:'low'})] as any,reminders:[]}) }
    useTheme.setState({mode:variant === 'custom-light' ? 'light' : 'dark',accent:variant === 'custom-light' ? '#925400' : initialTheme.accent,bg:variant === 'custom-light' ? '#f4f1eb' : initialTheme.bg})
    if (variant === 'custom-light') {
      assert(await persistenceRegistry.flush(), 'Custom Theme durably saved')
      await useTheme.persist.rehydrate()
      assert(useTheme.getState().mode === 'light' && useTheme.getState().accent === '#925400' && useTheme.getState().bg === '#f4f1eb', 'Saved custom Theme survives rehydration')
    }
    await go(next); await pause(); return geometry()
  },
  productAgenda: async () => {
    await seed(); await go('flux'); named('Zeit planen: Angebot prüfen und Rückfragen klären').click()
    await wait(() => active().querySelector('.nx-agenda-editor-layer:not([hidden])') && active().querySelector<HTMLSelectElement>('[aria-label="Aufgabe für Arbeitsblock"]')?.value === 'urgent', 'Agenda visual handoff')
    const editor = active().querySelector<HTMLElement>('.nx-agenda-editor')!, rect = editor.getBoundingClientRect()
    const overflowing = [...editor.querySelectorAll<HTMLElement>('button,input,select')].filter(element => element.checkVisibility() && (element.getBoundingClientRect().left < 0 || element.getBoundingClientRect().right > innerWidth + 1))
    assert(rect.left >= 0 && rect.right <= innerWidth + 1 && overflowing.length === 0, 'Exact Task Agenda handoff fits the current viewport')
    return {width:innerWidth,height:innerHeight,selectedTask:'urgent',editorWidth:rect.width,overflow:overflowing.length}
  },
  productProjectionFailure: async (next: string) => {
    cachedViews = []; await seed(); await go(next)
    const layoutBefore = localStorage.getItem('nx-dashboard-layout-v3')
    flushSync(() => useApp.setState({ tasks: [task('legacy','Vorhandene Aufgabe',{dependsOnTaskIds:42})] as any }))
    await wait(() => overview()?.querySelector('[role="alert"]'), 'safe projection error')
    assert(Boolean(overview()) && !overview()!.hasAttribute('data-today-tasks') && !overview()!.textContent?.includes('Aktuell nichts zu klären'), `${next} projection failure is visible rather than an empty workload`)
    assert(localStorage.getItem('nx-dashboard-layout-v3') === layoutBefore && useApp.getState().tasks[0].id === 'legacy', `${next} failed read preserves records and widget preferences`)
    if (next === 'dashboard') assert([...overview()!.querySelectorAll<HTMLButtonElement>('button')].some(button => button.textContent === 'Widgets anpassen' && !button.disabled) && active().textContent?.includes('Projektkontext'), 'Dashboard retains widgets and layout controls after projection failure')
    return true
  },
  productProjectionRecovery: async (next: string) => {
    await seed(); await go(next); assert(overview()!.hasAttribute('data-today-tasks') && !overview()!.querySelector('[role="alert"]'), `${next} recovers when source data becomes readable`)
  },
  productGeometry: geometry,
  productStates: async () => {
    await seed(); await go('flux'); overview()!.querySelector<HTMLButtonElement>('[aria-pressed]')!.click(); await pause()
    active().querySelector('.nx-flux-v7')!.scrollTop = 0
    const search = overview()!.querySelector<HTMLInputElement>('input[type="search"]')!; search.focus()
    const hover = overview()!.querySelector<HTMLButtonElement>('header button')!.getBoundingClientRect()
    return {x:Math.round(hover.left+hover.width/2),y:Math.round(hover.top+hover.height/2)}
  },
  productFailure: async () => {
    await go('flux')
    persistenceRegistry.getStatuses = () => [{error:'Synthetic storage failure'}] as any
    render(); await pause()
    assert(overview()?.textContent?.includes('nicht sicher gespeichert'), 'Actual product surface displays persistence registry failure')
    return true
  },
  productStatus: async (kind: 'loading' | 'error') => {
    root.render(<section className="nx-product-overview" style={{padding:24}}><ProductStatus state={{ready:false,error:kind==='error'?'Synthetic read failure':'',storageError:false,operation:{kind:'idle',message:''},retry:async()=>{},overview:{} } as any} /></section>); await pause(); return document.body.textContent
  },
})
