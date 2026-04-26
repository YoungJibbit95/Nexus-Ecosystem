import { BookOpen, Check, ChevronRight, Code, Compass, Copy, Cpu, Database, Grid3X3, Layers, LayoutDashboard, Menu, Monitor, Rocket, Search, Settings2, Shield, Smartphone, Sparkles, Terminal, Workflow, X } from "lucide-react";
import { apps, categories, entries, viewMatrix, type AppId, type CategoryId, type WikiEntry } from "../data/wikiData";
import { englishEntryTranslations } from "../data/wikiEntryTranslations";

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
type Language = "de" | "en";
type NavGroupId = "intro" | "guides" | "knowledge";

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

const appLabel: Record<AppId, Record<Language, string>> = {
  ecosystem: { de: "Ecosystem", en: "Ecosystem" },
  main: { de: "Nexus Main", en: "Nexus Main" },
  mobile: { de: "Nexus Mobile", en: "Nexus Mobile" },
  code: { de: "Nexus Code", en: "Nexus Code" },
  "code-mobile": { de: "Nexus Code Mobile", en: "Nexus Code Mobile" },
  control: { de: "Nexus Control", en: "Nexus Control" },
  runtime: { de: "Runtime Plane", en: "Runtime Plane" },
};

const categoryLabel: Record<CategoryId, Record<Language, string>> = {
  overview: { de: "Ueberblick", en: "Overview" },
  view: { de: "View Guides", en: "View Guides" },
  markdown: { de: "Markdown", en: "Markdown" },
  settings: { de: "Settings", en: "Settings" },
  workflow: { de: "Workflows", en: "Workflows" },
  runtime: { de: "Runtime/API", en: "Runtime/API" },
  security: { de: "Security", en: "Security" },
  ops: { de: "Ops/Deploy", en: "Ops/Deploy" },
};

const sectionLabel: Record<SectionId, Record<Language, string>> = {
  "getting-started": { de: "Getting Started", en: "Getting Started" },
  architecture: { de: "Architektur & Sync", en: "Architecture & Sync" },
  "nexus-main": { de: "Nexus Main", en: "Nexus Main" },
  "nexus-mobile": { de: "Nexus Mobile", en: "Nexus Mobile" },
  "nexus-code": { de: "Nexus Code + Mobile", en: "Nexus Code + Mobile" },
  "nexus-control": { de: "Nexus Control", en: "Nexus Control" },
  "markdown-lab": { de: "Markdown Lab", en: "Markdown Lab" },
  "settings-workflows": { de: "Settings + Workflows", en: "Settings + Workflows" },
  "security-paywalls": { de: "Security + Paywalls", en: "Security + Paywalls" },
  "api-reference": { de: "Runtime/API", en: "Runtime/API" },
  coverage: { de: "Coverage", en: "Coverage" },
};

