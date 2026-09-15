import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile scroll stacks do not flex-shrink panels into visual overlap', async () => {
  const css = await readFile(new URL('../index.css', import.meta.url), 'utf8')
  assert.match(css, /\.nx-mobile-scroll-root\s*>\s*\*\s*\{\s*flex-shrink:\s*0;/)
})
