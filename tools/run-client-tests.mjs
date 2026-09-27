import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scopes = {
  core: ['packages/nexus-core/test'],
  main: ['Nexus Main/src', 'Nexus Main/electron'],
  mobile: ['Nexus Mobile/src'],
  code: ['Nexus Code/src'],
  'code-mobile': ['Nexus Code Mobile/src'],
  tools: ['tools'],
}
const scopeIndex = process.argv.indexOf('--scope')
const scope = scopeIndex < 0 ? null : process.argv[scopeIndex + 1]
if (scopeIndex >= 0 && !Object.hasOwn(scopes, scope)) {
  throw new Error(`Unknown test scope: ${scope}`)
}
const roots = scope ? scopes[scope] : Object.values(scopes).flat()
const files = []
function discover(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory() && !['node_modules', 'dist', 'build'].includes(entry.name)) discover(file)
    else if (entry.isFile() && /\.test\.(?:mjs|cjs|js|jsx|ts|tsx)$/.test(entry.name)) files.push(file)
  }
}
roots.forEach(directory => discover(path.join(root, directory)))
files.sort()
if (!files.length) throw new Error('No tests discovered')
console.log(`[client-tests] ${files.length} test files (${scope || 'public repository'})`)
const require = createRequire(path.join(root, 'packages/nexus-core/package.json'))
const loader = pathToFileURL(require.resolve('tsx/esm')).href
const result = spawnSync(process.execPath, ['--import', loader, '--test', ...files], {
  cwd: root,
  stdio: 'inherit',
  windowsHide: true,
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
