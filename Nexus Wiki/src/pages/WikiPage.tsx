import { useDeferredValue, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BookOpen,
  Check,
  ChevronRight,
  Code,
  Compass,
  Copy,
  Cpu,
  Database,
  Grid3X3,
  Key,
  Layers,
  LayoutDashboard,
  Menu,
  Monitor,
  Rocket,
  Search,
  Settings2,
  Shield,
  Smartphone,
  Sparkles,
  Terminal,
  Workflow,
  X,
} from "lucide-react";
import { SpaceBackground } from "../components/SpaceBackground";
import { SpotlightCard } from "../components/ui/SpotlightCard";
import {
  apps,
  categories,
  entries,
  viewMatrix,
  type AppId,
  type CategoryId,
  type WikiEntry,
} from "../data/wikiData";

type SectionId =
  | "getting-started"
  | "architecture"
  | "nexus-main"
  | "nexus-mobile"
  | "nexus-code"
  | "nexus-control"
  | "markdown-lab"
  | "settings-workflows"
  | "security-paywalls"
  | "api-reference"
  | "coverage";

type AppFilter = "all" | AppId;
type CategoryFilter = "all" | CategoryId;

const appEmoji: Record<AppId, string> = {
  ecosystem: "🛰️",
  main: "🧠",
  mobile: "📱",
  code: "💻",
  "code-mobile": "📟",
  control: "🛡️",
  runtime: "⚙️",
};

const categoryEmoji: Record<CategoryId, string> = {
  overview: "🗺️",
  view: "🧩",
  markdown: "📝",
  settings: "⚙️",
  workflow: "⚡",
  runtime: "🔄",
  security: "🔐",
  ops: "🏗️",
};

