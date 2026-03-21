import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Compass,
  Copy,
  Grid3X3,
  LayoutDashboard,
  Rocket,
  Search,
  ShieldCheck,
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

type SectionId =
  | 'overview'
  | 'map'
  | 'orbit'
  | 'atlas'
  | 'guides'
  | 'matrix'
  | 'integration'
  | 'coverage'

const SECTION_ITEMS: Array<{ id: SectionId; label: string; icon: any; emoji: string }> = [
  { id: 'overview', label: 'Overview', icon: Rocket, emoji: '🚀' },
  { id: 'map', label: 'Info Map', icon: Compass, emoji: '🧭' },
  { id: 'orbit', label: 'Mission Orbit', icon: Sparkles, emoji: '🪐' },
  { id: 'atlas', label: 'Wiki Atlas', icon: Search, emoji: '📚' },
  { id: 'guides', label: 'Guide Pages', icon: Workflow, emoji: '🧩' },
  { id: 'matrix', label: 'View Matrix', icon: Table2, emoji: '🗂️' },
  { id: 'integration', label: 'Auth + Paywall', icon: ShieldCheck, emoji: '💳' },
  { id: 'coverage', label: 'Coverage', icon: LayoutDashboard, emoji: '📈' },
]

const GUIDE_CATEGORIES = new Set<CategoryId>(['view', 'markdown', 'settings', 'workflow'])

const previewMap: Record<AppId, PreviewDefinition> = {
  ecosystem: {
    intro:
      'Monorepo Kontrolle fuer Main, Mobile, Code, Code Mobile und die gehostete Control Plane mit Runtime Contracts.',
    modules: [
      { id: 'eco-1', label: 'Root Scripts', state: 'stable', detail: 'setup, build, verify, doctor und dev orchestration.' },
      { id: 'eco-2', label: 'Shared Core', state: 'stable', detail: 'liveSync, runtime mapping, contract glue, view guard layer.' },
      { id: 'eco-3', label: 'Release Gates', state: 'ops', detail: 'verify + multi-app builds + promotion readiness.' },
    ],
  },
  main: {
    intro: 'Desktop Productivity Surface mit Dashboard, Notes, Code, Tasks, Reminders, Canvas, Files, Flux, DevTools und Settings.',
    modules: [
      { id: 'main-1', label: 'Notes + Magic', state: 'stable', detail: 'Markdown workflow, widgets, split/preview, focus mode.' },
      { id: 'main-2', label: 'Canvas 2.x', state: 'stable', detail: 'node graph, templates, auto layout, AI project generator.' },
      { id: 'main-3', label: 'Terminal Bridge', state: 'beta', detail: 'command flow fuer views, canvas, macros, spotlight.' },
    ],
  },
  mobile: {
    intro: 'Mobile Parity Surface mit Bottom Navigation, More Drawer, Safe-Area Verhalten und haptischen Flows.',
    modules: [
      { id: 'mob-1', label: 'Bottom Navigation', state: 'stable', detail: 'primary tabs + more drawer fuer alle erweiterten views.' },
      { id: 'mob-2', label: 'Parity Views', state: 'stable', detail: 'notes/code/tasks/reminders/canvas/files/settings/info.' },
      { id: 'mob-3', label: 'Terminal Lite', state: 'beta', detail: 'schneller command launcher fuer mobile workflows.' },
    ],
  },
  code: {
    intro: 'Desktop IDE Surface mit Explorer, Search, Problems, Git, Debug, Extensions, Terminal und Command Palette.',
    modules: [
      { id: 'code-1', label: 'Panel Stack', state: 'stable', detail: 'explorer/search/problems/git/debug/extensions.' },
      { id: 'code-2', label: 'Editor Loop', state: 'stable', detail: 'tabs, autosave, diagnostics, keyboard actions.' },
      { id: 'code-3', label: 'Workspace IO', state: 'ops', detail: 'open folder, read/write, rename/delete, persist settings.' },
    ],
  },
  'code-mobile': {
    intro: 'Native IDE Surface mit Capacitor Filesystem Bridge und Mobile BottomNav fuer Editor-Panels.',
    modules: [
      { id: 'cm-1', label: 'nativeFS Bridge', state: 'stable', detail: 'mobile read/write/mkdir/rename/delete operations.' },
      { id: 'cm-2', label: 'Mobile BottomNav', state: 'stable', detail: 'panel switching, active indicator, settings slot.' },
      { id: 'cm-3', label: 'Adaptive Editor', state: 'beta', detail: 'touch defaults, minimap off, compact diagnostics.' },
    ],
  },
  control: {
    intro: 'Control Plane UI fuer Live Sync, Paywalls, Policies, Devices, Commands, Audit und Build Monitoring.',
    modules: [
      { id: 'ctrl-1', label: 'Live Sync Tab', state: 'stable', detail: 'catalog/schema in staging + controlled promotion.' },
      { id: 'ctrl-2', label: 'Paywalls Tab', state: 'stable', detail: 'tier views + user templates fuer entitlement mapping.' },
      { id: 'ctrl-3', label: 'Owner Security', state: 'ops', detail: 'signed mutations, owner-only controls, device allowlist.' },
    ],
  },
  runtime: {
    intro: 'Shared Runtime/API Plane fuer feature orchestration, compatibility checks und sichere view activation.',
    modules: [
      { id: 'run-1', label: 'Catalog + Schema', state: 'stable', detail: 'feature/layout definitions pro app + channel.' },
      { id: 'run-2', label: 'Compatibility', state: 'stable', detail: 'minClientVersion + compat matrix enforcement.' },
      { id: 'run-3', label: 'Fallback Cache', state: 'ops', detail: 'stabile runtime daten auch bei api stoerungen.' },
    ],
  },
}

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

