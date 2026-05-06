import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const candidates = [
  path.join(ROOT, 'packages', 'nexus-core', 'node_modules', 'typescript', 'bin', 'tsc'),
  path.join(ROOT, 'Nexus Main', 'node_modules', 'typescript', 'bin', 'tsc'),
  path.join(ROOT, 'Nexus Mobile', 'node_modules', 'typescript', 'bin', 'tsc'),
  path.join(ROOT, 'Nexus Code', 'node_modules', 'typescript', 'bin', 'tsc'),
  path.join(ROOT, 'Nexus Wiki', 'node_modules', 'typescript', 'bin', 'tsc'),
]

const tsc = candidates.find((candidate) => existsSync(candidate))
const tsconfig = path.join(ROOT, 'packages', 'nexus-core', 'tsconfig.json')

if (!tsc) {
  console.error('[nexus-core:typecheck] TypeScript binary not found.')
  console.error('Install dependencies for one app, for example: npm --prefix "Nexus Main" install')
  process.exit(1)
}

if (!existsSync(tsconfig)) {
  console.error(`[nexus-core:typecheck] Missing tsconfig: ${tsconfig}`)
  process.exit(1)
}

const result = spawnSync(process.execPath, [tsc, '-p', tsconfig, '--noEmit'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: false,
})

process.exit(result.status ?? 1)
