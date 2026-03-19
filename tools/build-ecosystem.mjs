import { spawnSync } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const BUILD_ROOT = path.join(ROOT, 'build')

const args = new Set(process.argv.slice(2))
const withAndroid = args.has('--with-android') || args.has('--android')
const strictAndroid = args.has('--strict-android')
const clean = !args.has('--no-clean')

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const APPS = [
  {
    id: 'main',
    name: 'Nexus Main',
    dir: 'Nexus Main',
    buildScript: 'build',
    artifacts: [
      { from: 'dist', to: 'web' },
      { from: 'release', to: 'release' },
    ],
  },
  {
    id: 'mobile',
    name: 'Nexus Mobile',
    dir: 'Nexus Mobile',
    buildScript: 'build',
    artifacts: [{ from: 'dist', to: 'web' }],
    android: {
      capSyncScript: 'cap:sync',
      outputDir: 'android/app/build/outputs',
    },
  },
  {
    id: 'code',
    name: 'Nexus Code',
    dir: 'Nexus Code',
    buildScript: 'build',
    artifacts: [{ from: 'dist', to: 'web' }],
  },
  {
    id: 'code-mobile',
    name: 'Nexus Code Mobile',
    dir: 'Nexus Code Mobile',
    buildScript: 'build',
    artifacts: [{ from: 'dist', to: 'web' }],
    android: {
      capSyncScript: 'cap:sync',
      outputDir: 'android/app/build/outputs',
    },
  },
]

const runCommand = (cmd, cmdArgs, options = {}) => {
  const { cwd = ROOT, allowFailure = false, env = process.env } = options
  const printable = [cmd, ...cmdArgs].join(' ')
  console.log(`\n$ ${printable}`)

  const result = spawnSync(cmd, cmdArgs, {
    cwd,
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0 && !allowFailure) {
    throw new Error(`Command failed (${result.status}): ${printable}`)
  }

  return result.status ?? 1
}

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

const ensureDir = async (targetPath) => {
  await fs.mkdir(targetPath, { recursive: true })
}

const copyPathIfExists = async (fromPath, toPath) => {
  if (!(await exists(fromPath))) return false
  await fs.mkdir(path.dirname(toPath), { recursive: true })
  await fs.cp(fromPath, toPath, { recursive: true })
  return true
}

const walkFiles = async (rootPath) => {
  const out = []

  const walk = async (current) => {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else {
        out.push(full)
      }
    }
  }

  await walk(rootPath)
  return out
}

const collectAndroidArtifacts = async (outputRoot) => {
  if (!(await exists(outputRoot))) return []
  const allFiles = await walkFiles(outputRoot)
  return allFiles.filter((file) => file.endsWith('.apk') || file.endsWith('.aab'))
}

const buildAndroidForApp = async (app, warnings) => {
  if (!app.android) return []

  const appRoot = path.join(ROOT, app.dir)
  const androidRoot = path.join(appRoot, 'android')
  const outputRoot = path.join(appRoot, app.android.outputDir)

  if (!(await exists(androidRoot))) {
    warnings.push(`[${app.name}] Android-Ordner fehlt, Android-Build wurde uebersprungen.`)
    return []
  }

  const hasSdk = Boolean(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT)
  const cachedArtifacts = await collectAndroidArtifacts(outputRoot)

  if (!hasSdk) {
    if (cachedArtifacts.length > 0) {
      warnings.push(`[${app.name}] Android SDK fehlt, vorhandene Android-Artefakte werden verwendet.`)
      return cachedArtifacts
    }
    warnings.push(`[${app.name}] ANDROID_HOME/ANDROID_SDK_ROOT nicht gesetzt, Android-Build wurde uebersprungen.`)
    return []
  }

  try {
    runCommand(npmCmd, ['--prefix', appRoot, 'run', app.android.capSyncScript], { cwd: ROOT })
  } catch (error) {
    const message = `[${app.name}] cap:sync fehlgeschlagen: ${error.message}`
    if (strictAndroid) throw new Error(message)
    warnings.push(message)
    return cachedArtifacts
  }

  const gradlew = process.platform === 'win32'
    ? path.join(androidRoot, 'gradlew.bat')
    : path.join(androidRoot, 'gradlew')

  if (!(await exists(gradlew))) {
    warnings.push(`[${app.name}] Gradle Wrapper fehlt, Android-Build wurde uebersprungen.`)
    return []
  }

  try {
    runCommand(gradlew, ['assembleDebug'], { cwd: androidRoot })
  } catch (error) {
    const message = `[${app.name}] assembleDebug fehlgeschlagen: ${error.message}`
    if (strictAndroid) throw new Error(message)
    warnings.push(message)
    return cachedArtifacts
  }

  const builtArtifacts = await collectAndroidArtifacts(outputRoot)
  if (builtArtifacts.length === 0) {
    warnings.push(`[${app.name}] Kein Android Output unter ${app.android.outputDir} gefunden.`)
  }
  return builtArtifacts
}