const sectionMeta: Record<SectionId, { title: string; subtitle: string; bullets: string[] }> = {
  "getting-started": {
    title: "Getting Started 🚀",
    subtitle:
      "Setup, Start, Build und Release-Einstieg fuer das gesamte Nexus Ecosystem. Hier findest du die Basis-Route fuer neue Entwickler und Operator.",
    bullets: [
      "📦 Setup-Skripte, Build-Kommandos und Verify-Gates direkt nutzbar.",
      "🧭 Monorepo Scope, App-Rollen und Deploy-Pfade klar getrennt.",
      "✅ Alles in einer Read-First Reihenfolge fuer schnellen Onboarding-Flow.",
    ],
  },
  architecture: {
    title: "Architektur & Sync 🏗️",
    subtitle:
      "Runtime Plane, Control Plane, Live Sync v2, Compatibility und Promotion-Flows in einer zusammenhaengenden Sicht.",
    bullets: [
      "🌌 API-first Struktur mit Shared Core als Bruecke zwischen allen Apps.",
      "🔄 Live Sync v2 steuert Features + Layouts ueber Catalog/Schema.",
      "🧱 Version Gates verhindern Drift zwischen Clients und Runtime.",
    ],
  },
  "nexus-main": {
    title: "Nexus Main Guide Atlas 🧠",
    subtitle:
      "Alle Main-Views inklusive NotesView, Canvas, Dashboard, Tasks, Reminders, Files, Flux, DevTools, Info und Security-Guards.",
    bullets: [
      "📝 Ausfuehrliche NotesView + Markdown + Magic Menue Dokumentation.",
      "🧩 Canvas 2.x inklusive Magic Builder und AI-Project-Flow.",
      "⚡ Settings, Workflows, Terminal-Kommandos und View Guards komplett abgedeckt.",
    ],
  },
  "nexus-mobile": {
    title: "Nexus Mobile Guide Atlas 📱",
    subtitle:
      "Mobile-Parity-Ansicht mit Bottom Nav, Safe Area, View Mapping, Commands und Security-/Paywall-Verhalten.",
    bullets: [
      "📲 Fokus auf mobile UX, Parity und Offline/Runtime-Flow.",
      "🧭 Erklaert, wie Main-Features auf Mobile sauber gespiegelt werden.",
      "🔐 Enthalten: mobile View Guards fuer Premium-Funktionen.",
    ],
  },
  "nexus-code": {
    title: "Nexus Code + Code Mobile 💻",
    subtitle:
      "Desktop IDE und mobile IDE in einem Bereich: Explorer, Search, Git, Debug, Extensions, Editor, Settings und nativeFS Flows.",
    bullets: [
      "🛠️ Panel-Stacks, Editor-Loops und Diagnostics verstaendlich aufbereitet.",
      "📟 Code Mobile mit nativer Dateibruecke und Touch-Adaptions.",
      "⚙️ Settings + Workflows fuer schnelle Delivery in beiden Surfaces.",
    ],
  },
  "nexus-control": {
    title: "Nexus Control Operations 🛡️",
    subtitle:
      "Control UI Bereiche fuer Live Sync, Paywalls, Policies, Devices, Commands, Audit, Guides und Deployment-Migration.",
    bullets: [
      "🧭 Betreiberfluss von Staging bis Promotion klar strukturiert.",
      "🔐 Security-Operability mit Owner-Only, Signaturen, Device Governance.",
      "📡 Guides + Audit als laufender Betriebs- und Incident-Kompass.",
    ],
  },
  "markdown-lab": {
    title: "Markdown Lab (Notes + Canvas) 📝",
    subtitle:
      "Sammelpunkt fuer alle Markdown-Features, Snippets und Magic-Builder-Flows aus NotesView und Canvas.",
    bullets: [
      "✨ Enthalten: Widgets, Alerts, Progress, Grid, Timeline, Badge, Cards.",
      "🧪 Snippets sind direkt kopierbar und im Workflow einsetzbar.",
      "📚 Perfekt als Referenz fuer Content-/PM-/Knowledge-Flows.",
    ],
  },
  "settings-workflows": {
    title: "Settings + Workflows ⚙️",
    subtitle:
      "Theme, Layout, Motion, Editor, Terminal, Spotlight und produktive Arbeitsmuster ueber Main, Mobile, Code und Control.",
    bullets: [
      "🎛️ Settings-Optionen app-uebergreifend geordnet statt verteilt.",
      "⚡ Workflow-Abschnitte mit konkreten Command-Beispielen.",
      "🧠 Hilft, das Ecosystem als einheitliches System zu bedienen.",
    ],
  },
  "security-paywalls": {
    title: "Security + Paywalls 🔐",
    subtitle:
      "Owner-only, Signaturen, Device Verification, Entitlements, Paywall-Gates und sichere Betriebsregeln fuer Web + Apps.",
    bullets: [
      "💳 Paywall-UX und API-Verantwortung klar getrennt dokumentiert.",
      "🛡️ Security-Baseline und Policy-Guardrails sauber erklaert.",
      "📋 Enthalten: konkrete Betriebsschritte fuer Security-Operations.",
    ],
  },
  "api-reference": {
    title: "Runtime/API Reference ⚙️",
    subtitle:
      "Runtime Contracts, Live Sync, Compatibility, Environment-Konfiguration und API-nahe Integrationspunkte fuer Website/App/Control.",
    bullets: [
      "🔄 End-to-End Sicht auf Resolve/Compatibility/Promotion.",
      "🌐 Environment Variablen und Hosted API-Pfade integriert.",
      "🧾 Mit Matrix- und Command-Kontext fuer reale Umsetzung.",
    ],
  },
  coverage: {
    title: "Coverage & Matrix 📈",
    subtitle:
      "Volle Transparenz ueber Dokumentationsbreite: Apps, Kategorien, Matrix, Quellen und komplette Entry-Liste.",
    bullets: [
      "📊 Zeigt, welche Bereiche wie dicht dokumentiert sind.",
      "🗂️ View Matrix fuer Main/Mobile/Code/Code Mobile/Control.",
      "📎 Top-Quellen als schneller Einstieg in den echten Code.",
    ],
  },
};

