import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createReleaseGatePlan } from './lib/release-gate-plan.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const { steps, ci, scope } = createReleaseGatePlan({ root: ROOT, argv: process.argv.slice(2) })

const summary = []
const startedAt = Date.now()

console.log(`[release:gate] mode=${scope} ci=${ci ? 'yes' : 'no'}`)

for (const step of steps) {
  const [command, commandArgs] = step.command
  const runnable = toRunnableCommand(command, commandArgs)
  const label = step.optional ? `${step.name} (optional)` : step.name
  console.log(`\n[release:gate] RUN ${label}`)
  console.log(`[release:gate] ${command} ${commandArgs.join(' ')}`)

  const result = spawnSync(runnable.command, runnable.args, {
    cwd: step.cwd,
    stdio: 'inherit',
    shell: false,
    windowsVerbatimArguments: Boolean(runnable.windowsVerbatimArguments),
    env: buildChildEnv(),
  })

  const status = result.status ?? 1
  if (status !== 0) {
    if (result.error) console.error(`[release:gate] spawn error: ${result.error.message}`)
    if (step.optional) {
      summary.push({ name: step.name, status: 'WARN', code: status })
      console.warn(`[release:gate] WARN ${step.name} exited with ${status}`)
      continue
    }

    summary.push({ name: step.name, status: 'FAIL', code: status })
    console.error(`\n[release:gate] FAIL ${step.name} exited with ${status}`)
    printSummary(summary, startedAt)
    process.exit(status)
  }

  summary.push({ name: step.name, status: 'PASS', code: 0 })
  console.log(`[release:gate] PASS ${step.name}`)
}

printSummary(summary, startedAt)
console.log(`\n[release:gate] PASS all required ${scope} gates`)

function printSummary(items, started) {
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  console.log('\n[release:gate] Summary')
  for (const item of items) {
    console.log(` - ${item.status.padEnd(4)} ${item.name}`)
  }
  console.log(`[release:gate] Duration: ${seconds}s`)
}

function buildChildEnv() {
  const env = { ...process.env }
  if (ci) env.CI = 'true'
  return env
}

function toRunnableCommand(command, args) {
  if (process.platform !== 'win32' || command !== 'npm') {
    return { command, args }
  }

  const bundledNpmCli = path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  )
  if (existsSync(bundledNpmCli)) {
    return { command: process.execPath, args: [bundledNpmCli, ...args] }
  }

  const commandLine = ['npm', ...args].map(quoteCmdArg).join(' ')
  return { command: 'cmd.exe', args: ['/d', '/c', commandLine] }
}

function quoteCmdArg(value) {
  const text = String(value)
  if (text.length === 0) return '""'
  if (!/[\s&()^<>|"]/u.test(text)) return text
  return `"${text.replace(/(\\*)("|$)/gu, '$1$1\\$2')}"`
}
