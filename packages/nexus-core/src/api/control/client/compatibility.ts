import type { NexusCompatibilityResult, NexusFeatureCatalog, NexusReleaseSnapshot, NexusUiSchemaDocument } from '../../types'
import { normalizeReleaseChannel, semverSatisfies } from '../utils'

const compareSemver = (a: string, b: string) => {
  const aParts = a.split('.').map((part) => Number(part || 0))
  const bParts = b.split('.').map((part) => Number(part || 0))
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0)
    if (diff > 0) return 1
    if (diff < 0) return -1
  }
  return 0
}

export const resolveFeatureCompatibility = (
  client: any,
  input: {
    appId?: any
    appVersion?: string
    channel?: any
    catalog?: NexusFeatureCatalog | null
    layoutSchema?: NexusUiSchemaDocument | null
    release?: NexusReleaseSnapshot | null
  } = {},
): NexusCompatibilityResult => {
  const appId = input.appId || client.appId
  const appVersion = String(input.appVersion || client.appVersion || '0.0.0')
  const channel = normalizeReleaseChannel(input.channel || client.defaultReleaseChannel, client.defaultReleaseChannel)
  const catalog = input.catalog || null
  const layoutSchema = input.layoutSchema || null
  const release = input.release || null

  const reasons: string[] = []
  const minClientVersion = layoutSchema?.minClientVersion || release?.minClientVersion || null

  if (minClientVersion && compareSemver(appVersion, minClientVersion) < 0) {
    reasons.push(`CLIENT_VERSION_TOO_OLD:${appVersion}<${minClientVersion}`)
  }

  const compatRule = (
    layoutSchema?.compatMatrix?.[appId]
    || catalog?.compatMatrix?.[appId]
    || null
  )
  if (compatRule && !semverSatisfies(appVersion, compatRule)) {
    reasons.push(`COMPAT_MATRIX_REJECTED:${compatRule}`)
  }

  if (catalog && layoutSchema && catalog.featureVersion !== layoutSchema.featureVersion) {
    reasons.push(`FEATURE_VERSION_MISMATCH:${catalog.featureVersion}!=${layoutSchema.featureVersion}`)
  }

  if (release && layoutSchema && release.schemaVersion !== layoutSchema.schemaVersion) {
    reasons.push(`SCHEMA_VERSION_MISMATCH:${release.schemaVersion}!=${layoutSchema.schemaVersion}`)
  }

  if (release && catalog && release.featureVersion !== catalog.featureVersion) {
    reasons.push(`RELEASE_FEATURE_VERSION_MISMATCH:${release.featureVersion}!=${catalog.featureVersion}`)
  }

  return {
    appId,
    appVersion,
    channel,
    compatible: reasons.length === 0,
    reasons,
    minClientVersion,
    compatRule,
    releaseId: release?.id || null,
    featureVersion: catalog?.featureVersion || layoutSchema?.featureVersion || release?.featureVersion || null,
  }
}
