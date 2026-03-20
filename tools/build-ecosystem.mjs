import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureControlPlane } from './lib/control-plane-guard.mjs'
import { spawnNpmSync, spawnProcessSync } from './lib/process-utils.mjs'
import { resolveApiSource } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const BUILD_ROOT = path.join(ROOT, 'build')

const args = new Set(process.argv.slice(2))
const withAndroid = (args.has('--with-android') || args.has('--android')) && !args.has('--skip-android')
const withInstallers = args.has('--with-installers') || !args.has('--skip-installers')
const strictAndroid = args.has('--strict-android')
const strictInstallers = args.has('--strict-installers')
const withControlPlane = args.has('--with-control-plane') || args.has('--with-api')
const strictControlPlane = args.has('--strict-control-plane')
const clean = !args.has('--no-clean')

const APPS = [
  {
    id: 'main',
    name: 'Nexus Main',
    dir: 'Nexus Main',
    buildScript: 'build',
    electron: {
      installerScript: 'electron:build:host',
      installerScriptMac: 'electron:build:installers',
      releaseDir: 'release',
    },
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
    electron: {
      installerScript: 'electron:build:host',
      installerScriptMac: 'electron:build:installers',
      releaseDir: 'release',
    },
    artifacts: [
      { from: 'dist', to: 'web' },
      { from: 'release', to: 'release' },
    ],
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
  {
    id: 'control',
    name: 'Nexus Control',
    dir: '../Nexus Control',
    buildScript: 'build',
    artifacts: [{ from: 'dist', to: 'web' }],
  },
]

const resolveSharedExports = (apiSource) => ([
  {
    label: 'API Paket',
    from: apiSource.apiDir,
    to: path.join('API', 'nexus-api'),
  },
]).filter((entry) => Boolean(entry.from))

const runCommand = (cmd, cmdArgs, options = {}) => {
  const { cwd = ROOT, allowFailure = false, env = process.env } = options
  const printable = [cmd, ...cmdArgs].join(' ')
  console.log(`\n$ ${printable}`)

  const result = spawnProcessSync(cmd, cmdArgs, {
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

const runNpmCommand = (cmdArgs, options = {}) => {
  const { cwd = ROOT, allowFailure = false, env = process.env } = options
  const printable = ['npm', ...cmdArgs].join(' ')
  console.log(`\n$ ${printable}`)

  const result = spawnNpmSync(cmdArgs, {
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

const unescapeGradlePath = (value) => String(value || '')
  .replace(/\\:/g, ':')
  .replace(/\\\\/g, '\\')

const resolveSdkFromLocalProperties = async (androidRoot) => {
  const localProperties = path.join(androidRoot, 'local.properties')
  if (!(await exists(localProperties))) return null

  try {
    const raw = await fs.readFile(localProperties, 'utf8')
    const match = raw.match(/^\s*sdk\.dir\s*=\s*(.+)\s*$/m)
    if (!match) return null
    const sdkPath = unescapeGradlePath(match[1])
    if (!sdkPath) return null
    return path.resolve(sdkPath)
  } catch {
    return null
  }
}

const resolveAndroidSdkPath = async (appRoot) => {
  const candidates = []
  const addCandidate = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return
    candidates.push(path.resolve(normalized))
  }

  addCandidate(process.env.ANDROID_HOME)
  addCandidate(process.env.ANDROID_SDK_ROOT)

  const androidRoot = path.join(appRoot, 'android')
  const localPropertiesSdk = await resolveSdkFromLocalProperties(androidRoot)
  addCandidate(localPropertiesSdk)

  addCandidate(path.join(ROOT, 'android-sdk'))
  addCandidate(path.join(ROOT, '.android-sdk'))

  const home = process.env.HOME || process.env.USERPROFILE || ''
  if (home) {
    addCandidate(path.join(home, 'Library', 'Android', 'sdk'))
    addCandidate(path.join(home, 'Android', 'Sdk'))
    addCandidate(path.join(home, 'AppData', 'Local', 'Android', 'Sdk'))
  }

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate
    }
  }

  return null
}

const resolveJavaHomeForAndroid = async () => {
  const candidates = []
  const addCandidate = (value) => {
    const normalized = String(value || '').trim()
    if (!normalized) return
    candidates.push(path.resolve(normalized))
  }

  addCandidate(process.env.JAVA_HOME)
  addCandidate('/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home')
  addCandidate('/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home')
  addCandidate('/usr/lib/jvm/java-21-openjdk')
  addCandidate('/usr/lib/jvm/jdk-21')
  addCandidate('/usr/lib/jvm/temurin-21-jdk')

  for (const candidate of candidates) {
    const javac = path.join(candidate, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac')
    if (await exists(javac)) {
      return candidate
    }
  }

  return null
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

const INSTALLER_EXTENSIONS = new Set([
  '.dmg',
  '.pkg',
  '.exe',
  '.msi',
  '.zip',
  '.appimage',
  '.deb',
])

const collectInstallerArtifacts = async (releaseRoot) => {
  if (!(await exists(releaseRoot))) return []
  const allFiles = await walkFiles(releaseRoot)
  return allFiles.filter((file) => INSTALLER_EXTENSIONS.has(path.extname(file).toLowerCase()))
}

const buildElectronInstallersForApp = async (app, warnings) => {
  if (!app.electron || !withInstallers) {
    return {
      attempted: false,
      succeeded: false,
      installerArtifacts: [],
    }
  }

  const appRoot = path.join(ROOT, app.dir)
  const releaseRoot = path.join(appRoot, app.electron.releaseDir || 'release')
  const installerScript = process.platform === 'darwin'
    ? (app.electron.installerScriptMac || app.electron.installerScript)
    : app.electron.installerScript

  try {
    runNpmCommand(['--prefix', appRoot, 'run', installerScript], { cwd: ROOT })

    const installerArtifacts = await collectInstallerArtifacts(releaseRoot)
    if (installerArtifacts.length === 0) {
      warnings.push(`[${app.name}] Installer-Build lief, aber keine Installer-Artefakte im Release gefunden.`)
    }

    return {
      attempted: true,
      succeeded: true,
      installerArtifacts,
    }
  } catch (error) {
    const message = `[${app.name}] Installer-Build fehlgeschlagen: ${error.message}`
    if (strictInstallers) throw new Error(message)

    warnings.push(message)
    const cached = await collectInstallerArtifacts(releaseRoot)
    if (cached.length > 0) {
      warnings.push(`[${app.name}] Vorhandene Installer-Artefakte aus ${app.electron.releaseDir || 'release'} werden weiterverwendet.`)
    }

    return {
      attempted: true,
      succeeded: false,
      installerArtifacts: cached,
    }
  }
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

  const sdkPath = await resolveAndroidSdkPath(appRoot)
  const cachedArtifacts = await collectAndroidArtifacts(outputRoot)

  if (!sdkPath) {
    if (cachedArtifacts.length > 0) {
      warnings.push(`[${app.name}] Android SDK fehlt, vorhandene Android-Artefakte werden verwendet.`)
      return cachedArtifacts
    }
    warnings.push(`[${app.name}] ANDROID_HOME/ANDROID_SDK_ROOT nicht gesetzt, Android-Build wurde uebersprungen.`)
    return []
  }

  const androidEnv = {
    ...process.env,
    ANDROID_HOME: sdkPath,
    ANDROID_SDK_ROOT: sdkPath,
  }
  const javaHome = await resolveJavaHomeForAndroid()
  if (javaHome) {
    androidEnv.JAVA_HOME = javaHome
    androidEnv.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${androidEnv.PATH || ''}`
  }

  try {
    runNpmCommand(['--prefix', appRoot, 'run', app.android.capSyncScript], {
      cwd: ROOT,
      env: androidEnv,
    })
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
    runCommand(gradlew, ['assembleDebug'], {
      cwd: androidRoot,
      env: androidEnv,
    })
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
  const apiSource = await resolveApiSource({ root: ROOT, quiet: false })
  const sharedExports = resolveSharedExports(apiSource)
  const manifest = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    withAndroid,
    withInstallers,
    withControlPlane,
    apps: [],
    warnings: [],
    durationMs: 0,
    apiSource: {
      mode: apiSource.mode,
      controlPlaneDir: apiSource.controlPlaneDir ? path.relative(ROOT, apiSource.controlPlaneDir) : null,
      apiDir: path.relative(ROOT, apiSource.apiDir),
      schemasDir: apiSource.schemasDir ? path.relative(ROOT, apiSource.schemasDir) : null,
      controlBaseUrl: apiSource.controlBaseUrl || null,
    },
  }

  if (withControlPlane) {
    try {
      const controlPlaneGuard = await ensureControlPlane({
        root: ROOT,
        startIfMissing: true,
        timeoutMs: 90_000,
        quiet: false,
      })
      manifest.controlPlane = {
        enabled: true,
        url: controlPlaneGuard.url,
        startedByBuildTool: controlPlaneGuard.started,
        pid: controlPlaneGuard.pid,
        sourceMode: controlPlaneGuard.sourceMode || apiSource.mode,
      }
    } catch (error) {
      const message = `Control API Healthcheck fehlgeschlagen: ${error.message || error}`
      if (strictControlPlane) {
        throw new Error(message)
      }
      manifest.warnings.push(message)
      manifest.controlPlane = {
        enabled: true,
        url: null,
        startedByBuildTool: false,
        pid: null,
        sourceMode: apiSource.mode,
      }
    }
  } else {
    manifest.controlPlane = {
      enabled: false,
      url: null,
      startedByBuildTool: false,
      pid: null,
      sourceMode: apiSource.mode,
    }
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

  for (const sharedExport of sharedExports) {
    const copied = await copyPathIfExists(
      sharedExport.from,
      path.join(BUILD_ROOT, sharedExport.to),
    )

    if (!copied) {
      manifest.warnings.push(`${sharedExport.label} unter ${path.relative(ROOT, sharedExport.from)} nicht gefunden.`)
    }
  }

  for (const app of APPS) {
    const appStart = Date.now()
    const appRoot = path.join(ROOT, app.dir)
    const appOutRoot = path.join(BUILD_ROOT, app.name)

    await ensureDir(appOutRoot)

    const appWarnings = []
    const installerBuild = await buildElectronInstallersForApp(app, appWarnings)

    const needsAppBuild = !(installerBuild.attempted && installerBuild.succeeded)
    if (needsAppBuild) {
      runNpmCommand(['--prefix', appRoot, 'run', app.buildScript], { cwd: ROOT })
    }

    const copied = []
    for (const artifact of app.artifacts) {
      const sourcePath = path.join(appRoot, artifact.from)
      const targetPath = path.join(appOutRoot, artifact.to)
      const ok = await copyPathIfExists(sourcePath, targetPath)
      if (ok) {
        copied.push({ type: artifact.to, from: artifact.from })
      }
    }

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
      installerArtifacts: installerBuild.installerArtifacts.map((file) => path.relative(ROOT, file)),
      installerBuildAttempted: installerBuild.attempted,
      installerBuildSucceeded: installerBuild.succeeded,
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