const sectionMeta: Record<SectionId, Record<Language, { title: string; subtitle: string; bullets: string[] }>> = {
  "getting-started": {
    de: {
      title: "Getting Started 🚀",
      subtitle:
        "Setup, Start, Build und Release-Einstieg fuer das gesamte Nexus Ecosystem. Hier findest du die Basis-Route fuer neue Entwickler und Operator.",
      bullets: [
        "📦 Setup-Skripte, Build-Kommandos und Verify-Gates direkt nutzbar.",
        "🧭 Monorepo Scope, App-Rollen und Deploy-Pfade klar getrennt.",
        "✅ Alles in einer Read-First Reihenfolge fuer schnellen Onboarding-Flow.",
      ],
    },
    en: {
      title: "Getting Started 🚀",
      subtitle:
        "Setup, startup, build and release onboarding for the full Nexus ecosystem. This is the fastest route for new developers and operators.",
      bullets: [
        "📦 Setup scripts, build commands and verify gates ready to run.",
        "🧭 Monorepo scope, app roles and deploy paths explained clearly.",
        "✅ Read-first order for fast onboarding without guessing.",
      ],
    },
  },
  architecture: {
    de: {
      title: "Architektur & Sync 🏗️",
      subtitle:
        "Runtime Plane, Control Plane, Live Sync v2 sowie Render- und Motion-Engine in einer zusammenhaengenden Sicht.",
      bullets: [
        "🌌 API-first Struktur mit Shared Core als Bruecke zwischen allen Apps.",
        "🔄 Live Sync v2 steuert Features + Layouts ueber Catalog/Schema.",
        "🧱 Render Pipeline + Motion Degradation halten UX auch unter Last vorhersehbar.",
      ],
    },
    en: {
      title: "Architecture & Sync 🏗️",
      subtitle:
        "Runtime plane, control plane, Live Sync v2 plus the render and motion engine in one connected system view.",
      bullets: [
        "🌌 API-first architecture with Shared Core as the bridge across apps.",
        "🔄 Live Sync v2 controls features and layouts via catalog/schema.",
        "🧱 Render pipeline and motion degradation keep UX predictable under load.",
      ],
    },
  },
  "nexus-main": {
    de: {
      title: "Nexus Main Guide Atlas 🧠",
      subtitle:
        "Alle Main-Views inklusive NotesView, Canvas, Dashboard, Tasks, Reminders, Files, Flux, DevTools, Info und Security-Guards.",
      bullets: [
        "📝 Ausfuehrliche NotesView + Markdown + Magic Menue Dokumentation.",
        "🧩 Canvas 2.x inklusive Magic Builder und AI-Project-Flow.",
        "⚡ Settings, Workflows, Terminal-Kommandos und View Guards komplett abgedeckt.",
      ],
    },
    en: {
      title: "Nexus Main Guide Atlas 🧠",
      subtitle:
        "All Main views including NotesView, Canvas, Dashboard, Tasks, Reminders, Files, Flux, DevTools, Info and security guards.",
      bullets: [
        "📝 Detailed NotesView, Markdown and Magic Menu documentation.",
        "🧩 Canvas 2.x including Magic Builder and AI project flow.",
        "⚡ Settings, workflows, terminal commands and view guards fully covered.",
      ],
    },
  },
  "nexus-mobile": {
    de: {
      title: "Nexus Mobile Guide Atlas 📱",
      subtitle:
        "Mobile-Parity-Ansicht mit Bottom Nav, Safe Area, View Mapping, Commands und Security-/Paywall-Verhalten.",
      bullets: [
        "📲 Fokus auf mobile UX, Parity und Offline/Runtime-Flow.",
        "🧭 Erklaert, wie Main-Features auf Mobile sauber gespiegelt werden.",
        "🔐 Enthalten: mobile View Guards fuer Premium-Funktionen.",
      ],
    },
    en: {
      title: "Nexus Mobile Guide Atlas 📱",
      subtitle:
        "Mobile parity view with bottom navigation, safe-area behavior, view mapping, commands and security/paywall handling.",
      bullets: [
        "📲 Focus on mobile UX, parity and offline/runtime flow.",
        "🧭 Shows how Main features are mirrored cleanly on mobile.",
        "🔐 Includes mobile view guards for premium features.",
      ],
    },
  },
  "nexus-code": {
    de: {
      title: "Nexus Code + Code Mobile 💻",
      subtitle:
        "Desktop IDE und mobile IDE in einem Bereich: Explorer, Search, Git, Debug, Extensions, Editor, Settings und nativeFS Flows.",
      bullets: [
        "🛠️ Panel-Stacks, Editor-Loops und Diagnostics verstaendlich aufbereitet.",
        "📟 Code Mobile mit nativer Dateibruecke und Touch-Adaptions.",
        "⚙️ Settings + Workflows fuer schnelle Delivery in beiden Surfaces.",
      ],
    },
    en: {
      title: "Nexus Code + Code Mobile 💻",
      subtitle:
        "Desktop IDE and mobile IDE in one area: explorer, search, git, debug, extensions, editor, settings and nativeFS flows.",
      bullets: [
        "🛠️ Panel stacks, editor loops and diagnostics mapped clearly.",
        "📟 Code Mobile with native file bridge and touch adaptation.",
        "⚙️ Settings and workflows for fast delivery on both surfaces.",
      ],
    },
  },
  "nexus-control": {
    de: {
      title: "Nexus Control Operations 🛡️",
      subtitle:
        "Control UI Bereiche fuer Live Sync, Paywalls, Policies, Devices, Commands, Audit, Guides und Deployment-Migration.",
      bullets: [
        "🧭 Betreiberfluss von Staging bis Promotion klar strukturiert.",
        "🔐 Security-Operability mit Owner-Only, Signaturen, Device Governance.",
        "📡 Guides + Audit als laufender Betriebs- und Incident-Kompass.",
      ],
    },
    en: {
      title: "Nexus Control Operations 🛡️",
      subtitle:
        "Control UI zones for Live Sync, paywalls, policies, devices, commands, audit, guides and deployment migration.",
      bullets: [
        "🧭 Operator flow from staging to production promotion.",
        "🔐 Security operations with access governance and operational safeguards.",
        "📡 Guides and audit paths for daily ops and incident response.",
      ],
    },
  },
  "markdown-lab": {
    de: {
      title: "Markdown Lab v5 (Notes + Canvas) 📝",
      subtitle:
        "Sammelpunkt fuer Standard-Markdown, Notes Magic Widgets, Canvas Markdown Nodes und aktuelle Nexus-Blocksyntax.",
      bullets: [
        "✨ Enthalten: nexus-list, nexus-alert, nexus-progress, nexus-timeline, nexus-grid, nexus-card und nexus-kanban.",
        "🧪 Snippets sind direkt kopierbar und klar nach Notes/Canvas-Einsatz getrennt.",
        "📚 Perfekt als Referenz fuer Content-, PM-, Sprint-, Knowledge- und Review-Flows.",
      ],
    },
    en: {
      title: "Markdown Lab v5 (Notes + Canvas) 📝",
      subtitle:
        "Single reference point for standard Markdown, Notes Magic widgets, Canvas Markdown nodes and current Nexus block syntax.",
      bullets: [
        "✨ Includes nexus-list, nexus-alert, nexus-progress, nexus-timeline, nexus-grid, nexus-card and nexus-kanban.",
        "🧪 Snippets are copy-ready and clearly split by Notes/Canvas usage.",
        "📚 Strong reference for content, PM, sprint, knowledge and review workflows.",
      ],
    },
  },
  "settings-workflows": {
    de: {
      title: "Settings + Workflows ⚙️",
      subtitle:
        "Theme, Layout, Motion, Editor, Terminal, Spotlight und produktive Arbeitsmuster ueber Main, Mobile, Code und Control.",
      bullets: [
        "🎛️ Settings-Optionen app-uebergreifend geordnet statt verteilt.",
        "⚡ Workflow-Abschnitte mit konkreten Command-Beispielen.",
        "🧠 Today/Continue Patterns, Quick Capture und Handoff-Flows sind als ein Arbeitsmodus dokumentiert.",
      ],
    },
    en: {
      title: "Settings + Workflows ⚙️",
      subtitle:
        "Theme, layout, motion, editor, terminal, spotlight and productive work patterns across Main, Mobile, Code and Control.",
      bullets: [
        "🎛️ Settings options organized cross-app in one place.",
        "⚡ Workflow sections with concrete command examples.",
        "🧠 Helps operating the ecosystem as one coherent system.",
      ],
    },
  },
  "security-paywalls": {
    de: {
      title: "Security + Paywalls 🔐",
      subtitle:
        "Owner-only, Signaturen, Device Verification, Entitlements, Paywall-Gates und sichere Betriebsregeln fuer Web + Apps.",
      bullets: [
        "💳 Paywall-UX und API-Verantwortung klar getrennt dokumentiert.",
        "🛡️ Security-Baseline und Policy-Guardrails sauber erklaert.",
        "📋 Enthalten: konkrete Betriebsschritte fuer Security-Operations.",
      ],
    },
    en: {
      title: "Security + Paywalls 🔐",
      subtitle:
        "Account access, subscription gates and secure operating rules for web and apps.",
      bullets: [
        "💳 Clear separation between paywall UX and protected backend enforcement.",
        "🛡️ Security baseline and policy guardrails documented clearly.",
        "📋 Includes operational steps for security workflows.",
      ],
    },
  },
  "api-reference": {
    de: {
      title: "Runtime/API Reference ⚙️",
      subtitle:
        "Runtime Contracts, Render Diagnostics, Live Sync, Compatibility und API-nahe Integrationspunkte fuer Website/App/Control.",
      bullets: [
        "🔄 End-to-End Sicht auf Resolve/Compatibility/Promotion.",
        "🎯 Render Tiers, Surface-/Effect-Klassen und Motion-Capabilities als Referenz integriert.",
        "🧾 Mit Matrix-, Diagnostics- und Command-Kontext fuer reale Umsetzung.",
      ],
    },
    en: {
      title: "Runtime/API Reference ⚙️",
      subtitle:
        "Runtime contracts, render diagnostics, Live Sync, compatibility and API-near integration points for website/app/control.",
      bullets: [
        "🔄 End-to-end view of resolve, compatibility and promotion.",
        "🎯 Render tiers, surface/effect classes and motion capabilities included as references.",
        "🧾 Matrix, diagnostics and command context for real implementation.",
      ],
    },
  },
  coverage: {
    de: {
      title: "Coverage & Matrix 📈",
      subtitle:
        "Volle Transparenz ueber Dokumentationsbreite: Apps, Kategorien, Matrix, Quellen und komplette Entry-Liste.",
      bullets: [
        "📊 Zeigt, welche Bereiche wie dicht dokumentiert sind.",
        "🗂️ View Matrix fuer Main/Mobile/Code/Code Mobile/Control.",
        "📎 Top-Quellen als schneller Einstieg in den echten Code.",
      ],
    },
    en: {
      title: "Coverage & Matrix 📈",
      subtitle:
        "Full visibility into documentation depth: apps, categories, matrix, source references and complete entry list.",
      bullets: [
        "📊 Shows which areas are documented most deeply.",
        "🗂️ View matrix for Main/Mobile/Code/Code Mobile/Control.",
        "📎 Top sources for a fast jump into real code files.",
      ],
    },
  },
};

