import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureControlPlane } from './lib/control-plane-guard.mjs'
import { spawnProcess } from './lib/process-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const divider = args.indexOf('--')
const command = divider >= 0 ? args.slice(divider + 1) : []
const opts = divider >= 0 ? args.slice(0, divider) : args

const readArgValue = (flag, fallback) => {
  const idx = opts.indexOf(flag)
  if (idx < 0) return fallback
  const value = opts[idx + 1]
  if (!value || value.startsWith('--')) return fallback
  return value
}

const timeoutMsRaw = Number(readArgValue('--timeout-ms', '90000'))
const timeoutMs = Number.isInteger(timeoutMsRaw) && timeoutMsRaw > 0 ? timeoutMsRaw : 90_000
const quiet = opts.includes('--quiet')
const noStart = opts.includes('--no-start')

const runCommand = (cmd, cmdArgs) => new Promise((resolve) => {
  const child = spawnProcess(cmd, cmdArgs, {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    console.error(`[run-with-control-plane] Command konnte nicht gestartet werden: ${error.message}`)
    resolve(1)
  })

  child.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      resolve(code)
      return
    }
    console.error(`[run-with-control-plane] Prozess beendet mit Signal ${signal || 'unknown'}`)
    resolve(1)
  })
})

try {
  await ensureControlPlane({
    root: ROOT,
    startIfMissing: !noStart,
    timeoutMs,
    quiet,
  })

  if (command.length === 0) {
    process.exit(0)
  }

  const exitCode = await runCommand(command[0], command.slice(1))
  process.exit(exitCode)
} catch (error) {
  console.error(`[run-with-control-plane] ${error.message}`)
  process.exit(1)
}
