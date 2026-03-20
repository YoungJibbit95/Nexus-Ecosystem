import { spawnSync } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const appDir = process.cwd()

const args = process.argv.slice(2)
const commandSeparator = args.indexOf('--')
const command = commandSeparator >= 0 ? args.slice(commandSeparator + 1) : ['electron-builder', '--win']

if (command.length === 0) {
  console.error('[electron-pack-win] Kein Build-Command uebergeben.')
  process.exit(1)
}

const fileExists = async (target) => {
  try {
    await fs.access(target, fsConstants.R_OK)
    return true
  } catch {
    return false
  }
}

const ensureSystem7za = async () => {
  if (process.platform !== 'darwin' && process.platform !== 'linux') {
    return null
  }

  const archCandidates = process.arch === 'arm64'
    ? ['arm64', 'x64']
    : ['x64', 'arm64']

  const localCandidates = archCandidates.map((arch) =>
    path.join(appDir, 'node_modules', '7zip-bin', 'mac', arch, '7za'))

  const fallbackAppCandidates = [
    path.join(path.dirname(appDir), 'Nexus Main'),
    path.join(path.dirname(appDir), 'Nexus Code'),
  ]
    .filter((dir) => dir !== appDir)
    .flatMap((dir) => archCandidates.map((arch) =>
      path.join(dir, 'node_modules', '7zip-bin', 'mac', arch, '7za')))

  const candidates = [...localCandidates, ...fallbackAppCandidates]

  let source = null
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      source = candidate
      break
    }
  }

  if (!source) {
    return null
  }

  const binDir = path.join(appDir, '.cache', 'bin')
  const target = path.join(binDir, '7za')

  await fs.mkdir(binDir, { recursive: true })
  await fs.copyFile(source, target)
  await fs.chmod(target, 0o755)

  return { binDir, target }
}

const run = async () => {
  const env = {
    ...process.env,
  }
  let localShim = null

  const sevenZip = await ensureSystem7za()
  if (sevenZip) {
    localShim = path.join(appDir, '7za')
    await fs.copyFile(sevenZip.target, localShim)
    await fs.chmod(localShim, 0o755)

    env.USE_SYSTEM_7ZA = 'true'
    env.PATH = `${appDir}${path.delimiter}${sevenZip.binDir}${path.delimiter}${env.PATH || ''}`
    console.log(`[electron-pack-win] using system 7za from ${sevenZip.binDir}`)
  } else {
    console.warn('[electron-pack-win] no readable 7za candidate found, fallback to default electron-builder behavior')
  }

  const result = spawnSync(command[0], command.slice(1), {
    cwd: appDir,
    stdio: 'inherit',
    env,
  })

  if (localShim) {
    await fs.unlink(localShim).catch(() => {})
  }

  if (result.error) {
    console.error(`[electron-pack-win] Fehler: ${result.error.message || result.error}`)
    process.exit(result.status ?? 1)
  }

  process.exit(result.status ?? 0)
}

run().catch((error) => {
  console.error(`[electron-pack-win] Fehler: ${error.message || error}`)
  process.exit(1)
})
