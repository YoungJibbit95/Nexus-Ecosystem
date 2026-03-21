import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Compass,
  Copy,
  Grid3X3,
  Layers,
  LayoutDashboard,
  Rocket,
  Search,
  Sparkles,
  Table2,
  Workflow,
} from 'lucide-react'
import {
  apps,
  categories,
  entries,
  viewMatrix,
  type AppId,
  type CategoryId,
  type WikiEntry,
} from './data/wikiData'

type CategoryFilter = 'all' | CategoryId
type AppFilter = 'all' | AppId
type TabId = 'mission' | 'atlas' | 'guides' | 'matrix' | 'coverage'
type VisualFxMode = 'full' | 'lite'
type AuthMode = 'signup' | 'login'

type PreviewModule = {
  id: string
  label: string
  state: 'stable' | 'beta' | 'ops'
  detail: string
}

type PreviewDefinition = {
  intro: string
  modules: PreviewModule[]
}

type ViewFunctionGuide = {
  view: string
  emoji: string
  functions: string[]
  shortcuts: string[]
}

type GuideCluster = {
  id: string
  title: string
  subtitle: string
  views: ViewFunctionGuide[]
}

const TAB_ITEMS: Array<{ id: TabId; label: string; icon: any }> = [
  { id: 'mission', label: 'Mission Orbit', icon: Rocket },
  { id: 'atlas', label: 'Wiki Atlas', icon: Compass },
  { id: 'guides', label: 'View Guides', icon: Workflow },
  { id: 'matrix', label: 'View Matrix', icon: Table2 },
  { id: 'coverage', label: 'Coverage', icon: LayoutDashboard },
]

const previewMap: Record<AppId, PreviewDefinition> = {
  ecosystem: {
    intro:
      '🛰️ Monorepo Control fuer Main, Mobile, Code, Code Mobile und gehostete Control Plane inklusive Runtime Contracts.',
    modules: [
      { id: 'eco-1', label: 'Root Scripts', state: 'stable', detail: 'setup, build, verify, doctor und dev orchestration.' },
      { id: 'eco-2', label: 'Shared Core', state: 'stable', detail: 'liveSync, runtime mapping, contract glue, view guard layer.' },
      { id: 'eco-3', label: 'Release Gates', state: 'ops', detail: 'verify + multi-app builds + promotion readiness.' },
    ],
  },
  main: {
    intro:
      '🧠 Desktop Productivity Surface mit Dashboard, Notes, Code, Tasks, Reminders, Canvas, Files, Flux, DevTools und Settings.',
    modules: [
      { id: 'main-1', label: 'Notes + Magic', state: 'stable', detail: 'Markdown workflow, widgets, split/preview, focus mode.' },
      { id: 'main-2', label: 'Canvas 2.x', state: 'stable', detail: 'node graph, templates, auto layout, AI project generator.' },
      { id: 'main-3', label: 'Terminal Bridge', state: 'beta', detail: 'command flow fuer views, canvas, macros, spotlight.' },
    ],
  },
  mobile: {
    intro:
      '📱 Mobile Parity Surface mit Bottom Navigation, More Drawer, Safe-Area Verhalten und haptischen Flows.',
    modules: [
      { id: 'mob-1', label: 'Bottom Navigation', state: 'stable', detail: 'primary tabs + more drawer fuer alle erweiterten views.' },
      { id: 'mob-2', label: 'Parity Views', state: 'stable', detail: 'notes/code/tasks/reminders/canvas/files/settings/info.' },
      { id: 'mob-3', label: 'Terminal Lite', state: 'beta', detail: 'schneller command launcher fuer mobile workflows.' },
    ],
  },
  code: {
    intro:
      '💻 Desktop IDE Surface mit Explorer, Search, Problems, Git, Debug, Extensions, Terminal und Command Palette.',
    modules: [
      { id: 'code-1', label: 'Panel Stack', state: 'stable', detail: 'explorer/search/problems/git/debug/extensions.' },
      { id: 'code-2', label: 'Editor Loop', state: 'stable', detail: 'tabs, autosave, diagnostics, keyboard actions.' },
      { id: 'code-3', label: 'Workspace IO', state: 'ops', detail: 'open folder, read/write, rename/delete, persist settings.' },
    ],
  },
  'code-mobile': {
    intro:
      '📟 Native IDE Surface mit Capacitor Filesystem Bridge und Mobile BottomNav fuer Editor-Panels.',
    modules: [
      { id: 'cm-1', label: 'nativeFS Bridge', state: 'stable', detail: 'mobile read/write/mkdir/rename/delete operations.' },
      { id: 'cm-2', label: 'Mobile BottomNav', state: 'stable', detail: 'panel switching, active indicator, settings slot.' },
      { id: 'cm-3', label: 'Adaptive Editor', state: 'beta', detail: 'touch defaults, minimap off, compact diagnostics.' },
    ],
  },
  control: {
    intro:
      '🛡️ Control Plane UI fuer Live Sync, Paywalls, Policies, Devices, Commands, Audit und Build Monitoring.',
    modules: [
      { id: 'ctrl-1', label: 'Live Sync Tab', state: 'stable', detail: 'catalog/schema in staging + controlled promotion.' },
      { id: 'ctrl-2', label: 'Paywalls Tab', state: 'stable', detail: 'tier views + user templates fuer entitlement mapping.' },
      { id: 'ctrl-3', label: 'Owner Security', state: 'ops', detail: 'signed mutations, owner-only controls, device allowlist.' },
    ],
  },
  runtime: {
    intro:
      '⚙️ Shared Runtime/API Plane fuer feature orchestration, compatibility checks und sichere view activation.',
    modules: [
      { id: 'run-1', label: 'Catalog + Schema', state: 'stable', detail: 'feature/layout definitions pro app + channel.' },
      { id: 'run-2', label: 'Compatibility', state: 'stable', detail: 'minClientVersion + compat matrix enforcement.' },
      { id: 'run-3', label: 'Fallback Cache', state: 'ops', detail: 'stabile runtime daten auch bei api stoerungen.' },
    ],
  },
}

