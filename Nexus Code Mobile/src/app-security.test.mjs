import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { completeCodeMobileLogout, requestCodeMobileLogout } from './lib/sessionLogout.js'

test('Code Mobile authenticates without bundling shared credentials', async () => {
  const source = await readFile(new URL('./App.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /VITE_NEXUS_CONTROL_INGEST_KEY/)
  assert.doesNotMatch(source, /VITE_NEXUS_USER_TIER/)
  assert.match(source, /window\.sessionStorage\.setItem\(CODE_MOBILE_SESSION_KEY/)
  assert.match(source, /Bei Nexus Code Mobile anmelden/)
  assert.match(source, /type="password"/)
  assert.match(source, /token: authSession\?\.token \|\| ""/)
  assert.match(source, /completeCodeMobileLogout/)
  assert.match(source, /revoke: \(\) => logoutCodeMobile\(authSession\?\.token\)/)
  assert.match(source, /clearLocal: \(\) => \{\s*window\.sessionStorage\.removeItem\(CODE_MOBILE_SESSION_KEY\)/)

  const [editor, titleBar] = await Promise.all([
    readFile(new URL('./pages/Editor.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./components/editor/TitleBar.jsx', import.meta.url), 'utf8'),
  ])
  assert.match(editor, /<TitleBar[\s\S]*onLogout=\{onLogout\}/)
  assert.match(titleBar, /aria-label="Abmelden"/)
  assert.match(titleBar, /label: "Abmelden"/)
})

test('Code Mobile revokes the server session with its bearer token', async () => {
  let request = null
  await requestCodeMobileLogout({
    baseUrl: 'https://nexus-api.cloud/',
    token: 'session-token',
    deviceId: 'device-a',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true }
    },
  })
  assert.equal(request.url, 'https://nexus-api.cloud/auth/logout')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers.Authorization, 'Bearer session-token')
  assert.equal(request.options.headers['X-Nexus-Device-Id'], 'device-a')
})

test('Code Mobile clears local credentials even when server revocation fails', async () => {
  const calls = []
  await completeCodeMobileLogout({
    revoke: async () => {
      calls.push('revoke')
      throw new Error('offline')
    },
    clearLocal: () => calls.push('clear'),
  })
  assert.deepEqual(calls, ['revoke', 'clear'])
})
