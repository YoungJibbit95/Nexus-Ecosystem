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

type SectionId =
  | 'hero'
  | 'solar'
  | 'ecosystem'
  | 'apps'
  | 'atlas'
  | 'guides'
  | 'matrix'
  | 'integration'
  | 'coverage'

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

type SurfaceTabId = 'main' | 'code' | 'mobile'

const SECTION_ITEMS: Array<{ id: SectionId; label: string; icon: any; emoji: string; keywords: string[] }> = [
  { id: 'hero', label: 'Overview', icon: Rocket, emoji: '🚀', keywords: ['intro', 'start', 'hero'] },
  { id: 'solar', label: 'Solar Travel', icon: Sparkles, emoji: '🪐', keywords: ['sonnensystem', 'travel', 'tabs'] },
  { id: 'ecosystem', label: 'Ecosystem', icon: Grid3X3, emoji: '🛰️', keywords: ['architektur', 'runtime', 'flow'] },
  { id: 'apps', label: 'App Surfaces', icon: Workflow, emoji: '🧠', keywords: ['main', 'code', 'mobile', 'tabs'] },
  { id: 'atlas', label: 'Wiki Atlas', icon: Search, emoji: '📚', keywords: ['search', 'finder', 'artikel'] },
  { id: 'guides', label: 'Guide Worlds', icon: BookOpen, emoji: '🧩', keywords: ['view guide', 'markdown', 'features'] },
  { id: 'matrix', label: 'View Matrix', icon: Table2, emoji: '🗂️', keywords: ['parity', 'availability'] },
  { id: 'integration', label: 'Auth + Paywall', icon: ShieldCheck, emoji: '💳', keywords: ['login', 'signup', 'billing'] },
  { id: 'coverage', label: 'Coverage', icon: LayoutDashboard, emoji: '📈', keywords: ['stats', 'quellen', 'coverage'] },
]

const GUIDE_CATEGORIES = new Set<CategoryId>(['view', 'markdown', 'settings', 'workflow'])

const SURFACE_TABS: Array<{
  id: SurfaceTabId
  label: string
  emoji: string
  previewKey: AppId
  guideApps: AppId[]
  subtitle: string
  highlights: string[]
  keywords: string[]
}> = [
  {
    id: 'main',
    label: 'Nexus Main',
    emoji: '🧠',
    previewKey: 'main',
    guideApps: ['main'],
    subtitle: 'Desktop Productivity Universe',
    highlights: [
      'Dashboard, Notes, Canvas, Tasks, Reminders, Files, Flux, DevTools und Settings',
      'NotesView + Canvas mit Magic Menues und Markdown Superflows',
      'Terminal + Spotlight als produktiver Command Layer',
    ],
    keywords: ['nexus main', 'notesview', 'canvas', 'settings'],
  },
  {
    id: 'code',
    label: 'Nexus Code',
    emoji: '💻',
    previewKey: 'code',
    guideApps: ['code'],
    subtitle: 'Desktop IDE Universe',
    highlights: [
      'Explorer, Search, Problems, Git, Debug, Extensions und Terminal',
      'Editor-Loop mit Diagnostics, Command Palette und workspace IO',
      'Keyboard-first Workflows fuer schnelle Delivery',
    ],
    keywords: ['nexus code', 'ide', 'explorer', 'debug'],
  },
  {
    id: 'mobile',
    label: 'Mobile Versions',
    emoji: '📱',
    previewKey: 'mobile',
    guideApps: ['mobile', 'code-mobile'],
    subtitle: 'Nexus Mobile + Nexus Code Mobile',
    highlights: [
      'Mobile Parity fuer Main mit Bottom Navigation und Safe-Area UX',
      'Code Mobile mit nativeFS Bridge, Paneling und touch-adaptivem Editor',
      'Gemeinsame Runtime-LiveSync Flows trotz mobiler Constraints',
    ],
    keywords: ['mobile', 'code mobile', 'bottom nav', 'nativefs'],
  },
]

