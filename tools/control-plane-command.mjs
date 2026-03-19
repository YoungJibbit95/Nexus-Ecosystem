import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveApiSource } from './lib/api-source.mjs'
import { spawnNpm } from './lib/process-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const argv = process.argv.slice(2)
const scriptName = argv[0] || 'dev'
const scriptArgs = argv.slice(1)

const main = async () => {
  const source = await resolveApiSource({ root: ROOT, quiet: false })
  const npmArgs = ['--prefix', source.controlPlaneDir, 'run', scriptName]

  if (scriptArgs.length > 0) {
    npmArgs.push('--', ...scriptArgs)
  }

  console.log(`[control-plane-command] source=${source.mode} script=${scriptName}`)

  const child = spawnNpm(npmArgs, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    console.error(`[control-plane-command] Start fehlgeschlagen: ${error.message}`)
    process.exit(1)
  })

  child.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      process.exit(code)
      return
    }

    console.error(`[control-plane-command] Prozess beendet mit Signal ${signal || 'unknown'}`)
    process.exit(1)
  })
}

main().catch((error) => {
  console.error(`[control-plane-command] ${error.message}`)
  process.exit(1)
})
