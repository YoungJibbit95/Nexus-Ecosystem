import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveControlUiRoot } from './lib/api-source.mjs'
import { spawnNpm } from './lib/process-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const [script = 'dev', ...extraArgs] = process.argv.slice(2)
const controlUiRoot = await resolveControlUiRoot({
  root: ROOT,
  required: true,
  quiet: false,
})

const child = spawnNpm(['run', script, ...extraArgs], {
  cwd: controlUiRoot,
  env: process.env,
  stdio: 'inherit',
})

child.on('error', (error) => {
  console.error(`[control-ui] Start fehlgeschlagen: ${error.message}`)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (typeof code === 'number') {
    process.exit(code)
  }
  console.error(`[control-ui] Prozess beendet mit Signal ${signal || 'unknown'}`)
  process.exit(1)
})
