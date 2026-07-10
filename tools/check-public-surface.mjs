import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.html',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yml',
  '.yaml',
])

const PUBLIC_PATHS = [
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'SUPPORT.md',
  '.env.example',
  '.github',
  'docs',
  'Nexus Main/README.md',
  'Nexus Mobile/README.md',
  'Nexus Code/README.md',
  'Nexus Code Mobile/README.md',
  'packages/nexus-core/README.md',
  'Nexus Wiki/index.html',
  'Nexus Wiki/src/data',
  'Nexus Wiki/src/pages/wikiPageData.ts',
]

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'release',
  'out',
  '.vite',
  '.turbo',
])

const PRIVATE_PUBLIC_SURFACE_PATTERNS = [
  { label: 'production API hostname', pattern: /\bnexus-api\.cloud\b/i },
  { label: 'private server hostname', pattern: /\bsrv\d+\.hstgr\.cloud\b/i },
  { label: 'control env variable', pattern: /\bVITE_NEXUS_CONTROL[A-Z0-9_]*\b/ },
  { label: 'ingest key variable', pattern: /\bNEXUS_[A-Z0-9_]*INGEST[A-Z0-9_]*\b/ },
  { label: 'control server env variable', pattern: /\bNEXUS_CONTROL[A-Z0-9_]*\b/ },
  { label: 'mutation signing secret', pattern: /\bNEXUS_MUTATION_SIGNING_SECRETS\b/ },
  { label: 'signature header', pattern: /\bX-Nexus-Signature[A-Za-z0-9_-]*\b/ },
  { label: 'policy route', pattern: /\/api\/v1\/policies\b/i },
  { label: 'device route', pattern: /\/api\/v1\/devices\b/i },
  { label: 'public bootstrap route', pattern: /\/api\/v1\/public\/bootstrap\b/i },
  { label: 'private feature catalog route', pattern: /\/api\/v2\/features\/catalog\b/i },
  { label: 'private layout schema route', pattern: /\/api\/v2\/layout\/schema\b/i },
  { label: 'private release route', pattern: /\/api\/v2\/releases\/promote\b/i },
  { label: 'private repo path', pattern: /\.\.\/Nexus(?:API| Control| Launcher)\b/i },
  { label: 'control plane terminology', pattern: /\bControl Plane\b/i },
  { label: 'control UI terminology', pattern: /\bControl UI\b/i },
  { label: 'feature catalog terminology', pattern: /\bFeature Catalog\b/i },
  { label: 'UI schema terminology', pattern: /\bUI Schema\b/i },
  { label: 'release snapshot terminology', pattern: /\bRelease Snapshot\b/i },
  { label: 'live sync terminology', pattern: /\bLive Sync\b/i },
  { label: 'staging promotion terminology', pattern: /\bstaging\s*(?:->|to|nach)\s*production\b/i },
  { label: 'VPS deployment terminology', pattern: /\bVPS\b/i },
  { label: 'offline tier internal code', pattern: /\bOFFLINE_FREE_TIER_BLOCKED\b/ },
  { label: 'local fallback internal code', pattern: /\bLOCAL_FALLBACK[A-Z0-9_-]*\b/ },
  { label: 'user tier env override', pattern: /\bVITE_NEXUS_USER_TIER\b/ },
]

const SECRET_PATTERNS = [
  { label: 'private key block', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/i },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { label: 'OpenAI API key', pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: 'Stripe secret key', pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
]

const mode = process.argv.includes('--secrets') ? 'secrets' : 'public-surface'
const patterns = mode === 'secrets' ? SECRET_PATTERNS : PRIVATE_PUBLIC_SURFACE_PATTERNS

const toPosix = (filePath) => path.relative(ROOT, filePath).replace(/\\/g, '/')

const exists = async (target) => {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

const collectFiles = async (targetPath, out = []) => {
  const stat = await fs.stat(targetPath)
  if (stat.isFile()) {
    if (TEXT_EXTENSIONS.has(path.extname(targetPath))) out.push(targetPath)
    return out
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue
    await collectFiles(path.join(targetPath, entry.name), out)
  }
  return out
}

const files = []
for (const rel of PUBLIC_PATHS) {
  const abs = path.join(ROOT, rel)
  if (await exists(abs)) {
    await collectFiles(abs, files)
  }
}

const uniqueFiles = [...new Set(files)].sort((a, b) => toPosix(a).localeCompare(toPosix(b)))
const findings = []

for (const file of uniqueFiles) {
  const text = await fs.readFile(file, 'utf8')
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const rule of patterns) {
      if (rule.pattern.test(line)) {
        findings.push({
          file: toPosix(file),
          line: index + 1,
          label: rule.label,
          text: line.trim().slice(0, 180),
        })
      }
    }
  })
}

if (findings.length > 0) {
  console.error(`[check:${mode}] Found ${findings.length} public-surface issue(s):`)
  for (const finding of findings.slice(0, 80)) {
    console.error(`${finding.file}:${finding.line} [${finding.label}] ${finding.text}`)
  }
  if (findings.length > 80) {
    console.error(`... ${findings.length - 80} more`)
  }
  process.exit(1)
}

console.log(`[check:${mode}] PASS ${uniqueFiles.length} public-facing file(s) scanned.`)
