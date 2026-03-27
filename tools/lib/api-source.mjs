import { promises as fs } from 'node:fs'
import path from 'node:path'

export const DEFAULT_HOSTED_CONTROL_URL = 'https://nexus-api.cloud'
export const DEFAULT_API_CLIENT_DIR = 'packages/nexus-core/src/api'
const HOSTED_CONTROL_HOST = 'nexus-api.cloud'

// Legacy exports kept for backwards compatibility with older scripts.
export const DEFAULT_PRIVATE_API_REPO = 'hosted'
export const DEFAULT_PRIVATE_API_BRANCH = 'hosted'
export const DEFAULT_PRIVATE_API_DIR = DEFAULT_API_CLIENT_DIR

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

export const resolveHostedControlUrl = () => {
  const configured = String(
    process.env.NEXUS_CONTROL_URL
      || process.env.VITE_NEXUS_CONTROL_URL
      || DEFAULT_HOSTED_CONTROL_URL,
  ).trim()
  const raw = configured || DEFAULT_HOSTED_CONTROL_URL

  try {
    const parsed = new URL(raw)
    if (parsed.protocol !== 'https:') return DEFAULT_HOSTED_CONTROL_URL
    if (parsed.hostname !== HOSTED_CONTROL_HOST) return DEFAULT_HOSTED_CONTROL_URL
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return DEFAULT_HOSTED_CONTROL_URL
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '')
    return `${parsed.protocol}//${parsed.host}${pathname}`
  } catch {
    return DEFAULT_HOSTED_CONTROL_URL
  }
}

export const resolvePrivateApiRoot = (root) => {
  if (!root) throw new Error('resolvePrivateApiRoot benoetigt root')
  return path.join(root, DEFAULT_API_CLIENT_DIR)
}

export const resolveApiSource = async ({ root, quiet = true } = {}) => {
  if (!root) throw new Error('resolveApiSource benoetigt root')

  const apiDir = path.join(root, DEFAULT_API_CLIENT_DIR)
  const apiIndexPath = path.join(apiDir, 'index.ts')

  if (!(await exists(apiIndexPath))) {
    throw new Error(
      `API Client Package nicht gefunden: ${apiDir}. `
      + 'Fuehre den Ecosystem-Migrationsschritt fuer packages/nexus-core aus.'
    )
  }

  const source = {
    mode: 'hosted',
    root,
    privateRoot: null,
    controlPlaneDir: null,
    schemasDir: null,
    apiDir,
    controlBaseUrl: resolveHostedControlUrl(),
  }

  if (!quiet) {
    const displayApiDir = path.relative(root, apiDir) || '.'
    console.log(`[api-source:hosted] Control URL: ${source.controlBaseUrl}`)
    console.log(`[api-source:hosted] API Client: ${displayApiDir}`)
  }

  return source
}

export const syncPrivateApiRepo = async ({ root, quiet = false } = {}) => {
  const targetDir = resolvePrivateApiRoot(root)
  if (!quiet) {
    console.log('[api-source:hosted] Kein Source-Sync notwendig (Hosted API + lokaler Client-Layer).')
  }
  return {
    cloned: false,
    pulled: false,
    targetDir,
    branch: 'hosted',
    repoUrl: 'hosted',
  }
}

export const resolveControlPlanePrefixArg = async () => {
  throw new Error(
    'Lokale Control Plane wird nicht mehr aus dem Ecosystem gestartet. '
    + 'Nutze die gehostete API URL via NEXUS_CONTROL_URL.'
  )
}
