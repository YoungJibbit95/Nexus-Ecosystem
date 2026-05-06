export type NexusViewId =
  | 'dashboard'
  | 'notes'
  | 'code'
  | 'tasks'
  | 'reminders'
  | 'canvas'
  | 'files'
  | 'flux'
  | 'settings'
  | 'info'
  | 'devtools'

export type NexusViewMeta = {
  title: string
  subtitle: string
}

export const NEXUS_VIEW_META: Record<NexusViewId, NexusViewMeta> = {
  dashboard: { title: 'Dashboard', subtitle: 'Dein täglicher Überblick' },
  notes: { title: 'Notizen', subtitle: 'Schnell festhalten und strukturieren' },
  code: { title: 'Code', subtitle: 'Editor und Snippets an einem Ort' },
  tasks: { title: 'Tasks', subtitle: 'Prioritäten klar und fokussiert' },
  reminders: { title: 'Reminders', subtitle: 'Nichts Wichtiges verpassen' },
  canvas: { title: 'Canvas', subtitle: 'Ideen frei visualisieren' },
  files: { title: 'Dateien', subtitle: 'Alles griffbereit im Workspace' },
  flux: { title: 'Flux', subtitle: 'Live-Flow und Experimente' },
  settings: { title: 'Settings', subtitle: 'Look, Bedienung und Verhalten' },
  info: { title: 'Info', subtitle: 'Status, Version und Hinweise' },
  devtools: { title: 'DevTools', subtitle: 'Debugging und Utilities' },
}

export const NEXUS_VIEW_ORDER: NexusViewId[] = [
  'dashboard',
  'notes',
  'code',
  'tasks',
  'reminders',
  'canvas',
  'files',
  'flux',
  'settings',
  'info',
  'devtools',
]

export type NexusViewNavigationGroup = 'primary' | 'support' | 'developer'

export type NexusViewSurfaceMode =
  | 'dashboard'
  | 'library'
  | 'editor'
  | 'board'
  | 'agenda'
  | 'canvas'
  | 'browser'
  | 'flow'
  | 'settings'
  | 'status'
  | 'diagnostics'

export type NexusViewPanelPlacement = 'left' | 'right' | 'bottom' | 'sheet'

export type NexusViewPanelState = 'open' | 'collapsed' | 'hidden'

export type NexusViewActionPlacement =
  | 'primary'
  | 'toolbar'
  | 'command'
  | 'context'

export type NexusViewActionIntent =
  | 'create'
  | 'search'
  | 'edit'
  | 'organize'
  | 'run'
  | 'inspect'
  | 'export'
  | 'settings'

export type NexusViewActionManifest = {
  id: string
  title: string
  description?: string
  intent: NexusViewActionIntent
  placement: NexusViewActionPlacement
  shortcut?: string
  requiresSelection?: boolean
}

export type NexusViewPanelManifest = {
  id: string
  title: string
  placement: NexusViewPanelPlacement
  defaultState: NexusViewPanelState
  mobilePresentation: 'inline' | 'sheet' | 'hidden'
}

export type NexusViewManifest = NexusViewMeta & {
  id: NexusViewId
  navLabel: string
  category: 'home' | 'capture' | 'create' | 'workspace' | 'system'
  navigationGroup: NexusViewNavigationGroup
  icon: string
  accent: string
  desktopMode: NexusViewSurfaceMode
  mobileMode: NexusViewSurfaceMode | 'stack'
  defaultActionId: string
  actions: NexusViewActionManifest[]
  panels: NexusViewPanelManifest[]
  shortcuts: string[]
  statusSignals: string[]
}

const primaryAction = (
  id: string,
  title: string,
  intent: NexusViewActionIntent,
  shortcut?: string,
): NexusViewActionManifest => ({
  id,
  title,
  intent,
  shortcut,
  placement: 'primary',
})