const uiCopy: Record<
  Language,
  {
    productLabel: string;
    navTitle: string;
    sidebarTag: string;
    sidebarFilters: string;
    filterApp: string;
    filterCategory: string;
    appFilterAll: string;
    categoryFilterAll: string;
    navGroup: Record<NavGroupId, string>;
    searchPlaceholder: string;
    searchScopeGlobal: string;
    searchScopeSection: string;
    searchActiveHint: string;
    searchMinChars: string;
    clearSearch: string;
    sectionEntries: string;
    searchEntries: string;
    commandHints: string;
    totalEntries: string;
    searchResultsTitle: string;
    searchResultsSubtitle: string;
    jumpToGuide: string;
    moreResults: string;
    noResults: string;
    viewMatrix: string;
    tableView: string;
    tableMain: string;
    tableMobile: string;
    tableCode: string;
    tableCodeMobile: string;
    tableControl: string;
    footerLayout: string;
    copied: string;
    copyError: string;
    entryCount: string;
  }
> = {
  de: {
    productLabel: "Nexus Product Wiki",
    navTitle: "Nexus Wiki",
    sidebarTag: "Ecosystem Guide Atlas",
    sidebarFilters: "Filter",
    filterApp: "App",
    filterCategory: "Kategorie",
    appFilterAll: "🌌 Alle Apps",
    categoryFilterAll: "🗂️ Alle Kategorien",
    navGroup: {
      intro: "Einstieg",
      guides: "App Guides",
      knowledge: "Wissenszonen",
    },
    searchPlaceholder: "Suche nach View, Feature, Command, Markdown, nexus-kanban, Diagnostics ...",
    searchScopeGlobal: "Globale Suche aktiv (alle Bereiche)",
    searchScopeSection: "Suche auf aktive Sektion begrenzt",
    searchActiveHint: "Treffer springen direkt in den passenden Guide.",
    searchMinChars: "Tippe mindestens 1 Zeichen fuer globale Suche.",
    clearSearch: "Suche leeren",
    sectionEntries: "Eintraege in dieser Ansicht",
    searchEntries: "globale Treffer",
    commandHints: "Command-Hinweise",
    totalEntries: "Gesamt-Wiki Eintraege",
    searchResultsTitle: "Schnellnavigation fuer Suchtreffer",
    searchResultsSubtitle: "Klicke auf einen Treffer, um direkt in den passenden Guide-Bereich zu springen.",
    jumpToGuide: "Zum Guide springen",
    moreResults: "weitere Treffer vorhanden",
    noResults: "Keine Treffer fuer die aktuelle Kombination aus Suche und Filtern.",
    viewMatrix: "View Matrix",
    tableView: "View",
    tableMain: "Main",
    tableMobile: "Mobile",
    tableCode: "Code",
    tableCodeMobile: "Code Mobile",
    tableControl: "Control",
    footerLayout: "Nexus Wiki Layout v5",
    copied: "Kopiert",
    copyError: "Kopieren fehlgeschlagen",
    entryCount: "Eintraege",
  },
  en: {
    productLabel: "Nexus Product Wiki",
    navTitle: "Nexus Wiki",
    sidebarTag: "Ecosystem Guide Atlas",
    sidebarFilters: "Filters",
    filterApp: "App",
    filterCategory: "Category",
    appFilterAll: "🌌 All apps",
    categoryFilterAll: "🗂️ All categories",
    navGroup: {
      intro: "Onboarding",
      guides: "App Guides",
      knowledge: "Knowledge Zones",
    },
    searchPlaceholder: "Search views, features, commands, markdown, nexus-kanban, diagnostics ...",
    searchScopeGlobal: "Global search active (all sections)",
    searchScopeSection: "Search is scoped to active section",
    searchActiveHint: "Click any result to jump into the matching guide.",
    searchMinChars: "Type at least 1 character for global search.",
    clearSearch: "Clear search",
    sectionEntries: "entries in this view",
    searchEntries: "global matches",
    commandHints: "command hints",
    totalEntries: "total wiki entries",
    searchResultsTitle: "Fast navigation for search matches",
    searchResultsSubtitle: "Click a result to jump straight into the matching guide section.",
    jumpToGuide: "Open guide",
    moreResults: "more results available",
    noResults: "No matches for the current search and filter combination.",
    viewMatrix: "View Matrix",
    tableView: "View",
    tableMain: "Main",
    tableMobile: "Mobile",
    tableCode: "Code",
    tableCodeMobile: "Code Mobile",
    tableControl: "Control",
    footerLayout: "Nexus Wiki Layout v5",
    copied: "Copied",
    copyError: "Copy failed",
    entryCount: "entries",
  },
};

