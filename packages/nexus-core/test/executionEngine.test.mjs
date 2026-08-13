import './register-typescript-hooks.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'

const {
  CODE_EXECUTION_MAX_INPUT_CHARS,
  CODE_EXECUTION_MAX_OUTPUT_CHARS,
  executeCode,
} = await import('../src/code/executionEngine.ts')

const withNativeBridge = async (execute, run) => {
  const previousWindow = globalThis.window
  globalThis.window = { api: { code: { execute } } }
  try {
    await run()
  } finally {
    if (previousWindow === undefined) delete globalThis.window
    else globalThis.window = previousWindow
  }
}

test('oversized input is rejected before the native bridge or regex analysis', async () => {
  let called = false
  await withNativeBridge(async () => {
    called = true
    return { ok: true, output: 'unexpected' }
  }, async () => {
    const output = await executeCode({
      lang: 'javascript',
      content: 'x'.repeat(CODE_EXECUTION_MAX_INPUT_CHARS + 1),
      name: 'oversized.js',
    })
    assert.match(output, /Execution blocked: input exceeds/)
    assert.equal(called, false)
  })
})

test('JSON analysis output is explicitly bounded', async () => {
  const output = await executeCode({
    lang: 'json',
    content: JSON.stringify({ value: 'x'.repeat(90_000) }),
    name: 'large.json',
  })
  assert.equal(output.length, CODE_EXECUTION_MAX_OUTPUT_CHARS)
  assert.match(output, /\[Output truncated at 64000 characters\.\]$/)
})

test('native execution has a renderer-side timeout boundary', async () => {
  await withNativeBridge(() => new Promise(() => {}), async () => {
    const startedAt = Date.now()
    const output = await executeCode(
      { lang: 'javascript', content: 'console.log(1)', name: 'timeout.js' },
      { timeoutMs: 50 },
    )
    assert.match(output, /native runtime timed out/)
    assert.ok(Date.now() - startedAt < 1_000)
  })
})

test('native execution observes cancellation', async () => {
  await withNativeBridge(() => new Promise(() => {}), async () => {
    const controller = new AbortController()
    const pending = executeCode(
      { lang: 'javascript', content: 'console.log(1)', name: 'cancel.js' },
      { signal: controller.signal, timeoutMs: 1_000 },
    )
    controller.abort()
    assert.equal(await pending, 'Execution cancelled.')
  })
})