const INFO_MAP_CARDS = [
  {
    id: 'map-1',
    title: 'Quick Orientation',
    text: 'Overview + Info Map erklaeren direkt, wo du Architektur, Views, Settings, Markdown und API-Flows findest.',
    target: 'overview',
  },
  {
    id: 'map-2',
    title: 'Feature Scope',
    text: 'Mission Orbit zeigt App-Surfaces und Kernmodule. Klick auf ein Surface fuer konkrete Module.',
    target: 'orbit',
  },
  {
    id: 'map-3',
    title: 'Article Explorer',
    text: 'Wiki Atlas ist der schnelle Finder ueber Suche + Kategorie + App Filter mit Detailansicht.',
    target: 'atlas',
  },
  {
    id: 'map-4',
    title: 'Guide Pages',
    text: 'Jede View hat eine große Guide-Seite mit Schritten, Funktionen, Commands und Quellen.',
    target: 'guides',
  },
  {
    id: 'map-5',
    title: 'Parity Checks',
    text: 'View Matrix und Coverage zeigen, welche Views wo verfuegbar sind und wie breit dokumentiert wurde.',
    target: 'matrix',
  },
  {
    id: 'map-6',
    title: 'Auth + Paywall',
    text: 'Integration Bereich zeigt Website-Template fuer Signup/Login/Billing und API-Handover Prompt.',
    target: 'integration',
  },
]

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

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [visualFxMode, setVisualFxMode] = useState<VisualFxMode>('full')
  const [atlasQuery, setAtlasQuery] = useState('')
  const [guideQuery, setGuideQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [appFilter, setAppFilter] = useState<AppFilter>('all')
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id ?? '')
  const [previewApp, setPreviewApp] = useState<AppId>('main')
  const [previewModuleId, setPreviewModuleId] = useState(previewMap.main.modules[0]?.id ?? '')
  const [copyState, setCopyState] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)

  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [authEmail, setAuthEmail] = useState('captain@nexus.dev')
  const [authPassword, setAuthPassword] = useState('Nexus#2026')
  const [authConfirm, setAuthConfirm] = useState('Nexus#2026')
  const [authTier, setAuthTier] = useState<TierId>('free')
  const [featureCheck, setFeatureCheck] = useState<FeatureId>('notes.magic')

  const deferredAtlasQuery = useDeferredValue(atlasQuery)
  const deferredGuideQuery = useDeferredValue(guideQuery)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const doc = document.documentElement
        const max = Math.max(doc.scrollHeight - window.innerHeight, 1)
        setScrollProgress(Math.min(1, Math.max(0, window.scrollY / max)))
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (records) => {
        records.forEach((record) => {
          if (record.isIntersecting) {
            record.target.classList.add('is-visible')
            observer.unobserve(record.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    )

    const targets = document.querySelectorAll('.scroll-reveal')
    targets.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [atlasQuery, guideQuery, appFilter, category])

  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!visible) return
        const id = visible.target.id as SectionId
        if (SECTION_ITEMS.some((item) => item.id === id)) {
          setActiveSection(id)
        }
      },
      { threshold: [0.2, 0.35, 0.6], rootMargin: '-10% 0px -48% 0px' },
    )

    SECTION_ITEMS.forEach((item) => {
      const node = document.getElementById(item.id)
      if (node) sectionObserver.observe(node)
    })

    return () => sectionObserver.disconnect()
  }, [])

  const indexedEntries = useMemo(
    () => entries.map((entry) => ({ entry, blob: makeSearchBlob(entry) })),
    [],
  )

  const atlasEntries = useMemo(() => {
    const q = deferredAtlasQuery.trim().toLowerCase()
    return indexedEntries
      .filter(({ entry, blob }) => {
        const categoryOk = category === 'all' || entry.category === category
        const appOk = appFilter === 'all' || entry.app === appFilter
        const queryOk = !q || blob.includes(q)
        return categoryOk && appOk && queryOk
      })
      .map(({ entry }) => entry)
  }, [appFilter, category, deferredAtlasQuery, indexedEntries])

  useEffect(() => {
    if (!atlasEntries.length) {
      setSelectedId('')
      return
    }
    if (!atlasEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(atlasEntries[0].id)
    }
  }, [atlasEntries, selectedId])

  useEffect(() => {
    const modules = previewMap[previewApp].modules
    if (!modules.some((module) => module.id === previewModuleId)) {
      setPreviewModuleId(modules[0]?.id ?? '')
    }
  }, [previewApp, previewModuleId])

  const selectedEntry = useMemo(
    () => atlasEntries.find((entry) => entry.id === selectedId) ?? null,
    [atlasEntries, selectedId],
  )

  const selectedPreviewModule = useMemo(
    () => previewMap[previewApp].modules.find((module) => module.id === previewModuleId) ?? null,
    [previewApp, previewModuleId],
  )

  const quickCounts = useMemo(
    () => apps.map((item) => ({ ...item, count: atlasEntries.filter((entry) => entry.app === item.id).length })),
    [atlasEntries],
  )

  const guideEntries = useMemo(() => {
    const q = deferredGuideQuery.trim().toLowerCase()
    return indexedEntries
      .filter(({ entry, blob }) => {
        if (!GUIDE_CATEGORIES.has(entry.category)) return false
        if (appFilter !== 'all' && entry.app !== appFilter) return false
        return !q || blob.includes(q)
      })
      .map(({ entry }) => entry)
  }, [appFilter, deferredGuideQuery, indexedEntries])

  const groupedGuides = useMemo(() => {
    return apps
      .map((item) => ({
        app: item,
        guides: guideEntries.filter((entry) => entry.app === item.id),
      }))
      .filter((group) => group.guides.length > 0)
  }, [guideEntries])

  const markdownFocusEntries = useMemo(
    () => guideEntries.filter((entry) => entry.category === 'markdown').slice(0, 8),
    [guideEntries],
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
    entries.forEach((entry) => {
      entry.sources.forEach((source) => {
        mapped.set(source, (mapped.get(source) ?? 0) + 1)
      })
    })

    return Array.from(mapped.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 42)
  }, [])

  const orbitNodes = useMemo(() => {
    const total = apps.length
    return apps.map((item, index) => {
      const angle = ((Math.PI * 2) / total) * index - Math.PI / 2
      const radius = 39
      const x = 50 + Math.cos(angle) * radius
      const y = 50 + Math.sin(angle) * radius
      return {
        item,
        style: { left: `${x}%`, top: `${y}%` },
      }
    })
  }, [])

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
    <div className={`wiki-root ${visualFxMode === 'lite' ? 'fx-lite' : 'fx-full'}`}>
      <div className="scroll-progress-track" aria-hidden="true">
        <div className="scroll-progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      <div className="space-layer stars-a" aria-hidden="true" />
      <div className="space-layer stars-b" aria-hidden="true" />
      <div className="space-layer nebula" aria-hidden="true" />
      <div className="space-layer grid-overlay" aria-hidden="true" />

      <header className="top-header">
        <button type="button" className="brand" onClick={() => jumpTo('overview')}>
          <span className="brand-logo">✦</span>
          <span className="brand-text">Nexus Wiki</span>
        </button>
        <nav className="top-nav-links" aria-label="Section Navigation">
          {SECTION_ITEMS.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? 'top-link active' : 'top-link'}
              onClick={() => jumpTo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className={visualFxMode === 'lite' ? 'mode-switch active' : 'mode-switch'}
          onClick={() => setVisualFxMode((prev) => (prev === 'full' ? 'lite' : 'full'))}
        >
          <Activity size={14} /> {visualFxMode === 'lite' ? 'Performance' : 'Cinematic'}
        </button>
      </header>

      <div className="site-layout">
        <aside className="left-sidebar">
          <div className="sidebar-card scroll-reveal">
            <div className="sidebar-title">Wiki Navigation</div>
            <div className="section-list">
              {SECTION_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={isActive ? 'section-link active' : 'section-link'}
                    onClick={() => jumpTo(item.id)}
                  >
                    <Icon size={16} />
                    <span>
                      {item.label} <small>{item.emoji}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sidebar-card scroll-reveal">
            <div className="sidebar-title">Live Stats</div>
            <div className="stat-grid">
              <div>
                <span>Entries</span>
                <strong>{entries.length}</strong>
              </div>
              <div>
                <span>Guide Pages</span>
                <strong>{guideEntries.length}</strong>
              </div>
              <div>
                <span>Apps</span>
                <strong>{apps.length}</strong>
              </div>
              <div>
                <span>Scroll</span>
                <strong>{Math.round(scrollProgress * 100)}%</strong>
              </div>
            </div>
          </div>
        </aside>

        <main className="content-shell">
          <section id="overview" className="section-block hero-section scroll-reveal">
            <div className="hero-badge">
              <Sparkles size={14} /> Live-Sync Wiki Mode Active
            </div>
            <h1>
              Nexus Ecosystem Wiki im <span>Product-Page Style</span>
            </h1>
            <p>
              Große, scroll-basierte Wissensoberflaeche mit klaren Bereichen: Orientierung, Orbit, Atlas,
              Guide-Pages, Matrix, Integration und Coverage. Jede View ist als umfangreicher Guide aufbereitet.
            </p>
            <div className="hero-chip-row">
              <span className="hero-chip">🌌 Space Theme</span>
              <span className="hero-chip">🧭 Klare Informationspfade</span>
              <span className="hero-chip">🧩 Guide-Seiten pro View</span>
              <span className="hero-chip">⚡ Scroll Animationen + Performance Mode</span>
            </div>
            <div className="hero-cta-row">
              <button type="button" className="cta-primary" onClick={() => jumpTo('guides')}>
                <BookOpen size={16} /> Zu den Guide Pages
              </button>
              <button type="button" className="cta-secondary" onClick={() => jumpTo('atlas')}>
                <Search size={16} /> Im Atlas suchen
              </button>
            </div>
          </section>

          <section id="map" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>Info Map: Wo sind welche Informationen?</h2>
              <p>Diese Map macht das Wiki direkt lesbar und nimmt die Orientierung vorweg.</p>
            </div>
            <div className="info-map-grid">
              {INFO_MAP_CARDS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className="info-map-card scroll-reveal"
                  onClick={() => jumpTo(card.target)}
                >
                  <strong>{card.title}</strong>
                  <p>{card.text}</p>
                </button>
              ))}
            </div>
          </section>

          <section id="orbit" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>Mission Orbit: App-Surfaces + Module</h2>
              <p>
                Verbessertes Orbit-Modell ohne springende Knoten. Klick auf eine App, um Module und Surface-Details
                zu sehen.
              </p>
            </div>

            <div className="orbit-layout">
              <article className="orbit-card scroll-reveal">
                <div className="orbit-core">
                  <strong>Nexus Core</strong>
                  <small>Apps + Runtime + Control</small>
                </div>
                {orbitNodes.map(({ item, style }) => (
                  <button
                    key={item.id}
                    type="button"
                    className={previewApp === item.id ? 'orbit-node active' : 'orbit-node'}
                    style={style}
                    onClick={() => setPreviewApp(item.id)}
                    title={item.subtitle}
                  >
                    <span>{appEmoji[item.id]}</span>
                    <b>{item.label}</b>
                  </button>
                ))}
              </article>

              <article className="surface-card scroll-reveal">
                <div className="surface-title">
                  <span>{appEmoji[previewApp]}</span>
                  <strong>{apps.find((item) => item.id === previewApp)?.label}</strong>
                </div>
                <p>{previewMap[previewApp].intro}</p>
                <div className="module-grid">
                  {previewMap[previewApp].modules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      className={previewModuleId === module.id ? 'module-pill active' : 'module-pill'}
                      onClick={() => setPreviewModuleId(module.id)}
                    >
                      <span>{module.label}</span>
                      <small>{module.state}</small>
                    </button>
                  ))}
                </div>
                {selectedPreviewModule ? <div className="module-note">{selectedPreviewModule.detail}</div> : null}
              </article>
            </div>
          </section>

          <section id="atlas" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>Wiki Atlas</h2>
              <p>Direkter Explorer mit Suche, Kategorien, App-Filtern und Detailpanel.</p>
            </div>

            <div className="atlas-layout">
              <aside className="atlas-nav scroll-reveal">
                <label>
                  Suche
                  <input
                    type="search"
                    value={atlasQuery}
                    onChange={(event) => setAtlasQuery(event.target.value)}
                    placeholder="notes magic, canvas, paywall, settings"
                  />
                </label>

                <div className="chip-wrap">
                  <button
                    type="button"
                    className={category === 'all' ? 'chip-btn active' : 'chip-btn'}
                    onClick={() => setCategory('all')}
                  >
                    🌌 Alle Kategorien
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={category === item.id ? 'chip-btn active' : 'chip-btn'}
                      onClick={() => setCategory(item.id)}
                    >
                      {categoryEmoji[item.id]} {item.label}
                    </button>
                  ))}
                </div>

                <div className="chip-wrap">
                  <button
                    type="button"
                    className={appFilter === 'all' ? 'chip-btn active' : 'chip-btn'}
                    onClick={() => setAppFilter('all')}
                  >
                    🌌 Alle Apps
                  </button>
                  {apps.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={appFilter === item.id ? 'chip-btn active' : 'chip-btn'}
                      onClick={() => setAppFilter(item.id)}
                    >
                      {appEmoji[item.id]} {item.label}
                    </button>
                  ))}
                </div>

                <div className="mini-counts">
                  {quickCounts.map((item) => (
                    <button key={item.id} type="button" onClick={() => setAppFilter(item.id)}>
                      <span>
                        {appEmoji[item.id]} {item.label}
                      </span>
                      <strong>{item.count}</strong>
                    </button>
                  ))}
                </div>
              </aside>

              <article className="atlas-list scroll-reveal">
                <div className="subhead">Artikel ({atlasEntries.length})</div>
                <div className="entry-list">
                  {atlasEntries.length === 0 ? (
                    <div className="empty-state">Keine Treffer. Passe Suche oder Filter an.</div>
                  ) : (
                    atlasEntries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={selectedEntry?.id === entry.id ? 'entry-row active' : 'entry-row'}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <strong>
                          {appEmoji[entry.app]} {entry.title}
                        </strong>
                        <span>
                          {categoryEmoji[entry.category]} {entry.category}
                        </span>
                        <p>{entry.summary}</p>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="atlas-detail scroll-reveal">
                {!selectedEntry ? (
                  <div className="empty-state">Waehle links einen Artikel aus.</div>
                ) : (
                  <div className="detail-stack">
                    <div>
                      <div className="detail-meta">
                        {appEmoji[selectedEntry.app]} {selectedEntry.app} · {categoryEmoji[selectedEntry.category]}{' '}
                        {selectedEntry.category}
                      </div>
                      <h3>{selectedEntry.title}</h3>
                      <p>{selectedEntry.summary}</p>
                    </div>

                    <section className="detail-card">
                      <div className="detail-card-head">
                        <strong>Schritt fuer Schritt</strong>
                        <span>{selectedEntry.guide.length} Steps</span>
                      </div>
                      <ol>
                        {selectedEntry.guide.map((step) => (
                          <li key={step.title}>
                            <b>{step.title}:</b> {step.detail}
                          </li>
                        ))}
                      </ol>
                    </section>

                    <section className="detail-card">
                      <div className="detail-card-head">
                        <strong>Funktionen</strong>
                        <span>{selectedEntry.points.length}</span>
                      </div>
                      <ul>
                        {selectedEntry.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </section>

                    {selectedEntry.commands.length > 0 ? (
                      <section className="detail-card">
                        <div className="detail-card-head">
                          <strong>Commands</strong>
                          <span>copyable</span>
                        </div>
                        <div className="command-row">
                          {selectedEntry.commands.map((command) => (
                            <button
                              key={command}
                              type="button"
                              className="chip-btn"
                              onClick={() => copyText(command, `cmd:${selectedEntry.id}:${command}`)}
                            >
                              {command}
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    {selectedEntry.markdownSnippets?.length ? (
                      <section className="detail-card">
                        <div className="detail-card-head">
                          <strong>Markdown Snippets</strong>
                          <span>{selectedEntry.markdownSnippets.length}</span>
                        </div>
                        <div className="snippet-grid">
                          {selectedEntry.markdownSnippets.map((snippet) => (
                            <article key={snippet.label} className="snippet-card">
                              <div className="snippet-head">
                                <strong>{snippet.label}</strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    copyText(snippet.snippet, `snippet:${selectedEntry.id}:${snippet.label}`)
                                  }
                                >
                                  <Copy size={14} /> Copy
                                </button>
                              </div>
                              <p>{snippet.description}</p>
                              <pre>{snippet.snippet}</pre>
                            </article>
                          ))}
                        </div>
                      </section>
                    ) : null}

                    <section className="detail-card">
                      <div className="detail-card-head">
                        <strong>Quellen</strong>
                        <span>{selectedEntry.sources.length}</span>
                      </div>
                      <ul>
                        {selectedEntry.sources.map((source) => (
                          <li key={source}>
                            <code>{source}</code>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                )}
              </article>
            </div>
          </section>

          <section id="guides" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>Guide Pages: Jede View als große eigene Seite</h2>
              <p>
                Durchsuche alle View-Guides und springe direkt in eine große Guide-Seite mit Schritten, Funktionen,
                Commands, Markdown und Quellen.
              </p>
            </div>

            <div className="guide-toolbar scroll-reveal">
              <label>
                Guides durchsuchen
                <input
                  type="search"
                  value={guideQuery}
                  onChange={(event) => setGuideQuery(event.target.value)}
                  placeholder="notesview, canvas magic menu, settings, terminal ..."
                />
              </label>
              <div className="toolbar-kpi">
                <span>
                  <BookOpen size={15} /> {guideEntries.length} Guide-Seiten
                </span>
                <span>
                  <Grid3X3 size={15} /> {groupedGuides.length} App-Sektionen
                </span>
              </div>
            </div>

            <div className="guide-index scroll-reveal">
              {groupedGuides.map((group) => (
                <div key={group.app.id} className="guide-index-col">
                  <strong>
                    {appEmoji[group.app.id]} {group.app.label}
                  </strong>
                  <div>
                    {group.guides.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => jumpTo(`guide-${entry.id}`)}
                      >
                        {entry.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="guide-pages">
              {groupedGuides.map((group) => (
                <section key={group.app.id} className="guide-group scroll-reveal">
                  <header>
                    <h3>
                      {appEmoji[group.app.id]} {group.app.label}
                    </h3>
                    <p>{group.app.subtitle}</p>
                  </header>

                  {group.guides.map((entry) => (
                    <article key={entry.id} id={`guide-${entry.id}`} className="guide-page scroll-reveal">
                      <div className="guide-page-head">
                        <div>
                          <span className="guide-pill">
                            {categoryEmoji[entry.category]} {entry.category}
                          </span>
                          <h4>{entry.title}</h4>
                        </div>
                        <button
                          type="button"
                          className="chip-btn"
                          onClick={() => copyText(`https://youngjibbit95.github.io/Nexus-Ecosystem/#guide-${entry.id}`, `anchor:${entry.id}`)}
                        >
                          <Copy size={14} /> Link
                        </button>
                      </div>

                      <p className="guide-summary">{entry.summary}</p>

                      <div className="guide-page-grid">
                        <section>
                          <div className="detail-card-head">
                            <strong>Guide Flow</strong>
                            <span>{entry.guide.length}</span>
                          </div>
                          <ol>
                            {entry.guide.map((step) => (
                              <li key={step.title}>
                                <b>{step.title}:</b> {step.detail}
                              </li>
                            ))}
                          </ol>
                        </section>

                        <section>
                          <div className="detail-card-head">
                            <strong>View Funktionen</strong>
                            <span>{entry.points.length}</span>
                          </div>
                          <ul>
                            {entry.points.map((point) => (
                              <li key={point}>{point}</li>
                            ))}
                          </ul>
                        </section>
                      </div>

                      {entry.commands.length ? (
                        <section className="guide-extra">
                          <div className="detail-card-head">
                            <strong>Commands</strong>
                            <span>interactive</span>
                          </div>
                          <div className="command-row">
                            {entry.commands.map((command) => (
                              <button
                                key={command}
                                type="button"
                                className="chip-btn"
                                onClick={() => copyText(command, `guide-cmd:${entry.id}:${command}`)}
                              >
                                {command}
                              </button>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {entry.markdownSnippets?.length ? (
                        <section className="guide-extra">
                          <div className="detail-card-head">
                            <strong>Markdown Guide</strong>
                            <span>{entry.markdownSnippets.length} Snippets</span>
                          </div>
                          <div className="snippet-grid">
                            {entry.markdownSnippets.map((snippet) => (
                              <article key={snippet.label} className="snippet-card">
                                <div className="snippet-head">
                                  <strong>{snippet.label}</strong>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyText(snippet.snippet, `guide-snippet:${entry.id}:${snippet.label}`)
                                    }
                                  >
                                    <Copy size={14} /> Copy
                                  </button>
                                </div>
                                <p>{snippet.description}</p>
                                <pre>{snippet.snippet}</pre>
                              </article>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      <section className="guide-extra">
                        <div className="detail-card-head">
                          <strong>Tags + Quellen</strong>
                          <span>{entry.sources.length} Quellen</span>
                        </div>
                        <div className="tag-row">
                          {entry.tags.map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                        <ul>
                          {entry.sources.map((source) => (
                            <li key={source}>
                              <code>{source}</code>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </article>
                  ))}
                </section>
              ))}
            </div>

            {markdownFocusEntries.length ? (
              <article className="markdown-focus scroll-reveal">
                <h3>Markdown Fokus (Notes + Canvas)</h3>
                <p>
                  Diese Guides decken NotesView Markdown, Canvas Markdown und Magic-Menues mit praxisnahen Snippets ab.
                </p>
                <div className="command-row">
                  {markdownFocusEntries.map((entry) => (
                    <button key={entry.id} type="button" className="chip-btn" onClick={() => jumpTo(`guide-${entry.id}`)}>
                      {entry.title}
                    </button>
                  ))}
                </div>
              </article>
            ) : null}
          </section>

          <section id="matrix" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>View Availability Matrix</h2>
              <p>Direkter Parity-Check fuer Main, Mobile, Code, Code Mobile und Control.</p>
            </div>
            <div className="table-wrap">
              <table className="matrix-table">
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
          </section>

          <section id="integration" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>Auth, Account, Payments und API-Handover</h2>
              <p>
                Website-Template fuer Signup/Login/Paywall UX. Entitlement Entscheidungen bleiben API-seitig autoritativ.
              </p>
            </div>

            <div className="integration-grid">
              <article className="integration-card scroll-reveal">
                <div className="detail-card-head">
                  <strong>Account Session Flow</strong>
                  <span>website ux</span>
                </div>
                <div className="mode-row">
                  <button
                    type="button"
                    className={authMode === 'signup' ? 'chip-btn active' : 'chip-btn'}
                    onClick={() => setAuthMode('signup')}
                  >
                    Signup
                  </button>
                  <button
                    type="button"
                    className={authMode === 'login' ? 'chip-btn active' : 'chip-btn'}
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
              </article>

              <article className="integration-card scroll-reveal">
                <div className="detail-card-head">
                  <strong>Paywall Guard Preview</strong>
                  <span>entitlement check</span>
                </div>

                <label>
                  Angefragtes Feature
                  <select value={featureCheck} onChange={(event) => setFeatureCheck(event.target.value as FeatureId)}>
                    {FEATURE_OPTIONS.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="tier-grid">
                  <div>
                    <span>Aktiver Tier</span>
                    <strong>{authTier.toUpperCase()}</strong>
                  </div>
                  <div>
                    <span>Benoetigter Tier</span>
                    <strong>{activeFeature.requiredTier.toUpperCase()}</strong>
                  </div>
                </div>

                <div className={hasEntitlement ? 'result-box ok' : 'result-box blocked'}>
                  <strong>{activeFeature.label}</strong>
                  <p>
                    {hasEntitlement
                      ? 'Access erlaubbar: API sollte allow fuer paywall/check liefern.'
                      : 'Access blockiert: API sollte deny + upsell tier liefern.'}
                  </p>
                </div>
              </article>

              <article className="integration-card wide scroll-reveal">
                <div className="detail-card-head">
                  <strong>API Engineer Prompt + Integrations-Checklist</strong>
                  <button type="button" onClick={() => copyText(API_ENGINEER_PROMPT, 'api-prompt')}>
                    <Copy size={14} /> Prompt kopieren
                  </button>
                </div>
                <ul>
                  <li>Signup/Login Form steuert nur UX + Payload, nicht Entitlement Authority.</li>
                  <li>Checkout startet ueber API Session-Endpunkt; Preise/Tiers nicht im Frontend vertrauen.</li>
                  <li>Feature-Guard nutzt allow/deny/reason/upsellTier fuer konsistente UX in allen Views.</li>
                  <li>Nach Kauf Entitlements revalidieren und View-Verfuegbarkeit im Client aktualisieren.</li>
                </ul>
                <pre>{API_ENGINEER_PROMPT}</pre>
              </article>
            </div>
          </section>

          <section id="coverage" className="section-block scroll-reveal">
            <div className="section-head">
              <h2>Coverage + Dokumentationsbreite</h2>
              <p>Einordnung nach Kategorien, Apps und am haeufigsten referenzierten Quellen.</p>
            </div>

            <div className="coverage-grid">
              <article className="coverage-card scroll-reveal">
                <div className="subhead">Kategorie Coverage</div>
                <div className="count-list">
                  {categoryCounts.map((item) => (
                    <div key={item.id}>
                      <span>
                        {categoryEmoji[item.id]} {item.label}
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="coverage-card scroll-reveal">
                <div className="subhead">App Coverage</div>
                <div className="count-list">
                  {appCounts.map((item) => (
                    <div key={item.id}>
                      <span>
                        {appEmoji[item.id]} {item.label}
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="coverage-card wide scroll-reveal">
                <div className="subhead">Top Quellen</div>
                <div className="source-grid">
                  {sourceCoverage.map((item) => (
                    <div key={item.source}>
                      <strong>{item.source}</strong>
                      <span>{item.count} Referenzen</span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <footer className="wiki-footer">
            <p>
              Nexus Ecosystem Wiki · Scroll-first Product Style · {new Date().getFullYear()} 🌌
            </p>
            {copyState && copyState !== 'copy-error' ? <span className="small-state ok">Kopiert</span> : null}
            {copyState === 'copy-error' ? <span className="small-state warn">Kopieren fehlgeschlagen</span> : null}
          </footer>
        </main>
      </div>
    </div>
  )
}

export default App