const entryCopy: Record<
  Language,
  {
    steps: string;
    features: string;
    commands: string;
    snippets: string;
    tags: string;
    sources: string;
    copy: string;
    appLabel: string;
    categoryLabel: string;
    featuresLabel: string;
    commandsLabel: string;
    stepsUnit: string;
    featuresUnit: string;
  }
> = {
  de: {
    steps: "🧭 Schritt-fuer-Schritt",
    features: "✨ Feature Punkte",
    commands: "💻 Commands",
    snippets: "📝 Markdown Snippets",
    tags: "🏷️ Tags",
    sources: "📎 Quellen",
    copy: "Kopieren",
    appLabel: "App",
    categoryLabel: "Kategorie",
    featuresLabel: "Features",
    commandsLabel: "Commands",
    stepsUnit: "Schritte",
    featuresUnit: "Features",
  },
  en: {
    steps: "🧭 Step by step",
    features: "✨ Feature points",
    commands: "💻 Commands",
    snippets: "📝 Markdown snippets",
    tags: "🏷️ Tags",
    sources: "📎 Sources",
    copy: "Copy",
    appLabel: "App",
    categoryLabel: "Category",
    featuresLabel: "Features",
    commandsLabel: "Commands",
    stepsUnit: "steps",
    featuresUnit: "features",
  },
};

