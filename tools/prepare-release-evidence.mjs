import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const EVIDENCE_ROOT = path.join(ROOT, 'docs', 'release-evidence')

const args = process.argv.slice(2)
const explicitVersion = args.find((arg) => !arg.startsWith('--'))
const force = args.includes('--force')

const sanitizeVersion = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '')

const today = new Date().toISOString().slice(0, 10)
const version = sanitizeVersion(
  explicitVersion || process.env.NEXUS_RELEASE_VERSION || `rc-${today}`,
)
const releaseDir = path.join(EVIDENCE_ROOT, version)
const screenshotsDir = path.join(releaseDir, 'screenshots')

const writeIfMissing = async (filePath, content) => {
  if (force) {
    await fs.writeFile(filePath, content, 'utf8')
    return 'updated'
  }

  try {
    await fs.writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' })
    return 'created'
  } catch (error) {
    if (error?.code === 'EEXIST') return 'exists'
    throw error
  }
}

const rcLog = `# Nexus Release Candidate Evidence: ${version}

Created: ${new Date().toISOString()}

## Scope

- Main/Mobile polish:
- Product Page:
- Control/API:
- Wiki/Docs:
- Known limits:

## Required Checks

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Ecosystem contracts | \`npm run verify:ecosystem\` | pending | |
| Main/Mobile gate | \`npm run release:main-mobile\` | pending | |
| Website CI build | \`npm --prefix "../nexusproject.dev" run build:ci\` | pending | |
| Website API integration | \`npm --prefix "../nexusproject.dev" run test:api:integration\` | pending | |
| API release data | \`npm --prefix "../NexusAPI/API/nexus-control-plane" run verify:release-data\` | pending | |
| API contracts | \`npm --prefix "../NexusAPI/API/nexus-control-plane" run test:contract\` | pending | |

## Screenshots

- Main Dashboard:
- Notes:
- Canvas:
- Settings:
- DevTools:
- Product Page:
- Control UI:

## Decisions

- Ship / hold:
- Follow-up owner:
`

const smokeNotes = `# Manual Smoke Notes: ${version}

## App Smokes

| Surface | Scenario | Result | Notes |
| --- | --- | --- | --- |
| Nexus Main | Dashboard opens and widgets render | pending | |
| Nexus Main | Notes edit/split/preview flow | pending | |
| Nexus Main | Settings import/export and panel material presets | pending | |
| Nexus Main | Canvas create/select/edit node | pending | |
| Nexus Main | DevTools Release Health opens | pending | |
| Product Page | Pricing/account/API status copy is clear | pending | |
| Control UI | Options/Scripts/Rules tabs load | pending | |

## Runtime Boundaries

- Hosted Control/API auth available:
- Credentials/session used:
- HTTP 401 or deploy-only blockers:

Do not paste secrets, tokens, private device ids, private customer data, or
private account identifiers into this file.
`

await fs.mkdir(screenshotsDir, { recursive: true })

const results = [
  ['rc-log.md', await writeIfMissing(path.join(releaseDir, 'rc-log.md'), rcLog)],
  ['smoke-notes.md', await writeIfMissing(path.join(releaseDir, 'smoke-notes.md'), smokeNotes)],
  ['screenshots/.gitkeep', await writeIfMissing(path.join(screenshotsDir, '.gitkeep'), '')],
]

console.log(`[release:evidence] ${path.relative(ROOT, releaseDir)}`)
for (const [file, status] of results) {
  console.log(` - ${status.padEnd(7)} ${file}`)
}
