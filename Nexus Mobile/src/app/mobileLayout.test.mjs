import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('mobile scroll stacks do not flex-shrink panels into visual overlap', async () => {
  const css = await readFile(new URL('../index.css', import.meta.url), 'utf8')
  assert.match(css, /\.nx-mobile-scroll-root\s*>\s*\*\s*\{\s*flex-shrink:\s*0;/)
})

test('production Android WebView disables mixed content and debugging', async () => {
  const config = await readFile(new URL('../../capacitor.config.ts', import.meta.url), 'utf8')
  assert.match(config, /allowMixedContent:\s*false/)
  assert.doesNotMatch(config, /allowMixedContent:\s*true/)
  assert.match(config, /process\.env\.NEXUS_MOBILE_BUILD === 'development'/)
  assert.match(config, /process\.env\.NEXUS_MOBILE_WEBVIEW_DEBUGGING === 'true'/)
  assert.match(config, /webContentsDebuggingEnabled:\s*enableDevelopmentWebViewDebugging/)
  assert.doesNotMatch(config, /webContentsDebuggingEnabled:\s*true/)
})
