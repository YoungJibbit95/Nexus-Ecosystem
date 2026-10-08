import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import '../../Nexus Mobile/src/index.css'
import { MobileViewHost } from '../../Nexus Mobile/src/app/mobileViewHost'
import { MobileShellLayout } from '../../Nexus Mobile/src/app/MobileShellLayout'
import { MobileNav } from '../../Nexus Mobile/src/components/MobileNav'
import { captureMobileRuntime, hydrateMobileSources } from '../../Nexus Mobile/src/app/workspaceHandoff'
import { useMobile } from '../../Nexus Mobile/src/lib/useMobile'
import { useApp } from '../../Nexus Mobile/src/store/appStore'
import { useCanvas } from '../../Nexus Mobile/src/store/canvasStore'
import { useTheme } from '../../Nexus Mobile/src/store/themeStore'
import { planningCommands, planningStore } from '../../Nexus Mobile/src/store/planningStore'
import { openProductTarget, productNavigation } from '../../Nexus Mobile/src/app/useProductNavigation'
import { selectMobileContext } from '../../Nexus Mobile/src/views/product/MobileContext'
import { readProductAttention } from '../../Nexus Mobile/src/views/product/productAttention'
import { requestEntityNavigation, entityNavigationState } from '../../packages/nexus-core/src/planning/entityNavigation'
import { requestPlanningNavigation } from '../../packages/nexus-core/src/planning/planningNavigation'
import { emptyPlanningDocument, zonedDate } from '../../packages/nexus-core/src/planning/domain'
import { planningInstantToLocal } from '../../packages/nexus-core/src/planning/planningTime'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { draftRegistry } from '../../packages/nexus-core/src/storage/draftRegistry'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { hexToRgb } from '../../Nexus Mobile/src/lib/utils'

