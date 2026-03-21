import { memo, useCallback, useMemo, useState, type CSSProperties } from 'react'
import { Activity, Code2, Laptop, RefreshCw, ServerCog, ShieldCheck, Smartphone, Sparkles, TerminalSquare } from 'lucide-react'

type PreviewAppId = 'main' | 'mobile' | 'code' | 'code-mobile' | 'control'
type DeviceMode = 'desktop' | 'mobile'
type TaskLane = 'todo' | 'doing' | 'done'

type SessionLike = {
  username: string
  role: string
  expiresAt?: string
} | null

type BootstrapLike = {
  service?: string
  version?: string
  now?: string
  ownerOnlyControlPanel?: boolean
  ownerLockEnabled?: boolean
  requireSignedMutations?: boolean
  originTrusted?: boolean
} | null

type AccessSummary = {
  allowed: boolean
  reason: string
  requiredTier: string | null
  userTier: string
  paywallEnabled: boolean
} | null

type PreviewUniverseProps = {
  session: SessionLike
  bootstrap: BootstrapLike
  paywallEnabled: boolean
  appsCount: number
  runHandshake: () => Promise<void>
  refreshSession: () => Promise<boolean>
  handleWebsiteAccessCheck: () => Promise<void>
  busy: {
    handshake: boolean
    session: boolean
    accessCheck: boolean
  }
  viewAccessSummary: AccessSummary
}

type PreviewTask = {
  id: string
  title: string
  lane: TaskLane
}

type PreviewReminder = {
  id: string
  title: string
  due: string
  done: boolean
  snoozed: boolean
}

const APP_META: Record<PreviewAppId, { label: string; subtitle: string; accent: string; views: string[] }> = {
  main: {
    label: 'Nexus Main',
    subtitle: 'Desktop Productivity Shell',
    accent: '#5fd9ff',
    views: ['dashboard', 'notes', 'code', 'tasks', 'reminders', 'canvas', 'files', 'flux', 'settings', 'info', 'devtools'],
  },
  mobile: {
    label: 'Nexus Mobile',
    subtitle: 'Mobile Parity Surface',
    accent: '#7dffcc',
    views: ['dashboard', 'notes', 'code', 'tasks', 'reminders', 'canvas', 'files', 'flux', 'settings', 'info', 'devtools'],
  },
  code: {
    label: 'Nexus Code',
    subtitle: 'Desktop IDE Runtime',
    accent: '#9fa0ff',
    views: ['editor', 'explorer', 'search', 'git', 'debug', 'problems', 'extensions', 'terminal', 'settings'],
  },
  'code-mobile': {
    label: 'Nexus Code Mobile',
    subtitle: 'Native IDE Preview',
    accent: '#f6b2ff',
    views: ['editor', 'explorer', 'search', 'git', 'debug', 'problems', 'extensions', 'terminal', 'settings'],
  },
  control: {
    label: 'Nexus Control',
    subtitle: 'Control Plane UI',
    accent: '#ffda86',
    views: ['dashboard', 'live-sync', 'paywalls', 'devices', 'audit', 'api-guides'],
  },
}

const MAIN_VIEW_COPY: Record<string, { title: string; detail: string }> = {
  dashboard: { title: 'Dashboard Grid', detail: 'Snap-Layout Widgets, KPI Cockpit und Status-Karten.' },
  notes: { title: 'Notes + Markdown', detail: 'Edit/Split/Preview mit Magic-Widgets und schnellen Templates.' },
  code: { title: 'Embedded Code View', detail: 'Monaco-basierter Flow mit Preview-/Run-Pfaden.' },
  tasks: { title: 'Task Board', detail: 'Kanban Lane-Wechsel mit Prioritäten und Deadlines.' },
  reminders: { title: 'Reminder Engine', detail: 'Soon/Overdue Filter und Snooze Quick-Actions.' },
  canvas: { title: 'Canvas Magic', detail: 'Mindmap/Roadmap/Sprint inkl. AI Project Generator.' },
  files: { title: 'Files + Workspaces', detail: 'Kontextbasierte Zuordnung von Items in Arbeitsbereiche.' },
  flux: { title: 'Flux Stream', detail: 'Live Aktivitätsstrom und Runtime-Pulse.' },
  settings: { title: 'Live Settings', detail: 'Theme/Glass/Animation/Editor Tuning ohne harte Reloads.' },
  info: { title: 'Info Surface', detail: 'Build-, Runtime- und Versions-Transparenz pro Session.' },
  devtools: { title: 'DevTools', detail: 'UI Builder, Utility-Rechner und Diagnose-Werkzeuge.' },
}

