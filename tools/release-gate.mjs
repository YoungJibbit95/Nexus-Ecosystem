import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const WORKSPACE = path.resolve(ROOT, '..')
const npmBin = 'npm'

const args = new Set(process.argv.slice(2))
const fast = args.has('--fast')
const ci = args.has('--ci')
const skipDoctor = args.has('--skip-doctor')
const skipWebsite = args.has('--skip-website')
const skipApps = args.has('--skip-apps')
const skipWiki = args.has('--skip-wiki')
const withApiContract = args.has('--with-api-contract')

const sibling = (name) => path.join(WORKSPACE, name)
const hasPackage = (dir) => existsSync(path.join(dir, 'package.json'))

const steps = [
  {
    name: 'single React instance',
    cwd: ROOT,
    command: [npmBin, ['run', 'verify:single-react']],
  },
  {
    name: 'encoding gate',
    cwd: ROOT,
    command: [npmBin, ['run', 'verify:encoding']],
  },
  {
    name: 'ecosystem contracts',
    cwd: ROOT,
    command: [npmBin, ['run', 'verify:ecosystem']],
  },
  {
    name: 'nexus-core package gate',
    cwd: ROOT,
    command: [npmBin, ['--prefix', 'packages/nexus-core', 'run', 'build']],
  },
]

if (!fast && !skipDoctor) {
  steps.push({
    name: 'release doctor',
    cwd: ROOT,
    command: [npmBin, ['run', ci ? 'doctor:release:hosted' : 'doctor:release']],
    optional: ci,
  })
}

if (!fast && !skipApps) {
  steps.push(
    {
      name: 'Nexus Main build',
      cwd: ROOT,
      command: [npmBin, ['--prefix', 'Nexus Main', 'run', 'build']],
    },
    {
      name: 'Nexus Mobile build',
      cwd: ROOT,
      command: [npmBin, ['--prefix', 'Nexus Mobile', 'run', 'build']],
    },
    {
      name: 'Nexus Code build',
      cwd: ROOT,
      command: [npmBin, ['--prefix', 'Nexus Code', 'run', 'build']],
    },
    {
      name: 'Nexus Code Mobile build',
      cwd: ROOT,
      command: [npmBin, ['--prefix', 'Nexus Code Mobile', 'run', 'build']],
    },
  )

  const controlDir = sibling('Nexus Control')
  if (hasPackage(controlDir)) {
    steps.push({
      name: 'Nexus Control build',
      cwd: controlDir,
      command: [npmBin, ['run', 'build']],
    })
  }
}

if (!fast && !skipWiki) {
  steps.push({
    name: 'Nexus Wiki CI build',
    cwd: ROOT,
    command: [npmBin, ['--prefix', 'Nexus Wiki', 'run', 'build:ci']],
  })
}

const websiteDir = sibling('nexusproject.dev')
if (!fast && !skipWebsite && hasPackage(websiteDir)) {
  steps.push(
    {
      name: 'nexusproject.dev CI build',
      cwd: websiteDir,
      command: [npmBin, ['run', 'build:ci']],
    },
    {
      name: 'nexusproject.dev API integration',
      cwd: websiteDir,
      command: [npmBin, ['run', 'test:api:integration']],
    },
  )
}

const apiDir = path.join(sibling('NexusAPI'), 'API', 'nexus-control-plane')
if (withApiContract && hasPackage(apiDir)) {
  steps.push(
    {
      name: 'Control Plane contract tests',
      cwd: apiDir,
      command: [npmBin, ['run', 'test:contract']],
    },
    {
      name: 'Control Plane attack tests',
      cwd: apiDir,
      command: [npmBin, ['run', 'test:attack']],
    },
  )
}

const summary = []
const startedAt = Date.now()

console.log(`[release:gate] mode=${fast ? 'fast' : 'full'} ci=${ci ? 'yes' : 'no'}`)

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
console.log('\n[release:gate] PASS all required gates')

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

  const commandLine = ['npm', ...args].map(quoteCmdArg).join(' ')
  return { command: 'cmd.exe', args: ['/d', '/s', '/c', commandLine] }
}

function quoteCmdArg(value) {
  const text = String(value)
  if (text.length === 0) return '""'
  if (!/[\s&()^<>|"]/u.test(text)) return text
  return `"${text.replace(/"/gu, '\\"')}"`
}