const coverageCopy: Record<
  Language,
  {
    totalEntries: string;
    snippets: string;
    activeMatches: string;
    categoryCoverage: string;
    appCoverage: string;
    topSources: string;
    fullList: string;
    references: string;
    stepsUnit: string;
    featuresUnit: string;
  }
> = {
  de: {
    totalEntries: "📚 Gesamteintraege",
    snippets: "🧪 Markdown Snippets",
    activeMatches: "🔎 Aktuelle Treffer",
    categoryCoverage: "🗂️ Kategorie Coverage",
    appCoverage: "🛰️ App Coverage",
    topSources: "📎 Top Quellen",
    fullList: "🧾 Vollstaendige Entry-Liste",
    references: "Referenzen",
    stepsUnit: "Schritte",
    featuresUnit: "Features",
  },
  en: {
    totalEntries: "📚 Total entries",
    snippets: "🧪 Markdown snippets",
    activeMatches: "🔎 Active matches",
    categoryCoverage: "🗂️ Category coverage",
    appCoverage: "🛰️ App coverage",
    topSources: "📎 Top sources",
    fullList: "🧾 Full entry list",
    references: "references",
    stepsUnit: "steps",
    featuresUnit: "features",
  },
};

const navigationGroups: Array<{ id: NavGroupId; sections: SectionId[] }> = [
  {
    id: "intro",
    sections: ["getting-started", "architecture"],
  },
  {
    id: "guides",
    sections: ["nexus-main", "nexus-mobile", "nexus-code", "nexus-control"],
  },
  {
    id: "knowledge",
    sections: ["markdown-lab", "settings-workflows", "security-paywalls", "api-reference", "coverage"],
  },
];

const sectionIcon: Record<SectionId, any> = {
  "getting-started": Rocket,
  architecture: Layers,
  "nexus-main": Monitor,
  "nexus-mobile": Smartphone,
  "nexus-code": Code,
  "nexus-control": Settings2,
  "markdown-lab": BookOpen,
  "settings-workflows": Workflow,
  "security-paywalls": Shield,
  "api-reference": Cpu,
  coverage: Grid3X3,
};

const appSearchAliases: Record<AppId, string[]> = {
  ecosystem: ["ecosystem", "monorepo", "workspace", "gesamt"],
  main: ["main", "desktop", "nexus main", "productivity", "produktivity"],
  mobile: ["mobile", "ios", "android", "handy", "phone"],
  code: ["code", "ide", "editor", "desktop ide"],
  "code-mobile": ["code mobile", "mobile ide", "nativefs"],
  control: ["control", "panel", "admin", "paywall"],
  runtime: ["runtime", "api", "sync", "contracts", "render", "motion", "diagnostics", "pipeline"],
};

const categorySearchAliases: Record<CategoryId, string[]> = {
  overview: ["overview", "ueberblick", "intro"],
  view: ["view", "guide", "screen", "ansicht"],
  markdown: ["markdown", "notes", "notizen", "md"],
  settings: ["settings", "preferences", "einstellungen"],
  workflow: ["workflow", "prozess", "flow", "commands", "continue", "today", "handoff"],
  runtime: ["runtime", "api", "live sync", "compatibility", "render", "motion", "diagnostics"],
  security: ["security", "paywall", "entitlement", "sicherheit"],
  ops: ["ops", "deploy", "build", "release"],
};

const searchSynonymGroups = [
  ["notes", "note", "notizen", "notesview", "markdown", "md"],
  ["canvas", "magic", "magic builder", "mindmap", "roadmap", "sprint", "risk matrix", "decision flow", "ai project", "diagram", "graph", "knoten"],
  ["nexus-list", "nexus-alert", "nexus-progress", "nexus-timeline", "nexus-grid", "nexus-card", "nexus-kanban", "magic widgets", "markdown widgets"],
  ["keybind", "keybinds", "shortcut", "shortcuts", "hotkey", "hotkeys", "tastenkurzel", "taste"],
  ["settings", "preferences", "einstellungen", "config", "konfiguration"],
  ["security", "paywall", "entitlement", "auth", "sicherheit"],
  ["workflow", "flow", "prozess", "automation", "pipeline"],
  ["render", "renderer", "pipeline", "tier", "budget", "surface", "surface class", "effect", "effect class", "render token", "diagnostics"],
  ["motion", "animation", "degradation", "complexity", "motion capability", "animation complexity", "choreography", "interrupt"],
  ["native", "consistency", "parity", "predictable", "stability"],
  ["mobile", "phone", "ios", "android", "handy"],
  ["code", "editor", "ide", "debug", "git"],
  ["runtime", "api", "sync", "compatibility", "contract"],
  ["control", "panel", "admin", "ops"],
  ["guide", "docs", "wiki", "reference"],
  ["search", "suche", "spotlight", "quick", "finder"],
  ["cmd+k", "ctrl+k", "palette", "spotlight", "command"],
  ["task", "tasks", "aufgabe", "aufgaben", "kanban"],
  ["reminder", "reminders", "erinnerung", "erinnerungen", "snooze"],
  ["files", "dateien", "workspace", "explorer"],
  ["pricing", "payments", "tier", "abo", "subscription", "upgrade"],
  ["infoview", "info", "dokumentation", "documentation", "changelog"],
  ["today", "continue", "quickcapture", "capture", "handoff", "workspace"],
] as const;

