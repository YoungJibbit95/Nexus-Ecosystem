import test from 'node:test'
import assert from 'node:assert/strict'
import { validateLockfile } from './lib/lockfile-contract.mjs'

const binding = '@rolldown/binding-openharmony-arm64'
const entry = { version: '1.2.8', resolved: 'https://registry.example/binding.tgz', integrity: 'sha512-example', optional: true, os: ['openharmony'], cpu: ['arm64'] }
const fixture = () => ({ lockfileVersion: 3, packages: { '': { name: 'fixture', version: '1.0.0' }, 'node_modules/rolldown': { version: '1.2.8', optionalDependencies: { [binding]: '1.2.8' } } } })

test('a missing foreign-platform binding fails on every host before npm ci', () => {
  assert.match(validateLockfile(fixture()).join('\n'), /incomplete.*openharmony/)
})
test('a versionless nested placeholder fails even when a hoisted binding exists', () => {
  const lock = fixture()
  lock.packages[`node_modules/${binding}`] = entry
  lock.packages[`node_modules/rolldown/node_modules/${binding}`] = { dev: true, optional: true }
  const errors = validateLockfile(lock).join('\n')
  assert.match(errors, /missing package version/)
  assert.match(errors, /incomplete/)
})
test('complete hoisted or nested bindings pass; mismatched versions and missing integrity fail', () => {
  for (const location of [`node_modules/${binding}`, `node_modules/rolldown/node_modules/${binding}`]) {
    const lock = fixture(); lock.packages[location] = { ...entry }
    assert.deepEqual(validateLockfile(lock), [])
    lock.packages[location].version = '1.2.7'
    assert.equal(validateLockfile(lock).length, 1)
    lock.packages[location] = { ...entry, integrity: undefined }
    assert.equal(validateLockfile(lock).length, 1)
  }
})
