import test from 'node:test'
import assert from 'node:assert/strict'
import { installPublicPackages } from './lib/public-packages.mjs'

test('an earlier failed install cannot be masked by a successful later npm process', () => {
  const calls = []
  assert.throws(() => installPublicPackages(directory => {
    calls.push(directory)
    return { status: directory === 'broken' ? 1 : 0 }
  }, ['core', 'broken', 'later']), /broken.*exit 1/)
  assert.deepEqual(calls, ['core', 'broken'])
})
test('a launch failure stops installation; successful installs visit every package', () => {
  assert.throws(() => installPublicPackages(() => ({ status: null, error: new Error('npm unavailable') }), ['core']), /npm unavailable/)
  const calls = []
  installPublicPackages(directory => { calls.push(directory); return { status: 0 } }, ['one', 'two'])
  assert.deepEqual(calls, ['one', 'two'])
})
