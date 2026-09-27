import assert from 'node:assert/strict'
import test from 'node:test'
import { createDurableQueue } from '../src/storage/durableQueue.ts'
import { encodeSnapshot, readSnapshot, readLegacy, snapshotKey } from '../src/storage/persistedSnapshot.ts'
import { createIndexedDbStorage, createStoreManagerStorage } from '../src/storage/browserPersistence.ts'

const value = text => ({ state: { notes: [{ id: 'n1', content: text }], unknown: { keep: true } }, version: 3 })
const options = { schedule: () => 1, cancel: () => {} }
test('legacy formats preserve version, unknown data and current tombstones', () => {
  assert.deepEqual(readLegacy('app', [], new Map([['app', JSON.stringify(value('old'))]])), value('old'))
  assert.deepEqual(readLegacy('app', ['notes'], new Map([['app::__meta', { version: 3 }], ['app::notes', value('segmented').state.notes]])), { state: { notes: value('segmented').state.notes }, version: 3 })
  assert.equal(readLegacy('app', [], new Map([['app', value('old')], [snapshotKey('app'), encodeSnapshot(null)]])), null)
  assert.deepEqual(readSnapshot(encodeSnapshot(value('new'))), value('new'))
  assert.throws(() => readSnapshot('{"format":"nexus-persist","formatVersion":999}'), /Unsupported/)
  assert.throws(() => readLegacy('app', ['notes'], new Map([['app::notes', '{broken']])) )
})

test('failed commits retain pending bytes and never acknowledge before transaction success', async () => {
  let fail = true
  const durable = new Map()
  const queue = createDurableQueue({ ...options, write: async (name, bytes) => { if (fail) throw new Error('transaction aborted'); durable.set(name, bytes) } })
  queue.enqueue('app', 'new')
  assert.equal(await queue.flush(), false)
  assert.equal(queue.getStatus().durableRevision, 0)
  assert.equal(queue.getStatus().pending, 1)
  fail = false
  assert.equal(await queue.flush(), true)
  assert.equal(durable.get('app'), 'new')
  assert.equal(queue.getStatus().durableRevision, 1)
  assert.equal(queue.getStatus().error, null)
})

test('edits during an in-flight commit are persisted after the older revision', async () => {
  let release
  const first = new Promise(resolve => { release = resolve })
  let markStarted
  const started = new Promise(resolve => { markStarted = resolve })
  const writes = []
  const queue = createDurableQueue({ ...options, write: async (name, bytes) => { writes.push(bytes); if (writes.length === 1) { markStarted(); await first } } })
  queue.enqueue('app', 'old')
  const flushing = queue.flush()
  await started
  queue.enqueue('app', 'new')
  queue.enqueue('canvas', 'canvas')
  release()
  assert.equal(await flushing, true)
  assert.deepEqual(writes, ['old', 'new', 'canvas'])
  assert.equal(queue.getStatus().durableRevision, 3)
})

test('an empty flush followed immediately by an edit cannot acknowledge an uncommitted revision', async () => {
  const writes = []
  const queue = createDurableQueue({ ...options, write: (_name, bytes) => { writes.push(bytes) } })
  const empty = queue.flush()
  queue.enqueue('app', 'next')
  assert.equal(await queue.flush(), true)
  await empty
  assert.deepEqual(writes, ['next'])
  assert.equal(queue.getStatus().pending, 0)
})

function browserFixture(seed = {}) {
  const data = new Map(Object.entries(seed))
  let quota = false
  const oldWindow = globalThis.window
  const oldDocument = globalThis.document
  globalThis.window = {
    localStorage: {
      getItem: key => data.get(key) ?? null,
      setItem: (key, bytes) => { if (quota) throw new Error('quota exceeded'); data.set(key, bytes) },
    },
    indexedDB: { open: () => { const request = {}; queueMicrotask(() => { request.error = new Error('IDB unavailable'); request.onerror() }); return request } },
    addEventListener() {}, removeEventListener() {},
  }
  globalThis.document = { addEventListener() {}, removeEventListener() {} }
  return { data, quota: on => { quota = on }, restore: () => { globalThis.window = oldWindow; globalThis.document = oldDocument } }
}

test('an IndexedDB failure replays the current write to fallback without deleting legacy state', async () => {
  const f = browserFixture({ app: JSON.stringify(value('old')) })
  const store = createIndexedDbStorage({ dbName: 'test', debounceMs: 60000 })
  try {
    assert.deepEqual(await store.getItem('app'), value('old'))
    store.setItem('app', value('new'))
    assert.equal(await store.flush(), true)
    assert.equal(f.data.get('app'), JSON.stringify(value('old')))
    const fresh = createIndexedDbStorage({ dbName: 'test' })
    assert.deepEqual(await fresh.getItem('app'), value('new'))
    fresh.dispose()
  } finally { store.dispose(); f.restore() }
})

test('quota on both backends keeps the last copy and supports retry and restart', async () => {
  const f = browserFixture({ app: JSON.stringify(value('old')) })
  const store = createIndexedDbStorage({ dbName: 'test', debounceMs: 60000 })
  try {
    await store.getItem('app')
    f.quota(true)
    store.setItem('app', value('new'))
    assert.equal(await store.flush(), false)
    assert.equal(f.data.get('app'), JSON.stringify(value('old')))
    assert.equal(store.getStatus().pending, 1)
    f.quota(false)
    assert.equal(await store.flush(), true)
    assert.deepEqual(readSnapshot(f.data.get(snapshotKey('app'))), value('new'))
  } finally { store.dispose(); f.restore() }
})

test('unknown snapshot versions block writes; malformed segments cannot silently become empty data', () => {
  const bytes = '{"format":"nexus-persist","formatVersion":2,"value":{}}'
  const f = browserFixture({ [snapshotKey('app')]: bytes, 'canvas::canvases': '{broken' })
  const store = createStoreManagerStorage({ segmentStateKeys: ['canvases'] })
  try {
    assert.throws(() => store.getItem('app'), /Unsupported/)
    store.setItem('app', value('overwrite'))
    assert.equal(f.data.get(snapshotKey('app')), bytes)
    assert.throws(() => store.getItem('canvas'))
    assert.equal(store.getStatus().blockedNames.length, 2)
  } finally { store.dispose(); f.restore() }
})

test('synchronous exit checkpoints include newest in-memory data and do not resurrect deletions', () => {
  const f = browserFixture({ app: JSON.stringify(value('old')) })
  const store = createStoreManagerStorage({ debounceMs: 60000 })
  const next = value('new')
  try {
    store.setItem('app', next)
    next.state.notes[0].content = 'mutated after enqueue'
    store.dispose()
    const fresh = createStoreManagerStorage()
    assert.deepEqual(fresh.getItem('app'), value('new'))
    fresh.removeItem('app')
    fresh.dispose()
    const restarted = createStoreManagerStorage()
    assert.equal(restarted.getItem('app'), null)
    restarted.dispose()
  } finally { f.restore() }
})

test('a rejected serialization cannot be reported as saved by flushing an older pending value', async () => {
  const f = browserFixture()
  const store = createStoreManagerStorage({ debounceMs: 60000 })
  try {
    store.setItem('app', value('old'))
    const cyclic = value('unsaved'); cyclic.state.self = cyclic
    store.setItem('app', cyclic)
    assert.equal(await store.flush(), false)
    assert.match(store.getStatus().error, /circular/i)
    store.setItem('app', value('repaired'))
    assert.equal(await store.flush(), true)
    assert.equal(store.getStatus().error, null)
  } finally { store.dispose(); f.restore() }
})
