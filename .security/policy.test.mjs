import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { securityDir, root } from './runtime.mjs'

export function assertPolicy(source) {
  const text = source.replaceAll('\r\n', '\n')
  assert.match(text, /^  pull_request:$/m)
  assert.match(text, /^  push:$/m)
  assert.doesNotMatch(text, /continue-on-error|\|\| true|paths-ignore|secrets\.|github\.token|contents: write/)
  assert.match(text, /^permissions:\n  contents: read$/m)
  const current = text.match(/^  source-secrets:\n([\s\S]*?)(?=^  history-incident-audit:)/m)?.[1]
  assert.ok(current)
  assert.doesNotMatch(current, /^    if:|^        if:/m)
  assert.match(current, /run: node --test \.security\/scan\.test\.mjs \.security\/policy\.test\.mjs/)
  assert.match(current, /run: node \.security\/ci\.mjs/)
  assert.match(current, /NEXUS_SCAN_BASE: \$\{\{ github.event.pull_request.base.sha \|\| github.event.before \}\}/)
  assert.match(text, /run: node \.security\/scan\.mjs history/)
  for (const step of text.split(/^      - name: /m)) {
    if (step.includes('uses: actions/checkout@')) {
      assert.match(step, /persist-credentials: false/)
      assert.match(step, /fetch-depth: 0/)
    }
  }
  for (const ref of text.matchAll(/uses: (\S+)/g)) assert.match(ref[1], /^actions\/(checkout|setup-node)@[a-f0-9]{40}$/)
}
test('mandatory current/new-content gate is independent of an unsuppressed historical audit', () => {
  const source = fs.readFileSync(path.join(root, '.github/workflows/secret-scanning.yml'), 'utf8')
  assertPolicy(source)
  for (const change of [
    value => value.replace('source-secrets:', 'source-secrets:\n    if: false'),
    value => value.replace('node .security/ci.mjs', 'node .security/ci.mjs || true'),
    value => value.replace('contents: read', 'contents: write'),
    value => value.replaceAll('persist-credentials: false', 'persist-credentials: true'),
    value => value.replaceAll('fetch-depth: 0', 'fetch-depth: 1'),
    value => value.replace('node .security/scan.mjs history', 'echo skipped'),
  ]) assert.throws(() => assertPolicy(change(source)))
  assert.equal(fs.readFileSync(path.join(securityDir, 'gitleaks.toml'), 'utf8').includes('useDefault = true'), true)
  const exceptions = JSON.parse(fs.readFileSync(path.join(securityDir, 'synthetic-lines.json'), 'utf8'))
  for (const item of exceptions) {
    assert.deepEqual(Object.keys(item).sort(), ['file', 'lineSha256', 'reason', 'rule'])
    assert.doesNotMatch(item.file, /(?:^|\/)data\/users\.json$/)
    assert.match(item.lineSha256, /^[a-f0-9]{64}$/)
    assert.ok(item.reason.length > 20)
  }
})