const searchSynonymIndex = (() => {
  const map = new Map<string, string[]>();
  searchSynonymGroups.forEach((group) => {
    group.forEach((token) => {
      map.set(token, [...group]);
    });
  });
  return map;
})();

const MIN_SEARCH_QUERY_CHARS = 1;
const MAX_EDIT_DISTANCE = 2;
const MIN_FUZZY_TOKEN_CHARS = 4;

const germanToEnglishReplacements: Array<[RegExp, string]> = [
  [/\bGesamtueberblick\b/gi, "Overview"],
  [/\bVollguide\b/gi, "Full guide"],
  [/\bVollstaendige\b/gi, "Complete"],
  [/\bGuide\b/gi, "Guide"],
  [/\bund\b/gi, "and"],
  [/\bmit\b/gi, "with"],
  [/\bfuer\b/gi, "for"],
  [/\bueber\b/gi, "across"],
  [/\bzwischen\b/gi, "between"],
  [/\bohne\b/gi, "without"],
  [/\balle\b/gi, "all"],
  [/\bmehrere\b/gi, "multiple"],
  [/\bneue\b/gi, "new"],
  [/\bzentrale\b/gi, "central"],
  [/\bzentral\b/gi, "centrally"],
  [/\bkritische\b/gi, "critical"],
  [/\bsichere\b/gi, "secure"],
  [/\bsicher\b/gi, "secure"],
  [/\bSicherheit\b/gi, "security"],
  [/\bSicherheits\b/gi, "security"],
  [/\bBetrieb\b/gi, "operations"],
  [/\bBetriebs\b/gi, "operations"],
  [/\bProduktivitaet\b/gi, "productivity"],
  [/\bAenderungen\b/gi, "changes"],
  [/\bAenderung\b/gi, "change"],
  [/\bpruefen\b/gi, "check"],
  [/\bvalidieren\b/gi, "validate"],
  [/\bverwalten\b/gi, "manage"],
  [/\bverwaltet\b/gi, "managed"],
  [/\banlegen\b/gi, "create"],
  [/\boeffnen\b/gi, "open"],
  [/\bschliessen\b/gi, "close"],
  [/\bfreischalten\b/gi, "unlock"],
  [/\bgesperrt\b/gi, "blocked"],
  [/\bfreigeben\b/gi, "approve"],
  [/\bfreigegeben\b/gi, "approved"],
  [/\bRollen\b/gi, "roles"],
  [/\bRolle\b/gi, "role"],
  [/\bBerechtigungen\b/gi, "permissions"],
  [/\bBerechtigung\b/gi, "permission"],
  [/\bNutzer\b/gi, "users"],
  [/\bBenutzer\b/gi, "users"],
  [/\bKonto\b/gi, "account"],
  [/\bKonten\b/gi, "accounts"],
  [/\bEinstellungsbereich\b/gi, "settings area"],
  [/\bEinstellungen\b/gi, "settings"],
  [/\bAnsicht\b/gi, "view"],
  [/\bAnsichten\b/gi, "views"],
  [/\bNavigationen\b/gi, "navigation"],
  [/\bNavigation\b/gi, "navigation"],
  [/\bDatei\b/gi, "file"],
  [/\bDateien\b/gi, "files"],
  [/\bVerlauf\b/gi, "history"],
  [/\bLoeschen\b/gi, "delete"],
  [/\bZuruecksetzen\b/gi, "reset"],
  [/\bHinweise\b/gi, "hints"],
  [/\bHinweis\b/gi, "hint"],
  [/\bSchritt-fuer-Schritt\b/gi, "step-by-step"],
  [/\bSchritt\b/gi, "step"],
  [/\bSchritte\b/gi, "steps"],
  [/\bQuelle\b/gi, "source"],
  [/\bQuellen\b/gi, "sources"],
  [/\bKategorien\b/gi, "categories"],
  [/\bKategorie\b/gi, "category"],
  [/\bEintraege\b/gi, "entries"],
  [/\bEintrag\b/gi, "entry"],
  [/\bverfuegbar\b/gi, "available"],
  [/\bkonfigurieren\b/gi, "configure"],
  [/\bkonfiguriert\b/gi, "configured"],
  [/\bregelmaessig\b/gi, "regularly"],
  [/\btaegliche\b/gi, "daily"],
  [/\btaeglich\b/gi, "daily"],
  [/\buebernehmen\b/gi, "apply"],
  [/\bstatt\b/gi, "instead of"],
  [/\boeffnet\b/gi, "opens"],
  [/\bschliesst\b/gi, "closes"],
  [/\bschnell\b/gi, "fast"],
  [/\blangsam\b/gi, "slow"],
  [/\bkomplett\b/gi, "complete"],
  [/\bvollstaendig\b/gi, "complete"],
  [/\bkompakt\b/gi, "compact"],
  [/\berweitert\b/gi, "extended"],
  [/\berweiterte\b/gi, "extended"],
  [/\bfreigeschaltet\b/gi, "enabled"],
  [/\bgesperrte\b/gi, "blocked"],
  [/\bgesperrten\b/gi, "blocked"],
  [/\banschaulich\b/gi, "clear"],
  [/\berklaert\b/gi, "explained"],
  [/\berklaeren\b/gi, "explain"],
  [/\bverwenden\b/gi, "use"],
  [/\bnutzen\b/gi, "use"],
  [/\bnutzt\b/gi, "uses"],
  [/\bsetzen\b/gi, "set"],
  [/\bwaehlen\b/gi, "choose"],
  [/\bbeachten\b/gi, "consider"],
  [/\bpruefen\b/gi, "check"],
  [/\btesten\b/gi, "test"],
  [/\bleitfaden\b/gi, "guide"],
  [/\buebersicht\b/gi, "overview"],
  [/\buebersichtlich\b/gi, "clear"],
  [/\bbereich\b/gi, "area"],
  [/\bbereiche\b/gi, "areas"],
  [/\bmodus\b/gi, "mode"],
  [/\bmodi\b/gi, "modes"],
  [/\bverfuegt\b/gi, "provides"],
  [/\benthaelt\b/gi, "includes"],
  [/\benthalt\b/gi, "contains"],
  [/\bhinzufuegen\b/gi, "add"],
  [/\bentfernen\b/gi, "remove"],
  [/\bfiltert\b/gi, "filters"],
  [/\bsortierung\b/gi, "sorting"],
  [/\bansicht\b/gi, "view"],
  [/\bansichten\b/gi, "views"],
  [/\bwerkzeuge\b/gi, "tools"],
  [/\bwerkzeug\b/gi, "tool"],
  [/\baufgaben\b/gi, "tasks"],
  [/\baufgabe\b/gi, "task"],
  [/\berinnerungen\b/gi, "reminders"],
  [/\berinnerung\b/gi, "reminder"],
  [/\bdateisystem\b/gi, "filesystem"],
  [/\brolle\b/gi, "role"],
  [/\brollen\b/gi, "roles"],
  [/\bbetreiberfluss\b/gi, "operator flow"],
  [/\blive sync\b/gi, "Live Sync"],
];

