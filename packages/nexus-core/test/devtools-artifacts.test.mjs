import './register-typescript-hooks.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'

const {
  DEVTOOLS_MAX_FILE_CHARS,
  DEVTOOLS_PREVIEW_MAX_LOG_CHARS,
  extractDevToolsCodeBundles,
  parseDevToolsPreviewMessage,
  serializeDevToolsArtifactForExport,
  toExecutableDevToolsHtml,
} = await import('../src/devtools/artifacts.ts')

test('preview messages require the exact bounded schema', () => {
  const valid = { type: '__c__', logs: [{ t: 'warn', m: 'bounded warning' }] }
  assert.deepEqual(parseDevToolsPreviewMessage(valid), valid)
  assert.equal(parseDevToolsPreviewMessage({ ...valid, extra: true }), null)
  assert.equal(parseDevToolsPreviewMessage({ type: '__c__', logs: [{ t: 'warn', m: 'ok', extra: true }] }), null)
  assert.equal(parseDevToolsPreviewMessage({ type: '__c__', logs: [{ t: 'debug', m: 'no' }] }), null)
  assert.equal(parseDevToolsPreviewMessage({
    type: '__c__',
    logs: [{ t: 'log', m: 'x'.repeat(DEVTOOLS_PREVIEW_MAX_LOG_CHARS + 1) }],
  }), null)
  assert.equal(parseDevToolsPreviewMessage({
    type: '__c__',
    logs: Array.from({ length: 10 }, () => ({ t: 'log', m: '\u0000'.repeat(1_000) })),
  }), null)
})

test('bundle and executable HTML inputs are bounded before parsing', () => {
  const oversized = 'x'.repeat(DEVTOOLS_MAX_FILE_CHARS + 1)
  assert.throws(() => extractDevToolsCodeBundles([
    { id: 'html', name: 'index.html', type: 'html', content: oversized },
  ]), /exceeds/)
  assert.throws(() => toExecutableDevToolsHtml({ html: oversized, css: '', js: '' }), /exceeds/)
})

test('body extraction uses a bounded parser and the log bridge keeps a fixed window', () => {
  const output = toExecutableDevToolsHtml({
    html: '<header>ignored wrapper</header><body class="app"><main>kept</main></body><footer>ignored wrapper</footer>',
    css: 'main { color: white; }',
    js: 'console.log("ready")',
    includeLogBridge: true,
  })
  assert.match(output, /<body class="app"><main>kept<\/main><\/body>/)
  assert.doesNotMatch(output, /ignored wrapper/)
  assert.match(output, /if\(__logs\.length>__maxLogs\)__logs\.shift\(\)/)
  assert.doesNotMatch(output, /JSON\.stringify\(x/)
  assert.doesNotMatch(output, /logs:__logs}(?:,|\))/)
})

test('artifact JSON export scrubs secret keys and common inline credentials', () => {
  const output = serializeDevToolsArtifactForExport({
    id: 'artifact-1',
    token: 'top-level-secret',
    payload: {
      type: 'snippet',
      code: [
        'const api_key = "sk-live-super-secret";',
        'const header = "Bearer abcdefghijklmnopqrstuvwxyz";',
        'const jwt = "eyJabcdefghijk.abcdefghijkl.abcdefghijkl";',
      ].join('\n'),
    },
  })
  assert.doesNotMatch(output, /top-level-secret|sk-live-super-secret|abcdefghijklmnopqrstuvwxyz|eyJabcdefghijk/)
  assert.match(output, /\[REDACTED/)
})