const CODE_FILES = ['app.tsx', 'runtime.ts', 'paywall.ts', 'views.ts', 'terminal.ts']

const INITIAL_CODE_BY_FILE: Record<string, string> = {
  'app.tsx': [
    'export function AppShell() {',
    "  return 'Nexus Preview Runtime';",
    '}',
  ].join('\n'),
  'runtime.ts': [
    'export const runtime = {',
    "  channel: 'production',",
    "  status: 'healthy',",
    '}',
  ].join('\n'),
  'paywall.ts': [
    'export function canAccess(viewId: string, tier: string) {',
    "  return tier === 'paid' || viewId === 'dashboard';",
    '}',
  ].join('\n'),
  'views.ts': [
    "export const views = ['dashboard', 'notes', 'code'];",
  ].join('\n'),
  'terminal.ts': [
    'export const commands = [',
    "  'help', 'views', 'goto <view>', 'focus <app>', 'clear',",
    '];',
  ].join('\n'),
}

const INITIAL_VIEWS: Record<PreviewAppId, string> = {
  main: 'dashboard',
  mobile: 'dashboard',
  code: 'editor',
  'code-mobile': 'editor',
  control: 'dashboard',
}

const ORBIT_ORDER: PreviewAppId[] = ['main', 'mobile', 'code', 'code-mobile', 'control']
const LANE_ORDER: TaskLane[] = ['todo', 'doing', 'done']
const INTERACTIVE_MAIN_VIEWS = new Set(['dashboard', 'notes', 'tasks', 'reminders'])

