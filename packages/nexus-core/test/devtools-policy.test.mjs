import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const { getDevelopmentOnlyViewsForApp, getFallbackViewsForApp } = await import('../src/liveSync.ts')
const { validateViewAccess } = await import('../src/api/control/client/view-access.ts')

const buildClient = (overrides = {}) => ({
  appId: 'main',
  baseUrl: '',
  viewValidationEnabled: false,
  viewValidationCacheMs: 0,
  viewAccessCache: new Map(),
  defaultUserId: '',
  defaultUsername: '',
  defaultUserTier: 'free',
  token: '',
  ingestKey: '',
  deviceId: '',
  deviceLabel: '',
  requestTimeoutMs: 500,
  viewValidationFailOpen: true,
  debug: false,
  ...overrides,
})

const jsonResponse = (item, status = 200) => new Response(JSON.stringify({ ok: status < 400, item }), {
  status,
  headers: { 'content-type': 'application/json' },
})

test('DevTools is development-only and never a local-free fallback', async () => {
  assert.equal(getFallbackViewsForApp('main').includes('devtools'), false)
  assert.equal(getFallbackViewsForApp('mobile').includes('devtools'), false)
  assert.deepEqual(getDevelopmentOnlyViewsForApp('main'), ['devtools'])

  const access = await validateViewAccess(buildClient(), 'devtools')
  assert.equal(access.allowed, false)
  assert.equal(access.reason, 'VIEW_VALIDATION_UNAVAILABLE_FAIL_CLOSED')
  assert.equal(access.requiredTier, 'pro')
})

test('an explicit remote denial cannot be replaced by a local-free allow', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => jsonResponse({
    allowed: false,
    reason: 'ROLE_FORBIDDEN',
    userTier: 'pro',
    userTierSource: 'template',
    userTemplateKey: null,
    paywallEnabled: true,
    requiredTier: 'pro',
    evaluatedAt: new Date().toISOString(),
  })
  try {
    const access = await validateViewAccess(buildClient({
      baseUrl: 'https://nexus-api.cloud',
      viewValidationEnabled: true,
      token: 'test-token',
      defaultUserTier: 'pro',
    }), 'dashboard')
    assert.equal(access.allowed, false)
    assert.equal(access.reason, 'ROLE_FORBIDDEN')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('remote authorization HTTP denials remain fail-closed', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = async () => jsonResponse({ error: 'forbidden' }, 403)
  try {
    const access = await validateViewAccess(buildClient({
      baseUrl: 'https://nexus-api.cloud',
      viewValidationEnabled: true,
      token: 'test-token',
      defaultUserTier: 'pro',
    }), 'dashboard')
    assert.equal(access.allowed, false)
    assert.equal(access.reason, 'VIEW_VALIDATION_HTTP_403_FAIL_CLOSED')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('DevTools rejects malformed responses and remote free-tier allows', async () => {
  const previousFetch = globalThis.fetch
  const client = buildClient({
    baseUrl: 'https://nexus-api.cloud',
    viewValidationEnabled: true,
    token: 'test-token',
    defaultUserTier: 'pro',
  })
  try {
    globalThis.fetch = async () => jsonResponse({ reason: 'missing allowed' })
    const malformedDevTools = await validateViewAccess(client, 'devtools')
    const malformedDashboard = await validateViewAccess(client, 'dashboard')
    assert.equal(malformedDevTools.allowed, false)
    assert.equal(malformedDashboard.allowed, false)
    assert.equal(malformedDashboard.reason, 'VIEW_VALIDATION_INVALID_SCHEMA_FAIL_CLOSED')

    globalThis.fetch = async () => jsonResponse({
      allowed: true,
      reason: 'VIEW_VALIDATED',
      userTier: 'free',
      userTierSource: 'template',
      userTemplateKey: null,
      paywallEnabled: false,
      requiredTier: null,
      evaluatedAt: new Date().toISOString(),
    })
    const access = await validateViewAccess(client, 'devtools')
    assert.equal(access.allowed, false)
    assert.equal(access.reason, 'LOCAL_VIEW_TIER_POLICY_BLOCKED')
    assert.equal(access.requiredTier, 'pro')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Main registry and preview listener enforce the matching development/source policy', () => {
  const registry = readFileSync(new URL('../../../Nexus Main/src/app/mainViewRegistry.ts', import.meta.url), 'utf8')
  const devtoolsView = readFileSync(new URL('../../../Nexus Main/src/views/DevToolsView.tsx', import.meta.url), 'utf8')
  assert.match(registry, /devtools:\s*\{[\s\S]*?devOnly:\s*true[\s\S]*?requiredTier:\s*"pro"[\s\S]*?allowedRoles:\s*\["admin",\s*"developer"\]/)
  assert.match(devtoolsView, /e\.source !== iframeRef\.current\?\.contentWindow/)
  assert.match(devtoolsView, /parseDevToolsPreviewMessage\(e\.data\)/)
  assert.match(devtoolsView, /DEVTOOLS_PREVIEW_MAX_MESSAGES_PER_SECOND/)
  assert.match(devtoolsView, /DEVTOOLS_PREVIEW_MAX_CONSOLE_LINES/)
})