const markdownSuperGuides = [
  {
    id: 'notes-markdown-superguide',
    title: '📝 Notes Markdown Superguide',
    intro: 'Kompletter Notes Markdown Flow fuer Doku, PM, Alerts und Statusboards.',
    bullets: [
      'Nutze Standard Markdown + GFM Tabellen + Tasklisten fuer normale Inhalte.',
      'Nutze `nexus-*` Blöcke fuer visuelle Widgets im Preview/Split.',
      'Nutze Inline Badge Syntax `b:Label|variant` fuer schnelle Statusmarker.',
      'Pruefe alles im Split/Preview Modus fuer finales Rendering.',
    ],
    snippet: '```md\n## Sprint Status\n\n```nexus-alert\nsuccess\nBuild + Verify erfolgreich.\n```\n\n```nexus-progress\nFrontend | 82\nBackend | 74\nQA | 61\n```\n\n`b:Release Candidate|magic`\n```',
  },
  {
    id: 'canvas-markdown-superguide',
    title: '🧩 Canvas Markdown Superguide',
    intro: 'Markdown Nodes als kompakte Projektzentrale fuer Decisions, Risks und Delivery.',
    bullets: [
      'Markdown Nodes mit PM-Nodes verbinden (goal/risk/decision/project).',
      'Nutze `nexus-kanban` fuer Standup und Sprint Sync direkt im Board.',
      'Nutze `nexus-grid` und `nexus-card` fuer Kontext + Optionen.',
      'Kombiniere mit Magic Builder Templates fuer schnellen Projektstart.',
    ],
    snippet: '```md\n```nexus-grid\n2\nScope\nDependencies\nRisks\nKPIs\n```\n\n```nexus-kanban\nYesterday | API contract fixed\nToday | UI integration\nBlocker | none\n```\n\n```nexus-card\nOption A|Fast Delivery|Tech debt risk\n```\n```',
  },
]