const replaceTextList = (items: string[], translator: (value: string) => string) =>
  items.map((item) => translator(item));

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#+./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function translateGermanToEnglish(text: string) {
  let next = text;
  germanToEnglishReplacements.forEach(([pattern, replacement]) => {
    next = next.replace(pattern, replacement);
  });
  return next;
}

function translateSnippetContent(snippet: string) {
  return snippet
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("```")) return line;
      if (/^(https?:\/\/|npm\s+run|npx\s+|Ctrl|Alt|Shift|Cmd|->)/i.test(trimmed)) return line;
      return translateGermanToEnglish(line);
    })
    .join("\n");
}

function localizeEntry(entry: WikiEntry, lang: Language): WikiEntry {
  if (lang === "de") return entry;

  const fallback: WikiEntry = {
    ...entry,
    title: translateGermanToEnglish(entry.title),
    summary: translateGermanToEnglish(entry.summary),
    guide: entry.guide.map((step) => ({
      title: translateGermanToEnglish(step.title),
      detail: translateGermanToEnglish(step.detail),
    })),
    points: replaceTextList(entry.points, translateGermanToEnglish),
    commands: replaceTextList(entry.commands, translateGermanToEnglish),
    tags: replaceTextList(entry.tags, translateGermanToEnglish),
    markdownSnippets: entry.markdownSnippets?.map((snippet) => ({
      ...snippet,
      label: translateGermanToEnglish(snippet.label),
      description: translateGermanToEnglish(snippet.description),
      snippet: translateSnippetContent(snippet.snippet),
    })),
  };

  const translation = englishEntryTranslations[entry.id];
  if (translation) {
    return {
      ...fallback,
      ...translation,
      guide: translation.guide ?? fallback.guide,
      points: translation.points ?? fallback.points,
      commands: translation.commands ?? fallback.commands,
      tags: translation.tags ?? fallback.tags,
      markdownSnippets: translation.markdownSnippets ?? fallback.markdownSnippets,
    };
  }

  return fallback;
}

function makeSearchBlob(entry: WikiEntry, sourceEntry?: WikiEntry) {
  const parts = [
    entry.title,
    entry.summary,
    entry.app,
    ...appSearchAliases[entry.app],
    ...Object.values(appLabel[entry.app]),
    entry.category,
    ...categorySearchAliases[entry.category],
    ...Object.values(categoryLabel[entry.category]),
    ...entry.points,
    ...entry.tags,
    ...entry.commands,
    ...entry.sources,
    ...entry.guide.map((step) => `${step.title} ${step.detail}`),
    ...(entry.markdownSnippets ?? []).flatMap((snippet) => [snippet.label, snippet.description, snippet.snippet]),
  ];
  if (sourceEntry) {
    parts.push(
      sourceEntry.title,
      sourceEntry.summary,
      ...sourceEntry.points,
      ...sourceEntry.guide.map((step) => `${step.title} ${step.detail}`),
      ...(sourceEntry.markdownSnippets ?? []).flatMap((snippet) => [snippet.label, snippet.description]),
    );
  }
  return normalizeText(parts.join(" "));
}

