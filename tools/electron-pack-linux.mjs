import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const args = process.argv.slice(2)
const commandSeparator = args.indexOf('--')
const command = commandSeparator >= 0 ? args.slice(commandSeparator + 1) : ['electron-builder', '--linux', 'AppImage', 'deb']

if (command.length === 0) {
  console.error('[electron-pack-linux] Kein Build-Command uebergeben.')
  process.exit(1)
}

const truthy = (value) => ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())

const canCreateSymlink = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-symlink-check-'))
  const target = path.join(dir, 'target')
  const link = path.join(dir, 'link')

  try {
    await fs.writeFile(target, 'ok')
    await fs.symlink(target, link)
    return true
  } catch {
    return false
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

const forceWindowsLinuxBuild = truthy(process.env.NEXUS_FORCE_LINUX_ON_WINDOWS)
const strictLinuxBuild = truthy(process.env.NEXUS_STRICT_LINUX_PACKAGING)

if (process.platform === 'win32' && !forceWindowsLinuxBuild) {
  const symlinkOk = await canCreateSymlink()
  if (!symlinkOk) {
    const message = [
      '[electron-pack-linux] Linux AppImage/deb wurde auf Windows uebersprungen.',
      'Windows erlaubt in dieser Shell keine Symlinks; app-builder braucht diese fuer AppImage Icons.',
      'Nutze GitHub Actions/Ubuntu fuer Linux-Releases oder starte Windows mit Developer Mode/Admin-Symlinkrechten.',
      'Setze NEXUS_FORCE_LINUX_ON_WINDOWS=true, wenn du es trotzdem lokal erzwingen willst.',
    ].join('\n')

    if (strictLinuxBuild) {
      console.error(message)
      process.exit(1)
    }

    console.warn(message)
    process.exit(0)
  }
}

const result = spawnSync(command[0], command.slice(1), {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  console.error(`[electron-pack-linux] Fehler: ${result.error.message || result.error}`)
  process.exit(result.status ?? 1)
}

process.exit(result.status ?? 0)