const guideClusters: GuideCluster[] = [
  {
    id: 'cluster-main',
    title: '🚀 Nexus Main Views',
    subtitle: 'Desktop Productivity Surface mit allen Kernfunktionen',
    views: [
      { view: 'Dashboard', emoji: '📊', functions: ['2-Spalten Widget Grid', 'Snap Layout + Reorder', 'Widget Sichtbarkeit / Width', 'Layout Reset ueber Settings'], shortcuts: ['Layout bearbeiten', 'Dashboard Reset'] },
      { view: 'Notes', emoji: '📝', functions: ['Edit/Split/Preview', 'Magic Widgets + Inline Badges', 'Tagging + Sorting + Pinning', 'Focus Mode + local notes settings'], shortcuts: ['Ctrl+S', 'Ctrl+E', 'Ctrl+P', 'Ctrl+\\'] },
      { view: 'Code', emoji: '💻', functions: ['JS/TS Run', 'HTML/CSS/MD Preview', 'JSON Validation', 'Multi-language editing'], shortcuts: ['Ctrl+Enter', 'Ctrl+Space', 'Alt+Shift+F'] },
      { view: 'Tasks', emoji: '✅', functions: ['Kanban todo/doing/done', 'Subtasks + markdown notes', 'Priority + deadline states', 'Drag/drop flow'], shortcuts: ['Double click edit', 'Drag drop columns'] },
      { view: 'Reminders', emoji: '⏰', functions: ['Quick presets (+15m/+1h/...)', 'Repeat modes daily/weekly/monthly', 'Snooze actions', 'Upcoming/soon/overdue filtering'], shortcuts: ['Quick set buttons', 'Toast snooze actions'] },
      { view: 'Canvas', emoji: '🧠', functions: ['Infinite board + node graph', 'Connections + minimap', 'Auto-layout (mindmap/timeline/board)', 'Template + AI project generator'], shortcuts: ['Ctrl+M', 'Ctrl+0', 'Space+Drag'] },
      { view: 'Files', emoji: '🗂️', functions: ['Workspace CRUD', 'Item assignment', 'Grid/List mode', 'Cross-type search'], shortcuts: ['Double click open', 'Add to Workspace'] },
      { view: 'Flux', emoji: '🌊', functions: ['Activity stream timeline', 'Type filters', 'Pulse monitoring', 'Fast recap of events'], shortcuts: ['Filter chips'] },
      { view: 'DevTools', emoji: '🛠️', functions: ['Visual Builder', 'Tailwind/CSS output', 'UI calculator set', 'Fast frontend prototyping'], shortcuts: ['Copy generated code'] },
      { view: 'Settings', emoji: '⚙️', functions: ['Theme/Glass/Glow/Background', 'Layout/Workspace/Motion/Editor', 'JSON import/export', 'Quick UX profiles'], shortcuts: ['Save Theme', 'Export JSON', 'Reset Settings'] },
      { view: 'Info', emoji: '📚', functions: ['In-app docs', 'feature changelog', 'shortcut reference', 'terminal command guide'], shortcuts: ['Open Info view'] },
      { view: 'Terminal + Spotlight', emoji: '⌨️', functions: ['Command palette bridge', 'Macro recording', 'Undo/Redo stacks', 'Canvas command triggers'], shortcuts: ['Shift x2', 'macro start/run', 'goto <view>'] },
    ],
  },
  {
    id: 'cluster-mobile',
    title: '📱 Nexus Mobile Views',
    subtitle: 'Mobile parity fuer Main inkl. Touch + Safe-Area Verhalten',
    views: [
      { view: 'Bottom Navigation', emoji: '🧭', functions: ['Primary tabs', 'More drawer', 'Runtime allowlist aware', 'Haptic navigation'], shortcuts: ['Primary taps', 'More drawer'] },
      { view: 'Dashboard', emoji: '📊', functions: ['Mobile-optimiertes widget overview', 'Kompakte KPI cards', 'Touch-friendly layout', 'Paritaet zur Desktop-Dashboard-Logik'], shortcuts: ['View switch via bottom nav'] },
      { view: 'Notes', emoji: '📝', functions: ['Mobile markdown editing', 'Preview/split je nach width', 'Tag + sort workflows', 'Toolbar formatting'], shortcuts: ['Hardware keyboard shortcuts optional'] },
      { view: 'Code', emoji: '💻', functions: ['Mobile code editing', 'Run/preview feedback', 'Tab flows', 'Output readability'], shortcuts: ['Ctrl+Enter (hardware keyboard)'] },
      { view: 'Tasks', emoji: '✅', functions: ['Kanban drag flow', 'Priority/deadline states', 'Subtasks + notes', 'Touch optimized cards'], shortcuts: ['Task modal actions'] },
      { view: 'Reminders', emoji: '⏰', functions: ['Quick presets', 'Repeat + snooze', 'Overdue workflow', 'Toast interactions'], shortcuts: ['Snooze chips'] },
      { view: 'Canvas', emoji: '🧠', functions: ['Infinite board gestures', 'Node editing', 'Zoom/pan controls', 'Connection workflows'], shortcuts: ['Scroll zoom', 'Space+drag pan'] },
      { view: 'Files', emoji: '🗂️', functions: ['Workspace assignment', 'Grid/List switching', 'Type filters', 'Quick open'], shortcuts: ['Item menu actions'] },
      { view: 'Flux + DevTools', emoji: '🌈', functions: ['Activity feed', 'Builder on mobile layout', 'Quick diagnostics', 'Visual parity checks'], shortcuts: ['View toggles'] },
      { view: 'Settings + Info', emoji: '📚', functions: ['Theme and motion controls', 'Editor/notes settings', 'In-app docs + changelog', 'Device-specific tuning'], shortcuts: ['Settings tab filters'] },
      { view: 'Mobile Terminal', emoji: '⌨️', functions: ['Compact commands', 'new/search/list flows', 'theme/preset switching', 'palette trigger'], shortcuts: ['help', 'palette', 'goto <view>'] },
    ],
  },
  {
    id: 'cluster-code',
    title: '💻 Nexus Code (Desktop IDE)',
    subtitle: 'Editor + Panels + Runtime Integration',
    views: [
      { view: 'Editor Core', emoji: '🧾', functions: ['Tab management', 'Auto save', 'Diagnostics', 'Theme-aware rendering'], shortcuts: ['Ctrl+S', 'Ctrl+W'] },
      { view: 'Explorer', emoji: '📁', functions: ['Open folder', 'Create files/folders', 'Rename/Delete', 'Tree navigation'], shortcuts: ['Open Folder action'] },
      { view: 'Search', emoji: '🔎', functions: ['Global search', 'Filterable results', 'Fast jump to match', 'Project scan'], shortcuts: ['Ctrl+P', 'Ctrl+Shift+P'] },
      { view: 'Problems', emoji: '🐞', functions: ['Diagnostics list', 'Error/warn grouping', 'Jump to file/line', 'Panel badges'], shortcuts: ['Problems panel toggle'] },
      { view: 'Git', emoji: '🧬', functions: ['Working changes view', 'Commit flow integration', 'Sync actions', 'Status quick checks'], shortcuts: ['Git panel toggle'] },
      { view: 'Debug', emoji: '🧪', functions: ['Debug panel context', 'Runtime issue tracking', 'State hints', 'Panel diagnostics'], shortcuts: ['Debug panel toggle'] },
      { view: 'Extensions', emoji: '🧩', functions: ['Extension listing', 'Enable/disable flow', 'Panel integration', 'Workspace compatibility'], shortcuts: ['Extensions panel toggle'] },
      { view: 'Terminal', emoji: '🖥️', functions: ['Integrated shell', 'Command output', 'Panel docking', 'Editor parallel workflow'], shortcuts: ['Ctrl+`'] },
      { view: 'Command Palette + Spotlight', emoji: '⚡', functions: ['Action launcher', 'Quick open flow', 'Command execution', 'Keyboard-first navigation'], shortcuts: ['Ctrl+Shift+P', 'Shift x2'] },
      { view: 'Settings', emoji: '⚙️', functions: ['Theme/background', 'Editor controls', 'Sidebar/zen mode', 'Reset defaults'], shortcuts: ['open-settings action'] },
    ],
  },
  {
    id: 'cluster-code-mobile',
    title: '📟 Nexus Code Mobile',
    subtitle: 'Native IDE Surface mit mobilem Paneling',
    views: [
      { view: 'Editor Mobile Core', emoji: '🧾', functions: ['Touch optimized editing', 'Autosave', 'Adaptive diagnostics', 'Compact layout'], shortcuts: ['Mobile save flow'] },
      { view: 'Explorer', emoji: '📁', functions: ['nativeFS read/write', 'mkdir/rename/delete', 'Open file closes drawer on mobile', 'Tree navigation'], shortcuts: ['Bottom nav explorer'] },
      { view: 'Search', emoji: '🔎', functions: ['Project search panel', 'Quick file jump', 'Result filtering', 'Mobile panel transitions'], shortcuts: ['Bottom nav search'] },
      { view: 'Problems + Debug', emoji: '🐞', functions: ['Issue list', 'Debug context panel', 'Panel switch quick path', 'Error-first workflow'], shortcuts: ['Bottom nav problems/debug'] },
      { view: 'Git + Extensions', emoji: '🧬', functions: ['Git panel parity', 'Extensions panel parity', 'State indicators', 'Mobile compatible controls'], shortcuts: ['Bottom nav git/extensions'] },
      { view: 'Terminal + Palette', emoji: '🖥️', functions: ['Terminal panel', 'Command palette', 'Spotlight style quick find', 'Panel focus switching'], shortcuts: ['Ctrl+` with keyboard'] },
      { view: 'Mobile BottomNav', emoji: '🧭', functions: ['Active indicator animation', 'Safe-area spacing', 'Settings slot', 'Panel toggle state'], shortcuts: ['Bottom nav taps'] },
      { view: 'Settings', emoji: '⚙️', functions: ['Theme/font', 'Wrap/line/minimap', 'Zen/sidebar toggles', 'Persist local settings'], shortcuts: ['Open settings overlay'] },
    ],
  },
  {
    id: 'cluster-control',
    title: '🛡️ Nexus Control Tabs',
    subtitle: 'Operative API-Steuerung fuer Runtime, Security und Billing',
    views: [
      { view: 'Dashboard', emoji: '📈', functions: ['Online/stale metrics', 'Events + render stats', 'App registry table', 'Health snapshot'], shortcuts: ['Tab: Dashboard'] },
      { view: 'Build', emoji: '🏗️', functions: ['Manifest loader', 'Build command guide', 'Release context', 'Ops readiness'], shortcuts: ['Tab: Build'] },
      { view: 'Live Sync', emoji: '🔄', functions: ['Catalog/schema load', 'Validation', 'Staging save', 'Promotion flow'], shortcuts: ['Tab: Live Sync'] },
      { view: 'Settings', emoji: '⚙️', functions: ['Global config', 'App config per surface', 'Load/save config', 'Runtime tuning'], shortcuts: ['Tab: Settings'] },
      { view: 'Commands', emoji: '📨', functions: ['Target app selection', 'Type/priority/TTL', 'Idempotency key', 'Queue visibility'], shortcuts: ['Tab: Commands'] },
      { view: 'Policies', emoji: '🔐', functions: ['Security policy editor', 'Owner restrictions', 'Persist signed mutations', 'Policy governance'], shortcuts: ['Tab: Policies'] },
      { view: 'Paywalls', emoji: '💳', functions: ['Paywall on/off', 'Tier view templates', 'User tier mapping', 'Server-side entitlement config'], shortcuts: ['Tab: Paywalls'] },
      { view: 'Devices', emoji: '📱', functions: ['Device allowlist', 'Approve/revoke flows', 'Role CSV', 'Device list refresh'], shortcuts: ['Tab: Devices'] },
      { view: 'Audit', emoji: '🧾', functions: ['Audit log viewer', 'Mutation trail', 'Security event review', 'Operational forensics'], shortcuts: ['Tab: Audit'] },
      { view: 'Guides', emoji: '📚', functions: ['Guide list from API', 'Guide loader', 'Embedded reference', 'Ops quick context'], shortcuts: ['Tab: Guides'] },
    ],
  },
]