function makeSearchTerms(entry: WikiEntry) {
  const raw = normalizeText(
    [
      entry.title,
      entry.summary,
      ...entry.tags,
      ...entry.points,
      ...entry.guide.map((step) => `${step.title} ${step.detail}`),
      ...(entry.markdownSnippets ?? []).flatMap((snippet) => [snippet.label, snippet.description]),
    ].join(" "),
  );

  return Array.from(new Set(raw.split(" ").filter((token) => token.length >= MIN_SEARCH_QUERY_CHARS))).slice(0, 240);
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

function expandQueryTokens(query: string) {
  if (!query) return [];

  const rawTokens = query
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= MIN_SEARCH_QUERY_CHARS);
  const expanded = new Set<string>(rawTokens);

  rawTokens.forEach((token) => {
    if (token.length < 3) return;
    const synonyms = searchSynonymIndex.get(token);
    if (!synonyms) return;
    synonyms
      .filter((item) => item.length >= MIN_SEARCH_QUERY_CHARS)
      .forEach((item) => {
        if (expanded.size < 28) expanded.add(item);
      });
  });

  return Array.from(expanded);
}

function boundedLevenshteinDistance(a: string, b: string, maxDistance: number) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  if (!a.length || !b.length) return Math.max(a.length, b.length);

  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  for (let index = 0; index <= b.length; index += 1) previous[index] = index;

  for (let row = 1; row <= a.length; row += 1) {
    current[0] = row;
    let minInRow = current[0];

    for (let col = 1; col <= b.length; col += 1) {
      const substitutionCost = a[row - 1] === b[col - 1] ? 0 : 1;
      current[col] = Math.min(
        previous[col] + 1,
        current[col - 1] + 1,
        previous[col - 1] + substitutionCost,
      );
      if (current[col] < minInRow) minInRow = current[col];
    }

    if (minInRow > maxDistance) return maxDistance + 1;

    for (let index = 0; index <= b.length; index += 1) previous[index] = current[index];
  }

  return previous[b.length];
}

function scoreEntry(entry: WikiEntry, blob: string, fullQuery: string, tokens: string[], searchTerms: string[]) {
  if (!fullQuery) return 1;

  const title = normalizeText(entry.title);
  const summary = normalizeText(entry.summary);
  const tags = entry.tags.map((tag) => normalizeText(tag));
  const titleWords = title.split(" ").filter(Boolean);

  const hasDirect = title.includes(fullQuery) || summary.includes(fullQuery) || blob.includes(fullQuery);
  const matchedTokenCount = tokens.reduce((count, token) => {
    const matched =
      title.includes(token)
      || summary.includes(token)
      || tags.some((tag) => tag.includes(token))
      || blob.includes(token);
    return matched ? count + 1 : count;
  }, 0);

  let fuzzyMatchCount = 0;
  tokens.forEach((token) => {
    if (token.length < MIN_FUZZY_TOKEN_CHARS) return;
    if (blob.includes(token)) return;

    const fuzzyHit = searchTerms.some((term) => {
      if (term.length < MIN_FUZZY_TOKEN_CHARS) return false;
      if (Math.abs(term.length - token.length) > MAX_EDIT_DISTANCE) return false;
      if (term[0] !== token[0]) return false;
      return boundedLevenshteinDistance(term, token, MAX_EDIT_DISTANCE) <= MAX_EDIT_DISTANCE;
    });

    if (fuzzyHit) fuzzyMatchCount += 1;
  });

  if (!hasDirect && matchedTokenCount === 0 && fuzzyMatchCount === 0) return 0;

  const requiredMatches = tokens.length > 1 ? Math.min(2, tokens.length) : 1;
  if (!hasDirect && matchedTokenCount + fuzzyMatchCount < requiredMatches) return 0;

  let score = 0;

  if (title.includes(fullQuery)) score += 210;
  if (summary.includes(fullQuery)) score += 110;
  if (blob.includes(fullQuery)) score += 70;
  if (titleWords.some((word) => word.startsWith(fullQuery))) score += 28;
  if (fuzzyMatchCount > 0) score += fuzzyMatchCount * 16;

  tokens.forEach((token) => {
    if (title.startsWith(token)) score += 45;
    else if (title.includes(token)) score += 35;
    if (summary.includes(token)) score += 20;
    if (tags.some((tag) => tag.includes(token))) score += 18;
    if (blob.includes(token)) score += 8;
  });

  return score;
}


export { apps, categories, entries, viewMatrix, appEmoji, categoryEmoji, appLabel, categoryLabel, sectionLabel, sectionMeta, uiCopy, entryCopy, coverageCopy, navigationGroups, sectionIcon, MIN_SEARCH_QUERY_CHARS, localizeEntry, makeSearchBlob, makeSearchTerms, normalizeText, expandQueryTokens, scoreEntry, sectionBaseEntries };
export type { AppId, CategoryId, WikiEntry, SectionId, AppFilter, CategoryFilter, Language, NavGroupId };
