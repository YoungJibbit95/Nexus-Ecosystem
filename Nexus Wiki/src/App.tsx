import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Grid3X3,
  Layers,
  LayoutDashboard,
  Search,
  Sparkles,
  Table2,
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
type TabId = 'wiki' | 'preview' | 'matrix' | 'coverage'
type VisualFxMode = 'full' | 'lite'

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

const TAB_ITEMS: Array<{ id: TabId; label: string; icon: any }> = [
  { id: 'wiki', label: 'Wiki Explorer', icon: BookOpen },
  { id: 'preview', label: 'App Preview', icon: Sparkles },
  { id: 'matrix', label: 'View Matrix', icon: Table2 },
  { id: 'coverage', label: 'Coverage', icon: LayoutDashboard },
]

const previewMap: Record<AppId, PreviewDefinition> = {
  ecosystem: {
    intro:
      'Monorepo Steuerung fuer Main, Mobile, Code, Code Mobile und gehostete Control Plane mit Shared Runtime Contracts.',
    modules: [
      { id: 'eco-1', label: 'Root Scripts', state: 'stable', detail: 'setup, build, verify und dev orchestration.' },
      { id: 'eco-2', label: 'Shared Core', state: 'stable', detail: 'liveSync, runtime mapping, contract glue.' },
      { id: 'eco-3', label: 'Release Gates', state: 'ops', detail: 'verify + build + promotion readiness.' },
    ],
  },
  main: {
    intro:
      'Desktop Productivity Surface mit Dashboard, Notes, Code, Tasks, Reminders, Canvas, Files, Flux, DevTools und Settings.',
    modules: [
      { id: 'main-1', label: 'Notes + Magic', state: 'stable', detail: 'Markdown workflow, widgets, split/preview.' },
      { id: 'main-2', label: 'Canvas 2.x', state: 'stable', detail: 'Node graph, templates, auto layout, AI project.' },
      { id: 'main-3', label: 'Terminal Bridge', state: 'beta', detail: 'command flow fuer views, canvas und macros.' },
    ],
  },
  mobile: {
    intro:
      'Mobile Parity Surface mit adaptiver Navigation, Safe-Area Verhalten und haptik-geeigneten Workflows.',
    modules: [
      { id: 'mob-1', label: 'Bottom Navigation', state: 'stable', detail: 'Primary tabs + more drawer fuer erweiterte views.' },
      { id: 'mob-2', label: 'Paritaet Views', state: 'stable', detail: 'Notes, Tasks, Reminders, Canvas, Files, Settings.' },
      { id: 'mob-3', label: 'Terminal Lite', state: 'beta', detail: 'schneller command launcher fuer mobile flows.' },
    ],
  },
  code: {
    intro:
      'Desktop IDE Surface mit Explorer, Search, Problems, Git, Debug, Extensions, Terminal und Command Palette.',
    modules: [
      { id: 'code-1', label: 'Panel Stack', state: 'stable', detail: 'explorer/search/problems/git/debug/extensions.' },
      { id: 'code-2', label: 'Editor Loop', state: 'stable', detail: 'tabs, autosave, diagnostics und command actions.' },
      { id: 'code-3', label: 'Workspace IO', state: 'ops', detail: 'folder open, read/write, rename, delete flows.' },
    ],
  },
  'code-mobile': {
    intro:
      'Native IDE Surface mit Capacitor Filesystem Bridge und mobilem Panel-Navigator.',
    modules: [
      { id: 'cm-1', label: 'nativeFS Bridge', state: 'stable', detail: 'mobile read/write/mkdir/rename/delete operationen.' },
      { id: 'cm-2', label: 'Mobile BottomNav', state: 'stable', detail: 'panel switching und settings slot.' },
      { id: 'cm-3', label: 'Adaptive Editor', state: 'beta', detail: 'minimap off + touch optimierte editor defaults.' },
    ],
  },
  control: {
    intro:
      'Control Plane UI fuer Live Sync Promotion, Paywalls und Security-relevante Betriebsfluesse.',
    modules: [
      { id: 'ctrl-1', label: 'Live Sync Tab', state: 'stable', detail: 'catalog/schema in staging + promotion.' },
      { id: 'ctrl-2', label: 'Paywalls Tab', state: 'stable', detail: 'tier views und user templates verwalten.' },
      { id: 'ctrl-3', label: 'Owner Security', state: 'ops', detail: 'signed mutations + owner-only controls.' },
    ],
  },
  runtime: {
    intro:
      'Shared Runtime/API Plane fuer feature orchestration, compatibility und sichere view activation.',
    modules: [
      { id: 'run-1', label: 'Catalog + Schema', state: 'stable', detail: 'feature/layout definitions pro app.' },
      { id: 'run-2', label: 'Compatibility', state: 'stable', detail: 'minClientVersion + compat matrix checks.' },
      { id: 'run-3', label: 'Fallback Cache', state: 'ops', detail: 'stabile runtime daten bei api ausfall.' },
    ],
  },
}

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
  const [activeTab, setActiveTab] = useState<TabId>('wiki')
  const [visualFxMode, setVisualFxMode] = useState<VisualFxMode>('full')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [app, setApp] = useState<AppFilter>('all')
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id ?? '')
  const [previewApp, setPreviewApp] = useState<AppId>('main')
  const [previewModuleId, setPreviewModuleId] = useState(previewMap.main.modules[0]?.id ?? '')
  const [copyState, setCopyState] = useState('')

  const deferredQuery = useDeferredValue(query)

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
  }, [])

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

  const messageTone = filtered.length ? 'success' : 'warning'
  const messageIcon = filtered.length ? <CheckCircle2 size={16} /> : <Activity size={16} />

  return (
    <div className={`nexus-site ${visualFxMode === 'lite' ? 'fx-lite' : 'fx-full'}`}>
      <div className="space-stars-layer layer-a" aria-hidden="true" />
      <div className="space-stars-layer layer-b" aria-hidden="true" />
      <div className="space-nebula-layer" aria-hidden="true" />
      {visualFxMode === 'full' ? <div className="space-meteor meteor-a" aria-hidden="true" /> : null}
      {visualFxMode === 'full' ? <div className="space-meteor meteor-b" aria-hidden="true" /> : null}
      <div className="site-gradient site-gradient-a" aria-hidden="true" />
      <div className="site-gradient site-gradient-b" aria-hidden="true" />
      <div className="site-grid-overlay" aria-hidden="true" />

      <div className="site-shell">
        <header className="site-hero">
          <div className="site-hero-topline">NEXUS PRODUCT WIKI</div>
          <h1>Nexus Ecosystem Wiki im Product-Page Design</h1>
          <p>
            Vollstaendige Dokumentation fuer Main, Mobile, Code, Code Mobile, Control und Runtime inklusive
            NotesView, Canvas Magic Builder, Markdown Referenzen, Settings Guides und Paywall View Guards.
          </p>

          <div className="site-chip-row">
            <span className="site-chip"><BookOpen size={14} /> Eintraege: {entries.length}</span>
            <span className="site-chip"><Layers size={14} /> Kategorien: {categories.length}</span>
            <span className="site-chip"><Grid3X3 size={14} /> Apps: {apps.length}</span>
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
          <span>{filtered.length} Treffer fuer aktuelle Suche/Filter.</span>
        </div>

        <section key={activeTab} className="site-panel site-panel-animate">
          {activeTab === 'wiki' ? (
            <div className="panel-grid wiki-dashboard-grid">
              <article className="panel-card">
                <div className="panel-title"><Search size={16} /> Suche und Filter</div>
                <label>
                  Volltextsuche
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="z. B. notes magic, canvas template ai, paywall, owner-only"
                  />
                </label>

                <div className="wiki-filter-group">
                  <span>Kategorien</span>
                  <div className="wiki-filter-chips">
                    <button className={category === 'all' ? 'feature-pill active' : 'feature-pill'} onClick={() => setCategory('all')}>Alle</button>
                    {categories.map((item) => (
                      <button
                        key={item.id}
                        className={category === item.id ? 'feature-pill active' : 'feature-pill'}
                        onClick={() => setCategory(item.id)}
                        title={item.description}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wiki-filter-group">
                  <span>Apps</span>
                  <div className="wiki-filter-chips">
                    <button className={app === 'all' ? 'feature-pill active' : 'feature-pill'} onClick={() => setApp('all')}>Alle Apps</button>
                    {apps.map((item) => (
                      <button
                        key={item.id}
                        className={app === item.id ? 'feature-pill active' : 'feature-pill'}
                        onClick={() => setApp(item.id)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-title"><BookOpen size={16} /> Wiki Artikel</div>
                <div className="wiki-entry-list">
                  {!filtered.length ? (
                    <div className="wiki-empty">Keine Treffer. Filter anpassen.</div>
                  ) : (
                    filtered.map((entry) => (
                      <button
                        key={entry.id}
                        className={selected?.id === entry.id ? 'wiki-entry active' : 'wiki-entry'}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <div className="wiki-entry-head">
                          <strong>{entry.title}</strong>
                          <span className="surface-badge">{entry.app}</span>
                        </div>
                        <p>{entry.summary}</p>
                      </button>
                    ))
                  )}
                </div>
              </article>

              <article className="panel-card panel-card-wide">
                {!selected ? (
                  <div className="wiki-empty">Waehle links einen Artikel aus.</div>
                ) : (
                  <div className="wiki-detail-stack">
                    <div>
                      <div className="panel-title"><Sparkles size={16} /> {selected.category} / {selected.app}</div>
                      <h2>{selected.title}</h2>
                      <p className="muted-copy">{selected.summary}</p>
                    </div>

                    <div className="wiki-detail-grid">
                      <div className="surface-item">
                        <div className="surface-item-head">
                          <strong>Guide</strong>
                          <span className="surface-badge">steps</span>
                        </div>
                        <ol className="wiki-ordered-list">
                          {selected.guide.map((step) => (
                            <li key={step.title}><strong>{step.title}:</strong> {step.detail}</li>
                          ))}
                        </ol>
                      </div>

                      <div className="surface-item">
                        <div className="surface-item-head">
                          <strong>Kernpunkte</strong>
                          <span className="surface-badge">facts</span>
                        </div>
                        <ul className="wiki-bullet-list">
                          {selected.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {selected.commands.length > 0 ? (
                      <div className="surface-item">
                        <div className="surface-item-head">
                          <strong>Commands / Aktionen</strong>
                          <span className="surface-badge">copy</span>
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
                      </div>
                    ) : null}

                    {selected.markdownSnippets && selected.markdownSnippets.length > 0 ? (
                      <div className="surface-grid">
                        {selected.markdownSnippets.map((snippet) => (
                          <div className="surface-item" key={snippet.label}>
                            <div className="surface-item-head">
                              <strong>{snippet.label}</strong>
                              <button onClick={() => copyText(snippet.snippet, `snippet:${selected.id}:${snippet.label}`)}>copy</button>
                            </div>
                            <p>{snippet.description}</p>
                            <pre className="wiki-pre">{snippet.snippet}</pre>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="surface-item">
                      <div className="surface-item-head">
                        <strong>Quellen im Repo</strong>
                        <span className="surface-badge">paths</span>
                      </div>
                      <ul className="wiki-bullet-list">
                        {selected.sources.map((source) => (
                          <li key={source}><code>{source}</code></li>
                        ))}
                      </ul>
                    </div>

                    {copyState && copyState !== 'copy-error' ? <div className="small-state ok">Kopiert.</div> : null}
                    {copyState === 'copy-error' ? <div className="small-state warn">Kopieren fehlgeschlagen.</div> : null}
                  </div>
                )}
              </article>
            </div>
          ) : null}

          {activeTab === 'preview' ? (
            <div className="panel-grid ecosystem-grid">
              <article className="panel-card">
                <div className="panel-title"><Layers size={16} /> App Nodes</div>
                <div className="ecosystem-nodes">
                  {apps.map((item) => (
                    <button
                      key={item.id}
                      className={previewApp === item.id ? 'ecosystem-node active' : 'ecosystem-node'}
                      onClick={() => setPreviewApp(item.id)}
                    >
                      <span>{item.label}</span>
                      <small>{item.subtitle}</small>
                    </button>
                  ))}
                </div>
              </article>

              <article className="panel-card">
                <div className="panel-title"><Sparkles size={16} /> Module Orbit</div>
                <p className="muted-copy">{previewMap[previewApp].intro}</p>
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
              </article>

              <article className="panel-card panel-card-wide">
                {!selectedPreviewModule ? null : (
                  <div className="surface-grid">
                    <div className="surface-item">
                      <div className="surface-item-head">
                        <strong>{selectedPreviewModule.label}</strong>
                        <span className="surface-badge">{selectedPreviewModule.state}</span>
                      </div>
                      <p>{selectedPreviewModule.detail}</p>
                    </div>
                    <div className="surface-item">
                      <div className="surface-item-head">
                        <strong>App Scope</strong>
                        <span className="surface-badge">{previewApp}</span>
                      </div>
                      <p>
                        Browser Preview fuer die wichtigsten Module dieser Surface. Tiefergehende Details sind im
                        Wiki Explorer ueber Suchfilter und Kategorien verfuegbar.
                      </p>
                    </div>
                  </div>
                )}
              </article>
            </div>
          ) : null}

          {activeTab === 'matrix' ? (
            <div className="panel-grid">
              <article className="panel-card panel-card-wide">
                <div className="panel-title"><Table2 size={16} /> View Matrix</div>
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
                      <span>{item.label}</span>
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
                      <span>{item.label}</span>
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
                      <p>Wird in {item.count} Wiki-Artikeln als Referenz genutzt.</p>
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
