import assert from 'node:assert/strict'
import test from 'node:test'
import { createLocalFileRepository } from '../src/storage/localFileRepository.ts'

function fixture(seed = {}) {
  const data = new Map(Object.entries(seed).map(([key, value]) => [key, JSON.stringify(value)]))
  let fail = false
  const storage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { if (fail) throw new Error('quota'); data.set(key, value) },
    removeItem: key => data.delete(key),
  }
  const create = () => createLocalFileRepository({ storage: () => storage, schedule: () => 1, cancel: () => {} })
  return { data, create, fail: value => { fail = value } }
}
const file = { id: 'f1', name: 'keep.txt', content: 'VALUABLE TEXT\nü', unknownMetadata: { retained: true } }

test('legacy content and metadata survive migration and a fresh repository instance', () => {
  const f = fixture({ 'nexus-code-files': [file] })
  assert.deepEqual(f.create().load(), [file])
  assert.deepEqual(f.create().load(), [file])
  assert.equal(f.data.has('nexus-code-files'), true)
})

test('v2 empty content, folders, deletion and an intentionally empty index retain meaning', () => {
  const files = [{ ...file, content: '' }, { id: 'folder', name: 'src', isFolder: true, content: '' }]
  const f = fixture({ 'nexus-code-files-index-v2': files.map(({ content, ...meta }) => meta), 'nexus-code-file-content-v2:f1': '' })
  const repo = f.create()
  assert.deepEqual(repo.load(), files)
  repo.save([])
  assert.equal(repo.flush().ok, true)
  assert.deepEqual(f.create().load(), [])
})

test('quota failure retains the previous complete snapshot and pending bytes for retry', () => {
  const f = fixture({ 'nexus-code-files': [file] })
  const repo = f.create()
  repo.load()
  f.fail(true)
  repo.save([{ ...file, content: 'NEW' }])
  assert.equal(repo.flush().ok, false)
  assert.deepEqual(f.create().load(), [file])
  assert.ok(repo.getStatus().queuedRevision > repo.getStatus().durableRevision)
  f.fail(false)
  assert.equal(repo.flush().ok, true)
  assert.equal(f.create().load()[0].content, 'NEW')
})

test('failed migration never removes the only complete legacy representation', () => {
  const f = fixture({ 'nexus-code-files': [file] })
  f.fail(true)
  const repo = f.create()
  assert.deepEqual(repo.load(), [file])
  assert.equal(repo.getStatus().durableRevision, 0)
  assert.deepEqual(f.create().load(), [file])
})

test('unknown versions and incomplete v2 records block destructive default writes', () => {
  for (const seed of [
    { 'nexus-code-files-snapshot-v3': { schema: 'nexus-code-files', version: 999, files: [file] } },
    { 'nexus-code-files-index-v2': [{ id: 'f1', name: 'missing.txt' }] },
  ]) {
    const f = fixture(seed), before = [...f.data], repo = f.create()
    assert.equal(repo.load(), null)
    assert.equal(repo.save([]).ok, false)
    assert.equal(repo.flush().ok, false)
    assert.deepEqual([...f.data], before)
  }
})

test('recoverable v2 index uses retained legacy content without confusing empty and missing', () => {
  const f = fixture({ 'nexus-code-files-index-v2': [{ id: 'f1', name: 'keep.txt' }], 'nexus-code-files': [file] })
  assert.equal(f.create().load()[0].content, file.content)
})

test('save captures requested bytes and coalesces to the latest complete revision', () => {
  const f = fixture(), repo = f.create(), draft = { ...file }
  repo.save([draft])
  draft.content = 'not queued'
  assert.equal(repo.flush().ok, true)
  assert.equal(f.create().load()[0].content, file.content)
  repo.save([{ ...file, content: 'one' }])
  repo.save([{ ...file, content: 'two' }])
  repo.flush()
  assert.equal(f.create().load()[0].content, 'two')
})