const appEmoji: Record<AppId | 'all', string> = {
  all: '🌌',
  ecosystem: '🛰️',
  main: '🧠',
  mobile: '📱',
  code: '💻',
  'code-mobile': '📟',
  control: '🛡️',
  runtime: '⚙️',
}

const categoryEmoji: Record<CategoryId, string> = {
  overview: '🗺️',
  view: '🧩',
  markdown: '📝',
  settings: '⚙️',
  workflow: '⚡',
  runtime: '🔄',
  security: '🔐',
  ops: '🏗️',
}

const TIER_LEVELS = {
  free: 0,
  pro: 1,
  team: 2,
  enterprise: 3,
} as const

type TierId = keyof typeof TIER_LEVELS

const FEATURE_OPTIONS = [
  { id: 'notes.magic', label: 'Notes Magic Widgets', requiredTier: 'pro' },
  { id: 'canvas.ai', label: 'Canvas AI Project Generator', requiredTier: 'team' },
  { id: 'code.terminal', label: 'Code Terminal Power Tools', requiredTier: 'pro' },
  { id: 'control.paywalls', label: 'Control Paywall Operations', requiredTier: 'enterprise' },
] as const satisfies Array<{ id: string; label: string; requiredTier: TierId }>

type FeatureId = (typeof FEATURE_OPTIONS)[number]['id']

const API_ENGINEER_PROMPT = `Du bist API Engineer fuer Nexus.
Bitte implementiere/validiere folgende Contracts fuer Website Auth + Billing:
1) POST /api/v1/auth/signup -> email, password, displayName, termsAccepted -> user + verification state.
2) POST /api/v1/auth/login -> email, password -> session + refresh token rotation.
3) GET /api/v1/billing/entitlements -> active tier + purchased feature keys + expiresAt.
4) POST /api/v1/billing/checkout-session -> tier/plan -> hosted checkout url.
5) POST /api/v1/paywall/check -> featureKey + appId + clientVersion -> allow|deny + reason + upsell tier.
6) Signed owner mutations und idempotency keys fuer kritische billing/policy endpoints.
Antwort als API contract changelog mit request/response JSON, error-codes und migration notes.`