const previewMap: Record<AppId, PreviewDefinition> = {
  ecosystem: {
    intro: 'Monorepo Kontrolle fuer Main, Mobile, Code, Code Mobile und gehostete Control Plane mit Runtime Contracts.',
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

function hashHue(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 360
  }
  return hash
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('hero')
  const [visualFxMode, setVisualFxMode] = useState<VisualFxMode>('full')
  const [travelSearch, setTravelSearch] = useState('')
  const [atlasQuery, setAtlasQuery] = useState('')
  const [guideQuery, setGuideQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [appFilter, setAppFilter] = useState<AppFilter>('all')
  const [surfaceTab, setSurfaceTab] = useState<SurfaceTabId>('main')
  const [selectedAtlasId, setSelectedAtlasId] = useState<string>(entries[0]?.id ?? '')
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

  const deferredTravelSearch = useDeferredValue(travelSearch)
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
    const revealObserver = new IntersectionObserver(
      (records) => {
        records.forEach((record) => {
          if (record.isIntersecting) {
            record.target.classList.add('is-visible')
            revealObserver.unobserve(record.target)
          }
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -10% 0px' },
    )

    const revealNodes = document.querySelectorAll('.scroll-reveal')
    revealNodes.forEach((node) => revealObserver.observe(node))

    return () => revealObserver.disconnect()
  }, [atlasQuery, guideQuery, appFilter, category, surfaceTab])

  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      (records) => {
        const best = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!best) return
        const id = best.target.id as SectionId
        if (SECTION_ITEMS.some((item) => item.id === id)) {
          setActiveSection(id)
        }
      },
      { threshold: [0.2, 0.35, 0.6], rootMargin: '-12% 0px -44% 0px' },
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
      setSelectedAtlasId('')
      return
    }
    if (!atlasEntries.some((entry) => entry.id === selectedAtlasId)) {
      setSelectedAtlasId(atlasEntries[0].id)
    }
  }, [atlasEntries, selectedAtlasId])

  const selectedAtlasEntry = useMemo(
    () => atlasEntries.find((entry) => entry.id === selectedAtlasId) ?? null,
    [atlasEntries, selectedAtlasId],
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
      .map((item) => ({ app: item, guides: guideEntries.filter((entry) => entry.app === item.id) }))
      .filter((group) => group.guides.length > 0)
  }, [guideEntries])

  const surfaceDefinition = useMemo(
    () => SURFACE_TABS.find((item) => item.id === surfaceTab) ?? SURFACE_TABS[0],
    [surfaceTab],
  )

  useEffect(() => {
    setPreviewApp(surfaceDefinition.previewKey)
    const first = previewMap[surfaceDefinition.previewKey].modules[0]?.id ?? ''
    setPreviewModuleId((current) => {
      if (previewMap[surfaceDefinition.previewKey].modules.some((mod) => mod.id === current)) return current
      return first
    })
  }, [surfaceDefinition])

  useEffect(() => {
    const modules = previewMap[previewApp].modules
    if (!modules.some((module) => module.id === previewModuleId)) {
      setPreviewModuleId(modules[0]?.id ?? '')
    }
  }, [previewApp, previewModuleId])

  const surfaceModules = useMemo(
    () => previewMap[surfaceDefinition.previewKey].modules,
    [surfaceDefinition],
  )

  const selectedSurfaceModule = useMemo(
    () => surfaceModules.find((item) => item.id === previewModuleId) ?? surfaceModules[0] ?? null,
    [previewModuleId, surfaceModules],
  )

  const surfaceGuides = useMemo(() => {
    const appSet = new Set(surfaceDefinition.guideApps)
    return guideEntries.filter((entry) => appSet.has(entry.app)).slice(0, 18)
  }, [guideEntries, surfaceDefinition])

  const quickCounts = useMemo(
    () => apps.map((item) => ({ ...item, count: atlasEntries.filter((entry) => entry.app === item.id).length })),
    [atlasEntries],
  )

  const sectionSearchMatches = useMemo(() => {
    const q = deferredTravelSearch.trim().toLowerCase()
    if (!q) return [] as Array<{ type: 'section' | 'tab' | 'guide'; id: string; title: string; subtitle: string }>

    const sectionMatches = SECTION_ITEMS.filter((item) => {
      const terms = [item.label, ...item.keywords, item.emoji].join(' ').toLowerCase()
      return terms.includes(q)
    }).map((item) => ({
      type: 'section' as const,
      id: item.id,
      title: item.label,
      subtitle: `Section · ${item.emoji}`,
    }))

    const tabMatches = SURFACE_TABS.filter((item) => {
      const terms = [item.label, item.subtitle, ...item.keywords].join(' ').toLowerCase()
      return terms.includes(q)
    }).map((item) => ({
      type: 'tab' as const,
      id: item.id,
      title: item.label,
      subtitle: `App Tab · ${item.emoji}`,
    }))

    const guideMatches = indexedEntries
      .filter(({ blob }) => blob.includes(q))
      .map(({ entry }) => ({
        type: 'guide' as const,
        id: entry.id,
        title: entry.title,
        subtitle: `Guide · ${appEmoji[entry.app]} ${entry.app}`,
      }))
      .slice(0, 8)

    return [...sectionMatches, ...tabMatches, ...guideMatches].slice(0, 14)
  }, [deferredTravelSearch, indexedEntries])

  const categoryCounts = useMemo(
    () => categories.map((item) => ({ ...item, count: entries.filter((entry) => entry.category === item.id).length })),
    [],
  )

  const appCounts = useMemo(
    () => apps.map((item) => ({ ...item, count: entries.filter((entry) => entry.app === item.id).length })),
    [],
  )

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
      .slice(0, 48)
  }, [])

  const topCommands = useMemo(() => {
    const unique = new Set<string>()
    entries.forEach((entry) => {
      entry.commands.forEach((command) => {
        if (unique.size < 16) unique.add(command)
      })
    })
    return Array.from(unique)
  }, [])

  const orbitNodes = useMemo(() => {
    const planets = SECTION_ITEMS.filter((item) => item.id !== 'hero')
    const total = planets.length
    return planets.map((item, index) => {
      const angle = (360 / total) * index
      const radius = 170 + (index % 3) * 28 + Math.floor(index / 3) * 18
      return {
        item,
        style: {
          ['--angle' as any]: `${angle}deg`,
          ['--radius' as any]: `${radius}px`,
        },
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

  const openGuide = (guideId: string) => {
    jumpTo('guides')
    window.setTimeout(() => {
      jumpTo(`guide-${guideId}`)
    }, 220)
  }

  return (
    <div
      className={`wiki-root ${visualFxMode === 'lite' ? 'fx-lite' : 'fx-full'}`}
      style={{ ['--scroll-progress' as any]: scrollProgress.toString() }}
    >
      <div className="scroll-progress-track" aria-hidden="true">
        <div className="scroll-progress-fill" style={{ width: `${scrollProgress * 100}%` }} />
      </div>

      <div className="space-layer stars-a" aria-hidden="true" />
      <div className="space-layer stars-b" aria-hidden="true" />
      <div className="space-layer nebula" aria-hidden="true" />
      <div className="space-layer grid-overlay" aria-hidden="true" />

      <main className="open-flow">
        <section id="hero" className="section-viewport hero-viewport scroll-reveal">
          <div className="hero-topline">
            <button type="button" className="brand" onClick={() => jumpTo('hero')}>
              <span className="brand-logo">✦</span>
              <span className="brand-text">Nexus Wiki Universe</span>
            </button>
            <button
              type="button"
              className={visualFxMode === 'lite' ? 'mode-switch active' : 'mode-switch'}
              onClick={() => setVisualFxMode((prev) => (prev === 'full' ? 'lite' : 'full'))}
            >
              <Activity size={14} /> {visualFxMode === 'lite' ? 'Performance' : 'Cinematic'}
            </button>
          </div>

          <div className="hero-command">
            <div className="travel-search">
              <label>
                Suche im gesamten Wiki
                <input
                  type="search"
                  value={travelSearch}
                  onChange={(event) => setTravelSearch(event.target.value)}
                  placeholder="notesview, canvas magic, settings, paywall ..."
                />
              </label>

              {sectionSearchMatches.length > 0 ? (
                <div className="travel-search-results">
                  {sectionSearchMatches.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => {
                        if (result.type === 'section') {
                          jumpTo(result.id)
                        }
                        if (result.type === 'tab') {
                          setSurfaceTab(result.id as SurfaceTabId)
                          jumpTo('apps')
                        }
                        if (result.type === 'guide') {
                          openGuide(result.id)
                        }
                        setTravelSearch('')
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>
                        <strong>{result.title}</strong>
                        <small>{result.subtitle}</small>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <nav className="hero-tab-strip" aria-label="Wiki Sections">
              {SECTION_ITEMS.map((item, index) => (
                <button
                  key={`travel-${item.id}`}
                  type="button"
                  className={activeSection === item.id ? 'travel-tab active' : 'travel-tab'}
                  onClick={() => jumpTo(item.id)}
                >
                  <span>{index + 1}</span>
                  {item.emoji} {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="hero-kicker">
            <Sparkles size={15} /> Scroll-Mission aktiv
          </div>
          <h1>
            Großes Nexus Wiki als <span>Solar-System-Minigame</span>
          </h1>
          <p>
            Klarer Lesefluss statt leerer Mega-Boxen: Jede Sektion zeigt jetzt direkt nutzbare Infos, konkrete
            Feature-Listen, Commands und Lernpfade. Suche + Tabs bringen dich sofort zu der Stelle, die du brauchst.
          </p>

          <div className="hero-read-layout">
            <article className="hero-read-card">
              <h3>📌 Schnellstart in Markdown</h3>
              <pre>{`# Nexus Wiki Quickstart
1. 🔎 Suche nutzen (oben)
2. 🪐 Section-Tab klicken
3. 🧩 Guide oeffnen
4. 💻 Command kopieren
5. ✅ Feature in App testen`}</pre>
            </article>

            <article className="hero-read-card">
              <h3>🧭 Wo finde ich was?</h3>
              <ul className="emoji-markdown-list">
                <li>🧠 <strong>Apps:</strong> Main / Code / Mobile Features, Module, Guide-Spruenge.</li>
                <li>📚 <strong>Atlas:</strong> Volltextsuche, Kategorien, Apps, Detailansicht pro Thema.</li>
                <li>🧩 <strong>Guides:</strong> Schritt-fuer-Schritt, Markdown, Commands, Quellen.</li>
                <li>💳 <strong>Integration:</strong> Signup/Login-Paywall UX und API-Handover.</li>
              </ul>
            </article>
          </div>

          <ul className="emoji-markdown-list large">
            <li>🚀 <strong>Travel Tabs:</strong> feste Steps fuer den gesamten Wiki-Flow.</li>
            <li>🛰️ <strong>Ecosystem:</strong> Architektur, Runtime, Coverage und Operator-Checks.</li>
            <li>🧠 <strong>App Worlds:</strong> Main, Code und Mobile Versionen mit Lernpfaden.</li>
            <li>🧩 <strong>Guide Worlds:</strong> jede View mit klaren Steps + Markdown-Referenzen.</li>
          </ul>
          <div className="hero-actions">
            <button type="button" className="cta-primary" onClick={() => jumpTo('solar')}>
              <Rocket size={16} /> Reise starten
            </button>
            <button type="button" className="cta-secondary" onClick={() => jumpTo('guides')}>
              <BookOpen size={16} /> Zu den View Worlds
            </button>
          </div>
        </section>

        <section id="solar" className="section-viewport solar-viewport scroll-reveal">
          <div className="section-head">
            <h2>Solar Travel: feste Tabs im Scroll-Flow</h2>
            <p>Die Website fuehlt sich wie ein Sonnensystem an. Jeder Planet ist eine Wiki-Stage.</p>
          </div>

          <div className="solar-layout">
            <div className="solar-map">
              <div className="solar-sun">
                <strong>Nexus Sun</strong>
                <small>Wiki Core</small>
              </div>

              {orbitNodes.map(({ item, style }) => (
                <button
                  key={`orbit-${item.id}`}
                  type="button"
                  className={activeSection === item.id ? 'solar-planet active' : 'solar-planet'}
                  style={style}
                  onClick={() => jumpTo(item.id)}
                >
                  <span>{item.emoji}</span>
                  <b>{item.label}</b>
                </button>
              ))}
            </div>

            <div className="solar-log">
              <h3>🧾 Travel Log (Markdown Look)</h3>
              <ul className="emoji-markdown-list">
                {SECTION_ITEMS.map((item, index) => (
                  <li key={`log-${item.id}`}>
                    {activeSection === item.id ? '✅' : '🪐'} <strong>Step {index + 1}:</strong> {item.label}
                  </li>
                ))}
              </ul>

              <div className="solar-command-block">
                <div className="detail-head">
                  <strong>Top Commands</strong>
                  <span>{topCommands.length}</span>
                </div>
                <div className="command-row">
                  {topCommands.map((command) => (
                    <button key={`orbit-cmd-${command}`} type="button" className="chip-btn" onClick={() => copyText(command, `top:${command}`)}>
                      {command}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ecosystem" className="section-viewport ecosystem-viewport scroll-reveal">
          <div className="section-head">
            <h2>Ecosystem Mega Area</h2>
            <p>Große Architekturzone mit offenen Erklaerflaechen statt kleinen Einzelcontainern.</p>
          </div>

          <div className="ecosystem-grid">
            <article className="ecosystem-panel huge">
              <h3>🌌 Galactic Architecture</h3>
              <p>
                Jeder Planet mappt auf eine App-Surface. Klick filtert den Atlas und springt direkt in die passende
                Doku-Welt.
              </p>
              <div className="ecosystem-planets">
                {apps.map((item, idx) => (
                  <button
                    key={`eco-${item.id}`}
                    type="button"
                    className="ecosystem-planet"
                    style={{ ['--i' as any]: idx, ['--n' as any]: apps.length }}
                    onClick={() => {
                      setAppFilter(item.id)
                      jumpTo('atlas')
                    }}
                  >
                    <span>{appEmoji[item.id]}</span>
                    <strong>{item.label}</strong>
                    <small>{item.subtitle}</small>
                  </button>
                ))}
              </div>
            </article>

            <article className="ecosystem-panel">
              <h3>🧭 Runtime & Control Flow</h3>
              <ul className="emoji-markdown-list">
                <li>⚙️ <strong>Runtime/API:</strong> autoritative Quelle fuer Entitlements und View-Freigaben.</li>
                <li>🛡️ <strong>Control:</strong> Policies, Devices, LiveSync, Paywalls und Promotion-Kontrolle.</li>
                <li>🔄 <strong>Shared Core:</strong> stabile View-Resolution ueber Desktop + Mobile.</li>
                <li>🏗️ <strong>Release Gates:</strong> verify/build/compat verhindern Contract Drift.</li>
              </ul>

              <pre>{`## Deployment Route
- staging catalog/schema validieren
- verify + all builds ausfuehren
- security guards pruefen
- erst dann production promotion`}</pre>
            </article>

            <article className="ecosystem-panel">
              <h3>📡 Coverage Snapshot</h3>
              <div className="stats-two-col">
                <div>
                  <div className="detail-head">
                    <strong>Apps</strong>
                    <span>{appCounts.length}</span>
                  </div>
                  <ul className="emoji-markdown-list">
                    {appCounts.map((item) => (
                      <li key={`eco-app-count-${item.id}`}>
                        {appEmoji[item.id]} <strong>{item.label}:</strong> {item.count} Artikel
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="detail-head">
                    <strong>Kategorien</strong>
                    <span>{categoryCounts.length}</span>
                  </div>
                  <ul className="emoji-markdown-list">
                    {categoryCounts.map((item) => (
                      <li key={`eco-cat-count-${item.id}`}>
                        {categoryEmoji[item.id]} <strong>{item.label}:</strong> {item.count}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section id="apps" className="section-viewport apps-viewport scroll-reveal">
          <div className="section-head">
            <h2>App Worlds: Main, Code und Mobile als feste Tabs</h2>
            <p>Jeder Tab ist ein großer, interaktiver Weltraum-Bereich mit eigenen Highlights und Guide-Sprüngen.</p>
          </div>

          <div className="app-tab-row">
            {SURFACE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={surfaceTab === tab.id ? 'app-tab active' : 'app-tab'}
                onClick={() => setSurfaceTab(tab.id)}
              >
                <span>{tab.emoji}</span>
                <strong>{tab.label}</strong>
                <small>{tab.subtitle}</small>
              </button>
            ))}
          </div>

          <article className="app-stage">
            <header>
              <h3>
                {surfaceDefinition.emoji} {surfaceDefinition.label}
              </h3>
              <p>{surfaceDefinition.subtitle}</p>
            </header>

            <div className="app-stage-grid">
              <section className="app-stage-card">
                <div className="detail-head">
                  <strong>Module Orbit</strong>
                  <span>{surfaceModules.length} Module</span>
                </div>
                <div className="module-list">
                  {surfaceModules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      className={previewModuleId === module.id ? 'module-pill active' : 'module-pill'}
                      onClick={() => {
                        setPreviewApp(surfaceDefinition.previewKey)
                        setPreviewModuleId(module.id)
                      }}
                    >
                      <span>{module.label}</span>
                      <small>{module.state}</small>
                    </button>
                  ))}
                </div>
                {selectedSurfaceModule ? <div className="module-note">{selectedSurfaceModule.detail}</div> : null}
              </section>

              <section className="app-stage-card">
                <div className="detail-head">
                  <strong>Feature Highlights</strong>
                  <span>markdown style</span>
                </div>
                <ul className="emoji-markdown-list">
                  {surfaceDefinition.highlights.map((item) => (
                    <li key={item}>✨ {item}</li>
                  ))}
                </ul>
              </section>

              <section className="app-stage-card">
                <div className="detail-head">
                  <strong>Guide Shortcuts</strong>
                  <span>{surfaceGuides.length}</span>
                </div>
                <ul className="emoji-markdown-list">
                  {surfaceGuides.slice(0, 8).map((entry) => (
                    <li key={`surf-guide-summary-${entry.id}`}>
                      🧩 <strong>{entry.title}:</strong> {entry.summary}
                    </li>
                  ))}
                </ul>
                <div className="command-row">
                  {surfaceGuides.slice(0, 12).map((entry) => (
                    <button key={`surf-guide-${entry.id}`} type="button" className="chip-btn" onClick={() => openGuide(entry.id)}>
                      {entry.title}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </article>
        </section>

        <section id="atlas" className="section-viewport atlas-viewport scroll-reveal">
          <div className="section-head">
            <h2>Wiki Atlas</h2>
            <p>Search-first Explorer mit großen Textflächen und klarer Lesbarkeit.</p>
          </div>

          <div className="atlas-open-grid">
            <aside className="atlas-filters">
              <label>
                Atlas Suche
                <input
                  type="search"
                  value={atlasQuery}
                  onChange={(event) => setAtlasQuery(event.target.value)}
                  placeholder="notes magic, canvas, paywall, settings ..."
                />
              </label>

              <div className="chip-wrap">
                <button type="button" className={category === 'all' ? 'chip-btn active' : 'chip-btn'} onClick={() => setCategory('all')}>
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
                <button type="button" className={appFilter === 'all' ? 'chip-btn active' : 'chip-btn'} onClick={() => setAppFilter('all')}>
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

            <section className="atlas-stream">
              <div className="subhead">Artikel Stream ({atlasEntries.length})</div>
              <div className="entry-list">
                {atlasEntries.length === 0 ? (
                  <div className="empty-state">Keine Treffer. Passe Suche oder Filter an.</div>
                ) : (
                  atlasEntries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={selectedAtlasEntry?.id === entry.id ? 'entry-row active' : 'entry-row'}
                      onClick={() => setSelectedAtlasId(entry.id)}
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
            </section>
          </div>

          <article className="atlas-detail-wide">
            {!selectedAtlasEntry ? (
              <div className="empty-state">Waehle links einen Artikel aus.</div>
            ) : (
              <div className="detail-stack">
                <div>
                  <div className="detail-meta">
                    {appEmoji[selectedAtlasEntry.app]} {selectedAtlasEntry.app} · {categoryEmoji[selectedAtlasEntry.category]} {selectedAtlasEntry.category}
                  </div>
                  <h3>{selectedAtlasEntry.title}</h3>
                  <p>{selectedAtlasEntry.summary}</p>
                </div>

                <div className="detail-columns">
                  <section>
                    <div className="detail-head">
                      <strong>Guide Flow</strong>
                      <span>{selectedAtlasEntry.guide.length}</span>
                    </div>
                    <ol>
                      {selectedAtlasEntry.guide.map((step, index) => (
                        <li key={step.title}>
                          <b>{index + 1}. {step.title}:</b> {step.detail}
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section>
                    <div className="detail-head">
                      <strong>Feature Punkte</strong>
                      <span>{selectedAtlasEntry.points.length}</span>
                    </div>
                    <ul>
                      {selectedAtlasEntry.points.map((point) => (
                        <li key={point}>✨ {point}</li>
                      ))}
                    </ul>

                    {selectedAtlasEntry.commands.length ? (
                      <div>
                        <div className="detail-head">
                          <strong>Commands</strong>
                          <span>{selectedAtlasEntry.commands.length}</span>
                        </div>
                        <div className="command-row">
                          {selectedAtlasEntry.commands.map((command) => (
                            <button
                              key={`atlas-cmd-${command}`}
                              type="button"
                              className="chip-btn"
                              onClick={() => copyText(command, `atlas-cmd:${selectedAtlasEntry.id}:${command}`)}
                            >
                              {command}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="detail-head">
                        <strong>Tags</strong>
                        <span>{selectedAtlasEntry.tags.length}</span>
                      </div>
                      <div className="tag-row">
                        {selectedAtlasEntry.tags.map((tag) => (
                          <span key={`atlas-tag-${tag}`}>#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>

                <pre>{`## ${selectedAtlasEntry.title}
- app: ${selectedAtlasEntry.app}
- category: ${selectedAtlasEntry.category}
- points: ${selectedAtlasEntry.points.length}
- commands: ${selectedAtlasEntry.commands.length}`}</pre>
              </div>
            )}
          </article>
        </section>

        <section id="guides" className="section-viewport guides-viewport scroll-reveal">
          <div className="section-head">
            <h2>Guide Worlds: klar, groß, direkt lesbar</h2>
            <p>
              Jede View hat eine eigene Guide-Szene mit echten Nutzungsinfos: Schritte, Features, Commands,
              Markdown-Snippets und Quellen. Keine leeren Flächen, sondern dichte Doku.
            </p>
          </div>

          <div className="guide-toolbar-wide">
            <label>
              Guide Suche
              <input
                type="search"
                value={guideQuery}
                onChange={(event) => setGuideQuery(event.target.value)}
                placeholder="notesview, canvas magic menu, settings, terminal ..."
              />
            </label>
            <div className="toolbar-kpi">
              <span>
                <BookOpen size={15} /> {guideEntries.length} Guide Worlds
              </span>
              <span>
                <Grid3X3 size={15} /> {groupedGuides.length} App-Sektionen
              </span>
            </div>
          </div>

          <div className="guide-index-open">
            {groupedGuides.map((group) => (
              <div key={group.app.id} className="guide-index-row">
                <strong>
                  {appEmoji[group.app.id]} {group.app.label}
                </strong>
                <div className="guide-index-links">
                  {group.guides.slice(0, 14).map((entry) => (
                    <button key={entry.id} type="button" onClick={() => openGuide(entry.id)}>
                      {entry.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {guideEntries.map((entry) => (
            <article
              key={entry.id}
              id={`guide-${entry.id}`}
              className={`guide-scene app-${entry.app} cat-${entry.category} scroll-reveal`}
              style={{ ['--scene-hue' as any]: hashHue(entry.id) }}
            >
              <header className="guide-scene-head">
                <div>
                  <span className="guide-pill">
                    {appEmoji[entry.app]} {entry.app} · {categoryEmoji[entry.category]} {entry.category}
                  </span>
                  <h3>{entry.title}</h3>
                </div>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => copyText(`https://youngjibbit95.github.io/Nexus-Ecosystem/#guide-${entry.id}`, `anchor:${entry.id}`)}
                >
                  <Copy size={14} /> Link
                </button>
              </header>

              <p className="guide-summary">{entry.summary}</p>

              <pre>{`### ${entry.title}
- app: ${entry.app}
- category: ${entry.category}
- steps: ${entry.guide.length}
- features: ${entry.points.length}`}</pre>

              <div className="guide-columns">
                <section>
                  <div className="detail-head">
                    <strong>Schritt-fuer-Schritt</strong>
                    <span>{entry.guide.length}</span>
                  </div>
                  <ol>
                    {entry.guide.map((step, index) => (
                      <li key={step.title}>
                        <b>🚀 {index + 1}. {step.title}:</b> {step.detail}
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <div className="detail-head">
                    <strong>Feature Liste</strong>
                    <span>{entry.points.length}</span>
                  </div>
                  <ul>
                    {entry.points.map((point) => (
                      <li key={point}>✨ {point}</li>
                    ))}
                  </ul>
                </section>
              </div>

              {entry.commands.length ? (
                <section className="guide-strip">
                  <div className="detail-head">
                    <strong>Commands</strong>
                    <span>copyable</span>
                  </div>
                  <div className="command-row">
                    {entry.commands.map((command) => (
                      <button
                        key={command}
                        type="button"
                        className="chip-btn"
                        onClick={() => copyText(command, `cmd:${entry.id}:${command}`)}
                      >
                        {command}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {entry.markdownSnippets?.length ? (
                <section className="guide-strip">
                  <div className="detail-head">
                    <strong>Markdown Snippets</strong>
                    <span>{entry.markdownSnippets.length}</span>
                  </div>
                  <div className="snippet-grid">
                    {entry.markdownSnippets.map((snippet) => (
                      <article key={snippet.label} className="snippet-card">
                        <div className="snippet-head">
                          <strong>{snippet.label}</strong>
                          <button type="button" onClick={() => copyText(snippet.snippet, `snippet:${entry.id}:${snippet.label}`)}>
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

              <section className="guide-strip">
                <div className="detail-head">
                  <strong>Tags + Quellen</strong>
                  <span>{entry.sources.length}</span>
                </div>
                <div className="tag-row">
                  {entry.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <ul>
                  {entry.sources.map((source) => (
                    <li key={source}>
                      📎 <code>{source}</code>
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          ))}
        </section>

        <section id="matrix" className="section-viewport matrix-viewport scroll-reveal">
          <div className="section-head">
            <h2>View Matrix</h2>
            <p>Paritaet und Verfuegbarkeit transparent fuer Main, Mobile, Code, Code Mobile und Control.</p>
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

        <section id="integration" className="section-viewport integration-viewport scroll-reveal">
          <div className="section-head">
            <h2>Auth + Paywall Integration Stage</h2>
            <p>Website UX steuert nur Flows, API bleibt autoritativ fuer Entitlements und Billing-Entscheidungen.</p>
          </div>

          <div className="integration-grid">
            <article className="integration-card">
              <div className="detail-head">
                <strong>Account Flow</strong>
                <span>website ux</span>
              </div>
              <div className="mode-row">
                <button type="button" className={authMode === 'signup' ? 'chip-btn active' : 'chip-btn'} onClick={() => setAuthMode('signup')}>
                  Signup
                </button>
                <button type="button" className={authMode === 'login' ? 'chip-btn active' : 'chip-btn'} onClick={() => setAuthMode('login')}>
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

            <article className="integration-card">
              <div className="detail-head">
                <strong>Paywall Guard</strong>
                <span>entitlement</span>
              </div>

              <label>
                Feature Anfrage
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

            <article className="integration-card wide">
              <div className="detail-head">
                <strong>API Handover Prompt</strong>
                <button type="button" onClick={() => copyText(API_ENGINEER_PROMPT, 'api-prompt')}>
                  <Copy size={14} /> Prompt kopieren
                </button>
              </div>
              <ul className="emoji-markdown-list">
                <li>✅ Signup/Login ist Frontend-UX, finale Entscheidung API-seitig.</li>
                <li>✅ Checkout startet via API Session-Endpunkt, keine Client-Authority fuer Tier/Preis.</li>
                <li>✅ paywall/check gibt allow|deny|reason|upsellTier zurueck.</li>
              </ul>
              <pre>{API_ENGINEER_PROMPT}</pre>
            </article>
          </div>
        </section>

        <section id="coverage" className="section-viewport coverage-viewport scroll-reveal">
          <div className="section-head">
            <h2>Coverage</h2>
            <p>Wie breit das Wiki aktuell Kategorien, Apps und Quellpfade abdeckt.</p>
          </div>

          <div className="coverage-grid">
            <article className="coverage-card">
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

            <article className="coverage-card">
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

            <article className="coverage-card wide">
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
          <p>Nexus Ecosystem Wiki · Solar Travel Edition · {new Date().getFullYear()} 🌌</p>
          {copyState && copyState !== 'copy-error' ? <span className="small-state ok">Kopiert</span> : null}
          {copyState === 'copy-error' ? <span className="small-state warn">Kopieren fehlgeschlagen</span> : null}
        </footer>
      </main>
    </div>
  )
}

export default App