const main = async () => {
  const startedAt = Date.now()
  const manifest = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    withAndroid,
    apps: [],
    warnings: [],
    durationMs: 0,
  }

  if (clean) {
    await fs.rm(BUILD_ROOT, { recursive: true, force: true })
  }
  await ensureDir(BUILD_ROOT)

  const copiedAssets = await copyPathIfExists(
    path.join(ROOT, 'assets', 'global'),
    path.join(BUILD_ROOT, 'assets', 'global'),
  )
  if (!copiedAssets) {
    manifest.warnings.push('Global Assets unter assets/global nicht gefunden.')
  }

  const copiedApi = await copyPathIfExists(
    path.join(ROOT, 'API', 'nexus-api'),
    path.join(BUILD_ROOT, 'API', 'nexus-api'),
  )
  if (!copiedApi) {
    manifest.warnings.push('API Paket unter API/nexus-api nicht gefunden.')
  }

  for (const app of APPS) {
    const appStart = Date.now()
    const appRoot = path.join(ROOT, app.dir)
    const appOutRoot = path.join(BUILD_ROOT, app.name)

    await ensureDir(appOutRoot)

    runCommand(npmCmd, ['--prefix', appRoot, 'run', app.buildScript], { cwd: ROOT })

    const copied = []
    for (const artifact of app.artifacts) {
      const sourcePath = path.join(appRoot, artifact.from)
      const targetPath = path.join(appOutRoot, artifact.to)
      const ok = await copyPathIfExists(sourcePath, targetPath)
      if (ok) {
        copied.push({ type: artifact.to, from: artifact.from })
      }
    }

    const appWarnings = []
    let androidArtifacts = []

    if (withAndroid && app.android) {
      androidArtifacts = await buildAndroidForApp(app, appWarnings)

      for (const androidFile of androidArtifacts) {
        const relative = path.relative(appRoot, androidFile)
        const target = path.join(appOutRoot, 'android', relative)
        await copyPathIfExists(androidFile, target)
      }

      if (androidArtifacts.length === 0) {
        appWarnings.push(`[${app.name}] Keine APK/AAB Artefakte gefunden.`)
      }
    }

    manifest.warnings.push(...appWarnings)

    manifest.apps.push({
      id: app.id,
      name: app.name,
      buildMs: Date.now() - appStart,
      copiedArtifacts: copied,
      androidArtifacts: androidArtifacts.map((file) => path.relative(ROOT, file)),
      warnings: appWarnings,
    })
  }

  manifest.durationMs = Date.now() - startedAt
  await fs.writeFile(path.join(BUILD_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  console.log('\nBuild abgeschlossen.')
  console.log(`Artefakte: ${BUILD_ROOT}`)

  if (manifest.warnings.length > 0) {
    console.log('\nWarnungen:')
    for (const warning of manifest.warnings) {
      console.log(`- ${warning}`)
    }
  }
}

main().catch((error) => {
  console.error('\nBuild fehlgeschlagen:')
  console.error(error)
  process.exit(1)
})
