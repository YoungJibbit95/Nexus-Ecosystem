import type { GuideStep, MarkdownSnippet, WikiEntry } from './wikiData'

type EntryTranslation = Partial<Pick<WikiEntry, 'title' | 'summary' | 'guide' | 'points' | 'commands' | 'tags'>> & {
  markdownSnippets?: MarkdownSnippet[]
}

const g = (items: Array<[string, string]>): GuideStep[] => items.map(([title, detail]) => ({ title, detail }))

export const englishEntryTranslations = {
  'ecosystem-overview': {
    title: 'Nexus Ecosystem Overview',
    summary: 'The Nexus Ecosystem is an API-first monorepo with Main, Mobile, Code, Code Mobile and the hosted Control Plane.',
    guide: g([
      ['1. Understand the scope', 'Main and Mobile are productivity surfaces, Code and Code Mobile are IDE surfaces, and Control is the central operations surface.'],
      ['2. Understand the shared layer', 'All apps share runtime contracts through packages/nexus-core and receive v2 features/layouts through Live Sync.'],
      ['3. Understand the operating model', 'The public repo contains runtime clients and shared code; protected backend behavior belongs to the private NexusAPI environment.'],
    ]),
    points: [
      'The goal is consistent feature parity across desktop and mobile.',
      'View access and entitlements are checked by the server-side authority.',
      'Releases are gated by verify, build and compatibility checks.',
    ],
  },
  'ecosystem-setup-dev': {
    title: 'Setup and Development in the Ecosystem',
    summary: 'The root repository provides orchestrated scripts for setup, builds, development starts and quality gates.',
    guide: g([
      ['1. Run setup', 'Use npm run setup to install app dependencies and prepare local defaults.'],
      ['2. Check the API source', 'Use npm run api:source to see which hosted API/client layer is active.'],
      ['3. Start the right target', 'Use dev:main, dev:code, dev:mobile:* or dev:code-mobile:* depending on the surface you need.'],
    ]),
    points: [
      'dev:all starts Main and Code as the core stack, optionally with the Control UI.',
      'Mobile apps run through native Capacitor workflows.',
      'Build pipelines can optionally enforce hosted API health checks.',
    ],
  },
  'runtime-live-sync-v2': {
    title: 'Runtime Live Sync v2',
    summary: 'Live Sync v2 centrally controls feature releases and layout profiles through Feature Catalog, UI Schema and Release Snapshot data.',
    guide: g([
      ['1. Implement the feature', 'New view or feature logic is implemented in app code and mapped through VIEW_FEATURE_MAP.'],
      ['2. Maintain catalog and schema', 'The Control Live Sync tab stores and validates staging catalogs and schemas.'],
      ['3. Promote intentionally', 'After verify and build checks, staging can be promoted to production.'],
    ]),
    points: [
      'Shared Core orchestrates effective views per app.',
      'Layout profiles control desktop/mobile behavior such as density and navigation.',
      'Compatibility checks block incompatible client versions before rollout.',
    ],
  },
  'runtime-compatibility': {
    title: 'Compatibility and Version Gates',
    summary: 'Runtime validates minClientVersion and compatMatrix per app before unsafe views are released.',
    guide: g([
      ['1. Set versions', 'The schema must maintain minClientVersion and compatible versions for every app.'],
      ['2. Validate builds', 'Run all app builds before promotion.'],
      ['3. Check runtime behavior', 'When incompatibility is detected, apps must show clear hints and safe fallback states.'],
    ]),
    points: [
      'Compatibility is enforced in runtime resolution, not only in the UI.',
      'Promotion without parity-validated versions creates drift risk.',
      'Unsafe views remain blocked when contracts do not match.',
    ],
  },
  'runtime-core-view-v2': {
    title: 'Core View Runtime v2',
    summary: 'Core View Runtime v2 defines Layout Schema, Panel Engine and Command Registry as the shared foundation for Nexus v6 surfaces.',
    guide: g([
      ['1. Maintain manifests', 'Model new views in NEXUS_VIEW_MANIFESTS first, including actions, panels, modes and status signals.'],
      ['2. Resolve layout', 'resolveNexusViewLayout and buildNexusPanelEngine provide shell, inspector and responsive rules.'],
      ['3. Wire commands', 'resolveNexusViewCommandRegistry provides enabled/disabled state; real view handlers are registered per surface.'],
    ]),
    points: [
      'Layout Schema v2 makes desktop, tablet and mobile comparable.',
      'Panel Engine separates rail, sheet, inline and inspector panels.',
      'Command execution stays safe because Core centralizes disabled-state and handler resolution.',
      'Nexus Main already uses this runtime in NexusV6ViewShell.',
      'Main View Registry v2 feeds Sidebar, preload and boot priorities from one source.',
      'The first shell commands create notes, tasks and reminders directly from the v6 shell.',
    ],
    commands: [
      'npm --prefix "packages/nexus-core" run build',
      'npm --prefix "Nexus Main" run build',
    ],
    tags: ['runtime', 'view-manifest', 'layout-schema', 'commands', 'panels'],
  },
  'security-owner-signatures': {
    title: 'Security Governance and Access Protection',
    summary: 'Access to critical management functions follows clear role and approval rules.',
    guide: g([
      ['1. Review the role model', 'Grant administrative rights only to accounts that truly need them.'],
      ['2. Keep guardrails active', 'Allow critical actions only inside defined governance policies.'],
      ['3. Review regularly', 'Continuously verify access and changes during security operations.'],
    ]),
    points: [
      'Security decisions are managed centrally and consistently.',
      'Least privilege reduces risk from misconfiguration.',
      'Regular reviews keep operations stable and traceable.',
    ],
  },
  'security-paywall-entitlements': {
    title: 'Paywalls and Entitlements',
    summary: 'Premium features follow a clear account and tier model with login/upgrade flows.',
    guide: g([
      ['1. Account and login', 'The website/app requests login for premium features.'],
      ['2. Check plan status', 'Only entitled accounts receive access to premium areas.'],
      ['3. Release views safely', 'Only allowed views and functions are unlocked; otherwise the client shows a clear blocked state.'],
    ]),
    points: [
      'The website primarily controls the login and upgrade UX.',
      'Authorization belongs to protected backend systems.',
      'The Control Paywalls tab manages tier views and user templates.',
      'Clients must render blocked states clearly.',
    ],
  },
  'control-hosting-migration': {
    title: 'Control Hosting Migration',
    summary: 'Control UI runs on managed infrastructure; GitHub Pages is used for the public product wiki.',
    guide: g([
      ['1. Build', 'Build Control UI with npm --prefix "../Nexus Control" run build.'],
      ['2. Deploy', 'Serve the static dist output under /control.'],
      ['3. Check release', 'After deployment, validate UI startup and core navigation.'],
    ]),
    points: [
      'Public pages show documentation-relevant content only.',
      'Internal infrastructure details stay in private operational documentation.',
      'Deployment checks are required before release.',
    ],
  },
  'release-gates': {
    title: 'Release Gates and Promotion Checklist',
    summary: 'Verify and build checks across all app surfaces are required before promotion.',
    guide: g([
      ['1. Check contracts', 'verify:ecosystem must complete cleanly.'],
      ['2. Build every target', 'Build Main, Mobile, Code, Code Mobile and Control UI.'],
      ['3. Promote only after gates', 'Production promotion happens only after all gates pass.'],
    ]),
    points: [
      'This flow prevents contract drift and runtime breakage.',
      'Compatibility is treated as a release condition.',
      'Cross-app parity is part of the success criteria.',
    ],
  },
  'release-view-smoke-matrix': {
    title: 'Release View Smoke Matrix',
    summary: 'The View Smoke Matrix documents the UI flows that must be visibly confirmed for every Nexus v6 view before an RC.',
    guide: g([
      ['1. Start the gate', 'Run release:gate first so the build, contract and encoding baseline is green.'],
      ['2. Smoke-test views', 'Open, operate and reload every required view on Desktop Main and Mobile using the matrix.'],
      ['3. Store evidence', 'Save screenshots or short videos per view in the RC evidence folder and link open risks.'],
    ]),
    points: [
      'Open, create/edit, persist/reload, offline/API fallback and touch/keyboard are required columns.',
      'Animated UI must not move active click targets.',
      'Premium, admin and DevTools surfaces must be visibly gated.',
      'The matrix proves operability; it does not replace API contract or attack tests.',
    ],
    commands: [
      'npm run release:gate -- --fast',
      'npm run release:gate',
      'npm run release:gate -- --with-api-contract',
      'docs/VIEW_SMOKE_MATRIX.md',
    ],
    tags: ['release', 'smoke', 'view-qa', 'rc'],
  },
  'main-dashboard-guide': {
    title: 'Nexus Main: Dashboard Guide',
    summary: 'Dashboard combines Today Layer, Resume Lane, Quick Capture, workspace status and a persistent two-column widget system.',
    guide: g([
      ['1. Read focus signals', 'Read Today Layer, Resume Lane and workspace status first to identify the next useful step.'],
      ['2. Use Quick Capture', 'Capture new notes, tasks, reminders or code ideas directly from the dashboard without losing context.'],
      ['3. Adjust layout', 'Enable layout editing, move widgets by drag/drop or C1/C2 and R-/R+, and control visibility.'],
    ]),
    points: [
      'Today Layer condenses open tasks, due reminders and operational hints.',
      'Resume Lane brings the last working context back faster.',
      'Quick Capture reduces view switching for quick input.',
      'Layout is persisted under nx-dashboard-layout-v2.',
      'Span 1/2 allows one-column or two-column widgets.',
      'Reset immediately restores the default layout.',
    ],
    commands: ['today', 'new note <text>', 'new task <text>', 'Edit layout', 'Reset Dashboard Layout (Settings > Workspace)'],
  },
  'main-notes-guide': {
    title: 'Nexus Main: NotesView Full Guide',
    summary: 'NotesView combines sidebar management, edit/split/preview modes, tags, undo/redo, focus mode and local note settings.',
    guide: g([
      ['1. Select or create a note', 'Search, filter and sort on the left, then activate an existing note or create a new one.'],
      ['2. Choose a mode', 'Use Edit for writing, Split for live review and Preview for final reading output.'],
      ['3. Structure and save', 'Manage tags, use the format toolbar, save/autosave and export as .md when needed.'],
    ]),
    points: [
      'Modes: edit, split, preview.',
      'Sorting: updated, title, created; pinned notes are prioritized.',
      'Focus mode hides the sidebar and expands the writing surface.',
      'Notes settings control font size, line height, word wrap, tab size and autosave.',
    ],
  },
  'main-notes-magic-menu-guide': {
    title: 'Nexus Main: Notes Magic Menu Guide',
    summary: 'The Magic Menu creates structured Markdown snippets (List, Alert, Progress, Timeline, Grid, Card, Badge) through the UI.',
    guide: g([
      ['1. Keep cursor position', 'Select the target area in the editor, then open the Magic button.'],
      ['2. Choose an element', 'Select the type on the left and fill the form fields.'],
      ['3. Review and insert', 'Check the snippet preview, then insert it into the note.'],
    ]),
    points: [
      'The modal is lazy-loaded for better initial performance.',
      'Selection is stored before opening and restored after insert.',
      'Badge syntax gives fast inline highlights.',
    ],
    commands: ['Magic button in Notes toolbar', 'ESC to close'],
    markdownSnippets: [
      { label: 'nexus-list', description: 'Label/detail rows', snippet: '```nexus-list\nAlpha | First point\nBeta | Second point\n```' },
      { label: 'nexus-alert', description: 'info/success/warning/error', snippet: '```nexus-alert\nwarning\nImportant warning for the team.\n```' },
      { label: 'inline badge', description: 'Inline badge syntax', snippet: '`b:Nexus|magic`' },
    ],
  },
  'main-notes-markdown-reference': {
    title: 'Nexus Main: Notes Markdown Reference',
    summary: 'Notes supports standard Markdown, including tables, plus Nexus custom renderers for widgets and inline badges.',
    guide: g([
      ['1. Write base syntax', 'Use headings, lists, tables, quotes, links and code as usual.'],
      ['2. Use Nexus blocks', 'Use fenced code blocks with nexus-* languages for structured widgets.'],
      ['3. Validate preview', 'Check rendered output and readability in Split or Preview mode.'],
    ]),
    points: [
      'Toolbar actions quickly create H2, bold, italic, strikethrough, quote, list, table and horizontal rule.',
      'Inline code renders special badge syntax b:label|variant.',
      'Widget renderers: list, alert, progress, timeline, grid and card.',
    ],
    markdownSnippets: [
      { label: 'Tables', description: 'GFM tables', snippet: '| Field | Value |\n| --- | --- |\n| Status | active |\n| Owner | Product |' },
      { label: 'nexus-list', description: 'Two-column label/detail list', snippet: '```nexus-list\nScope | v2 rollout\nOwner | Product + Eng\nBudget | TBD\n```' },
      { label: 'nexus-alert', description: 'Callout boxes (info/success/warning/error/magic)', snippet: '```nexus-alert\ninfo\nRun Control promotion only after verify + build.\n```' },
      { label: 'Progress', description: 'Multiple progress bars', snippet: '```nexus-progress\nFrontend | 80\nBackend | 65\nTests | 40\n```' },
      { label: 'Timeline', description: 'Roadmap flow', snippet: '```nexus-timeline\nW1 | Discovery\nW2 | Build\nW3 | QA\nW4 | Release\n```' },
      { label: 'nexus-grid', description: 'Multi-column grid with row content', snippet: '```nexus-grid\n2\nAPI\nUI\nQA\nRollout\n```' },
      { label: 'nexus-card', description: 'Card with image URL, title and description', snippet: '```nexus-card\nhttps://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200 | Nexus Milestone | Production readiness complete.\n```' },
      { label: 'Inline Badge', description: 'Inline markers for status hints', snippet: '`b:Premium|success` and `b:Blocked|error`' },
      { label: 'Task list', description: 'Standard Markdown task checks', snippet: '- [x] Release Build\n- [ ] Control Promotion\n- [ ] Post-Deploy Smoke' },
    ],
  },
  'main-markdown-widget-atlas-v5': {
    title: 'Markdown Widget Atlas v5: Notes + Canvas',
    summary: 'Current map for standard Markdown, Notes Magic Widgets and Canvas-specific Markdown nodes including nexus-kanban.',
    guide: g([
      ['1. Choose the surface', 'Use Notes for long documents, guides and knowledge pages; use Canvas for visual project nodes and boards.'],
      ['2. Set the block type intentionally', 'Write fenced code blocks with the exact nexus-* language so the correct Nexus renderer is used.'],
      ['3. Check readability', 'Check Notes in Split/Preview mode; check Canvas nodes with zoom/fit and node size.'],
    ]),
    points: [
      'Standard Markdown remains the base: headings, tables, task lists, quotes, links, code and horizontal rules.',
      'Notes Magic Widgets: nexus-list, nexus-alert, nexus-progress, nexus-timeline, nexus-grid, nexus-card and inline badge syntax.',
      'Canvas adds compact PM nodes and nexus-kanban for sprint and standup boards.',
      'All widgets are text-based, copyable and useful for README, InfoView and Wiki handoff.',
    ],
    commands: ['Notes Toolbar -> Magic', 'Notes View -> Split/Preview', 'Canvas -> Markdown Node', 'canvas template sprint'],
    markdownSnippets: [
      { label: 'Markdown base for guides', description: 'Clean structure for InfoView, Notes and Wiki content.', snippet: '# Mission\n\n> Why this work matters.\n\n## Checklist\n- [x] Scope defined\n- [ ] Review open\n\n| Area | Status |\n| --- | --- |\n| Notes | active |\n| Canvas | active |' },
      { label: 'nexus-alert variants', description: 'Hints for info, success, warning or risk.', snippet: '```nexus-alert\nsuccess\nRelease gate passed. Build, verify and smoke are green.\n```' },
      { label: 'nexus-progress status pack', description: 'Multiple progress values for sprint, release or migration.', snippet: '```nexus-progress\nDesign | 90\nImplementation | 72\nQA | 48\nDocs | 65\n```' },
      { label: 'nexus-timeline roadmap', description: 'Linear roadmap in Notes or Canvas nodes.', snippet: '```nexus-timeline\nNow | Stabilization\nNext | Mobile parity\nLater | Release promotion\n```' },
      { label: 'nexus-grid feature map', description: 'Compact grid for view and feature groups.', snippet: '```nexus-grid\n3\nDashboard\nNotes\nTasks\nReminders\nCanvas\nFiles\n```' },
      { label: 'nexus-card product proof', description: 'Card for milestones, decisions or product proof.', snippet: '```nexus-card\nhttps://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200 | Render Pipeline | Measure, Resolve, Allocate, Commit, Cleanup.\n```' },
      { label: 'nexus-kanban Canvas sprint', description: 'Canvas-specific board block for sprint and standup nodes.', snippet: '```nexus-kanban\nTodo | Wiki Markdown Refresh\nDoing | Mobile Overflow Check\nReview | Build + Search Smoke\nDone | Push GitHub Pages\n```' },
      { label: 'Inline Badge', description: 'Small status markers inside text.', snippet: '`b:Ready|success` `b:Blocked|error` `b:Review|warning` `b:Magic|magic`' },
    ],
  },
  'main-code-view-guide': {
    title: 'Nexus Main: CodeView Guide',
    summary: 'CodeView combines multi-language editing, run sandbox, split/preview and output history for a fast build-iterate-check loop.',
    guide: g([
      ['1. Choose language/file', 'Create a new file and select the right language for syntax behavior.'],
      ['2. Run or preview', 'Run JS/TS, or inspect HTML/CSS/Markdown in preview or split mode.'],
      ['3. Analyze output', 'Use terminal output, runtime duration and JSON error positions for iteration.'],
    ]),
    points: [
      'JS/TS uses a safe sandbox with a mock console API.',
      'Run history shows recent executions with duration and status.',
      'Preview supports editor/split/preview for HTML/CSS/Markdown.',
      'Snippet quick buttons (log/fetch/todo) speed up prototyping.',
    ],
  },
  'main-tasks-guide': {
    title: 'Nexus Main: TasksView Guide',
    summary: 'TasksView is a Kanban workflow with priorities, deadlines, tags, subtasks, Markdown notes and a stat bar.',
    guide: g([
      ['1. Create a task', 'Use the plus action in the target column and set base data.'],
      ['2. Maintain details', 'Manage description, deadline, tags, priority and notes in the modal.'],
      ['3. Control progress', 'Move tasks between todo/doing/done with drag and drop and complete subtasks.'],
    ]),
    points: ['Columns: todo, doing, done.', 'Priorities low/mid/high are color coded.', 'Overdue deadlines are visually marked.', 'The task modal has tabs for details, subtasks and notes.'],
    commands: ['Drag and drop between columns', 'Double click for edit modal'],
  },
  'main-reminders-guide': {
    title: 'Nexus Main: RemindersView Guide',
    summary: 'RemindersView organizes time-based reminders with repeat, snooze, toast alerts, notes and overdue workflows.',
    guide: g([
      ['1. Create a reminder', 'Define title, date/time and repeat in the modal.'],
      ['2. Use quick presets', 'Use +15m, +1h, +3h, Tomorrow and +1 week for quick capture.'],
      ['3. Handle triggers', 'Continue from triggered reminders with Dismiss or Snooze.'],
    ]),
    points: ['The checker periodically evaluates due reminders.', 'Toast actions: Dismiss, Snooze 5m/15m/1h.', 'Views/filters: upcoming, soon, overdue, done, all.', 'Repeat modes: none, daily, weekly, monthly.', 'Reminder Health flows into Today Layer and workspace handoff as focus/risk signal.'],
  },
  'main-canvas-guide': {
    title: 'Nexus Main: CanvasView Full Guide',
    summary: 'Canvas 2.x is an infinite board with node widgets, project-management mode, quick packs, minimap and Magic Builder templates.',
    guide: g([
      ['1. Prepare the board', 'Create a canvas, use the Quick Add menu and choose relevant node types for scope/delivery.'],
      ['2. Build structure', 'Connect nodes, use snap/grid, apply layout mode and maintain PM status/due state.'],
      ['3. Navigate and finalize', 'Use Project Panel, minimap, focus/fit and Magic Templates for team readiness.'],
    ]),
    points: ['Node types cover content and PM structure: project, goal, milestone, decision, risk, task, checklist and more.', 'Canvas renders virtualized visibleNodes/visibleConnections for better performance on large boards.', 'Quick Packs: Starter Pack, Mindmap, Roadmap, Risk Matrix and Magic Templates.', 'Project Panel provides status filters, timeline, owner/priority/progress and focus mode.', 'Terminal and Spotlight can trigger Canvas commands directly (layout/template/focus).'],
  },
  'main-canvas-magic-menu-guide': {
    title: 'Nexus Main: Canvas Magic Builder Guide',
    summary: 'The Canvas Magic Builder creates complete project structures for Mindmap, Roadmap, Sprint, Risk Matrix, Decision Flow and AI Project.',
    guide: g([
      ['1. Choose a template', 'Select the matching structure type inside the modal.'],
      ['2. Set parameters', 'Set title, includeNotes/includeTasks and, for AI Project, prompt plus depth.'],
      ['3. Generate structure', 'Create the template and then apply fit-view/layout.'],
    ]),
    points: ['Template families: mindmap, roadmap, sprint, risk-matrix, decision-flow and ai-project.', 'AI Project uses prompt + depth (light/balanced/deep) to create goals, milestones, risks and tasks.', 'Auto-layout modes mindmap, timeline and board help clean up after generation.', 'AI Project creates goals, milestones, risks, decision context and delivery tasks.', 'Risk Matrix places nodes by impact/probability.', 'Decision Flow creates options, tradeoff risk and expected outcome.'],
  },
  'main-canvas-markdown-reference': {
    title: 'Nexus Main: Canvas Markdown Reference',
    summary: 'Markdown nodes in Canvas render Nexus blocks for structured project information and visualization directly inside the node.',
    guide: g([
      ['1. Create a Markdown node', 'Use node type markdown or text fields with fenced blocks.'],
      ['2. Use Nexus renderers', 'Use nexus-list/progress/alert/timeline/grid/card/kanban.'],
      ['3. Combine layout', 'Connect Markdown nodes with goal/risk/decision nodes.'],
    ]),
    points: ['Canvas has compact renderers for dense cards.', 'nexus-kanban is available for sprint and standup flows.', 'Ideal for context boards beside PM nodes.'],
    markdownSnippets: [
      { label: 'Compact List', description: 'Owner/context in dense nodes', snippet: '```nexus-list\nOwner | Product\nBudget | TBD\nDependencies | API, Design, QA\n```' },
      { label: 'Progress Board', description: 'Multiple delivery bars in one node', snippet: '```nexus-progress\nScope | 70\nReadiness | 55\nRisks mitigated | 40\n```' },
      { label: 'Timeline Board', description: 'Project phases as a node timeline', snippet: '```nexus-timeline\nQ1 | Discovery\nQ2 | Build\nQ3 | QA\nQ4 | Rollout\n```' },
      { label: 'Kanban Mini', description: 'Standup/flow inside one node', snippet: '```nexus-kanban\nTodo | API Endpoint\nDoing | UI Flow\nReview | QA\n```' },
      { label: 'Risk Alert', description: 'Risk hint inside the node', snippet: '```nexus-alert\nwarning\nAssign a mitigation owner for every critical risk.\n```' },
      { label: 'Context Grid', description: 'Context fields in grid form', snippet: '```nexus-grid\n2\nScope\nDependencies\nAssumptions\nKPIs\n```' },
      { label: 'Decision Card', description: 'Option with tradeoff metadata', snippet: '```nexus-card\nOption A|Fast start|Higher technical risk\n```' },
    ],
  },
  'main-files-guide': {
    title: 'Nexus Main: FilesView Guide',
    summary: 'FilesView is the central file and workspace layer for Notes, Code, Tasks and Reminders, including grid/list and workspace assignment.',
    guide: g([
      ['1. Structure workspaces', 'Create workspaces with name, icon, color and description.'],
      ['2. Search items', 'Use search and type filters across all content.'],
      ['3. Assign and open', 'Assign items to workspaces and open them directly with double click.'],
    ]),
    points: ['Workspace modal supports visual icon/color selection.', 'Assign modal allows mapping to multiple workspaces.', 'List and grid modes support different work densities.', 'Workspace handoff connects Files, Dashboard and Mobile context for seamless continuation.'],
  },
  'main-flux-guide': {
    title: 'Nexus Main: FluxView Guide',
    summary: 'Flux Ops combines action queue, bottleneck detection, quick create and activity stream for operational project management.',
    guide: g([
      ['1. Prioritize the queue', 'Use severity/time sorting and queue filters for current bottlenecks.'],
      ['2. Use ops actions', 'Run Resolve Urgent and Start Backlog for fast relief.'],
      ['3. Evaluate the stream', 'Combine activity filters and search while tracking trends through the Ops Score.'],
    ]),
    points: ['Action Queue fuses open tasks and reminders and dynamically scores severity.', 'Quick Actions create note/code/task/reminder without changing views.', 'Focus Mode filters to critical items and speeds up incident handling.', 'Activity Stream stays filterable by all/note/code/task/reminder.'],
  },
  'main-devtools-guide': {
    title: 'Nexus Main: DevTools Guide',
    summary: 'DevTools combines Visual Builder, FS-like editor and UI calculator for quick frontend exploration.',
    guide: g([
      ['1. Build structure', 'Edit HTML/CSS/JS base files in the integrated file area.'],
      ['2. Iterate styles', 'Use builder controls for spacing, border, background, glow, blur and typography.'],
      ['3. Reuse output', 'Copy CSS/Tailwind snippets into the target project.'],
    ]),
    points: ['Explorer allows new files, rename and delete.', 'Editor supports tab indentation and language-specific colors.', 'Calculator covers spacing/color/typography/layout/animation calculations.'],
  },
  'main-info-view-guide': {
    title: 'Nexus Main: InfoView Guide',
    summary: 'InfoView is the internal product documentation in Nexus Main with changelog, feature guides, shortcuts and terminal reference.',
    guide: g([
      ['1. Check release state', 'Read the changelog block to understand active version and main changes.'],
      ['2. Read view guides', 'Per view, access the core purpose and recommended usage flow.'],
      ['3. Apply commands', 'Move shortcuts and terminal commands directly into the workflow.'],
    ]),
    points: ['InfoView is the densest in-app knowledge source for Main.', 'Sections are organized as collapsible accordions.', 'Guides cover Dashboard, Notes, Canvas, Settings and Terminal.'],
  },
  'main-keybind-matrix': {
    title: 'Nexus Main: Keybind Matrix',
    summary: 'Complete Main keybind matrix for global navigation plus Notes, Code, Canvas and Flux.',
    guide: g([
      ['1. Learn global actions', 'Start with Spotlight: Shift x2, Cmd/Ctrl+K, Esc.'],
      ['2. Train per view', 'Practice Notes/Code/Canvas/Flux keybinds per daily workflow.'],
      ['3. Combine with Terminal', 'Use Terminal/Spotlight as a shortcut bridge to layouts, templates and quick actions.'],
    ]),
    points: ['Global: Shift x2 (toggle spotlight), Cmd/Ctrl+K (open), Esc (close/reset).', 'Notes: Cmd/Ctrl+S, +B, +I, +K, +Z, +Y, Tab.', 'Code: Cmd/Ctrl+Enter (run), Cmd/Ctrl+S (save), Tab indent in textarea.', 'Canvas: Space, Delete, Esc, Cmd/Ctrl+0, +/=, -, G, F, P, Cmd/Ctrl+M.', 'Flux: Cmd/Ctrl+F, Cmd/Ctrl+Shift+N/C/T/R, Cmd/Ctrl+Shift+D/B, 1/2/3/4, 0, F, Esc.', 'DevTools: Tab (indent), Enter (confirm rename), Esc (cancel rename).', 'Terminal input: Enter execute, ArrowUp/Down history, Esc close, Ctrl+L clear.'],
  },
  'main-settings-overview': {
    title: 'Nexus Main: Settings Full Guide',
    summary: 'Settings is a hub for Theme, Glass, Glow, Background, Layout, Workspace, Motion and Editor with live preview and JSON export/import.',
    guide: g([
      ['1. Choose a tab', 'Use sidebar and tab search to open the relevant settings area.'],
      ['2. Test live', 'Observe changes directly in the live preview.'],
      ['3. Save configuration', 'Save, export or import a theme/configuration.'],
    ]),
    points: ['UX profiles: focus, cinematic, compact.', 'Quick toggles: reduced motion, high contrast, toolbar visibility.', 'Workspace reset actions for Spotlight, Terminal and Dashboard.'],
  },
  'main-settings-theme-glass': {
    title: 'Nexus Main: Theme and Glass Tabs',
    summary: 'Theme controls presets/colors/fonts; Glass controls blur, saturation, tint, border and special effects.',
    guide: g([
      ['1. Start from a preset', 'Choose a preset, then tune colors and fonts deliberately.'],
      ['2. Set glass mode', 'Choose default/frosted/crystal/neon/matte/mirror based on readability and depth.'],
      ['3. Fine-tune', 'Balance panel blur, border opacity, noise, chromatic aberration and tint.'],
    ]),
    points: ['Global font affects the full app typography.', 'Frosted Glass can force high blur values.', 'Border glow and noise overlay are controlled separately.'],
  },
  'main-settings-glow-background': {
    title: 'Nexus Main: Glow and Background Tabs',
    summary: 'Glow controls light behavior (mode/colors/intensity); Background controls app background, panel patterns and overlays.',
    guide: g([
      ['1. Set glow base', 'Set glow mode, intensity, radius and spread to match the theme.'],
      ['2. Define gradient', 'Tune glow color 1/2 and gradient angle.'],
      ['3. Layer background', 'Combine solid/gradient/mesh/aurora and overlays such as vignette or scanlines.'],
    ]),
    points: ['Glow can run animated with rotation speed.', 'Background includes panelBgMode for pattern layers.', 'Overlay opacity helps with contrast control.'],
  },
  'main-settings-layout-workspace': {
    title: 'Nexus Main: Layout and Workspace Tabs',
    summary: 'Layout controls sidebar/panel/toolbar/accessibility; Workspace controls productivity toggles and reset actions.',
    guide: g([
      ['1. Configure sidebar', 'Set style, width, position, labels and accent background.'],
      ['2. Tune UI density', 'Adjust panel radius, shadow depth, spacing density and compact mode.'],
      ['3. Keep workspace clean', 'Reset Spotlight recents, Terminal history/macros and Dashboard layout when needed.'],
    ]),
    points: ['Toolbar can receive mode, position, visible and height values.', 'High contrast and tooltips are separately toggleable.', 'Workspace tab provides direct Spotlight/Terminal actions.'],
  },
  'main-settings-motion-editor': {
    title: 'Nexus Main: Motion and Editor Tabs',
    summary: 'Motion controls animation depth and accessibility; Editor controls Code and Notes editor behavior up to full reset.',
    guide: g([
      ['1. Set motion budget', 'Define animation speed and entry style.'],
      ['2. Tune effects', 'Toggle entry/page/hover/ripple/glow/float/border/particle behavior based on performance profile.'],
      ['3. Keep editor consistent', 'Centrally adjust autosave, word wrap, line numbers, minimap, tab size and notes font.'],
    ]),
    points: ['Reduced Motion disables intensive animations.', 'Autosave interval is configurable in the Editor tab.', 'Settings reset can restore the full configuration to base values.'],
  },
  'main-terminal-spotlight-guide': {
    title: 'Nexus Main: Terminal and Spotlight Guide',
    summary: 'Terminal is a command-driven workflow layer with macro system, undo/redo, Canvas integration and Spotlight bridge.',
    guide: g([
      ['1. Navigate', 'Use help, views, goto and spotlight for quick app switches.'],
      ['2. Run operations', 'Use new/search/stats/today/calc for daily productivity.'],
      ['3. Automate', 'Use macro start/stop/run for recurring command sequences.'],
    ]),
    points: ['Canvas commands trigger layout/template/focus events directly in the view.', 'Macro recursion guard blocks infinite loops.', 'Undo/redo manages the command timeline separately.'],
  },
  'ecosystem-why-native-guide': {
    title: 'Why Nexus Feels Native',
    summary: 'Nexus feels consistent because render, motion and surface rules are maintained centrally as a product system.',
    guide: g([
      ['1. Understand the shared engine', 'UI decisions run through shared render and motion blocks instead of isolated per-view styling.'],
      ['2. Degrade instead of breaking', 'On weaker hardware the system reduces complexity qualitatively instead of shutting things off randomly.'],
      ['3. Keep docs synchronized', 'InfoView, Website and Wiki use the same terms and product state.'],
    ]),
    points: ['Consistency comes from Shared Core rules, not copy/paste styling.', 'Budget and motion profiles prevent visual overload.', 'Product and engineering story stay traceable through docs sync.'],
  },
  'runtime-render-pipeline-guide': {
    title: 'Render Pipeline Guide',
    summary: 'The Render Pipeline connects profiles, surface recipes, budget allocation and commit diagnostics in a fixed sequence.',
    guide: g([
      ['1. Resolve profile', 'resolveRenderProfile determines tier, frame budget and surface limits per platform.'],
      ['2. Resolve surface recipe', 'resolveSurfaceRecipe combines SurfaceClass + EffectClass with tier scaling.'],
      ['3. Allocate and commit budget', 'allocateEffectBudget + RenderCoordinator prioritize Dynamic/Shader/Burst and publish diagnostics.'],
    ]),
    points: ['Pipeline phases: measure -> resolve -> allocate -> commit -> cleanup.', 'Policy state respects cooldowns and stability windows.', 'Invariants mark conflicts early before UI states drift.'],
  },
  'runtime-motion-engine-guide': {
    title: 'Motion Engine Guide',
    summary: 'The Motion Engine controls motion families, choreography and degradation levels for calm, intentional interactions.',
    guide: g([
      ['1. Choose motion profile', 'minimal/balanced/expressive/cinematic resolve from theme and runtime context.'],
      ['2. Use families', 'navigation, toolbar, sheet, command, status, micro, hero and content receive their own rules.'],
      ['3. Respect degradation', 'full through static-safe reduces intensity step by step instead of abruptly disabling features.'],
    ]),
    points: ['Interrupt policies avoid frantic switching during fast interactions.', 'Animation complexity is derived from surface mode and runtime state.', 'Low-power or reduced-motion profiles remain functional but intentionally calmer.'],
  },
  'runtime-surface-effect-classes': {
    title: 'Surface and Effect Classes',
    summary: 'SurfaceClass and EffectClass form the technical grammar of the Nexus UI Engine for blur, saturation and dynamic capabilities.',
    guide: g([
      ['1. Understand SurfaceClass', 'shell/panel/modal/toolbar/ios/liquid/hero/utility control base budgets and ladder selection.'],
      ['2. Assign EffectClass', 'static/backdrop/refractive-edge/liquid-interactive/shader-burst/status-highlight control dynamic permissions.'],
      ['3. Apply tier scaling', 'Tier-specific factors adapt blur/saturation and shader/burst availability.'],
    ]),
    points: ['Surface recipes encapsulate reproducible budget values per class.', 'Effect capabilities are bound to lowPower/reducedMotion guardrails.', 'Class choice is a product decision, not only a styling detail.'],
  },
  'main-render-diagnostics-guide': {
    title: 'Nexus Main: Render Diagnostics View',
    summary: 'Render Diagnostics shows pipeline state, budget metrics, surface decisions and toolbar scene matrix for targeted tuning.',
    guide: g([
      ['1. Open diagnostics', 'The diagnostics view shows tier, phase, frame budget and drop estimate in real time.'],
      ['2. Read surface decisions', 'Analyze mode, motionCapability, animationComplexity, reason and priorityScore per surface.'],
      ['3. Narrow down causes', 'Use invariant violations, resolve/allocate/commit duration and listener timings to locate bottlenecks.'],
    ]),
    points: ['Dev panel provides surface table and optional bounds overlay.', 'Toolbar Preview Matrix simulates slot visibility for multiple modes and widths.', 'Diagnostics help optimize UI quality with facts instead of gut feeling.'],
  },
  'main-infoview-product-brain': {
    title: 'Nexus Main: InfoView as Product Brain',
    summary: 'InfoView is the compact in-app knowledge layer for changelog, view loops, keybinds and operational commands.',
    guide: g([
      ['1. Get release context', 'Check the changelog for current stability, performance and UX changes.'],
      ['2. Understand view loops', 'Guide accordions provide each surface with core purpose, typical steps and shortcuts.'],
      ['3. Translate into workflow', 'Move terminal and Spotlight commands into the daily routine.'],
    ]),
    points: ['InfoView stays intentionally denser and more action-oriented than Website and Wiki.', 'Section structure makes product knowledge accessible inside the app without context switches.', 'Guides, keybinds and changelog are built as one connected work context.'],
  },
  'ecosystem-workflow-surface-philosophy': {
    title: 'Today / Continue Workflow Surface Philosophy',
    summary: 'Nexus prioritizes the next useful work step through Today Layer, Quick Capture and command-driven continue flows.',
    guide: g([
      ['1. Read Today Layer', 'Open tasks, due-today reminders and overdue pressure are combined into one focus signal.'],
      ['2. Continue by command', 'Terminal and Quick Capture intents create direct jumps into Notes/Tasks/Reminders/Code/Canvas.'],
      ['3. Hand off state', 'Workspace handoff data keeps context, confidence and last action traceable on Mobile.'],
    ]),
    points: ['computeTodayLayerSummary condenses reminder health and open tasks.', 'createCaptureIntent/parseCaptureIntentFromQuery create fast capture entry points.', 'Workspace handoff stores source, risk and checkpoint metadata for mobile continuation.'],
  },
  'ecosystem-documentation-map': {
    title: 'Documentation Map: README, InfoView, Website, Wiki',
    summary: 'Documentation is intentionally layered: README for setup, InfoView for in-app action, Website for product story, Wiki for technical depth.',
    guide: g([
      ['1. Use README for start and scope', 'Check repo setup, builds, operating boundaries and high-level architecture first.'],
      ['2. Use InfoView for operations', 'Use in-app guides and keybinds for immediate workflow.'],
      ['3. Use Website + Wiki for product context', 'Website provides story and evidence; Wiki provides reference and matrix detail.'],
    ]),
    points: ['All layers should use the same terms for views, engine and diagnostics.', 'Wiki can be more detailed; Website stays product-oriented and provable.', 'InfoView stays shorter and more action-oriented for daily use.'],
  },
  'mobile-overview': {
    title: 'Nexus Mobile Full Guide',
    summary: 'Nexus Mobile maps the Main core views to mobile form factors with adaptive navigation and haptic-oriented interaction.',
    guide: g([
      ['1. Understand navigation', 'Bottom tabs cover core areas; More Drawer opens extended views.'],
      ['2. Check feature parity', 'Notes/Code/Tasks/Reminders/Canvas/Files/Settings/Info are available on mobile.'],
      ['3. Respect runtime behavior', 'View allowlist and entitlements remain centrally enforced.'],
    ]),
    points: ['Safe-area behavior and mobile UX are prioritized.', 'Bottom navigation is optimized for quick one-handed use.', 'Terminal Store provides mobile-compatible commands.'],
  },
  'mobile-navigation-guide': {
    title: 'Nexus Mobile Navigation Guide',
    summary: 'Mobile navigation uses bottom tabs, More Drawer, haptic events and runtime view restrictions.',
    guide: g([
      ['1. Use primaries', 'Home/Notes/Tasks/Reminders are directly available in the bottom bar.'],
      ['2. Open More Drawer', 'Open additional views such as Code, Canvas, Files, DevTools, Flux, Settings and Info.'],
      ['3. Respect runtime allowlist', 'Only allowed views are actually unlocked in navigation.'],
    ]),
    points: ['Haptic light feedback accompanies important navigation changes.', 'Safe-area insets are included for modern displays.', 'Navigation labels stay consistent with Main.'],
  },
  'mobile-views-settings-guide': {
    title: 'Nexus Mobile Views and Settings Guide',
    summary: 'The mobile app uses the same core view concepts as Main with adapted layout and touch-oriented interactions.',
    guide: g([
      ['1. Use view basics', 'Use Notes/Code/Tasks/Reminders/Canvas/Files like in Main, but with mobile layout tiers.'],
      ['2. Apply settings', 'Use Theme/Glass/Glow/Background/Layout/Motion/Editor on mobile for UX profiling.'],
      ['3. Tune input and density', 'Set compact densities and reduced motion depending on device capability.'],
    ]),
    points: ['InfoView in Mobile documents changelog, shortcuts and view patterns.', 'Settings remain the central place for visual consistency.', 'The mobile variant prioritizes readable, touch-friendly targets.'],
  },
  'mobile-keybind-matrix': {
    title: 'Nexus Mobile: Keybind Matrix',
    summary: 'Current Mobile keybinds for hardware keyboards plus palette and terminal shortcuts.',
    guide: g([
      ['1. Learn global actions', 'Ctrl/Cmd+K toggles Command Palette, Shift x2 toggles Toolbar Spotlight, Esc closes overlays or expanded states.'],
      ['2. Use view keybinds', 'Notes/Code/Flux/Canvas follow Main shortcuts for parity.'],
      ['3. Use Terminal fallback', 'Use palette/new/search/goto to intensify workflows without pointer input.'],
    ]),
    points: ['Global Mobile: Ctrl/Cmd+K, Shift x2, Esc.', 'Notes: Cmd/Ctrl+S, +B, +I, +K, +Z, +Y, Tab.', 'Code: Cmd/Ctrl+Enter run, Cmd/Ctrl+S save, Tab indent.', 'Canvas: Space, Delete, Esc, Cmd/Ctrl+0 plus pan/zoom gestures.', 'Flux: Cmd/Ctrl+F, Cmd/Ctrl+Shift+N/C/T/R, Cmd/Ctrl+Shift+D/B, 1/2/3/4, 0, F, Esc.', 'Terminal: help, views, goto, new, list, stats, theme, preset, search, palette.'],
  },
  'mobile-terminal-guide': {
    title: 'Nexus Mobile Terminal Guide',
    summary: 'The mobile terminal provides a lean, fast command set for navigation, create flows, search and theme control.',
    guide: g([
      ['1. Help and views', 'Use help and views, then goto for navigation.'],
      ['2. Fast creation', 'Use new note/task/reminder/code for quick capture flows.'],
      ['3. Search and palette', 'Use search <query> and palette as central launchers.'],
    ]),
    points: ['The command set is more compact than Main.', 'list notes/tasks/reminders shows quick previews.', 'theme dark/light and preset are directly available.'],
  },
  'code-overview': {
    title: 'Nexus Code Full Guide',
    summary: 'Nexus Code is the desktop IDE surface with panel stack, file workflow, Command Palette, Spotlight and Terminal.',
    guide: g([
      ['1. Route and access', 'Editor runs on /editor and validates view access through Runtime.'],
      ['2. Use panel stack', 'Open Explorer/Search/Problems/Git/Debug/Extensions depending on the task.'],
      ['3. Editor loop', 'Manage tabs, save, auto-save and observe Terminal/Problems in parallel.'],
    ]),
    points: ['Settings and files are persisted locally.', 'TitleBar provides Open Folder, Sidebar Toggle, Zen Mode and Command Palette.', 'Bottom tab uses terminal/problems as work areas.'],
  },
  'code-panels-guide': {
    title: 'Nexus Code Panel Guide',
    summary: 'The sidebar controls Explorer, Search, Problems, Git, Debug and Extensions as central work contexts.',
    guide: g([
      ['1. Explorer', 'Create, open, rename, delete and structure files/folders.'],
      ['2. Analysis panels', 'Use Search for global search, Problems for diagnostics and Debug for runtime breakpoints.'],
      ['3. Delivery panels', 'Use Git for sync/versioning and Extensions for extension management.'],
    ]),
    points: ['Active panel state is clearly visible through the sidebar indicator.', 'Panel can collapse to enlarge editor space.', 'Problems badge signals open issues directly in the editor.'],
  },
  'code-workflow-guide': {
    title: 'Nexus Code Workflow Guide',
    summary: 'Code Workflow combines Open Folder, tab management, auto save, Command Palette and Spotlight for fast IDE operation.',
    guide: g([
      ['1. Open workspace', 'Load Open Folder and sync the file structure in Explorer.'],
      ['2. Edit', 'Edit active tabs; auto save marks modified status until persistence.'],
      ['3. Navigate fast', 'Use Command Palette (Ctrl+P/Ctrl+Shift+P) and Shift Shift Spotlight.'],
    ]),
    points: ['Command actions include new-file, toggle-terminal, github-sync and open-settings.', 'Keyboard shortcuts are registered globally.', 'Zen Mode and Sidebar Visibility create focus contexts.'],
  },
  'code-keybind-matrix': {
    title: 'Nexus Code: Keybind Matrix',
    summary: 'Complete desktop IDE keybind matrix for editor, panels, Command Palette and Terminal.',
    guide: g([
      ['1. Core navigation', 'Use Ctrl/Cmd+P, Ctrl/Cmd+Shift+P and F1 as the central launcher.'],
      ['2. Editor loop', 'Train save, tab management and terminal toggles without mouse.'],
      ['3. Focus modes', 'Combine Shift x2 Spotlight, Zen Mode and Sidebar toggle.'],
    ]),
    points: ['Global: Ctrl/Cmd+S, Ctrl/Cmd+N, Ctrl/Cmd+B, Ctrl/Cmd+`.', 'Terminal: Ctrl/Cmd+Shift+` new terminal, Ctrl+C interrupt, Ctrl+L clear.', 'Navigation: Ctrl/Cmd+W close tab, Ctrl/Cmd+, settings, F1 command palette.', 'Palette: Ctrl/Cmd+Shift+P toggle command palette, Ctrl/Cmd+P quick open.', 'Spotlight: Shift x2 toggle.'],
  },
  'code-settings-guide': {
    title: 'Nexus Code Settings Guide',
    summary: 'Nexus Code has its own settings model for theme, background, editor rendering and workspace behavior.',
    guide: g([
      ['1. Set theme/background', 'Choose theme and background presets for the editor shell.'],
      ['2. Editor behavior', 'Control font_size, tab_size, line_numbers, word_wrap, minimap and auto_save.'],
      ['3. Layout behavior', 'Tune sidebar_position, status_bar_visible and zen_mode to your working style.'],
    ]),
    points: ['Settings persist in nexus-code-settings.', 'Reset restores defaults and reloads the editor.', 'Accent colors can be configured separately through primary/secondary.'],
  },
  'code-mobile-overview': {
    title: 'Nexus Code Mobile Full Guide',
    summary: 'Code Mobile transfers the IDE stack to native mobile with Capacitor filesystem bridge and MobileBottomNav.',
    guide: g([
      ['1. Native setup', 'Use cap:sync and native build/run workflows.'],
      ['2. Panel usage', 'Use Explorer/Search/Git/Debug/Extensions/Problems like on desktop.'],
      ['3. Mobile behavior', 'On mobile, the panel drawer closes after file open to free editor space.'],
    ]),
    points: ['nativeFS provides file operations for mobile filesystems.', 'Minimap is disabled by default on mobile devices.', 'MobileBottomNav maps core panels plus Settings.'],
  },
  'code-mobile-nav-guide': {
    title: 'Nexus Code Mobile Navigation Guide',
    summary: 'Code Mobile complements the desktop sidebar with mobile bottom navigation, active indicator and settings slot.',
    guide: g([
      ['1. Use BottomNav', 'Explorer/Search/Problems/Git/Debug are directly reachable at the bottom.'],
      ['2. Open settings', 'The final slot opens the editor settings overlay.'],
      ['3. Clean up panel', 'When a file opens on mobile, the panel is reduced to focus the editor.'],
    ]),
    points: ['Nav includes safe-area padding.', 'Active indicator uses motion animations.', 'Desktop sidebar remains available on larger screens.'],
  },
  'code-mobile-settings-guide': {
    title: 'Nexus Code Mobile Settings Guide',
    summary: 'Settings in Code Mobile follow desktop defaults but are adapted for mobile readability and performance.',
    guide: g([
      ['1. Theme and font', 'Adapt the editor visually to display and ambient light.'],
      ['2. Editing behavior', 'Set word wrap, line numbers, tab size and auto save for touch workflows.'],
      ['3. Mobile performance', 'Keep minimap disabled on small screens or slower devices.'],
    ]),
    points: ['Settings are also persisted locally.', 'Mobile forces minimap=false in editor props.', 'Zen and sidebar toggles also work on mobile.'],
  },
  'code-mobile-keybind-matrix': {
    title: 'Nexus Code Mobile: Keybind Matrix',
    summary: 'Mobile IDE keybind atlas for hardware keyboards and panel workflows.',
    guide: g([
      ['1. Set the core', 'Desktop keybinds remain consistent on Code Mobile when a keyboard is available.'],
      ['2. Focus panels', 'Control sidebar/terminal/panels by shortcut and use touch for precision work.'],
      ['3. Troubleshoot', 'Keep minimap disabled and switch to compact settings when input lags.'],
    ]),
    points: ['Ctrl/Cmd+S save, Ctrl/Cmd+N new file, Ctrl/Cmd+B toggle sidebar.', 'Ctrl/Cmd+` toggle terminal, Ctrl/Cmd+Shift+` new terminal.', 'Ctrl/Cmd+W close tab, Ctrl/Cmd+, settings.', 'F1 + Ctrl/Cmd+Shift+P command palette, Ctrl/Cmd+P quick open.', 'Shift x2 spotlight toggle.', 'Terminal: Ctrl+C interrupt, Ctrl+L clear.'],
  },
  'control-live-sync-guide': {
    title: 'Control: Live Sync Guide',
    summary: 'The Live Sync tab in Control is a light builder for Catalog/Schema and production promotion.',
    guide: g([
      ['1. Load runtime', 'Read current runtime data.'],
      ['2. Edit staging', 'Adjust and validate catalog and schema in staging.'],
      ['3. Promote', 'Promote to production after checks.'],
    ]),
    points: ['Changes follow a controlled approval process.', 'Schema validation blocks invalid components.', 'Promotion is an explicit step.'],
  },
  'control-paywalls-guide': {
    title: 'Control: Paywalls Guide',
    summary: 'The Paywalls tab manages tier views and user templates for server-side entitlement evaluation.',
    guide: g([
      ['1. Maintain tier model', 'Define which views are available per tier.'],
      ['2. Assign user templates', 'Map user groups and tiers consistently.'],
      ['3. Check app behavior', 'Blocked views must appear in clients as paywall/hint states.'],
    ]),
    points: ['Website login flow must align with API entitlement decisions.', 'Only the API is authoritative for unlocks.', 'UI-only unlocks are not a security model.'],
  },
  'control-dashboard-guide': {
    title: 'Control: Dashboard Tab Guide',
    summary: 'Dashboard shows health metrics, registry state and event volume for all connected apps.',
    guide: g([
      ['1. Read metrics', 'Use online apps, stale apps, events total and average view render as first status indicators.'],
      ['2. Check registry', 'Validate app status, version, last seen, route and stale flags in the table.'],
      ['3. Follow outliers', 'Mark stale clients and unusual render timings for incident analysis.'],
    ]),
    points: ['Dashboard is the operational start view of the Control Plane.', 'Stale metrics help detect offline/outdated clients.', 'Version and route data are important for rollout debugging.'],
  },
  'control-build-guide': {
    title: 'Control: Build Tab Guide',
    summary: 'Build tab provides build manifest insight and the central build-command path for the ecosystem.',
    guide: g([
      ['1. Load manifest', 'Refresh the build manifest and check latest ecosystem build data.'],
      ['2. Compare versions', 'Compare manifest information with current repo artifacts.'],
      ['3. Start build runs', 'Use the Build Command Guide for targeted build/verify execution.'],
    ]),
    points: ['Manifest helps trace promotion against build state.', 'verify:ecosystem remains required before promotion.', 'The tab reduces switching between CI and local operations view.'],
  },
  'control-settings-guide': {
    title: 'Control: Settings Tab Guide',
    summary: 'Settings tab manages global runtime behavior and app-specific config for main/mobile/code/code-mobile/control.',
    guide: g([
      ['1. Load global config', 'Check global policies and runtime defaults in the JSON editor.'],
      ['2. Choose app config', 'Select target app, load config and adjust carefully.'],
      ['3. Check save result', 'Save changes and verify the resulting status.'],
    ]),
    points: ['Global config applies across apps and affects runtime behavior.', 'App config allows targeted tuning per surface.', 'Bad config can create view drift, so always validate.'],
  },
  'control-commands-guide': {
    title: 'Control: Commands Tab Guide',
    summary: 'Command Center creates prioritized commands with TTL, optional idempotency key and JSON payload for target apps.',
    guide: g([
      ['1. Set target and type', 'Define target app and command type for the use case.'],
      ['2. Set delivery parameters', 'Configure priority, TTL and optional idempotency key for safe delivery.'],
      ['3. Watch queue', 'After creation, monitor the command queue for delivery and retries.'],
    ]),
    points: ['Idempotency key prevents duplicate side effects during retries.', 'TTL limits stale command execution.', 'Payload should remain strictly valid JSON.'],
  },
  'control-policies-guide': {
    title: 'Control: Policies Tab Guide',
    summary: 'Policies tab is the central maintenance surface for security rules and owner restrictions.',
    guide: g([
      ['1. Load policies', 'Read current security policies as baseline.'],
      ['2. Harden rules', 'Keep access and security rules consistent.'],
      ['3. Save and audit', 'After saving, check audit log and API status for policy drift.'],
    ]),
    points: ['Policies directly affect operational access control.', 'Unsafe policies can trigger baseline enforcement.', 'Always coordinate changes with security operations.'],
  },
  'control-devices-guide': {
    title: 'Control: Devices Tab Guide',
    summary: 'Devices tab manages the admin device allowlist including roles, approval and blocking.',
    guide: g([
      ['1. Identify device', 'Use device ID and label from a trusted source.'],
      ['2. Set roles', 'Keep role CSV small; admin/developer only when needed.'],
      ['3. Maintain lifecycle', 'Approve devices, block old devices and refresh the list regularly.'],
    ]),
    points: ['Device Control is a critical part of login hardening.', 'Roles should follow least privilege.', 'Refresh allows fast validation after approve/block actions.'],
  },
  'control-audit-guide': {
    title: 'Control: Audit Tab Guide',
    summary: 'Audit tab shows security-relevant and operational events for mutation, policy and device actions.',
    guide: g([
      ['1. Load audit feed', 'Fetch current events from the audit log.'],
      ['2. Search critical patterns', 'Prioritize unusual policy and device events.'],
      ['3. Preserve incident trail', 'Document suspicious event chains for postmortem and rotation measures.'],
    ]),
    points: ['Audit is the central source for forensic traceability.', 'Security-relevant error patterns should be handled quickly.', 'Audit review is part of regular operations.'],
  },
  'control-guides-tab-guide': {
    title: 'Control: Guides Tab Guide',
    summary: 'Guides tab shows centrally maintained operational documentation directly inside the Control surface.',
    guide: g([
      ['1. Load guide list', 'Read available guides from the connected guide source.'],
      ['2. Choose target guide', 'Select the matching guide and load the content preview.'],
      ['3. Use in operations', 'Reference guides directly in Control for troubleshooting and release flow.'],
    ]),
    points: ['Guide contents are provided server-side.', 'The tab reduces context switches to external documentation.', 'An empty guide list indicates API data maintenance is needed.'],
  },
  'main-paywall-view-guard-guide': {
    title: 'Nexus Main: Paywall View Guard Guide',
    summary: 'Nexus Main visibly blocks non-entitled views while final authorization remains API-side.',
    guide: g([
      ['1. Trigger login UX', 'Show login/upgrade hint when premium areas are requested.'],
      ['2. Check view access', 'Evaluate current access state before switching views.'],
      ['3. Render blocked state', 'Show blocked view, required tier and reason transparently.'],
    ]),
    points: ['Client-side blocking is UX, not the security anchor.', 'The API makes final entitlement decisions.', 'Guards also cover remote navigation/profile rules.'],
  },
  'mobile-paywall-view-guard-guide': {
    title: 'Nexus Mobile: Paywall View Guard Guide',
    summary: 'Mobile also enforces clear paywall hints for blocked views and prevents navigation into unauthorized areas.',
    guide: g([
      ['1. Intercept navigation', 'Navigation checks access status before switching.'],
      ['2. Render guard state', 'Checking/Blocked states are visible in the mobile layout.'],
      ['3. Offer upgrade path', 'Route users from blocked areas into login/account flow.'],
    ]),
    points: ['Bottom nav and sidebar respect the same allowlist.', 'Remote navigation profiles may map only allowed views.', 'Tier hints stay consistent with desktop Main.'],
  },
  'mobile-workspace-handoff-reminder-health': {
    title: 'Nexus Mobile: Workspace Handoff and Reminder Health',
    summary: 'Mobile shows handoff metadata from workspace transfer and combines it with Today/Reminder Health for clearer continue decisions.',
    guide: g([
      ['1. Read handoff state', 'Dashboard and Files show source, confidence, last action and checkpoint status.'],
      ['2. Evaluate risk and freshness', 'snapshotAge and risk level show whether a transfer is fresh or stale.'],
      ['3. Connect with Today Layer', 'Due-today and overdue signals prioritize the next step after handoff.'],
    ]),
    points: ['useWorkspaceHandoff persists action, time, source and confidence.', 'Handoff mode is currently manual-runtime and remains explicitly traceable.', 'Today/Reminder Health reduces context loss after device or view switches.'],
  },
  'environment-variables-guide': {
    title: 'Configuration Basics Guide',
    summary: 'Public documentation describes general configuration principles only; concrete operational values stay internal.',
    guide: g([
      ['1. Separate app configuration', 'Keep development, staging and production values isolated.'],
      ['2. Protect secrets', 'Maintain sensitive values only through private secret stores and never in public repositories.'],
      ['3. Secure releases', 'Validate with safe defaults and checklists before deploy.'],
    ]),
    points: ['Public wiki pages contain no concrete secret or endpoint values.', 'Internal configuration details belong in private operations docs.', 'Configuration changes should be versioned and approved.'],
  },
  'security-operations-guide': {
    title: 'Security Operations Guide',
    summary: 'Security operations cover access review, device hygiene and audit monitoring in daily operations.',
    guide: g([
      ['1. Device hygiene', 'Approve only trusted devices and clean them up regularly.'],
      ['2. Access hygiene', 'Review permissions regularly and remove unnecessary rights.'],
      ['3. Secret hygiene', 'Rotate internal keys and credentials according to the security process.'],
    ]),
    points: ['Temporary exceptions should be short-lived and controlled.', 'Monitor audit logs for unusual commands or failures.', 'Detailed configuration stays in internal security runbooks.'],
  },
} satisfies Record<string, EntryTranslation>
