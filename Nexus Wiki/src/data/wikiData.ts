export type CategoryId =
  | 'overview'
  | 'view'
  | 'markdown'
  | 'settings'
  | 'workflow'
  | 'runtime'
  | 'security'
  | 'ops'

export type AppId =
  | 'ecosystem'
  | 'main'
  | 'mobile'
  | 'code'
  | 'code-mobile'
  | 'control'
  | 'runtime'

export type GuideStep = {
  title: string
  detail: string
}

export type MarkdownSnippet = {
  label: string
  description: string
  snippet: string
}

export type WikiEntry = {
  id: string
  title: string
  app: AppId
  category: CategoryId
  summary: string
  guide: GuideStep[]
  points: string[]
  commands: string[]
  tags: string[]
  sources: string[]
  markdownSnippets?: MarkdownSnippet[]
}

export const categories: Array<{ id: CategoryId; label: string; description: string }> = [
  { id: 'overview', label: 'Overview', description: 'Architektur, Komponenten, Scope' },
  { id: 'view', label: 'View Guides', description: 'Alle Views mit Nutzungspfaden' },
  { id: 'markdown', label: 'Markdown', description: 'Notes/Canvas Markdown Referenz' },
  { id: 'settings', label: 'Settings', description: 'Theme, Layout, Motion, Editor' },
  { id: 'workflow', label: 'Workflows', description: 'Terminal, Spotlight, Productivity' },
  { id: 'runtime', label: 'Runtime/API', description: 'Live Sync, Compatibility, Contracts' },
  { id: 'security', label: 'Security', description: 'Access Governance, Account Schutz, Paywalls' },
  { id: 'ops', label: 'Ops/Deploy', description: 'Hosting, Build, Release, Verify' },
]

export const apps: Array<{ id: AppId; label: string; subtitle: string }> = [
  { id: 'ecosystem', label: 'Ecosystem', subtitle: 'Monorepo + Shared Core' },
  { id: 'main', label: 'Nexus Main', subtitle: 'Desktop Productivity App' },
  { id: 'mobile', label: 'Nexus Mobile', subtitle: 'Mobile Parity Surface' },
  { id: 'code', label: 'Nexus Code', subtitle: 'Desktop IDE Surface' },
  { id: 'code-mobile', label: 'Nexus Code Mobile', subtitle: 'Native IDE Surface' },
  { id: 'control', label: 'Control', subtitle: 'Live Sync + Paywalls UI' },
  { id: 'runtime', label: 'Runtime Plane', subtitle: 'Shared API Layer' },
]

