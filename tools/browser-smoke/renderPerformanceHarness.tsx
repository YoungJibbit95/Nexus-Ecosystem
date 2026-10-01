import React, { Profiler, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardView } from '../../Nexus Main/src/views/DashboardView'
import { ViewCommandScope } from '../../Nexus Main/src/app/ViewCommandScope'
import { useApp } from '../../Nexus Main/src/store/appStore'
import { useCanvas } from '../../Nexus Main/src/store/canvasStore'
import { useWorkspaces } from '../../Nexus Main/src/store/workspaceStore'
import { useTheme } from '../../Nexus Main/src/store/themeStore'
import { configureRenderRuntime, readRenderDiagnostics } from '../../Nexus Main/src/render/renderRuntime'
import { awaitHydration } from '../../packages/nexus-core/src/storage/awaitHydration'
import { planningStore } from '../../Nexus Main/src/store/planningStore'
import '../../Nexus Main/src/index.css'

const sleep = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))
const renders: number[] = []
let setActive: (active: boolean) => void
function Fixture() {
  const [active, changeActive] = useState(true)
  setActive = changeActive
  return <main style={{ height: '100vh' }}>
    <ViewCommandScope value={active}>
      <div style={{ display: active ? 'block' : 'none', height: 480 }}>
        <Profiler id="cached-dashboard" onRender={(_id, _phase, duration) => renders.push(duration)}>
          <DashboardView setView={() => {}} />
        </Profiler>
      </div>
    </ViewCommandScope>
    {!active && <p>Another view is active. The real Dashboard remains mounted.</p>}
  </main>
}
async function start() {
  await awaitHydration([useApp, useCanvas, useWorkspaces, useTheme])
  await planningStore.commandOwner.ready()
  const stamp = '2026-09-30T10:00:00Z'
  useApp.setState({
    notes: Array.from({ length: 500 }, (_, i) => ({ id: `note-${i}`, title: `Synthetic note ${i}`, content: 'Synthetic content. '.repeat(64), tags: [], created: stamp, updated: stamp })),
    tasks: Array.from({ length: 500 }, (_, i) => ({ id: `task-${i}`, title: `Synthetic task ${i}`, desc: '', tags: [], subtasks: [], status: 'todo', priority: 'mid', created: stamp, updated: stamp, deadline: '2026-10-01' })),
    codes: [], reminders: [], activities: [], activeNoteId: 'note-0', openNoteIds: ['note-0', 'note-1'],
  } as any)
  configureRenderRuntime({ lowPowerMode: false, reducedMotion: false })
  createRoot(document.getElementById('root')!).render(<Fixture />)
  await sleep(200)
  ;(window as any).performanceFixtureReady = true
  ;(window as any).measureDashboard = async (active: boolean) => {
    setActive(active); await sleep(150)
    const start = performance.now(), first = renders.length
    for (let i = 0; i < 40; i++) {
      // Actual unrelated navigation state; relevant content slices stay unchanged.
      useApp.setState({ activeNoteId: `note-${i % 2}` }); await sleep(12)
    }
    await sleep(100)
    const durations = renders.slice(first)
    return { active, updates: 40, elapsedMs: performance.now() - start,
      commits: durations.length, totalRenderMs: durations.reduce((sum, value) => sum + value, 0),
      surfaces: readRenderDiagnostics().surfaces.filter(surface => surface.id.startsWith('dashboard-')).map(({ id, visibilityState, dynamic, reason }) => ({ id, visibilityState, dynamic, reason })),
    }
  }
  ;(window as any).verifyDashboardRetention = async () => {
    setActive(true); await sleep(150)
    const dashboard = document.querySelector('.nx-dashboard-v6') as HTMLElement
    dashboard.scrollTop = 120
    const scrollTop = dashboard.scrollTop
    setActive(false); await sleep(150)
    const first = renders.length
    useApp.setState({ notes: useApp.getState().notes.map((note, index) => index === 0 ? { ...note, title: 'Relevant content retained', updated: '2026-10-01T10:00:00Z' } : note) })
    await sleep(150)
    const relevantUpdateCommits = renders.length - first
    const retainedWhileHidden = dashboard.textContent!.includes('Relevant content retained')
    setActive(true); await sleep(150)
    return { relevantUpdateCommits, retainedWhileHidden, retainedAfterReveal: dashboard.textContent!.includes('Relevant content retained'), scrollTop, revealedScrollTop: dashboard.scrollTop }
  }
}
start().catch(error => { (window as any).performanceFixtureError = String(error) })
