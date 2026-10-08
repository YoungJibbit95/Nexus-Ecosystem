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
import { useWorkspaces } from '../../Nexus Main/src/store/workspaceStore'
import { planningCommands, planningStore } from '../../Nexus Main/src/store/planningStore'
import { openProductTarget } from '../../Nexus Main/src/app/useProductNavigation'
import { selectContextRelations } from '../../Nexus Main/src/views/context/useContextRelations'
import { TaskContextSummary } from '../../Nexus Main/src/views/context/ContextRelations'
import { requestEntityNavigation, entityNavigationState } from '../../packages/nexus-core/src/planning/entityNavigation'
import { emptyPlanningDocument } from '../../packages/nexus-core/src/planning/domain'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { draftRegistry } from '../../packages/nexus-core/src/storage/draftRegistry'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { hexToRgb } from '../../Nexus Main/src/lib/utils'

const root = createRoot(document.getElementById('root')!), checks: string[] = []
const pause = () => new Promise(resolve => setTimeout(resolve, 50))
const wait = async (condition: () => unknown, label: string) => { for (let n=0;n<300;n++) { if (condition()) { await pause(); return }; await pause() }; throw new Error(`Timed out: ${label}`) }
const assert = (value: unknown, label: string) => { if (!value) throw new Error(label); checks.push(label) }
const views = ['tasks','notes','canvas','files','reminders','code'] as any
let view = 'files'
const navigate = (next: string) => { view = next; render() }
const active = () => document.querySelector<HTMLElement>(`.nx-v6-view-shell[data-view="${view}"][data-active="true"]`)!
const render = () => flushSync(() => root.render(<Frame />))
function Frame() {
  const theme = useTheme()
  return <MainShellLayout theme={theme} lowPowerMode={false} motionCssVars={{}} backgroundStyles={{ background: theme.bg }} accentRgb={hexToRgb(theme.accent)} accent2Rgb={hexToRgb(theme.accent2)} sidebarLeft sidebarAutoHideEnabled={false} sidebarExpanded effectiveSidebarWidth={190} toolbarBottom={false} toolbarVisible={false} terminalOpen={false} view={view as any} availableViews={views} viewGuardState={{checking:false,blockedView:null,requiredTier:null,reason:null}} motionRuntime={{quickMs:0,pageInitial:false,pageAnimate:{opacity:1},pageExit:{opacity:1},pageTransition:{duration:0}}} onRequestViewChange={navigate} onPrefetchView={() => {}} onSidebarAutoPeek={() => {}} mainViewNode={<MainViewHost view={view as any} mountedViews={views} availableViews={views} reducedMotion onRequestViewChange={navigate} onPrefetchView={() => {}} onOpenWalkthrough={() => {}} />} />
}
const go = async (next: string) => { navigate(next); await wait(() => active()?.querySelector('input,button') && !active().textContent?.includes('Lade View...'), next) }
const named = (label: string, container: Element = active()) => container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
const pressEscape = () => flushSync(() => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})))
const change = (input: HTMLInputElement | HTMLTextAreaElement, value: string) => { const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; flushSync(() => { Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(input,value); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})) }) }
const now = new Date().toISOString(), noteRef = {kind:'note',id:'n'} as const, nodeRef = {kind:'canvas-node',canvasId:'c2',id:'shared'} as const
const task = (id: string, extra = {}) => ({id,title:`Arbeit ${id}`,desc:'Prüfbare Übergabe',status:'todo',priority:'mid',tags:[],subtasks:[],created:now,updated:now,...extra})
const note = (id: string, title: string) => ({id,title,content:`# ${title}\n\nEntscheidungen und Material für die nächste Aufgabe.`,tags:[],created:now,updated:now,dirty:false})
const canvas = (id: string, title: string) => ({id,name:title,created:now,updated:now,connections:[],nodes:[{id:'shared',type:'text',title:id==='c2'?'Zielknoten':'Anderer Knoten',content:'Räumlicher Kontext',x:800,y:500,width:280,height:160}]})
const index = () => selectContextRelations(useApp.getState().tasks,useApp.getState().notes,useCanvas.getState().canvases)
const sources = () => JSON.stringify({tasks:useApp.getState().tasks,notes:useApp.getState().notes,codes:useApp.getState().codes,reminders:useApp.getState().reminders,canvases:useCanvas.getState().canvases,planning:planningStore.capturePlanning()})
async function seed() {
  draftRegistry.flush()
  useApp.setState({tasks:[task('t',{title:'Konzept ausarbeiten',entityLinks:[noteRef,nodeRef]}),task('done',{title:'Abgeschlossene Vorarbeit',status:'done',linkedNoteId:'n'}),task('broken',{title:'Fehlenden Kontext prüfen',entityLinks:[{kind:'note',id:'gone'}],linkedCanvasNodeId:'shared'}),task('none',{title:'Aufgabe ohne Kontext'})] as any,notes:[note('n','Projektkontext'),note('draft','Eigener Entwurf')],activeNoteId:'draft',openNoteIds:['draft'],codes:[{id:'n',name:'Code mit derselben ID',content:'const material = true',lang:'typescript',created:now,updated:now,dirty:false}] as any,reminders:[{id:'r',title:'Material prüfen',msg:'Entwurf bereithalten',datetime:now,repeat:'none',done:false,created:now}] as any,folders:[],activities:[]})
  useCanvas.setState({canvases:[canvas('c1','Projekt Eins'),canvas('c2','Projekt Zwei')] as any,activeCanvasId:'c1',viewport:{panX:0,panY:0,zoom:1}})
  useWorkspaces.setState({workspaces:[],activeWorkspaceId:null})
  await planningStore.restorePlanning(emptyPlanningDocument('context-fixture'))
  await persistenceRegistry.flush()
}
async function openTask(id='t') {
  openProductTarget({kind:'task',id},navigate)
  await wait(() => active().querySelector('.nx-task-modal-sheet'), 'Task modal')
  await wait(() => active().querySelector<HTMLInputElement>('input[placeholder="Task title…"]')?.value === useApp.getState().tasks.find(t=>t.id===id)?.title,'exact task')
}
async function closeTask() { pressEscape(); await wait(()=>!active().querySelector('.nx-task-modal-sheet'),'close task') }
async function openUsage() { const details=active().querySelector<HTMLDetailsElement>('[data-context-usage]')!; assert(details,'Visible context usage'); if(!details.open) details.querySelector<HTMLElement>('summary')!.click(); await pause() }
async function file(title: string, type: string) {
  await go('files'); named('Filter all').click(); change(named('Files durchsuchen') as any,title); await pause()
  const card=[...active().querySelectorAll<HTMLElement>('.nx-files-card')].find(card=>card.textContent?.includes(title))!; assert(card,`Library contains ${type}: ${title}`); card.click(); await pause()
  if(active().querySelector('#nx-files-details-trigger')?.getAttribute('aria-expanded')!=='true') active().querySelector<HTMLButtonElement>('#nx-files-details-trigger')!.click()
  await wait(()=>active().querySelector('#nx-files-detail-pane h3')?.textContent===title,`Files exact ${type} selection`)
}
async function interactions() {
  const before = sources()
  await openTask(); assert(active().querySelector('.nx-context-section')?.textContent?.includes('Projektkontext') && active().querySelector('.nx-context-section')?.textContent?.includes('Projekt Zwei'),'Task shows typed Note and exact Canvas project with snippets')
  named('Kontext öffnen: Projektkontext').click(); await wait(()=>view==='notes' && useApp.getState().activeNoteId==='n','Task to Note')
  assert(document.activeElement===named('Notiztitel umbenennen'),'Note handoff moves keyboard focus to exact note')
  await openUsage(); assert(active().querySelector('[data-context-usage] summary')?.textContent==='Verwendet von 1 offenen Aufgabe','Done tasks excluded from active usage')
  assert(active().querySelector('[data-context-usage]')?.textContent?.includes('1 abgeschlossene'),'Completed usage remains explicit')
  named('Aufgabe öffnen: Konzept ausarbeiten').click(); await wait(()=>view==='tasks' && active().querySelector('.nx-task-modal-sheet'),'Note backlink')
  named('Kontext öffnen: Zielknoten').click(); await wait(()=>view==='canvas' && useCanvas.getState().activeCanvasId==='c2' && active().querySelector('[aria-label="Kontext: Zielknoten"]'),'Task to exact Canvas node')
  await wait(()=>document.activeElement?.getAttribute('aria-label')==='Kontext: Zielknoten','Canvas destination focus'); assert(true,'Canvas handoff focuses selected target context')
  await wait(()=>useCanvas.getState().viewport.panX!==0,'Canvas camera transition'); await new Promise(resolve=>setTimeout(resolve,350))
  const vp=useCanvas.getState().viewport; assert(vp.panX + 940*vp.zoom > 250 && vp.panY + 580*vp.zoom > 180,'Canvas handoff waits for visible layout and centers the exact node')
  await openUsage(); named('Aufgabe öffnen: Konzept ausarbeiten').click(); await wait(()=>view==='tasks','Canvas backlink'); await closeTask()
  await file('Konzept ausarbeiten','task'); named('Aufgabe öffnen: Konzept ausarbeiten').click(); await wait(()=>view==='tasks' && active().querySelector('.nx-task-modal-sheet'),'Files to exact Task'); await closeTask()
  await file('Material prüfen','reminder'); named('Erinnerung öffnen: Material prüfen').click(); await wait(()=>view==='reminders' && active().querySelector('[role="dialog"]'),'Files to Reminder'); assert([...active().querySelectorAll<HTMLInputElement>('input')].some(input=>input.value==='Material prüfen'),'Files opens exact Reminder'); pressEscape(); await pause()
  await file('Projektkontext','note'); await openUsage(); named('In Notizen öffnen: Projektkontext').click(); await wait(()=>view==='notes' && useApp.getState().activeNoteId==='n','Files to Note')
  await file('Projekt Zwei','canvas'); named('In Canvas öffnen: Projekt Zwei').click(); await wait(()=>view==='canvas' && active().querySelector('[aria-label="Kontext: Projekt Zwei"]'),'Files to whole Canvas')
  await file('Code mit derselben ID','code'); named('In Code öffnen: Code mit derselben ID').click(); await wait(()=>view==='code' && useApp.getState().activeCodeId==='n','Files to Code'); assert(true,'Library uses type and id, including same-ID Note and Code')
  assert(sources()===before,'Open and backlinks mutate no Note, Canvas, Task, Reminder, Code or Planning source data')
  await go('files'); const request=requestEntityNavigation('main',noteRef)!; await pause(); assert(entityNavigationState('main',request,false)==='pending' && useApp.getState().activeNoteId==='n','Hidden cached Notes leaves intent pending')
  await go('notes'); await wait(()=>entityNavigationState('main',request,true)==='pending','consume once'); useApp.getState().setNote('draft'); await go('files'); await go('notes'); assert(useApp.getState().activeNoteId==='draft','Consumed intent never replays on reactivation')
  requestEntityNavigation('main',noteRef); await wait(()=>useApp.getState().activeNoteId==='n','repeat intent'); assert(true,'Repeated same target is accepted once as new intent')
  requestEntityNavigation('main',{kind:'note',id:'gone'}); await wait(()=>active().textContent?.includes('Notiz fehlt'),'missing Note'); assert(useApp.getState().activeNoteId==='n','Missing Note preserves current selection and visible failure')
  await go('files'); requestEntityNavigation('main',noteRef); draftRegistry.invalidate(); await go('notes'); await wait(()=>active().textContent?.includes('Workspace hat sich geändert'),'stale Note'); assert(true,'Workspace generation rejects a same-ID Note intent visibly')
  await go('files'); requestEntityNavigation('main',nodeRef); draftRegistry.invalidate(); await go('canvas'); await wait(()=>active().textContent?.includes('Workspace hat sich geändert'),'stale Canvas'); assert(true,'Workspace generation rejects Canvas intent visibly')
  requestEntityNavigation('main',{kind:'canvas-node',canvasId:'c2',id:'gone'}); await wait(()=>active().textContent?.includes('Canvas-Knoten fehlt'),'missing Canvas'); assert(true,'Missing Canvas node preserves reference and reports failure')
  await openTask('broken'); assert(active().querySelector('.nx-context-section')?.textContent?.includes('mehrdeutig') && active().querySelectorAll('.nx-context-section button').length===0,'Ambiguous legacy and missing Note stay visible without guessed open targets'); await closeTask()
  await openTask('none'); assert(active().querySelector('.nx-context-section')?.textContent?.includes('Noch kein Kontext'),'No-context state is honest'); await closeTask()
  await workspaceOperation.run(async()=>{assert(requestEntityNavigation('main',noteRef)===null,'Workspace replacement pauses new context navigation')})
  await go('notes'); requestEntityNavigation('main',{kind:'note',id:'draft'}); await wait(()=>useApp.getState().activeNoteId==='draft','draft note'); useTheme.getState().setNotes({autosave:false})
  const editor=active().querySelector<HTMLTextAreaElement>('textarea.nx-notes-editor-textarea, textarea')!; assert(editor,'Existing Notes editor mounted'); const stable=index(); change(editor,'UNSAVED local material'); await pause()
  assert(index()===stable,'Local draft keystrokes reuse context index')
  await go('files'); requestEntityNavigation('main',noteRef); await go('notes'); await wait(()=>useApp.getState().activeNoteId==='n','draft handoff'); assert(useApp.getState().notes.find(n=>n.id==='draft')?.content==='UNSAVED local material','Note switch commits local draft to its original owner without loss'); assert(useApp.getState().notes.find(n=>n.id==='n')?.content?.startsWith('# Projektkontext'),'Draft does not leak into target Note')
  await seed(); useApp.setState({tasks:Array.from({length:800},(_,i)=>task(`large-${i}`,{linkedNoteId:'n'})) as any,notes:[note('n','Projektkontext'),...Array.from({length:500},(_,i)=>note(`large-${i}`,`Material ${i}`))]}); const started=performance.now(), large=index(), elapsed=performance.now()-started; assert(large.model?.byEntity.values().next().value?.length===800 && elapsed<1000,`500 Notes / 800 Tasks indexed once (${elapsed.toFixed(1)}ms)`); useApp.setState({activeNoteId:'n'}); assert(index()===large,'Unrelated selection reuses the same complete relation index')
  await seed(); return checks
}
function geometry() {
  const surfaces=[...active().querySelectorAll<HTMLElement>('.nx-context')].filter(el=>el.checkVisibility()), clipped:string[]=[], small:string[]=[]
  for(const surface of surfaces) for(const el of surface.querySelectorAll<HTMLElement>('h3,p,strong,button,summary')) if(el.checkVisibility()) { const r=el.getBoundingClientRect(); if(r.left<0 || r.right>innerWidth+2) clipped.push(el.textContent?.slice(0,60)||''); if((el.tagName==='BUTTON'||el.tagName==='SUMMARY') && r.height<43) small.push(el.textContent||'') }
  for(const button of active().querySelectorAll<HTMLElement>('.nx-files-detail-actions > button')) if(button.checkVisibility() && button.getBoundingClientRect().height<43) small.push(button.textContent||'')
  return {view,width:innerWidth,clipped,small,surfaces:surfaces.length,documentOverflow:document.documentElement.scrollWidth>innerWidth+2,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches}
}
async function visual(next:string,variant:string) {
  await seed(); useTheme.setState({mode:variant==='custom-light'?'light':'dark',accent:variant==='custom-light'?'#925400':'#59a6ff',bg:variant==='custom-light'?'#f4f1eb':'#101526'})
  if(variant==='custom-light'){await persistenceRegistry.flush();await useTheme.persist.rehydrate();assert(useTheme.getState().accent==='#925400','Custom context theme survives rehydration')}
  if(variant==='many')useApp.setState({tasks:[...useApp.getState().tasks,...Array.from({length:60},(_,i)=>task(`many-${i}`,{title:`Lange Aufgabe ${i}: Entscheidungen mit zusätzlichen Details nachvollziehbar vorbereiten`,entityLinks:[noteRef,nodeRef]}))] as any})
  if(variant==='zero')useApp.setState({tasks:[]})
  if(next==='tasks'){await go('tasks'); if(active().querySelector('.nx-task-modal-sheet'))await closeTask();await openTask(variant==='missing'?'broken':variant==='none'?'none':'t');active().querySelector('.nx-context-section')?.scrollIntoView({block:'center'})}
  if(next==='notes'){requestEntityNavigation('main',noteRef);await go('notes');await openUsage()}
  if(next==='canvas'){requestEntityNavigation('main',nodeRef);await go('canvas');await wait(()=>active().querySelector('[aria-label="Kontext: Zielknoten"]'),'visual Canvas target');await openUsage()}
  if(next==='files'){await file('Projektkontext','note');await openUsage()}
  await pause();return geometry()
}
async function revealContext() {
  if(view==='tasks') active().querySelector('.nx-context-section li')?.scrollIntoView({block:'center'})
  const pane=view==='files'?active().querySelector<HTMLElement>('#nx-files-detail-pane'):view==='notes'&&innerHeight<640?active().querySelector<HTMLElement>('.nx-notes-main > .nx-context'):null
  const target=pane?.querySelector<HTMLElement>(view==='files'?'[data-context-usage]':'[data-context-usage] button')
  if(pane&&target)pane.scrollTop+=target.getBoundingClientRect().top-pane.getBoundingClientRect().top-12
  await pause()
}
async function setup(){await Promise.all([useApp.persist.rehydrate(),useCanvas.persist.rehydrate(),useTheme.persist.rehydrate(),useWorkspaces.persist.rehydrate()]);await planningCommands.ready();localStorage.setItem('nx-files-scope-v1','library');await seed();render();await go('files');return true}
Object.assign(window,{contextReady:setup(),contextChecks:checks,contextInteractions:interactions,contextVisual:visual,contextGeometry:geometry,contextReveal:revealContext,
  contextFocus:async()=>{await visual('notes','dark');const summary=active().querySelector<HTMLElement>('[data-context-usage] summary')!;summary.focus();return true},
  contextFailure:async()=>{await seed();const notes=useApp.getState().notes;const broken={...notes[0],content:null};useApp.setState({notes:[broken,...notes.slice(1)] as any});flushSync(()=>root.render(<div style={{padding:24}}><TaskContextSummary taskId="t" navigate={navigate}/></div>));await pause();assert(document.body.textContent?.includes('Kontext konnte nicht ausgewertet werden')&&!document.body.textContent?.includes('Noch kein Kontext'),'Failed read reports error rather than false empty context');assert(useApp.getState().tasks[0].entityLinks?.length===2,'Failed read preserves canonical references');useApp.setState({notes});render();await go('notes');assert(index().model!==null,'Context read recovers without data reset');return true},
})