export const NEXUS_VIEW_MANIFESTS: Record<NexusViewId, NexusViewManifest> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    subtitle: 'Dein taeglicher Ueberblick',
    navLabel: 'Dashboard',
    category: 'home',
    navigationGroup: 'primary',
    icon: 'bar-chart-3',
    accent: '#0a84ff',
    desktopMode: 'dashboard',
    mobileMode: 'stack',
    defaultActionId: 'quick-capture',
    actions: [
      primaryAction('quick-capture', 'Quick Capture', 'create', 'Ctrl+Shift+N'),
      { id: 'edit-layout', title: 'Layout bearbeiten', intent: 'organize', placement: 'toolbar' },
      { id: 'open-command-center', title: 'Command Center', intent: 'search', placement: 'command', shortcut: 'Ctrl+K' },
    ],
    panels: [
      { id: 'activity', title: 'Activity Feed', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
      { id: 'today', title: 'Today Strip', placement: 'bottom', defaultState: 'open', mobilePresentation: 'inline' },
    ],
    shortcuts: ['Ctrl+K', 'Ctrl+Shift+N'],
    statusSignals: ['sync', 'api', 'workspace', 'motion'],
  },
  notes: {
    id: 'notes',
    title: 'Notizen',
    subtitle: 'Schnell festhalten und strukturieren',
    navLabel: 'Notizen',
    category: 'capture',
    navigationGroup: 'primary',
    icon: 'file-text',
    accent: '#34c759',
    desktopMode: 'editor',
    mobileMode: 'stack',
    defaultActionId: 'new-note',
    actions: [
      primaryAction('new-note', 'Neue Notiz', 'create', 'Ctrl+N'),
      { id: 'search-notes', title: 'Notizen suchen', intent: 'search', placement: 'toolbar', shortcut: 'Ctrl+F' },
      { id: 'toggle-preview', title: 'Preview wechseln', intent: 'edit', placement: 'toolbar' },
    ],
    panels: [
      { id: 'library', title: 'Bibliothek', placement: 'left', defaultState: 'open', mobilePresentation: 'sheet' },
      { id: 'outline', title: 'Outline', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
      { id: 'magic', title: 'Magic Panel', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
    ],
    shortcuts: ['Ctrl+N', 'Ctrl+F'],
    statusSignals: ['dirty', 'saving', 'offline'],
  },
  code: {
    id: 'code',
    title: 'Code',
    subtitle: 'Editor und Snippets an einem Ort',
    navLabel: 'Code',
    category: 'create',
    navigationGroup: 'primary',
    icon: 'code-2',
    accent: '#bf5af2',
    desktopMode: 'editor',
    mobileMode: 'stack',
    defaultActionId: 'run-snippet',
    actions: [
      primaryAction('run-snippet', 'Snippet ausfuehren', 'run', 'Ctrl+Enter'),
      { id: 'open-problems', title: 'Problems anzeigen', intent: 'inspect', placement: 'toolbar' },
      { id: 'save-snippet', title: 'Snippet speichern', intent: 'edit', placement: 'toolbar', shortcut: 'Ctrl+S' },
    ],
    panels: [
      { id: 'files', title: 'Dateikontext', placement: 'left', defaultState: 'collapsed', mobilePresentation: 'sheet' },
      { id: 'output', title: 'Run Output', placement: 'bottom', defaultState: 'open', mobilePresentation: 'sheet' },
    ],
    shortcuts: ['Ctrl+Enter', 'Ctrl+S'],
    statusSignals: ['runtime', 'sandbox', 'problems'],
  },
  tasks: {
    id: 'tasks',
    title: 'Tasks',
    subtitle: 'Prioritaeten klar und fokussiert',
    navLabel: 'Tasks',
    category: 'workspace',
    navigationGroup: 'primary',
    icon: 'columns',
    accent: '#ff9f0a',
    desktopMode: 'board',
    mobileMode: 'stack',
    defaultActionId: 'new-task',
    actions: [
      primaryAction('new-task', 'Neuer Task', 'create', 'Ctrl+Shift+T'),
      { id: 'quick-filter', title: 'Quick Filter', intent: 'search', placement: 'toolbar' },
      { id: 'bulk-actions', title: 'Bulk Actions', intent: 'organize', placement: 'context', requiresSelection: true },
    ],
    panels: [
      { id: 'detail', title: 'Task Details', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
      { id: 'filters', title: 'Filter', placement: 'left', defaultState: 'collapsed', mobilePresentation: 'sheet' },
    ],
    shortcuts: ['Ctrl+Shift+T'],
    statusSignals: ['selection', 'filters', 'sync'],
  },
  reminders: {
    id: 'reminders',
    title: 'Reminders',
    subtitle: 'Nichts Wichtiges verpassen',
    navLabel: 'Reminders',
    category: 'workspace',
    navigationGroup: 'primary',
    icon: 'bell',
    accent: '#ff453a',
    desktopMode: 'agenda',
    mobileMode: 'stack',
    defaultActionId: 'new-reminder',
    actions: [
      primaryAction('new-reminder', 'Neue Erinnerung', 'create', 'Ctrl+Shift+R'),
      { id: 'snooze-overdue', title: 'Overdue snoozen', intent: 'organize', placement: 'toolbar' },
      { id: 'calendar-strip', title: 'Kalenderleiste', intent: 'inspect', placement: 'toolbar' },
    ],
    panels: [
      { id: 'agenda', title: 'Agenda', placement: 'left', defaultState: 'open', mobilePresentation: 'inline' },
      { id: 'rules', title: 'Wiederholungen', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
    ],
    shortcuts: ['Ctrl+Shift+R'],
    statusSignals: ['due', 'overdue', 'notifications'],
  },
  canvas: {
    id: 'canvas',
    title: 'Canvas',
    subtitle: 'Ideen frei visualisieren',
    navLabel: 'Canvas',
    category: 'create',
    navigationGroup: 'primary',
    icon: 'git-branch',
    accent: '#64d2ff',
    desktopMode: 'canvas',
    mobileMode: 'canvas',
    defaultActionId: 'new-canvas-node',
    actions: [
      primaryAction('new-canvas-node', 'Node erstellen', 'create', 'N'),
      { id: 'toggle-grid', title: 'Grid/Snap', intent: 'settings', placement: 'toolbar' },
      { id: 'export-canvas', title: 'Export', intent: 'export', placement: 'toolbar' },
    ],
    panels: [
      { id: 'layers', title: 'Layer', placement: 'left', defaultState: 'collapsed', mobilePresentation: 'sheet' },
      { id: 'inspector', title: 'Inspector', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
      { id: 'minimap', title: 'Minimap', placement: 'bottom', defaultState: 'collapsed', mobilePresentation: 'hidden' },
    ],
    shortcuts: ['N', 'Space', 'Ctrl+E'],
    statusSignals: ['selection', 'zoom', 'dirty'],
  },
  files: {
    id: 'files',
    title: 'Dateien',
    subtitle: 'Alles griffbereit im Workspace',
    navLabel: 'Dateien',
    category: 'workspace',
    navigationGroup: 'primary',
    icon: 'hard-drive',
    accent: '#5e5ce6',
    desktopMode: 'browser',
    mobileMode: 'stack',
    defaultActionId: 'import-file',
    actions: [
      primaryAction('import-file', 'Datei importieren', 'create'),
      { id: 'search-files', title: 'Dateien suchen', intent: 'search', placement: 'toolbar', shortcut: 'Ctrl+F' },
      { id: 'copy-path', title: 'Pfad kopieren', intent: 'export', placement: 'context', requiresSelection: true },
    ],
    panels: [
      { id: 'tree', title: 'Workspace Tree', placement: 'left', defaultState: 'open', mobilePresentation: 'sheet' },
      { id: 'preview', title: 'Preview', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
    ],
    shortcuts: ['Ctrl+F'],
    statusSignals: ['root-trust', 'selection', 'fs-sync'],
  },
  flux: {
    id: 'flux',
    title: 'Flux',
    subtitle: 'Live-Flow und Experimente',
    navLabel: 'Flux',
    category: 'create',
    navigationGroup: 'primary',
    icon: 'zap',
    accent: '#ffd60a',
    desktopMode: 'flow',
    mobileMode: 'stack',
    defaultActionId: 'new-flow',
    actions: [
      primaryAction('new-flow', 'Neuer Flow', 'create'),
      { id: 'convert-to-task', title: 'In Task umwandeln', intent: 'organize', placement: 'context', requiresSelection: true },
      { id: 'focus-mode', title: 'Focus Mode', intent: 'inspect', placement: 'toolbar' },
    ],
    panels: [
      { id: 'stages', title: 'Stages', placement: 'left', defaultState: 'open', mobilePresentation: 'inline' },
      { id: 'inspector', title: 'Status Inspector', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
    ],
    shortcuts: [],
    statusSignals: ['stage', 'connections', 'automation'],
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Look, Bedienung und Verhalten',
    navLabel: 'Settings',
    category: 'system',
    navigationGroup: 'support',
    icon: 'settings',
    accent: '#8e8e93',
    desktopMode: 'settings',
    mobileMode: 'stack',
    defaultActionId: 'search-settings',
    actions: [
      primaryAction('search-settings', 'Settings suchen', 'search', 'Ctrl+F'),
      { id: 'test-api', title: 'API testen', intent: 'inspect', placement: 'toolbar' },
      { id: 'reset-theme-preview', title: 'Theme Preview resetten', intent: 'settings', placement: 'context' },
    ],
    panels: [
      { id: 'categories', title: 'Kategorien', placement: 'left', defaultState: 'open', mobilePresentation: 'sheet' },
      { id: 'preview', title: 'Preview', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'inline' },
    ],
    shortcuts: ['Ctrl+F'],
    statusSignals: ['api', 'theme', 'density'],
  },
  info: {
    id: 'info',
    title: 'Info',
    subtitle: 'Status, Version und Hinweise',
    navLabel: 'Info',
    category: 'system',
    navigationGroup: 'support',
    icon: 'info',
    accent: '#64d2ff',
    desktopMode: 'status',
    mobileMode: 'stack',
    defaultActionId: 'copy-report',
    actions: [
      primaryAction('copy-report', 'Report kopieren', 'export'),
      { id: 'open-wiki', title: 'Wiki oeffnen', intent: 'inspect', placement: 'toolbar' },
      { id: 'check-runtime', title: 'Runtime pruefen', intent: 'inspect', placement: 'toolbar' },
    ],
    panels: [
      { id: 'runtime', title: 'Runtime Health', placement: 'right', defaultState: 'open', mobilePresentation: 'inline' },
    ],
    shortcuts: [],
    statusSignals: ['version', 'channel', 'api'],
  },
  devtools: {
    id: 'devtools',
    title: 'DevTools',
    subtitle: 'Debugging und Utilities',
    navLabel: 'DevTools',
    category: 'system',
    navigationGroup: 'developer',
    icon: 'wrench',
    accent: '#ff6b35',
    desktopMode: 'diagnostics',
    mobileMode: 'stack',
    defaultActionId: 'export-diagnostics',
    actions: [
      primaryAction('export-diagnostics', 'Diagnostics exportieren', 'export'),
      { id: 'open-feature-catalog', title: 'Feature Catalog', intent: 'inspect', placement: 'toolbar' },
      { id: 'open-perf-timeline', title: 'Perf Timeline', intent: 'inspect', placement: 'toolbar' },
    ],
    panels: [
      { id: 'logs', title: 'Logs', placement: 'bottom', defaultState: 'open', mobilePresentation: 'sheet' },
      { id: 'capabilities', title: 'Capabilities', placement: 'right', defaultState: 'collapsed', mobilePresentation: 'sheet' },
    ],
    shortcuts: [],
    statusSignals: ['logs', 'perf', 'capabilities'],
  },
}

const NEXUS_VIEW_TRANSITION_HINTS: Record<NexusViewId, NexusViewId[]> = {
  dashboard: ['notes', 'tasks', 'files', 'canvas', 'settings'],
  notes: ['tasks', 'dashboard', 'canvas', 'files', 'settings'],
  code: ['files', 'notes', 'devtools', 'settings', 'dashboard'],
  tasks: ['notes', 'dashboard', 'reminders', 'canvas', 'settings'],
  reminders: ['tasks', 'dashboard', 'notes', 'settings', 'files'],
  canvas: ['notes', 'tasks', 'dashboard', 'files', 'settings'],
  files: ['code', 'notes', 'dashboard', 'tasks', 'settings'],
  flux: ['dashboard', 'devtools', 'settings', 'notes', 'tasks'],
  settings: ['dashboard', 'notes', 'tasks', 'files', 'canvas'],
  info: ['settings', 'dashboard', 'devtools', 'notes', 'tasks'],
  devtools: ['code', 'flux', 'settings', 'dashboard', 'notes'],
}

const NEXUS_VIEW_SET = new Set<NexusViewId>(NEXUS_VIEW_ORDER)

const isNexusView = (value: unknown): value is NexusViewId =>
  typeof value === 'string' && NEXUS_VIEW_SET.has(value as NexusViewId)

const toUniqueViewList = (views: readonly string[]) => {
  const seen = new Set<NexusViewId>()
  const result: NexusViewId[] = []
  views.forEach((candidate) => {
    if (!isNexusView(candidate) || seen.has(candidate)) return
    seen.add(candidate)
    result.push(candidate)
  })
  return result
}

export const isNexusViewId = isNexusView

export const getNexusViewManifest = (viewId: string) =>
  isNexusView(viewId) ? NEXUS_VIEW_MANIFESTS[viewId] : null

export const getNexusViewManifests = (views: readonly string[]) =>
  toUniqueViewList(views).map((viewId) => NEXUS_VIEW_MANIFESTS[viewId])

export type NexusViewCommandManifest = NexusViewActionManifest & {
  commandId: string
  viewId: NexusViewId
  viewTitle: string
}

export const buildNexusViewCommandRegistry = (
  views: readonly string[] = NEXUS_VIEW_ORDER,
): NexusViewCommandManifest[] =>
  getNexusViewManifests(views).flatMap((manifest) =>
    manifest.actions.map((action) => ({
      ...action,
      commandId: `${manifest.id}.${action.id}`,
      viewId: manifest.id,
      viewTitle: manifest.title,
    })),
  )

export type NexusViewLayoutSurface = 'desktop' | 'tablet' | 'mobile'

export type NexusViewLayoutDensity = 'compact' | 'comfortable' | 'spacious'

export type NexusViewChromeLevel = 'full' | 'focused' | 'immersive'

export type NexusViewContentPriority =
  | 'balanced'
  | 'content-first'
  | 'creation-first'
  | 'diagnostic'

export type NexusViewAnimationProfile = 'none' | 'calm' | 'standard' | 'spatial'

export type NexusResolvedPanelPresentation = 'rail' | 'sheet' | 'inline' | 'hidden'

export type NexusResolvedViewPanel = NexusViewPanelManifest & {
  state: NexusViewPanelState
  visible: boolean
  presentation: NexusResolvedPanelPresentation
  rail: NexusViewPanelPlacement | 'none'
  priority: number
  isInspectorCandidate: boolean
}

export type NexusViewLayoutSchemaV2 = {
  version: 2
  viewId: NexusViewId
  surface: NexusViewLayoutSurface
  surfaceMode: NexusViewSurfaceMode | 'stack'
  density: NexusViewLayoutDensity
  chrome: NexusViewChromeLevel
  contentPriority: NexusViewContentPriority
  columns: 1 | 2 | 3
  minContentWidth: number
  inspectorDefaultOpen: boolean
  animationProfile: NexusViewAnimationProfile
  panels: NexusResolvedViewPanel[]
  primaryPanelId: string | null
  statusSignals: string[]
  focusTargets: string[]
  commandPlacements: Record<NexusViewActionPlacement, string[]>
}

export type NexusViewLayoutOptions = {
  viewId: string
  surface?: NexusViewLayoutSurface
  density?: NexusViewLayoutDensity
  focusMode?: boolean
  inspectorOpen?: boolean
  activePanelId?: string | null
  reducedMotion?: boolean
}

const CONTENT_PRIORITY_BY_MODE: Record<
  NexusViewSurfaceMode | 'stack',
  NexusViewContentPriority
> = {
  dashboard: 'balanced',
  library: 'balanced',
  editor: 'content-first',
  board: 'balanced',
  agenda: 'balanced',
  canvas: 'creation-first',
  browser: 'content-first',
  flow: 'creation-first',
  settings: 'balanced',
  status: 'balanced',
  diagnostics: 'diagnostic',
  stack: 'content-first',
}

const getSurfaceMode = (
  manifest: NexusViewManifest,
  surface: NexusViewLayoutSurface,
) => (surface === 'mobile' ? manifest.mobileMode : manifest.desktopMode)

const getColumnCount = (
  mode: NexusViewSurfaceMode | 'stack',
  surface: NexusViewLayoutSurface,
  focusMode: boolean,
): 1 | 2 | 3 => {
  if (focusMode || surface === 'mobile') return 1
  if (surface === 'tablet') return mode === 'canvas' || mode === 'board' ? 2 : 1
  if (mode === 'dashboard' || mode === 'board' || mode === 'canvas') return 2
  return 1
}

const getMinimumContentWidth = (
  mode: NexusViewSurfaceMode | 'stack',
  surface: NexusViewLayoutSurface,
) => {
  if (surface === 'mobile') return 320
  if (mode === 'canvas' || mode === 'editor' || mode === 'browser') return 760
  if (mode === 'board' || mode === 'dashboard') return 680
  return 560
}

const getAnimationProfile = (
  mode: NexusViewSurfaceMode | 'stack',
  surface: NexusViewLayoutSurface,
  reducedMotion: boolean,
): NexusViewAnimationProfile => {
  if (reducedMotion) return 'none'
  if (surface === 'mobile') return 'calm'
  if (mode === 'canvas' || mode === 'flow') return 'spatial'
  return 'standard'
}

const toCommandPlacements = (
  commands: readonly NexusViewCommandManifest[],
): Record<NexusViewActionPlacement, string[]> => ({
  primary: commands
    .filter((command) => command.placement === 'primary')
    .map((command) => command.commandId),
  toolbar: commands
    .filter((command) => command.placement === 'toolbar')
    .map((command) => command.commandId),
  command: commands
    .filter((command) => command.placement === 'command')
    .map((command) => command.commandId),
  context: commands
    .filter((command) => command.placement === 'context')
    .map((command) => command.commandId),
})

export const resolveNexusViewPanels = ({
  viewId,
  surface = 'desktop',
  focusMode = false,
  inspectorOpen = false,
  activePanelId = null,
}: NexusViewLayoutOptions): NexusResolvedViewPanel[] => {
  const manifest = getNexusViewManifest(viewId)
  if (!manifest) return []

  return manifest.panels.map((panel, index) => {
    const presentation: NexusResolvedPanelPresentation =
      surface === 'mobile'
        ? panel.mobilePresentation
        : panel.placement === 'bottom'
          ? 'inline'
          : 'rail'
    const hiddenByFocus = focusMode && panel.placement !== 'bottom'
    const isActive = activePanelId === panel.id
    const shouldOpenForInspector =
      inspectorOpen && (panel.placement === 'right' || panel.mobilePresentation === 'sheet')
    const state: NexusViewPanelState = hiddenByFocus
      ? 'hidden'
      : isActive || shouldOpenForInspector
        ? 'open'
        : panel.defaultState
    const visible =
      !hiddenByFocus &&
      presentation !== 'hidden' &&
      state !== 'hidden' &&
      (state === 'open' || presentation === 'inline')

    return {
      ...panel,
      state,
      visible,
      presentation,
      rail: presentation === 'rail' ? panel.placement : 'none',
      priority: index + 1,
      isInspectorCandidate:
        panel.placement === 'right' || panel.mobilePresentation === 'sheet',
    }
  })
}

export const resolveNexusViewLayout = (
  options: NexusViewLayoutOptions,
): NexusViewLayoutSchemaV2 | null => {
  const manifest = getNexusViewManifest(options.viewId)
  if (!manifest) return null

  const surface = options.surface ?? 'desktop'
  const density = options.density ?? 'comfortable'
  const focusMode = Boolean(options.focusMode)
  const mode = getSurfaceMode(manifest, surface)
  const panels = resolveNexusViewPanels(options)
  const commands = buildNexusViewCommandRegistry([manifest.id])
  const primaryPanel =
    panels.find((panel) => panel.id === options.activePanelId && panel.visible) ??
    panels.find((panel) => panel.visible && panel.state === 'open') ??
    panels.find((panel) => panel.visible) ??
    null

  return {
    version: 2,
    viewId: manifest.id,
    surface,
    surfaceMode: mode,
    density,
    chrome: focusMode ? 'focused' : mode === 'canvas' ? 'immersive' : 'full',
    contentPriority: CONTENT_PRIORITY_BY_MODE[mode],
    columns: getColumnCount(mode, surface, focusMode),
    minContentWidth: getMinimumContentWidth(mode, surface),
    inspectorDefaultOpen: panels.some(
      (panel) => panel.isInspectorCandidate && panel.state === 'open',
    ),
    animationProfile: getAnimationProfile(mode, surface, Boolean(options.reducedMotion)),
    panels,
    primaryPanelId: primaryPanel?.id ?? null,
    statusSignals: manifest.statusSignals,
    focusTargets: [
      manifest.defaultActionId,
      ...manifest.actions
        .filter((action) => action.placement === 'toolbar')
        .map((action) => action.id),
    ],
    commandPlacements: toCommandPlacements(commands),
  }
}

export type NexusViewCommandContext = {
  activeView?: string
  hasSelection?: boolean
  readOnly?: boolean
  entitlementState?: 'allowed' | 'blocked' | 'unknown'
  availableViews?: readonly string[]
}

export type NexusResolvedViewCommand = NexusViewCommandManifest & {
  enabled: boolean
  disabledReason?: 'requires-selection' | 'read-only' | 'entitlement-blocked' | 'view-unavailable'
  scope: 'view' | 'global'
  priority: number
  placementRank: number
}

const MUTATING_INTENTS = new Set<NexusViewActionIntent>([
  'create',
  'edit',
  'organize',
  'run',
  'settings',
])

const PREMIUM_VIEW_IDS = new Set<NexusViewId>(['canvas', 'code', 'devtools', 'flux'])

const PLACEMENT_RANK: Record<NexusViewActionPlacement, number> = {
  primary: 0,
  toolbar: 1,
  command: 2,
  context: 3,
}

const resolveCommandDisabledReason = (
  command: NexusViewCommandManifest,
  context: NexusViewCommandContext,
): NexusResolvedViewCommand['disabledReason'] | undefined => {
  const availableViews = context.availableViews
    ? new Set(toUniqueViewList(context.availableViews))
    : null
  if (availableViews && !availableViews.has(command.viewId)) return 'view-unavailable'
  if (command.requiresSelection && !context.hasSelection) return 'requires-selection'
  if (context.readOnly && MUTATING_INTENTS.has(command.intent)) return 'read-only'
  if (context.entitlementState === 'blocked' && PREMIUM_VIEW_IDS.has(command.viewId)) {
    return 'entitlement-blocked'
  }
  return undefined
}

export const resolveNexusViewCommandRegistry = ({
  views = NEXUS_VIEW_ORDER,
  activeView,
  hasSelection = false,
  readOnly = false,
  entitlementState = 'unknown',
  availableViews,
}: NexusViewCommandContext & { views?: readonly string[] } = {}): NexusResolvedViewCommand[] =>
  buildNexusViewCommandRegistry(views)
    .map((command, index) => {
      const disabledReason = resolveCommandDisabledReason(command, {
        activeView,
        hasSelection,
        readOnly,
        entitlementState,
        availableViews,
      })
      return {
        ...command,
        enabled: !disabledReason,
        disabledReason,
        scope: activeView === command.viewId ? ('view' as const) : ('global' as const),
        priority: index + PLACEMENT_RANK[command.placement] * 100,
        placementRank: PLACEMENT_RANK[command.placement],
      }
    })
    .sort((a, b) => a.priority - b.priority)

export const resolveDefaultNexusViewCommand = (
  viewId: string,
  context: NexusViewCommandContext = {},
) => {
  const manifest = getNexusViewManifest(viewId)
  if (!manifest) return null
  const commands = resolveNexusViewCommandRegistry({
    ...context,
    views: [manifest.id],
    activeView: manifest.id,
  })
  return (
    commands.find((command) => command.id === manifest.defaultActionId) ??
    commands.find((command) => command.placement === 'primary') ??
    null
  )
}

export type NexusViewCommandHandler = (
  command: NexusResolvedViewCommand,
  context: NexusViewCommandContext,
) => void | Promise<void>

export type NexusViewCommandHandlers = Partial<Record<string, NexusViewCommandHandler>>

export type NexusViewCommandExecutionResult =
  | { ok: true; command: NexusResolvedViewCommand }
  | {
      ok: false
      commandId: string
      command?: NexusResolvedViewCommand
      reason: 'not-found' | 'disabled' | 'no-handler'
    }

export const executeNexusViewCommand = async ({
  commandId,
  registry,
  handlers = {},
  context = {},
}: {
  commandId: string
  registry: readonly NexusResolvedViewCommand[]
  handlers?: NexusViewCommandHandlers
  context?: NexusViewCommandContext
}): Promise<NexusViewCommandExecutionResult> => {
  const command = registry.find((candidate) => candidate.commandId === commandId)
  if (!command) return { ok: false, commandId, reason: 'not-found' }
  if (!command.enabled) return { ok: false, commandId, command, reason: 'disabled' }

  const handler =
    handlers[command.commandId] ??
    handlers[`${command.viewId}.*`] ??
    handlers['*']
  if (!handler) return { ok: false, commandId, command, reason: 'no-handler' }

  await handler(command, context)
  return { ok: true, command }
}

export const buildNexusPanelEngine = (options: NexusViewLayoutOptions) => {
  const layout = resolveNexusViewLayout(options)
  const panels = layout?.panels ?? []
  const activePanel =
    panels.find((panel) => panel.id === options.activePanelId && panel.visible) ??
    panels.find((panel) => panel.id === layout?.primaryPanelId) ??
    null

  return {
    layout,
    panels,
    activePanel,
    railPanels: panels.filter((panel) => panel.presentation === 'rail' && panel.visible),
    sheetPanels: panels.filter((panel) => panel.presentation === 'sheet'),
    inlinePanels: panels.filter((panel) => panel.presentation === 'inline' && panel.visible),
    inspectorPanels: panels.filter((panel) => panel.isInspectorCandidate),
    hasVisibleInspector: panels.some(
      (panel) => panel.isInspectorCandidate && panel.visible,
    ),
  }
}

export const orderViewsForNavigation = (views: readonly string[]) => {
  const available = new Set(toUniqueViewList(views))
  return NEXUS_VIEW_ORDER.filter((viewId) => available.has(viewId))
}

export const resolveViewHotkey = (
  index: number,
  availableViews: readonly string[],
) => {
  if (!Number.isFinite(index) || index < 0) return null
  const ordered = orderViewsForNavigation(availableViews)
  return ordered[index] || null
}

export const buildViewWarmupPlan = ({
  currentView,
  availableViews,
  mountedViews = [],
  maxItems = 4,
}: {
  currentView: string
  availableViews: readonly string[]
  mountedViews?: readonly string[]
  maxItems?: number
}) => {
  const current = isNexusView(currentView) ? currentView : null
  const availableOrdered = orderViewsForNavigation(availableViews)
  const mounted = new Set(toUniqueViewList(mountedViews))
  const hints = current ? NEXUS_VIEW_TRANSITION_HINTS[current] : []
  const queue = toUniqueViewList([...hints, ...availableOrdered])
    .filter((viewId) => viewId !== current)
    .filter((viewId) => !mounted.has(viewId))

  return queue.slice(0, Math.max(1, Math.floor(maxItems)))
}

export type NexusViewTransitionStats = Partial<
  Record<NexusViewId, Partial<Record<NexusViewId, number>>>
>

const getTransitionWeight = (
  stats: NexusViewTransitionStats | undefined,
  from: NexusViewId,
  to: NexusViewId,
) => {
  const next = stats?.[from]?.[to]
  return Number.isFinite(next) ? Number(next) : 0
}

export const buildAdaptiveViewWarmupPlan = ({
  currentView,
  availableViews,
  mountedViews = [],
  transitionStats,
  recentViews = [],
  maxItems = 4,
}: {
  currentView: string
  availableViews: readonly string[]
  mountedViews?: readonly string[]
  transitionStats?: NexusViewTransitionStats
  recentViews?: readonly string[]
  maxItems?: number
}) => {
  const basePlan = buildViewWarmupPlan({
    currentView,
    availableViews,
    mountedViews,
    maxItems: Math.max(maxItems * 2, 6),
  })
  const current = isNexusView(currentView) ? currentView : null
  const baseRank = new Map(basePlan.map((viewId, index) => [viewId, index]))
  const recentOrder = toUniqueViewList(recentViews)
  const recentRank = new Map(recentOrder.map((viewId, index) => [viewId, index]))

  const candidates = toUniqueViewList([
    ...basePlan,
    ...orderViewsForNavigation(availableViews),
  ])
  const ranked = candidates
    .map((candidate) => {
      const base = baseRank.has(candidate)
        ? Math.max(0, 10 - Number(baseRank.get(candidate)))
        : 0
      const recency = recentRank.has(candidate)
        ? Math.max(0, 8 - Number(recentRank.get(candidate)))
        : 0
      const transition = current
        ? getTransitionWeight(transitionStats, current, candidate)
        : 0
      const score = base * 1.1 + recency * 0.9 + transition * 2.7
      return { candidate, score }
    })
    .sort((a, b) => b.score - a.score)

  return ranked
    .slice(0, Math.max(1, Math.floor(maxItems)))
    .map((entry) => entry.candidate)
}
