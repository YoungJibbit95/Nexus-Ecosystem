import type {
  NexusAppId,
  NexusFeatureCatalog,
  NexusFeatureManifestItem,
  NexusLiveBundle,
  NexusReleaseChannel,
  NexusReleaseSnapshot,
  NexusUiSchemaDocument,
} from '../../types'
import { NEXUS_FALLBACK_VIEWS_BY_APP } from '../../../liveSync'
import { normalizeReleaseChannel, sleep } from '../utils'

const COMPAT_MATRIX: Record<NexusAppId, string> = {
  main: '>=0.0.0',
  mobile: '>=0.0.0',
  code: '>=0.0.0',
  'code-mobile': '>=0.0.0',
  control: '>=0.0.0',
}

const formatTitle = (value: string) => value
  .split(/[-_:/.]+/)
  .filter(Boolean)
  .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
  .join(' ')

const resolveFallbackViews = (appId: NexusAppId): string[] => {
  if (appId === 'control') return ['dashboard', 'settings']
  return NEXUS_FALLBACK_VIEWS_BY_APP[appId] || ['dashboard']
}

const makeFeatureId = (viewId: string) => `core.${String(viewId || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._-]/g, '-')}`

const nowIso = () => new Date().toISOString()

export const buildLocalFallbackCatalog = (
  appId: NexusAppId,
  channelRaw: string | undefined,
): NexusFeatureCatalog => {
  const channel = normalizeReleaseChannel(channelRaw, 'production')
  const generatedAt = nowIso()
  const views = resolveFallbackViews(appId)

  const features: NexusFeatureManifestItem[] = views.map((viewId, index) => ({
    featureId: makeFeatureId(viewId),
    name: formatTitle(viewId),
    description: `Local fallback feature for ${viewId}`,
    version: 'local-fallback',
    appTargets: [appId],
    rollout: 'stable',
    stable: true,
    requires: [],
    tags: ['local-fallback', `order:${index + 1}`],
    updatedAt: generatedAt,
  }))

  return {
    schemaVersion: '2.0.0',
    featureVersion: 'local-fallback',
    channel,
    generatedAt,
    compatMatrix: { ...COMPAT_MATRIX },
    features,
  }
}

export const buildLocalFallbackLayoutSchema = (
  appId: NexusAppId,
  channelRaw: string | undefined,
): NexusUiSchemaDocument => {
  const channel = normalizeReleaseChannel(channelRaw, 'production')
  const updatedAt = nowIso()
  const mobileMode = appId === 'mobile' || appId === 'code-mobile'
  const views = resolveFallbackViews(appId)

  return {
    schemaVersion: '2.0.0',
    featureVersion: 'local-fallback',
    channel,
    appId,
    minClientVersion: '0.0.0',
    compatMatrix: { ...COMPAT_MATRIX },
    layoutProfile: {
      id: mobileMode ? 'mobile-adaptive' : 'desktop-default',
      mode: mobileMode ? 'mobile' : 'desktop',
      density: 'comfortable',
      navigation: mobileMode ? 'bottom-nav' : 'sidebar',
      tokens: {
        source: 'local-fallback',
      },
    },
    componentWhitelist: ['view-shell', 'status-strip', 'metric-tile', 'quick-actions', 'code-editor'],
    screens: views.map((viewId) => ({
      id: viewId,
      title: formatTitle(viewId),
      enabled: true,
      components: [
        {
          id: `${viewId}-shell`,
          type: 'view-shell',
          props: {
            viewId,
            source: 'local-fallback',
          },
        },
      ],
    })),
    updatedAt,
  }
}

export const buildLocalFallbackRelease = (
  appId: NexusAppId,
  channelRaw: string | undefined,
): NexusReleaseSnapshot => {
  const channel = normalizeReleaseChannel(channelRaw, 'production')
  const createdAt = nowIso()
  const id = `local_${appId}_${channel}`
  const digest = `digest_${appId}_${channel}_local_fallback`

  return {
    id,
    appId,
    channel,
    schemaVersion: '2.0.0',
    featureVersion: 'local-fallback',
    minClientVersion: '0.0.0',
    snapshotDigest: digest,
    schemaDigest: `${digest}_schema`,
    catalogDigest: `${digest}_catalog`,
    sourceReleaseId: null,
    rollbackToken: `rollback_${id}`,
    note: 'Local fallback release (no security flow)',
    createdAt,
    promotedBy: 'local-fallback',
  }
}

export const buildLocalFallbackBundle = (
  appId: NexusAppId,
  channelRaw: string | undefined,
): NexusLiveBundle => {
  const channel = normalizeReleaseChannel(channelRaw, 'production')

  return {
    appId,
    channel,
    catalog: buildLocalFallbackCatalog(appId, channel),
    layoutSchema: buildLocalFallbackLayoutSchema(appId, channel),
    release: buildLocalFallbackRelease(appId, channel),
  }
}

export const maybeDelayLocalFallback = async (client: any) => {
  const delayMs = Number(client.localFallbackLatencyMs || 0)
  if (!Number.isFinite(delayMs) || delayMs <= 0) return
  await sleep(Math.floor(delayMs))
}

