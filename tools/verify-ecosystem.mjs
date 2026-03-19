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
    id: 'api-path-in-api-folder',
    file: 'README.md',
    pattern: /API\/nexus-api/,
    message: 'Dokumentation zeigt API-Location im API-Ordner',
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

  results.push({
    ...check,
    ok: check.pattern.test(content),
    reason: check.pattern.test(content) ? 'OK' : 'Pattern nicht gefunden',
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
