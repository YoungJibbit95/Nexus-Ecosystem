import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import '../../Nexus Main/src/index.css'
import { MainViewHost } from '../../Nexus Main/src/app/mainViewHost'
import { MobileViewHost } from '../../Nexus Mobile/src/app/mobileViewHost'
import { useApp as mainApp } from '../../Nexus Main/src/store/appStore'
import { useApp as mobileApp } from '../../Nexus Mobile/src/store/appStore'
import { applicationCommands as mainCommands } from '../../Nexus Main/src/app/applicationCommands'
import { applicationCommands as mobileCommands } from '../../Nexus Mobile/src/app/applicationCommands'
import { planningStore as mainPlanning } from '../../Nexus Main/src/store/planningStore'
import { planningStore as mobilePlanning } from '../../Nexus Mobile/src/store/planningStore'
import { hydrateWorkspaceSources, recoverWorkspaceRestore } from '../../Nexus Main/src/app/workspaceRestore'
import { hydrateMobileSources, recoverWorkspaceHandoff } from '../../Nexus Mobile/src/app/workspaceHandoff'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'
import { getApplicationCapture } from '../../packages/nexus-core/src/application/captureNavigation'
import { emptyPlanningDocument } from '../../packages/nexus-core/src/planning/domain'
import { captureWorkspaceSources } from '../../Nexus Main/src/app/workspaceRestore'
import { createWorkspaceBackupSnapshot, listWorkspaceBackups, saveWorkspaceBackup } from '../../Nexus Main/src/app/workspaceBackup'
import { useCanvas as mainCanvas } from '../../Nexus Main/src/store/canvasStore'
import { NexusToolbar } from '../../Nexus Main/src/components/NexusToolbar'
import { CommandPalette } from '../../Nexus Mobile/src/components/CommandPalette'
import { Sidebar } from '../../Nexus Main/src/components/Sidebar'
import { NexusToolbar as MobileToolbar } from '../../Nexus Mobile/src/components/NexusToolbar'
import { useCanvas as mobileCanvas } from '../../Nexus Mobile/src/store/canvasStore'
import { WorkspaceMutationGuard } from '../../packages/nexus-core/src/storage/WorkspaceMutationGuard'

