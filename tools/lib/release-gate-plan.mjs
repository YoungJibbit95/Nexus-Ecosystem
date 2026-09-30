import { existsSync } from 'node:fs'
import path from 'node:path'

// The public checkout owns the six public packages; full releases also require Control.
// Keep scope selection explicit so a green public check never certifies private products.
export function createReleaseGatePlan({ root: ROOT, argv = [], env = process.env,
  hasPackage = dir => existsSync(path.join(dir, 'package.json')),
}) {
  const WORKSPACE = path.resolve(ROOT, '..')
  const npmBin = 'npm'
  const args = new Set(argv)
  const publicOnly = args.has('--public-only')
  if (publicOnly && ['--fast', '--skip-apps', '--skip-wiki', '--main-mobile-only', '--with-api-contract', '--with-control-desktop-pack'].some(flag => args.has(flag))) {
    throw new Error('--public-only requires all public gates and cannot include private-workspace options')
  }
  const fast = args.has('--fast')
  const ci = args.has('--ci')
  const skipDoctor = args.has('--skip-doctor')
  const skipWebsite = args.has('--skip-website')
  const skipApps = args.has('--skip-apps')
  const skipWiki = args.has('--skip-wiki')
  const withApiContract = args.has('--with-api-contract')
  const signingRequired = args.has('--signing-required')
  const mainMobileOnly = args.has('--main-mobile-only')
  const withMainMobileAudit = args.has('--with-main-mobile-audit') || mainMobileOnly
  const withControlDesktopPack = args.has('--with-control-desktop-pack')

  const sibling = (name) => path.join(WORKSPACE, name)
  const resolveControlUiRootSync = () => {
    const configured = String(env.NEXUS_CONTROL_UI_ROOT || '').trim()
    if (configured) return path.resolve(configured)
    const candidates = [
      sibling('Nexus Control'),
      path.join(sibling('NexusAPI'), 'Nexus Control'),
    ].filter(Boolean)

    return candidates.find((candidate) => hasPackage(candidate)) || null
  }

  const steps = [
    {
      name: 'single React instance',
      cwd: ROOT,
      command: [npmBin, ['run', 'verify:single-react']],
    },
    {
      name: 'encoding gate',
      cwd: ROOT,
      command: [npmBin, ['run', 'verify:encoding']],
    },
    {
      name: publicOnly ? 'public contracts and regressions' : 'ecosystem contracts',
      cwd: ROOT,
      command: [npmBin, ['run', publicOnly ? 'verify:public' : 'verify:ecosystem']],
    },
    {
      name: signingRequired ? 'signing environment (required)' : 'signing environment (optional)',
      cwd: ROOT,
      command: [
        npmBin,
        ['run', signingRequired ? 'verify:signing:required' : 'verify:signing'],
      ],
      optional: !signingRequired,
    },
    {
      name: 'release hardening regressions',
      cwd: ROOT,
      command: [npmBin, ['run', 'verify:release-hardening']],
    },
    {
      name: 'nexus-core package gate',
      cwd: ROOT,
      command: [npmBin, ['--prefix', 'packages/nexus-core', 'run', 'build']],
    },
  ]

  if (!publicOnly && !mainMobileOnly && !fast && !skipDoctor) {
    steps.push({
      name: 'release doctor',
      cwd: ROOT,
      command: [npmBin, ['run', ci ? 'doctor:release:hosted' : 'doctor:release']],
    })
  }

  if (!fast && !skipApps) {
    steps.push(
      {
        name: 'Nexus Main build',
        cwd: ROOT,
        command: [npmBin, ['--prefix', 'Nexus Main', 'run', 'build']],
      },
      {
        name: 'Nexus Mobile build',
        cwd: ROOT,
        command: [npmBin, ['--prefix', 'Nexus Mobile', 'run', 'build']],
      },
    )

    if (!mainMobileOnly) {
      steps.push(
        {
          name: 'Nexus Code build',
          cwd: ROOT,
          command: [npmBin, ['--prefix', 'Nexus Code', 'run', 'build']],
        },
        {
          name: 'Nexus Code Mobile build',
          cwd: ROOT,
          command: [npmBin, ['--prefix', 'Nexus Code Mobile', 'run', 'build']],
        },
      )
    }

    if (withMainMobileAudit) {
      steps.push(
        {
          name: 'Nexus Main dependency audit',
          cwd: ROOT,
          command: [npmBin, ['--prefix', 'Nexus Main', 'audit', '--audit-level=moderate']],
        },
        {
          name: 'Nexus Mobile dependency audit',
          cwd: ROOT,
          command: [npmBin, ['--prefix', 'Nexus Mobile', 'audit', '--audit-level=moderate']],
        },
      )
    }

    if (!publicOnly && !mainMobileOnly) {
      const controlDir = resolveControlUiRootSync()
      if (controlDir && hasPackage(controlDir)) {
        steps.push({
          name: 'Nexus Control build',
          cwd: controlDir,
          command: [npmBin, ['run', 'build']],
        })
      } else {
        steps.push({
          name: 'Nexus Control source required',
          cwd: ROOT,
          command: [process.execPath, ['-e', 'console.error("Nexus Control UI nicht gefunden. Setze NEXUS_CONTROL_UI_ROOT auf ein Projekt mit package.json."); process.exit(1)']],
        })
      }
    }
  }

  if (!mainMobileOnly && !fast && !skipWiki) {
    steps.push(
      {
        name: 'Nexus Wiki dependency audit',
        cwd: ROOT,
        command: [npmBin, ['--prefix', 'Nexus Wiki', 'audit', '--audit-level=moderate']],
      },
      {
        name: 'Nexus Wiki CI build',
        cwd: ROOT,
        command: [npmBin, ['--prefix', 'Nexus Wiki', 'run', 'build:ci']],
      },
    )
  }

  const websiteDir = sibling('nexusproject.dev')
  if (!publicOnly && !mainMobileOnly && !fast && !skipWebsite && hasPackage(websiteDir)) {
    steps.push(
      {
        name: 'nexusproject.dev CI build',
        cwd: websiteDir,
        command: [npmBin, ['run', 'build:ci']],
      },
      {
        name: 'nexusproject.dev API integration',
        cwd: websiteDir,
        command: [npmBin, ['run', 'test:api:integration']],
      },
    )
  }

  const apiDir = path.join(sibling('NexusAPI'), 'API', 'nexus-control-plane')
  const controlDesktopDir = path.join(sibling('NexusAPI'), 'Nexus Control Desktop')

  if (!publicOnly && !mainMobileOnly && hasPackage(controlDesktopDir)) {
    steps.push(
      {
        name: 'Control Desktop main syntax',
        cwd: controlDesktopDir,
        command: [process.execPath, ['--check', 'src/main.cjs']],
      },
      {
        name: 'Control Desktop preload syntax',
        cwd: controlDesktopDir,
        command: [process.execPath, ['--check', 'src/preload.cjs']],
      },
    )

    if (withControlDesktopPack) {
      steps.push({
        name: 'Control Desktop directory pack',
        cwd: controlDesktopDir,
        command: [npmBin, ['run', 'pack']],
        optional: true,
      })
    }
  }

  if (!publicOnly && !mainMobileOnly && withApiContract && hasPackage(apiDir)) {
    steps.push(
      {
        name: 'Control Plane contract tests',
        cwd: apiDir,
        command: [npmBin, ['run', 'test:contract']],
      },
      {
        name: 'Control Plane attack tests',
        cwd: apiDir,
        command: [npmBin, ['run', 'test:attack']],
      },
    )
  }

  if (publicOnly) {
    steps.push({
      name: 'browser persistence regressions',
      cwd: ROOT,
      command: [npmBin, ['run', 'test:persistence:browser']],
    })
  }
  return { steps, ci, scope: publicOnly ? 'public' : mainMobileOnly ? 'main-mobile' : fast ? 'fast' : 'full' }
}
