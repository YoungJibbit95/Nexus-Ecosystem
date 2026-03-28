export type NexusAppId = 'main' | 'mobile' | 'code' | 'code-mobile' | 'control'
export type NexusUserTier = 'free' | 'paid'

export type NexusEventType =
  | 'heartbeat'
  | 'state-sync'
  | 'navigation'
  | 'performance-metric'
  | 'performance-summary'
  | 'command'
  | 'config-update'
  | 'custom'

export type NexusEventTarget = NexusAppId | 'all'

export interface NexusConnectionEvent<T = unknown> {
  id: string
  timestamp: number
  source: NexusAppId
  target: NexusEventTarget
  type: NexusEventType
  payload: T
}

export interface NexusPeerStatus {
  appId: NexusAppId
  lastSeenAt: number
  stale: boolean
}

export type NexusMetricType =
  | 'view-render'
  | 'long-task'
  | 'paint'
  | 'memory'
  | 'custom'

export interface NexusPerformanceMetric {
  id: string
  appId: NexusAppId
  type: NexusMetricType
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'score'
  timestamp: number
  tags?: Record<string, string>
}

export interface NexusViewAccessResult {
  appId: NexusAppId
  viewId: string
  allowed: boolean
  reason: string
  userTier: NexusUserTier
  userTierSource: 'request' | 'template' | 'default' | 'offline'
  userTemplateKey: string | null
  paywallEnabled: boolean
  requiredTier: NexusUserTier | null
  evaluatedAt: string
  cacheHit: boolean
}

export type NexusReleaseChannel = 'staging' | 'production'

export interface NexusFeatureManifestItem {
  featureId: string
  name: string
  description: string
  version: string
  appTargets: NexusAppId[]
  rollout: 'stable' | 'beta' | 'disabled'
  stable: boolean
  requires: string[]
  tags: string[]
  updatedAt: string
}

export interface NexusFeatureCatalog {
  schemaVersion: string
  featureVersion: string
  channel: NexusReleaseChannel
  generatedAt: string
  compatMatrix: Record<NexusAppId, string>
  features: NexusFeatureManifestItem[]
}

export interface NexusLayoutProfile {
  id: string
  mode: 'desktop' | 'mobile'
  density: 'compact' | 'comfortable' | 'spacious'
  navigation: 'sidebar' | 'bottom-nav' | 'tabs'
  tokens: Record<string, unknown>
}

export interface NexusUiSchemaComponent {
  id: string
  type: string
  props: Record<string, unknown>
}

export interface NexusUiSchemaScreen {
  id: string
  title: string
  enabled: boolean
  components: NexusUiSchemaComponent[]
}

export interface NexusUiSchemaDocument {
  schemaVersion: string
  featureVersion: string
  channel: NexusReleaseChannel
  appId: NexusAppId
  minClientVersion: string
  compatMatrix: Record<NexusAppId, string>
  layoutProfile: NexusLayoutProfile
  componentWhitelist: string[]
  screens: NexusUiSchemaScreen[]
  updatedAt: string
}

export interface NexusCapabilitySupports {
  schemaVersions: string[]
  components: string[]
  layoutProfiles: string[]
  featureFlags: string[]
}

export interface NexusCapabilityReport {
  appId: NexusAppId
  appVersion: string
  platform: 'desktop' | 'mobile' | 'web' | 'native'
  supports: NexusCapabilitySupports
  reportedAt?: string
}

export interface NexusReleaseSnapshot {
  id: string
  appId: NexusAppId
  channel: NexusReleaseChannel
  schemaVersion: string
  featureVersion: string
  minClientVersion: string
  snapshotDigest: string
  schemaDigest: string
  catalogDigest: string
  sourceReleaseId: string | null
  rollbackToken: string
  note: string
  createdAt: string
  promotedBy: string
}

export interface NexusCompatibilityResult {
  appId: NexusAppId
  appVersion: string
  channel: NexusReleaseChannel
  compatible: boolean
  reasons: string[]
  minClientVersion: string | null
  compatRule: string | null
  releaseId: string | null
  featureVersion: string | null
}

export interface NexusLiveBundle {
  appId: NexusAppId
  channel: NexusReleaseChannel
  catalog: NexusFeatureCatalog | null
  layoutSchema: NexusUiSchemaDocument | null
  release: NexusReleaseSnapshot | null
}

export interface NexusReleaseUpdateEvent {
  appId: NexusAppId
  channel: NexusReleaseChannel
  releaseId: string | null
  changed: boolean
  bundle: NexusLiveBundle
  fetchedAt: number
}