// Real cached view host, shell, navigation, forms and command owners. Synthetic data only.
const root = createRoot(document.getElementById('root')!), checks: string[] = []
const pause = () => new Promise(resolve => setTimeout(resolve, 50))
const wait = async (condition: () => unknown, label: string) => { for (let n=0;n<300;n++) { if (condition()) { await pause(); return }; await pause() }; throw new Error(`Timed out: ${label}`) }
const assert = (value: unknown, label: string) => { if (!value) throw new Error(label); checks.push(label) }
const views = ['dashboard','flux','tasks','reminders','calendar','notes','canvas','files'] as any
let view = 'dashboard', largeText = false
const intervals = new Map<number, number>(), nativeInterval = window.setInterval.bind(window), nativeClear = window.clearInterval.bind(window)
window.setInterval = ((handler: TimerHandler, delay?: number, ...args: any[]) => { const id = nativeInterval(handler,delay,...args); intervals.set(id,delay || 0); return id }) as typeof window.setInterval
window.clearInterval = id => { intervals.delete(id!); nativeClear(id) }
const orientationClocks = () => [...intervals.values()].filter(delay => delay === 60000).length
const navigate = (next: string) => { view = next; render() }
const active = () => document.querySelector<HTMLElement>(`.nx-mobile-v6-view-shell[data-view="${view}"][data-active="true"]`)!
const render = () => flushSync(() => root.render(<Frame />))
function Frame() {
  const theme = useTheme(), mobile = useMobile()
  const navHeight = (Math.min(mobile.screenW,mobile.screenH) <= 430 ? 32 : 34) + mobile.safeBottom
  return <MobileShellLayout theme={theme} lowPowerMode={false} motionCssVars={{}} backgroundStyles={{background:theme.bg}} accentRgb={hexToRgb(theme.accent)} accent2Rgb={hexToRgb(theme.accent2)} fontSize={largeText ? '20px' : '14px'} motionRuntime={{profile:'balanced',reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}}>
    <main style={{flex:1,minHeight:0,paddingBottom:navHeight,overflow:'hidden',display:'flex',flexDirection:'column'}}><MobileViewHost view={view as any} mountedViews={views} availableViews={views} reducedMotion onRequestViewChange={navigate} /></main>
    <MobileNav view={view as any} availableViews={views} onChange={navigate} safeBottom={mobile.safeBottom} />
  </MobileShellLayout>
}
const go = async (next: string) => { navigate(next); await wait(() => active()?.querySelector('input,button') && !active().textContent?.includes('Lade View...'),next); if (next==='dashboard'||next==='flux') await wait(()=>active().querySelector('[data-product-overview][data-today-tasks]'),'ready projection') }
const named = (label: string, container: Element = active()) => container?.querySelector<HTMLElement>(`[aria-label="${label}"]`)!
const click = (text: string, container: Element = active()) => { const button=[...container.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.trim()===text && !button.disabled && button.checkVisibility()); assert(button,`Available action: ${text}`); flushSync(()=>button!.click()) }
const escape = () => flushSync(()=>(document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})))
const change = (input: HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement, value: string) => { const prototype=input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; flushSync(()=>{Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))}) }
const now = new Date().toISOString(), zone = Intl.DateTimeFormat().resolvedOptions().timeZone, at = (minutes: number) => new Date(Date.parse(now)+minutes*60000).toISOString()
const noteRef = {kind:'note',id:'n'} as const, nodeRef = {kind:'canvas-node',canvasId:'c2',id:'shared'} as const
const task = (id: string, extra={}) => ({id,title:`Arbeit ${id}`,desc:'Prüfbare Übergabe',status:'todo',priority:'mid',tags:[],subtasks:[],created:now,updated:now,...extra})
const note = (id: string,title: string) => ({id,title,content:`# ${title}\n\nEntscheidungen für die nächste Aufgabe.`,tags:[],created:now,updated:now,dirty:false})
const canvas = (id: string) => ({id,name:`Projekt ${id}`,created:now,updated:now,connections:[],nodes:[{id:'shared',type:'text',title:id==='c2'?'Zielknoten':'Anderer Knoten',content:'Räumlicher Kontext',x:800,y:500,width:280,height:160}]})
const block = (id: string,taskId: string,start: number,end: number) => ({id,taskId,start:at(start),end:at(end),timeZone:zone,revision:0,provenance:'manual',locked:false,state:'active',acceptedIssues:[]})
const source = () => JSON.stringify({tasks:useApp.getState().tasks,notes:useApp.getState().notes,reminders:useApp.getState().reminders,canvases:useCanvas.getState().canvases,planning:planningStore.capturePlanning()})
const index = () => selectMobileContext(useApp.getState().tasks,useApp.getState().notes,useCanvas.getState().canvases)
async function seed(variant='current') {
  draftRegistry.flush()
  useApp.setState({tasks:[task('t',{title:'Konzept ausarbeiten',deadline:at(-60),priority:'high',entityLinks:[noteRef,nodeRef]}),task('blocked',{title:'Freigabe abwarten',dependsOnTaskIds:['missing']}),task('unresolved',{title:'Unklare Frist prüfen',deadline:'2026-10-08'}),task('done',{title:'Abgeschlossene Vorarbeit',status:'done',linkedNoteId:'n'}),task('current',{title:'Fokus auf Umsetzung',durationMinutes:30}),task('next',{title:'Ergebnisse prüfen'})] as any,notes:[note('n','Projektkontext'),note('draft','Eigener Entwurf')],activeNoteId:'draft',openNoteIds:['draft'],reminders:[{id:'r',title:'Material prüfen',msg:'Kontext bereithalten',datetime:at(-90),repeat:'none',done:false,created:now},{id:'snoozed',title:'Später erinnern',msg:'',datetime:at(-120),snoozeUntil:at(180),repeat:'none',done:false,created:now}] as any,activities:[],folders:[],codes:[]})
  useCanvas.setState({canvases:[canvas('c1'),canvas('c2')] as any,activeCanvasId:'c1',viewport:{panX:0,panY:0,zoom:1}})
  const planning=emptyPlanningDocument('mobile-orientation-fixture')
  if(variant==='current')planning.blocks=[block('current','current',-15,15),block('next','next',45,75)] as any
  if(variant==='empty')useApp.setState({tasks:[],reminders:[]})
  if(variant==='long')useApp.setState({tasks:[task('t',{title:'Konzept mit ausführlichen Anforderungen, Entscheidungspunkten und einem SehrLangenZusammenhängendenProjektnamenOhneTrennzeichen ausarbeiten',deadline:at(-60),entityLinks:[noteRef,nodeRef]})] as any})
  await planningStore.restorePlanning(planning); await persistenceRegistry.flush()
}
async function openTask(id='t') { openProductTarget({kind:'task',id},navigate); await wait(()=>active()?.querySelector<HTMLInputElement>('input[placeholder="Task title…"]')?.value===useApp.getState().tasks.find(task=>task.id===id)?.title,'exact Task modal') }
async function closeTask() { escape(); await wait(()=>active() && !active().querySelector('[role="dialog"]'),'close Task') }
async function usage() { const details=active().querySelector<HTMLDetailsElement>('[data-context-usage]')!; assert(details,'Context usage disclosure'); if(!details.open)details.querySelector<HTMLElement>('summary')!.click();await pause() }
async function openFile(title: string) {
  await go('files');change(active().querySelector<HTMLInputElement>('input[placeholder="Search…"]')!,title);await pause()
  const label=[...active().querySelectorAll<HTMLElement>('div')].find(element=>element.children.length===0&&element.textContent===title)
  assert(label,`Library contains exact source: ${title}`);flushSync(()=>label!.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})))
}
async function interactions() {
  await go('dashboard'); const before=source(), widgets=localStorage.getItem('nx-dashboard-layout-v3')
  assert(active().querySelector('[aria-label="Jetzt"] [data-product-commitment="block:current"]'),'Dashboard one current commitment')
  assert(active().querySelector('[aria-label="Als Nächstes"] [data-product-commitment="block:next"]'),'Dashboard next commitment')
  assert(orientationClocks()===1 && ![...intervals.values()].includes(15000),'One active minute clock; no legacy 15-second Flux clock')
  named('Agenda öffnen: Ergebnisse prüfen').click();await wait(()=>view==='calendar'&&named('Agenda-Tag'),'exact Next Agenda');assert((named('Agenda-Tag') as HTMLInputElement).value===zonedDate(at(45),zone),'Next opens exact local day')
  requestPlanningNavigation('mobile',{mode:'schedule',taskId:'current'});await wait(()=>(named('Aufgabe für Arbeitsblock') as HTMLSelectElement)?.value==='current','known-duration Task handoff')
  assert((named('Arbeitsdauer in Minuten') as HTMLInputElement).value==='30','Exact Task handoff reuses explicit known duration')
  await go('dashboard');click('Aufmerksamkeit in Flux');await wait(()=>view==='flux'&&active()?.querySelector('[data-product-item="task:t"]'),'Dashboard to Flux')
  assert(orientationClocks()===1,'Cached Dashboard releases clock when Flux takes ownership')
  assert(active().querySelector('[data-product-item="task:t"]')?.textContent?.includes('Überfällig'),'Flux explains urgent Task')
  assert(active().querySelector('[data-product-item="task:blocked"]')?.textContent?.includes('Blockiert'),'Missing dependency remains blocked')
  assert(active().querySelector('[data-product-item="task:unresolved"]')?.textContent?.includes('Klärung nötig'),'Unresolved deadline is explicit')
  const opener=named('Aufgabe öffnen: Konzept ausarbeiten');opener.focus();opener.click();await wait(()=>view==='tasks'&&active()?.querySelector('[role="dialog"]'),'Flux exact Task');await wait(()=>document.activeElement==active()?.querySelector('input[placeholder="Task title…"]'),'Task keyboard focus')
  named('Kontext öffnen: Projektkontext').click();await wait(()=>view==='notes'&&useApp.getState().activeNoteId==='n','Task to exact Note');await wait(()=>document.activeElement===named('Notiztitel'),'Note destination focus')
  assert(orientationClocks()===0,'Hidden orientation views own no minute clock on Notes')
  await usage();named('Aufgabe öffnen: Konzept ausarbeiten').click();await wait(()=>view==='tasks'&&active()?.querySelector('[role="dialog"]'),'Note backlink to Task')
  named('Kontext öffnen: Zielknoten').click();await wait(()=>view==='canvas'&&useCanvas.getState().activeCanvasId==='c2','exact scoped Canvas node');await wait(()=>document.activeElement?.getAttribute('aria-label')==='Kontext: Zielknoten','Canvas focus')
  assert(useCanvas.getState().viewport.panX!==0,'Canvas waits for measured visible layout')
  await usage();named('Aufgabe öffnen: Konzept ausarbeiten').click();await wait(()=>view==='tasks'&&active()?.querySelector('[role="dialog"]'),'Canvas backlink');click('Zeit für diese Aufgabe planen')
  await wait(()=>view==='calendar'&&(named('Aufgabe für Arbeitsblock') as HTMLSelectElement)?.value==='t','exact Task scheduling intent')
  assert(active().querySelector<HTMLDetailsElement>('.nx-planning-manual')?.open,'Manual editor opens for exact Task')
  assert((named('Arbeitsdauer in Minuten') as HTMLInputElement).value==='','Unknown duration is requested, never inferred')
  assert(active().textContent?.includes('Zeitvorschläge sind auf Mobile nicht verfügbar'),'Advice unavailable is honest')
  assert(source()===before,'Navigation, context, advice and opening planning mutate no source record')
  change(named('Arbeitsdauer in Minuten') as HTMLInputElement,'25');change(named('Planungsbeginn') as HTMLInputElement,planningInstantToLocal(at(240),zone))
  active().querySelector<HTMLInputElement>('.nx-planning-manual input[type="checkbox"]')!.click()
  flushSync(()=>active().querySelector('form[aria-label="Manuelle Planungsaktion"]')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))
  await wait(()=>active().textContent?.includes('Dauerhaft gespeichert'),'manual acknowledged save')
  assert(planningStore.capturePlanning().blocks.some(block=>block.taskId==='t'&&block.provenance==='manual'),'Manual planning works without advice')
  openProductTarget({kind:'agenda',day:zonedDate(now,zone)},navigate);await wait(()=>active()?.querySelector('.nx-planning-panel') && !active().querySelector<HTMLDetailsElement>('.nx-planning-manual')?.open,'read navigation closes old intent')
  await go('flux');named('Erinnerung öffnen: Material prüfen').click();await wait(()=>view==='reminders'&&active()?.querySelector<HTMLInputElement>('input[placeholder="Reminder title…"]')?.value==='Material prüfen','exact Reminder');escape();await pause()
  await openFile('Konzept ausarbeiten');await wait(()=>view==='tasks'&&active()?.querySelector('[role="dialog"]'),'Files exact Task');await closeTask()
  await openFile('Material prüfen');await wait(()=>view==='reminders'&&active()?.querySelector<HTMLInputElement>('input[placeholder="Reminder title…"]')?.value==='Material prüfen','Files exact Reminder');escape();await pause()
  await openFile('Projekt c1');await wait(()=>view==='canvas'&&useCanvas.getState().activeCanvasId==='c1'&&named('Kontext: Projekt c1'),'Files whole Canvas')
  await go('files');const pending=requestEntityNavigation('mobile',noteRef)!;await pause();assert(entityNavigationState('mobile',pending,false)==='pending','Hidden Notes cannot consume pending intent')
  await go('notes');await wait(()=>useApp.getState().activeNoteId==='n','consume Note once');useApp.getState().setNote('draft');await go('files');await go('notes');assert(useApp.getState().activeNoteId==='draft','Consumed context intent never replays')
  const memo=index();const editor=active().querySelector<HTMLTextAreaElement>('textarea')!;assert(editor,'Actual Note editor');change(editor,'Unsaved user draft');assert(index()===memo,'Keystroke draft does not rebuild canonical relation index')
  await go('files');requestEntityNavigation('mobile',noteRef);draftRegistry.invalidate();await go('notes');await wait(()=>active().textContent?.includes('Workspace hat sich geändert'),'stale Note');assert(useApp.getState().activeNoteId==='draft','Stale Note target preserves selection')
  requestEntityNavigation('mobile',{kind:'note',id:'missing'});await wait(()=>active().textContent?.includes('Notiz fehlt'),'missing Note')
  await go('files');requestEntityNavigation('mobile',nodeRef);draftRegistry.invalidate();await go('canvas');await wait(()=>active().textContent?.includes('Workspace hat sich geändert'),'stale Canvas')
  openProductTarget({kind:'task',id:'missing'},navigate);await wait(()=>active()?.textContent?.includes('nicht mehr'),'missing Task')
  await go('files');productNavigation.request({kind:'task',id:'t'},'old');await go('tasks');await wait(()=>active().textContent?.includes('Workspace hat sich geändert'),'stale Task')
  await go('files');requestPlanningNavigation('mobile',{mode:'schedule',taskId:'t'});draftRegistry.invalidate();await go('calendar');await wait(()=>active().textContent?.includes('Workspace hat sich geändert'),'stale scheduling intent')
  await workspaceOperation.run(async()=>{const before=source();openProductTarget({kind:'task',id:'t'},navigate);assert(view==='calendar'&&source()===before,'Workspace transition blocks product action')})
  await seed('suggestion');await go('dashboard');assert(active().querySelectorAll('[data-product-item="task:t"]').length===1,'Suggested Task does not repeat in attention preview')
  captureMobileRuntime()
  const captureBefore=source();active().querySelector<HTMLElement>('.nx-mobile-product-capture summary')!.click();click('Neue Notiz')
  await wait(()=>document.querySelector('[data-application-capture] [role="dialog"]'),'capture dialog');assert(source()===captureBefore,'Opening capture creates no placeholder')
  const dialog=document.querySelector('[data-application-capture] [role="dialog"]')!;const label=[...dialog.querySelectorAll('label')].find(label=>label.textContent==='Titel')!;change(document.getElementById(label.htmlFor) as HTMLInputElement,'Bestätigte Mobile Notiz')
  flushSync(()=>dialog.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await wait(()=>dialog.textContent?.includes('Gespeichert. ID:'),'capture acknowledgement')
  assert(useApp.getState().notes.some(note=>note.title==='Bestätigte Mobile Notiz'),'Acknowledged capture creates exact Note');click('Schließen',dialog)
  assert(localStorage.getItem('nx-dashboard-layout-v3')===widgets,'Orientation preserves saved Dashboard widget preferences')
  await seed();await go('flux');const sourceBefore=source();change(named('Aufmerksamkeit durchsuchen') as HTMLInputElement,'no-match-zz');await wait(()=>active().textContent?.includes('Keine passenden Hinweise'),'no matches');assert(source()===sourceBefore,'Flux triage and search never bulk-mutate Tasks or Reminders')
}
async function visual(next: string,variant='current') {
  await seed(variant);useTheme.getState().setMode(variant==='custom'?'light':'dark');useTheme.getState().setColors(variant==='custom'?{accent:'#7b2869',accent2:'#306b69',bg:'#f6edf3'}:{accent:'#007AFF',accent2:'#5E5CE6',bg:'#1a1a2e'})
  if(variant==='custom'){await persistenceRegistry.flush();await useTheme.persist.rehydrate();assert(useTheme.getState().accent==='#7b2869','Saved custom theme rehydrates')}
  await go(next)
  const capture=active().querySelector<HTMLDetailsElement>('.nx-mobile-product-capture');if(capture?.open)capture.querySelector<HTMLElement>('summary')!.click()
  if(next==='flux'){change(named('Aufmerksamkeit durchsuchen') as HTMLInputElement,variant==='no-matches'?'no-match-zz':'')}
  if(next==='tasks')await openTask()
  if(next==='notes'){requestEntityNavigation('mobile',noteRef);await wait(()=>useApp.getState().activeNoteId==='n','visual Note');await usage()}
  if(next==='canvas'){requestEntityNavigation('mobile',nodeRef);await wait(()=>useCanvas.getState().activeCanvasId==='c2','visual Canvas');await usage()}
  if(next==='calendar'){requestPlanningNavigation('mobile',{mode:'schedule',taskId:'t'});await wait(()=>(named('Aufgabe für Arbeitsblock') as HTMLSelectElement)?.value==='t','visual manual editor')}
  if(next==='calendar'&&innerHeight<500){const save=active().querySelector<HTMLButtonElement>('button[type="submit"]')!;save.scrollIntoView({block:'center'});await pause();const rect=save.getBoundingClientRect(),content=active().querySelector('.nx-mobile-v6-content')!.getBoundingClientRect();assert(rect.top>=content.top&&rect.bottom<=content.bottom+1,'Reduced keyboard-height viewport keeps manual save reachable')}
  if(variant==='error'){useApp.setState({tasks:[task('bad',{dependsOnTaskIds:42})] as any});await wait(()=>active().textContent?.includes('nicht vollständig verfügbar'),'visible read error');assert(!active().textContent?.includes('Keine offenen Hinweise.'),'Read failure is not empty success')}
  if(next!=='calendar')for(const element of active().querySelectorAll<HTMLElement>('*'))if(getComputedStyle(element).overflowY==='auto'&&!element.closest('[role="dialog"]'))element.scrollTop=0
}
function geometry() {
  const controls=[...active().querySelectorAll<HTMLElement>('.nx-mobile-product button,.nx-mobile-product summary,.nx-mobile-product input,.nx-mobile-product select,.nx-planning-panel button,.nx-planning-panel summary,.nx-planning-panel input:not([type="checkbox"]),.nx-planning-panel select')].filter(element=>element.checkVisibility())
  return {view,width:innerWidth,height:innerHeight,surfaces:active().querySelectorAll('.nx-mobile-product').length,small:controls.filter(element=>element.getBoundingClientRect().height<43).map(element=>element.textContent?.slice(0,45)),clipped:controls.filter(element=>{const r=element.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1}).map(element=>element.textContent?.slice(0,45)),documentOverflow:document.documentElement.scrollWidth>innerWidth+1,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}
}
async function performanceCheck() {
  await seed('suggestion');const tasks=Array.from({length:800},(_,i)=>task(`many-${i}`,{deadline:at(-i),priority:i%5===0?'high':'mid'}));useApp.setState({tasks:tasks as any})
  const timings=[];for(let i=0;i<20;i++){const start=performance.now();readProductAttention({tasks:tasks as any,reminders:useApp.getState().reminders,planning:planningStore.capturePlanning(),now,timeZone:zone});timings.push(performance.now()-start)}
  await go('flux');change(named('Aufmerksamkeit durchsuchen') as HTMLInputElement,'');await wait(()=>active().querySelectorAll('[data-product-item]').length===50,'bounded initial Flux');assert(active().querySelectorAll('[data-product-item]').length===50,'800-task fixture renders first 50 attention items')
  return {fixture:'800 Tasks, 2 Reminders; synthetic desktop Electron, not device benchmark',iterations:20,meanMs:timings.reduce((a,b)=>a+b)/timings.length,maxMs:Math.max(...timings),visibleRows:50,orientationClocks:orientationClocks()}
}
Object.assign(window,{mobileChecks:checks,mobileInteractions:interactions,mobileVisual:visual,mobileGeometry:geometry,mobilePerformance:performanceCheck,mobileFocus:async()=>{await visual('tasks');const dialog=active().querySelector<HTMLElement>('[role="dialog"]')!;const fields=[...dialog.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex="0"]')].filter(element=>element.checkVisibility()&&!(element as HTMLButtonElement).disabled);fields[fields.length-1].focus();return {first:fields[0].outerHTML}},mobileReady:(async()=>{await hydrateMobileSources();await seed();await go('dashboard')})()})
