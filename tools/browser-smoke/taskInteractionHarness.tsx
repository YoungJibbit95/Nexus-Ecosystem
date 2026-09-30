import React from 'react'
import '../../Nexus Main/src/index.css'
import '../../Nexus Main/src/app/NexusV6ViewShell.css'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { MainViewHost } from '../../Nexus Main/src/app/mainViewHost'
import { useApp } from '../../Nexus Main/src/store/appStore'
import { workspaceOperation } from '../../packages/nexus-core/src/storage/workspaceOperation'

const stage = new URLSearchParams(location.search).get('stage') || 'after'
const checks: string[] = []
const evidence: Record<string, unknown> = { stage, hidden: [], active: [], deadlines: [] }
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); checks.push(message) }
const settle = () => new Promise(resolve => setTimeout(resolve, 80))
const waitFor = async (find: () => Element | null) => {
  for (let index = 0; index < 300; index++) { const value = find(); if (value) return value; await settle() }
  throw new Error('Expected actual view did not render')
}
const key = (target: EventTarget, name: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options })
  flushSync(() => target.dispatchEvent(event))
  return event.defaultPrevented
}
const input = (target: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  flushSync(() => { setter.call(target, value); target.dispatchEvent(new Event('input', { bubbles: true })); target.dispatchEvent(new Event('change', { bubbles: true })) })
}
const seedTask = (id: string, deadline?: string) => ({ id, title: `Synthetic ${id}`, desc: 'Keep description', status: 'todo' as const, priority: 'low' as const, deadline, tags: [], subtasks: [], created: '2026-01-01', updated: '2026-01-01' })
const root = createRoot(document.getElementById('root')!)
let view = 'tasks'
const mounted = ['tasks', 'notes', 'canvas', 'calendar', 'flux', 'reminders', 'files'] as any
const render = () => flushSync(() => root.render(<MainViewHost view={view as any} mountedViews={mounted} availableViews={mounted} reducedMotion onRequestViewChange={next => { view = String(next); render() }} onPrefetchView={() => {}} onOpenWalkthrough={() => {}} />))
const viewRoots: Record<string, string> = { tasks: '.nx-tasks-toolbar', notes: '.nx-notes-v6', canvas: '.nx-canvas-v6', calendar: '.nx-calendar-view', flux: '.nx-flux-v6', reminders: '.nx-reminders-v6', files: '.nx-files-v6' }
const switchView = async (next: string) => { view = next; render(); await waitFor(() => document.querySelector(`.nx-v6-view-shell[data-view="${next}"][data-active="true"] ${viewRoots[next]}`)); await settle() }
const visible = (element: Element) => element.getClientRects().length > 0
const tasksSearch = () => document.querySelector<HTMLInputElement>('input[placeholder="Search tasks..."]')!
const waitModalClosed = async () => {
  for (let index = 0; index < 100; index++) { if (!document.querySelector('.nx-task-modal-sheet')) return; await settle() }
  throw new Error('Task modal did not finish closing')
}

