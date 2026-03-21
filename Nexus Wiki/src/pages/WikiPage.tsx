import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Code,
  Compass,
  Copy,
  Cpu,
  Database,
  Grid3X3,
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
        "Runtime Plane, Control Plane, Live Sync v2, Compatibility und Promotion-Flows in einer zusammenhaengenden Sicht.",
      bullets: [
        "🌌 API-first Struktur mit Shared Core als Bruecke zwischen allen Apps.",
        "🔄 Live Sync v2 steuert Features + Layouts ueber Catalog/Schema.",
        "🧱 Version Gates verhindern Drift zwischen Clients und Runtime.",
      ],
    },
    en: {
      title: "Architecture & Sync 🏗️",
      subtitle:
        "Runtime plane, control plane, Live Sync v2, compatibility and promotion flows in one connected system view.",
      bullets: [
        "🌌 API-first architecture with Shared Core as the bridge across apps.",
        "🔄 Live Sync v2 controls features and layouts via catalog/schema.",
        "🧱 Version gates prevent drift between clients and runtime.",
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
        "🔐 Security operations with owner-only, signatures and device governance.",
        "📡 Guides and audit paths for daily ops and incident response.",
      ],
    },
  },
  "markdown-lab": {
    de: {
      title: "Markdown Lab (Notes + Canvas) 📝",
      subtitle:
        "Sammelpunkt fuer alle Markdown-Features, Snippets und Magic-Builder-Flows aus NotesView und Canvas.",
      bullets: [
        "✨ Enthalten: Widgets, Alerts, Progress, Grid, Timeline, Badge, Cards.",
        "🧪 Snippets sind direkt kopierbar und im Workflow einsetzbar.",
        "📚 Perfekt als Referenz fuer Content-/PM-/Knowledge-Flows.",
      ],
    },
    en: {
      title: "Markdown Lab (Notes + Canvas) 📝",
      subtitle:
        "Single reference point for all Markdown features, snippets and Magic Builder flows from NotesView and Canvas.",
      bullets: [
        "✨ Includes widgets, alerts, progress, grid, timeline, badges and cards.",
        "🧪 Snippets are copy-ready and workflow-friendly.",
        "📚 Strong reference for content, PM and knowledge workflows.",
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
        "🧠 Hilft, das Ecosystem als einheitliches System zu bedienen.",
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
        "Owner-only controls, signatures, device verification, entitlements, paywall gates and secure operating rules for web and apps.",
      bullets: [
        "💳 Clear separation between paywall UX and API-side enforcement.",
        "🛡️ Security baseline and policy guardrails documented clearly.",
        "📋 Includes operational steps for security workflows.",
      ],
    },
  },
  "api-reference": {
    de: {
      title: "Runtime/API Reference ⚙️",
      subtitle:
        "Runtime Contracts, Live Sync, Compatibility, Environment-Konfiguration und API-nahe Integrationspunkte fuer Website/App/Control.",
      bullets: [
        "🔄 End-to-End Sicht auf Resolve/Compatibility/Promotion.",
        "🌐 Environment Variablen und Hosted API-Pfade integriert.",
        "🧾 Mit Matrix- und Command-Kontext fuer reale Umsetzung.",
      ],
    },
    en: {
      title: "Runtime/API Reference ⚙️",
      subtitle:
        "Runtime contracts, Live Sync, compatibility, environment configuration and API-near integration points for website/app/control.",
      bullets: [
        "🔄 End-to-end view of resolve, compatibility and promotion.",
        "🌐 Environment variables and hosted API paths included.",
        "🧾 Matrix and command context for real implementation.",
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
    appFilterAll: string;
    categoryFilterAll: string;
    navGroup: Record<NavGroupId, string>;
    searchPlaceholder: string;
    searchScopeGlobal: string;
    searchScopeSection: string;
    searchActiveHint: string;
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
    appFilterAll: "🌌 Alle Apps",
    categoryFilterAll: "🗂️ Alle Kategorien",
    navGroup: {
      intro: "Einstieg",
      guides: "App Guides",
      knowledge: "Wissenszonen",
    },
    searchPlaceholder: "Suche nach View, Feature, Command, Markdown, Settings ...",
    searchScopeGlobal: "Globale Suche aktiv (alle Bereiche)",
    searchScopeSection: "Suche auf aktive Sektion begrenzt",
    searchActiveHint: "Treffer springen direkt in den passenden Guide.",
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
    footerLayout: "Nexus Wiki Layout v3",
    copied: "Kopiert",
    copyError: "Kopieren fehlgeschlagen",
    entryCount: "Eintraege",
  },
  en: {
    productLabel: "Nexus Product Wiki",
    navTitle: "Nexus Wiki",
    sidebarTag: "Ecosystem Guide Atlas",
    sidebarFilters: "Filters",
    appFilterAll: "🌌 All apps",
    categoryFilterAll: "🗂️ All categories",
    navGroup: {
      intro: "Onboarding",
      guides: "App Guides",
      knowledge: "Knowledge Zones",
    },
    searchPlaceholder: "Search views, features, commands, markdown, settings ...",
    searchScopeGlobal: "Global search active (all sections)",
    searchScopeSection: "Search is scoped to active section",
    searchActiveHint: "Click any result to jump into the matching guide.",
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
    footerLayout: "Nexus Wiki Layout v3",
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
  main: ["main", "desktop", "nexus main", "produktivity"],
  mobile: ["mobile", "ios", "android", "handy", "phone"],
  code: ["code", "ide", "editor", "desktop ide"],
  "code-mobile": ["code mobile", "mobile ide", "nativefs"],
  control: ["control", "panel", "admin", "paywall"],
  runtime: ["runtime", "api", "sync", "contracts"],
};

const categorySearchAliases: Record<CategoryId, string[]> = {
  overview: ["overview", "ueberblick", "intro"],
  view: ["view", "guide", "screen", "ansicht"],
  markdown: ["markdown", "notes", "notizen", "md"],
  settings: ["settings", "preferences", "einstellungen"],
  workflow: ["workflow", "prozess", "flow", "commands"],
  runtime: ["runtime", "api", "live sync", "compatibility"],
  security: ["security", "paywall", "entitlement", "sicherheit"],
  ops: ["ops", "deploy", "build", "release"],
};

const searchSynonymGroups = [
  ["notes", "note", "notizen", "notesview", "markdown", "md"],
  ["canvas", "magic", "mindmap", "diagram", "graph", "knoten"],
  ["settings", "preferences", "einstellungen", "config", "konfiguration"],
  ["security", "paywall", "entitlement", "auth", "sicherheit"],
  ["workflow", "flow", "prozess", "automation", "pipeline"],
  ["mobile", "phone", "ios", "android", "handy"],
  ["code", "editor", "ide", "debug", "git"],
  ["runtime", "api", "sync", "compatibility", "contract"],
  ["control", "panel", "admin", "ops"],
  ["guide", "docs", "wiki", "reference"],
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#+./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSearchBlob(entry: WikiEntry) {
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
  return normalizeText(parts.join(" "));
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

  const rawTokens = query.split(" ").filter(Boolean);
  const expanded = new Set<string>(rawTokens);

  rawTokens.forEach((token) => {
    const synonyms = searchSynonymIndex.get(token);
    if (!synonyms) return;
    synonyms.forEach((item) => expanded.add(item));
  });

  return Array.from(expanded);
}

function scoreEntry(entry: WikiEntry, blob: string, fullQuery: string, tokens: string[]) {
  if (!fullQuery) return 1;

  const title = normalizeText(entry.title);
  const summary = normalizeText(entry.summary);
  const tags = entry.tags.map((tag) => normalizeText(tag));

  let score = 0;

  if (title.includes(fullQuery)) score += 180;
  if (summary.includes(fullQuery)) score += 95;
  if (blob.includes(fullQuery)) score += 65;

  tokens.forEach((token) => {
    if (title.includes(token)) score += 40;
    if (summary.includes(token)) score += 20;
    if (tags.some((tag) => tag.includes(token))) score += 18;
    if (blob.includes(token)) score += 8;
  });

  return score;
}

export function WikiPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("getting-started");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [copyState, setCopyState] = useState("");
  const [focusedEntryId, setFocusedEntryId] = useState("");
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === "undefined") return "de";
    const cached = window.localStorage.getItem("nexus-wiki-lang");
    if (cached === "de" || cached === "en") return cached;
    return window.navigator.language.toLowerCase().startsWith("de") ? "de" : "en";
  });

  useEffect(() => {
    window.localStorage.setItem("nexus-wiki-lang", lang);
  }, [lang]);

  useEffect(() => {
    if (!focusedEntryId) return;
    const timeout = window.setTimeout(() => setFocusedEntryId(""), 2000);
    return () => window.clearTimeout(timeout);
  }, [focusedEntryId]);

  const deferredQuery = useDeferredValue(normalizeText(query));
  const searchTokens = useMemo(() => expandQueryTokens(deferredQuery), [deferredQuery]);
  const isGlobalSearch = deferredQuery.length > 0;

  const searchBlobById = useMemo(() => {
    const index = new Map<string, string>();
    entries.forEach((entry) => {
      index.set(entry.id, makeSearchBlob(entry));
    });
    return index;
  }, []);

  const entrySections = useMemo(() => {
    const map = new Map<string, SectionId[]>();
    (Object.keys(sectionBaseEntries) as SectionId[]).forEach((section) => {
      if (section === "coverage") return;
      sectionBaseEntries[section].forEach((entry) => {
        const existing = map.get(entry.id) ?? [];
        if (!existing.includes(section)) existing.push(section);
        map.set(entry.id, existing);
      });
    });
    return map;
  }, []);

  const filteredEntries = useMemo(() => {
    const base = isGlobalSearch ? entries : sectionBaseEntries[activeSection] ?? [];

    const scoredEntries: Array<{ entry: WikiEntry; score: number }> = [];

    base.forEach((entry) => {
      const appOk = appFilter === "all" || entry.app === appFilter;
      const categoryOk = categoryFilter === "all" || entry.category === categoryFilter;

      if (!appOk || !categoryOk) return;

      const blob = searchBlobById.get(entry.id) ?? "";
      const score = scoreEntry(entry, blob, deferredQuery, searchTokens);

      if (!isGlobalSearch || score > 0) {
        scoredEntries.push({ entry, score });
      }
    });

    if (isGlobalSearch) {
      scoredEntries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.entry.title.localeCompare(b.entry.title);
      });
    }

    return scoredEntries.map((item) => item.entry);
  }, [activeSection, appFilter, categoryFilter, deferredQuery, isGlobalSearch, searchBlobById, searchTokens]);

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

  const searchPreviewEntries = useMemo(() => {
    if (!isGlobalSearch) return [];
    return filteredEntries.slice(0, 12);
  }, [filteredEntries, isGlobalSearch]);

  const t = uiCopy[lang];
  const cardText = entryCopy[lang];
  const coverageText = coverageCopy[lang];
  const meta = sectionMeta[activeSection][lang];

  const copyText = async (text: string, token: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(token);
      window.setTimeout(() => setCopyState(""), 1300);
    } catch {
      setCopyState("copy-error");
      window.setTimeout(() => setCopyState(""), 1300);
    }
  };

  const jumpToEntry = (entry: WikiEntry) => {
    const preferredSection = entrySections.get(entry.id)?.[0] ?? activeSection;
    if (preferredSection !== activeSection) {
      setActiveSection(preferredSection);
    }

    setFocusedEntryId(entry.id);
    setIsMobileMenuOpen(false);

    window.setTimeout(() => {
      document.getElementById(`entry-${entry.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex overflow-hidden">
      <SpaceBackground />

      <button
        onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        className="md:hidden fixed top-4 right-4 z-50 p-3 rounded-xl bg-cyan-500/15 text-cyan-200 border border-cyan-400/40 backdrop-blur-xl"
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.55)]">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200">
              {t.navTitle}
            </h1>
            <p className="text-[10px] text-cyan-200/90 font-mono tracking-widest uppercase">{t.sidebarTag}</p>
          </div>
        </div>

        <div className="p-4 border-b border-white/5 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">{t.sidebarFilters}</p>
          <div className="grid gap-2">
            <label className="space-y-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">App</span>
              <select
                value={appFilter}
                onChange={(event) => setAppFilter(event.target.value as AppFilter)}
                className="w-full bg-black/45 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-300"
              >
                <option value="all">{t.appFilterAll}</option>
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {appEmoji[app.id]} {appLabel[app.id][lang]}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                className="w-full bg-black/45 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-300"
              >
                <option value="all">{t.categoryFilterAll}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryEmoji[category.id]} {categoryLabel[category.id][lang]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                {t.navGroup[group.id]}
              </h3>
              <div className="space-y-1">
                {group.sections.map((id) => {
                  const Icon = sectionIcon[id];
                  const isActive = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setActiveSection(id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-sm ${
                        isActive
                          ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/35 shadow-[inset_0_0_20px_rgba(34,211,238,0.12)] font-medium"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-cyan-300" : "text-slate-500"}`} />
                      <span className="truncate">{sectionLabel[id][lang]}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{sectionCounts[id]}</span>
                      {isActive && <ChevronRight className="w-4 h-4 text-cyan-200/75" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative z-10 custom-scrollbar scroll-smooth">
        <div className="max-w-[1320px] mx-auto px-5 md:px-9 py-8 md:py-12 space-y-8">
          <div className="sticky top-2 md:top-4 z-30">
            <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-slate-900/65 backdrop-blur-2xl shadow-[0_10px_40px_rgba(3,7,18,0.45)]">
              <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(14,116,144,0.12),rgba(99,102,241,0.12),rgba(168,85,247,0.08))]" />
              <div className="relative p-3 md:p-4 space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="w-full bg-black/35 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/40 transition-all placeholder:text-slate-500"
                    />
                  </div>

                  <div className="inline-flex items-center rounded-xl border border-white/10 bg-black/35 p-1 w-fit">
                    <button
                      onClick={() => setLang("de")}
                      className={`px-3 py-1.5 text-xs rounded-lg transition ${
                        lang === "de" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🇩🇪 DE
                    </button>
                    <button
                      onClick={() => setLang("en")}
                      className={`px-3 py-1.5 text-xs rounded-lg transition ${
                        lang === "en" ? "bg-cyan-500/25 text-cyan-100" : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🇬🇧 EN
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">
                    <Sparkles className="w-3.5 h-3.5" />
                    {isGlobalSearch ? t.searchScopeGlobal : t.searchScopeSection}
                  </span>
                  <span className="text-slate-400">{t.searchActiveHint}</span>
                  {isGlobalSearch ? (
                    <button
                      onClick={() => setQuery("")}
                      className="ml-auto px-2.5 py-1 rounded-full border border-white/10 bg-black/35 hover:border-cyan-400/40"
                    >
                      {t.clearSearch}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.section
              key={`${activeSection}-${lang}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.24 }}
              className="space-y-6"
            >
              <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/55 backdrop-blur-2xl p-6 md:p-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-24 -top-24 w-72 h-72 border border-cyan-300/20 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-16 -top-16 w-56 h-56 border border-indigo-300/20 rounded-full"
                />
                <div className="relative space-y-5">
                  <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-cyan-500/35 bg-cyan-500/10 text-cyan-100">
                    <Sparkles className="w-4 h-4" />
                    {meta.title}
                  </p>
                  <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight max-w-5xl">{meta.title}</h1>
                  <p className="text-slate-300 text-base md:text-lg max-w-5xl leading-relaxed">{meta.subtitle}</p>

                  <div className="grid gap-3 md:grid-cols-3">
                    {meta.bullets.map((bullet) => (
                      <div key={bullet}>
                        <SpotlightCard
                          className="rounded-2xl border border-white/10 bg-slate-900/45 backdrop-blur-xl p-4"
                          spotlightColor="rgba(34,211,238,0.14)"
                        >
                          <p className="text-sm text-slate-300 leading-relaxed">{bullet}</p>
                        </SpotlightCard>
                      </div>
                    ))}
                  </div>
                </div>
              </header>

              <section className="p-4 md:p-5 rounded-2xl bg-slate-900/55 border border-white/10 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30">
                    <Database className="w-3.5 h-3.5" />
                    {filteredEntries.length} {isGlobalSearch ? t.searchEntries : t.sectionEntries}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                    <Terminal className="w-3.5 h-3.5" /> {topCommands.length} {t.commandHints}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    <BookOpen className="w-3.5 h-3.5" /> {entries.length} {t.totalEntries}
                  </span>
                </div>

                {topCommands.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topCommands.map((command) => (
                      <button
                        key={command}
                        onClick={() => copyText(command, `cmd:${command}`)}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-black/40 border border-white/10 hover:border-cyan-400/50 text-slate-200"
                      >
                        💻 {command}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              {isGlobalSearch ? (
                <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.08] backdrop-blur-xl p-4 md:p-6 space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-bold text-white">{t.searchResultsTitle}</h2>
                    <p className="text-sm text-cyan-50/85">{t.searchResultsSubtitle}</p>
                  </div>

                  {searchPreviewEntries.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {searchPreviewEntries.map((entry) => {
                        const candidateSections = entrySections.get(entry.id) ?? [activeSection];
                        return (
                          <button
                            key={`search-hit-${entry.id}`}
                            onClick={() => jumpToEntry(entry)}
                            className="text-left p-4 rounded-xl border border-white/12 bg-black/30 hover:border-cyan-300/40 transition"
                          >
                            <p className="text-base font-semibold text-white leading-snug">
                              {appEmoji[entry.app]} {entry.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-300 line-clamp-2">{entry.summary}</p>

                            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-slate-200">
                              <span className="px-2 py-1 rounded-full border border-cyan-400/35 bg-cyan-400/10">
                                {appEmoji[entry.app]} {appLabel[entry.app][lang]}
                              </span>
                              <span className="px-2 py-1 rounded-full border border-indigo-400/35 bg-indigo-500/10">
                                {categoryEmoji[entry.category]} {categoryLabel[entry.category][lang]}
                              </span>
                              {candidateSections.slice(0, 2).map((section) => (
                                <span
                                  key={`jump-${entry.id}-${section}`}
                                  className="px-2 py-1 rounded-full border border-white/15 bg-white/5"
                                >
                                  {sectionLabel[section][lang]}
                                </span>
                              ))}
                            </div>

                            <p className="mt-3 text-xs text-cyan-200">↳ {t.jumpToGuide}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-300">{t.noResults}</p>
                  )}

                  {filteredEntries.length > searchPreviewEntries.length ? (
                    <p className="text-xs text-cyan-200/90">
                      +{filteredEntries.length - searchPreviewEntries.length} {t.moreResults}
                    </p>
                  ) : null}
                </section>
              ) : null}

              {activeSection === "coverage" ? (
                <CoverageSection
                  coverageStats={coverageStats}
                  filteredEntries={filteredEntries}
                  lang={lang}
                  copy={coverageText}
                />
              ) : (
                <section className="space-y-5">
                  {groupedEntries.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-white/20 bg-black/30 text-slate-400">
                      {t.noResults}
                    </div>
                  ) : (
                    groupedEntries.map((group) => (
                      <div key={group.app.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl md:text-3xl font-bold text-white">
                            {appEmoji[group.app.id]} {appLabel[group.app.id][lang]}
                          </h2>
                          <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-slate-400 bg-white/5">
                            {group.entries.length} {t.entryCount}
                          </span>
                        </div>
                        <div className="grid gap-4">
                          {group.entries.map((entry) => (
                            <div key={entry.id}>
                              <EntryCard
                                entry={entry}
                                onCopy={copyText}
                                copy={cardText}
                                isFocused={focusedEntryId === entry.id}
                              />
                            </div>
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
                    <Compass className="w-5 h-5 text-cyan-300" /> {t.viewMatrix}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/30">
                    <table className="w-full text-left text-sm min-w-[760px]">
                      <thead className="bg-white/5 text-slate-400">
                        <tr>
                          <th className="px-4 py-3 font-semibold">{t.tableView}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableMain}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableMobile}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableCode}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableCodeMobile}</th>
                          <th className="px-4 py-3 font-semibold">{t.tableControl}</th>
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
                  <LayoutDashboard className="w-4 h-4" /> {t.footerLayout}
                </span>
                {copyState && copyState !== "copy-error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                    <Check className="w-4 h-4" /> {t.copied}
                  </span>
                ) : null}
                {copyState === "copy-error" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300">
                    {t.copyError}
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

function EntryCard({
  entry,
  onCopy,
  copy,
  isFocused,
}: {
  entry: WikiEntry;
  onCopy: (text: string, token: string) => void;
  copy: {
    steps: string;
    features: string;
    commands: string;
    snippets: string;
    tags: string;
    sources: string;
    copy: string;
    stepsUnit: string;
    featuresUnit: string;
  };
  isFocused: boolean;
}) {
  return (
    <SpotlightCard
      className={`rounded-2xl border bg-slate-900/60 backdrop-blur-xl transition-all ${
        isFocused
          ? "border-cyan-300/60 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_12px_34px_rgba(6,182,212,0.18)]"
          : "border-white/10"
      }`}
      spotlightColor="rgba(34,211,238,0.1)"
    >
      <article id={`entry-${entry.id}`} className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2 min-w-[240px] flex-1">
            <h3 className="text-lg md:text-2xl font-bold text-white leading-snug">
              {appEmoji[entry.app]} {entry.title}
            </h3>
            <p className="text-slate-300 leading-relaxed text-[15px]">{entry.summary}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded-full text-[11px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-200">
              {appEmoji[entry.app]} {entry.app}
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] bg-cyan-500/15 border border-cyan-500/30 text-cyan-200">
              {categoryEmoji[entry.category]} {entry.category}
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
              {entry.guide.length} {copy.stepsUnit}
            </span>
            <span className="px-2 py-1 rounded-full text-[11px] bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200">
              {entry.points.length} {copy.featuresUnit}
            </span>
          </div>
        </div>

        <pre className="bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-slate-200 overflow-x-auto leading-relaxed">{`### ${entry.title}
- app: ${entry.app}
- category: ${entry.category}
- features: ${entry.points.length}
- commands: ${entry.commands.length}`}</pre>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-indigo-200 mb-2">{copy.steps}</h4>
            <ol className="space-y-2 text-sm text-slate-300 list-decimal pl-4">
              {entry.guide.map((step, index) => (
                <li key={`${entry.id}-${step.title}`}>
                  <strong className="text-white">
                    {index + 1}. {step.title}:
                  </strong>{" "}
                  {step.detail}
                </li>
              ))}
            </ol>
          </section>

          <section className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-cyan-200 mb-2">{copy.features}</h4>
            <ul className="space-y-2 text-sm text-slate-300 list-disc pl-4">
              {entry.points.map((point) => (
                <li key={`${entry.id}-point-${point}`}>{point}</li>
              ))}
            </ul>
          </section>
        </div>

        {entry.commands.length ? (
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-emerald-200">{copy.commands}</h4>
            <div className="flex flex-wrap gap-2">
              {entry.commands.map((command) => (
                <button
                  key={`${entry.id}-cmd-${command}`}
                  onClick={() => onCopy(command, `entry-cmd:${entry.id}:${command}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/45 border border-white/10 text-xs text-slate-200 hover:border-cyan-400/50"
                >
                  <Copy className="w-3.5 h-3.5" /> {command}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {entry.markdownSnippets?.length ? (
          <section className="space-y-2">
            <h4 className="text-sm font-bold text-fuchsia-200">{copy.snippets}</h4>
            <div className="grid gap-3">
              {entry.markdownSnippets.map((snippet) => (
                <div
                  key={`${entry.id}-snippet-${snippet.label}`}
                  className="p-3 rounded-xl border border-white/10 bg-black/35 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm text-white">{snippet.label}</strong>
                    <button
                      onClick={() => onCopy(snippet.snippet, `snippet:${entry.id}:${snippet.label}`)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-white/10 bg-white/5 hover:border-cyan-400/40"
                    >
                      <Copy className="w-3.5 h-3.5" /> {copy.copy}
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
            <h4 className="text-sm font-bold text-slate-200 mb-2">{copy.tags}</h4>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span
                  key={`${entry.id}-tag-${tag}`}
                  className="px-2 py-1 rounded-full text-[11px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-200"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-black/30">
            <h4 className="text-sm font-bold text-slate-200 mb-2">{copy.sources}</h4>
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
  lang,
  copy,
}: {
  coverageStats: {
    byCategoryCount: Array<{ id: CategoryId; label: string; description: string; count: number }>;
    byAppCount: Array<{ id: AppId; label: string; subtitle: string; count: number }>;
    snippetCount: number;
    topSources: Array<{ source: string; count: number }>;
  };
  filteredEntries: WikiEntry[];
  lang: Language;
  copy: {
    totalEntries: string;
    snippets: string;
    activeMatches: string;
    categoryCoverage: string;
    appCoverage: string;
    topSources: string;
    fullList: string;
    references: string;
  };
}) {
  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(99,102,241,0.12)">
          <p className="text-sm text-slate-400">{copy.totalEntries}</p>
          <p className="mt-1 text-3xl font-black text-white">{entries.length}</p>
        </SpotlightCard>
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(34,211,238,0.12)">
          <p className="text-sm text-slate-400">{copy.snippets}</p>
          <p className="mt-1 text-3xl font-black text-white">{coverageStats.snippetCount}</p>
        </SpotlightCard>
        <SpotlightCard className="rounded-2xl border border-white/10 bg-slate-900/60 p-4" spotlightColor="rgba(52,211,153,0.12)">
          <p className="text-sm text-slate-400">{copy.activeMatches}</p>
          <p className="mt-1 text-3xl font-black text-white">{filteredEntries.length}</p>
        </SpotlightCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-lg font-bold text-white">{copy.categoryCoverage}</h3>
          <div className="space-y-2">
            {coverageStats.byCategoryCount.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm text-slate-200">
                  {categoryEmoji[item.id]} {categoryLabel[item.id][lang]}
                </span>
                <strong className="text-sm text-indigo-300">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
          <h3 className="text-lg font-bold text-white">{copy.appCoverage}</h3>
          <div className="space-y-2">
            {coverageStats.byAppCount.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm text-slate-200">
                  {appEmoji[item.id]} {appLabel[item.id][lang]}
                </span>
                <strong className="text-sm text-cyan-300">{item.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.topSources}</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {coverageStats.topSources.map((item) => (
            <div key={item.source} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <p className="font-mono text-xs text-slate-300 break-all">{item.source}</p>
              <p className="text-xs text-slate-500 mt-1">
                {item.count} {copy.references}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
        <h3 className="text-lg font-bold text-white">{copy.fullList}</h3>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.id} className="p-2.5 rounded-lg bg-black/30 border border-white/5">
              <p className="text-sm text-white leading-snug">
                {appEmoji[entry.app]} {entry.title}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {categoryEmoji[entry.category]} {categoryLabel[entry.category][lang]} • {entry.guide.length} steps • {entry.points.length} features
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
