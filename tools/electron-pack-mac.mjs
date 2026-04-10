import { spawnSync } from 'node:child_process'

const appDir = process.cwd()
const args = process.argv.slice(2)
const commandSeparator = args.indexOf('--')
const command = commandSeparator >= 0 ? args.slice(commandSeparator + 1) : ['electron-builder', '--mac']

if (command.length === 0) {
  console.error('[electron-pack-mac] Kein Build-Command uebergeben.')
  process.exit(1)
}

const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: String(process.env.CSC_IDENTITY_AUTO_DISCOVERY || 'false'),
}

const hasArchFlag = command.some((part) =>
  part === '--arm64' || part === '--x64' || part === '--universal' || part.startsWith('--mac.'),
)
const macArchMode = String(process.env.NEXUS_MAC_ARCH || '').trim().toLowerCase()
if (!hasArchFlag && macArchMode !== 'all' && macArchMode !== 'universal') {
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    command.push('--arm64')
    console.log('[electron-pack-mac] Arch auto-selected: arm64 (host)')
  } else if (process.platform === 'darwin' && process.arch === 'x64') {
    command.push('--x64')
    console.log('[electron-pack-mac] Arch auto-selected: x64 (host)')
  }
}

const result = spawnSync(command[0], command.slice(1), {
  cwd: appDir,
  stdio: 'inherit',
  env,
})

if (result.error) {
  console.error(`[electron-pack-mac] Fehler: ${result.error.message || result.error}`)
  process.exit(result.status ?? 1)
}

process.exit(result.status ?? 0)