async function run() {
  await useApp.persist.rehydrate()
  useApp.setState({ tasks: [seedTask('timed', '2026-11-03T16:22:33.123456+02:00')], reminders: [], notes: [{ id: 'synthetic-note', title: 'Synthetic note', content: 'Unrelated editor', tags: [], created: '2026-01-01', updated: '2026-01-01', dirty: false }], activeNoteId: 'synthetic-note', openNoteIds: ['synthetic-note'] })
  localStorage.removeItem('nx-tasks-work-mode-v1')
  render()
  await waitFor(() => document.querySelector('.nx-tasks-toolbar'))
  await settle()
  if (stage === 'visual') {
    flushSync(() => document.querySelector('.nx-task-card')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    await waitFor(() => document.querySelector('.nx-task-modal-sheet'))
    await new Promise(resolve => setTimeout(resolve, 500))
    assert(Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')), 'Styled visual fixture shows the actual labelled Task dialog')
    return { ok: true, checks, evidence }
  }
  const editable = document.createElement('textarea')
  editable.setAttribute('aria-label', 'Synthetic unrelated editor')
  document.body.append(editable)
  const select = document.createElement('select')
  document.body.append(select)
  const contenteditable = document.createElement('div')
  contenteditable.contentEditable = 'true'
  contenteditable.innerHTML = '<span>Editable descendant</span>'
  document.body.append(contenteditable)

  for (const hiddenView of ['notes', 'canvas', 'calendar', 'flux', 'reminders', 'files']) {
    await switchView(hiddenView)
    assert(!visible(tasksSearch()), `Tasks stays mounted and hidden while ${hiddenView} owns the view`)
    const before = JSON.stringify(useApp.getState().tasks)
    for (const letter of ['t', 'e', 'g']) key(document.body, letter)
    editable.focus()
    const prevented = key(editable, 'f', { ctrlKey: true })
    const row = { view: hiddenView, taskMutation: before !== JSON.stringify(useApp.getState().tasks), editorSearchPrevented: prevented, focusRetained: document.activeElement === editable }
    ;(evidence.hidden as unknown[]).push(row)
    if (!['before', 'files-before'].includes(stage)) assert(!row.taskMutation && !prevented && row.focusRetained, `${hiddenView}: hidden Tasks cannot mutate or steal editor search`)
    if (hiddenView === 'notes' && !['before', 'files-before'].includes(stage)) {
      const noteEditor = [...document.querySelectorAll<HTMLTextAreaElement>('.nx-notes-v6 textarea')].find(visible)!
      assert(Boolean(noteEditor), 'Actual Notes editor is mounted in the active view')
      noteEditor.focus()
      assert(!key(noteEditor, 'f', { ctrlKey: true }) && document.activeElement === noteEditor, 'Actual Notes editor retains Ctrl+F without hidden-view search theft')
    }
  }

  if (stage === 'files-before') return { ok: true, checks, evidence }

  if (stage === 'after') {
    await switchView('files')
    const listButton = document.querySelector<HTMLButtonElement>('.nx-files-v6 button[aria-label="List view"]')!
    flushSync(() => listButton.click())
    await settle()
    assert(Boolean(document.querySelector('.nx-files-list')), 'Actual Files list contains synthetic fixture items')
    assert(key(document.body, 'g') && Boolean(document.querySelector('.nx-files-card-grid')), 'Active Files g toggles its own grid view')
    assert(key(document.body, 'f', { ctrlKey: true }) && document.activeElement === document.querySelector('.nx-files-v6 input[placeholder="In dieser Ansicht suchen"]'), 'Active Files Ctrl+F focuses its own search')
    flushSync(() => listButton.click())
    editable.focus()
    assert(!key(editable, 'f', { ctrlKey: true }) && document.activeElement === editable, 'Active Files preserves editor Ctrl+F and focus')
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }]) {
      assert(!key(document.body, 'g', options) && Boolean(document.querySelector('.nx-files-list')), `Files ignores modified/composing/repeated g: ${JSON.stringify(options)}`)
    }
    await workspaceOperation.run(async () => {
      assert(!key(document.body, 'g') && !key(document.body, 'f', { ctrlKey: true }) && Boolean(document.querySelector('.nx-files-list')), 'Workspace replacement pauses Files keyboard commands')
    })
    await switchView('notes')
    assert(!key(document.body, 'g') && Boolean(document.querySelector('.nx-files-list')), 'Cached hidden Files does not toggle its grid while Notes is active')
    await switchView('flux')
    const count = useApp.getState().tasks.length
    assert(key(document.body, 't', { ctrlKey: true, shiftKey: true }) && useApp.getState().tasks.length === count + 1, 'Active Flux retains its intentional Ctrl+Shift+T quick action')
  }

  await switchView('tasks')
  editable.blur()
  for (const letter of ['t', 'e', 'g']) {
    const count = useApp.getState().tasks.length
    const prevented = key(document.body, letter)
    const row = { key: letter, prevented, added: useApp.getState().tasks.length - count }
    ;(evidence.active as unknown[]).push(row)
    assert(prevented && row.added === 1, `Active Tasks ${letter} shortcut creates exactly one task`)
  }
  assert(key(document.body, 'f', { ctrlKey: true }) && document.activeElement === tasksSearch(), 'Active Tasks Ctrl+F focuses its own search')
  tasksSearch().blur()
  for (const target of [editable, select, contenteditable.firstElementChild!]) {
    const count = useApp.getState().tasks.length
    for (const letter of ['t', 'e', 'g']) key(target, letter)
    const prevented = key(target, 'f', { ctrlKey: true })
    if (stage !== 'before') assert(useApp.getState().tasks.length === count && !prevented, `${target.tagName}: editable target keeps mutation/search keys`)
  }
  for (const options of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }]) {
    const count = useApp.getState().tasks.length
    key(document.body, 't', options)
    if (stage !== 'before') assert(useApp.getState().tasks.length === count, `Modified/composing/repeated Task key is ignored: ${JSON.stringify(options)}`)
  }
  const handledElsewhere = new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true })
  handledElsewhere.preventDefault()
  const beforeHandledEvent = useApp.getState().tasks.length
  flushSync(() => document.body.dispatchEvent(handledElsewhere))
  if (stage !== 'before') assert(useApp.getState().tasks.length === beforeHandledEvent, 'Task shortcut respects an event already handled by another owner')
  await workspaceOperation.run(async () => {
    const count = useApp.getState().tasks.length
    key(document.body, 't')
    const prevented = key(document.body, 'f', { ctrlKey: true })
    if (stage !== 'before') assert(count === useApp.getState().tasks.length && !prevented, 'Workspace replacement pauses view keyboard mutations and search')
  })

  for (const deadline of ['2026-11-03T16:22:33.123456+02:00', '2026-11-03T12:22:33.123Z', '2026-11-03']) {
    flushSync(() => useApp.setState({ tasks: [seedTask('deadline-roundtrip', deadline)] }))
    await settle()
    const card = document.querySelector('.nx-task-card')!
    flushSync(() => card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    await waitFor(() => document.querySelector('.nx-task-modal-sheet'))
    input(document.querySelector<HTMLInputElement>('input[placeholder="Task title…"]')!, 'Unrelated title edit')
    const save = [...document.querySelectorAll<HTMLButtonElement>('.nx-task-modal-sheet button')].find(button => button.textContent === 'Save Changes')!
    flushSync(() => save.click())
    await waitModalClosed()
    const saved = useApp.getState().tasks[0].deadline
    assert(useApp.getState().tasks[0].title === 'Unrelated title edit', 'Actual Task form saved the unrelated title edit')
    ;(evidence.deadlines as unknown[]).push({ original: deadline, saved, unchanged: saved === deadline })
    if (stage !== 'before') assert(saved === deadline, `Actual Task form unrelated title edit preserves ${deadline} exactly`)
  }
  if (stage !== 'before') {
    const deadline = '2026-11-03T16:22:33.123456+02:00'
    flushSync(() => useApp.setState({ tasks: [seedTask('deadline-date-edit', deadline)] }))
    await settle()
    flushSync(() => document.querySelector('.nx-task-card')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    await waitFor(() => document.querySelector('.nx-task-modal-sheet'))
    input(document.querySelector<HTMLInputElement>('.nx-task-modal-sheet input[type="date"]')!, '2026-11-05')
    flushSync(() => [...document.querySelectorAll<HTMLButtonElement>('.nx-task-modal-sheet button')].find(button => button.textContent === 'Save Changes')!.click())
    await waitModalClosed()
    evidence.explicitDateEdit = useApp.getState().tasks[0].deadline
    assert(useApp.getState().tasks[0].deadline === '2026-11-05T16:22:33.123456+02:00', 'Explicit date edit preserves existing time, offset and precision')
    for (const sample of [{ original: '2026-11-03', date: '2026-11-05', expected: '2026-11-05' }, { original: '2026-11-03T12:22:33.123Z', date: '', expected: undefined }]) {
      flushSync(() => useApp.setState({ tasks: [seedTask('explicit-deadline-kind', sample.original)] }))
      await settle()
      flushSync(() => document.querySelector('.nx-task-card')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
      await waitFor(() => document.querySelector('.nx-task-modal-sheet'))
      input(document.querySelector<HTMLInputElement>('.nx-task-modal-sheet input[type="date"]')!, sample.date)
      flushSync(() => [...document.querySelectorAll<HTMLButtonElement>('.nx-task-modal-sheet button')].find(button => button.textContent === 'Save Changes')!.click())
      await waitModalClosed()
      assert(useApp.getState().tasks[0].deadline === sample.expected, `Actual Task date edit preserves kind or removes deadline: ${sample.date || 'clear'}`)
    }
  }
  const previousFocus = tasksSearch()
  previousFocus.focus()
  flushSync(() => document.querySelector('.nx-task-card')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  await waitFor(() => document.querySelector('.nx-task-modal-sheet'))
  const title = document.querySelector<HTMLInputElement>('input[placeholder="Task title…"]')!
  if (stage === 'after') assert(document.activeElement === title, 'Opening Task modal initially focuses its labelled title field')
  title.focus()
  const hasDialogSemantics = Boolean(document.querySelector('[role="dialog"][aria-modal="true"][aria-labelledby]'))
  if (stage === 'after') {
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const count = useApp.getState().tasks.length
    key(dialog, 't')
    assert(useApp.getState().tasks.length === count, 'Task modal surface never triggers the underlying quick-add shortcut')
    const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button')].filter(visible)
    const first = buttons[0], last = buttons[buttons.length - 1]
    last.focus()
    assert(key(last, 'Tab') && document.activeElement === first, 'Task modal wraps Tab from its last control to first')
    assert(key(first, 'Tab', { shiftKey: true }) && document.activeElement === last, 'Task modal wraps Shift+Tab from first control to last')
    assert(key(last, 'Tab', { repeat: true }) && document.activeElement === first, 'Held Tab still wraps at the Task modal boundary')
    previousFocus.focus()
    evidence.documentHasFocus = document.hasFocus()
    await settle()
    evidence.dialogFocusActual = document.activeElement?.outerHTML.slice(0, 400)
    assert(dialog.contains(document.activeElement), 'Task modal retains focus when a background control tries to take it')
    assert(Boolean(dialog.querySelector('button[aria-label="Close task dialog"]')), 'Task modal close control has an accessible name')
  }
  const escaped = key(title, 'Escape')
  await settle()
  const escapeClosed = !document.querySelector('.nx-task-modal-sheet') || !document.querySelector<HTMLInputElement>('input[placeholder="Task title…"]')
  evidence.dialog = { hasDialogSemantics, escaped, escapeClosed }
  if (stage === 'dialog-before') {
    document.querySelector<HTMLButtonElement>('.nx-task-modal-sheet button')?.click()
    await waitModalClosed()
  } else if (stage !== 'before') {
    await waitModalClosed()
    ;(evidence.dialog as Record<string, unknown>).escapeClosed = true
    assert(hasDialogSemantics && escaped, 'Actual Task modal exposes dialog semantics and handles Escape from its title')
    assert(document.activeElement === previousFocus, 'Closing Task modal returns focus to the prior control')
  }
  if (stage === 'after') {
    flushSync(() => useApp.setState({ tasks: [seedTask('Visual deadline check', '2026-11-05T16:22:33.123456+02:00')] }))
    await settle()
    flushSync(() => document.querySelector('.nx-task-card')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    await waitFor(() => document.querySelector('.nx-task-modal-sheet'))
    await settle()
  }
  editable.remove(); select.remove(); contenteditable.remove()
  const violations = (evidence.hidden as { taskMutation: boolean; editorSearchPrevented: boolean }[]).filter(row => row.taskMutation || row.editorSearchPrevented).length
  evidence.hiddenViolationCount = violations
  document.body.dataset.testComplete = 'true'
  return { ok: true, checks, evidence }
}
run().then(result => { (window as any).taskInteractionResult = result }).catch(error => { (window as any).taskInteractionResult = { ok: false, checks, evidence, error: String(error?.stack || error) } })
