import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import '../../Nexus Main/src/index.css'
import '../../Nexus Main/src/app/NexusV6ViewShell.css'
import { MainViewHost } from '../../Nexus Main/src/app/mainViewHost'
import { MobileViewHost } from '../../Nexus Mobile/src/app/mobileViewHost'
import { useApp as mainApp } from '../../Nexus Main/src/store/appStore'
import { useApp as mobileApp } from '../../Nexus Mobile/src/store/appStore'
import { planningStore as mainPlanning, planningCommands as mainCommands } from '../../Nexus Main/src/store/planningStore'
import { planningStore as mobilePlanning, planningCommands as mobileCommands } from '../../Nexus Mobile/src/store/planningStore'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { createIndexedDbStorage } from '../../packages/nexus-core/src/storage/browserPersistence'
import { planningDowngradeNotice } from '../../packages/nexus-core/src/planning/formats'
import { zonedDate } from '../../packages/nexus-core/src/planning/domain'
import { nextCivilDay } from '../../packages/nexus-core/src/planning/planningTime'
import { registerReminderCommandOwner } from '../../packages/nexus-core/src/reminders/reminderDomain'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { useCanvas as mainCanvas } from '../../Nexus Main/src/store/canvasStore'
import { useCanvas as mobileCanvas } from '../../Nexus Mobile/src/store/canvasStore'
import { requestEntityNavigation } from '../../packages/nexus-core/src/planning/entityNavigation'
import { requestPlanningNavigation } from '../../packages/nexus-core/src/planning/planningNavigation'
import { useTheme } from '../../Nexus Main/src/store/themeStore'

const stage = new URLSearchParams(location.search).get('stage') || 'forms'
const checks: string[] = []
const evidence: Record<string, unknown> = { stage }
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); checks.push(message) }
const pause = () => new Promise(resolve => setTimeout(resolve, 50))
const wait = async (condition: () => unknown, description: string) => { for (let i = 0; i < 400; i++) { if (condition()) return; await pause() }; throw new Error(`Timed out: ${description}`) }
const root = createRoot(document.getElementById('root')!)
let client: 'main' | 'mobile' = 'main', view = 'tasks'
let layoutFrame = false
const render = () => flushSync(() => root.render(client === 'main'
  ? <div className={layoutFrame ? 'nx-app-shell' : undefined} data-nx-color-mode="dark" style={{ height: '100%' }}><div style={{ height: '100%', width: '100%', minWidth: 0, position: 'relative', zIndex: 1 }}><MainViewHost view={view as any} mountedViews={['tasks', 'calendar', 'dashboard', 'flux', 'notes', 'canvas']} availableViews={['tasks', 'calendar', 'dashboard', 'flux', 'notes', 'canvas']} reducedMotion onRequestViewChange={next => { view = String(next); render() }} onPrefetchView={() => {}} onOpenWalkthrough={() => {}} /></div></div>
  : <MobileViewHost view={view as any} mountedViews={['calendar', 'dashboard', 'flux', 'notes', 'canvas']} availableViews={['calendar', 'dashboard', 'flux', 'notes', 'canvas']} reducedMotion onRequestViewChange={next => { view = String(next); render() }} />))
const active = () => client === 'main' ? document.querySelector(`.nx-v6-view-shell[data-view="${view}"][data-active="true"]`)! : [...document.querySelectorAll('.nx-mobile-view-layer')].find(element => (element as HTMLElement).style.display !== 'none')!
const reveal = (element: Element) => {
  if (client === 'main') {
    const layer = active().querySelector<HTMLElement>('.nx-agenda-editor-layer')
    if (layer && !layer.contains(element) && !layer.hidden) flushSync(() => active().querySelector<HTMLButtonElement>('[aria-label="Planungseditor schließen"]')!.click())
    if (layer?.contains(element) && layer.hidden) flushSync(() => active().querySelector<HTMLButtonElement>('[data-agenda-open-editor]')!.click())
    for (const [name, label] of [['import', 'Import'], ['links', 'Verknüpfungen'], ['settings', 'Einstellungen'], ['quick', 'Schnelleintrag']] as const) {
      const page = element.closest<HTMLElement>(`.nx-agenda-tool-${name}`)
      if (page && !page.checkVisibility()) flushSync(() => [...active().querySelectorAll<HTMLButtonElement>('.nx-agenda-tools button')].find(button => button.textContent?.trim() === label)!.click())
    }
  }
  const parents: HTMLDetailsElement[] = []
  for (let parent = element.parentElement; parent; parent = parent.parentElement) if (parent instanceof HTMLDetailsElement && !parent.open) parents.unshift(parent)
  parents.forEach(parent => flushSync(() => parent.querySelector<HTMLElement>(':scope > summary')!.click()))
}
const field = (label: string) => { const input = active().querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${label}"]`)!; reveal(input); return input }
const change = (element: HTMLInputElement | HTMLSelectElement, value: string) => {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  const actualPrototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : prototype
  const setter = Object.getOwnPropertyDescriptor(actualPrototype, 'value')!.set!
  flushSync(() => { setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })) })
}
const click = (text: string, area: Element = active()) => {
  const editorLabel = client === 'main' ? ({ 'Aufgabe erfassen': 'Neue Aufgabe', 'Feste Verpflichtung': 'Neuer Termin', 'Arbeitsblock': 'Zeit einplanen', 'Verfügbarkeit': 'Verfügbarkeit' } as Record<string, string>)[text] : undefined
  const buttons = editorLabel ? active().querySelectorAll<HTMLButtonElement>('.nx-planning-editor nav button') : area.querySelectorAll<HTMLButtonElement>('button')
  const button = [...buttons].find(button => button.textContent?.trim() === (editorLabel || text))!
  assert(Boolean(button), `Actual ${client} control exists: ${text}`)
  reveal(button)
  flushSync(() => button.click())
}
const submit = () => flushSync(() => active().querySelector<HTMLFormElement>('form[aria-label="Manuelle Planungsaktion"]')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
const ack = () => wait(() => !workspaceOperation.isActive() && [...active().querySelectorAll('[role="status"]')].some(element => element.textContent?.includes('Dauerhaft gespeichert')), 'acknowledged form result').catch(error => { throw new Error(`${error.message}: ${active().querySelector('form[aria-label="Manuelle Planungsaktion"]')?.textContent}`) })
const keepConflict = () => flushSync(() => [...active().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(input => input.parentElement?.textContent?.includes('Konflikte'))!.click())
async function switchView(next: string) {
  view = next; render()
  await wait(() => active() && (next === 'calendar' ? active().querySelector(client === 'main' ? '[aria-label="Kalenderansicht"]' : 'form[aria-label="Manuelle Planungsaktion"]') : next === 'notes' ? active().querySelector('textarea') : next === 'canvas' ? active().querySelector('button') : active().querySelector(next === 'tasks' ? '.nx-task-card' : '.nx-planning-today-card')), `${client} ${next} actual view`)
  await pause()
  if (next === 'calendar' && client === 'main' && !active().querySelector('.nx-agenda-workspace')) click('Agenda', active().querySelector('[aria-label="Kalenderansicht"]')!)
  if (next === 'calendar') await wait(() => active().querySelector('form[aria-label="Manuelle Planungsaktion"]'), 'actual planning form')
  await pause()
}
(window as any).inspectMainLayout = async (next: string) => {
  client = 'main'; layoutFrame = true; await switchView(next)
  const editor = active().querySelector<HTMLElement>('.nx-agenda-editor-layer')
  if (editor && !editor.hidden) flushSync(() => active().querySelector<HTMLButtonElement>('[aria-label="Planungseditor schließen"]')!.click())
  await new Promise(resolve => setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(resolve)), 250))
  const selector = next === 'canvas' ? '.nx-canvas-topbar' : next === 'notes' ? '.nx-notes-workbar' : '.nx-agenda-workspace'
  const panel = active().querySelector<HTMLElement>(selector)!
  if (!panel.checkVisibility() || panel.getBoundingClientRect().width < innerWidth / 2) throw new Error(`Missing visible ${next} layout`)
  const controls = [...panel.querySelectorAll<HTMLElement>('button,input,select,summary')].filter(element => element.checkVisibility() && !element.closest('.nx-canvas-mobile-menu,.nx-notes-more-actions-menu'))
  return { view: next, width: innerWidth, height: innerHeight, panel: panel.getBoundingClientRect().toJSON(), overflowing: controls.filter(element => { const box = element.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1 }).map(element => element.title || element.textContent?.trim()) }
}