function PreviewUniverseImpl(props: PreviewUniverseProps) {
  const [activeApp, setActiveApp] = useState<PreviewAppId>('main')
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [activeViews, setActiveViews] = useState<Record<PreviewAppId, string>>(INITIAL_VIEWS)

  const [widgets, setWidgets] = useState(['Runtime Health', 'Paywall Gate', 'Live Sync', 'Focus Queue'])
  const [notesText, setNotesText] = useState('# Nexus Preview\n\n- Live View Matrix\n- Runtime Guardrails\n- Paywall Validation')
  const [tasks, setTasks] = useState<PreviewTask[]>([
    { id: 't1', title: 'Design Galaxy Hero', lane: 'doing' },
    { id: 't2', title: 'Validate Paywall Route', lane: 'todo' },
    { id: 't3', title: 'Promote Stable Release', lane: 'done' },
  ])
  const [reminders, setReminders] = useState<PreviewReminder[]>([
    { id: 'r1', title: 'Sync production catalog', due: 'today', done: false, snoozed: false },
    { id: 'r2', title: 'Check mobile parity', due: 'soon', done: false, snoozed: false },
    { id: 'r3', title: 'Rotate mutation secret', due: 'overdue', done: false, snoozed: false },
  ])

  const [selectedFile, setSelectedFile] = useState('app.tsx')
  const [codeByFile, setCodeByFile] = useState<Record<string, string>>(INITIAL_CODE_BY_FILE)
  const [terminalInput, setTerminalInput] = useState('')
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Nexus runtime ready. Type `help`.',
    'paywall-validation: enabled',
  ])

  const currentViews = APP_META[activeApp].views
  const activeView = activeViews[activeApp] || currentViews[0]

  const orbitNodes = useMemo(() => {
    return ORBIT_ORDER.map((appId, index) => {
      const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / ORBIT_ORDER.length)
      return {
        appId,
        x: 50 + (Math.cos(angle) * 38),
        y: 50 + (Math.sin(angle) * 38),
      }
    })
  }, [])

  const tasksByLane = useMemo(() => {
    const grouped: Record<TaskLane, PreviewTask[]> = {
      todo: [],
      doing: [],
      done: [],
    }
    for (const task of tasks) {
      grouped[task.lane].push(task)
    }
    return grouped
  }, [tasks])

  const rotateWidgets = useCallback(() => {
    setWidgets((prev) => {
      if (prev.length < 2) return prev
      return [...prev.slice(1), prev[0]]
    })
  }, [])

  const cycleTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.map((task) => {
      if (task.id !== taskId) return task
      const currentIdx = LANE_ORDER.indexOf(task.lane)
      const nextLane = LANE_ORDER[(currentIdx + 1) % LANE_ORDER.length]
      return { ...task, lane: nextLane }
    }))
  }, [])

  const toggleReminderDone = useCallback((reminderId: string) => {
    setReminders((prev) => prev.map((item) => {
      if (item.id !== reminderId) return item
      return { ...item, done: !item.done }
    }))
  }, [])

  const snoozeReminder = useCallback((reminderId: string) => {
    setReminders((prev) => prev.map((item) => {
      if (item.id !== reminderId) return item
      return { ...item, snoozed: !item.snoozed }
    }))
  }, [])

  const updateCode = useCallback((value: string) => {
    setCodeByFile((prev) => ({
      ...prev,
      [selectedFile]: value,
    }))
  }, [selectedFile])

  const appendTerminalLine = useCallback((line: string) => {
    setTerminalLines((prev) => [line, ...prev].slice(0, 14))
  }, [])

  const runCodeSimulation = useCallback(() => {
    const source = codeByFile[selectedFile] || ''
    const nonEmpty = source.split('\n').filter((line) => line.trim().length > 0).length
    const hash = Math.abs(source.length * 31 + nonEmpty * 7).toString(16)
    appendTerminalLine(`$ run ${selectedFile}`)
    appendTerminalLine(`✓ simulation ok · lines=${nonEmpty} · signature=${hash.slice(0, 6)}`)
  }, [appendTerminalLine, codeByFile, selectedFile])

  const runTerminalCommand = useCallback(() => {
    const command = terminalInput.trim().toLowerCase()
    if (!command) return

    appendTerminalLine(`$ ${command}`)

    if (command === 'help') {
      appendTerminalLine('commands: help | views | goto <view> | focus <app> | clear')
      setTerminalInput('')
      return
    }

    if (command === 'views') {
      appendTerminalLine(`views(${activeApp}): ${currentViews.join(', ')}`)
      setTerminalInput('')
      return
    }

    if (command.startsWith('goto ')) {
      const target = command.replace('goto ', '').trim()
      if (currentViews.includes(target)) {
        setActiveViews((prev) => ({ ...prev, [activeApp]: target }))
        appendTerminalLine(`navigated: ${activeApp}.${target}`)
      } else {
        appendTerminalLine(`unknown view: ${target}`)
      }
      setTerminalInput('')
      return
    }

    if (command.startsWith('focus ')) {
      const target = command.replace('focus ', '').trim() as PreviewAppId
      if (Object.prototype.hasOwnProperty.call(APP_META, target)) {
        setActiveApp(target)
        appendTerminalLine(`app focus: ${APP_META[target].label}`)
      } else {
        appendTerminalLine(`unknown app: ${target}`)
      }
      setTerminalInput('')
      return
    }

    if (command === 'clear') {
      setTerminalLines(['terminal cleared'])
      setTerminalInput('')
      return
    }

    appendTerminalLine('command not recognized')
    setTerminalInput('')
  }, [activeApp, appendTerminalLine, currentViews, terminalInput])

  const onSelectView = useCallback((viewId: string) => {
    setActiveViews((prev) => ({ ...prev, [activeApp]: viewId }))
  }, [activeApp])

  const orbitStyle = useCallback((x: number, y: number, accent: string): CSSProperties => ({
    left: `${x}%`,
    top: `${y}%`,
    ['--node-accent' as any]: accent,
  }), [])

  const appBadge = APP_META[activeApp]

  return (
    <div className="universe-grid">
      <article className="panel-card universe-orbit-card">
        <div className="panel-title"><Sparkles size={16} /> Orbit Navigator</div>
        <div className="orbit-map" aria-label="Nexus orbit map">
          <div className="orbit-ring orbit-ring-primary" />
          <div className="orbit-ring orbit-ring-secondary" />
          <div className="orbit-core">
            <div className="orbit-core-label">Nexus Core</div>
            <small>{props.appsCount} ecosystem apps</small>
          </div>
          {orbitNodes.map((node) => {
            const meta = APP_META[node.appId]
            const active = activeApp === node.appId
            return (
              <button
                key={node.appId}
                type="button"
                className={`orbit-node ${active ? 'active' : ''}`}
                style={orbitStyle(node.x, node.y, meta.accent)}
                onClick={() => setActiveApp(node.appId)}
              >
                <span>{meta.label}</span>
                <small>{meta.subtitle}</small>
              </button>
            )
          })}
        </div>
        <p className="muted-copy">
          Interaktiver Browser-Zwilling für Nexus Main, Mobile, Code, Code Mobile und Control.
          Views können pro App direkt im Orbit-Preview gewechselt werden.
        </p>
      </article>

      <article className="panel-card universe-preview-card">
        <div className="panel-title"><Activity size={16} /> Full App Preview Surface</div>
        <div className="preview-toolbar">
          <div className="preview-app-chip">
            <strong>{appBadge.label}</strong>
            <span>{appBadge.subtitle}</span>
          </div>
          <div className="preview-mode-row">
            <button
              type="button"
              className={`preview-mode-button ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
            >
              <Laptop size={14} /> Desktop
            </button>
            <button
              type="button"
              className={`preview-mode-button ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>
        </div>

        <div className={`preview-frame ${deviceMode === 'mobile' ? 'mobile' : 'desktop'}`}>
          <div className="preview-view-tabs">
            {currentViews.map((viewId) => (
              <button
                key={`${activeApp}-${viewId}`}
                type="button"
                className={`preview-view-chip ${activeView === viewId ? 'active' : ''}`}
                onClick={() => onSelectView(viewId)}
              >
                {viewId}
              </button>
            ))}
          </div>

          {(activeApp === 'main' || activeApp === 'mobile') ? (
            <div className="preview-surface-grid">
              {activeView === 'dashboard' ? (
                <>
                  <div className="preview-card-block">
                    <div className="preview-card-title">Dashboard Widgets</div>
                    <div className="widget-stack">
                      {widgets.map((widget) => (
                        <div key={widget} className="widget-item">{widget}</div>
                      ))}
                    </div>
                    <button type="button" onClick={rotateWidgets}>
                      <RefreshCw size={14} /> Rotate Widgets
                    </button>
                  </div>
                  <div className="preview-card-block">
                    <div className="preview-card-title">Runtime Snapshot</div>
                    <div className="guard-list">
                      <div><span>View</span><strong>{activeView}</strong></div>
                      <div><span>Paywall</span><strong>{props.paywallEnabled ? 'on' : 'off'}</strong></div>
                      <div><span>Session</span><strong>{props.session ? props.session.username : 'guest'}</strong></div>
                    </div>
                  </div>
                </>
              ) : null}

              {activeView === 'notes' ? (
                <>
                  <div className="preview-card-block">
                    <div className="preview-card-title">Notes Editor</div>
                    <textarea rows={8} value={notesText} onChange={(e) => setNotesText(e.target.value)} />
                  </div>
                  <div className="preview-card-block">
                    <div className="preview-card-title">Preview</div>
                    <pre className="notes-preview">{notesText}</pre>
                  </div>
                </>
              ) : null}

              {activeView === 'tasks' ? (
                <div className="task-board">
                  {LANE_ORDER.map((lane) => (
                    <div key={lane} className="task-lane">
                      <strong>{lane.toUpperCase()}</strong>
                      {tasksByLane[lane].map((task) => (
                        <button key={task.id} type="button" className="task-item" onClick={() => cycleTask(task.id)}>
                          {task.title}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}

              {activeView === 'reminders' ? (
                <div className="preview-card-block preview-card-block-wide">
                  <div className="preview-card-title">Reminder Flow</div>
                  <div className="reminder-list">
                    {reminders.map((item) => (
                      <div key={item.id} className={`reminder-item ${item.done ? 'done' : ''}`}>
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.due}{item.snoozed ? ' · snoozed' : ''}</small>
                        </div>
                        <div className="action-row">
                          <button type="button" onClick={() => snoozeReminder(item.id)}>Snooze</button>
                          <button type="button" onClick={() => toggleReminderDone(item.id)}>Done</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {INTERACTIVE_MAIN_VIEWS.has(activeView) ? null : (
                <div className="preview-card-block preview-card-block-wide">
                  <div className="preview-card-title">{MAIN_VIEW_COPY[activeView]?.title || activeView}</div>
                  <p>{MAIN_VIEW_COPY[activeView]?.detail || 'Interaktive Vorschau dieses Views aktiv.'}</p>
                </div>
              )}
            </div>
          ) : null}

          {(activeApp === 'code' || activeApp === 'code-mobile') ? (
            <div className="code-preview-shell">
              <aside className="code-files-list">
                {CODE_FILES.map((file) => (
                  <button
                    key={file}
                    type="button"
                    className={selectedFile === file ? 'active' : ''}
                    onClick={() => setSelectedFile(file)}
                  >
                    {file}
                  </button>
                ))}
              </aside>
              <div className="code-editor-pane">
                <div className="preview-card-title"><Code2 size={14} /> {selectedFile}</div>
                <textarea rows={11} value={codeByFile[selectedFile] || ''} onChange={(e) => updateCode(e.target.value)} />
                <div className="action-row">
                  <button type="button" onClick={runCodeSimulation}>Run Simulation</button>
                </div>
              </div>
              <div className="terminal-pane">
                <div className="preview-card-title"><TerminalSquare size={14} /> Runtime Terminal</div>
                <div className="terminal-log">
                  {terminalLines.map((line, index) => (
                    <div key={`${line}-${index}`}>{line}</div>
                  ))}
                </div>
                <div className="terminal-input-row">
                  <input
                    type="text"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                    placeholder="help | views | goto <view> | focus <app> | clear"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        runTerminalCommand()
                      }
                    }}
                  />
                  <button type="button" onClick={runTerminalCommand}>Run</button>
                </div>
              </div>
            </div>
          ) : null}

          {activeApp === 'control' ? (
            <div className="preview-surface-grid">
              <div className="preview-card-block">
                <div className="preview-card-title"><ServerCog size={14} /> Control Runtime</div>
                <div className="guard-list">
                  <div><span>Service</span><strong>{props.bootstrap?.service || '-'}</strong></div>
                  <div><span>Version</span><strong>{props.bootstrap?.version || '-'}</strong></div>
                  <div><span>Owner-only</span><strong>{props.bootstrap?.ownerOnlyControlPanel ? 'on' : 'off'}</strong></div>
                  <div><span>Origin Trusted</span><strong>{props.bootstrap?.originTrusted ? 'yes' : 'no'}</strong></div>
                </div>
                <div className="action-row">
                  <button type="button" onClick={() => void props.runHandshake()} disabled={props.busy.handshake}>
                    <RefreshCw size={14} className={props.busy.handshake ? 'spin' : ''} /> Handshake
                  </button>
                  <button type="button" onClick={() => void props.refreshSession()} disabled={props.busy.session || !props.session}>
                    <RefreshCw size={14} className={props.busy.session ? 'spin' : ''} /> Session
                  </button>
                </div>
              </div>

              <div className="preview-card-block">
                <div className="preview-card-title"><ShieldCheck size={14} /> Paywall Validation</div>
                <div className="guard-list">
                  <div><span>Paywall Enabled</span><strong>{props.paywallEnabled ? 'on' : 'off'}</strong></div>
                  <div><span>Last Access</span><strong>{props.viewAccessSummary ? (props.viewAccessSummary.allowed ? 'granted' : 'blocked') : 'pending'}</strong></div>
                  <div><span>Required Tier</span><strong>{props.viewAccessSummary?.requiredTier || '-'}</strong></div>
                  <div><span>User Tier</span><strong>{props.viewAccessSummary?.userTier || '-'}</strong></div>
                </div>
                <div className="action-row">
                  <button type="button" onClick={() => void props.handleWebsiteAccessCheck()} disabled={props.busy.accessCheck}>
                    <RefreshCw size={14} className={props.busy.accessCheck ? 'spin' : ''} /> Validate View
                  </button>
                </div>
              </div>

              <div className="preview-card-block preview-card-block-wide">
                <div className="preview-card-title">Control Tabs Preview</div>
                <div className="surface-grid">
                  {APP_META.control.views.map((view) => (
                    <div key={view} className="surface-item">
                      <div className="surface-item-head">
                        <strong>{view}</strong>
                        <span className="surface-badge">control</span>
                      </div>
                      <p>Live-Sync, Policies, Device-Allowlist und Audit-Flows als browserbasiertes Preview.</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <article className="panel-card panel-card-wide universe-meta-card">
        <div className="panel-title"><Sparkles size={16} /> Ecosystem Coverage</div>
        <div className="surface-grid">
          {ORBIT_ORDER.map((appId) => (
            <div key={`coverage-${appId}`} className="surface-item">
              <div className="surface-item-head">
                <strong>{APP_META[appId].label}</strong>
                <span className="surface-badge">{APP_META[appId].views.length} views</span>
              </div>
              <p>{APP_META[appId].subtitle}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

export const PreviewUniverse = memo(PreviewUniverseImpl)
