export type NexusCoreAppId = 'main' | 'mobile' | 'code' | 'code-mobile'

export type NexusFeatureCatalogLike = {
  features?: Array<{
    featureId?: string
    appTargets?: string[]
    stable?: boolean
    rollout?: string
  }>
}

export type NexusUiSchemaLike = {
  appId?: string
  screens?: Array<{
    id?: string
    enabled?: boolean
  }>
  layoutProfile?: {
    id?: string
    mode?: 'desktop' | 'mobile'
    density?: 'compact' | 'comfortable' | 'spacious'
    navigation?: 'sidebar' | 'bottom-nav' | 'tabs'
    tokens?: Record<string, unknown>
  }
  componentWhitelist?: string[]
}

const normalizeViewId = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9\-_:/.]/g, '')
  .slice(0, 80)

const dedupeList = (items: string[]) => {
  const out: string[] = []
  for (const raw of items) {
    const id = normalizeViewId(raw)
    if (!id || out.includes(id)) continue
    out.push(id)
  }
  return out
}

export const NEXUS_FALLBACK_VIEWS_BY_APP: Record<NexusCoreAppId, string[]> = {
  main: ['dashboard', 'notes', 'code', 'tasks', 'reminders', 'canvas', 'files', 'flux', 'devtools', 'settings', 'info'],
  mobile: ['dashboard', 'notes', 'code', 'tasks', 'reminders', 'canvas', 'files', 'flux', 'devtools', 'settings', 'info'],
  code: ['editor'],
  'code-mobile': ['editor'],
}

const VIEW_FEATURE_MAP: Record<NexusCoreAppId, Record<string, string | null>> = {
  main: {
    dashboard: 'core.dashboard',
    notes: 'core.notes',
    code: 'core.code-editor',
    tasks: 'core.tasks',
    reminders: null,
    canvas: null,
    files: null,
    flux: null,
    devtools: null,
    settings: null,
    info: null,
  },
  mobile: {
    dashboard: 'core.dashboard',
    notes: 'core.notes',
    code: 'core.code-editor',
    tasks: 'core.tasks',
    reminders: null,
    canvas: null,
    files: null,
    flux: null,
    devtools: null,
    settings: null,
    info: null,
  },
  code: {
    editor: 'core.code-editor',
  },
  'code-mobile': {
    editor: 'core.code-editor',
  },
}

export const getFallbackViewsForApp = (appId: NexusCoreAppId) => (
  [...(NEXUS_FALLBACK_VIEWS_BY_APP[appId] || [])]
)

const collectStableFeatureIds = (appId: NexusCoreAppId, catalog: NexusFeatureCatalogLike | null | undefined) => {
  const stable = new Set<string>()
  const source = Array.isArray(catalog?.features) ? catalog.features : []

  for (const entry of source) {
    const featureId = String(entry?.featureId || '').trim().toLowerCase()
    if (!featureId) continue
    const rollout = String(entry?.rollout || '').trim().toLowerCase()
    const stableFlag = entry?.stable === true || rollout === 'stable'
    if (!stableFlag) continue

    const targets = Array.isArray(entry?.appTargets) ? entry.appTargets : []
    if (targets.length > 0 && !targets.includes(appId)) continue

    stable.add(featureId)
  }

  return stable
}

const resolveSchemaViews = (schema: NexusUiSchemaLike | null | undefined) => {
  const source = Array.isArray(schema?.screens) ? schema.screens : []
  const enabled = source
    .filter((screen) => screen?.enabled !== false)
    .map((screen) => normalizeViewId(String(screen?.id || '')))
    .filter(Boolean)

  return dedupeList(enabled)
}

export const buildLiveViewModel = (input: {
  appId: NexusCoreAppId
  catalog?: NexusFeatureCatalogLike | null
  schema?: NexusUiSchemaLike | null
}) => {
  const appId = input.appId
  const fallbackViews = getFallbackViewsForApp(appId)
  const schemaViews = resolveSchemaViews(input.schema)
  const featureMap = VIEW_FEATURE_MAP[appId] || {}
  const stableFeatureIds = collectStableFeatureIds(appId, input.catalog)
  const candidates = schemaViews.length > 0 ? schemaViews : fallbackViews
  const supportedByClient = new Set(fallbackViews)
  const disabledViews: string[] = []
  const finalViews: string[] = []

  for (const viewId of dedupeList(candidates)) {
    if (!supportedByClient.has(viewId)) continue
    const featureId = featureMap[viewId]
    if (featureId && !stableFeatureIds.has(featureId)) {
      disabledViews.push(viewId)
      continue
    }
    finalViews.push(viewId)
  }

  // Never produce an empty navigation list.
  if (finalViews.length === 0) {
    return {
      views: fallbackViews.slice(0, 1),
      disabledViews: dedupeList(disabledViews),
      enabledFeatureIds: Array.from(stableFeatureIds),
    }
  }

  return {
    views: finalViews,
    disabledViews: dedupeList(disabledViews),
    enabledFeatureIds: Array.from(stableFeatureIds),
  }
}

export const resolveLayoutProfile = (schema: NexusUiSchemaLike | null | undefined, fallback: {
  mode: 'desktop' | 'mobile'
  density: 'compact' | 'comfortable' | 'spacious'
  navigation: 'sidebar' | 'bottom-nav' | 'tabs'
} = {
  mode: 'desktop',
  density: 'comfortable',
  navigation: 'sidebar',
}) => {
  const profile = schema?.layoutProfile || {}
  const mode = profile.mode === 'mobile' || profile.mode === 'desktop'
    ? profile.mode
    : fallback.mode
  const density = profile.density === 'compact' || profile.density === 'comfortable' || profile.density === 'spacious'
    ? profile.density
    : fallback.density
  const navigation = profile.navigation === 'bottom-nav' || profile.navigation === 'tabs' || profile.navigation === 'sidebar'
    ? profile.navigation
    : fallback.navigation

  return {
    id: String(profile.id || `${mode}-default`),
    mode,
    density,
    navigation,
    tokens: profile.tokens && typeof profile.tokens === 'object' ? profile.tokens : {},
  }
}