function makeSearchBlob(entry: WikiEntry) {
  const parts = [
    entry.title,
    entry.summary,
    entry.app,
    entry.category,
    ...entry.points,
    ...entry.tags,
    ...entry.commands,
    ...entry.sources,
    ...entry.guide.map((step) => `${step.title} ${step.detail}`),
    ...(entry.markdownSnippets ?? []).flatMap((snippet) => [snippet.label, snippet.description, snippet.snippet]),
  ];
  return parts.join(" ").toLowerCase();
}

function byApp(ids: AppId[]) {
  return entries.filter((entry) => ids.includes(entry.app));
}

function byCategory(ids: CategoryId[]) {
  return entries.filter((entry) => ids.includes(entry.category));
}

const sectionBaseEntries: Record<SectionId, WikiEntry[]> = {
  "getting-started": entries.filter(
    (entry) => entry.app === "ecosystem" || entry.category === "overview" || entry.category === "ops",
  ),
  architecture: entries.filter(
    (entry) =>
      entry.app === "runtime" ||
      entry.category === "runtime" ||
      (entry.app === "ecosystem" && entry.category !== "view"),
  ),
  "nexus-main": byApp(["main"]),
  "nexus-mobile": byApp(["mobile"]),
  "nexus-code": byApp(["code", "code-mobile"]),
  "nexus-control": byApp(["control"]),
  "markdown-lab": byCategory(["markdown"]),
  "settings-workflows": byCategory(["settings", "workflow"]),
  "security-paywalls": byCategory(["security"]),
  "api-reference": entries.filter(
    (entry) =>
      entry.app === "runtime" ||
      (entry.app === "ecosystem" && (entry.category === "runtime" || entry.category === "ops")) ||
      entry.id.includes("environment") ||
      entry.id.includes("paywall"),
  ),
  coverage: entries,
};

const navigation: Array<{
  title: string;
  items: Array<{ id: SectionId; label: string; icon: any }>;
}> = [
  {
    title: "Einstieg",
    items: [
      { id: "getting-started", label: "Getting Started", icon: Rocket },
      { id: "architecture", label: "Architektur & Sync", icon: Layers },
    ],
  },
  {
    title: "App Guides",
    items: [
      { id: "nexus-main", label: "Nexus Main", icon: Monitor },
      { id: "nexus-mobile", label: "Nexus Mobile", icon: Smartphone },
      { id: "nexus-code", label: "Nexus Code + Mobile", icon: Code },
      { id: "nexus-control", label: "Nexus Control", icon: Settings2 },
    ],
  },
  {
    title: "Wissenszonen",
    items: [
      { id: "markdown-lab", label: "Markdown Lab", icon: BookOpen },
      { id: "settings-workflows", label: "Settings + Workflows", icon: Workflow },
      { id: "security-paywalls", label: "Security + Paywalls", icon: Shield },
      { id: "api-reference", label: "Runtime/API", icon: Cpu },
      { id: "coverage", label: "Coverage", icon: Grid3X3 },
    ],
  },
];