export const entries: WikiEntry[] = [
  {
    id: 'ecosystem-overview',
    title: 'Nexus Ecosystem Gesamtueberblick',
    app: 'ecosystem',
    category: 'overview',
    summary:
      'Das Nexus Ecosystem ist ein API-first Monorepo mit Main, Mobile, Code, Code Mobile und gehosteter Control Plane.',
    guide: [
      { title: '1. Scope verstehen', detail: 'Main/Mobile sind Productivity-Surfaces, Code/Code Mobile sind IDE-Surfaces, Control ist zentraler Steuerpunkt.' },
      { title: '2. Shared Layer verstehen', detail: 'Die Apps teilen Runtime Contracts ueber packages/nexus-core und erhalten v2 Features/Layout ueber Live Sync.' },
      { title: '3. Betriebsmodell verstehen', detail: 'Public Repo liefert Runtime + Clients, produktive Control Plane Logik liegt im privaten NexusAPI Umfeld.' },
    ],
    points: [
      'Ziel ist konsistente Feature-Paritaet ueber Desktop und Mobile.',
      'View Access und Entitlements werden serverseitig geprueft.',
      'Release-Flow basiert auf Verify-, Build- und Kompatibilitaets-Gates.',
    ],
    commands: ['npm run setup', 'npm run build', 'npm run verify:ecosystem'],
    tags: ['monorepo', 'architecture', 'apps', 'contracts'],
    sources: ['README.md', 'docs/DEVELOPER_GUIDE.md'],
  },
  {
    id: 'ecosystem-setup-dev',
    title: 'Setup und Entwicklung im Ecosystem',
    app: 'ecosystem',
    category: 'ops',
    summary:
      'Das Root-Repo stellt orchestrierte Scripts fuer Setup, Build, Dev-Starts und Quality Gates bereit.',
    guide: [
      { title: '1. Setup', detail: 'Mit npm run setup werden App-Abhaengigkeiten installiert und lokale Defaults vorbereitet.' },
      { title: '2. API Quelle pruefen', detail: 'Mit npm run api:source wird angezeigt, gegen welche Hosted API/Client-Layer gearbeitet wird.' },
      { title: '3. Zielgerichtet starten', detail: 'Nutze dev:main, dev:code, dev:mobile:* oder dev:code-mobile:* je nach Surface.' },
    ],
    points: [
      'dev:all startet Main + Code als Core-Stack, optional mit Control UI.',
      'Mobile Apps laufen nativ ueber Capacitor Workflows.',
      'Build-Pipelines koennen optional Hosted-API-Healthchecks erzwingen.',
    ],
    commands: [
      'npm run dev:all',
      'npm run dev:all:with-control-ui',
      'npm run build:ecosystem:with-healthcheck',
    ],
    tags: ['setup', 'scripts', 'dev', 'build'],
    sources: ['package.json', 'README.md', 'docs/ENVIRONMENT.md'],
  },
  {
    id: 'runtime-live-sync-v2',
    title: 'Runtime Live Sync v2',
    app: 'runtime',
    category: 'runtime',
    summary:
      'Live Sync v2 steuert Feature-Freigaben und Layout-Profile zentral ueber Feature Catalog, UI Schema und Release Snapshot.',
    guide: [
      { title: '1. Feature implementieren', detail: 'Neue View-/Feature-Logik wird in App-Code umgesetzt und in VIEW_FEATURE_MAP gemappt.' },
      { title: '2. Catalog + Schema pflegen', detail: 'Im Control Live Sync Tab werden staging Catalog/Schemas gespeichert und validiert.' },
      { title: '3. Promotion', detail: 'Nach Verify und Build wird von staging nach production promoted.' },
    ],
    points: [
      'Shared Core orchestriert effektive Views pro App.',
      'Layout-Profile steuern mobile/desktop Verhalten wie density und navigation.',
      'Compatibility Checks blockieren inkompatible Client-Versionen.',
    ],
    commands: ['npm run verify:ecosystem', 'Control UI -> Live Sync'],
    tags: ['live-sync', 'catalog', 'schema', 'promotion'],
    sources: ['README.md', 'docs/DEVELOPER_GUIDE.md', 'packages/nexus-core/src/liveSync.ts'],
  },
  {
    id: 'runtime-compatibility',
    title: 'Compatibility und Version Gates',
    app: 'runtime',
    category: 'runtime',
    summary:
      'Runtime validiert minClientVersion und compatMatrix pro App, bevor unsafe Views freigegeben werden.',
    guide: [
      { title: '1. Versionen setzen', detail: 'Schema muss minClientVersion und kompatible Versionen je App korrekt pflegen.' },
      { title: '2. Builds validieren', detail: 'Vor Promotion alle App-Builds ausfuehren.' },
      { title: '3. Laufzeit pruefen', detail: 'Bei Inkompatibilitaet muessen Apps klare Hinweise und sichere Fallbacks zeigen.' },
    ],
    points: [
      'Compatibility wird nicht nur im UI, sondern in Runtime-Resolution geprueft.',
      'Promotion ohne parity-validierte Versionen erzeugt Drift-Risiko.',
      'Unsafe Views bleiben bei Konflikten gesperrt.',
    ],
    commands: ['npm run verify:ecosystem', 'npm --prefix "./Nexus Main" run build'],
    tags: ['compatibility', 'versioning', 'gates'],
    sources: ['docs/DEVELOPER_GUIDE.md', 'docs/USER_GUIDE.md'],
  },
  {
    id: 'security-owner-signatures',
    title: 'Security Governance und Zugriffsschutz',
    app: 'control',
    category: 'security',
    summary:
      'Der Zugriff auf kritische Verwaltungsfunktionen folgt klaren Rollen- und Freigaberegeln.',
    guide: [
      { title: '1. Rollenmodell pruefen', detail: 'Administrative Rechte nur an wirklich benoetigte Accounts vergeben.' },
      { title: '2. Sicherheitsregeln aktiv halten', detail: 'Kritische Aktionen nur innerhalb definierter Governance-Policies erlauben.' },
      { title: '3. Regelmaessig kontrollieren', detail: 'Zugriffe und Aenderungen im Security-Betrieb laufend verifizieren.' },
    ],
    points: [
      'Sicherheitsentscheidungen werden zentral und konsistent verwaltet.',
      'Least-Privilege reduziert Risiko bei Fehlkonfigurationen.',
      'Regelmaessige Reviews halten den Betrieb stabil und nachvollziehbar.',
    ],
    commands: ['Control UI -> Policies', 'Control UI -> Audit'],
    tags: ['security', 'governance', 'access-control'],
    sources: ['docs/SECURITY.md', 'docs/ENVIRONMENT.md'],
  },
  {
    id: 'security-paywall-entitlements',
    title: 'Paywalls und Entitlements',
    app: 'control',
    category: 'security',
    summary:
      'Premium-Funktionen folgen einem klaren Account- und Tier-Modell mit Login/Upgrade-Flow.',
    guide: [
      { title: '1. Konto und Login', detail: 'Website/App fordert Login fuer Premium-Features an.' },
      { title: '2. Planstatus pruefen', detail: 'Nur berechtigte Konten erhalten Zugriff auf Premium-Bereiche.' },
      { title: '3. View-Freigabe', detail: 'Nur erlaubte Views/Funktionen werden freigeschaltet, sonst klarer Hinweis im Client.' },
    ],
    points: [
      'Die Website steuert primär den UX-Flow fuer Login und Upgrade.',
      'Autorisierung liegt in den geschuetzten Backend-Systemen.',
      'Control Paywalls Tab pflegt Tier-Views und User-Templates.',
      'Clients muessen Blockierungszustand sauber darstellen.',
    ],
    commands: ['Control UI -> Paywalls', 'Control UI -> Live Sync'],
    tags: ['paywall', 'tier', 'entitlement', 'access-control'],
    sources: ['docs/USER_GUIDE.md'],
  },
  {
    id: 'control-hosting-migration',
    title: 'Control Hosting Migration',
    app: 'control',
    category: 'ops',
    summary:
      'Control UI laeuft auf der verwalteten Infrastruktur; GitHub Pages wird fuer das oeffentliche Produktwiki genutzt.',
    guide: [
      { title: '1. Build', detail: 'Control UI ueber npm --prefix "../Nexus Control" run build erzeugen.' },
      { title: '2. Deploy', detail: 'dist statisch unter /control ausliefern.' },
      { title: '3. Release checken', detail: 'Nach Deployment den UI-Start und die Kernnavigation validieren.' },
    ],
    points: [
      'Oeffentliche Seiten zeigen nur dokumentationsrelevante Inhalte.',
      'Interne Infrastruktur-Details bleiben in privaten Betriebsdokumenten.',
      'Deployment-Checks sind Pflicht vor Freigabe.',
    ],
    commands: ['npm --prefix "../Nexus Control" run build', 'npm run verify:ecosystem'],
    tags: ['hosting', 'control-ui', 'deploy'],
    sources: ['docs/CONTROL_PANEL_HOSTED_SETUP.md', 'README.md'],
  },
  {
    id: 'release-gates',
    title: 'Release Gates und Promotion Checkliste',
    app: 'ecosystem',
    category: 'ops',
    summary:
      'Vor Promotion sind Verify + Build Checks ueber alle App-Surfaces Pflicht.',
    guide: [
      { title: '1. Contracts pruefen', detail: 'verify:ecosystem muss clean laufen.' },
      { title: '2. Alle Targets bauen', detail: 'Main, Mobile, Code, Code Mobile und Control UI bauen.' },
      { title: '3. Erst dann promoten', detail: 'Promotion auf production erst nach bestandenen Gates.' },
    ],
    points: [
      'Dieser Flow verhindert Contract Drift und Runtime-Brueche.',
      'Kompatibilitaet wird als Releasebedingung behandelt.',
      'Cross-App Paritaet ist Teil des Zielkriteriums.',
    ],
    commands: [
      'npm run verify:ecosystem',
      'npm --prefix "./Nexus Main" run build',
      'npm --prefix "./Nexus Mobile" run build',
      'npm --prefix "./Nexus Code" run build',
      'npm --prefix "./Nexus Code Mobile" run build',
    ],
    tags: ['release', 'verify', 'build', 'promotion'],
    sources: ['docs/DEVELOPER_GUIDE.md'],
  },
  {
    id: 'main-dashboard-guide',
    title: 'Nexus Main: Dashboard Guide',
    app: 'main',
    category: 'view',
    summary:
      'Dashboard bietet ein persistentes 2-Spalten Widget-System mit Snap-Logik, manueller Feinsteuerung und Reset-Flow.',
    guide: [
      { title: '1. Layout Editor oeffnen', detail: 'Per Button Layout bearbeiten aktivieren.' },
      { title: '2. Widgets positionieren', detail: 'Per Drag/Drop auf Snap-Zellen oder ueber C1/C2 und R-/R+ feinjustieren.' },
      { title: '3. Sichtbarkeit steuern', detail: 'Widgets ein-/ausblenden, Reihenfolge per Up/Down oder Drag aendern.' },
    ],
    points: [
      'Layout wird unter nx-dashboard-layout-v2 persistiert.',
      'Span 1/2 erlaubt ein- oder zweispaltige Widgets.',
      'Reset stellt Default-Layout sofort wieder her.',
    ],
    commands: ['Layout bearbeiten', 'Reset Dashboard Layout (Settings > Workspace)'],
    tags: ['dashboard', 'widgets', 'layout', 'snap'],
    sources: ['Nexus Main/src/views/DashboardView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-notes-guide',
    title: 'Nexus Main: NotesView Vollguide',
    app: 'main',
    category: 'view',
    summary:
      'NotesView kombiniert Sidebar Management, Edit/Split/Preview Modi, Tagging, Undo/Redo, Focus Mode und lokale Notes Settings.',
    guide: [
      { title: '1. Notiz auswaehlen oder erstellen', detail: 'Links suchen/filter/sortieren und Notiz aktivieren oder neu anlegen.' },
      { title: '2. Modus waehlen', detail: 'Edit fuer Schreiben, Split fuer Live Review, Preview fuer finalen Output.' },
      { title: '3. Strukturieren und speichern', detail: 'Tags pflegen, Format-Toolbar nutzen, Save/Autosave und Export als .md verwenden.' },
    ],
    points: [
      'Modes: edit, split, preview.',
      'Sortierung: updated, title, created; Pinning wird priorisiert.',
      'Fokusmodus blendet Sidebar aus und vergroessert Schreibflaeche.',
      'Notes Settings steuern Schriftgroesse, Zeilenhoehe, Word Wrap, Tab Size, Autosave.',
    ],
    commands: ['Ctrl+S', 'Ctrl+B', 'Ctrl+I', 'Ctrl+K', 'Ctrl+Z', 'Ctrl+Y', 'Tab'],
    tags: ['notes', 'editor', 'preview', 'autosave', 'tags'],
    sources: ['Nexus Main/src/views/NotesView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-notes-magic-menu-guide',
    title: 'Nexus Main: Notes Magic Menue Guide',
    app: 'main',
    category: 'view',
    summary:
      'Das Magic Menue erzeugt strukturierte Markdown Snippets (List, Alert, Progress, Timeline, Grid, Card, Badge) per UI.',
    guide: [
      { title: '1. Cursorposition sichern', detail: 'Im Editor den Zielbereich markieren, dann Magic Button klicken.' },
      { title: '2. Element waehlen', detail: 'Typ links auswaehlen und Felder im Formular fuellen.' },
      { title: '3. Vorschau pruefen und einfuegen', detail: 'Snippet Preview kontrollieren, dann in die Notiz einfuegen.' },
    ],
    points: [
      'Modal laedt lazy fuer bessere Initialperformance.',
      'Selection wird vor dem Oeffnen gespeichert und nach Insert wiederhergestellt.',
      'Badge nutzt Inline Syntax fuer schnelle Hervorhebungen.',
    ],
    commands: ['Magic Button in Notes Toolbar', 'ESC zum Schliessen'],
    tags: ['magic-menu', 'widgets', 'markdown-builder'],
    sources: ['Nexus Main/src/views/notes/NotesMagicModal.tsx', 'Nexus Main/src/views/NotesView.tsx'],
    markdownSnippets: [
      {
        label: 'nexus-list',
        description: 'Label/Detail Zeilen',
        snippet: '```nexus-list\nAlpha | Erster Punkt\nBeta | Zweiter Punkt\n```',
      },
      {
        label: 'nexus-alert',
        description: 'info/success/warning/error',
        snippet: '```nexus-alert\nwarning\nWichtige Warnung fuer das Team.\n```',
      },
      {
        label: 'badge inline',
        description: 'Inline Badge Syntax',
        snippet: '`b:Nexus|magic`',
      },
    ],
  },
  {
    id: 'main-notes-markdown-reference',
    title: 'Nexus Main: Notes Markdown Referenz',
    app: 'main',
    category: 'markdown',
    summary:
      'Notes unterstuetzt Standard Markdown (inkl. Tabellen) sowie Nexus Custom Renderer fuer Widgets und Inline Badges.',
    guide: [
      { title: '1. Basissyntax schreiben', detail: 'Headings, Listen, Tabellen, Zitate, Links und Code wie gewohnt nutzen.' },
      { title: '2. Nexus Blöcke nutzen', detail: 'Fenced code blocks mit language nexus-* fuer strukturierte Widgets verwenden.' },
      { title: '3. Preview validieren', detail: 'Im Split/Preview Modus Renderausgabe und Lesbarkeit pruefen.' },
    ],
    points: [
      'Toolbar erzeugt schnell H2, Bold, Italic, Strikethrough, Quote, List, Table und Horizontal Rule.',
      'Inline Code rendert special badge syntax b:label|variant.',
      'Widget Renderers: list, alert, progress, timeline, grid, card.',
    ],
    commands: ['Ctrl+E', 'Ctrl+P', 'Ctrl+\\'],
    tags: ['markdown', 'notes', 'syntax', 'widgets'],
    sources: ['Nexus Main/src/views/NotesView.tsx', 'Nexus Main/src/views/notes/NotesMagicRenderers.tsx'],
    markdownSnippets: [
      {
        label: 'Tabellen',
        description: 'GFM Tabellen',
        snippet: '| Feld | Wert |\n| --- | --- |\n| Status | aktiv |\n| Owner | Product |',
      },
      {
        label: 'nexus-list',
        description: 'Zweispaltige Label/Detail Liste',
        snippet: '```nexus-list\nScope | v2 rollout\nOwner | Product + Eng\nBudget | TBD\n```',
      },
      {
        label: 'nexus-alert',
        description: 'Hinweisboxen (info/success/warning/error/magic)',
        snippet: '```nexus-alert\ninfo\nControl Promotion nur nach verify + build ausfuehren.\n```',
      },
      {
        label: 'Progress',
        description: 'Mehrere Fortschrittsbalken',
        snippet: '```nexus-progress\nFrontend | 80\nBackend | 65\nTests | 40\n```',
      },
      {
        label: 'Timeline',
        description: 'Roadmap Verlauf',
        snippet: '```nexus-timeline\nW1 | Discovery\nW2 | Build\nW3 | QA\nW4 | Release\n```',
      },
      {
        label: 'nexus-grid',
        description: 'Mehrspaltiges Raster mit Zeileninhalten',
        snippet: '```nexus-grid\n2\nAPI\nUI\nQA\nRollout\n```',
      },
      {
        label: 'nexus-card',
        description: 'Card mit Bild URL, Titel, Beschreibung',
        snippet: '```nexus-card\nhttps://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200 | Nexus Milestone | Production readiness complete.\n```',
      },
      {
        label: 'Inline Badge',
        description: 'Inline Marker fuer Statushinweise',
        snippet: '`b:Premium|success` und `b:Blocked|error`',
      },
      {
        label: 'Taskliste',
        description: 'Standard Markdown Task Checks',
        snippet: '- [x] Release Build\n- [ ] Control Promotion\n- [ ] Post-Deploy Smoke',
      },
    ],
  },
  {
    id: 'main-code-view-guide',
    title: 'Nexus Main: CodeView Guide',
    app: 'main',
    category: 'view',
    summary:
      'CodeView bietet Multi-Language Editing, JS/TS Ausfuehrung, HTML/CSS Preview, JSON Validation und best-effort Simulation fuer weitere Sprachen.',
    guide: [
      { title: '1. Sprache/Datei waehlen', detail: 'Neue Datei erzeugen und passende Language fuers Syntaxmodell setzen.' },
      { title: '2. Run oder Preview', detail: 'JS/TS direkt ausfuehren, HTML/CSS/Markdown im Preview Modus pruefen.' },
      { title: '3. Output analysieren', detail: 'Terminalausgabe, Fehlerhinweise und JSON-Fehlerpositionen nutzen.' },
    ],
    points: [
      'JS Runtime nutzt geschuetzten mock console Kontext.',
      'JSON zeigt Validierungsfehler inkl. Positionskontext.',
      'Befehle und Quick Actions sind auf schnellen Loop ausgelegt.',
    ],
    commands: ['Ctrl+Enter', 'Ctrl+S', 'Ctrl+Space', 'Alt+Shift+F', 'Ctrl+G'],
    tags: ['code', 'preview', 'runtime', 'json'],
    sources: ['Nexus Main/src/views/CodeView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-tasks-guide',
    title: 'Nexus Main: TasksView Guide',
    app: 'main',
    category: 'view',
    summary:
      'TasksView ist ein Kanban Workflow mit Prioritaeten, Deadlines, Tags, Subtasks, Markdown Notes und Stat-Bar.',
    guide: [
      { title: '1. Task erstellen', detail: 'In Zielspalte per Plus anlegen und Basisdaten setzen.' },
      { title: '2. Details pflegen', detail: 'Beschreibung, Deadline, Tags, Priority und Notes im Modal verwalten.' },
      { title: '3. Fortschritt steuern', detail: 'Per Drag & Drop zwischen todo/doing/done bewegen und Subtasks abhaken.' },
    ],
    points: [
      'Spalten: todo, doing, done.',
      'Prioritaeten low/mid/high sind farblich codiert.',
      'Overdue Deadlines werden visuell markiert.',
      'Task Modal besitzt Tabs fuer details, subtasks, notes.',
    ],
    commands: ['Drag & Drop zwischen Spalten', 'Double Click fuer Edit Modal'],
    tags: ['tasks', 'kanban', 'subtasks', 'deadlines'],
    sources: ['Nexus Main/src/views/TasksView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-reminders-guide',
    title: 'Nexus Main: RemindersView Guide',
    app: 'main',
    category: 'view',
    summary:
      'RemindersView organisiert zeitbasierte Erinnerungen mit Repeat, Snooze, Toast Alerts, Notes und Overdue Workflows.',
    guide: [
      { title: '1. Reminder anlegen', detail: 'Titel, Datum/Zeit und Repeat im Modal definieren.' },
      { title: '2. Quick Presets nutzen', detail: '+15m, +1h, +3h, Tomorrow und +1 week fuer schnellen Capture.' },
      { title: '3. Trigger bearbeiten', detail: 'Bei Ausloesung per Dismiss oder Snooze weiterfuehren.' },
    ],
    points: [
      'Checker prueft periodisch faellige Reminders.',
      'Toast Aktionen: Dismiss, Snooze 5m/15m/1h.',
      'Views/FIlter fuer upcoming, soon, overdue, done, all.',
      'Repeat Modi: none, daily, weekly, monthly.',
    ],
    commands: ['Quick set buttons', 'Snooze aus Karte oder Toast'],
    tags: ['reminders', 'notifications', 'snooze', 'repeat'],
    sources: ['Nexus Main/src/views/RemindersView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-canvas-guide',
    title: 'Nexus Main: CanvasView Vollguide',
    app: 'main',
    category: 'view',
    summary:
      'Canvas ist ein Infinite Board mit Node-System, Connections, Quick Add, Minimap, Layout Modes und Magic Templates inklusive AI Project Generator.',
    guide: [
      { title: '1. Board vorbereiten', detail: 'Canvas erstellen, Basis-Nodes anlegen und relevante Typen waehlen.' },
      { title: '2. Struktur aufbauen', detail: 'Nodes verbinden, Snap/Grid nutzen und ggf. Auto Layout (mindmap/timeline/board) anwenden.' },
      { title: '3. Navigieren und finalisieren', detail: 'Fit View, Minimap, Zoom Controls und Quick Add fuer schnellen Feinschliff einsetzen.' },
    ],
    points: [
      'Node Typen: markdown, project, goal, decision, risk plus weitere Content Typen.',
      'Hotkeys enthalten Delete, Escape, Ctrl+Z/Y, Ctrl+0 und Ctrl+M.',
      'Canvas akzeptiert Terminal Commands ueber nx-canvas-command Events.',
      'Snap-to-grid kann dynamisch aktiviert/deaktiviert werden.',
    ],
    commands: ['Ctrl+M', 'Ctrl+0', 'Space+Drag', 'Scroll Zoom'],
    tags: ['canvas', 'nodes', 'connections', 'auto-layout', 'ai-project'],
    sources: ['Nexus Main/src/views/CanvasView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-canvas-magic-menu-guide',
    title: 'Nexus Main: Canvas Magic Builder Guide',
    app: 'main',
    category: 'view',
    summary:
      'Der Canvas Magic Builder erzeugt komplette Projektstrukturen fuer Mindmap, Roadmap, Sprint, Risk Matrix, Decision Flow und AI Project.',
    guide: [
      { title: '1. Template waehlen', detail: 'Im Modal den passenden Strukturtyp auswaehlen.' },
      { title: '2. Parameter setzen', detail: 'Titel, includeNotes/includeTasks und bei AI Projekt Prompt + Depth setzen.' },
      { title: '3. Generierung ausfuehren', detail: 'Template erzeugen und anschliessend fit-view/layout anwenden.' },
    ],
    points: [
      'AI Project erzeugt Goals, Milestones, Risks, Decision Kontext und Delivery Tasks.',
      'Risk Matrix verteilt Nodes nach Impact/Wahrscheinlichkeit.',
      'Decision Flow erstellt Optionen, Tradeoff Risk und Expected Outcome.',
    ],
    commands: ['Canvas Toolbar -> Magic Builder', 'Terminal: canvas template <type> [name]'],
    tags: ['canvas-magic', 'templates', 'ai-project', 'pm'],
    sources: ['Nexus Main/src/views/canvas/CanvasMagicModal.tsx', 'Nexus Main/src/views/CanvasView.tsx'],
  },
  {
    id: 'main-canvas-markdown-reference',
    title: 'Nexus Main: Canvas Markdown Referenz',
    app: 'main',
    category: 'markdown',
    summary:
      'Markdown Nodes in Canvas rendern Nexus Blöcke fuer strukturierte Projektinformationen und Visualisierung direkt im Node.',
    guide: [
      { title: '1. Markdown Node erstellen', detail: 'Node type markdown oder Textfeld mit fenced blocks nutzen.' },
      { title: '2. Nexus Renderer einsetzen', detail: 'nexus-list/progress/alert/timeline/grid/card/kanban verwenden.' },
      { title: '3. Layout kombinieren', detail: 'Markdown Nodes mit goal/risk/decision nodes verbinden.' },
    ],
    points: [
      'Canvas hat eigene kompakte Renderer fuer dichte Karten.',
      'nexus-kanban ist fuer Sprint/Standup Flows verfuegbar.',
      'Ideal fuer Context Boards neben PM Nodes.',
    ],
    commands: ['canvas template sprint', 'canvas template decision'],
    tags: ['canvas', 'markdown', 'nexus-kanban', 'project-context'],
    sources: ['Nexus Main/src/views/canvas/CanvasMagicRenderers.tsx', 'Nexus Main/src/views/CanvasView.tsx'],
    markdownSnippets: [
      {
        label: 'Compact List',
        description: 'Owner/Kontext in dichten Nodes',
        snippet: '```nexus-list\nOwner | Product\nBudget | TBD\nDependencies | API, Design, QA\n```',
      },
      {
        label: 'Progress Board',
        description: 'Mehrere Delivery-Balken in einem Node',
        snippet: '```nexus-progress\nScope | 70\nReadiness | 55\nRisks mitigated | 40\n```',
      },
      {
        label: 'Timeline Board',
        description: 'Projektphasen als Node Timeline',
        snippet: '```nexus-timeline\nQ1 | Discovery\nQ2 | Build\nQ3 | QA\nQ4 | Rollout\n```',
      },
      {
        label: 'Kanban Mini',
        description: 'Standup/Flow innerhalb eines Nodes',
        snippet: '```nexus-kanban\nTodo | API Endpoint\nDoing | UI Flow\nReview | QA\n```',
      },
      {
        label: 'Risk Alert',
        description: 'Risiko-Hinweis im Node',
        snippet: '```nexus-alert\nwarning\nMitigation Owner pro kritischem Risiko definieren.\n```',
      },
      {
        label: 'Context Grid',
        description: 'Kontextfelder in Rasterform',
        snippet: '```nexus-grid\n2\nScope\nDependencies\nAssumptions\nKPIs\n```',
      },
      {
        label: 'Decision Card',
        description: 'Option inkl. Tradeoff-Meta',
        snippet: '```nexus-card\nOption A|Schneller Start|Mehr technisches Risiko\n```',
      },
    ],
  },
  {
    id: 'main-files-guide',
    title: 'Nexus Main: FilesView Guide',
    app: 'main',
    category: 'view',
    summary:
      'FilesView ist die zentrale Datei- und Workspace-Ebene fuer Notes, Code, Tasks und Reminders inklusive Grid/List und Workspace Assignment.',
    guide: [
      { title: '1. Workspace strukturieren', detail: 'Workspaces mit Name/Icon/Farbe/Description anlegen.' },
      { title: '2. Items durchsuchen', detail: 'Search + Typfilter ueber alle Inhalte nutzen.' },
      { title: '3. Zuweisen und oeffnen', detail: 'Items Workspaces zuordnen und per Double Click direkt oeffnen.' },
    ],
    points: [
      'Workspace Modal unterstuetzt visuelle Icon/Farbwahl.',
      'Assign Modal erlaubt Zuordnung zu mehreren Workspaces.',
      'List und Grid Modus fuer unterschiedliche Arbeitsdichten.',
    ],
    commands: ['Double click item', 'Add to Workspace'],
    tags: ['files', 'workspaces', 'search', 'assignment'],
    sources: ['Nexus Main/src/views/FilesView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-flux-guide',
    title: 'Nexus Main: FluxView Guide',
    app: 'main',
    category: 'view',
    summary:
      'FluxView zeigt den Aktivitaetsstream und System Pulse inklusive Typfilter und Timeline-Visualisierung.',
    guide: [
      { title: '1. Filter waehlen', detail: 'all/note/code/task/reminder verwenden.' },
      { title: '2. Events lesen', detail: 'Action, Target und Timestamp analysieren.' },
      { title: '3. Muster erkennen', detail: 'Auffaellige Haeufungen fuer Workflow-Optimierung nutzen.' },
    ],
    points: [
      'Timeline Punktfarbe richtet sich nach Aktivitaetstyp.',
      'Leerer Zustand wird klar kommuniziert.',
      'Ideal fuer schnelle Aktivitaets-Rekapitulation.',
    ],
    commands: ['Filter Chips oben in Flux'],
    tags: ['flux', 'activity-stream', 'audit-ui'],
    sources: ['Nexus Main/src/views/FluxView.tsx'],
  },
  {
    id: 'main-devtools-guide',
    title: 'Nexus Main: DevTools Guide',
    app: 'main',
    category: 'view',
    summary:
      'DevTools kombiniert Visual Builder, FS-like Editor und UI Calculator fuer schnelle Frontend-Ausarbeitung.',
    guide: [
      { title: '1. Struktur bauen', detail: 'HTML/CSS/JS Basis in integrierten Files bearbeiten.' },
      { title: '2. Styles iterieren', detail: 'Builder Controls fuer spacing, border, background, glow, blur und typo nutzen.' },
      { title: '3. Output uebernehmen', detail: 'CSS/Tailwind Snippets kopieren und in Zielprojekt einsetzen.' },
    ],
    points: [
      'Explorer erlaubt neue Dateien, Rename und Delete.',
      'Editor unterstuetzt Tab-Einrueckung und Language-spezifische Farben.',
      'Calculator deckt spacing/color/typography/layout/animation Berechnungen ab.',
    ],
    commands: ['Copy CSS', 'Copy Tailwind', 'New html/css/js file'],
    tags: ['devtools', 'builder', 'calculator', 'css'],
    sources: ['Nexus Main/src/views/DevToolsView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-info-view-guide',
    title: 'Nexus Main: InfoView Guide',
    app: 'main',
    category: 'view',
    summary:
      'InfoView ist die interne Produktdokumentation in Nexus Main mit Changelog, Feature-Guides, Shortcuts und Terminal-Referenz.',
    guide: [
      { title: '1. Release Stand pruefen', detail: 'Im Changelog Block aktive Version und Schwerpunkt-Aenderungen nachvollziehen.' },
      { title: '2. View Guides lesen', detail: 'Pro View die Kernfunktion und empfohlene Bedienfolge abrufen.' },
      { title: '3. Commands uebernehmen', detail: 'Shortcuts und Terminal-Kommandos direkt in den Workflow uebertragen.' },
    ],
    points: [
      'InfoView ist die dichteste In-App Wissensquelle fuer Main.',
      'Sections sind als aufklappbare Accordeons organisiert.',
      'Guides decken Dashboard, Notes, Canvas, Settings und Terminal ab.',
    ],
    commands: ['goto info', 'views', 'help'],
    tags: ['infoview', 'guides', 'changelog', 'shortcuts'],
    sources: ['Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-settings-overview',
    title: 'Nexus Main: Settings Gesamtguide',
    app: 'main',
    category: 'settings',
    summary:
      'Settings ist ein Hub aus Theme, Glass, Glow, Background, Layout, Workspace, Motion und Editor mit Live Preview und JSON Export/Import.',
    guide: [
      { title: '1. Tab waehlen', detail: 'Ueber Sidebar und Tab-Suche den relevanten Einstellungsbereich oeffnen.' },
      { title: '2. Live testen', detail: 'Aenderungen direkt im Live Preview beobachten.' },
      { title: '3. Konfiguration sichern', detail: 'Theme speichern, exportieren oder importieren.' },
    ],
    points: [
      'UX Profiles: focus, cinematic, compact.',
      'Quick Toggles: reduced motion, high contrast, toolbar visibility.',
      'Workspace Reset Aktionen fuer Spotlight, Terminal und Dashboard.',
    ],
    commands: ['Save Theme', 'Export JSON', 'Import JSON'],
    tags: ['settings', 'theme', 'preview', 'profiles'],
    sources: ['Nexus Main/src/views/SettingsView.tsx', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'main-settings-theme-glass',
    title: 'Nexus Main: Theme und Glass Tabs',
    app: 'main',
    category: 'settings',
    summary:
      'Theme Tab steuert Presets/Farben/Fonts, Glass Tab steuert Blur, Saturation, Tint, Border und Spezialeffekte.',
    guide: [
      { title: '1. Preset als Basis', detail: 'Ein Preset auswaehlen und danach gezielt Farben/Fonts anpassen.' },
      { title: '2. Glass Modus setzen', detail: 'default/frosted/crystal/neon/matte/mirror anhand Lesbarkeit und Tiefe waehlen.' },
      { title: '3. Feintuning', detail: 'Panel Blur, Border Opacity, Noise, Chromatic Aberration und Tint ausbalancieren.' },
    ],
    points: [
      'Global Font wirkt auf die gesamte App Typografie.',
      'Frosted Glass kann hohe Blur-Werte erzwingen.',
      'Border Glow und Noise Overlay sind separat steuerbar.',
    ],
    commands: ['Preset Buttons', 'Glass Mode Picker'],
    tags: ['theme', 'glass', 'blur', 'fonts'],
    sources: ['Nexus Main/src/views/SettingsView.tsx'],
  },
  {
    id: 'main-settings-glow-background',
    title: 'Nexus Main: Glow und Background Tabs',
    app: 'main',
    category: 'settings',
    summary:
      'Glow Tab steuert Leuchtverhalten (Mode/Farben/Intensitaet), Background Tab steuert App-Hintergrund, Panelmuster und Overlays.',
    guide: [
      { title: '1. Glow Basis setzen', detail: 'Glow mode, intensity, radius und spread passend zum Theme setzen.' },
      { title: '2. Farbverlauf definieren', detail: 'Glow Farbe 1/2 und Gradient Winkel abstimmen.' },
      { title: '3. Background Layering', detail: 'solid/gradient/mesh/aurora und Overlay Optionen wie vignette/scanlines kombinieren.' },
    ],
    points: [
      'Glow kann animated mit rotation speed laufen.',
      'Background kennt panelBgMode fuer Pattern-Layer.',
      'Overlay opacity hilft bei Kontrastkontrolle.',
    ],
    commands: ['Glow Modus Chips', 'Background Mode Chips'],
    tags: ['glow', 'background', 'vignette', 'mesh', 'aurora'],
    sources: ['Nexus Main/src/views/SettingsView.tsx'],
  },
  {
    id: 'main-settings-layout-workspace',
    title: 'Nexus Main: Layout und Workspace Tabs',
    app: 'main',
    category: 'settings',
    summary:
      'Layout Tab steuert Sidebar/Panel/Toolbar/Accessibility, Workspace Tab steuert Productivity Toggles und Reset Aktionen.',
    guide: [
      { title: '1. Sidebar konfigurieren', detail: 'Style, Width, Position, Labels und Accent Background setzen.' },
      { title: '2. UI Dichte abstimmen', detail: 'Panel Radius, Shadow Depth, spacing density und kompakt modus justieren.' },
      { title: '3. Workspace hygiene', detail: 'Spotlight Recents, Terminal History/Macros und Dashboard Layout bei Bedarf resetten.' },
    ],
    points: [
      'Toolbar kann mode, position, visible und height erhalten.',
      'High Contrast und Tooltips sind separat schaltbar.',
      'Workspace Tab bietet direkte Spotlight/Terminal Aktionen.',
    ],
    commands: ['Spotlight oeffnen', 'Terminal oeffnen/schliessen', 'Dashboard Layout zuruecksetzen'],
    tags: ['layout', 'workspace', 'sidebar', 'toolbar', 'qol'],
    sources: ['Nexus Main/src/views/SettingsView.tsx'],
  },
  {
    id: 'main-settings-motion-editor',
    title: 'Nexus Main: Motion und Editor Tabs',
    app: 'main',
    category: 'settings',
    summary:
      'Motion Tab steuert Animationstiefe und Accessibility, Editor Tab steuert Code- und Notes-Editor Verhalten bis zum kompletten Reset.',
    guide: [
      { title: '1. Motion Budget setzen', detail: 'Animation speed und entry style definieren.' },
      { title: '2. Effekte feinsteuern', detail: 'entry/page/hover/ripple/glow/float/border/particle toggles je nach Performanceprofil setzen.' },
      { title: '3. Editor Konsistenz sichern', detail: 'autosave, word wrap, line numbers, minimap, tab size und notes font zentral anpassen.' },
    ],
    points: [
      'Reduced Motion deaktiviert intensive Animationen.',
      'Autosave Interval ist im Editor Tab einstellbar.',
      'Settings Reset kann komplette Konfiguration auf Basiswerte bringen.',
    ],
    commands: ['Reset Settings Button'],
    tags: ['motion', 'editor', 'accessibility', 'performance'],
    sources: ['Nexus Main/src/views/SettingsView.tsx'],
  },
  {
    id: 'main-terminal-spotlight-guide',
    title: 'Nexus Main: Terminal und Spotlight Guide',
    app: 'main',
    category: 'workflow',
    summary:
      'Terminal ist eine command-driven Workflow-Schicht mit Macro-System, Undo/Redo, Canvas Integration und Spotlight Bridge.',
    guide: [
      { title: '1. Navigation', detail: 'help, views, goto und spotlight fuer schnelle App-Wechsel nutzen.' },
      { title: '2. Operative Aktionen', detail: 'new/search/stats/today/calc fuer taegliche Produktivitaet einsetzen.' },
      { title: '3. Automatisieren', detail: 'macro start/stop/run fuer wiederkehrende Kommando-Sequenzen nutzen.' },
    ],
    points: [
      'Canvas Kommandos triggern layout/template/focus Events direkt im View.',
      'Macro recursion guard blockiert Endlosschleifen.',
      'Undo/Redo verwaltet Command-Timeline separat.',
    ],
    commands: [
      'help',
      'goto <view>',
      'canvas template <type> [name]',
      'macro start <name>',
      'macro run <name>',
      'profile <focus|cinematic|compact|default>',
    ],
    tags: ['terminal', 'spotlight', 'macros', 'commands'],
    sources: ['Nexus Main/src/store/terminalStore.ts', 'Nexus Main/src/views/InfoView.tsx'],
  },
  {
    id: 'mobile-overview',
    title: 'Nexus Mobile Gesamtguide',
    app: 'mobile',
    category: 'overview',
    summary:
      'Nexus Mobile bildet die Main Kernviews auf mobilem Formfaktor mit adaptiver Navigation und haptisch orientierter Bedienung ab.',
    guide: [
      { title: '1. Navigation verstehen', detail: 'Bottom Tabs fuer Kernbereiche plus More Drawer fuer erweiterte Views.' },
      { title: '2. Feature-Paritaet pruefen', detail: 'Notes/Code/Tasks/Reminders/Canvas/Files/Settings/Info sind mobil verfuegbar.' },
      { title: '3. Runtime Verhalten beachten', detail: 'View Allowlist und Entitlements werden weiterhin zentral erzwungen.' },
    ],
    points: [
      'Safe-Area und Mobile UX sind priorisiert.',
      'Bottom Navigation ist auf schnelle Einhandbedienung ausgelegt.',
      'Terminal Store bietet mobile-kompatible Commands.',
    ],
    commands: ['npm run dev:mobile:android', 'npm run dev:mobile:ios'],
    tags: ['mobile', 'parity', 'navigation'],
    sources: ['Nexus Mobile/src/components/MobileNav.tsx', 'Nexus Mobile/src/views/InfoView.tsx'],
  },
  {
    id: 'mobile-navigation-guide',
    title: 'Nexus Mobile Navigation Guide',
    app: 'mobile',
    category: 'view',
    summary:
      'Mobile Navigation nutzt Bottom Tabs, More Drawer, Haptic Events und Runtime View-Restriktionen.',
    guide: [
      { title: '1. Primaries nutzen', detail: 'Home/Notes/Tasks/Reminders sind direkt in der Bottom Bar.' },
      { title: '2. More Drawer aufrufen', detail: 'Weitere Views wie Code, Canvas, Files, DevTools, Flux, Settings, Info oeffnen.' },
      { title: '3. Runtime Allowlist beachten', detail: 'Nur erlaubte Views werden in Navigation wirklich freigeschaltet.' },
    ],
    points: [
      'Haptic Light Feedback begleitet wichtige Navigationen.',
      'Safe-Area Insets sind fuer moderne Displays einkalkuliert.',
      'Navigation Labels bleiben konsistent zu Main.',
    ],
    commands: ['MobileNav primary taps', 'More drawer open'],
    tags: ['bottom-nav', 'safe-area', 'haptics', 'drawer'],
    sources: ['Nexus Mobile/src/components/MobileNav.tsx', 'Nexus Mobile/src/components/Sidebar.tsx'],
  },
  {
    id: 'mobile-views-settings-guide',
    title: 'Nexus Mobile Views und Settings Guide',
    app: 'mobile',
    category: 'settings',
    summary:
      'Die mobile App nutzt dieselben Kern-View-Konzepte wie Main mit angepasster Darstellung und Touch-orientierten Interaktionen.',
    guide: [
      { title: '1. View-Basics', detail: 'Notes/Code/Tasks/Reminders/Canvas/Files wie in Main nutzen, aber mit mobilen Layoutabstufungen.' },
      { title: '2. Settings einsetzen', detail: 'Theme/Glass/Glow/Background/Layout/Motion/Editor auch mobil fuer UX Profiling nutzen.' },
      { title: '3. Input und Dichte abstimmen', detail: 'Kompaktere Dichten und reduzierte Motion je nach Device-Leistung setzen.' },
    ],
    points: [
      'InfoView in Mobile dokumentiert changelog, shortcuts und view patterns.',
      'Settings bleiben der zentrale Ort fuer visuelle Konsistenz.',
      'Die mobile Variante priorisiert lesbare, touch-freundliche Targets.',
    ],
    commands: ['Ctrl/Cmd+K (falls Hardware Keyboard)', 'Terminal palette'],
    tags: ['mobile-views', 'mobile-settings', 'parity'],
    sources: ['Nexus Mobile/src/views/InfoView.tsx', 'Nexus Mobile/src/views/SettingsView.tsx'],
  },
  {
    id: 'mobile-terminal-guide',
    title: 'Nexus Mobile Terminal Guide',
    app: 'mobile',
    category: 'workflow',
    summary:
      'Das mobile Terminal stellt einen schlanken, schnellen Command-Satz fuer Navigation, Create-Flows, Search und Theme Steuerung bereit.',
    guide: [
      { title: '1. Hilfe und Views', detail: 'help und views verwenden, dann goto fuer Navigation.' },
      { title: '2. Schnelles Erstellen', detail: 'new note/task/reminder/code fuer schnelle Capture-Flows.' },
      { title: '3. Suche und Palette', detail: 'search <query> und palette als zentrale Launcher nutzen.' },
    ],
    points: [
      'Commandset ist kompakter als in Main.',
      'list notes/tasks/reminders zeigt schnelle Vorschauen.',
      'theme dark/light und preset sind direkt verfuegbar.',
    ],
    commands: ['help', 'goto <view>', 'new note|task|reminder|code', 'palette'],
    tags: ['mobile-terminal', 'commands', 'launcher'],
    sources: ['Nexus Mobile/src/store/terminalStore.ts'],
  },
  {
    id: 'code-overview',
    title: 'Nexus Code Gesamtguide',
    app: 'code',
    category: 'overview',
    summary:
      'Nexus Code ist die Desktop IDE Surface mit Panel-Stack, Dateiworkflow, Command Palette, Spotlight und Terminal.',
    guide: [
      { title: '1. Route und Access', detail: 'Editor laeuft auf /editor und validiert View Access ueber Runtime.' },
      { title: '2. Panel Stack nutzen', detail: 'Explorer/Search/Problems/Git/Debug/Extensions je nach Task oeffnen.' },
      { title: '3. Editor Loop', detail: 'Tabs verwalten, speichern, auto-save und Terminal/Problems parallel beobachten.' },
    ],
    points: [
      'Settings und Files werden lokal persistiert.',
      'TitleBar bietet Open Folder, Sidebar Toggle, Zen Mode und Command Palette.',
      'Bottom Tab nutzt terminal/problems als Arbeitsfenster.',
    ],
    commands: ['Ctrl+S', 'Ctrl+B', 'Ctrl+`', 'Ctrl+W', 'Ctrl+P', 'Ctrl+Shift+P'],
    tags: ['ide', 'editor', 'panels', 'desktop'],
    sources: ['Nexus Code/src/App.jsx', 'Nexus Code/src/pages/Editor.jsx', 'Nexus Code/src/components/editor/Sidebar.jsx'],
  },
  {
    id: 'code-panels-guide',
    title: 'Nexus Code Panel Guide',
    app: 'code',
    category: 'view',
    summary:
      'Die Sidebar steuert Explorer, Search, Problems, Git, Debug und Extensions als zentrale Arbeitskontexte.',
    guide: [
      { title: '1. Explorer', detail: 'Dateien/Folder anlegen, oeffnen, umbenennen, loeschen und strukturieren.' },
      { title: '2. Analyse Panels', detail: 'Search fuer globale Suche, Problems fuer Diagnostics, Debug fuer Laufzeitpunkte.' },
      { title: '3. Delivery Panels', detail: 'Git fuer Sync/Versionierung und Extensions fuer Erweiterungsverwaltung.' },
    ],
    points: [
      'Aktiver Panelstatus ist klar ueber Sidebar Indicator sichtbar.',
      'Panel kann eingeklappt werden, um Editorflaeche zu vergroessern.',
      'Problems Badge signalisiert offene Issues direkt am Editor.',
    ],
    commands: ['toggle-panel(explorer|search|problems|git|debug|extensions)'],
    tags: ['panels', 'explorer', 'git', 'debug', 'problems'],
    sources: ['Nexus Code/src/components/editor/Sidebar.jsx', 'Nexus Code/src/pages/Editor.jsx'],
  },
  {
    id: 'code-workflow-guide',
    title: 'Nexus Code Workflow Guide',
    app: 'code',
    category: 'workflow',
    summary:
      'Code Workflow verbindet Open Folder, Tab Management, Auto Save, Command Palette und Spotlight fuer schnellen IDE Betrieb.',
    guide: [
      { title: '1. Workspace oeffnen', detail: 'Open Folder laden, Filestruktur in Explorer synchronisieren.' },
      { title: '2. Editieren', detail: 'Aktive Tabs bearbeiten; Auto Save markiert modified Status bis Persistierung.' },
      { title: '3. Schnellnavigation', detail: 'Command Palette (Ctrl+P/Ctrl+Shift+P) und Shift Shift Spotlight einsetzen.' },
    ],
    points: [
      'Command Aktionen enthalten new-file, toggle-terminal, github-sync und open-settings.',
      'Keyboard Shortcuts global registriert.',
      'Zen Mode und Sidebar Visibility lassen Fokuskontexte bauen.',
    ],
    commands: ['Ctrl+P', 'Ctrl+Shift+P', 'Shift x2', 'TitleBar: Open Folder'],
    tags: ['workflow', 'command-palette', 'spotlight', 'autosave'],
    sources: ['Nexus Code/src/pages/Editor.jsx'],
  },
  {
    id: 'code-settings-guide',
    title: 'Nexus Code Settings Guide',
    app: 'code',
    category: 'settings',
    summary:
      'Nexus Code besitzt ein eigenes Settingsmodell fuer Theme, Background, Editor Rendering und Workspace Verhalten.',
    guide: [
      { title: '1. Theme/BG setzen', detail: 'theme und background Presets fuer Editor shell waehlen.' },
      { title: '2. Editor Verhalten', detail: 'font_size, tab_size, line_numbers, word_wrap, minimap und auto_save steuern.' },
      { title: '3. Layout Verhalten', detail: 'sidebar_position, status_bar_visible und zen_mode auf Arbeitsstil abstimmen.' },
    ],
    points: [
      'Settings persistieren in nexus-code-settings.',
      'Reset setzt Defaults und laedt Editor neu.',
      'Accent Farben koennen separat ueber primary/secondary konfiguriert werden.',
    ],
    commands: ['open-settings (command palette)', 'reset settings'],
    tags: ['settings', 'editor-config', 'theme', 'zen-mode'],
    sources: ['Nexus Code/src/pages/Editor.jsx'],
  },
  {
    id: 'code-mobile-overview',
    title: 'Nexus Code Mobile Gesamtguide',
    app: 'code-mobile',
    category: 'overview',
    summary:
      'Code Mobile uebertraegt den IDE-Stack auf native Mobile mit Capacitor Filesystem Bridge und MobileBottomNav.',
    guide: [
      { title: '1. Native Setup', detail: 'cap:sync und nativen Build/Run nutzen.' },
      { title: '2. Panel Nutzung', detail: 'Explorer/Search/Git/Debug/Extensions/Problems wie Desktop nutzen.' },
      { title: '3. Mobile Verhalten', detail: 'Auf Mobile schliesst sich der Panel Drawer nach File-Open fuer mehr Editorplatz.' },
    ],
    points: [
      'nativeFS liefert Dateioperationen fuer mobile Dateisysteme.',
      'Minimap wird auf mobilen Geraeten standardmaessig deaktiviert.',
      'MobileBottomNav bildet Kernpanels plus Settings ab.',
    ],
    commands: ['npm run cap:sync', 'npx cap open android', 'npx cap open ios'],
    tags: ['code-mobile', 'nativefs', 'capacitor', 'mobile-ide'],
    sources: ['Nexus Code Mobile/src/pages/Editor.jsx', 'Nexus Code Mobile/README.md'],
  },
  {
    id: 'code-mobile-nav-guide',
    title: 'Nexus Code Mobile Navigation Guide',
    app: 'code-mobile',
    category: 'view',
    summary:
      'Code Mobile ergaenzt Desktop Sidebar durch eine mobile Bottom Navigation mit aktivem Indicator und Settings Slot.',
    guide: [
      { title: '1. BottomNav nutzen', detail: 'Explorer/Search/Problems/Git/Debug sind direkt unten erreichbar.' },
      { title: '2. Settings oeffnen', detail: 'Letzter Slot oeffnet Editor Settings Overlay.' },
      { title: '3. Panel aufraeumen', detail: 'Bei Dateioeffnung wird Panel auf Mobile reduziert, um Fokus auf den Editor zu setzen.' },
    ],
    points: [
      'Nav enthaelt Safe-Area Padding.',
      'Active Indicator nutzt Motion animationen.',
      'Desktop Sidebar bleibt fuer groessere Screens verfuegbar.',
    ],
    commands: ['MobileBottomNav taps'],
    tags: ['bottom-nav', 'mobile-panel', 'settings'],
    sources: ['Nexus Code Mobile/src/components/editor/Sidebar.jsx', 'Nexus Code Mobile/src/pages/Editor.jsx'],
  },
  {
    id: 'code-mobile-settings-guide',
    title: 'Nexus Code Mobile Settings Guide',
    app: 'code-mobile',
    category: 'settings',
    summary:
      'Settings in Code Mobile folgen Desktop Defaults, sind aber fuer mobile Lesbarkeit und Performance angepasst.',
    guide: [
      { title: '1. Theme und Font', detail: 'Editor visuell auf Display und Umgebungslicht anpassen.' },
      { title: '2. Editing Verhalten', detail: 'word wrap, line numbers, tab size und auto save passend zu Touch-Workflows setzen.' },
      { title: '3. Performance auf Mobile', detail: 'minimap deaktiviert halten, wenn Bildschirm klein oder Geraet langsamer ist.' },
    ],
    points: [
      'Settings werden ebenso lokal persistiert.',
      'Mobile erzwingt minimap=false im Editor props.',
      'Zen und sidebar toggles funktionieren auch mobil.',
    ],
    commands: ['open-settings', 'toggle zen mode'],
    tags: ['mobile-settings', 'editor', 'performance'],
    sources: ['Nexus Code Mobile/src/pages/Editor.jsx'],
  },
  {
    id: 'control-live-sync-guide',
    title: 'Control: Live Sync Guide',
    app: 'control',
    category: 'workflow',
    summary:
      'Der Live Sync Tab in Control dient als Light Builder fuer Catalog/Schema und Promotion in production.',
    guide: [
      { title: '1. Runtime laden', detail: 'Aktuelle Runtime Daten einlesen.' },
      { title: '2. Staging bearbeiten', detail: 'Catalog und Schema in staging anpassen und validieren.' },
      { title: '3. Promote', detail: 'Nach Checks auf production promoten.' },
    ],
    points: [
      'Aenderungen folgen einem kontrollierten Freigabeprozess.',
      'Schema Validation blockiert ungueltige Komponenten.',
      'Promotion ist ein expliziter Schritt.',
    ],
    commands: ['Control UI -> Live Sync'],
    tags: ['control', 'live-sync', 'promotion'],
    sources: ['docs/USER_GUIDE.md', 'docs/DEVELOPER_GUIDE.md'],
  },
  {
    id: 'control-paywalls-guide',
    title: 'Control: Paywalls Guide',
    app: 'control',
    category: 'workflow',
    summary:
      'Paywalls Tab verwaltet Tier-Views und User-Templates zur serverseitigen Entitlement-Auswertung.',
    guide: [
      { title: '1. Tier Modell pflegen', detail: 'Definiere, welche Views je Tier freigeschaltet sind.' },
      { title: '2. User Templates zuordnen', detail: 'Ordne Nutzergruppen/Tiers konsistent zu.' },
      { title: '3. App-Verhalten pruefen', detail: 'Blockierte Views muessen in Clients als Paywall/Hint erscheinen.' },
    ],
    points: [
      'Website Login Flow muss mit API Entitlement Entscheidungen harmonieren.',
      'Nur API ist autoritativ fuer Freigaben.',
      'UI-only Unlocks sind kein Sicherheitsmodell.',
    ],
    commands: ['Control UI -> Paywalls'],
    tags: ['paywalls', 'tiers', 'entitlements', 'control'],
    sources: ['docs/USER_GUIDE.md'],
  },
  {
    id: 'control-dashboard-guide',
    title: 'Control: Dashboard Tab Guide',
    app: 'control',
    category: 'view',
    summary:
      'Dashboard zeigt Health-Metriken, Registry-Zustand und Eventvolumen fuer alle angebundenen Apps.',
    guide: [
      { title: '1. Metriken lesen', detail: 'Online Apps, Stale Apps, Events Total und Avg View Render als erste Lagebewertung nutzen.' },
      { title: '2. Registry pruefen', detail: 'App Status, Version, Last Seen, Route und Stale Flags in der Tabelle validieren.' },
      { title: '3. Ausreisser verfolgen', detail: 'Stale Clients und auffaellige Renderzeiten fuer Incident-Analyse markieren.' },
    ],
    points: [
      'Dashboard ist die operative Startansicht der Control Plane.',
      'Stale Kennzahl hilft bei Offline/Outdated Client-Erkennung.',
      'Version + Route Daten sind wichtig fuer Rollout Debugging.',
    ],
    commands: ['Control UI -> Dashboard'],
    tags: ['control-dashboard', 'registry', 'metrics', 'observability'],
    sources: ['../Nexus Control/src/layout/workspace/dashboard.js'],
  },
  {
    id: 'control-build-guide',
    title: 'Control: Build Tab Guide',
    app: 'control',
    category: 'ops',
    summary:
      'Build Tab liefert Build-Manifest Einsicht und den zentralen Build-Kommandopfad fuer das Ecosystem.',
    guide: [
      { title: '1. Manifest laden', detail: 'Build Manifest aktualisieren und letzte Ecosystem-Build Daten pruefen.' },
      { title: '2. Versionsstand vergleichen', detail: 'Manifestinformationen gegen aktuelle Repo-Artefakte abgleichen.' },
      { title: '3. Build-Runs starten', detail: 'Build Command Guide fuer zielgerichtete Build/Verify Ausfuehrung verwenden.' },
    ],
    points: [
      'Manifest hilft bei Nachvollziehbarkeit zwischen Promotion und Build-Zustand.',
      'verify:ecosystem bleibt Pflicht vor Promotion.',
      'Tab reduziert Wechsel zwischen CI und lokaler Betriebsansicht.',
    ],
    commands: ['Control UI -> Build -> Manifest laden', 'npm run build:ecosystem:fast', 'npm run verify:ecosystem'],
    tags: ['build', 'manifest', 'verify', 'release-ops'],
    sources: ['../Nexus Control/src/layout/workspace/build.js'],
  },
  {
    id: 'control-settings-guide',
    title: 'Control: Settings Tab Guide',
    app: 'control',
    category: 'settings',
    summary:
      'Settings Tab verwaltet globales Runtime-Verhalten und app-spezifische Config fuer main/mobile/code/code-mobile/control.',
    guide: [
      { title: '1. Global Config laden', detail: 'Globale Policies und Runtime Defaults im JSON Editor pruefen.' },
      { title: '2. App Config waehlen', detail: 'Target App selektieren, Config laden und differenziert anpassen.' },
      { title: '3. Save kontrollieren', detail: 'Aenderungen speichern und Ergebnisstatus sauber pruefen.' },
    ],
    points: [
      'Global Config gilt app-uebergreifend und wirkt auf Runtime Verhalten.',
      'App Config erlaubt gezieltes Tuning je Surface.',
      'Fehlerhafte Config kann View-Drift erzeugen, daher immer validieren.',
    ],
    commands: ['Control UI -> Settings -> Global Config speichern', 'Control UI -> Settings -> App Config speichern'],
    tags: ['control-settings', 'config', 'runtime-defaults'],
    sources: ['../Nexus Control/src/layout/workspace/settings.js'],
  },
  {
    id: 'control-commands-guide',
    title: 'Control: Commands Tab Guide',
    app: 'control',
    category: 'workflow',
    summary:
      'Command Center erstellt priorisierte Befehle mit TTL, optionalem Idempotency Key und JSON Payload fuer Ziel-Apps.',
    guide: [
      { title: '1. Target + Typ setzen', detail: 'Target App und Command Type entsprechend Use-Case definieren.' },
      { title: '2. Delivery Parameter setzen', detail: 'Priority, TTL und optionalen Idempotency Key fuer sichere Auslieferung konfigurieren.' },
      { title: '3. Queue beobachten', detail: 'Command Queue nach Erstellung auf Zustellung und Wiederholungen kontrollieren.' },
    ],
    points: [
      'Idempotency Key verhindert doppelte Seiteneffekte bei Retries.',
      'TTL begrenzt veraltete Command-Ausfuehrungen.',
      'Payload sollte strikt JSON-valid bleiben.',
    ],
    commands: ['Control UI -> Commands -> Command erstellen', 'Control UI -> Commands -> Queue beobachten'],
    tags: ['commands', 'queue', 'idempotency', 'ttl'],
    sources: ['../Nexus Control/src/layout/workspace/commands.js'],
  },
  {
    id: 'control-policies-guide',
    title: 'Control: Policies Tab Guide',
    app: 'control',
    category: 'security',
    summary:
      'Policies Tab ist die zentrale Pflegeflaeche fuer Security-Richtlinien und Owner-Restriktionen.',
    guide: [
      { title: '1. Policies laden', detail: 'Aktuelle Security Policies als Baseline einlesen.' },
      { title: '2. Richtlinien absichern', detail: 'Zugriffs- und Sicherheitsregeln konsistent halten.' },
      { title: '3. Save + Audit', detail: 'Nach Speichern Audit Log und API Status fuer Policy-Drift pruefen.' },
    ],
    points: [
      'Policies wirken direkt auf die Zugriffskontrolle im Betrieb.',
      'Unsichere Policies koennen Baseline Enforcement triggern.',
      'Aenderungen immer mit Security Team abstimmen.',
    ],
    commands: ['Control UI -> Policies -> Policies speichern'],
    tags: ['policies', 'owner-only', 'security-baseline'],
    sources: ['../Nexus Control/src/layout/workspace/policies.js', 'docs/SECURITY.md'],
  },
  {
    id: 'control-devices-guide',
    title: 'Control: Devices Tab Guide',
    app: 'control',
    category: 'security',
    summary:
      'Devices Tab verwaltet die Admin-Device-Allowlist inklusive Rollen, Freigabe und Sperrung.',
    guide: [
      { title: '1. Device identifizieren', detail: 'Device ID und Label aus vertrauenswuerdiger Quelle uebernehmen.' },
      { title: '2. Rollen setzen', detail: 'Rollen-CSV bewusst klein halten (admin/developer nur wenn noetig).' },
      { title: '3. Lifecycle pflegen', detail: 'Geraete freigeben, alte Geraete sperren und Liste regelmaessig aktualisieren.' },
    ],
    points: [
      'Device Control ist kritischer Teil der Login-Haertung.',
      'Rollen sollten minimal nach least-privilege vergeben werden.',
      'Refresh erlaubt schnelle Validierung nach Freigabe/Sperrung.',
    ],
    commands: ['Control UI -> Devices -> Geraet freigeben', 'Control UI -> Devices -> Geraet sperren', 'Control UI -> Devices -> Liste laden'],
    tags: ['devices', 'allowlist', 'admin-security'],
    sources: ['../Nexus Control/src/layout/workspace/devices.js', 'docs/SECURITY.md'],
  },
  {
    id: 'control-audit-guide',
    title: 'Control: Audit Tab Guide',
    app: 'control',
    category: 'security',
    summary:
      'Audit Tab zeigt sicherheitsrelevante und operative Events zur Nachverfolgung von Mutation, Policy und Device Aktionen.',
    guide: [
      { title: '1. Audit Feed laden', detail: 'Aktuelle Events aus Audit Log abrufen.' },
      { title: '2. Kritische Muster suchen', detail: 'Ungewoehnliche Policy- und Device-Events priorisieren.' },
      { title: '3. Incident Trail sichern', detail: 'Auffaellige Eventketten fuer Postmortem und Rotation-Massnahmen dokumentieren.' },
    ],
    points: [
      'Audit ist zentrale Quelle fuer forensische Nachvollziehbarkeit.',
      'Security-relevante Fehlermuster sollten zeitnah behandelt werden.',
      'Audit Review ist Teil des Regelbetriebs.',
    ],
    commands: ['Control UI -> Audit'],
    tags: ['audit', 'incident', 'security-observability'],
    sources: ['../Nexus Control/src/layout/workspace/audit.js'],
  },
  {
    id: 'control-guides-tab-guide',
    title: 'Control: Guides Tab Guide',
    app: 'control',
    category: 'view',
    summary:
      'Guides Tab zeigt zentral gepflegte Betriebsdokumentation direkt in der Control-Oberflaeche.',
    guide: [
      { title: '1. Guide-Liste laden', detail: 'Verfuegbare Guides aus der angebundenen Guide-Quelle einlesen.' },
      { title: '2. Zielguide waehlen', detail: 'Passenden Guide selektieren und Inhalt in der Vorschau laden.' },
      { title: '3. Im Betrieb nutzen', detail: 'Guides fuer Troubleshooting und Releaseablauf direkt in Control referenzieren.' },
    ],
    points: [
      'Guide Inhalte werden serverseitig bereitgestellt.',
      'Tab reduziert Kontextwechsel zu externen Dokuquellen.',
      'Leere Guide-Liste deutet auf API Datenpflegebedarf hin.',
    ],
    commands: ['Control UI -> Guides -> Guide laden'],
    tags: ['guides', 'api-docs', 'control-wiki'],
    sources: ['../Nexus Control/src/layout/workspace/guides.js', '../Nexus Control/src/control/workspace/guides.js'],
  },
  {
    id: 'main-paywall-view-guard-guide',
    title: 'Nexus Main: Paywall View Guard Guide',
    app: 'main',
    category: 'security',
    summary:
      'Nexus Main blockiert nicht berechtigte Views clientseitig sichtbar, waehrend die finale Autorisierung API-seitig erfolgt.',
    guide: [
      { title: '1. Login UX triggern', detail: 'Bei Zugriff auf Premium-Bereiche Login/Upgrade Hinweis ausgeben.' },
      { title: '2. View Access pruefen', detail: 'Vor View-Wechsel den aktuellen Zugriffsstatus auswerten.' },
      { title: '3. Blockzustand klar darstellen', detail: 'Blocked View, requiredTier und reason fuer Nutzer transparent anzeigen.' },
    ],
    points: [
      'Clientseitige Sperre ist UX-Layer, nicht Sicherheitsanker.',
      'API entscheidet final ueber Entitlement.',
      'Guards decken auch remote navigation/profile Regeln ab.',
    ],
    commands: ['Login/Upgrade Prompt anzeigen', 'View-Wechsel nach Zugriffsstatus steuern'],
    tags: ['paywall', 'entitlement', 'view-guard', 'main-app'],
    sources: ['Nexus Main/src/App.tsx'],
  },
  {
    id: 'mobile-paywall-view-guard-guide',
    title: 'Nexus Mobile: Paywall View Guard Guide',
    app: 'mobile',
    category: 'security',
    summary:
      'Auch in Mobile erzwingt der View Guard klare Paywall-Hinweise bei gesperrten Views und verhindert Navigation in nicht freigegebene Bereiche.',
    guide: [
      { title: '1. Navigation intercepten', detail: 'Navigation prueft den Zugriffsstatus vor dem Wechsel.' },
      { title: '2. Guard State rendern', detail: 'Checking/Blocked Zustande im mobilen Layout sichtbar anzeigen.' },
      { title: '3. Upgrade Pfad anbieten', detail: 'Nutzer aus blockierter Ansicht in Login/Account Flow leiten.' },
    ],
    points: [
      'Bottom-Nav und Sidebar respektieren dieselbe Allowlist.',
      'Remote Navigation Profile duerfen nur erlaubte Views mappen.',
      'Tier Hinweise bleiben konsistent zu Desktop Main.',
    ],
    commands: ['Login/Upgrade Prompt anzeigen', 'Navigation nach Zugriffsstatus steuern'],
    tags: ['mobile-paywall', 'view-guard', 'entitlement'],
    sources: ['Nexus Mobile/src/App.tsx'],
  },
  {
    id: 'environment-variables-guide',
    title: 'Konfigurations-Grundlagen Guide',
    app: 'ecosystem',
    category: 'runtime',
    summary:
      'Die oeffentliche Dokumentation beschreibt nur allgemeine Konfigurationsprinzipien; konkrete Betriebswerte bleiben intern.',
    guide: [
      { title: '1. App Konfiguration trennen', detail: 'Entwicklungs-, Staging- und Produktionswerte sauber voneinander isolieren.' },
      { title: '2. Secrets schuetzen', detail: 'Sensible Werte nur ueber private Secret-Stores und niemals in oeffentlichen Repos pflegen.' },
      { title: '3. Releases absichern', detail: 'Vor Deploy immer mit sicherem Default-Set und Checklisten validieren.' },
    ],
    points: [
      'Oeffentliche Wiki-Seiten enthalten keine konkreten Secret-/Endpoint-Werte.',
      'Interne Konfigurationsdetails gehoeren in private Betriebsdokumentation.',
      'Konfigurationsaenderungen sollten versioniert und freigegeben werden.',
    ],
    commands: ['Interne Ops-Runbooks fuer Environments nutzen'],
    tags: ['config', 'release-safety', 'security'],
    sources: ['docs/ENVIRONMENT.md'],
  },
  {
    id: 'security-operations-guide',
    title: 'Security Operations Guide',
    app: 'control',
    category: 'security',
    summary:
      'Security-Betrieb umfasst Access-Review, Device-Hygiene und Audit-Monitoring im Tagesbetrieb.',
    guide: [
      { title: '1. Device Hygiene', detail: 'Nur vertrauenswuerdige Devices freigeben und regelmaessig bereinigen.' },
      { title: '2. Access Hygiene', detail: 'Berechtigungen regelmaessig pruefen und ueberfluessige Rechte entfernen.' },
      { title: '3. Secret Hygiene', detail: 'Interne Schluessel und Zugangsdaten gemaess Security-Prozess rotieren.' },
    ],
    points: [
      'Temporäre Ausnahmen nur kurzzeitig und kontrolliert nutzen.',
      'Audit Logs fuer ungewoehnliche Commands/Fehler beobachten.',
      'Detailkonfiguration bleibt in internen Security-Runbooks.',
    ],
    commands: ['Control UI -> devices', 'Control UI -> policies'],
    tags: ['security-ops', 'device-verify', 'audit', 'origins'],
    sources: ['docs/SECURITY.md'],
  },
]

export type MatrixRow = {
  view: string
  main: boolean
  mobile: boolean
  code: boolean
  codeMobile: boolean
  control: boolean
}

export const viewMatrix: MatrixRow[] = [
  { view: 'dashboard', main: true, mobile: true, code: false, codeMobile: false, control: true },
  { view: 'notes', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'code', main: true, mobile: true, code: true, codeMobile: true, control: false },
  { view: 'tasks', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'reminders', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'canvas', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'files', main: true, mobile: true, code: true, codeMobile: true, control: false },
  { view: 'flux', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'devtools', main: true, mobile: true, code: false, codeMobile: false, control: false },
  { view: 'settings', main: true, mobile: true, code: true, codeMobile: true, control: true },
  { view: 'info', main: true, mobile: true, code: false, codeMobile: false, control: true },
  { view: 'explorer', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'search', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'git', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'debug', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'extensions', main: false, mobile: false, code: true, codeMobile: true, control: false },
  { view: 'problems', main: false, mobile: false, code: true, codeMobile: true, control: false },
]
