import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnNpmSync } from './lib/process-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const parseArgs = (argv) => {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i]
    if (!part.startsWith('--')) continue
    const key = part.slice(2)
    const value = argv[i + 1]
    if (!value || value.startsWith('--')) {
      out[key] = 'true'
      continue
    }
    out[key] = value
    i += 1
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

const appDirRaw = String(args.app || '').trim()
if (!appDirRaw) {
  console.error('Fehlender Parameter: --app "<App Dir>"')
  process.exit(1)
}

const appDir = path.resolve(ROOT, appDirRaw)
const macScript = String(args['mac-script'] || 'electron:build:mac').trim()
const winScript = String(args['win-script'] || 'electron:build:win').trim()
const linuxScript = String(args['linux-script'] || 'build').trim()

const resolveScriptForHost = () => {
  if (process.platform === 'darwin') return macScript
  if (process.platform === 'win32') return winScript
  return linuxScript
}

const script = resolveScriptForHost()
console.log(`[electron-build-host] host=${process.platform} app=${appDirRaw} script=${script}`)

const result = spawnNpmSync(['--prefix', appDir, 'run', script], {
  cwd: ROOT,
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  console.error(`[electron-build-host] Fehler: ${result.error.message || result.error}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
