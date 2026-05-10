import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const appDir = process.cwd()
const args = process.argv.slice(2)
const commandSeparator = args.indexOf('--')
const command = commandSeparator >= 0 ? args.slice(commandSeparator + 1) : ['electron-builder', '--mac']
const truthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
const signingRequired = truthy(process.env.NEXUS_SIGNING_REQUIRED)
const notarizeMac = truthy(process.env.NEXUS_MAC_NOTARIZE) || signingRequired

if (command.length === 0) {
  console.error('[electron-pack-mac] Kein Build-Command uebergeben.')
  process.exit(1)
}

const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: String(process.env.CSC_IDENTITY_AUTO_DISCOVERY || 'false'),
}

if (!env.CSC_LINK && env.MAC_CSC_LINK) env.CSC_LINK = env.MAC_CSC_LINK
if (!env.CSC_KEY_PASSWORD && env.MAC_CSC_KEY_PASSWORD) {
  env.CSC_KEY_PASSWORD = env.MAC_CSC_KEY_PASSWORD
}

const requiredSigningVars = notarizeMac
  ? ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID']
  : signingRequired
    ? ['CSC_LINK', 'CSC_KEY_PASSWORD']
    : []

const missingSigningVars = requiredSigningVars.filter((key) => !String(env[key] || '').trim())
if (missingSigningVars.length > 0) {
  console.error(
    `[electron-pack-mac] Missing required signing env: ${missingSigningVars.join(', ')}`,
  )
  process.exit(1)
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

const runCommand = (binary, commandArgs) => spawnSync(binary, commandArgs, {
  cwd: appDir,
  stdio: 'inherit',
  env,
})

const findFiles = async (dir, predicate, out = []) => {
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await findFiles(fullPath, predicate, out)
    } else if (entry.isFile() && predicate(fullPath)) {
      out.push(fullPath)
    }
  }

  return out
}

const verifyNotarytool = () => {
  if (!notarizeMac) return
  if (process.platform !== 'darwin') {
    console.error('[electron-pack-mac] Notarization requires a macOS runner.')
    process.exit(1)
  }

  const result = runCommand('xcrun', ['notarytool', '--version'])
  if ((result.status ?? 1) !== 0) {
    console.error('[electron-pack-mac] xcrun notarytool is unavailable.')
    process.exit(result.status ?? 1)
  }
}

const notarizeArtifacts = async () => {
  if (!notarizeMac) {
    console.warn('[electron-pack-mac] Notarization skipped (set NEXUS_MAC_NOTARIZE=true).')
    return
  }

  const artifacts = await findFiles(
    path.join(appDir, 'release'),
    (filePath) => filePath.toLowerCase().endsWith('.dmg'),
  )

  if (artifacts.length === 0) {
    console.error('[electron-pack-mac] No DMG artifact found for notarization.')
    process.exit(1)
  }

  for (const artifact of artifacts) {
    console.log(`[electron-pack-mac] notarizing ${artifact}`)
    const submit = runCommand('xcrun', [
      'notarytool',
      'submit',
      artifact,
      '--apple-id',
      env.APPLE_ID,
      '--password',
      env.APPLE_APP_SPECIFIC_PASSWORD,
      '--team-id',
      env.APPLE_TEAM_ID,
      '--wait',
    ])

    if ((submit.status ?? 1) !== 0) {
      console.error(`[electron-pack-mac] notarization failed for ${artifact}`)
      process.exit(submit.status ?? 1)
    }

    console.log(`[electron-pack-mac] stapling ${artifact}`)
    const staple = runCommand('xcrun', ['stapler', 'staple', artifact])
    if ((staple.status ?? 1) !== 0) {
      console.error(`[electron-pack-mac] stapling failed for ${artifact}`)
      process.exit(staple.status ?? 1)
    }
  }
}

verifyNotarytool()

const result = runCommand(command[0], command.slice(1))

if (result.error) {
  console.error(`[electron-pack-mac] Fehler: ${result.error.message || result.error}`)
  process.exit(result.status ?? 1)
}

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1)
}

await notarizeArtifacts()

process.exit(0)
