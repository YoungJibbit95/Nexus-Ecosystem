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