const client = new URLSearchParams(location.search).get('client') === 'mobile' ? 'mobile' : 'main'
const app = client === 'main' ? mainApp : mobileApp, owner = client === 'main' ? mainCommands : mobileCommands, planning = client === 'main' ? mainPlanning : mobilePlanning
const root = createRoot(document.getElementById('root')!)
const checks: string[] = []
const assert = (value: unknown, description: string) => { if (!value) throw new Error(description); checks.push(description) }
const pause = () => new Promise(resolve => setTimeout(resolve, 30))
const wait = async (condition: () => unknown, description: string) => { for (let n = 0; n < 800; n++) { if (condition()) return; await pause() }; throw new Error(`Timed out: ${description}`) }
let view = 'notes'
const navigate = (next: string) => { view = next; render() }
function Frame() {
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  return <><WorkspaceMutationGuard />{client === 'main' ? <><Sidebar view={view as any} onChange={navigate} availableViews={['notes','tasks','reminders','calendar','dashboard']} /><NexusToolbar setView={navigate} activeView={view} availableViews={['notes','tasks','reminders','calendar','dashboard']} /></> : <><MobileToolbar spotlightMode setView={navigate} /><button onClick={() => setPaletteOpen(true)}>Open actual mobile palette</button><CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} setView={navigate as any} /></>}
    {client === 'main' ? <MainViewHost view={view as any} mountedViews={[]} availableViews={['notes','tasks','reminders','calendar','dashboard']} reducedMotion onRequestViewChange={navigate} onPrefetchView={() => {}} onOpenWalkthrough={() => {}} /> : <MobileViewHost view={view as any} mountedViews={[]} availableViews={['notes','tasks','reminders','calendar','dashboard']} reducedMotion onRequestViewChange={navigate} />}</>
}
const render = () => flushSync(() => root.render(<Frame />))
const dialog = () => document.querySelector<HTMLDivElement>('[data-application-capture] [role="dialog"]')
const click = (text: string, area: Element = document.body) => { const button = [...area.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === text && !button.disabled && !button.closest('[hidden]')); assert(button, `Actual ${client} button: ${text}`); flushSync(() => button!.click()) }
const change = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) => { const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; const setter = Object.getOwnPropertyDescriptor(prototype, 'value')!.set!; flushSync(() => { setter.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })) }) }
const field = (label: string) => { const element = [...dialog()!.querySelectorAll('label')].find(element => element.textContent === label)!; return document.getElementById(element.htmlFor) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement }
const submit = () => flushSync(() => dialog()!.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
const acknowledge = () => wait(() => !workspaceOperation.isActive() && dialog()?.textContent?.includes('Gespeichert. ID:'), 'capture acknowledgement')
const go = async (next: string) => { view = next; render(); await wait(() => !document.body.textContent?.includes('Lade View...') && !document.body.textContent?.includes('Loading view...'), 'actual view loaded') }
const dashboardOpen = async (kind: 'note'|'reminder') => { await go('dashboard'); if (client === 'main') { if (kind === 'reminder') { click('Weitere'); click('Erinnerung') } else click('Neue Notiz') } else { click('Neu erstellen'); await wait(() => [...document.querySelectorAll('button')].some(button => button.textContent?.trim() === '+ Note'), 'mobile capture sheet'); click(kind === 'note' ? '+ Note' : '+ Reminder') }; await wait(dialog, 'dashboard shared capture dialog') }
const paletteQuery = async (query: string) => {
  if (client === 'main') flushSync(() => window.dispatchEvent(new CustomEvent('nx-open-spotlight', { detail: { query } })))
  else { click('Open actual mobile palette'); await wait(() => Boolean(document.querySelector('input[placeholder="Suche nach Views, Aktionen, Themes..."]')), 'mobile palette query'); change(document.querySelector<HTMLInputElement>('input[placeholder="Suche nach Views, Aktionen, Themes..."]')!, query) }
  await wait(() => document.body.textContent?.includes(`Capture ${query.split(':')[0]}`), 'actual palette typed capture result')
  const input = document.querySelector<HTMLInputElement>(client === 'main' ? 'input[placeholder^="Search commands..."]' : 'input[placeholder="Suche nach Views, Aktionen, Themes..."]')!
  assert(input, 'Actual command palette exposes typed capture result'); flushSync(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
}
const mobileToolbarCapture = async (command: string) => {
  const opener = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Shift x2'))!
  assert(opener, 'Actual mobile toolbar opener'); flushSync(() => opener.click())
  await wait(() => document.querySelector('input[placeholder="Befehl oder suchen…"]'), 'actual mobile toolbar input')
  const input = document.querySelector<HTMLInputElement>('input[placeholder="Befehl oder suchen…"]')!
  change(input, command)
  await wait(() => document.body.textContent?.includes(command), 'mobile toolbar capture command')
  flushSync(() => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
}
function failWrites(key: string, tag: string) {
  const put = IDBObjectStore.prototype.put, set = Storage.prototype.setItem
  let primary = 0, fallback = 0
  IDBObjectStore.prototype.put = function(value, entryKey) { const request = put.call(this, value, entryKey); if (String(entryKey) === key + '::__snapshot-v1' && String(value).includes(tag)) { primary++; this.transaction.abort() }; return request }
  Storage.prototype.setItem = function(entryKey, value) { if (entryKey === key + '::__snapshot-v1' && value.includes(tag)) { fallback++; throw new DOMException('Synthetic capture quota', 'QuotaExceededError') }; return set.call(this, entryKey, value) }
  return { restore: () => { IDBObjectStore.prototype.put = put; Storage.prototype.setItem = set }, count: () => ({ primary, fallback }) }
}
;(window as any).runApplicationCapture = async (phase: string) => {
  checks.length = 0
  await (client === 'main' ? hydrateWorkspaceSources() : hydrateMobileSources())
  if (phase === 'reload') {
    await (client === 'main' ? recoverWorkspaceRestore() : recoverWorkspaceHandoff())
    const proof = JSON.parse(localStorage.getItem('synthetic-capture-proof')!)
    assert(proof.noteIds.every((id: string) => app.getState().notes.some(item => item.id === id)), 'Reload retains returned Note IDs')
    assert(proof.reminderIds.every((id: string) => app.getState().reminders.some(item => item.id === id)), 'Reload retains returned Reminder IDs')
    assert(app.getState().notes.find(item => item.id === 'sentinel')?.content === 'pending source content', 'Reload preserves unrelated Note content')
    assert((app.getState().notes.find(item => item.id === 'sentinel') as any)?.future.deep === 'retained', 'Reload preserves unknown entity metadata')
    assert(!app.getState().notes.some(item => item.title.startsWith('io-fault')), 'Failed capture has no durable Note')
    assert(proof.taskIds.every((id: string) => app.getState().tasks.some(item => item.id === id)), 'Reload retains acknowledged capture Task IDs')
    assert(proof.eventIds.every((id: string) => planning.capturePlanning().events.some(item => item.id === id)), 'Reload retains acknowledged capture Event IDs')
    if (client === 'main') assert(JSON.stringify((await listWorkspaceBackups()).map(item => item.id).sort()) === JSON.stringify([...proof.backupIds].sort()), 'Reload retains all eight manual backup IDs')
    return { client, phase, checks: [...checks], proof }
  }
  if (phase === 'forms') {
    app.setState({ notes: [{ id: 'sentinel', title: 'Existing', content: 'pending source content', tags: ['keep'], dirty: true, created: '2026-09-30T09:00:00Z', updated: '2026-09-30T09:00:00Z', future: { deep: 'retained' } } as any], tasks: [], reminders: [], openNoteIds: ['sentinel'], activeNoteId: 'sentinel' })
    planning.restorePlanning(emptyPlanningDocument(`capture-${client}`))
    let undoReference: unknown
    if (client === 'main') {
      const canvas = { id: 'unrelated-canvas', name: 'User canvas', nodes: [], connections: [], created: '2026-09-30T09:00:00Z', updated: '2026-09-30T09:00:00Z' }
      const history = { past: [{ ...canvas, name: 'Before user edit' }], future: [], lastGroupKey: 'capture-sentinel', lastMutationAt: 123 }
      mainCanvas.setState({ canvases: [canvas], activeCanvasId: canvas.id, canvasHistory: { [canvas.id]: history } })
      undoReference = mainCanvas.getState().canvasHistory
    }
    assert(await persistenceRegistry.flush(), 'Synthetic source durably initialized')
    const backupIds: string[] = []
    if (client === 'main') {
      for (let n = 0; n < 8; n++) { const backup = createWorkspaceBackupSnapshot({ ...captureWorkspaceSources(), label: `Existing manual ${n}`, reason: 'manual' }); await saveWorkspaceBackup(backup); backupIds.push(backup.id) }
      assert((await listWorkspaceBackups()).length === 8, 'Eight existing manual backups are seeded')
    }
    const noteIds: string[] = [], reminderIds: string[] = [], taskIds: string[] = [], eventIds: string[] = []
    const ignored = { tasks: app.getState().tasks, codes: app.getState().codes, folders: app.getState().folders, canvases: (client === 'main' ? mainCanvas : mobileCanvas).getState().canvases }
    for (const origin of ['shell','dashboard']) {
      if (origin === 'shell') { await go('notes'); click('Neue Notiz'); await wait(dialog, 'shell capture dialog') } else await dashboardOpen('note')
      assert(app.getState().notes.length === 1 + noteIds.length, `${origin} opens an unsaved Note capture`)
      assert(field('Titel').value === 'Untitled' && field('Inhalt').value === '# Untitled\n\n', `${origin} uses the same Note defaults`)
      assert(document.activeElement === field('Titel'), `${origin} labels and focuses Note title`)
      if (origin === 'shell') assert(!document.body.textContent?.includes('Aenderungen wurden gespeichert'), 'Shell opening is not Saved')
      change(field('Titel'), `${client}-${origin}-note`); change(field('Inhalt'), '# preserved\nExact line\n'); submit(); await acknowledge()
      const id = app.getState().activeNoteId!
      assert(app.getState().notes.find(item => item.id === id)?.content === '# preserved\nExact line\n', `${origin} acknowledged Note retains exact content`)
      const receipt = Object.values(planning.capturePlanning().receipts).find(receipt => receipt.ids[0] === id)!
      const replay = await owner.execute(JSON.parse(receipt.command))
      assert(replay.ok && replay.replayed && replay.id === id && app.getState().notes.length === 2 + noteIds.length, `${origin} replay returns original ID without duplicate`)
      noteIds.push(id); click('Schließen', dialog()!)
    }
    for (const origin of ['shell','dashboard']) {
      if (origin === 'shell') { await go('reminders'); click('Neue Erinnerung'); await wait(dialog, 'shell Reminder dialog') } else await dashboardOpen('reminder')
      const intent = getApplicationCapture(client)!
      assert(Date.parse(field('Zeitpunkt (ISO 8601 mit UTC/Offset)').value) - Date.parse(intent.createdAt) === 60 * 60000, `${origin} Reminder default is visibly one hour with explicit UTC`)
      assert(field('Titel').value === 'New Reminder' && field('Nachricht').value === '' && field('Wiederholung').value === 'none', `${origin} Reminder uses same content/repeat defaults`)
      assert(app.getState().reminders.length === reminderIds.length, `${origin} opens unsaved Reminder`)
      const instant = origin === 'shell' ? '2026-10-25T02:30:00.123+02:00' : '2026-10-25T03:30:00.456+01:00'
      change(field('Titel'), `${client}-${origin}-reminder`); change(field('Nachricht'), 'Exact message'); change(field('Zeitpunkt (ISO 8601 mit UTC/Offset)'), instant); change(field('Wiederholung'), 'monthly'); submit(); await acknowledge()
      const reminder = app.getState().reminders.find(item => item.title === `${client}-${origin}-reminder`)!
      assert(reminder.datetime === instant && reminder.msg === 'Exact message', `${origin} acknowledgement retains exact offset/precision`)
      reminderIds.push(reminder.id); click('Schließen', dialog()!)
    }
    const beforePalette = JSON.stringify({ notes: app.getState().notes, reminders: app.getState().reminders, tasks: app.getState().tasks, planning: planning.capturePlanning() })
    await paletteQuery('note: typed exact title'); await wait(dialog, 'typed palette Note capture')
    assert(field('Titel').value === 'typed exact title', 'Command palette retains explicit user Note title')
    click('Abbrechen', dialog()!)
    assert(JSON.stringify({ notes: app.getState().notes, reminders: app.getState().reminders, tasks: app.getState().tasks, planning: planning.capturePlanning() }) === beforePalette, 'Palette capture cancellation has no store/receipt mutation')
    await paletteQuery('note: typed acknowledged title'); await wait(dialog, 'typed acknowledged Note capture')
    submit(); await acknowledge(); noteIds.push(app.getState().activeNoteId!); click('Schließen', dialog()!)
    assert(app.getState().notes.find(item => item.id === noteIds[noteIds.length-1])?.title === 'typed acknowledged title', 'Command palette confirm returns ID only after exact-title capture acknowledgement')
    await paletteQuery('rem: typed reminder'); await wait(dialog, 'typed palette Reminder capture')
    assert(field('Titel').value === 'typed reminder' && field('Nachricht').value === '', 'Command palette Reminder matches shared defaults and preserves query title')
    change(field('Zeitpunkt (ISO 8601 mit UTC/Offset)'), '2026-10-26T09:30:00.987+01:00'); submit(); await acknowledge()
    const paletteReminder = app.getState().reminders.find(item => item.title === 'typed reminder')!
    assert(paletteReminder?.datetime === '2026-10-26T09:30:00.987+01:00', 'Command palette Reminder confirmation returns ID after exact-time acknowledgement'); reminderIds.push(paletteReminder.id); click('Schließen', dialog()!)
    await paletteQuery('task: typed task draft'); await wait(() => document.body.querySelector<HTMLInputElement>('input[aria-label="Planungstitel"]')?.value === 'typed task draft', 'typed planning task title')
    assert(app.getState().tasks.length === 0, 'Typed Task command opens existing unsaved PlanningPanel with user title')
    await paletteQuery('event: typed event draft'); await wait(() => document.body.querySelector<HTMLInputElement>('input[aria-label="Planungstitel"]')?.value === 'typed event draft', 'typed planning event title')
    assert(planning.capturePlanning().events.length === 0, 'Typed Event command opens existing unsaved PlanningPanel with user title')
    if (client === 'main') {
      click('Note'); await wait(dialog, 'actual Sidebar shared Note form')
      assert(field('Titel').value === 'Untitled', 'Sidebar Note shares visible defaults'); click('Abbrechen', dialog()!)
      click('Task'); await wait(() => document.body.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Aufgabe erfassen', 'actual Sidebar unsaved Task form')
      assert(app.getState().tasks.length === 0, 'Sidebar Task uses existing unsaved planning owner')
    } else {
      for (const [command, mode] of [['New Note','note'],['Capture Reminder','reminder'],['New Task','task'],['Capture Fixed Event','event']]) {
        await mobileToolbarCapture(command)
        if (mode === 'note' || mode === 'reminder') { await wait(dialog, 'actual mobile toolbar shared capture'); assert(field('Titel').value === (mode === 'note' ? 'Untitled' : 'New Reminder'), `Mobile toolbar ${mode} shares defaults`); click('Abbrechen', dialog()!) }
        else { await wait(() => document.body.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === (mode === 'task' ? 'Aufgabe erfassen' : 'Feste Verpflichtung erfassen'), 'mobile toolbar planning form'); assert(app.getState().tasks.length === 0 && planning.capturePlanning().events.length === 0, `Mobile toolbar ${mode} remains unsaved`) }
      }
    }
    await go('tasks'); click('Neuer Task'); await wait(() => document.body.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Aufgabe erfassen', 'Task capture destination')
    assert(view === 'calendar' && app.getState().tasks.length === 0, 'Task shell opens shared unsaved planning destination')
    click('Neuer Kalendereintrag'); await wait(() => document.body.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Feste Verpflichtung erfassen', 'Event capture destination')
    assert(planning.capturePlanning().events.length === 0, 'Event shell opens shared unsaved planning destination')
    assert(app.getState().tasks === ignored.tasks && app.getState().codes === ignored.codes && app.getState().folders === ignored.folders && (client === 'main' ? mainCanvas : mobileCanvas).getState().canvases === ignored.canvases, 'Note/Reminder captures preserve unrelated source references')
    for (const origin of ['shell','palette','dashboard']) {
      if (origin === 'shell') { await go('tasks'); click('Neuer Task') }
      else if (origin === 'palette') await paletteQuery(`task: ${client}-${origin}-task`)
      else { await go('dashboard'); if (client === 'main') click('Neuer Task'); else { click('Neu erstellen'); await wait(() => [...document.querySelectorAll('button')].some(button => button.textContent?.trim() === '+ Task'), 'dashboard Task action'); click('+ Task') } }
      await wait(() => document.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Aufgabe erfassen', 'shared capture Task form')
      change(document.querySelector<HTMLInputElement>('input[aria-label="Planungstitel"]')!, `${client}-${origin}-task`)
      const form = document.querySelector<HTMLFormElement>('form[aria-label="Manuelle Planungsaktion"]')!
      flushSync(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
      await wait(() => form.textContent?.includes('Dauerhaft gespeichert'), `${origin} Task acknowledgement`)
      const task = app.getState().tasks.find(item => item.title === `${client}-${origin}-task`)!
      assert(task?.id && Object.values(planning.capturePlanning().receipts).some(receipt => receipt.ids.includes(task.id)), `${origin} Task submit returns canonical owner ID/receipt`); taskIds.push(task.id)
    }
    await paletteQuery(`task: ${client}-dashboard-task`)
    await wait(() => document.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Aufgabe erfassen', 'new identical Task intent')
    const repeatedTaskForm = document.querySelector<HTMLFormElement>('form[aria-label="Manuelle Planungsaktion"]')!
    assert(!repeatedTaskForm.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, 'New Task intent with unchanged draft gets a fresh command identity')
    flushSync(() => repeatedTaskForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await wait(() => repeatedTaskForm.textContent?.includes('Dauerhaft gespeichert'), 'new identical Task acknowledgement')
    const repeatedTask = app.getState().tasks.find(item => !taskIds.includes(item.id))!
    assert(repeatedTask?.title === `${client}-dashboard-task`, 'Explicit new identical Task intent creates a separately acknowledged ID'); taskIds.push(repeatedTask.id)
    for (const origin of ['shell','palette']) {
      if (origin === 'shell') click('Neuer Kalendereintrag'); else await paletteQuery(`event: ${client}-${origin}-event`)
      await wait(() => document.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Feste Verpflichtung erfassen', 'shared Event form')
      change(document.querySelector<HTMLInputElement>('input[aria-label="Planungstitel"]')!, `${client}-${origin}-event`)
      change(document.querySelector<HTMLInputElement>('input[aria-label="Planungszeitzone"]')!, 'Europe/Berlin')
      change(document.querySelector<HTMLInputElement>('input[aria-label="Planungsbeginn"]')!, origin === 'shell' ? '2026-10-02T10:00' : '2026-10-02T12:00')
      change(document.querySelector<HTMLInputElement>('input[aria-label="Planungsende"]')!, origin === 'shell' ? '2026-10-02T11:00' : '2026-10-02T13:00')
      const form = document.querySelector<HTMLFormElement>('form[aria-label="Manuelle Planungsaktion"]')!
      const conflict = [...form.querySelectorAll<HTMLLabelElement>('label')].find(label => label.textContent?.includes('ausdrücklich behalten'))!.querySelector<HTMLInputElement>('input')!
      flushSync(() => conflict.click()); flushSync(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
      await wait(() => form.textContent?.includes('Dauerhaft gespeichert'), `${origin} Event acknowledgement`)
      const event = planning.capturePlanning().events.find(item => item.title === `${client}-${origin}-event`)!
      assert(event?.id && Object.values(planning.capturePlanning().receipts).some(receipt => receipt.ids.includes(event.id)), `${origin} Event submit returns canonical owner ID/receipt`); eventIds.push(event.id)
    }
    await paletteQuery(`event: ${client}-palette-event`)
    await wait(() => document.querySelector('form[aria-label="Manuelle Planungsaktion"] h3')?.textContent === 'Feste Verpflichtung erfassen', 'new identical Event intent')
    const repeatedEventForm = document.querySelector<HTMLFormElement>('form[aria-label="Manuelle Planungsaktion"]')!
    assert(!repeatedEventForm.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, 'New Event intent with unchanged draft gets a fresh command identity')
    const repeatConflict = [...repeatedEventForm.querySelectorAll<HTMLLabelElement>('label')].find(label => label.textContent?.includes('ausdrücklich behalten'))!.querySelector<HTMLInputElement>('input')!
    flushSync(() => repeatConflict.click()); flushSync(() => repeatedEventForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    await wait(() => repeatedEventForm.textContent?.includes('Dauerhaft gespeichert'), 'new identical Event acknowledgement')
    const repeatedEvent = planning.capturePlanning().events.find(item => !eventIds.includes(item.id))!
    assert(repeatedEvent?.title === `${client}-palette-event`, 'Explicit new identical Event intent creates a separately acknowledged ID'); eventIds.push(repeatedEvent.id)
    assert((app.getState().notes.find(item => item.id === 'sentinel') as any).future.deep === 'retained', 'All captures retain unrelated entity metadata')
    if (client === 'main') assert(mainCanvas.getState().canvasHistory === undoReference && mainCanvas.getState().canvasHistory['unrelated-canvas'].past[0].name === 'Before user edit', 'Capture and replay preserve unrelated Canvas undo and its live reference')
    if (client === 'main') assert(JSON.stringify((await listWorkspaceBackups()).map(item => item.id).sort()) === JSON.stringify([...backupIds].sort()), 'Capture plus replay retain all eight manual backups')
    localStorage.setItem('synthetic-capture-proof', JSON.stringify({ noteIds, reminderIds, taskIds, eventIds, backupIds }))
    return { client, phase, checks: [...checks], noteIds, reminderIds, taskIds, eventIds }
  }
  if (phase === 'accessibility') {
    for (const kind of ['note','reminder']) {
    await go(kind === 'note' ? 'notes' : 'reminders')
    const openerText = kind === 'note' ? 'Neue Notiz' : 'Neue Erinnerung'
    const opener = [...document.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === openerText)!
    opener.focus(); click(openerText); await wait(dialog, 'accessible capture dialog')
    const surface = dialog()!, controls = [...surface.querySelectorAll<HTMLElement>('input,textarea,select,button')]
    assert(document.getElementById(surface.getAttribute('aria-labelledby')!)?.textContent === (kind === 'note' ? 'Notiz erfassen' : 'Reminder erfassen') && document.getElementById(surface.getAttribute('aria-describedby')!)?.getAttribute('aria-live') === 'polite', `${kind}: dialog title/status are linked and status is polite`)
    assert(controls.every(control => control.getBoundingClientRect().height >= 44), `390px ${kind}: every capture control has a 44px touch target`)
    const baseFont = parseFloat(getComputedStyle(surface).fontSize); surface.style.fontSize = '200%'
    assert(parseFloat(getComputedStyle(surface).fontSize) >= baseFont * 1.9 && surface.scrollWidth <= surface.clientWidth + 1, `390px ${kind} at 200% font: no horizontal capture overflow`)
    const last = controls[controls.length - 1]; last.scrollIntoView({ block: 'nearest' }); const bounds = last.getBoundingClientRect()
    assert(bounds.left >= 0 && bounds.right <= innerWidth + 1 && bounds.bottom <= innerHeight + 1, '200% font: final action is reachable within viewport')
    controls[0].focus(); flushSync(() => controls[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })))
    assert(document.activeElement === last, 'Shift-Tab wraps to final capture action')
    flushSync(() => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
    assert(document.activeElement === controls[0], 'Tab wraps to initial capture field')
    assert([surface,...controls].every(control => getComputedStyle(control).animationName === 'none' && getComputedStyle(control).transitionDuration.split(',').every(value => parseFloat(value) === 0)), 'Capture dialog has no unexpected motion')
    flushSync(() => controls[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })))
    assert(!dialog() && document.activeElement === opener, 'Escape closes without mutation and returns focus to opener')
    }
    return { client, phase, viewport: { width: innerWidth, height: innerHeight }, checks: [...checks] }
  }
  if (phase === 'fault') {
    await go('notes')
    const undoReference = client === 'main' ? mainCanvas.getState().canvasHistory : undefined
    for (const key of ['nx-app-v3', `nexus-${client}-planning-v1`]) {
      const before = JSON.stringify({ notes: app.getState().notes, reminders: app.getState().reminders, planning: planning.capturePlanning() })
      const ignored = { tasks: app.getState().tasks, codes: app.getState().codes, folders: app.getState().folders, canvases: (client === 'main' ? mainCanvas : mobileCanvas).getState().canvases }
      click('Neue Notiz'); await wait(dialog, 'fault capture dialog')
      const title = `io-fault-${key}`; change(field('Titel'), title)
      const fault = failWrites(key, title)
      const guard = document.querySelector<HTMLDialogElement>('dialog[aria-label="Workspace-Vorgang"]')!; let guardWasOpen = false
      const observer = new MutationObserver(records => { if (records.some(record => record.attributeName === 'open' && record.oldValue === null)) guardWasOpen = true }); observer.observe(guard, { attributes: true, attributeOldValue: true })
      try { submit(); await wait(() => !workspaceOperation.isActive() && dialog()?.textContent?.includes('nicht bestätigt'), 'failed capture message') }
      finally { fault.restore(); observer.disconnect() }
      assert(guardWasOpen && !guard.open, `${key} real workspace modal guards IO and releases after compensation`)
      assert(fault.count().primary > 0 && fault.count().fallback > 0, `${key} primary and fallback writes really fail`)
      assert(JSON.stringify({ notes: app.getState().notes, reminders: app.getState().reminders, planning: planning.capturePlanning() }) === before, `${key} rolls back source plus receipt`)
      assert(field('Titel').value === title && !dialog()?.textContent?.includes('Gespeichert. ID:'), `${key} keeps inputs and has no success ID`)
      assert(app.getState().tasks === ignored.tasks && app.getState().codes === ignored.codes && app.getState().folders === ignored.folders && (client === 'main' ? mainCanvas : mobileCanvas).getState().canvases === ignored.canvases, `${key} failure preserves unrelated source references`)
      click('Abbrechen', dialog()!)
    }
    if (client === 'main') { const proof = JSON.parse(localStorage.getItem('synthetic-capture-proof')!); assert(JSON.stringify((await listWorkspaceBackups()).map(item => item.id).sort()) === JSON.stringify([...proof.backupIds].sort()), 'Fault compensation retains every manual backup') }
    if (client === 'main') assert(mainCanvas.getState().canvasHistory === undoReference && mainCanvas.getState().canvasHistory['unrelated-canvas'].past[0].name === 'Before user edit', 'Fault compensation preserves unrelated Canvas undo reference')
    return { client, phase, checks: [...checks] }
  }
  throw new Error(`Unknown phase ${phase}`)
}