export function WikiPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("getting-started");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [copyState, setCopyState] = useState("");

  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const filteredEntries = useMemo(() => {
    const base = sectionBaseEntries[activeSection] ?? [];
    return base.filter((entry) => {
      const appOk = appFilter === "all" || entry.app === appFilter;
      const categoryOk = categoryFilter === "all" || entry.category === categoryFilter;
      const queryOk = !deferredQuery || makeSearchBlob(entry).includes(deferredQuery);
      return appOk && categoryOk && queryOk;
    });
  }, [activeSection, appFilter, categoryFilter, deferredQuery]);

  const groupedEntries = useMemo(() => {
    const byId = new Map<AppId, WikiEntry[]>();
    filteredEntries.forEach((entry) => {
      const current = byId.get(entry.app) ?? [];
      current.push(entry);
      byId.set(entry.app, current);
    });
    return apps
      .map((app) => ({ app, entries: byId.get(app.id) ?? [] }))
      .filter((group) => group.entries.length > 0);
  }, [filteredEntries]);

  const topCommands = useMemo(() => {
    const unique = new Set<string>();
    filteredEntries.forEach((entry) => {
      entry.commands.forEach((command) => {
        if (unique.size < 20) unique.add(command);
      });
    });
    return Array.from(unique);
  }, [filteredEntries]);

  const coverageStats = useMemo(() => {
    const byCategoryCount = categories.map((item) => ({
      ...item,
      count: entries.filter((entry) => entry.category === item.id).length,
    }));
    const byAppCount = apps.map((item) => ({
      ...item,
      count: entries.filter((entry) => entry.app === item.id).length,
    }));
    const snippetCount = entries.reduce((sum, entry) => sum + (entry.markdownSnippets?.length ?? 0), 0);
    const sourceMap = new Map<string, number>();
    entries.forEach((entry) => {
      entry.sources.forEach((source) => {
        sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1);
      });
    });
    const topSources = Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      byCategoryCount,
      byAppCount,
      snippetCount,
      topSources,
    };
  }, []);

  const sectionCounts = useMemo(() => {
    return Object.fromEntries(
      Object.entries(sectionBaseEntries).map(([id, items]) => [id, items.length]),
    ) as Record<SectionId, number>;
  }, []);

  const copyText = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(token);
      window.setTimeout(() => setCopyState(""), 1400);
    } catch {
      setCopyState("copy-error");
      window.setTimeout(() => setCopyState(""), 1400);
    }
  };

  const meta = sectionMeta[activeSection];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-hidden">
      <SpaceBackground />

      <button
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        className="md:hidden fixed top-4 right-4 z-50 p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-xl"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <aside
        className={`
        fixed md:static inset-y-0 left-0 z-40 w-80 bg-slate-900/80 backdrop-blur-2xl border-r border-white/10 flex flex-col transition-transform duration-300
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.6)]">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
              Nexus Wiki
            </h1>
            <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase">Ecosystem Guide Atlas</p>
          </div>
        </div>

        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Suche nach View, Command, Feature ..."
              className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="grid gap-2">
            <select
              value={appFilter}
              onChange={(event) => setAppFilter(event.target.value as AppFilter)}
              className="bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-300"
            >
              <option value="all">🌌 Alle Apps</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {appEmoji[app.id]} {app.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
              className="bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-300"
            >
              <option value="all">🗂️ Alle Kategorien</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryEmoji[category.id]} {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {navigation.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">{group.title}</h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm ${
                        isActive
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[inset_0_0_20px_rgba(99,102,241,0.1)] font-medium"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                        {sectionCounts[item.id]}
                      </span>
                      {isActive && <ChevronRight className="w-4 h-4 text-indigo-400/50" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar scroll-smooth">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
          <AnimatePresence mode="wait">
            <motion.section
              key={activeSection}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
              className="space-y-6"
            >
              <header className="space-y-4">
                <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
                  <Sparkles className="w-4 h-4" />
                  {meta.title}
                </p>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">{meta.title}</h1>
                <p className="text-slate-300 text-lg max-w-4xl leading-relaxed">{meta.subtitle}</p>

                <div className="grid gap-3 md:grid-cols-3">
                  {meta.bullets.map((bullet) => (
                    <SpotlightCard
                      key={bullet}
                      className="rounded-2xl border border-white/10 bg-slate-900/55 backdrop-blur-xl p-4"
                      spotlightColor="rgba(99,102,241,0.12)"
                    >
                      <p className="text-sm text-slate-300 leading-relaxed">{bullet}</p>
                    </SpotlightCard>
                  ))}
                </div>
              </header>

              <section className="p-4 md:p-5 rounded-2xl bg-slate-900/55 border border-white/10 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                    <Database className="w-3.5 h-3.5" /> {filteredEntries.length} Eintraege in dieser Ansicht
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                    <Terminal className="w-3.5 h-3.5" /> {topCommands.length} Command-Hinweise
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <BookOpen className="w-3.5 h-3.5" /> {entries.length} Gesamt-Wiki Eintraege
                  </span>
                </div>

                {topCommands.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topCommands.map((command) => (
                      <button
                        key={command}
                        onClick={() => copyText(command, `cmd:${command}`)}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 hover:border-indigo-400/50 text-slate-200"
                      >
                        💻 {command}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              {activeSection === "coverage" ? (
                <CoverageSection coverageStats={coverageStats} filteredEntries={filteredEntries} />
              ) : (
                <section className="space-y-5">
                  {groupedEntries.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-white/20 bg-black/30 text-slate-400">
                      Keine Treffer fuer die aktuelle Kombination aus Suche und Filtern.
                    </div>
                  ) : (
                    groupedEntries.map((group) => (
                      <div key={group.app.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl md:text-2xl font-bold text-white">
                            {appEmoji[group.app.id]} {group.app.label}
                          </h2>
                          <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-slate-400 bg-white/5">
                            {group.entries.length} Eintraege
                          </span>
                        </div>
                        <div className="grid gap-4">
                          {group.entries.map((entry) => (
                            <EntryCard key={entry.id} entry={entry} onCopy={copyText} />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </section>
              )}

              {(activeSection === "architecture" || activeSection === "api-reference" || activeSection === "coverage") && (
                <section className="p-4 md:p-6 rounded-2xl bg-slate-900/55 border border-white/10 backdrop-blur-xl space-y-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-400" /> View Matrix
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                    <table className="w-full text-left text-sm min-w-[760px]">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">View</th>
                          <th className="px-4 py-3 font-semibold">Main</th>
                          <th className="px-4 py-3 font-semibold">Mobile</th>
                          <th className="px-4 py-3 font-semibold">Code</th>
                          <th className="px-4 py-3 font-semibold">Code Mobile</th>
                          <th className="px-4 py-3 font-semibold">Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-200">
                        {viewMatrix.map((row) => (
                          <tr key={row.view}>
                            <td className="px-4 py-3 font-medium">{row.view}</td>
                            <td className="px-4 py-3">{row.main ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.mobile ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.code ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.codeMobile ? "✅" : "❌"}</td>
                            <td className="px-4 py-3">{row.control ? "✅" : "❌"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              <footer className="pt-2 pb-6 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  <LayoutDashboard className="w-4 h-4" /> Nexus Wiki Layout v2
                </span>
                {copyState && copyState !== "copy-error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                    <Check className="w-4 h-4" /> Kopiert
                  </span>
                ) : null}
                {copyState === "copy-error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300">
                    Kopieren fehlgeschlagen
                  </span>
                ) : null}
              </footer>
            </motion.section>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function EntryCard({ entry, onCopy }: { entry: WikiEntry; onCopy: (text: string, token: string) => void }) {
  return (
    <SpotlightCard
      className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl"
      spotlightColor="rgba(34,211,238,0.08)"
    >
      <article className="p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-[240px] flex-1">
            <h3 className="text-lg md:text-xl font-bold text-white leading-snug">
              {appEmoji[entry.app]} {entry.title}
            </h3>
            <p className="text-slate-300 leading-relaxed">{entry.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full text-[11px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-200">
              {appEmoji[entry.app]} {entry.app}
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
              {categoryEmoji[entry.category]} {entry.category}
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
              {entry.guide.length} Schritte
            </span>
          </div>
        </div>

        <pre className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-200 overflow-x-auto leading-relaxed">{`### ${entry.title}
- app: ${entry.app}
- category: ${entry.category}
- features: ${entry.points.length}
- commands: ${entry.commands.length}`}</pre>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-indigo-200 mb-2">🧭 Schritt-fuer-Schritt</h4>
            <ol className="space-y-2 text-sm text-slate-300 list-decimal pl-4">
              {entry.guide.map((step, index) => (
                <li key={`${entry.id}-${step.title}`}>
                  <strong className="text-white">{index + 1}. {step.title}:</strong> {step.detail}
                </li>
              ))}
            </ol>
          </section>

          <section className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-cyan-200 mb-2">✨ Feature Punkte</h4>
            <ul className="space-y-2 text-sm text-slate-300 list-disc pl-4">
              {entry.points.map((point) => (
                <li key={`${entry.id}-point-${point}`}>{point}</li>
              ))}
            </ul>
          </section>
        </div>

        {entry.commands.length ? (
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-emerald-200">💻 Commands</h4>
            <div className="flex flex-wrap gap-2">
              {entry.commands.map((command) => (
                <button
                  key={`${entry.id}-cmd-${command}`}
                  onClick={() => onCopy(command, `entry-cmd:${entry.id}:${command}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/45 border border-white/10 text-xs text-slate-200 hover:border-indigo-400/50"
                >
                  <Copy className="w-3.5 h-3.5" /> {command}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {entry.markdownSnippets?.length ? (
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-fuchsia-200">📝 Markdown Snippets</h4>
            <div className="grid gap-3">
              {entry.markdownSnippets.map((snippet) => (
                <div key={`${entry.id}-snippet-${snippet.label}`} className="p-3 rounded-xl border border-white/10 bg-black/35 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-white">{snippet.label}</strong>
                    <button
                      onClick={() => onCopy(snippet.snippet, `snippet:${entry.id}:${snippet.label}`)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-white/10 bg-white/5 hover:border-cyan-400/40"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">{snippet.description}</p>
                  <pre className="bg-black/45 border border-white/10 rounded-lg p-2.5 text-xs text-slate-200 overflow-x-auto leading-relaxed">
                    {snippet.snippet}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-slate-200 mb-2">🏷️ Tags</h4>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span key={`${entry.id}-tag-${tag}`} className="px-2 py-1 rounded-full text-[11px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-200">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-slate-200 mb-2">📎 Quellen</h4>
            <ul className="space-y-1 text-xs text-slate-300">
              {entry.sources.map((source) => (
                <li key={`${entry.id}-src-${source}`} className="font-mono break-all">
                  {source}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </article>
    </SpotlightCard>
  );
}

function CoverageSection({
  coverageStats,
  filteredEntries,
}: {
  coverageStats: {
    byCategoryCount: Array<{ id: CategoryId; label: string; description: string; count: number }>;
    byAppCount: Array<{ id: AppId; label: string; subtitle: string; count: number }>;
    snippetCount: number;
    topSources: Array<{ source: string; count: number }>;
  };
  filteredEntries: WikiEntry[];
}) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(99,102,241,0.12)">
          <p className="text-sm text-slate-400">📚 Gesamteintraege</p>
          <p className="mt-1 text-3xl font-black text-white">{entries.length}</p>
        </SpotlightCard>
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(34,211,238,0.12)">
          <p className="text-sm text-slate-400">🧪 Markdown Snippets</p>
          <p className="mt-1 text-3xl font-black text-white">{coverageStats.snippetCount}</p>
        </SpotlightCard>
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(52,211,153,0.12)">
          <p className="text-sm text-slate-400">🔎 Aktuelle Treffer</p>
          <p className="mt-1 text-3xl font-black text-white">{filteredEntries.length}</p>
        </SpotlightCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-lg font-bold text-white">🗂️ Kategorie Coverage</h3>
          <div className="space-y-2">
            {coverageStats.byCategoryCount.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm text-slate-200">
                  {categoryEmoji[item.id]} {item.label}
                </span>
                <strong className="text-sm text-indigo-300">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-lg font-bold text-white">🛰️ App Coverage</h3>
          <div className="space-y-2">
            {coverageStats.byAppCount.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm text-slate-200">
                  {appEmoji[item.id]} {item.label}
                </span>
                <strong className="text-sm text-cyan-300">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-lg font-bold text-white">📎 Top Quellen</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {coverageStats.topSources.map((item) => (
            <div key={item.source} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <p className="font-mono text-xs text-slate-300 break-all">{item.source}</p>
              <p className="text-xs text-slate-500 mt-1">{item.count} Referenzen</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-lg font-bold text-white">🧾 Vollstaendige Entry-Liste</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <p className="text-sm text-white leading-snug">{appEmoji[entry.app]} {entry.title}</p>
              <p className="text-xs text-slate-500 mt-1">
                {categoryEmoji[entry.category]} {entry.category} • {entry.guide.length} Steps • {entry.points.length} Features
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
