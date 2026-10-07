import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { formatPublicFinding } from './lib/public-scan-output.mjs'

test('legacy public scanner output cannot expose a matched source line', () => {
  const secret = randomBytes(32).toString('hex')
  const output = formatPublicFinding({ file: 'synthetic.md', line: 2, label: 'synthetic credential', text: secret, match: secret })
  assert.equal(output, 'synthetic.md:2 [synthetic credential] [content redacted]')
  assert.ok(!output.includes(secret))
})
