import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const viewsPath = path.join(ROOT, 'packages', 'nexus-core', 'src', 'views.ts')
const controlUtilsPath = path.join(ROOT, 'packages', 'nexus-core', 'src', 'api', 'control', 'utils.ts')
const connectionManagerPath = path.join(ROOT, 'packages', 'nexus-core', 'src', 'api', 'connection', 'manager.ts')
const designTokensPath = path.join(ROOT, 'packages', 'nexus-core', 'src', 'ui', 'designTokens.ts')
const viewStatePath = path.join(ROOT, 'packages', 'nexus-core', 'src', 'ui', 'viewState.ts')
const canvasMagicRendererPaths = [
  path.join(ROOT, 'packages', 'nexus-core', 'src', 'canvas', 'CanvasMagicRenderers.tsx'),
  path.join(ROOT, 'packages', 'nexus-core', 'src', 'canvas', 'CanvasMagicBlocksA.tsx'),
  path.join(ROOT, 'packages', 'nexus-core', 'src', 'canvas', 'CanvasMagicBlocksB.tsx'),
]
const source = readFileSync(viewsPath, 'utf8')
const controlUtilsSource = readFileSync(controlUtilsPath, 'utf8')
const connectionManagerSource = readFileSync(connectionManagerPath, 'utf8')
const designTokensSource = readFileSync(designTokensPath, 'utf8')
const viewStateSource = readFileSync(viewStatePath, 'utf8')
const canvasMagicRendererSources = canvasMagicRendererPaths.map((filePath) => ({
  filePath,
  source: readFileSync(filePath, 'utf8'),
}))

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
expect(designTokensSource.includes('export const resolveNexusViewUiTokens'), 'Missing UI token resolver')
expect(designTokensSource.includes('export const buildNexusViewCssVars'), 'Missing UI CSS var builder')
expect(designTokensSource.includes('NexusViewUiTokenSet'), 'Missing UI token set type')
expect(designTokensSource.includes('--nx-ui-accent'), 'Missing UI accent CSS var')
expect(designTokensSource.includes('--nx-ui-touch-target'), 'Missing UI touch target CSS var')
expect(designTokensSource.includes('--nx-ui-motion-panel'), 'Missing UI motion panel CSS var')
expect(viewStateSource.includes('export const resolveNexusViewState'), 'Missing view state resolver')
expect(viewStateSource.includes('export const resolveNexusViewStateBehavior'), 'Missing view state behavior resolver')
expect(viewStateSource.includes('export const shouldAutoDismissNexusViewState'), 'Missing transient view state helper')
expect(viewStateSource.includes('export const resolveNexusViewTransition'), 'Missing view transition guard')
expect(viewStateSource.includes('export const buildNexusViewStatusChips'), 'Missing status chip builder')
expect(viewStateSource.includes("'offline'"), 'Missing offline view state')
expect(viewStateSource.includes("'blocked'"), 'Missing blocked view state')
expect(viewStateSource.includes('blocksNavigation'), 'Missing navigation blocking behavior')
expect(viewStateSource.includes('feedbackState'), 'Missing transition feedback state')
expect(viewStateSource.includes("'assertive'"), 'Missing assertive aria-live state')
expect(controlUtilsSource.includes('export const normalizeControlBaseUrl'), 'Missing shared Control API base URL normalizer')
expect(controlUtilsSource.includes('LOOPBACK_CONTROL_HOSTS'), 'Control API URL normalizer must explicitly gate loopback dev hosts')
expect(controlUtilsSource.includes('parsed.username || parsed.password || parsed.search || parsed.hash'), 'Control API URL normalizer must reject credentials, query, and hash')
expect(connectionManagerSource.includes('const clampInteger'), 'Connection manager must clamp numeric runtime options')
expect(connectionManagerSource.includes('Math.abs(eventAgeMs) > this.maxEventAgeMs'), 'Connection manager must reject stale and future-dated incoming events')
expect(connectionManagerSource.includes('getPayloadBytes(event.payload) > this.maxPayloadBytes'), 'Connection manager must reject oversized incoming payloads')


for (const { filePath, source: canvasMagicSource } of canvasMagicRendererSources) {
  const label = path.relative(ROOT, filePath)
  expect(!canvasMagicSource.includes('Symbol.for("react.element")'), `${label} must not hand-roll React element records`)
  expect(!canvasMagicSource.includes('/** @jsxRuntime classic */'), `${label} must use the shared React JSX runtime`)
  expect(!canvasMagicSource.includes('/** @jsx h */'), `${label} must not use a local JSX factory`)
}
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
