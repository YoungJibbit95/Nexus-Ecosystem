import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { createReleaseGatePlan } from './lib/release-gate-plan.mjs'

const root = path.resolve('isolated-public-checkout')
const plan = (argv, hasPackage = () => false) => createReleaseGatePlan({ root, argv, env: {}, hasPackage })

test('full releases still fail closed when private Control sources are absent', () => {
  const full = plan(['--ci', '--skip-doctor', '--skip-website'])
  assert.equal(full.scope, 'full')
  const missing = full.steps.find(step => step.name === 'Nexus Control source required')
  assert.ok(missing)
  assert.notEqual(missing.optional, true)
  const [command, args] = missing.command
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /NEXUS_CONTROL_UI_ROOT/)
})

test('public CI requires every public build, audit and regression gate independent of siblings', () => {
  const isolated = plan(['--ci', '--public-only', '--signing-required'])
  const withSiblings = plan(['--ci', '--public-only', '--signing-required'], () => true)
  assert.deepEqual(withSiblings, isolated)
  assert.equal(isolated.scope, 'public')
  for (const name of ['single React instance', 'encoding gate', 'public contracts and regressions',
    'signing environment (required)', 'release hardening regressions', 'nexus-core package gate',
    'Nexus Main build', 'Nexus Mobile build', 'Nexus Code build', 'Nexus Code Mobile build',
    'Nexus Wiki dependency audit', 'Nexus Wiki CI build', 'browser persistence regressions']) {
    const step = isolated.steps.find(item => item.name === name)
    assert.ok(step, `Missing required public gate: ${name}`)
    assert.notEqual(step.optional, true, name)
    assert.equal(step.cwd, root)
  }
  assert.deepEqual(isolated.steps.find(step => step.name === 'public contracts and regressions').command,
    ['npm', ['run', 'verify:public']])
  assert.deepEqual(isolated.steps.find(step => step.name === 'Nexus Wiki dependency audit').command,
    ['npm', ['--prefix', 'Nexus Wiki', 'audit', '--audit-level=moderate']])
})

test('public CI rejects partial-public or private-release flags', () => {
  for (const flag of ['--fast', '--skip-apps', '--skip-wiki', '--main-mobile-only',
    '--with-api-contract', '--with-control-desktop-pack']) {
    assert.throws(() => plan(['--public-only', flag]), /requires all public gates/)
  }
})

test('full workspace plans retain private builds and requested API contracts', () => {
  const full = plan(['--with-api-contract', '--signing-required'], () => true)
  for (const name of ['release doctor', 'Nexus Control build', 'nexusproject.dev CI build',
    'Control Desktop main syntax', 'Control Desktop preload syntax',
    'Control Plane contract tests', 'Control Plane attack tests', 'signing environment (required)']) {
    const step = full.steps.find(item => item.name === name)
    assert.ok(step, name)
    assert.notEqual(step.optional, true)
  }
})
