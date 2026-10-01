import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { CerebriPreviewPanel } from '../../Nexus Main/src/components/planning/CerebriPreviewPanel'
import { createMainCerebriPreviewStore } from '../../Nexus Main/src/store/cerebriPreviewStore'
import { useApp } from '../../Nexus Main/src/store/appStore'
import { useCanvas } from '../../Nexus Main/src/store/canvasStore'
import { planningCommands, planningStore } from '../../Nexus Main/src/store/planningStore'
import { PlanningPanel } from '../../packages/nexus-core/src/planning/PlanningPanel'
import { emptyPlanningDocument, type TaskRecord } from '../../packages/nexus-core/src/planning/domain'
import { persistenceRegistry } from '../../packages/nexus-core/src/storage/browserPersistence'
import type { PreviewHostPort } from '../../packages/nexus-core/src/planning/cerebri/inputContracts'

const stage = new URLSearchParams(location.search).get('stage') || 'workflow', checks: string[] = [], evidence: Record<string, unknown> = { stage }
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); checks.push(message) }
const wait = async (condition: () => unknown, message: string) => { for (let n = 0; n < 600; n++) { if (condition()) return; await new Promise(r => setTimeout(r, 20)) }; throw new Error(`Timed out: ${message}`) }
const post = async (name: string, payload: unknown, signal?: AbortSignal) => { const res = await fetch(`/__cerebri_n2/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal }); if (!res.ok) throw new Error('fixture request failed'); return await res.json() }
let controller: AbortController | null = null
const port: PreviewHostPort = { preview: async request => { controller = new AbortController(); return await post('preview', request, controller.signal) }, revalidate: selection => post('revalidate', selection), invalidate() { controller?.abort(); controller = null } }
const store = createMainCerebriPreviewStore(port, true), root = createRoot(document.getElementById('root')!)
let manual = false
const render = () => flushSync(() => root.render(manual
  ? <PlanningPanel tasks={useApp.getState().tasks as unknown as TaskRecord[]} reminders={[]} planning={planningStore.getSnapshot()} execute={planningCommands.execute} initialize={planningCommands.ready} initialTaskId="task-one" selectedDay="2026-10-01" />
  : <CerebriPreviewPanel store={store} onManualPlanning={() => { manual = true; render() }} />))
const field = (label: string) => document.querySelector<HTMLInputElement | HTMLSelectElement>(`[aria-label="${label}"]`)!
const change = (label: string, value: string) => { const el = field(label), proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; flushSync(() => { Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })) }) }
const click = (text: string) => { const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find(el => el.textContent?.trim() === text)!; assert(Boolean(button) && !button.disabled, `Actual enabled control: ${text}`); flushSync(() => button.click()) }
const check = (label: string) => flushSync(() => field(label).click())
const input = { durationMinutes: 30, timeZone: 'Europe/Berlin', window: { start: '2026-10-01T09:00:00Z', end: '2026-10-01T12:00:00Z' } }
async function preview(mode = 'complete') {
  await post('mode', { mode })
  click('Vorschau berechnen'); await wait(() => ['preview', 'error', 'stale'].includes(store.getSnapshot().status), 'Rust preview'); await new Promise(r => setTimeout(r, 0))
}
async function checkpoint(name: string) {
  if (new URLSearchParams(location.search).get('capture') !== '1') return
  // DOM assertions precede rendering; give the compositor two frames so evidence
  // captures the checked screen rather than a previously painted host outcome.
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  await new Promise(resolve => setTimeout(resolve, 100))
  ;(window as any).cerebriN2Checkpoint = name; (window as any).cerebriN2Continue = false
  await wait(() => (window as any).cerebriN2Continue, 'screenshot capture'); (window as any).cerebriN2Checkpoint = null
}
async function run() {
  await Promise.all([useApp.persist.rehydrate(), useCanvas.persist.rehydrate()]); await planningCommands.ready()
  if (stage === 'reload') {
    const expected = JSON.parse(localStorage.getItem('cerebri-n2-expected')!)
    assert(JSON.stringify(planningStore.capturePlanning()) === expected.planning, 'Fresh Main modules load exact acknowledged planning document, block and canonical receipt')
    assert(JSON.stringify(useApp.getState().tasks) === expected.tasks, 'Fresh Main reload retains exact Task contents, links and unknown metadata')
    const replay = await planningCommands.execute(expected.command)
    assert(replay.ok && replay.replayed && planningStore.capturePlanning().blocks.length === 1, 'Fresh shared command owner replays persisted exact command without duplicate block')
    evidence.replayed = replay; return { ok: true, checks, evidence }
  }
  useApp.setState({ tasks: [{ id: 'task-one', title: 'Synthetic focus task', desc: 'Private synthetic text must remain local', status: 'todo', priority: 'mid', created: '2026-09-30T00:00:00Z', updated: '2026-09-30T00:00:00Z', linkedNoteId: 'private-note', tags: ['keep'], subtasks: [], futureField: { retained: true } } as any], notes: [], reminders: [] })
  planningStore.restorePlanning(emptyPlanningDocument('synthetic-n2-workspace'))
  assert(await persistenceRegistry.flush(), 'Synthetic fixture sources are durably initialized in isolated profile')
  const original = JSON.stringify(useApp.getState().tasks)
  render(); await wait(() => ![...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Vorschau berechnen')?.disabled, 'Panel initialized')
  assert(field('Vorschaudauer').value === '' && field('Vorschauzeitzone').value === '', 'Panel requires explicit duration and zone; no source guess')
  change('Vorschauaufgabe', 'task-one'); change('Vorschaudauer', '30'); change('Vorschauzeitzone', input.timeZone); change('Vorschauzeitraum Beginn', input.window.start); change('Vorschauzeitraum Ende', input.window.end)
  await preview()
  assert(store.getSnapshot().result?.status === 'planned' && (store.getSnapshot().result as any).outcome === 'Solution', 'Selected canonical Task traverses actual Node host and pinned Rust planner')
  assert(document.body.textContent?.includes('AnalysisOnly') && document.body.textContent?.includes('HardConstraint.Overlap'), 'Panel renders exact pinned Rust reason codes')
  assert(planningStore.capturePlanning().blocks.length === 0 && JSON.stringify(useApp.getState().tasks) === original, 'Preview and reason rendering persist no block and preserve full Task')
  await checkpoint('preview')
  check('Kandidat 1')
  assert([...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Bestätigten Arbeitsblock speichern')?.disabled, 'Candidate selection alone cannot save; explicit confirmation is required')
  await post('mode', { mode: 'mutate-host' }); check('Vorschau ausdrücklich bestätigen'); click('Bestätigten Arbeitsblock speichern')
  await wait(() => store.getSnapshot().status === 'stale', 'stale host context')
  assert(planningStore.capturePlanning().blocks.length === 0, 'Changed trusted host revision prevents manual write')
  await preview(); check('Kandidat 1')
  useApp.setState({ tasks: useApp.getState().tasks.map(task => ({ ...task, desc: task.desc + ' local edit' })) })
  check('Vorschau ausdrücklich bestätigen'); click('Bestätigten Arbeitsblock speichern'); await wait(() => store.getSnapshot().status === 'stale', 'stale canonical Task')
  assert(planningStore.capturePlanning().blocks.length === 0, 'Changed canonical Task content prevents manual write')
  useApp.setState({ tasks: JSON.parse(original) })
  for (const [mode, expected, text] of [
    ['unknown', 'InsufficientInformation', 'IncompleteCoverage'], ['denied', 'InsufficientInformation', 'PlanningPermissionDenied'],
    ['nofit', 'NoSolution', 'kein passender Block'], ['budget', 'Solution', 'Suchbudget wurde ausgeschöpft'],
    ['offline', 'bridge_unavailable', 'nicht erreichbar'], ['timeout', 'timeout', 'Zeitlimit erreicht'],
  ]) {
    await preview(mode)
    const result = store.getSnapshot().result as any
    assert((result.outcome || result.code) === expected && document.body.textContent?.includes(text), `Actual host ${mode} outcome is distinct and honest in panel`)
    assert(planningStore.capturePlanning().blocks.length === 0, `Host ${mode} outcome never performs an automatic write`)
    assert(![...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Manuell planen')?.disabled, `Manual planning remains available after ${mode}`)
  }
  click('Manuell planen'); await wait(() => document.querySelector('form[aria-label="Manuelle Planungsaktion"]'), 'actual manual PlanningPanel')
  assert(Boolean(document.querySelector('form[aria-label="Manuelle Planungsaktion"]')), 'Fallback opens actual shared manual PlanningPanel after host timeout')
  manual = false; render(); await wait(() => field('Vorschauaufgabe'), 'preview panel remount')
  change('Vorschauaufgabe', 'task-one'); change('Vorschaudauer', '30'); change('Vorschauzeitzone', input.timeZone); change('Vorschauzeitraum Beginn', input.window.start); change('Vorschauzeitraum Ende', input.window.end)
  await preview(); check('Kandidat 1'); check('Vorschau ausdrücklich bestätigen'); click('Bestätigten Arbeitsblock speichern')
  await wait(() => store.getSnapshot().status === 'command-error', 'manual coverage conflict')
  assert((store.getSnapshot().commandResult as any).code === 'conflict' && planningStore.capturePlanning().blocks.length === 0, 'Nexus independently requires explicit acceptance of its unknown coverage')
  check('Nexus Planungskonflikte ausdrücklich übernehmen'); click('Bestätigten Arbeitsblock speichern')
  await wait(() => store.getSnapshot().status === 'acknowledged', 'durable command acknowledgement')
  assert(planningStore.capturePlanning().blocks.length === 1 && document.body.textContent?.includes('Dauerhaft gespeichert'), 'Actual Main command journal and IndexedDB flush acknowledge exactly one manual block')
  const doc = planningStore.capturePlanning(), receipt = Object.values(doc.receipts)[0], command = JSON.parse(receipt.command)
  assert(doc.blocks[0].provenance === 'manual' && doc.blocks[0].acceptedIssues.some(issue => issue.code === 'unknown-coverage'), 'Saved block is manual Nexus provenance and retains explicitly accepted coverage issue')
  assert(JSON.stringify(useApp.getState().tasks) === original, 'Confirmed scheduling preserves private Task text, links and future fields exactly')
  localStorage.setItem('cerebri-n2-expected', JSON.stringify({ planning: JSON.stringify(doc), tasks: original, command }))
  evidence.planning = doc; evidence.command = command; evidence.host = await (await fetch('/__cerebri_n2/stats')).json()
  assert((evidence.host as any).requests.every((request: any) => Object.keys(request).sort().join(',') === 'durationMinutes,requestId,taskId,timeZone,traceId,window' && !JSON.stringify(request).includes('Private')), 'Every real renderer/host envelope excludes raw text, links, permissions, context facts and paths')
  await checkpoint('acknowledged')
  return { ok: true, checks, evidence }
}
run().then(result => { (window as any).cerebriN2Result = result }).catch(error => { (window as any).cerebriN2Result = { ok: false, checks, evidence, error: String(error?.stack || error) } })
