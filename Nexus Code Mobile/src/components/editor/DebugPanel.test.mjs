import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const panel = readFileSync(new URL('./DebugPanel.jsx', import.meta.url), 'utf8')
const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8')

test('Debug panel and release documentation identify the surface as simulation-only', () => {
  assert.match(panel, /Simulation \/ Preview/)
  assert.match(panel, /Kein Debug-Adapter/)
  assert.match(panel, /Code wird nicht ausgeführt/)
  assert.doesNotMatch(panel, /runtime\/debug-adapter|Nexus Debug Session gestartet/)
  assert.match(readme, /Debug \(Simulation\/Preview\)/)
  assert.match(readme, /no debug adapter and no code execution/)
  assert.doesNotMatch(readme, /runtime debugging surface/)
})
