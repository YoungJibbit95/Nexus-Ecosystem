import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveApiSource } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const APP_PATHS = [
  'Nexus Main',
  'Nexus Mobile',
  'Nexus Code',
  'Nexus Code Mobile',
  'Nexus Control',
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

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

const listFilesRecursive = async (dir, out = []) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'release') continue
      await listFilesRecursive(full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

const run = async () => {
  const apiSource = await resolveApiSource({ root: ROOT, quiet: true })

  const checks = [
    {
      id: 'private-api-source',
      ok: apiSource.mode === 'private',
      message: 'API Source ist private-only',
      details: `mode=${apiSource.mode}`,
    },
    {
      id: 'private-api-dir',
      ok: await exists(apiSource.apiDir),
      message: 'Private nexus-api Quelle vorhanden',
      details: apiSource.apiDir,
    },
    {
      id: 'private-control-plane-dir',
      ok: await exists(apiSource.controlPlaneDir),
      message: 'Private nexus-control-plane Quelle vorhanden',
      details: apiSource.controlPlaneDir,
    },
    {
      id: 'private-schemas-dir',
      ok: await exists(apiSource.schemasDir),
      message: 'Private schemas Quelle vorhanden',
      details: apiSource.schemasDir,
    },
  ]

  const fileChecks = [
    {
      id: 'main-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*'main'/s,
      message: 'Nexus Main nutzt NexusRuntime',
    },
    {
      id: 'mobile-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Mobile/src/App.tsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*'mobile'/s,
      message: 'Nexus Mobile nutzt NexusRuntime',
    },
    {
      id: 'code-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Code/src/App.jsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*"code"/s,
      message: 'Nexus Code nutzt NexusRuntime',
    },
    {
      id: 'code-mobile-app-uses-runtime',
      file: path.join(ROOT, 'Nexus Code Mobile/src/App.jsx'),
      pattern: /createNexusRuntime\(\{\s*appId:\s*"code-mobile"/s,
      message: 'Nexus Code Mobile nutzt NexusRuntime',
    },
    {
      id: 'main-view-validation',
      file: path.join(ROOT, 'Nexus Main/src/App.tsx'),
      pattern: /validateViewAccess\(/,
      message: 'Nexus Main validiert Views gegen API',
    },
    {
      id: 'mobile-view-validation',
      file: path.join(ROOT, 'Nexus Mobile/src/App.tsx'),
      pattern: /validateViewAccess\(/,
      message: 'Nexus Mobile validiert Views gegen API',
    },
    {
      id: 'code-view-validation',
      file: path.join(ROOT, 'Nexus Code/src/App.jsx'),
      pattern: /validateViewAccess\("editor"/,
      message: 'Nexus Code validiert editor-View',
    },
    {
      id: 'code-mobile-view-validation',
      file: path.join(ROOT, 'Nexus Code Mobile/src/App.jsx'),
      pattern: /validateViewAccess\("editor"/,
      message: 'Nexus Code Mobile validiert editor-View',
    },
    {
      id: 'control-ui-paywall-tab',
      file: path.join(ROOT, 'Nexus Control/src/layout/workspace/nav-tabs.js'),
      pattern: /data-tab="paywalls"/,
      message: 'Control UI hat Paywalls-Tab',
    },
    {
      id: 'control-ui-livesync-tab',
      file: path.join(ROOT, 'Nexus Control/src/layout/workspace/nav-tabs.js'),
      pattern: /data-tab="livesync"/,
      message: 'Control UI hat Live-Sync-Tab',
    },
    {
      id: 'control-ui-paywall-save',
      file: path.join(ROOT, 'Nexus Control/src/control/events/management-events.js'),
      pattern: /savePaywallsBtn|buildPaywallPayloadFromUi|renderPaywallEditor/s,
      message: 'Control UI kann Paywalls laden/speichern',
    },
    {
      id: 'control-ui-v2-actions',
      file: path.join(ROOT, 'Nexus Control/src/control/workspace/v2-actions.js'),
      pattern: /saveV2FeatureCatalog|saveV2LayoutSchema|promoteV2Release|loadV2Runtime/s,
      message: 'Control UI kann v2 Catalog/Schema/Promotion steuern',
    },
    {
      id: 'api-view-validation-route',
      file: path.join(apiSource.controlPlaneDir, 'src/server/routes/auth/ingest-routes.mjs'),
      pattern: /\/api\/v1\/views\/validate/,
      message: 'Control Plane hat View-Validation-Route',
    },
    {
      id: 'api-v2-routes',
      file: path.join(apiSource.controlPlaneDir, 'src/server/routes/v2-routes.mjs'),
      pattern: /handleV2CatalogRoutes|handleV2LayoutRoutes|handleV2CapabilitiesRoutes|handleV2ReleaseRoutes/s,
      message: 'Control Plane hat API v2 Routes fuer Catalog/Layout/Releases',
    },
    {
      id: 'api-v2-store',
      file: path.join(apiSource.controlPlaneDir, 'src/store/live-sync-release-methods.mjs'),
      pattern: /promoteRelease|reportClientCapability|getCurrentRelease/s,
      message: 'Control Plane Store verwaltet v2 Artefakte',
    },
    {
      id: 'api-owner-only-control-panel',
      file: path.join(apiSource.controlPlaneDir, 'src/server/helpers/authz.mjs'),
      pattern: /CONTROL_PANEL_OWNER_ONLY|ownerOnlyControlPanel|isControlPanelOwnerOnlyEnabled/s,
      message: 'Control Plane erzwingt Owner-Only Panel',
    },
    {
      id: 'api-loopback-host',
      file: path.join(apiSource.controlPlaneDir, 'src/server.mjs'),
      pattern: /resolveLoopbackHost|hostInfo\.downgraded|const HOST = hostInfo\.host/s,
      message: 'Control Plane bindet nur an 127.0.0.1',
    },
    {
      id: 'api-port-management',
      file: path.join(apiSource.controlPlaneDir, 'src/server.mjs'),
      pattern: /ensureServerStart\(|assertPortAvailable/s,
      message: 'Control Plane prueft Portkonflikte vor Start',
    },
    {
      id: 'schemas-paywalls-default',
      file: path.join(apiSource.schemasDir, 'src/contracts/paywalls.mjs'),
      pattern: /defaultPaywallPolicies|paywalls:\s*defaultPaywallPolicies\(\)/s,
      message: 'Schemas enthalten Paywall-Defaults',
    },
    {
      id: 'schemas-paywalls-validate',
      file: path.join(apiSource.schemasDir, 'src/contracts/policy.mjs'),
      pattern: /incomingPaywalls|paywallTiers|paywallUsers/s,
      message: 'Schemas validieren Paywall-Policies',
    },
    {
      id: 'nexus-api-view-client',
      file: path.join(apiSource.apiDir, 'src/control/client.ts'),
      pattern: /validateViewAccess\(viewId/s,
      message: 'nexus-api Client hat View-Validation-Client',
    },
    {
      id: 'nexus-api-live-sync-client',
      file: path.join(apiSource.apiDir, 'src/control/client.ts'),
      pattern: /fetchCatalog|fetchLayoutSchema|fetchCurrentRelease|fetchLiveBundle|subscribeReleaseUpdates|resolveFeatureCompatibility/s,
      message: 'nexus-api Client bietet v2 Live-Sync API',
    },
    {
      id: 'nexus-runtime-live-sync',
      file: path.join(apiSource.apiDir, 'src/runtime.ts'),
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
      id: 'private-alias-main',
      file: path.join(ROOT, 'Nexus Main/vite.config.ts'),
      pattern: /\.nexus-private\/NexusAPI\/API\/nexus-api\/src/,
      message: 'Nexus Main Alias zeigt auf private API',
    },
    {
      id: 'private-alias-mobile',
      file: path.join(ROOT, 'Nexus Mobile/vite.config.ts'),
      pattern: /\.nexus-private\/NexusAPI\/API\/nexus-api\/src/,
      message: 'Nexus Mobile Alias zeigt auf private API',
    },
    {
      id: 'private-alias-code',
      file: path.join(ROOT, 'Nexus Code/vite.config.js'),
      pattern: /\.nexus-private\/NexusAPI\/API\/nexus-api\/src/,
      message: 'Nexus Code Alias zeigt auf private API',
    },
    {
      id: 'private-alias-code-mobile',
      file: path.join(ROOT, 'Nexus Code Mobile/vite.config.js'),
      pattern: /\.nexus-private\/NexusAPI\/API\/nexus-api\/src/,
      message: 'Nexus Code Mobile Alias zeigt auf private API',
    },
  ]

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

  const forbiddenPatterns = [
    /\.\.\/API\//,
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

      const allowPath = file.includes(`${path.sep}.nexus-private${path.sep}`)
      if (allowPath) continue

      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          forbiddenHits.push(path.relative(ROOT, file))
          break
        }
      }
    }
  }

  checks.push({
    id: 'no-local-api-references',
    ok: forbiddenHits.length === 0,
    message: 'Keine lokalen API-Pfadreferenzen im Ecosystem-Code',
    details: forbiddenHits.length === 0 ? 'ok' : forbiddenHits.slice(0, 12).join(', '),
  })

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

  if (failed.length > 0) {
    process.exit(1)
  }
}

run().catch((error) => {
  console.error(`verify:ecosystem fehlgeschlagen: ${error.message || error}`)
  process.exit(1)
})
