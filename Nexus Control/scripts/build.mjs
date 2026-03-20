import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const DIST = path.join(ROOT, 'dist')

const DEFAULT_RUNTIME_CONFIG = {
  controlApiUrl: 'http://127.0.0.1:4399',
  bootstrapPath: '/api/v1/public/bootstrap',
  privateRepoHint: 'YoungJibbit95/NexusAPI',
  forceApiUrl: false,
}

const parseBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const normalizeUrl = (value, fallback, options = {}) => {
  const allowEmpty = options.allowEmpty === true
  const raw = String(value || '').trim()
  if (!raw) return allowEmpty ? '' : fallback
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return allowEmpty ? '' : fallback
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return allowEmpty ? '' : fallback
  if (parsed.username || parsed.password) return allowEmpty ? '' : fallback
  if (parsed.search || parsed.hash) return allowEmpty ? '' : fallback

  const pathname = parsed.pathname === '/' ? '' : parsed.pathname
  return `${parsed.protocol}//${parsed.host}${pathname}`.replace(/\/$/, '')
}

const normalizePath = (value, fallback) => {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return raw.startsWith('/') ? raw : `/${raw}`
}

await fs.rm(DIST, { recursive: true, force: true })
await fs.mkdir(DIST, { recursive: true })
await fs.cp(SRC, DIST, { recursive: true })

const runtimeConfig = {
  controlApiUrl: normalizeUrl(
    process.env.NEXUS_CONTROL_UI_DEFAULT_API_URL,
    DEFAULT_RUNTIME_CONFIG.controlApiUrl,
    { allowEmpty: true },
  ),
  bootstrapPath: normalizePath(process.env.NEXUS_CONTROL_UI_BOOTSTRAP_PATH, DEFAULT_RUNTIME_CONFIG.bootstrapPath),
  privateRepoHint: String(process.env.NEXUS_CONTROL_PRIVATE_REPO_HINT || DEFAULT_RUNTIME_CONFIG.privateRepoHint).trim(),
  forceApiUrl: parseBool(process.env.NEXUS_CONTROL_UI_FORCE_API_URL, DEFAULT_RUNTIME_CONFIG.forceApiUrl),
}

await fs.writeFile(
  path.join(DIST, 'runtime-config.json'),
  `${JSON.stringify(runtimeConfig, null, 2)}\n`,
  'utf8',
)

console.log(`Nexus Control Build bereit: ${DIST}`)
console.log(`Runtime Config: ${JSON.stringify(runtimeConfig)}`)