function makeSearchBlob(entry: WikiEntry) {
  const chunks = [
    entry.title,
    entry.summary,
    ...entry.points,
    ...entry.tags,
    ...entry.commands,
    ...entry.sources,
    ...entry.guide.map((step) => `${step.title} ${step.detail}`),
    ...(entry.markdownSnippets ?? []).flatMap((item) => [item.label, item.description, item.snippet]),
    entry.app,
    entry.category,
  ]
  return chunks.join(' ').toLowerCase()
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mission')
  const [visualFxMode, setVisualFxMode] = useState<VisualFxMode>('full')
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [authEmail, setAuthEmail] = useState('captain@nexus.dev')
  const [authPassword, setAuthPassword] = useState('Nexus#2026')
  const [authConfirm, setAuthConfirm] = useState('Nexus#2026')
  const [authTier, setAuthTier] = useState<TierId>('free')
  const [featureCheck, setFeatureCheck] = useState<FeatureId>('notes.magic')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [app, setApp] = useState<AppFilter>('all')
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id ?? '')
  const [previewApp, setPreviewApp] = useState<AppId>('main')
  const [previewModuleId, setPreviewModuleId] = useState(previewMap.main.modules[0]?.id ?? '')
  const [copyState, setCopyState] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)

  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let frame = 0
    const updateScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const doc = document.documentElement
        const max = Math.max(doc.scrollHeight - window.innerHeight, 1)
        setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)))
      })
    }

    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
    }
  }, [])

  const indexedEntries = useMemo(
    () => entries.map((entry) => ({ entry, blob: makeSearchBlob(entry) })),
    [],
  )

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return indexedEntries
      .filter(({ entry, blob }) => {
        const categoryOk = category === 'all' || entry.category === category
        const appOk = app === 'all' || entry.app === app
        const queryOk = !q || blob.includes(q)
        return categoryOk && appOk && queryOk
      })
      .map(({ entry }) => entry)
  }, [app, category, deferredQuery, indexedEntries])

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId('')
      return
    }
    if (!filtered.some((entry) => entry.id === selectedId)) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  useEffect(() => {
    const modules = previewMap[previewApp].modules
    if (!modules.some((module) => module.id === previewModuleId)) {
      setPreviewModuleId(modules[0]?.id ?? '')
    }
  }, [previewApp, previewModuleId])

  const selected = useMemo(
    () => filtered.find((entry) => entry.id === selectedId) ?? null,
    [filtered, selectedId],
  )

  const selectedPreviewModule = useMemo(
    () => previewMap[previewApp].modules.find((module) => module.id === previewModuleId) ?? null,
    [previewApp, previewModuleId],
  )

  const categoryCounts = useMemo(() => {
    return categories.map((item) => ({
      id: item.id,
      label: item.label,
      count: entries.filter((entry) => entry.category === item.id).length,
    }))
  }, [])

  const appCounts = useMemo(() => {
    return apps.map((item) => ({
      id: item.id,
      label: item.label,
      count: entries.filter((entry) => entry.app === item.id).length,
    }))
  }, [])

  const sourceCoverage = useMemo(() => {
    const mapped = new Map<string, number>()
    for (const entry of entries) {
      for (const source of entry.sources) {
        mapped.set(source, (mapped.get(source) ?? 0) + 1)
      }
    }
    return Array.from(mapped.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 36)
  }, [])

  const relatedEntries = useMemo(() => {
    if (!selected) return [] as WikiEntry[]
    return entries
      .filter((entry) => entry.id !== selected.id && (entry.app === selected.app || entry.category === selected.category))
      .slice(0, 6)
  }, [selected])

  const quickEntryByApp = useMemo(() => {
    return apps.map((item) => ({
      id: item.id,
      label: item.label,
      count: filtered.filter((entry) => entry.app === item.id).length,
    }))
  }, [filtered])

  const messageTone = filtered.length ? 'success' : 'warning'
  const messageIcon = filtered.length ? <CheckCircle2 size={16} /> : <Activity size={16} />
  const activeFeature = useMemo(
    () => FEATURE_OPTIONS.find((item) => item.id === featureCheck) ?? FEATURE_OPTIONS[0],
    [featureCheck],
  )
  const hasEntitlement = TIER_LEVELS[authTier] >= TIER_LEVELS[activeFeature.requiredTier]

  const copyText = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyState(token)
      window.setTimeout(() => setCopyState(''), 1400)
    } catch {
      setCopyState('copy-error')
      window.setTimeout(() => setCopyState(''), 1400)
    }
  }

  return (
    <div
      className={`nexus-site wiki-cosmic ${visualFxMode === 'lite' ? 'fx-lite' : 'fx-full'}`}
      style={{ ['--scroll-progress' as any]: `${scrollProgress}` }}
    >
      <div className="scroll-progress-shell" aria-hidden="true">
        <div className="scroll-progress-bar" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      <div className="space-stars-layer layer-a" aria-hidden="true" />
      <div className="space-stars-layer layer-b" aria-hidden="true" />
      <div className="space-nebula-layer" aria-hidden="true" />
      {visualFxMode === 'full' ? <div className="space-meteor meteor-a" aria-hidden="true" /> : null}
      {visualFxMode === 'full' ? <div className="space-meteor meteor-b" aria-hidden="true" /> : null}
      <div className="site-gradient site-gradient-a" aria-hidden="true" />
      <div className="site-gradient site-gradient-b" aria-hidden="true" />
      <div className="site-grid-overlay" aria-hidden="true" />

      <div className="site-shell">
        <header className="site-hero wiki-hero">
          <div className="site-hero-topline">🌌 NEXUS ECOSYSTEM SUPER WIKI</div>
          <h1>Großes, interaktives Space-Wiki im Product-Style</h1>
          <p>
            Umfangreiche Guides fuer <strong>jede View</strong>, alle Settings, Notes/Canvas Markdown,
            Control-Tabs, Runtime- und Security-Flows. Alles in einer glowy, glassy, blurry Space-UI mit
            interaktivem Scroll-Verhalten.
          </p>

          <div className="site-chip-row">
            <span className="site-chip">📚 Eintraege: {entries.length}</span>
            <span className="site-chip">🧩 Kategorien: {categories.length}</span>
            <span className="site-chip">🌐 Apps: {apps.length}</span>
            <span className="site-chip">✨ Guides: {guideClusters.reduce((sum, item) => sum + item.views.length, 0)}</span>
            <button
              type="button"
              className={`site-chip site-chip-button ${visualFxMode === 'lite' ? 'active' : ''}`}
              onClick={() => setVisualFxMode((prev) => (prev === 'full' ? 'lite' : 'full'))}
            >
              <Activity size={14} /> {visualFxMode === 'lite' ? 'Performance Mode' : 'Cinematic Mode'}
            </button>
          </div>
        </header>

        <nav className="site-tabs" role="tablist" aria-label="Wiki Tabs">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`site-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={`site-status ${messageTone}`}>
          {messageIcon}
          <span>{filtered.length} Treffer aktiv. Scroll Progress: {Math.round(scrollProgress * 100)}%</span>
        </div>

        <section key={activeTab} className="site-panel site-panel-animate">
          {activeTab === 'mission' ? (
            <div className="panel-grid mission-grid">
              <article className="panel-card mission-orbit-card">
                <div className="panel-title"><Rocket size={16} /> Mission Orbit</div>
                <div className="wiki-orbit">
                  <div className="wiki-orbit-core">
                    <strong>Nexus Core</strong>
                    <small>Apps + Runtime + Control</small>
                  </div>
                  {apps.map((item, idx) => (
                    <button
                      key={item.id}
                      className={`wiki-orbit-node ${previewApp === item.id ? 'active' : ''}`}
                      style={{ ['--i' as any]: idx, ['--n' as any]: apps.length }}
                      onClick={() => setPreviewApp(item.id)}
                    >
                      <span>{appEmoji[item.id]} {item.label}</span>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </article>

              <article className="panel-card mission-module-card">
                <div className="panel-title"><Sparkles size={16} /> Active Surface</div>
                <h2>{appEmoji[previewApp]} {apps.find((item) => item.id === previewApp)?.label}</h2>
                <p>{previewMap[previewApp].intro}</p>
                <div className="feature-select-grid">
                  {previewMap[previewApp].modules.map((module) => (
                    <button
                      key={module.id}
                      className={previewModuleId === module.id ? 'feature-pill active' : 'feature-pill'}
                      onClick={() => setPreviewModuleId(module.id)}
                    >
                      <span>{module.label}</span>
                      <span>{module.state}</span>
                    </button>
                  ))}
                </div>
                {selectedPreviewModule ? (
                  <div className="node-relation">{selectedPreviewModule.detail}</div>
                ) : null}
              </article>

              <article className="panel-card panel-card-wide mission-wide-card">
                <div className="panel-title"><Layers size={16} /> Mission Summary</div>
                <div className="surface-grid">
                  <div className="surface-item">
                    <div className="surface-item-head">
                      <strong>🎯 Produktziel</strong>
                      <span className="surface-badge">wiki-first</span>
                    </div>
                    <p>Alle Nexus Apps, Views, Funktionen, Settings, Markdown-Flows und Ops-Prozesse an einem Ort.</p>
                  </div>
                  <div className="surface-item">
                    <div className="surface-item-head">
                      <strong>🔐 Paywall Prinzip</strong>
                      <span className="surface-badge">api-authority</span>
                    </div>
                    <p>Website steuert UX, API bleibt autoritativ fuer Entitlements und View-Freigaben.</p>
                  </div>
                  <div className="surface-item">
                    <div className="surface-item-head">
                      <strong>⚡ Performance</strong>
                      <span className="surface-badge">deferred-search</span>
                    </div>
                    <p>Deferred query, memoized index, strukturierte Panels und reduzierte FX im Lite-Mode.</p>
                  </div>
                  <div className="surface-item">
                    <div className="surface-item-head">
                      <strong>🧭 Navigation</strong>
                      <span className="surface-badge">sticky-atlas</span>
                    </div>
                    <p>Atlas-Tab mit Sticky Navigator, großer Detailspalte und Related-Entry Pfaden.</p>
                  </div>
                </div>
              </article>

              <article className="panel-card panel-card-wide auth-template-card">
                <div className="panel-title"><CheckCircle2 size={16} /> Account, Login und Paywall Website Template</div>
                <div className="auth-template-grid">
                  <section className="surface-item">
                    <div className="surface-item-head">
                      <strong>🧑‍🚀 Account Session Flow</strong>
                      <span className="surface-badge">website-only ux</span>
                    </div>
                    <div className="auth-mode-switch">
                      <button
                        type="button"
                        className={authMode === 'signup' ? 'auth-mode-button active' : 'auth-mode-button'}
                        onClick={() => setAuthMode('signup')}
                      >
                        Signup
                      </button>
                      <button
                        type="button"
                        className={authMode === 'login' ? 'auth-mode-button active' : 'auth-mode-button'}
                        onClick={() => setAuthMode('login')}
                      >
                        Login
                      </button>
                    </div>

                    <div className="form-grid two">
                      <label>
                        Email
                        <input
                          type="email"
                          value={authEmail}
                          onChange={(event) => setAuthEmail(event.target.value)}
                          placeholder="captain@nexus.dev"
                        />
                      </label>
                      <label>
                        Password
                        <input
                          type="password"
                          value={authPassword}
                          onChange={(event) => setAuthPassword(event.target.value)}
                          placeholder="Strong password"
                        />
                      </label>
                    </div>

                    {authMode === 'signup' ? (
                      <label>
                        Confirm Password
                        <input
                          type="password"
                          value={authConfirm}
                          onChange={(event) => setAuthConfirm(event.target.value)}
                          placeholder="Repeat password"
                        />
                      </label>
                    ) : null}

                    <label>
                      Demo Tier
                      <select value={authTier} onChange={(event) => setAuthTier(event.target.value as TierId)}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="team">Team</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </label>

                    <div className="session-row">
                      <strong>{authMode === 'signup' ? 'Signup Payload Ready' : 'Login Payload Ready'}</strong>
                      <span className="session-meta">{authEmail || 'missing-email'}</span>
                    </div>
                  </section>

                  <section className="surface-item">
                    <div className="surface-item-head">
                      <strong>💳 Paywall Guard Preview</strong>
                      <span className="surface-badge">api-check expected</span>
                    </div>

                    <label>
                      Angefragtes Premium Feature
                      <select value={featureCheck} onChange={(event) => setFeatureCheck(event.target.value as FeatureId)}>
                        {FEATURE_OPTIONS.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="paywall-grid">
                      <div className="paywall-tier-box">
                        <h4>Aktiver Tier</h4>
                        <strong>{authTier.toUpperCase()}</strong>
                      </div>
                      <div className="paywall-tier-box">
                        <h4>Benoetigter Tier</h4>
                        <strong>{activeFeature.requiredTier.toUpperCase()}</strong>
                      </div>
                    </div>

                    <div className={`view-result ${hasEntitlement ? 'ok' : 'blocked'}`}>
                      <strong>{activeFeature.label}</strong>
                      <span>{hasEntitlement ? 'Access erlaubbar: API check sollte allow liefern.' : 'Access blockiert: API muss deny + upsell tier zurueckgeben.'}</span>
                    </div>
                  </section>

                  <section className="surface-item">
                    <div className="surface-item-head">
                      <strong>🔌 API Integrations-Checkliste</strong>
                      <button type="button" onClick={() => copyText(API_ENGINEER_PROMPT, 'api-prompt')}>
                        <Copy size={14} /> Prompt kopieren
                      </button>
                    </div>
                    <ul className="wiki-bullet-list">
                      <li>Signup/Login Form muss nur UI und Payload vorbereiten, Token- und Entitlement-Entscheidung bleibt API-seitig.</li>
                      <li>Checkout-Start benoetigt API Session-Endpunkt, kein Preis- und Tier-Trust im Frontend.</li>
                      <li>Feature Guard nutzt API-Response `allow|deny|reason|upsellTier` fuer konsistente UX in allen Views.</li>
                      <li>Nach erfolgreichem Kauf revalidiert Website Entitlements und aktualisiert View-Verfuegbarkeit.</li>
                    </ul>
                    <pre className="wiki-pre">{API_ENGINEER_PROMPT}</pre>
                  </section>
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === 'atlas' ? (
            <div className="wiki-atlas-layout">
              <aside className="panel-card wiki-nav-card">
                <div className="panel-title"><Search size={16} /> Navigator</div>
                <label>
                  Suche
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="z. B. notes magic, canvas ai, paywall, terminal"
                  />
                </label>

                <div className="wiki-filter-group">
                  <span>🧩 Kategorien</span>
                  <div className="wiki-filter-chips">
                    <button className={category === 'all' ? 'feature-pill active' : 'feature-pill'} onClick={() => setCategory('all')}>🌌 Alle</button>
                    {categories.map((item) => (
                      <button
                        key={item.id}
                        className={category === item.id ? 'feature-pill active' : 'feature-pill'}
                        onClick={() => setCategory(item.id)}
                        title={item.description}
                      >
                        {categoryEmoji[item.id]} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wiki-filter-group">
                  <span>🌐 App Scope</span>
                  <div className="wiki-filter-chips">
                    <button className={app === 'all' ? 'feature-pill active' : 'feature-pill'} onClick={() => setApp('all')}>🌌 Alle Apps</button>
                    {apps.map((item) => (
                      <button
                        key={item.id}
                        className={app === item.id ? 'feature-pill active' : 'feature-pill'}
                        onClick={() => setApp(item.id)}
                      >
                        {appEmoji[item.id]} {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wiki-mini-list">
                  <strong>🛰️ Treffer je App</strong>
                  {quickEntryByApp.map((item) => (
                    <button key={item.id} className="wiki-mini-row" onClick={() => setApp(item.id)}>
                      <span>{appEmoji[item.id]} {item.label}</span>
                      <span>{item.count}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <article className="panel-card wiki-stream-card">
                <div className="panel-title"><BookOpen size={16} /> Artikel Stream</div>
                <div className="wiki-entry-list">
                  {!filtered.length ? (
                    <div className="wiki-empty">Keine Treffer. Passe Suche oder Filter an.</div>
                  ) : (
                    filtered.map((entry) => (
                      <button
                        key={entry.id}
                        className={selected?.id === entry.id ? 'wiki-entry active' : 'wiki-entry'}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <div className="wiki-entry-head">
                          <strong>{appEmoji[entry.app]} {entry.title}</strong>
                          <span className="surface-badge">{categoryEmoji[entry.category]} {entry.category}</span>
                        </div>
                        <p>{entry.summary}</p>
                        <div className="wiki-tag-row">
                          {entry.tags.slice(0, 5).map((tag) => (
                            <span className="site-chip" key={`${entry.id}-${tag}`}>#{tag}</span>
                          ))}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="panel-card wiki-detail-card">
                {!selected ? (
                  <div className="wiki-empty">Waehle links einen Artikel aus.</div>
                ) : (
                  <div className="wiki-detail-stack">
                    <div>
                      <div className="panel-title"><Sparkles size={16} /> {appEmoji[selected.app]} {selected.app} · {categoryEmoji[selected.category]} {selected.category}</div>
                      <h2>{selected.title}</h2>
                      <p className="muted-copy">{selected.summary}</p>
                    </div>

                    <section className="surface-item">
                      <div className="surface-item-head">
                        <strong>🧭 Schritt-fuer-Schritt</strong>
                        <span className="surface-badge">{selected.guide.length} steps</span>
                      </div>
                      <ol className="wiki-ordered-list">
                        {selected.guide.map((step) => (
                          <li key={step.title}><strong>{step.title}:</strong> {step.detail}</li>
                        ))}
                      </ol>
                    </section>

                    <section className="surface-item">
                      <div className="surface-item-head">
                        <strong>✨ Funktionen / Kernpunkte</strong>
                        <span className="surface-badge">{selected.points.length} points</span>
                      </div>
                      <ul className="wiki-bullet-list">
                        {selected.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </section>

                    {selected.commands.length > 0 ? (
                      <section className="surface-item">
                        <div className="surface-item-head">
                          <strong>⌨️ Commands / Aktionen</strong>
                          <span className="surface-badge">copyable</span>
                        </div>
                        <div className="wiki-command-row">
                          {selected.commands.map((command) => (
                            <button
                              key={command}
                              className="feature-pill"
                              onClick={() => copyText(command, `cmd:${selected.id}:${command}`)}
                              title="In Zwischenablage kopieren"
                            >
                              {command}
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {selected.markdownSnippets && selected.markdownSnippets.length > 0 ? (
                      <section className="surface-grid">
                        {selected.markdownSnippets.map((snippet) => (
                          <div className="surface-item" key={snippet.label}>
                            <div className="surface-item-head">
                              <strong>🧾 {snippet.label}</strong>
                              <button onClick={() => copyText(snippet.snippet, `snippet:${selected.id}:${snippet.label}`)}>
                                <Copy size={14} /> copy
                              </button>
                            </div>
                            <p>{snippet.description}</p>
                            <pre className="wiki-pre">{snippet.snippet}</pre>
                          </div>
                        ))}
                      </section>
                    ) : null}

                    {relatedEntries.length > 0 ? (
                      <section className="surface-item">
                        <div className="surface-item-head">
                          <strong>🔗 Related Artikel</strong>
                          <span className="surface-badge">quick jump</span>
                        </div>
                        <div className="wiki-related-grid">
                          {relatedEntries.map((item) => (
                            <button key={item.id} className="wiki-related-item" onClick={() => setSelectedId(item.id)}>
                              <strong>{appEmoji[item.app]} {item.title}</strong>
                              <small>{item.summary}</small>
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className="surface-item">
                      <div className="surface-item-head">
                        <strong>📎 Quellen im Repo</strong>
                        <span className="surface-badge">{selected.sources.length} refs</span>
                      </div>
                      <ul className="wiki-bullet-list">
                        {selected.sources.map((source) => (
                          <li key={source}><code>{source}</code></li>
                        ))}
                      </ul>
                    </section>

                    {copyState && copyState !== 'copy-error' ? <div className="small-state ok">Kopiert.</div> : null}
                    {copyState === 'copy-error' ? <div className="small-state warn">Kopieren fehlgeschlagen.</div> : null}
                  </div>
                )}
              </article>
            </div>
          ) : null}

          {activeTab === 'guides' ? (
            <div className="panel-grid guides-grid">
              <article className="panel-card panel-card-wide">
                <div className="panel-title"><BookOpen size={16} /> Markdown Mega Guides</div>
                <div className="markdown-super-grid">
                  {markdownSuperGuides.map((guide) => (
                    <div className="surface-item" key={guide.id}>
                      <div className="surface-item-head">
                        <strong>{guide.title}</strong>
                        <span className="surface-badge">markdown</span>
                      </div>
                      <p>{guide.intro}</p>
                      <ul className="wiki-bullet-list">
                        {guide.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                      <pre className="wiki-pre">{guide.snippet}</pre>
                    </div>
                  ))}
                </div>
              </article>

              {guideClusters.map((cluster) => (
                <article className="panel-card panel-card-wide guide-cluster-card" key={cluster.id}>
                  <div className="panel-title"><Layers size={16} /> {cluster.title}</div>
                  <p className="muted-copy">{cluster.subtitle}</p>
                  <div className="view-function-grid">
                    {cluster.views.map((view) => (
                      <div className="view-function-card" key={`${cluster.id}-${view.view}`}>
                        <div className="surface-item-head">
                          <strong>{view.emoji} {view.view}</strong>
                          <span className="surface-badge">functions</span>
                        </div>
                        <ul className="wiki-bullet-list">
                          {view.functions.map((fn) => (
                            <li key={fn}>{fn}</li>
                          ))}
                        </ul>
                        <div className="wiki-command-row">
                          {view.shortcuts.map((shortcut) => (
                            <span className="site-chip" key={shortcut}>{shortcut}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === 'matrix' ? (
            <div className="panel-grid">
              <article className="panel-card panel-card-wide">
                <div className="panel-title"><Table2 size={16} /> View Availability Matrix</div>
                <div className="wiki-table-wrap">
                  <table className="wiki-table">
                    <thead>
                      <tr>
                        <th>View</th>
                        <th>Main</th>
                        <th>Mobile</th>
                        <th>Code</th>
                        <th>Code Mobile</th>
                        <th>Control</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewMatrix.map((row) => (
                        <tr key={row.view}>
                          <td>{row.view}</td>
                          <td className={row.main ? 'on' : 'off'}>{row.main ? 'ON' : 'OFF'}</td>
                          <td className={row.mobile ? 'on' : 'off'}>{row.mobile ? 'ON' : 'OFF'}</td>
                          <td className={row.code ? 'on' : 'off'}>{row.code ? 'ON' : 'OFF'}</td>
                          <td className={row.codeMobile ? 'on' : 'off'}>{row.codeMobile ? 'ON' : 'OFF'}</td>
                          <td className={row.control ? 'on' : 'off'}>{row.control ? 'ON' : 'OFF'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          ) : null}

          {activeTab === 'coverage' ? (
            <div className="panel-grid">
              <article className="panel-card">
                <div className="panel-title"><LayoutDashboard size={16} /> Kategorie Coverage</div>
                <div className="guard-list">
                  {categoryCounts.map((item) => (
                    <div key={item.id}>
                      <span>{categoryEmoji[item.id]} {item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-title"><Grid3X3 size={16} /> App Coverage</div>
                <div className="guard-list">
                  {appCounts.map((item) => (
                    <div key={item.id}>
                      <span>{appEmoji[item.id]} {item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel-card panel-card-wide">
                <div className="panel-title"><BookOpen size={16} /> Source Referenzen</div>
                <div className="surface-grid">
                  {sourceCoverage.map((item) => (
                    <div className="surface-item" key={item.source}>
                      <div className="surface-item-head">
                        <strong>{item.source}</strong>
                        <span className="surface-badge">{item.count}x</span>
                      </div>
                      <p>Diese Quelle wird in {item.count} Wiki-Artikeln referenziert.</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default App