async function run() {
  await Promise.all([mainApp.persist.rehydrate(), mobileApp.persist.rehydrate(), mainCanvas.persist.rehydrate(), mobileCanvas.persist.rehydrate()])
  if (stage === 'theme-save' || stage === 'theme-reload') {
    if (stage === 'theme-save') localStorage.setItem('nx-theme-legacy-saved', JSON.stringify({ version: 'v6', mode: 'dark', accent: '#c97541' }))
    await useTheme.persist.rehydrate()
    layoutFrame = true; view = 'settings'; render()
    await wait(() => active()?.querySelector('.nx-settings-theme-library'), 'actual Settings Theme library')
    const library = () => active().querySelector('.nx-settings-theme-library')!
    const choose = (name: string) => flushSync(() => library().querySelector<HTMLButtonElement>(`[aria-label="Theme auswählen: ${name}"]`)!.click())
    const savedName = 'Mein Nächtliches Theme'
    assert(Boolean(library().querySelector('[aria-label="Theme auswählen: legacy-saved"]')), 'Previously saved standalone Themes are recovered in Settings without advanced options')
    if (stage === 'theme-reload') {
      assert(library().querySelectorAll('[data-saved-theme]').length === 2, 'Saved Theme library survives a fresh page load without duplicate entries')
      assert(useTheme.getState().accent === '#998877', 'The selected custom Theme remains active after a fresh page load')
      choose('Graphite Pro'); choose(savedName)
      assert(useTheme.getState().accent === '#998877' && useTheme.getState().glow.mode === 'focus' && useTheme.getState().background.mode === 'noise', 'A persisted custom Theme restores colors, glow and background after another preset is selected')
      return { ok: true, checks, evidence }
    }
    const theme = useTheme.getState()
    choose('legacy-saved')
    assert(useTheme.getState().accent === '#c97541' && useTheme.getState().accent2 === theme.accent2 && useTheme.getState().bg === theme.bg, 'A recovered partial Theme preserves colors that were not present in its saved payload')
    flushSync(() => { theme.setColors({ accent: '#f06595', accent2: '#6655dd', bg: '#171921' }); theme.setGlow({ mode: 'focus', color: '#f06595' }); theme.setBackground({ mode: 'noise' }) })
    click('Theme speichern'); change(field('Theme-Name'), savedName); click('Speichern')
    assert(Boolean(library().querySelector(`[aria-label="Theme auswählen: ${savedName}"]`)), 'Saving a Theme immediately adds a selectable card with its original Unicode name')
    choose('Graphite Pro'); choose(savedName)
    assert(useTheme.getState().accent === '#f06595' && useTheme.getState().glow.mode === 'focus', 'Selecting a custom Theme restores its colors and glow instead of a built-in preset')
    flushSync(() => useTheme.getState().setColors({ accent: '#998877' }))
    click('Theme speichern'); change(field('Theme-Name'), ` ${savedName} `); click('Speichern')
    assert(library().querySelectorAll('[data-saved-theme]').length === 2 && JSON.parse(localStorage.getItem('nx-saved-themes-v1')!).themes.find((entry: any) => entry.name === savedName).payload.accent === '#998877', 'Saving the same name updates its durable library entry without a duplicate')
    const originalSet = Storage.prototype.setItem
    try {
      Storage.prototype.setItem = function(key, value) { if (key === 'nx-saved-themes-v1') throw new DOMException('Synthetic quota failure', 'QuotaExceededError'); originalSet.call(this, key, value) }
      click('Theme speichern'); change(field('Theme-Name'), 'Cannot persist'); click('Speichern')
      assert(Boolean(active().querySelector('[aria-label="Theme-Name"]')) && !library().querySelector('[aria-label="Theme auswählen: Cannot persist"]') && active().textContent?.includes('Theme konnte nicht gespeichert werden'), 'A failed write keeps the save editor open, reports failure and adds no unsaved Theme card')
      click('Abbrechen')
    } finally { Storage.prototype.setItem = originalSet }
    assert(await persistenceRegistry.flush(), 'The selected Theme is flushed through the actual persistence owner before reload')
    return { ok: true, checks, evidence }
  }
  const day = zonedDate(new Date().toISOString(), 'Europe/Berlin'), tomorrow = nextCivilDay(day)
  if (stage === 'calendar-entry') {
    await mainCommands.ready(); view = 'calendar'; render()
    await wait(() => active()?.querySelector('.nx-calendar-timeline-panel'), 'Calendar starts in day view')
    const modes = () => active().querySelector('[aria-label="Kalenderansicht"]')!
    assert(modes().querySelector('[aria-pressed="true"]')?.textContent === 'Tag', 'Calendar starts in day view with a clearly selected view button')
    assert(modes().querySelectorAll('button svg').length === 4, 'All four Calendar view buttons have a visible icon and text label')
    click('Agenda', modes()); await wait(() => active().querySelector('.nx-agenda-workspace'), 'manual Agenda switch')
    await switchView('notes'); view = 'calendar'; render()
    await wait(() => active().querySelector('.nx-calendar-timeline-panel'), 'return to day view')
    assert(modes().querySelector('[aria-pressed="true"]')?.textContent === 'Tag', 'Returning to Calendar resets a previously selected Agenda to day view')
    requestPlanningNavigation('main', { mode: 'task', initialTitle: 'Explicit planning request' })
    await wait(() => active().querySelector('.nx-agenda-editor-layer')?.getAttribute('hidden') === null, 'explicit planning request opens Agenda')
    assert(Boolean(active().querySelector('.nx-agenda-workspace')), 'Explicit planning actions still open the Agenda editor')
    return { ok: true, checks, evidence }
  }
  if (stage === 'agenda-clarity') {
    await mainCommands.ready(); await switchView('calendar')
    const workspace = () => active().querySelector<HTMLElement>('.nx-agenda-workspace')!
    const layer = () => active().querySelector<HTMLElement>('.nx-agenda-editor-layer')!
    const closeEditor = () => flushSync(() => active().querySelector<HTMLButtonElement>('[aria-label="Planungseditor schließen"]')!.click())
    assert(Boolean(workspace()) && !active().querySelector('.nx-calendar-agenda-dialog'), 'Agenda is a dedicated Calendar workspace with a visible purpose, rather than a full-screen modal')
    assert(workspace().querySelector('h1')?.textContent === 'Agenda' && workspace().textContent?.includes('Aufgaben in Zeit verwandeln'), 'Agenda explains that tasks receive work time while fixed appointments stay visible')
    assert(workspace().querySelectorAll('details').length === 0 && layer().hidden, 'Main Agenda has no accordion menus and its editor starts closed')
    assert(workspace().querySelectorAll('.nx-agenda-week button').length === 7 && Boolean(workspace().querySelector('.nx-agenda-timeline[data-nx-surface-id]')) && Boolean(workspace().querySelector('.nx-agenda-task-panel[data-nx-surface-id]')), 'A seven-day button strip and separate Nexus Glass day-plan and task panels are available')
    assert(!active().querySelector('.nx-calendar-stats') && !active().querySelector('.nx-calendar-dayplan-button'), 'Agenda has no competing global stats or day-planner action')
    flushSync(() => active().querySelector<HTMLButtonElement>('.nx-agenda-task-panel .nx-agenda-segment button:nth-child(2)')!.click())
    assert(workspace().querySelector('.nx-agenda-task-panel button[aria-pressed="true"]')?.textContent?.includes('Noch zu planen'), 'Task filter visibly identifies the selected unscheduled-work list')
    active().querySelector<HTMLElement>('[data-agenda-open-editor]')!.focus({ preventScroll: true })
    ;(window as any).planningAgendaDisclosureReady = true
    await new Promise(resolve => { (window as any).resumePlanningAgendaDisclosure = resolve })
    assert(!layer().hidden && active().querySelector('.nx-agenda-editor')?.getAttribute('aria-modal') === 'true', 'Native Enter opens the Nexus entry drawer from the primary planning button')
    closeEditor(); await wait(() => layer().hidden, 'entry drawer closes')
    const originalDay = field('Agenda-Tag').value
    flushSync(() => active().querySelector<HTMLButtonElement>('[aria-label="Naechster Tag"]')!.click()); await pause()
    assert(field('Agenda-Tag').value !== originalDay, 'Calendar period navigation updates the selected Agenda day')
    flushSync(() => active().querySelector<HTMLButtonElement>('[aria-label="Vorheriger Tag"]')!.click()); await pause()
    assert(field('Agenda-Tag').value === originalDay, 'Calendar navigation returns to the original Agenda day')
    for (const mode of ['Tag', 'Woche', 'Monat']) {
      click(mode, active().querySelector('[aria-label="Kalenderansicht"]')!); await pause()
      assert(Boolean(active().querySelector(mode === 'Monat' ? '.nx-calendar-month-panel' : '.nx-calendar-timeline-panel')), `Existing ${mode} view still renders`)
      assert(Boolean(active().querySelector('.nx-calendar-stats')), `Existing ${mode} retains generic calendar stats`)
    }
    click('Tag', active().querySelector('[aria-label="Kalenderansicht"]')!); await pause()
    const dragTask = { ...mainApp.getState().tasks[0], id: 'agenda-clarity-drag', title: 'Agenda drag fixture', status: 'todo' as const, deadline: `${originalDay}T09:00:00`, durationMinutes: 30 }
    flushSync(() => mainApp.setState(state => ({ tasks: [...state.tasks, dragTask] })))
    await wait(() => [...active().querySelectorAll('.nx-calendar-card-task')].some(card => card.textContent?.includes(dragTask.title)), 'actual draggable Task card')
    const source = [...active().querySelectorAll<HTMLElement>('.nx-calendar-card-task')].find(card => card.textContent?.includes(dragTask.title))!
    const target = active().querySelector<HTMLElement>('.nx-calendar-hour-slot[aria-label^="10:00,"]')!
    assert(source.draggable && Boolean(target), 'Actual Calendar registers the Task drag source and timed drop target')
    const transfer = new DataTransfer()
    const drag = (element: HTMLElement, type: string) => { const bounds = element.getBoundingClientRect(); flushSync(() => element.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, clientX: bounds.left + bounds.width / 2, clientY: bounds.top + bounds.height / 2 }))) }
    source.scrollIntoView({ block: 'center' }); drag(source, 'dragstart'); await pause()
    target.scrollIntoView({ block: 'center' }); drag(target, 'dragenter'); drag(target, 'dragover'); await pause(); drag(target, 'drop'); drag(source, 'dragend')
    await wait(() => layer() && !layer().hidden, 'actual HTML5 Task drop opens Agenda editor')
    assert(field('Aufgabe für Arbeitsblock').value === dragTask.id && field('Planungsbeginn').value === `${originalDay}T10:00`, 'Actual HTML5 Task drag routes to Agenda with exact Task and target time')
    assert(mainApp.getState().tasks.find(task => task.id === dragTask.id)?.deadline === dragTask.deadline, 'Task drag opens scheduling without changing its deadline')
    closeEditor(); click('Schnelleintrag')
    change(field('Aufgabe Titel'), 'Agenda clarity quick task'); change(field('Zeit'), '10:30')
    const quickForm = active().querySelector<HTMLFormElement>('form[aria-label="Schnelleintrag"]')!
    flushSync(() => quickForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await wait(() => mainApp.getState().tasks.some(task => task.title === 'Agenda clarity quick task'), 'quick task acknowledgement')
    const quickTask = mainApp.getState().tasks.find(task => task.title === 'Agenda clarity quick task')!
    await wait(() => !layer().hidden && field('Aufgabe für Arbeitsblock').value === quickTask.id, 'quick-created Task opens exact scheduling editor')
    assert(field('Planungsbeginn').value === `${originalDay}T10:30` && quickTask.deadline === undefined, 'Quick entry opens scheduling with requested start, without inventing a deadline')
    assert(field('Arbeitsdauer in Minuten').value === '', 'Unknown task duration remains empty and is never estimated')
    closeEditor(); flushSync(() => active().querySelector<HTMLButtonElement>('.nx-agenda-task-panel .nx-agenda-segment button:nth-child(2)')!.click())
    change(field('Agenda-Aufgaben suchen'), quickTask.title)
    const cards = [...workspace().querySelectorAll('.nx-agenda-task-card')]
    assert(cards.length === 1 && cards[0].textContent?.includes('Dauer nicht festgelegt'), 'Task search finds exact unscheduled work and exposes its unknown duration')
    click('Planen', cards[0]); await wait(() => !layer().hidden, 'task card opens editor')
    assert(field('Aufgabe für Arbeitsblock').value === quickTask.id, 'Task-card Plan action opens its exact task')
    closeEditor(); change(field('Agenda-Aufgaben suchen'), '')
    requestPlanningNavigation('main', { mode: 'schedule', taskId: quickTask.id, localStart: `${tomorrow}T11:00` })
    await wait(() => !layer().hidden && field('Planungsbeginn').value === `${tomorrow}T11:00`, 'external scheduling navigation')
    assert(field('Aufgabe für Arbeitsblock').value === quickTask.id, 'External planning intent reopens the correct editor and requested start')
    const checkbox = [...active().querySelectorAll<HTMLInputElement>('.nx-planning-editor input[type="checkbox"]')].find(input => input.parentElement?.textContent?.includes('Konflikte'))!
    assert(!checkbox.checked && checkbox.getBoundingClientRect().height > 0, 'Conflict acknowledgement remains visible, explicit and unchecked')
    change(field('Planungszeitzone'), 'Europe/Berlin'); click('Arbeitsblock')
    change(field('Planungsbeginn'), '2026-10-25T02:30')
    assert(field('Beginn Uhrzeitvorkommen').getBoundingClientRect().height > 0, 'Ambiguous DST fold choice is surfaced in the open editor when required')
    change(field('Planungsbeginn'), `${tomorrow}T11:00`); closeEditor()
    click('Neuer Termin')
    await wait(() => active().querySelector('[aria-label="Planungstitel"]') && active().querySelector('[aria-label="Planungsende"]'), 'new appointment editor mode is visible')
    assert(field('Planungstitel').value === '' && field('Planungsende').value === '' && field('Planungsbeginn').value === `${originalDay}T09:00`, 'New appointment starts a fresh selected-day draft without stale title or end time')
    closeEditor(); click('Neue Aufgabe')
    await wait(() => active().querySelector('[aria-label="Aufgabenfrist"]'), 'new task editor mode is visible')
    assert(field('Planungstitel').value === '' && field('Aufgabenfrist').value === '' && field('Arbeitsdauer in Minuten').value === '', 'New task starts with an empty title and explicit optional deadline and duration')
    closeEditor()
    click('Tag', active().querySelector('[aria-label="Kalenderansicht"]')!); click('Import')
    await wait(() => workspace()?.querySelector<HTMLTextAreaElement>('.nx-planning-ics textarea') === document.activeElement, 'Calendar Import opens and focuses the real ICS page')
    assert(workspace().querySelectorAll('details').length === 0 && layer().hidden, 'Import is a full button-selected area without nested disclosures')
    click('Tagesplan'); flushSync(() => active().querySelector<HTMLButtonElement>('.nx-agenda-task-panel .nx-agenda-segment button:nth-child(2)')!.click())
    ;(window as any).verifyPlanningAgendaViewport = async () => {
      if (layer().hidden) flushSync(() => active().querySelector<HTMLButtonElement>('[data-agenda-open-editor]')!.click())
      await pause()
      const panel = workspace(), editor = panel.querySelector<HTMLElement>('.nx-agenda-editor')!, bounds = editor.getBoundingClientRect()
      const overflowing = [...panel.querySelectorAll<HTMLElement>('input,select,button')].filter(element => { const box = element.getBoundingClientRect(); return element.checkVisibility() && box.width > 0 && (box.left < -1 || box.right > innerWidth + 1) }).map(element => element.getAttribute('aria-label') || element.textContent?.trim())
      assert(overflowing.length === 0 && panel.scrollWidth <= panel.clientWidth + 1 && bounds.left >= 0 && bounds.right <= innerWidth + 1 && bounds.top >= 0 && bounds.bottom <= innerHeight + 1, `Actual Agenda workspace and entry drawer fit the viewport: ${JSON.stringify({ width: innerWidth, height: innerHeight, bounds, overflowing })}`)
      return { width: innerWidth, height: innerHeight, panelWidth: panel.clientWidth, panelScrollWidth: panel.scrollWidth, editorWidth: bounds.width, editorHeight: bounds.height, overflowing }
    }
    const expected = JSON.parse(localStorage.getItem('planning-smoke-expected')!)
    localStorage.setItem('planning-smoke-expected', JSON.stringify({ ...expected, mainPlanning: JSON.stringify(mainPlanning.capturePlanning()) }))
    return { ok: true, checks, evidence }
  }
  if (stage === 'agenda-accessibility') {
    await mobileCommands.ready(); client = 'mobile'; await switchView('calendar')
    const panel = active().querySelector<HTMLElement>('.nx-planning-panel')!
    assert(innerWidth === 390 && Boolean(panel), 'Actual registered Mobile Agenda is rendered at 390px')
    const dayField = panel.querySelector<HTMLInputElement>('header input[type="date"]')!
    const originalDay = dayField.value; change(dayField, tomorrow)
    assert(dayField.value === tomorrow, 'Narrow actual Agenda day selection remains usable')
    change(dayField, originalDay); click('Aufgabe erfassen')
    const baseFont = parseFloat(getComputedStyle(panel).fontSize)
    const headings = [...panel.querySelectorAll<HTMLElement>('h2,h3')].map(element => ({ element, size: parseFloat(getComputedStyle(element).fontSize) }))
    panel.style.fontSize = `${baseFont * 2}px`; headings.forEach(({ element, size }) => { element.style.fontSize = `${size * 2}px` })
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const titleField = field('Planungstitel')
    evidence.agenda = { width: innerWidth, baseFont, scaledFont: parseFloat(getComputedStyle(titleField).fontSize), clientWidth: panel.clientWidth, scrollWidth: panel.scrollWidth,
      overflowControls: [...panel.querySelectorAll<HTMLElement>('input,select,button')].filter(element => { const bounds = element.getBoundingClientRect(); return bounds.width > 0 && (bounds.left < -1 || bounds.right > innerWidth + 1) }).map(element => ({ label: element.getAttribute('aria-label') || element.textContent, width: element.getBoundingClientRect().width })) }
    assert(parseFloat(getComputedStyle(titleField).fontSize) >= baseFont * 1.9, 'Actual Agenda input text scales to 200 percent')
    assert(panel.scrollWidth <= panel.clientWidth + 1 && (evidence.agenda as any).overflowControls.length === 0, '390px actual Agenda at 200 percent text has no horizontal control overflow')
    const submitButton = panel.querySelector<HTMLButtonElement>('button[type="submit"]')!
    submitButton.scrollIntoView({ block: 'center' }); await pause()
    const submitBounds = submitButton.getBoundingClientRect()
    assert(submitBounds.left >= 0 && submitBounds.right <= innerWidth + 1 && submitBounds.top >= 0 && submitBounds.bottom <= innerHeight + 1, 'Enlarged Agenda save action remains reachable by vertical scrolling')
    assert([...panel.querySelectorAll<HTMLButtonElement>('nav button,button[type="submit"]')].every(button => button.getBoundingClientRect().height >= 44), 'Actual compact Agenda actions retain at least 44px touch targets')
    change(titleField, 'Mobile keyboard agenda'); titleField.focus()
    ;(window as any).planningAgendaKeyboardReady = true
    await new Promise(resolve => { (window as any).resumePlanningAgendaKeyboard = resolve })
    await ack()
    assert(mobileApp.getState().tasks.some(task => task.title === 'Mobile keyboard agenda'), 'Actual native Enter key submits the narrow enlarged Agenda capture with durable acknowledgement')
    const expected = JSON.parse(localStorage.getItem('planning-smoke-expected')!)
    localStorage.setItem('planning-smoke-expected', JSON.stringify({ ...expected, mobilePlanning: JSON.stringify(mobilePlanning.capturePlanning()) }))
    return { ok: true, checks, evidence }
  }
  if (stage === 'reload') {
    await Promise.all([mainCommands.ready(), mobileCommands.ready()])
    const expected = JSON.parse(localStorage.getItem('planning-smoke-expected')!)
    assert(JSON.stringify(mainPlanning.capturePlanning()) === expected.mainPlanning, 'Actual fresh Main module reload reads exact acknowledged planning document and receipts')
    assert(JSON.stringify(mobilePlanning.capturePlanning()) === expected.mobilePlanning, 'Actual fresh Mobile module reload reads exact acknowledged planning document and receipts')
    assert(mainApp.getState().tasks.find(task => task.id === 'synthetic-task')?.deadline === expected.deadline, 'Actual reload preserves original six-digit offset deadline')
    assert(mobileApp.getState().tasks.some(task => task.title === 'Mobile captured work' && !task.deadline), 'Actual Mobile reload preserves explicitly unscheduled capture')
    assert(mobileApp.getState().tasks.some(task => task.title === 'Mobile civil deadline' && task.deadline === expected.civilDate && (task as any).deadlineTimeZone === 'Europe/Berlin'), 'Fresh Mobile reload retains civil date deadline and its explicit IANA zone')
    assert((mainPlanning.capturePlanning().icsImports as any[])[0].raw === expected.ics && (mobilePlanning.capturePlanning().icsImports as any[])[0].raw === expected.ics, 'Fresh Main and Mobile module reload preserve exact raw ICS and unsupported recurrence archive')
    const beforeMainCount = mainApp.getState().tasks.length, beforeMobileCount = mobileApp.getState().tasks.length
    const mainPromotion = await mainPlanning.promoteEntity({ kind: 'note', id: 'promotion-note' }), mobilePromotion = await mobilePlanning.promoteEntity({ kind: 'note', id: 'promotion-note' })
    assert(mainPromotion.ok === true && mobilePromotion.ok === true && mainPromotion.ids[0] === expected.noteTaskId && mobilePromotion.ids[0] === expected.noteTaskId, 'Actual fresh Main/Mobile promotion adapters reuse original canonical Task ID across reload and transfer')
    assert(mainApp.getState().tasks.length === beforeMainCount && mobileApp.getState().tasks.length === beforeMobileCount, 'Fresh promotion retries never create duplicate Tasks')
    localStorage.setItem('planning-smoke-expected', JSON.stringify({ ...expected, mainPlanning: JSON.stringify(mainPlanning.capturePlanning()), mobilePlanning: JSON.stringify(mobilePlanning.capturePlanning()) }))
    client = 'mobile'; await switchView('calendar')
    assert(active().textContent?.includes('Mobile captured work'), 'Registered Mobile Agenda renders acknowledged work after reload')
    return { ok: true, checks, evidence }
  }
  if (stage === 'fault') {
    await mainCommands.ready(); await switchView('calendar'); click('Aufgabe erfassen'); change(field('Planungstitel'), 'Never falsely acknowledged')
    const before = JSON.stringify(mainApp.getState().tasks)
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (...args: any[]) {
      if (this.transaction.db.name === 'nexus-main-planning-journal-v1') throw new Error('Synthetic planning journal fault')
      return put.apply(this, args as any)
    }
    try { submit(); await wait(() => mainPlanning.getError(), 'journal failure visible') }
    finally { IDBObjectStore.prototype.put = put }
    assert(JSON.stringify(mainApp.getState().tasks) === before, 'Actual form journal failure leaves every canonical Task unchanged')
    assert(workspaceOperation.getSnapshot().kind === 'recovery', 'Actual journal failure publishes application recovery freeze')
    assert(!active().textContent?.includes('Dauerhaft gespeichert'), 'Actual journal failure never displays acknowledged success')
    const disclosure = active().querySelector<HTMLElement>('.nx-agenda-editor-layer')!; flushSync(() => active().querySelector<HTMLButtonElement>('[aria-label="Planungseditor schließen"]')!.click()); await pause()
    assert(disclosure.hidden && [...active().querySelectorAll<HTMLElement>('[role="alert"]')].some(element => element.getBoundingClientRect().height > 0 && element.textContent?.includes(mainPlanning.getError()!)), 'Storage error remains visibly outside the closed entry drawer')
    return { ok: true, checks, evidence }
  }
  if (stage === 'unsupported') {
    try { await mainCommands.ready() } catch {}
    assert(Boolean(mainPlanning.getError()), 'Unknown stored planning version is visibly rejected')
    assert(workspaceOperation.getSnapshot().kind === 'recovery', 'Unknown stored version publishes recovery freeze')
    const reader = createIndexedDbStorage<any>({ dbName: 'nexus-main-planning-v1', debounceMs: 0 })
    assert((await reader.getItem('nexus-main-planning-v1'))?.state.schemaVersion === 9, 'Unknown stored planning version remains intact without empty overwrite')
    return { ok: true, checks, evidence }
  }
  if (stage === 'inject-unsupported') {
    await mainCommands.ready()
    const document = mainPlanning.capturePlanning()
    const writer = createIndexedDbStorage<any>({ dbName: 'nexus-main-planning-v1', debounceMs: 0 })
    await writer.setItem('nexus-main-planning-v1', { state: { ...document, schemaVersion: 9 }, version: 1 })
    assert(await writer.flush(), 'Synthetic unknown-version fixture is durably stored before fresh module reload')
    return { ok: true, checks, evidence }
  }
  const deadline = `${day}T18:22:33.123456+02:00`
  const task = { id: 'synthetic-task', title: 'Synthetic due work', desc: 'Keep context', status: 'todo' as const, priority: 'high' as const, deadline, tags: ['context'], subtasks: [], created: new Date().toISOString(), updated: new Date().toISOString(), linkedNoteId: 'synthetic-note', linkedCanvasNodeId: 'legacy-node', futureMetadata: { preserve: true } }
  const reminder = { id: 'independent-point', title: 'Independent point', msg: '', datetime: `${day}T12:00:00Z`, repeat: 'none' as const, done: false }
  const note = { id: 'promotion-note', title: 'Promotion context', content: '# Complete original note', tags: ['keep'], created: new Date().toISOString(), updated: new Date().toISOString(), dirty: false, futureNote: { keep: true } }
  const repairNote = { ...note, id: 'repair-note', title: 'Repair destination', content: '# Repair destination context' }
  const node = { id: 'shared-node', type: 'text' as const, title: 'Wrong project node', content: 'Wrong project', x: 30, y: 40, width: 280, height: 160 }
  const canvases = [{ id: 'project-a', name: 'First project', nodes: [node], connections: [], created: new Date().toISOString(), updated: new Date().toISOString() }, { id: 'project-b', name: 'Chosen project', nodes: [{ ...node, title: 'Chosen project node', content: 'Correct project context' }], connections: [], created: new Date().toISOString(), updated: new Date().toISOString() }]
  const linked = { ...reminder, id: 'selected-linked-point', title: 'Selected linked point', linkedTaskId: task.id }
  const retainedLinked = { ...linked, id: 'retained-linked-point', title: 'Retained linked point' }
  flushSync(() => { mainApp.setState({ tasks: [task], reminders: [reminder, linked, retainedLinked], notes: [note, repairNote], openNoteIds: [note.id], activeNoteId: note.id, activities: [] }); mainCanvas.setState({ canvases, activeCanvasId: 'project-a' }) })
  await mainCommands.ready()
  await switchView('tasks')
  flushSync(() => active().querySelector<HTMLButtonElement>('button[aria-label="Schedule Synthetic due work"]')!.click())
  await wait(() => view === 'calendar' && active().querySelector('form[aria-label="Manuelle Planungsaktion"]'), 'accessible task Schedule opens actual Main Calendar form')
  await wait(() => active().querySelector<HTMLElement>('.nx-agenda-editor-layer')?.hidden === false && active().querySelector<HTMLSelectElement>('[aria-label="Aufgabe für Arbeitsblock"]')?.value === task.id, 'cached Calendar consumes exact Task navigation intent')
  assert(field('Aufgabe für Arbeitsblock').value === task.id, 'Accessible Task action selects exact Task in Main Calendar without changing its deadline')
  change(field('Planungszeitzone'), 'Europe/Berlin')
  click('Feste Verpflichtung'); change(field('Planungstitel'), 'Synthetic fixed event'); change(field('Planungsbeginn'), `${day}T12:00`); change(field('Planungsende'), `${day}T13:00`); submit(); await ack()
  assert(mainPlanning.capturePlanning().events.length === 1, 'Actual Main fixed Event form persists a distinct start/end commitment')
  click('Arbeitsblock'); change(field('Aufgabe für Arbeitsblock'), task.id); change(field('Planungsbeginn'), `${day}T12:15`)
  submit(); await wait(() => active().textContent?.includes('Gib eine Dauer in Minuten ein'), 'unknown duration validation')
  assert(mainPlanning.capturePlanning().blocks.length === 0, 'Actual Main schedule form requires unknown duration without inventing work')
  change(field('Arbeitsdauer in Minuten'), '30'); submit(); await wait(() => active().textContent?.includes('Überschneidung mit einem Termin'), 'concrete overlap shown')
  assert(mainPlanning.capturePlanning().blocks.length === 0, 'Actual Main overlap/unknown coverage requires explicit keep-conflict choice')
  keepConflict(); submit(); await ack()
  const block = mainPlanning.capturePlanning().blocks[0]
  assert(block.acceptedIssues.some(issue => issue.code === 'overlap') && block.acceptedIssues.some(issue => issue.code === 'unknown-coverage'), 'Explicit Main keep-conflict records overlap and unknown coverage visibly')
  assert(mainApp.getState().tasks[0].deadline === deadline && (mainApp.getState().tasks[0] as any).futureMetadata.preserve, 'Actual schedule preserves exact deadline, context and unknown Task metadata')
  click('Zeit ändern'); change(field('Planungsbeginn'), `${day}T14:00`); keepConflict(); submit(); await ack()
  assert(mainPlanning.capturePlanning().blocks[0].id === block.id && mainPlanning.capturePlanning().blocks[0].start === `${day}T12:00:00.000Z`, 'Actual keyboard move form moves same block with unchanged duration')
  assert(mainApp.getState().tasks[0].deadline === deadline, 'Actual move form leaves Task.deadline unchanged')
  click('Verfügbarkeit'); change(field('Planungsbeginn'), `${day}T09:00`); change(field('Planungsende'), `${day}T17:00`)
  flushSync(() => [...active().querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find(input => input.parentElement?.textContent?.includes('Alle beschäftigten'))!.click())
  submit(); await ack()
  assert(mainPlanning.capturePlanning().availability?.coverage === 'complete', 'Actual availability form stores only explicitly confirmed source coverage')
  await switchView('dashboard')
  assert(active().querySelector('.nx-planning-today-card')?.textContent?.includes('1 eindeutige offene Aufgaben'), 'Actual Main Dashboard counts due-plus-scheduled work once')
  assert(active().textContent?.includes('Frist heute'), 'Actual Main Dashboard exposes Task deadline reason in Today')
  await switchView('flux')
  assert(active().querySelector('.nx-planning-today-card')?.textContent?.includes('1 eindeutige offene Aufgaben'), 'Actual Main Flux consumes same Today derivation')
  await switchView('calendar'); click('Arbeitsblock'); await pause(); change(field('Planungszeitzone'), 'Europe/Berlin'); change(field('Aufgabe für Arbeitsblock'), task.id); change(field('Planungsbeginn'), `${tomorrow}T10:00`); change(field('Arbeitsdauer in Minuten'), '30'); keepConflict(); submit(); await ack()
  const futureId = mainPlanning.capturePlanning().blocks.at(-1)!.id
  flushSync(() => field('Beim Abschluss Erinnerung stoppen: Selected linked point').click())
  click('Abschließen'); await wait(() => mainApp.getState().tasks[0].status === 'done' && !workspaceOperation.isActive(), 'acknowledged completion')
  await wait(() => active().textContent?.includes('Erinnerungsstopp noch unbestätigt'), 'separate reminder owner-unavailable result')
  assert(mainPlanning.capturePlanning().blocks.find(block => block.id === futureId)?.state === 'inactive' && mainPlanning.capturePlanning().blocks.length === 2, 'Actual completion retains future inactive blocks and history')
  assert(!mainApp.getState().reminders[0].done, 'Actual completion retains independent reminder points')
  assert(mainApp.getState().reminders.every(reminder => !reminder.done), 'Unavailable App reminder owner retains selected and unselected reminders while Task acknowledgement remains visible')
  const revisionAfterCompletion = mainPlanning.capturePlanning().revision
  const stopCalls: string[] = []
  const releaseSyntheticOwner = registerReminderCommandOwner('main', async command => {
    assert(command.kind === 'stop' && command.id === linked.id, 'Explicit stop follow-up targets only the selected linked reminder')
    stopCalls.push(command.id)
    mainApp.setState(state => ({ reminders: state.reminders.map(reminder => reminder.id === command.id ? { ...reminder, done: true } : reminder) }))
    if (!await persistenceRegistry.flush()) return { ok: false, code: 'storage-unavailable', message: 'Synthetic follow-up acknowledgement failed' }
    return { ok: true, skipped: 0 }
  })
  try { click('Ausgewählte Erinnerungsstopps erneut versuchen'); await wait(() => active().textContent?.includes('wurde zusätzlich gestoppt'), 'separate successful synthetic reminder owner acknowledgement') }
  finally { releaseSyntheticOwner() }
  assert(stopCalls.length === 1 && mainApp.getState().reminders.find(reminder => reminder.id === linked.id)?.done, 'Retry dispatches the bound explicit selection after acknowledged Task completion')
  assert(mainPlanning.capturePlanning().revision === revisionAfterCompletion, 'Completion retry reuses canonical receipt without completing Task or changing block history twice')
  assert(!mainApp.getState().reminders.find(reminder => reminder.id === retainedLinked.id)?.done && !mainApp.getState().reminders.find(reminder => reminder.id === 'independent-point')?.done, 'Unselected linked and independent reminders remain unchanged after selected follow-up')
  assert(mainApp.getState().tasks[0].deadline === deadline && (mainApp.getState().tasks[0] as any).linkedNoteId === 'synthetic-note', 'Completion preserves exact deadline and linked context')
  const ics = `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:fixed-uid\r\nSUMMARY:Imported fixed interval\r\nDTSTART:${tomorrow.replaceAll('-', '')}T090012Z\r\nDTEND:${tomorrow.replaceAll('-', '')}T100013Z\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:series-uid\r\nSUMMARY:Unsupported fortnightly series\r\nDTSTART:${tomorrow.replaceAll('-', '')}T110000Z\r\nDTEND:${tomorrow.replaceAll('-', '')}T120000Z\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3\r\nEXDATE:${tomorrow.replaceAll('-', '')}T110000Z\r\nEND:VEVENT\r\nEND:VCALENDAR`
  const beforeIcsTasks = JSON.stringify(mainApp.getState().tasks), beforeIcsReminders = JSON.stringify(mainApp.getState().reminders), beforeIcsEvents = mainPlanning.capturePlanning().events.length
  click('Import')
  const icsPanel = active().querySelector<HTMLElement>('[aria-label="ICS Ereignisimport"]')!
  const transfer = new DataTransfer(); transfer.items.add(new File([ics], 'loss-aware.ics', { type: 'text/calendar' }))
  flushSync(() => { const input = field('ICS Datei') as HTMLInputElement; input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })) })
  await wait(() => icsPanel.textContent?.includes('Unsupported fortnightly series'), 'actual File.text ICS preview')
  assert(icsPanel.textContent?.includes('COUNT') && icsPanel.textContent?.includes('nicht ausgeführt'), 'Actual Main ICS preview exposes unsupported interval/count/exception semantics before import')
  click('ICS Vorschau dauerhaft importieren', icsPanel)
  await wait(() => icsPanel.textContent?.includes('ICS dauerhaft gespeichert'), 'actual acknowledged ICS import')
  const imported = mainPlanning.capturePlanning().events.find(event => event.source.uid === 'fixed-uid')!
  assert(mainPlanning.capturePlanning().events.length === beforeIcsEvents + 1 && imported.start === `${tomorrow}T09:00:12.000Z` && imported.end === `${tomorrow}T10:00:13.000Z`, 'Actual ICS form retains fixed UTC interval precision; unsupported series remains raw by default')
  assert((mainPlanning.capturePlanning().icsImports as any[])[0].raw === ics && (mainPlanning.capturePlanning().icsImports as any[])[0].rows[0].imported === true && (mainPlanning.capturePlanning().icsImports as any[])[0].rows[1].imported === false, 'Actual acknowledged raw archive retains exact file and accurate fixed-versus-unsupported provenance')
  assert(JSON.stringify(mainApp.getState().tasks) === beforeIcsTasks && JSON.stringify(mainApp.getState().reminders) === beforeIcsReminders, 'Actual ICS import does not project commitments into Task deadlines or Reminder repeats')
  await switchView('notes'); change(active().querySelector('textarea')! as any, '# Latest unsaved promotion context')
  click('Task'); await wait(() => active().textContent?.includes('Aufgabe dauerhaft bestätigt'), 'actual Note promotion acknowledgement')
  const noteTask = mainApp.getState().tasks.find(item => item.linkedNoteId === note.id)!
  assert(Boolean(noteTask) && noteTask.desc === 'Latest unsaved promotion context', 'Actual Note promotion flushes current editor draft before acknowledged Task capture')
  const promotedCount = mainApp.getState().tasks.length
  click('Task'); await mainCommands.drain()
  assert(mainApp.getState().tasks.length === promotedCount && mainApp.getState().tasks.filter(item => item.linkedNoteId === note.id).length === 1, 'Actual repeated Note promotion reuses same Task without duplicates')
  requestEntityNavigation('main', { kind: 'canvas-node', canvasId: 'project-b', id: node.id }); await switchView('canvas')
  await wait(() => mainCanvas.getState().activeCanvasId === 'project-b' && active().querySelector('.nx-canvas-inspector')?.textContent?.includes('Chosen project node'), 'typed exact Canvas target focus')
  assert(mainCanvas.getState().activeCanvasId === 'project-b' && active().querySelector('.nx-canvas-inspector')?.textContent?.includes('Chosen project node'), 'Actual typed Canvas navigation focuses correct project despite duplicate node IDs')
  click('Als Aufgabe dauerhaft übernehmen'); await mainCommands.drain(); await wait(() => mainApp.getState().tasks.some(item => item.title === 'Chosen project node'), 'actual scoped Canvas promotion')
  const canvasTask = mainApp.getState().tasks.find(item => item.title === 'Chosen project node')!
  click('Als Aufgabe dauerhaft übernehmen'); await mainCommands.drain()
  assert(mainApp.getState().tasks.filter(item => item.title === 'Chosen project node').length === 1 && (canvasTask as any).entityLinks[0].canvasId === 'project-b', 'Actual repeated Canvas promotion retains scoped relation and canonical ID without writing backlinks')
  await switchView('calendar')
  click('Verknüpfungen'); change(field('Aufgabe für Verknüpfungen'), noteTask.id)
  const relationArea = active().querySelector(`[aria-label="Kontextverknüpfungen: ${noteTask.title}"]`)!;
  await wait(() => relationArea.querySelector('select'), 'actual Note context controls opened')
  click('Ziel fokussieren', relationArea); await wait(() => view === 'notes' && mainApp.getState().activeNoteId === note.id, 'Calendar typed Note context opens exact entity')
  assert(view === 'notes' && mainApp.getState().activeNoteId === note.id, 'Actual Agenda Note context navigation focuses exact existing entity')
  await switchView('calendar'); click('Verknüpfungen'); change(field('Aufgabe für Verknüpfungen'), noteTask.id); mainApp.setState(state => ({ notes: state.notes.filter(item => item.id !== note.id), openNoteIds: [], activeNoteId: null }))
  await wait(() => active().textContent?.includes('Verknüpftes Ziel fehlt'), 'deleted Note link visible')
  const brokenArea = active().querySelector(`[aria-label="Kontextverknüpfungen: ${noteTask.title}"]`)!;
  (brokenArea as HTMLDetailsElement).open = true; await wait(() => brokenArea.querySelector('select'), 'actual broken Note context controls opened')
  assert(!(brokenArea.textContent || '').includes('Ziel fokussieren') && Boolean(mainApp.getState().tasks.find(item => item.id === noteTask.id)?.linkedNoteId), 'Actual source deletion leaves broken reference visible without creating a replacement Note')
  change(brokenArea.querySelector('select')!, JSON.stringify({ kind: 'note', id: repairNote.id })); click('Verknüpfung dauerhaft speichern', brokenArea)
  await wait(() => brokenArea.textContent?.includes('Verknüpfung dauerhaft bestätigt'), 'actual typed relationship repair acknowledgement')
  assert(mainApp.getState().tasks.find(item => item.id === noteTask.id)?.linkedNoteId === repairNote.id, 'Actual broken Note-context repair replaces relation with chosen typed destination after durable acknowledgement')
  mainApp.setState({ notes: [{ ...note, content: '# Latest unsaved promotion context' }, repairNote], openNoteIds: [note.id], activeNoteId: note.id })
  const mainDocument = mainPlanning.capturePlanning()
  flushSync(() => { mobileApp.setState({ tasks: structuredClone(mainApp.getState().tasks), reminders: structuredClone(mainApp.getState().reminders), notes: structuredClone(mainApp.getState().notes), activeNoteId: note.id, activities: [] }); mobileCanvas.setState({ canvases: structuredClone(mainCanvas.getState().canvases) as any, activeCanvasId: 'project-a' }) })
  await mobileCommands.ready(); mobilePlanning.restorePlanning(mainDocument); assert(await mobilePlanning.flushPlanning(), 'Cross-client fixture import planning port acknowledges exact declared document')
  assert(JSON.stringify(mobilePlanning.capturePlanning()) === JSON.stringify(mainDocument), 'Actual Mobile adapter retains exact Main planning document/provenance')
  assert((mobilePlanning.capturePlanning().icsImports as any[])[0].raw === ics && (mobileApp.getState().tasks.find(item => item.id === canvasTask.id) as any).entityLinks[0].canvasId === 'project-b', 'Actual Main to Mobile declared planning transfer preserves raw ICS and typed scoped Task relations')
  client = 'mobile'; await switchView('calendar')
  click('Aufgabe erfassen'); change(field('Planungstitel'), 'Mobile captured work'); submit(); await ack()
  const captured = mobileApp.getState().tasks.find(task => task.title === 'Mobile captured work')!
  assert(Boolean(captured) && captured.deadline === undefined, 'Actual Mobile capture returns canonical work without an inferred deadline/commitment')
  click('Arbeitsblock'); change(field('Aufgabe für Arbeitsblock'), captured.id); change(field('Planungszeitzone'), 'Europe/Berlin'); change(field('Planungsbeginn'), `${day}T16:00`); submit(); await wait(() => active().textContent?.includes('duration is unknown'), 'Mobile unknown duration validation')
  change(field('Arbeitsdauer in Minuten'), '30'); submit(); await ack()
  const mobileBlock = mobilePlanning.capturePlanning().blocks.find(block => block.taskId === captured.id)!
  assert(Boolean(mobileBlock), 'Actual Mobile Schedule form persists linked work with explicit duration')
  assert(mobileApp.getState().tasks.find(task => task.id === captured.id)?.deadline === undefined, 'Mobile scheduling leaves unscheduled Task deadline kind untouched')
  click('Zeit ändern'); change(field('Planungsbeginn'), `${day}T15:30`); submit(); await ack()
  const movedMobileBlock = mobilePlanning.capturePlanning().blocks.find(block => block.id === mobileBlock.id)!
  assert(movedMobileBlock.start === `${day}T13:30:00.000Z` && Date.parse(movedMobileBlock.end) - Date.parse(movedMobileBlock.start) === 30 * 60_000, 'Actual Mobile move form preserves block identity and duration with chosen time')
  assert(mobileApp.getState().tasks.find(task => task.id === captured.id)?.deadline === undefined, 'Actual Mobile move leaves canonical Task deadline untouched')
  const beforeCivilCapture = mobilePlanning.capturePlanning().blocks.length
  click('Aufgabe erfassen'); change(field('Planungstitel'), 'Mobile civil deadline'); change(field('Aufgabenfrist'), tomorrow); submit(); await ack()
  assert(mobileApp.getState().tasks.some(task => task.title === 'Mobile civil deadline' && task.deadline === tomorrow && (task as any).deadlineTimeZone === 'Europe/Berlin'), 'Actual Mobile civil deadline capture declares selected IANA zone without normalizing to midnight')
  assert(mobilePlanning.capturePlanning().blocks.length === beforeCivilCapture, 'Civil date deadline capture never creates an implicit work interval')
  await switchView('dashboard')
  assert(active().querySelector('.nx-planning-today-card')?.textContent?.includes('1 eindeutige offene Aufgaben'), 'Actual Mobile Dashboard shows scheduled work through shared Today selector')
  await switchView('flux')
  assert(active().querySelector('.nx-planning-today-card')?.textContent?.includes('1 eindeutige offene Aufgaben'), 'Actual Mobile Flux consumes same Today selector')
  requestEntityNavigation('mobile', { kind: 'note', id: note.id }); await switchView('notes')
  await wait(() => mobileApp.getState().activeNoteId === note.id, 'Mobile typed Note target focus')
  click('Task'); await mobileCommands.drain(); await wait(() => active().textContent?.includes('Aufgabe dauerhaft bestätigt'), 'actual Mobile repeated imported Note promotion')
  assert(mobileApp.getState().tasks.filter(item => (item as any).promotionSource?.id === note.id).length === 1 && mobileApp.getState().tasks.some(item => item.id === noteTask.id), 'Actual Mobile Note promotion reuses imported canonical Task after typed focus')
  requestEntityNavigation('mobile', { kind: 'canvas-node', canvasId: 'project-b', id: node.id }); await switchView('canvas')
  await wait(() => mobileCanvas.getState().activeCanvasId === 'project-b', 'Mobile scoped Canvas focus')
  assert(mobileCanvas.getState().activeCanvasId === 'project-b' && mobileCanvas.getState().canvases.find(canvas => canvas.id === 'project-b')?.nodes.some(item => item.id === node.id), 'Actual Mobile typed Canvas navigation retains selected project membership despite repeated node IDs')
  flushSync(() => active().querySelector<HTMLButtonElement>('button[title="Projekt Panel"]')!.click())
  await wait(() => active().textContent?.includes('Selected: Chosen project node'), 'Mobile exact selected node inspector')
  click('Als Aufgabe dauerhaft übernehmen'); await mobileCommands.drain(); await wait(() => active().textContent?.includes('Aufgabe dauerhaft bestätigt'), 'actual Mobile imported Canvas promotion')
  assert(mobileApp.getState().tasks.filter(item => (item as any).promotionSource?.canvasId === 'project-b').length === 1 && mobileApp.getState().tasks.some(item => item.id === canvasTask.id), 'Actual Mobile Canvas promotion reuses imported scoped canonical Task ID')
  evidence.main = { deadline, document: mainPlanning.capturePlanning(), downgrade: planningDowngradeNotice(mainPlanning.capturePlanning()) }
  evidence.mobile = { tasks: mobileApp.getState().tasks, document: mobilePlanning.capturePlanning() }
  localStorage.setItem('planning-smoke-expected', JSON.stringify({ deadline, civilDate: tomorrow, ics, noteTaskId: noteTask.id, mainPlanning: JSON.stringify(mainPlanning.capturePlanning()), mobilePlanning: JSON.stringify(mobilePlanning.capturePlanning()) }))
  return { ok: true, checks, evidence }
}
run().then(result => { (window as any).planningInteractionResult = result }).catch(error => { (window as any).planningInteractionResult = { ok: false, checks, evidence, error: String(error?.stack || error) } })
