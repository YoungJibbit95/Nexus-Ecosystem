import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const checks = [
  {
    id: 'api-main-runtime',
    file: 'Nexus Main/src/App.tsx',
    pattern: /createNexusRuntime\(\{\s*appId:\s*'main'/s,
    message: 'Nexus Main nutzt NexusRuntime mit appId main',
  },
  {
    id: 'api-mobile-runtime',
    file: 'Nexus Mobile/src/App.tsx',
    pattern: /createNexusRuntime\(\{\s*appId:\s*'mobile'/s,
    message: 'Nexus Mobile nutzt NexusRuntime mit appId mobile',
  },
  {
    id: 'api-code-runtime',
    file: 'Nexus Code/src/App.jsx',
    pattern: /createNexusRuntime\(\{\s*appId:\s*"code"/s,
    message: 'Nexus Code nutzt NexusRuntime mit appId code',
  },
  {
    id: 'api-code-mobile-runtime',
    file: 'Nexus Code Mobile/src/App.jsx',
    pattern: /createNexusRuntime\(\{\s*appId:\s*"code-mobile"/s,
    message: 'Nexus Code Mobile nutzt NexusRuntime mit appId code-mobile',
  },
  {
    id: 'api-control-runtime-export',
    file: 'API/nexus-api/src/runtime.ts',
    pattern: /control:\s*NexusControlClient/s,
    message: 'Runtime exponiert den Control Client',
  },
  {
    id: 'api-control-client-export',
    file: 'API/nexus-api/src/index.ts',
    pattern: /export \* from '\.\/control'/,
    message: 'NexusAPI exportiert Control Client',
  },
  {
    id: 'api-performance-rate-limit',
    file: 'API/nexus-api/src/performance.ts',
    pattern: /maxMetricsPerMinute\s*=\s*options\.maxMetricsPerMinute\s*\?\?\s*120/s,
    message: 'NexusAPI hat Rate-Limit fuer Performance-Metriken',
  },
  {
    id: 'api-performance-summary',
    file: 'API/nexus-api/src/performance.ts',
    pattern: /publish\('performance-summary'/,
    message: 'NexusAPI publisht Performance-Summaries',
  },
  {
    id: 'api-connection-payload-guard',
    file: 'API/nexus-api/src/connection.ts',
    pattern: /maxPayloadBytes\s*=\s*options\.maxPayloadBytes\s*\?\?\s*16_000/s,
    message: 'Connection Manager hat Payload-Guard',
  },
  {
    id: 'api-connection-set-dedupe',
    file: 'API/nexus-api/src/connection.ts',
    pattern: /recentEventIds\s*=\s*new Set<string>\(\)/,
    message: 'Connection Deduplizierung nutzt Set fuer Performance',
  },
  {
    id: 'mobile-layout-branch',
    file: 'Nexus Mobile/src/App.tsx',
    pattern: /if\s*\(mob\.isMobile\)\s*\{/,
    message: 'Nexus Mobile hat dedizierten Mobile-Layout-Branch',
  },
  {
    id: 'mobile-layout-nav',
    file: 'Nexus Mobile/src/App.tsx',
    pattern: /<MobileNav\s+view=\{view\}/,
    message: 'Nexus Mobile nutzt Mobile Bottom Navigation',
  },
  {
    id: 'code-mobile-safe-area-wrapper',
    file: 'Nexus Code Mobile/src/App.jsx',
    pattern: /safe-area-inset-top|safe-area-inset-bottom/,
    message: 'Nexus Code Mobile hat Safe-Area Wrapper',
  },
  {
    id: 'code-mobile-dynamic-viewport',
    file: 'Nexus Code Mobile/src/index.css',
    pattern: /100dvh/,
    message: 'Nexus Code Mobile nutzt dynamische Viewport-Hoehe',
  },
  {
    id: 'control-plane-server-auth',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /requireSession\(req, res, \['admin', 'developer'/,
    message: 'Control Plane verwendet rollenbasierte Autorisierung',
  },
  {
    id: 'control-plane-idempotency',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /idempotency-key/,
    message: 'Control Plane nutzt Idempotency-Key fuer Commands',
  },
  {
    id: 'control-plane-device-header',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /X-Nexus-Device-Id|DEVICE_NOT_VERIFIED|DEVICE_ID_REQUIRED/s,
    message: 'Control Plane prueft Device-Verification fuer privilegierte Rollen',
  },
  {
    id: 'control-plane-device-endpoints',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /\/api\/v1\/devices|devices\/approve|devices\/revoke/s,
    message: 'Control Plane bietet Device-Allowlist Endpunkte',
  },
  {
    id: 'control-plane-owner-mutation-lock',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /requireMutationSession|OWNER_ONLY_MUTATION|restrictMutationsToOwner/s,
    message: 'Control Plane erzwingt Owner-Only Mutationen fuer API-Write Routen',
  },
  {
    id: 'control-plane-rate-limit',
    file: 'API/nexus-control-plane/src/security.mjs',
    pattern: /class SlidingWindowRateLimiter/s,
    message: 'Control Plane besitzt Sliding Window Rate Limiter',
  },
  {
    id: 'control-plane-loopback-bind',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /const HOST = '127\.0\.0\.1'|loopbackHosts/s,
    forbiddenPattern: /0\.0\.0\.0/,
    message: 'Control Plane bindet nur an 127.0.0.1',
  },
  {
    id: 'control-plane-port-management',
    file: 'API/nexus-control-plane/src/server.mjs',
    pattern: /assertPortAvailable[\s\S]*try\s*\{[\s\S]*await assertPortAvailable\(PORT, HOST\)[\s\S]*Control Plane Start fehlgeschlagen/s,
    message: 'Control Plane prueft Portverfuegbarkeit und faellt kontrolliert bei Konflikten',
  },
  {
    id: 'schemas-package',
    file: 'API/schemas/src/contracts.mjs',
    pattern: /validateEventBatch|validatePolicyDocument|defaultPolicies|requireVerifiedDeviceForRoles/s,
    message: 'Zentrale Schemas fuer Events und Policies vorhanden',
  },
  {
    id: 'control-ui-guides-tab',
    file: 'Nexus Control/src/index.html',
    pattern: /data-tab="guides"/,
    message: 'Control UI hat Guide-Tab',
  },
  {
    id: 'control-ui-devices-tab',
    file: 'Nexus Control/src/index.html',
    pattern: /data-tab="devices"|device-manage-id|device-approve-btn/s,
    message: 'Control UI hat Device-Allowlist Management',
  },
  {
    id: 'control-ui-mobile-responsive',
    file: 'Nexus Control/src/styles.css',
    pattern: /@media \(max-width:\s*900px\)/,
    message: 'Control UI hat responsive Mobile-Regeln',
  },
  {
    id: 'control-ui-dev-loopback-bind',
    file: 'Nexus Control/scripts/dev-server.mjs',
    pattern: /HOST = '127\.0\.0\.1'[\s\S]*server\.listen\(PORT, HOST/s,
    forbiddenPattern: /0\.0\.0\.0/,
    message: 'Control UI Dev Server bindet nur an 127.0.0.1',
  },
  {
    id: 'control-ui-dev-port-management',
    file: 'Nexus Control/scripts/dev-server.mjs',
    pattern: /assertPortAvailable[\s\S]*try\s*\{[\s\S]*await assertPortAvailable\(PORT, HOST\)[\s\S]*Start fehlgeschlagen/s,
    message: 'Control UI Dev prueft Portverfuegbarkeit und faellt kontrolliert bei Konflikten',
  },
  {
    id: 'control-ui-preview-loopback-bind',
    file: 'Nexus Control/scripts/preview.mjs',
    pattern: /HOST = '127\.0\.0\.1'[\s\S]*server\.listen\(PORT, HOST/s,
    forbiddenPattern: /0\.0\.0\.0/,
    message: 'Control UI Preview Server bindet nur an 127.0.0.1',
  },
  {
    id: 'control-ui-preview-port-management',
    file: 'Nexus Control/scripts/preview.mjs',
    pattern: /assertPortAvailable[\s\S]*try\s*\{[\s\S]*await assertPortAvailable\(PORT, HOST\)[\s\S]*Start fehlgeschlagen/s,
    message: 'Control UI Preview prueft Portverfuegbarkeit und faellt kontrolliert bei Konflikten',
  },
  {
    id: 'control-ui-api-settings',
    file: 'Nexus Control/src/app.js',
    pattern: /api-settings-form|nexus\.control\.baseUrl|X-Nexus-Device-Id/,
    message: 'Control UI verwaltet API Einstellungen',
  },
  {
    id: 'build-tool-control-app',
    file: 'tools/build-ecosystem.mjs',
    pattern: /name:\s*'Nexus Control'/,
    message: 'Build Tool baut die Control UI mit',
  },
  {
    id: 'build-tool-shared-exports',
    file: 'tools/build-ecosystem.mjs',
    pattern: /SHARED_EXPORTS|nexus-control-plane|API\/schemas/s,
    message: 'Build Tool exportiert API, Control Plane und Schemas',
  },
  {
    id: 'root-scripts-control',
    file: 'package.json',
    pattern: /"dev:control"|"dev:control-plane"|"build:control"/,
    message: 'Root Scripts enthalten Control UI und Control Plane',
  },
  {
    id: 'root-script-setup',
    file: 'package.json',
    pattern: /"setup"\s*:\s*"node \.\/tools\/setup-ecosystem\.mjs"/,
    message: 'Root Scripts enthalten den Setup Command',
  },
  {
    id: 'root-script-main-electron',
    file: 'package.json',
    pattern: /"dev:main"\s*:\s*".*electron:dev"/s,
    message: 'dev:main startet Nexus Main in Electron',
  },
  {
    id: 'root-script-dev-all',
    file: 'package.json',
    pattern: /"dev:all"\s*:\s*"node \.\/tools\/dev-ecosystem\.mjs"/,
    message: 'Root Scripts enthalten einen kompletten Dev-Stack Start',
  },
  {
    id: 'root-script-security-admin',
    file: 'package.json',
    pattern: /"security:make-admin"|"security:approve-device"/,
    message: 'Root Scripts enthalten Security Admin Hilfscommands',
  },
  {
    id: 'root-script-mobile-native',
    file: 'package.json',
    pattern: /"dev:mobile"\s*:\s*"[\s\S]*cap:android"/,
    extraPattern: /"dev:mobile:ios"/,
    message: 'Root Scripts starten Nexus Mobile nativ via Capacitor',
  },
  {
    id: 'root-script-code-mobile-native',
    file: 'package.json',
    pattern: /"dev:code-mobile"\s*:\s*"[\s\S]*cap:android"/,
    extraPattern: /"dev:code-mobile:ios"/,
    message: 'Root Scripts starten Nexus Code Mobile nativ via Capacitor',
  },
  {
    id: 'root-script-main-installer-build',
    file: 'package.json',
    pattern: /"build:main"\s*:\s*"[\s\S]*?Nexus Main[\s\S]*?electron:build:installers"/,
    message: 'build:main erzeugt Installer fuer Nexus Main',
  },
  {
    id: 'root-script-code-installer-build',
    file: 'package.json',
    pattern: /"build:code"\s*:\s*"[\s\S]*?Nexus Code[\s\S]*?electron:build:installers"/,
    message: 'build:code erzeugt Installer fuer Nexus Code',
  },
  {
    id: 'root-script-electron-installers',
    file: 'package.json',
    pattern: /"build:electron:installers"\s*:\s*"npm run build:main && npm run build:code"/,
    message: 'Root Script fuer beide Electron Installer vorhanden',
  },
  {
    id: 'tool-security-admin',
    file: 'tools/security-admin.mjs',
    pattern: /make-admin|approve-device|passwordHash|role:\s*'admin'/s,
    message: 'Security Admin Tool fuer User-/Device-Bootstrap vorhanden',
  },
  {
    id: 'dev-stack-no-mobile-vite',
    file: 'tools/dev-ecosystem.mjs',
    pattern: /Starte Nexus Dev Stack \(Control \+ Main \+ Code\)/,
    forbiddenPattern: /id:\s*'mobile'|id:\s*'code-mobile'/,
    message: 'dev:all startet keinen Mobile Vite Stack',
  },
  {
    id: 'mobile-package-dev-native',
    file: 'Nexus Mobile/package.json',
    pattern: /"dev"\s*:\s*"npm run cap:android"/,
    extraPattern: /"dev:ios"\s*:\s*"npm run cap:ios"/,
    message: 'Nexus Mobile dev-Skripte sind auf native Capacitor Starts gesetzt',
  },
  {
    id: 'code-mobile-package-dev-native',
    file: 'Nexus Code Mobile/package.json',
    pattern: /"dev"\s*:\s*"npm run cap:android"/,
    extraPattern: /"dev:ios"\s*:\s*"npm run cap:ios"/,
    message: 'Nexus Code Mobile dev-Skripte sind auf native Capacitor Starts gesetzt',
  },
  {
    id: 'control-plane-trusted-origins-hardened',
    file: 'API/nexus-control-plane/data/policies.json',
    pattern: /"trustedOrigins"\s*:\s*\[\s*"http:\/\/localhost:5173"/,
    forbiddenPattern: /"trustedOrigins"[\s\S]*"\*"/,
    message: 'Control Plane nutzt feste trustedOrigins statt Wildcard',
  },
  {
    id: 'control-plane-owner-policy',
    file: 'API/nexus-control-plane/data/policies.json',
    pattern: /"ownerUsernames"\s*:\s*\[\s*"youngjibbit"/,
    extraPattern: /"restrictMutationsToOwner"\s*:\s*true/,
    message: 'Policies setzen Owner-Only API Mutationen auf youngjibbit',
  },
  {
    id: 'main-electron-security-flags',
    file: 'Nexus Main/electron/main-window.cjs',
    pattern: /webSecurity:\s*true[\s\S]*sandbox:\s*true[\s\S]*allowRunningInsecureContent:\s*false/s,
    message: 'Nexus Main erzwingt sichere Electron WebPreferences',
  },
  {
    id: 'main-electron-navigation-guard',
    file: 'Nexus Main/electron/main-window.cjs',
    pattern: /setWindowOpenHandler|will-navigate/s,
    message: 'Nexus Main blockiert unkontrollierte Navigation und Popups',
  },
  {
    id: 'main-no-global-session-override',
    file: 'Nexus Main/electron-main.cjs',
    pattern: /registerIpcHandlers|createMainWindow/s,
    forbiddenPattern: /applySecurityHeaders|defaultSession|webRequest|setProxy/,
    message: 'Nexus Main nutzt keine globalen Session-Overrides',
  },
  {
    id: 'code-terminal-network-guard',
    file: 'Nexus Code/electron/main.cjs',
    pattern: /NETWORK_MUTATION_PATTERNS|isBlockedNetworkMutationCommand/s,
    extraPattern: /before-quit[\s\S]*terminateActiveProcesses/s,
    message: 'Nexus Code blockiert netzwerkveraendernde Commands und beendet Prozesse sauber',
  },
  {
    id: 'main-ipc-path-guard',
    file: 'Nexus Main/electron/ipc-handlers.cjs',
    pattern: /NEXUS_ALLOWED_FS_ROOTS|path not allowed|MAX_WRITE_BYTES/s,
    message: 'Nexus Main IPC File API besitzt Pfad- und Groessen-Grenzen',
  },
  {
    id: 'readme-api-path-in-api-folder',
    file: 'README.md',
    pattern: /API\/nexus-api|API\/nexus-control-plane|Nexus Control/s,
    message: 'README dokumentiert API- und Control-Komponenten',
  },
  {
    id: 'github-security-policy-file',
    file: '.github/SECURITY.md',
    pattern: /Security Policy|Report A Vulnerability|Governance/s,
    message: 'GitHub Security Policy Datei vorhanden',
  },
  {
    id: 'github-dependabot-config',
    file: '.github/dependabot.yml',
    pattern: /package-ecosystem:\s*"npm"[\s\S]*\/API\/nexus-control-plane/s,
    message: 'Dependabot ist fuer Monorepo-Pakete konfiguriert',
  },
  {
    id: 'github-codeql-workflow',
    file: '.github/workflows/codeql.yml',
    pattern: /github\/codeql-action\/init@v3|languages:\s*javascript-typescript/s,
    message: 'CodeQL Workflow vorhanden',
  },
  {
    id: 'github-installer-workflow',
    file: '.github/workflows/build-installers.yml',
    pattern: /electron:build:mac[\s\S]*electron:build:win/s,
    message: 'GitHub Workflow fuer macOS/Windows Installer vorhanden',
  },
]

const results = []

for (const check of checks) {
  const absolute = path.join(ROOT, check.file)
  let content = ''
  try {
    content = await fs.readFile(absolute, 'utf8')
  } catch {
    results.push({ ...check, ok: false, reason: 'Datei nicht lesbar' })
    continue
  }

  const okPattern = check.pattern.test(content)
  const okExtraPattern = check.extraPattern ? check.extraPattern.test(content) : true
  const hasForbiddenPattern = check.forbiddenPattern ? check.forbiddenPattern.test(content) : false
  const ok = okPattern && okExtraPattern && !hasForbiddenPattern
  results.push({
    ...check,
    ok,
    reason: ok
      ? 'OK'
      : hasForbiddenPattern
        ? 'Verbotenes Pattern gefunden'
        : !okExtraPattern
          ? 'Zusatz-Pattern nicht gefunden'
        : 'Pattern nicht gefunden',
  })
}

const failed = results.filter((r) => !r.ok)

console.log('\nEcosystem Verification')
console.log('=====================')
for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.id}  - ${item.message}`)
}

if (failed.length > 0) {
  console.error(`\n${failed.length} Checks fehlgeschlagen.`)
  for (const item of failed) {
    console.error(`- ${item.id}: ${item.reason} (${item.file})`)
  }
  process.exit(1)
}

console.log(`\nAlle ${results.length} Checks erfolgreich.`)
