import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveApiSource, resolveControlUiRoot } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const CONTROL_UI_ROOT = await resolveControlUiRoot({ root: ROOT, required: false, quiet: true })
const CONTROL_DESKTOP_ROOT = path.resolve(
  process.env.NEXUS_CONTROL_DESKTOP_ROOT || path.join(ROOT, '..', 'NexusAPI', 'Nexus Control Desktop'),
)

const APP_PATHS = [
  'Nexus Main',
  'Nexus Mobile',
  'Nexus Code',
  'Nexus Code Mobile',
  '../Nexus Control',
  'packages',
  'tools',
]

const readFileSafe = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

const readJsonSafe = async (filePath) => {
  const content = await readFileSafe(filePath)
  if (!content) return null

  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

const CONTROL_UI_PRESENT = Boolean(CONTROL_UI_ROOT) && await exists(CONTROL_UI_ROOT)
const CONTROL_DESKTOP_PRESENT = await exists(CONTROL_DESKTOP_ROOT)

const normalizeElectronTargets = (targetConfig) => {
  const targets = Array.isArray(targetConfig) ? targetConfig : [targetConfig]
  return targets
    .map((item) => (typeof item === 'string' ? item : item?.target))
    .filter(Boolean)
    .map((item) => String(item).toLowerCase())
}

const hasElectronTarget = (packageJson, platform, target) => {
  const normalizedTarget = String(target).toLowerCase()
  return normalizeElectronTargets(packageJson?.build?.[platform]?.target).includes(normalizedTarget)
}

const hasLinuxIconSet = async (appDir, packageJson) => {
  const iconPath = String(packageJson?.build?.linux?.icon || '').trim()
  if (iconPath !== 'assets/icons') return false

  const sizes = [16, 32, 48, 64, 128, 256, 512]
  const results = await Promise.all(
    sizes.map(async (size) => {
      const filePath = path.join(ROOT, appDir, 'assets/icons', `${size}x${size}.png`)
      try {
        const stat = await fs.stat(filePath)
        return stat.isFile() && stat.size > 0
      } catch {
        return false
      }
    }),
  )
  return results.every(Boolean)
}

const packageLockMatchesRootPackage = (packageJson, packageLock) => {
  const rootLock = packageLock?.packages?.['']
  if (!packageJson || !packageLock || !rootLock) return false
  const packageDevDependencies = packageJson.devDependencies || {}
  const lockDevDependencies = rootLock.devDependencies || {}

  return packageLock.name === packageJson.name &&
    packageLock.version === packageJson.version &&
    rootLock.name === packageJson.name &&
    rootLock.version === packageJson.version &&
    Number(packageLock.lockfileVersion) >= 3 &&
    Object.entries(packageDevDependencies)
      .every(([name, range]) => lockDevDependencies[name] === range)
}

const hasPackageScript = (packageJson, name, pattern) => {
  const script = String(packageJson?.scripts?.[name] || '')
  return pattern.test(script)
}

const hasExtraResource = (packageJson, from, to) => {
  const resources = Array.isArray(packageJson?.build?.extraResources)
    ? packageJson.build.extraResources
    : []
  return resources.some((item) => item?.from === from && item?.to === to)
}

const addControlDesktopChecks = async (checks, fileChecks) => {
  if (CONTROL_DESKTOP_PRESENT) {
    const controlDesktopPackage = await readJsonSafe(path.join(CONTROL_DESKTOP_ROOT, 'package.json'))
    const controlDesktopLock = await readJsonSafe(path.join(CONTROL_DESKTOP_ROOT, 'package-lock.json'))
    const controlDesktopRoot = path.relative(ROOT, CONTROL_DESKTOP_ROOT)

    checks.push(
      {
        id: 'control-desktop-package-lock',
        ok: packageLockMatchesRootPackage(controlDesktopPackage, controlDesktopLock),
        message: 'Control Desktop package-lock passt zum Root Package',
        details: controlDesktopRoot,
      },
      {
        id: 'control-desktop-pack-scripts',
        ok:
          hasPackageScript(controlDesktopPackage, 'build:ui', /npm --prefix "\.\.\/Nexus Control" run build/) &&
          hasPackageScript(controlDesktopPackage, 'pack', /npm run build:ui && electron-builder --dir/) &&
          hasPackageScript(controlDesktopPackage, 'dist:win', /electron-builder --win nsis/) &&
          hasPackageScript(controlDesktopPackage, 'dist:linux', /electron-builder --linux AppImage deb/) &&
          hasPackageScript(controlDesktopPackage, 'dist:mac', /electron-builder --mac dmg/),
        message: 'Control Desktop hat reproduzierbare UI-Build, Pack- und Installer-Scripts',
        details: JSON.stringify(controlDesktopPackage?.scripts || {}),
      },
      {
        id: 'control-desktop-builder-config',
        ok:
          controlDesktopPackage?.build?.appId === 'cloud.nexus.admin.control' &&
          controlDesktopPackage?.build?.productName === 'Nexus Control Admin' &&
          hasExtraResource(controlDesktopPackage, '../Nexus Control/dist', 'control-ui') &&
          hasElectronTarget(controlDesktopPackage, 'win', 'nsis') &&
          hasElectronTarget(controlDesktopPackage, 'mac', 'dmg') &&
          hasElectronTarget(controlDesktopPackage, 'linux', 'AppImage') &&
          hasElectronTarget(controlDesktopPackage, 'linux', 'deb'),
        message: 'Control Desktop electron-builder Config paketiert die gebaute Control UI',
        details: controlDesktopRoot,
      },
      {
        id: 'control-desktop-electron-deps',
        ok:
          Boolean(controlDesktopPackage?.devDependencies?.electron) &&
          Boolean(controlDesktopPackage?.devDependencies?.['electron-builder']),
        message: 'Control Desktop pinnt Electron und electron-builder im Package',
        details: JSON.stringify(controlDesktopPackage?.devDependencies || {}),
      },
    )

    const preloadContent = await readFileSafe(path.join(CONTROL_DESKTOP_ROOT, 'src/preload.cjs'))
    checks.push({
      id: 'control-desktop-preload-no-node-bridges',
      ok: Boolean(preloadContent) && !/\bipcRenderer\b|require\(['"](?:node:)?fs['"]\)|require\(['"](?:node:)?child_process['"]\)/.test(preloadContent),
      message: 'Control Desktop Preload stellt keine Node-, IPC- oder Prozess-Bridges bereit',
      details: path.relative(ROOT, path.join(CONTROL_DESKTOP_ROOT, 'src/preload.cjs')),
    })

    fileChecks.push(
      {
        id: 'control-desktop-main-security',
        file: path.join(CONTROL_DESKTOP_ROOT, 'src/main.cjs'),
        pattern: /contextIsolation:\s*true[\s\S]*?nodeIntegration:\s*false[\s\S]*?sandbox:\s*true[\s\S]*?webSecurity:\s*true[\s\S]*?allowRunningInsecureContent:\s*false[\s\S]*?webviewTag:\s*false/,
        message: 'Control Desktop BrowserWindow nutzt sichere WebPreferences',
      },
      {
        id: 'control-desktop-navigation-guards',
        file: path.join(CONTROL_DESKTOP_ROOT, 'src/main.cjs'),
        pattern: /TRUSTED_REMOTE_ORIGINS[\s\S]*?setWindowOpenHandler[\s\S]*?shell\.openExternal[\s\S]*?will-navigate[\s\S]*?setPermissionRequestHandler/,
        message: 'Control Desktop blockt Navigation, Popups und Permissions ausserhalb erlaubter Origins',
      },
      {
        id: 'control-desktop-preload-contract',
        file: path.join(CONTROL_DESKTOP_ROOT, 'src/preload.cjs'),
        pattern: /contextBridge\.exposeInMainWorld\('nexusControlDesktop'[\s\S]*?Object\.freeze/,
        message: 'Control Desktop Preload exposed nur einen kleinen Desktop-Marker',
      },
    )
  } else {
    checks.push({
      id: 'control-desktop-private-workspace',
      ok: true,
      message: 'Control Desktop Workspace ist lokal nicht vorhanden und wird im Ecosystem-Verify uebersprungen',
      details: CONTROL_DESKTOP_ROOT,
    })
  }
}

const appendFileCheckResults = async (checks, fileChecks) => {
  for (const check of fileChecks) {
    const content = await readFileSafe(check.file)
    const ok = Boolean(content && check.pattern.test(content))
    checks.push({
      id: check.id,
      ok,
      message: check.message,
      details: ok ? path.relative(ROOT, check.file) : `missing-pattern in ${path.relative(ROOT, check.file)}`,
    })
  }
}

const printChecks = (checks) => {
  const passed = checks.filter((item) => item.ok)
  const failed = checks.filter((item) => !item.ok)

  for (const item of checks) {
    const icon = item.ok ? 'PASS' : 'FAIL'
    console.log(`[${icon}] ${item.id}: ${item.message}`)
    if (item.details) {
      console.log(`       -> ${item.details}`)
    }
  }

  console.log(`\nErgebnis: ${passed.length}/${checks.length} Checks erfolgreich.`)
  return failed
}

const listFilesRecursive = async (dir, out = []) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'release', 'build'].includes(entry.name)) continue
      await listFilesRecursive(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

const run = async () => {
  if (process.argv.includes('--control-desktop-only')) {
    const checks = []
    const fileChecks = []
    await addControlDesktopChecks(checks, fileChecks)
    await appendFileCheckResults(checks, fileChecks)

    const failed = printChecks(checks)
    if (failed.length > 0) {
      process.exit(1)
    }
    return
  }

  const apiSource = await resolveApiSource({ root: ROOT, quiet: true })
  const rootPackage = await readJsonSafe(path.join(ROOT, 'package.json'))

  const checks = [
    {
      id: 'api-source-hosted',
      ok: apiSource.mode === 'hosted',
      message: 'API Source ist hosted-mode',
      details: `mode=${apiSource.mode}`,
    },
    {
      id: 'api-client-dir',
      ok: await exists(apiSource.apiDir),
      message: 'Lokales API Client Package vorhanden',
      details: apiSource.apiDir,
    },
    {
      id: 'api-control-url-configured',
      ok: /^https?:\/\//.test(String(apiSource.controlBaseUrl || '')),
      message: 'Control API URL ist gesetzt',
      details: String(apiSource.controlBaseUrl || 'unset'),
    },
    {
      id: 'release-evidence-script',
      ok:
        hasPackageScript(rootPackage, 'release:evidence', /prepare-release-evidence\.mjs/) &&
        (await exists(path.join(ROOT, 'tools/prepare-release-evidence.mjs'))),
      message: 'Release Evidence Generator ist als npm Script verdrahtet',
      details: rootPackage?.scripts?.['release:evidence'] || 'missing',
    },
  ]

  const fileChecks = [
    {
      id: 'release-evidence-readme',
      file: path.join(ROOT, 'docs/release-evidence/README.md'),
      pattern: /npm run release:evidence[\s\S]*rc-log\.md[\s\S]*smoke-notes\.md[\s\S]*Keine Secrets/,
      message: 'Release Evidence README beschreibt Log, Smokes und Secret-Regeln',
    },
    {
      id: 'release-evidence-generator-contract',
      file: path.join(ROOT, 'tools/prepare-release-evidence.mjs'),
      pattern: /--force[\s\S]*NEXUS_RELEASE_VERSION[\s\S]*screenshots[\s\S]*rc-log\.md[\s\S]*smoke-notes\.md/s,
      message: 'Release Evidence Generator erstellt Version, Logs und Screenshot-Ordner',
    },
    {
      id: 'main-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*["']main["']/s,
      message: 'Nexus Main nutzt NexusRuntime',
    },
    {
      id: 'mobile-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Mobile/src/App.tsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*["']mobile["']/s,
      message: 'Nexus Mobile nutzt NexusRuntime',
    },
    {
      id: 'code-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Code/src/app/useNexusCodeBoot.js'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*["']code["']/s,
      message: 'Nexus Code nutzt NexusRuntime',
    },
    {
      id: 'code-mobile-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Code Mobile/src/App.jsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*["']code-mobile["']/s,
      message: 'Nexus Code Mobile nutzt NexusRuntime',
    },
    {
      id: 'main-view-validation',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /validateViewAccess\(/,
      message: 'Nexus Main validiert Views gegen API',
    },
    {
      id: 'main-auth-effective-payment-tier',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /paymentTier\?:\s*string[\s\S]*?authSession\?\.user\.paymentTier\s*\|\|\s*authSession\?\.user\.requestedTier/s,
      message: 'Nexus Main priorisiert den serverautoritativen Payment-Tier aus dem Auth-Contract',
    },
    {
      id: 'mobile-view-validation',
      file: path.join(ROOT, 'Nexus Mobile/src/App.tsx'),
      pattern: /validateViewAccess\(/,
      message: 'Nexus Mobile validiert Views gegen API',
    },
    {
      id: 'code-view-validation',
      file: path.join(ROOT, 'Nexus Code/src/app/useNexusCodeBoot.js'),
      pattern: /validateViewAccess\("editor"|warmupViewAccess\(\["editor"\]/,
      message: 'Nexus Code validiert editor-View',
    },
    {
      id: 'code-mobile-view-validation',
      file: path.join(ROOT, 'Nexus Code Mobile/src/App.jsx'),
      pattern: /validateViewAccess\("editor"|warmupViewAccess\(\["editor"\]/,
      message: 'Nexus Code Mobile validiert editor-View',
    },
    {
      id: 'nexus-api-view-client',
      file: path.join(ROOT, 'packages/nexus-core/src/api/control/client.ts'),
      pattern: /validateViewAccess\(viewId/s,
      message: 'nexus-api Client hat View-Validation-Client',
    },
    {
      id: 'nexus-api-live-sync-client',
      file: path.join(ROOT, 'packages/nexus-core/src/api/control/client.ts'),
      pattern: /fetchCatalog|fetchLayoutSchema|fetchCurrentRelease|fetchLiveBundle|subscribeReleaseUpdates|resolveFeatureCompatibility/s,
      message: 'nexus-api Client bietet v2 Live-Sync API',
    },
    {
      id: 'nexus-runtime-live-sync',
      file: path.join(ROOT, 'packages/nexus-core/src/api/runtime.ts'),
      pattern: /loadLiveBundle|resolveCompatibility|liveSync/s,
      message: 'Nexus Runtime integriert Live-Sync Hooks',
    },
    {
      id: 'shared-core-live-sync',
      file: path.join(ROOT, 'packages/nexus-core/src/liveSync.ts'),
      pattern: /buildLiveViewModel|resolveLayoutProfile|getFallbackViewsForApp/s,
      message: 'Shared Core hat zentrale Live-Sync View-Orchestrierung',
    },
    {
      id: 'main-live-sync-consumer',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /buildLiveViewModel|loadLiveBundle|liveSync/s,
      message: 'Nexus Main nutzt Live-Sync Catalog/Layout Runtime',
    },
    {
      id: 'mobile-live-sync-consumer',
      file: path.join(ROOT, 'Nexus Mobile/src/App.tsx'),
      pattern: /buildLiveViewModel|loadLiveBundle|liveSync/s,
      message: 'Nexus Mobile nutzt Live-Sync Catalog/Layout Runtime',
    },
    {
      id: 'hosted-alias-main',
      file: path.join(ROOT, 'Nexus Main/vite.config.ts'),
      pattern: /packages\/nexus-core\/src\/api/,
      message: 'Nexus Main Alias zeigt auf internes API Package',
    },
    {
      id: 'hosted-alias-mobile',
      file: path.join(ROOT, 'Nexus Mobile/vite.config.ts'),
      pattern: /packages\/nexus-core\/src\/api/,
      message: 'Nexus Mobile Alias zeigt auf internes API Package',
    },
    {
      id: 'hosted-alias-code',
      file: path.join(ROOT, 'Nexus Code/vite.config.js'),
      pattern: /packages\/nexus-core\/src\/api/,
      message: 'Nexus Code Alias zeigt auf internes API Package',
    },
    {
      id: 'hosted-alias-code-mobile',
      file: path.join(ROOT, 'Nexus Code Mobile/vite.config.js'),
      pattern: /packages\/nexus-core\/src\/api/,
      message: 'Nexus Code Mobile Alias zeigt auf internes API Package',
    },
    {
      id: 'installer-workflow-main-linux-appimage',
      file: path.join(ROOT, '.github/workflows/build-installers.yml'),
      pattern: /app_name:\s*"Nexus Main"[\s\S]*?target:\s*"linux"[\s\S]*?npm_script:\s*"electron:build:linux"/,
      message: 'Installer-Workflow baut Nexus Main Linux AppImage',
    },
    {
      id: 'installer-workflow-code-linux-appimage',
      file: path.join(ROOT, '.github/workflows/build-installers.yml'),
      pattern: /app_name:\s*"Nexus Code"[\s\S]*?target:\s*"linux"[\s\S]*?npm_script:\s*"electron:build:linux"/,
      message: 'Installer-Workflow baut Nexus Code Linux AppImage',
    },
    {
      id: 'installer-workflow-uploads-linux-artifacts',
      file: path.join(ROOT, '.github/workflows/build-installers.yml'),
      pattern: /\*\*\/\*\.AppImage[\s\S]*?\*\*\/\*\.deb/,
      message: 'Installer-Workflow laedt Linux AppImage/deb Artefakte hoch',
    },
    {
      id: 'installer-workflow-signing-gate',
      file: path.join(ROOT, '.github/workflows/build-installers.yml'),
      pattern: /signing_required[\s\S]*?Verify signing configuration[\s\S]*?verify-signing-env\.mjs[\s\S]*?NEXUS_SIGNING_REQUIRED/,
      message: 'Installer-Workflow prueft Signing-Secrets vor Public Release Builds',
    },
    {
      id: 'installer-workflow-checksums',
      file: path.join(ROOT, '.github/workflows/build-installers.yml'),
      pattern: /Generate checksums[\s\S]*?generate-installer-checksums\.mjs[\s\S]*?upload-artifact[\s\S]*?SHA256SUMS\.txt/,
      message: 'Installer-Workflow erzeugt SHA256SUMS fuer Download-Artefakte',
    },
    {
      id: 'mac-pack-notarization',
      file: path.join(ROOT, 'tools/electron-pack-mac.mjs'),
      pattern: /NEXUS_MAC_NOTARIZE[\s\S]*?notarytool[\s\S]*?stapler[\s\S]*?staple/,
      message: 'macOS Pack-Script kann DMGs notarizen und staplen',
    },
    {
      id: 'signing-env-verifier',
      file: path.join(ROOT, 'tools/verify-signing-env.mjs'),
      pattern: /MAC_CSC_LINK[\s\S]*?APPLE_TEAM_ID[\s\S]*?WIN_CSC_LINK[\s\S]*?ANDROID_KEYSTORE_BASE64/,
      message: 'Signing-Env-Verifier deckt macOS, Windows und Android Secrets ab',
    },
    {
      id: 'wiki-signing-runbook-entry',
      file: path.join(ROOT, 'Nexus Wiki/src/data/wikiEntriesPrimary.ts'),
      pattern: /release-signing-notarization[\s\S]*?Signing und Notarization Runbook[\s\S]*?docs\/SIGNING_AND_NOTARIZATION\.md/,
      message: 'Nexus Wiki enthaelt Signing/Notarization Runbook',
    },
    {
      id: 'code-electron-secure-webprefs',
      file: path.join(ROOT, 'Nexus Code/electron/main.cjs'),
      pattern: /contextIsolation:\s*true[\s\S]*?nodeIntegration:\s*false[\s\S]*?sandbox:\s*true[\s\S]*?webSecurity:\s*true[\s\S]*?allowRunningInsecureContent:\s*false[\s\S]*?webviewTag:\s*false/,
      message: 'Nexus Code Electron Window nutzt sichere WebPreferences',
    },
    {
      id: 'code-electron-workspace-fs-sandbox',
      file: path.join(ROOT, 'Nexus Code/electron/main.cjs'),
      pattern: /MAX_FILE_BYTES[\s\S]*?MAX_WRITE_BYTES[\s\S]*?allowedWorkspaceRoots[\s\S]*?registerWorkspaceRoot[\s\S]*?resolveWorkspacePath[\s\S]*?resolveWritableWorkspacePath/,
      message: 'Nexus Code begrenzt Datei-IPC auf ausgewaehlte Workspace Roots',
    },
    {
      id: 'code-electron-terminal-sandbox',
      file: path.join(ROOT, 'Nexus Code/electron/main.cjs'),
      pattern: /MAX_TERMINAL_SESSIONS[\s\S]*?DANGEROUS_TERMINAL_PATTERNS[\s\S]*?isBlockedDangerousTerminalCommand[\s\S]*?resolveTerminalWorkingDirectory[\s\S]*?payload\.cwd/,
      message: 'Nexus Code Terminal-IPC hat Workspace-CWD, Session-Limit und Blocklist',
    },
    {
      id: 'code-electron-navigation-guards',
      file: path.join(ROOT, 'Nexus Code/electron/main.cjs'),
      pattern: /isExternalHttpUrl[\s\S]*?setPermissionRequestHandler[\s\S]*?setPermissionCheckHandler[\s\S]*?will-attach-webview/,
      message: 'Nexus Code blockt Permissions, Webviews und unsichere Navigation',
    },
    {
      id: 'code-electron-preload-validation',
      file: path.join(ROOT, 'Nexus Code/electron/preload.cjs'),
      pattern: /sanitizePath[\s\S]*?sanitizeTerminalId[\s\S]*?sanitizeText[\s\S]*?terminalChannel/,
      message: 'Nexus Code Preload validiert Pfade, Payloads und Terminal Channels',
    },
    {
      id: 'main-devtools-release-health-dashboard',
      file: path.join(ROOT, 'Nexus Main/src/views/devtools/ReleaseHealthDashboard.tsx'),
      pattern: /RELEASE_HEALTH_STORAGE_KEY[\s\S]*?release:gate -- --signing-required[\s\S]*?resolveMainRuntimeChannelConfig[\s\S]*?VIEW_IDS/,
      message: 'Nexus Main DevTools hat Release Health Dashboard',
    },
    {
      id: 'main-devtools-release-health-tab',
      file: path.join(ROOT, 'Nexus Main/src/views/DevToolsView.tsx'),
      pattern: /ReleaseHealthDashboard[\s\S]*?DEVTOOLS_TABS[\s\S]*?id:\s*'release'[\s\S]*?onClick=\{\(\) => setTab\(id\)\}[\s\S]*?<ReleaseHealthDashboard \/>/,
      message: 'DevTools verlinkt Release Health Tab',
    },
    {
      id: 'main-devtools-support-diagnostics-export',
      file: path.join(ROOT, 'Nexus Main/src/views/devtools/ReleaseHealthDashboard.tsx'),
      pattern: /nexus-redacted-support-diagnostics[\s\S]*?includesSecrets:\s*false[\s\S]*?includesLocalStorageValues:\s*false[\s\S]*?nexus-support-diagnostics-redacted/,
      message: 'DevTools exportiert redigierte Support-Diagnostics ohne Secrets',
    },
    {
      id: 'main-guided-onboarding-checklist',
      file: path.join(ROOT, 'Nexus Main/src/components/WelcomeWalkthrough.tsx'),
      pattern: /TOUR_STORAGE_KEY[\s\S]*?const STEPS[\s\S]*?account-checked[\s\S]*?first-note[\s\S]*?workspace-understood[\s\S]*?first-canvas-node[\s\S]*?writeProgress/,
      message: 'Nexus Main hat gefuehrtes First-Start-Onboarding mit Setup-Checkliste',
    },
    {
      id: 'main-runtime-channel-config',
      file: path.join(ROOT, 'Nexus Main/src/app/mainAppConfig.ts'),
      pattern: /MAIN_RUNTIME_CHANNEL_STORAGE_KEY[\s\S]*?MainRuntimeChannel[\s\S]*?production[\s\S]*?canary[\s\S]*?dev[\s\S]*?requiresSignedManifest/,
      message: 'Nexus Main hat Stable/Canary/Dev Runtime Channel Konfiguration',
    },
    {
      id: 'main-runtime-url-policy',
      file: path.join(ROOT, 'Nexus Main/src/app/mainAppConfig.ts'),
      pattern: /normalizeControlBaseUrl[\s\S]*?VITE_NEXUS_CONTROL_URL[\s\S]*?VITE_NEXUS_DEV_CONTROL_API_BASE_URL/,
      message: 'Nexus Main Runtime URLs nutzen die gemeinsame Control-API-Policy inkl. Legacy Env',
    },
    {
      id: 'mobile-runtime-url-policy',
      file: path.join(ROOT, 'Nexus Mobile/src/app/mobileAppConfig.ts'),
      pattern: /normalizeControlBaseUrl[\s\S]*?VITE_NEXUS_CONTROL_API_BASE_URL[\s\S]*?VITE_NEXUS_CONTROL_URL/,
      message: 'Nexus Mobile Runtime URLs nutzen die gemeinsame Control-API-Policy inkl. Legacy Env',
    },
    {
      id: 'dev-all-no-open-cross-platform',
      file: path.join(ROOT, 'package.json'),
      pattern: /"dev:all:no-open":\s*"node \.\/tools\/dev-ecosystem\.mjs --without-control-plane --no-open"/,
      message: 'dev:all:no-open nutzt ein Windows-portables CLI-Flag statt Shell-Env-Zuweisung',
    },
    {
      id: 'dev-ecosystem-no-open-flag',
      file: path.join(ROOT, 'tools/dev-ecosystem.mjs'),
      pattern: /cliArgs\.has\('--no-open'\)[\s\S]*?NEXUS_CONTROL_NO_OPEN/,
      message: 'Dev-Ecosystem Script unterstuetzt --no-open und Env-Fallback',
    },
    {
      id: 'main-runtime-channel-bootstrap',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /resolveMainRuntimeChannelConfig[\s\S]*?runtimeChannel[\s\S]*?liveSync:[\s\S]*?channel:\s*runtimeChannel[\s\S]*?fetchCatalog\(\{[\s\S]*?channel:\s*runtimeChannel[\s\S]*?fetchCurrentRelease/,
      message: 'Nexus Main Bootflow nutzt sichtbaren Runtime Channel fuer Live Sync und API Bootstrap',
    },
    {
      id: 'main-template-pack-catalog',
      file: path.join(ROOT, 'Nexus Main/src/app/nexusTemplatePacks.ts'),
      pattern: /NEXUS_TEMPLATE_PACKS[\s\S]*?category:\s*"notes"[\s\S]*?category:\s*"tasks"[\s\S]*?category:\s*"canvas"[\s\S]*?category:\s*"code"[\s\S]*?category:\s*"flux"[\s\S]*?buildNexusTemplatePackMarkdown/,
      message: 'Nexus Main hat zentralen Template Pack Katalog',
    },
    {
      id: 'main-infoview-template-packs',
      file: path.join(ROOT, 'Nexus Main/src/views/InfoView.tsx'),
      pattern: /NEXUS_TEMPLATE_PACKS[\s\S]*?buildNexusTemplatePackMarkdown[\s\S]*?nx-info-template-strip[\s\S]*?Template Packs[\s\S]*?buildNexusTemplatePackMarkdown\(pack\)/,
      message: 'InfoView zeigt kopierbare Template Packs',
    },
    {
      id: 'main-workspace-backup-core',
      file: path.join(ROOT, 'Nexus Main/src/app/workspaceBackup.ts'),
      pattern: /WORKSPACE_BACKUP_SCHEMA_VERSION[\s\S]*?createWorkspaceBackupSnapshot[\s\S]*?createWorkspaceBackupPreview[\s\S]*?conflicts[\s\S]*?listWorkspaceBackups[\s\S]*?readWorkspaceBackup[\s\S]*?saveWorkspaceBackup/,
      message: 'Nexus Main hat versionierte Workspace Backup/Restore Core-Logik',
    },
    {
      id: 'main-settings-backup-restore-ui',
      file: path.join(ROOT, 'Nexus Main/src/views/settings/SettingsBackupRestorePanel.tsx'),
      pattern: /before-restore[\s\S]*?Backup und Restore[\s\S]*?Import Preview[\s\S]*?Restore anwenden[\s\S]*?Lokale Backup-Versionen/,
      message: 'Settings zeigt Backup/Restore mit Import Preview und Safety Backup',
    },
    {
      id: 'main-devtools-feature-flag-control-core',
      file: path.join(ROOT, 'Nexus Main/src/app/controlFeatureFlags.ts'),
      pattern: /CONTROL_FEATURE_FLAGS_SCHEMA_VERSION[\s\S]*?createFeatureCatalogDraft[\s\S]*?validateFeatureCatalogDraft[\s\S]*?validateLayoutSchemaDraft[\s\S]*?createReleaseRolloutPlan[\s\S]*?buildFeatureFlagEditorReport/,
      message: 'Nexus Main hat lokale Control Feature-Flag Draft-, Validierungs- und Rollout-Logik',
    },
    {
      id: 'main-devtools-feature-flag-control-ui',
      file: path.join(ROOT, 'Nexus Main/src/views/devtools/FeatureFlagControlPanel.tsx'),
      pattern: /Feature Catalog Draft[\s\S]*?Development-only local admin preview[\s\S]*?Validate[\s\S]*?Rollout Plan[\s\S]*?Audit Trail/,
      message: 'Feature Flags Dev-View zeigt Editor mit Validation, Rollout und Audit',
    },
    {
      id: 'main-devtools-feature-flag-dev-only-registry',
      file: path.join(ROOT, 'Nexus Main/src/app/mainViewRegistry.ts'),
      pattern: /MAIN_DEVELOPMENT_ONLY_VIEWS_ENABLED\s*=\s*import\.meta\.env\.DEV[\s\S]*?MAIN_FEATURE_FLAGS_VIEW_ID[\s\S]*?devOnly:\s*true/,
      message: 'Feature Flags sind als eigene Dev-only View registriert',
    },
    {
      id: 'main-notes-editor-qol',
      file: path.join(ROOT, 'Nexus Main/src/views/NotesView.tsx'),
      pattern: /rememberEditorSelection[\s\S]*?normalizeMarkdownInsert[\s\S]*?nexus-details[\s\S]*?quickSwitchInputRef[\s\S]*?isEditableTarget\(target\)[\s\S]*?type="button"/,
      message: 'Notes schuetzt Editor-Zeilenumbrueche, Toolbar-Selection und Markdown-only Details',
    },
    {
      id: 'main-magic-details-renderer',
      file: path.join(ROOT, 'Nexus Main/src/views/notes/NotesMagicRenderers.tsx'),
      pattern: /function MagicDetails[\s\S]*?nexus-details[\s\S]*?MagicDetails/,
      message: 'Notes rendert nexus-details ohne rohes HTML im Editor',
    },
    {
      id: 'main-interactive-buttons-default-type',
      file: path.join(ROOT, 'Nexus Main/src/components/render/InteractiveActionButton.tsx'),
      pattern: /type=\{rest\.type \|\| "button"\}/,
      message: 'Interaktive Action Buttons defaulten auf type=button',
    },
    {
      id: 'main-interactive-icon-buttons-default-type',
      file: path.join(ROOT, 'Nexus Main/src/components/render/InteractiveIconButton.tsx'),
      pattern: /type=\{rest\.type \|\| "button"\}/,
      message: 'Interaktive Icon Buttons defaulten auf type=button',
    },
  ]

  await addControlDesktopChecks(checks, fileChecks)

  if (CONTROL_UI_PRESENT) {
    fileChecks.push(
      {
        id: 'control-ui-paywall-tab',
        file: path.join(CONTROL_UI_ROOT, 'src/layout/workspace/nav-tabs.js'),
        pattern: /data-tab="paywalls"/,
        message: 'Control UI hat Paywalls-Tab',
      },
      {
        id: 'control-ui-livesync-tab',
        file: path.join(CONTROL_UI_ROOT, 'src/layout/workspace/nav-tabs.js'),
        pattern: /data-tab="livesync"/,
        message: 'Control UI hat Live-Sync-Tab',
      },
      {
        id: 'control-ui-scripts-tab',
        file: path.join(CONTROL_UI_ROOT, 'src/layout/workspace/nav-tabs.js'),
        pattern: /data-tab="scripts"/,
        message: 'Control UI hat Scripts-Tab',
      },
      {
        id: 'control-ui-paywall-save',
        file: path.join(CONTROL_UI_ROOT, 'src/control/events/management-events.js'),
        pattern: /savePaywallsBtn|buildPaywallPayloadFromUi|renderPaywallEditor/s,
        message: 'Control UI kann Paywalls laden/speichern',
      },
      {
        id: 'control-ui-v2-actions',
        file: path.join(CONTROL_UI_ROOT, 'src/control/workspace/v2-actions.js'),
        pattern: /saveV2FeatureCatalog|saveV2LayoutSchema|promoteV2Release|loadV2Runtime/s,
        message: 'Control UI kann v2 Catalog/Schema/Promotion steuern',
      },
    )
  } else {
    checks.push({
      id: 'control-ui-private-workspace',
      ok: true,
      message: 'Private Control UI Workspace ist lokal nicht vorhanden und wird im Public-Verify uebersprungen',
      details: CONTROL_UI_ROOT,
    })
  }

  for (const check of fileChecks) {
    const content = await readFileSafe(check.file)
    const ok = Boolean(content && check.pattern.test(content))
    checks.push({
      id: check.id,
      ok,
      message: check.message,
      details: ok ? path.relative(ROOT, check.file) : `missing-pattern in ${path.relative(ROOT, check.file)}`,
    })
  }

  const mainPackage = await readJsonSafe(path.join(ROOT, 'Nexus Main/package.json'))
  const codePackage = await readJsonSafe(path.join(ROOT, 'Nexus Code/package.json'))
  const mainHasLinuxIcons = await hasLinuxIconSet('Nexus Main', mainPackage)
  const codeHasLinuxIcons = await hasLinuxIconSet('Nexus Code', codePackage)
  const electronPackagingChecks = [
    {
      id: 'main-electron-build-scripts',
      ok:
        mainPackage?.scripts?.['electron:build'] === 'npm run electron:build:host' &&
        mainPackage?.scripts?.['electron:build:all-platforms'] === 'npm run electron:build:installers' &&
        /--linux\s+AppImage\b/.test(String(mainPackage?.scripts?.['electron:pack:linux'] || '')),
      message: 'Nexus Main hat Host-Build und expliziten All-Platform-Installer-Build',
      details: [
        mainPackage?.scripts?.['electron:build'],
        mainPackage?.scripts?.['electron:build:all-platforms'],
        mainPackage?.scripts?.['electron:pack:linux'],
      ].join(' | '),
    },
    {
      id: 'main-product-v6',
      ok: mainPackage?.build?.productName === 'Nexus v6',
      message: 'Nexus Main Installer-Produktname ist v6',
      details: mainPackage?.build?.productName || 'missing',
    },
    {
      id: 'main-installer-targets',
      ok:
        hasElectronTarget(mainPackage, 'win', 'nsis') &&
        hasElectronTarget(mainPackage, 'mac', 'dmg') &&
        hasElectronTarget(mainPackage, 'linux', 'AppImage'),
      message: 'Nexus Main baut Windows, macOS und Linux AppImage Targets',
      details: `win=${hasElectronTarget(mainPackage, 'win', 'nsis')} mac=${hasElectronTarget(mainPackage, 'mac', 'dmg')} linuxAppImage=${hasElectronTarget(mainPackage, 'linux', 'AppImage')}`,
    },
    {
      id: 'main-installer-artifact-names',
      ok:
        /Nexus_Main.+\.AppImage/.test(String(mainPackage?.build?.appImage?.artifactName || '')) &&
        /Nexus_Main.+\.dmg/.test(String(mainPackage?.build?.dmg?.artifactName || '')) &&
        /Nexus_Main.+\.exe/.test(String(mainPackage?.build?.nsis?.artifactName || '')) &&
        !/v5/i.test(
          [
            mainPackage?.build?.productName,
            mainPackage?.build?.dmg?.title,
            mainPackage?.build?.dmg?.artifactName,
            mainPackage?.build?.nsis?.artifactName,
          ].join(' '),
        ),
      message: 'Nexus Main Artefakte sind v6-/Main-benannt und nicht mehr v5',
      details: [
        mainPackage?.build?.appImage?.artifactName,
        mainPackage?.build?.dmg?.artifactName,
        mainPackage?.build?.nsis?.artifactName,
      ].join(' | '),
    },
    {
      id: 'main-linux-icon-set',
      ok: mainHasLinuxIcons,
      message: 'Nexus Main hat PNG-Icons fuer Linux/AppImage',
      details: mainHasLinuxIcons ? 'assets/icons/{16,32,48,64,128,256,512}x*.png' : 'missing linux icon set',
    },
    {
      id: 'main-mac-signing-config',
      ok:
        mainPackage?.build?.mac?.hardenedRuntime === true &&
        mainPackage?.build?.mac?.entitlements === 'build/entitlements.mac.plist' &&
        mainPackage?.build?.mac?.entitlementsInherit === 'build/entitlements.mac.plist' &&
        (await exists(path.join(ROOT, 'Nexus Main/build/entitlements.mac.plist'))),
      message: 'Nexus Main macOS Build nutzt Hardened Runtime und Entitlements',
      details: JSON.stringify({
        hardenedRuntime: mainPackage?.build?.mac?.hardenedRuntime,
        entitlements: mainPackage?.build?.mac?.entitlements,
      }),
    },
    {
      id: 'code-electron-build-scripts',
      ok:
        codePackage?.scripts?.['electron:build'] === 'npm run electron:build:host' &&
        codePackage?.scripts?.['electron:build:all-platforms'] === 'npm run electron:build:installers' &&
        /--linux\s+AppImage\b/.test(String(codePackage?.scripts?.['electron:pack:linux'] || '')),
      message: 'Nexus Code hat Host-Build und expliziten All-Platform-Installer-Build',
      details: [
        codePackage?.scripts?.['electron:build'],
        codePackage?.scripts?.['electron:build:all-platforms'],
        codePackage?.scripts?.['electron:pack:linux'],
      ].join(' | '),
    },
    {
      id: 'code-installer-targets',
      ok:
        hasElectronTarget(codePackage, 'win', 'nsis') &&
        hasElectronTarget(codePackage, 'mac', 'dmg') &&
        hasElectronTarget(codePackage, 'linux', 'AppImage'),
      message: 'Nexus Code baut Windows, macOS und Linux AppImage Targets',
      details: `win=${hasElectronTarget(codePackage, 'win', 'nsis')} mac=${hasElectronTarget(codePackage, 'mac', 'dmg')} linuxAppImage=${hasElectronTarget(codePackage, 'linux', 'AppImage')}`,
    },
    {
      id: 'code-installer-artifact-names',
      ok:
        /Nexus_Code.+\.AppImage/.test(String(codePackage?.build?.appImage?.artifactName || '')) &&
        /Nexus_Code.+\.dmg/.test(String(codePackage?.build?.dmg?.artifactName || '')) &&
        /Nexus_Code.+\.exe/.test(String(codePackage?.build?.nsis?.artifactName || '')),
      message: 'Nexus Code Artefakte sind versionierte Download-Dateien',
      details: [
        codePackage?.build?.appImage?.artifactName,
        codePackage?.build?.dmg?.artifactName,
        codePackage?.build?.nsis?.artifactName,
      ].join(' | '),
    },
    {
      id: 'code-linux-icon-set',
      ok: codeHasLinuxIcons,
      message: 'Nexus Code hat PNG-Icons fuer Linux/AppImage',
      details: codeHasLinuxIcons ? 'assets/icons/{16,32,48,64,128,256,512}x*.png' : 'missing linux icon set',
    },
    {
      id: 'code-mac-signing-config',
      ok:
        codePackage?.build?.mac?.hardenedRuntime === true &&
        codePackage?.build?.mac?.entitlements === 'build/entitlements.mac.plist' &&
        codePackage?.build?.mac?.entitlementsInherit === 'build/entitlements.mac.plist' &&
        (await exists(path.join(ROOT, 'Nexus Code/build/entitlements.mac.plist'))),
      message: 'Nexus Code macOS Build nutzt Hardened Runtime und Entitlements',
      details: JSON.stringify({
        hardenedRuntime: codePackage?.build?.mac?.hardenedRuntime,
        entitlements: codePackage?.build?.mac?.entitlements,
      }),
    },
  ]

  checks.push(...electronPackagingChecks)

  const forbiddenPatterns = [
    /\.\.\/API\//,
    /\.nexus-private\//,
  ]

  const forbiddenHits = []
  for (const basePath of APP_PATHS) {
    const abs = path.join(ROOT, basePath)
    if (!(await exists(abs))) continue
    const files = await listFilesRecursive(abs)
    for (const file of files) {
      if (!/\.(ts|tsx|js|jsx|json|mjs|md|yml|yaml)$/.test(file)) continue
      const content = await readFileSafe(file)
      if (!content) continue

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          forbiddenHits.push(path.relative(ROOT, file))
          break
        }
      }
    }
  }

  checks.push({
    id: 'no-private-api-references',
    ok: forbiddenHits.length === 0,
    message: 'Keine privaten API-Pfadreferenzen im Ecosystem-Code',
    details: forbiddenHits.length === 0 ? 'ok' : forbiddenHits.slice(0, 12).join(', '),
  })

  const failed = printChecks(checks)

  if (failed.length > 0) {
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(`verify:ecosystem fehlgeschlagen: ${error.message || error}`)
  process.exit(1)
})
