import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const viewsPath = path.join(ROOT, 'packages', 'nexus-core', 'src', 'views.ts')
const source = readFileSync(viewsPath, 'utf8')

const requiredViews = [
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

const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

for (const viewId of requiredViews) {
  expect(source.includes(`${viewId}: {`), `Missing manifest for view: ${viewId}`)
  expect(source.includes(`'${viewId}'`), `Missing ordered/reference entry for view: ${viewId}`)
}

expect(source.includes('export const NEXUS_VIEW_MANIFESTS'), 'Missing NEXUS_VIEW_MANIFESTS export')
expect(source.includes('export const buildNexusViewCommandRegistry'), 'Missing command registry builder')
expect(source.includes('export const resolveNexusViewCommandRegistry'), 'Missing resolved command registry')
expect(source.includes('export const executeNexusViewCommand'), 'Missing command execution helper')
expect(source.includes('export const resolveNexusViewLayout'), 'Missing layout schema v2 resolver')
expect(source.includes('export type NexusViewLayoutSchemaV2'), 'Missing layout schema v2 type')
expect(source.includes('export const resolveNexusViewPanels'), 'Missing panel resolver')
expect(source.includes('export const buildNexusPanelEngine'), 'Missing panel engine')
expect(source.includes('export const buildViewWarmupPlan'), 'Missing warmup plan builder')
expect(source.includes('export const buildAdaptiveViewWarmupPlan'), 'Missing adaptive warmup builder')
expect(source.includes('defaultActionId'), 'Manifests must expose defaultActionId')
expect(source.includes('mobileMode'), 'Manifests must expose mobileMode')
expect(source.includes('statusSignals'), 'Manifests must expose statusSignals')

const mojibakePatterns = ['Ã', 'Â', 'â€™', 'â€œ', 'â€', '�']
for (const pattern of mojibakePatterns) {
  expect(!source.includes(pattern), `Core view manifest contains mojibake pattern: ${pattern}`)
}

if (failures.length > 0) {
  console.error('[nexus-core:verify] FAIL')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}

console.log(`[nexus-core:verify] PASS (${requiredViews.length} view manifests checked)`)
