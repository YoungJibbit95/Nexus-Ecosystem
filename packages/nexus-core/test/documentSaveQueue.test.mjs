import test from 'node:test'
import assert from 'node:assert/strict'
import { createDocumentSaveQueue } from '../src/storage/documentSaveQueue.ts'

test('tab changes cannot redirect a scheduled save to another file or content', async () => {
  const timers = new Map()
  let timer = 0
  const writes = []
  const saved = []
  const queue = createDocumentSaveQueue({ schedule: fn => { timers.set(++timer, fn); return timer }, cancel: id => timers.delete(id), onSaved: id => saved.push(id) })
  queue.edit('a', 'A content')
  queue.schedule('a', content => writes.push(['a', content]), 100)
  queue.edit('b', 'B content')
  queue.schedule('b', content => writes.push(['b', content]), 100)
  await queue.flushAll()
  assert.deepEqual(writes, [['a', 'A content'], ['b', 'B content']])
  assert.deepEqual(saved, ['a', 'b'])
})

test('an older native write cannot clear a newer edit and writes to a file stay ordered', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const writes = []
  const saved = []
  const queue = createDocumentSaveQueue({ onSaved: (id, rev) => saved.push([id, rev]) })
  queue.edit('a', 'old')
  const old = queue.save('a', async content => { await gate; writes.push(content) })
  queue.edit('a', 'new')
  const next = queue.save('a', content => writes.push(content))
  release()
  assert.equal((await old).current, false)
  assert.equal((await next).current, true)
  assert.deepEqual(writes, ['old', 'new'])
  assert.deepEqual(saved, [['a', 2]])
})

test('rejected writes keep drafts dirty and can be explicitly retried', async () => {
  const saved = []
  const errors = []
  const queue = createDocumentSaveQueue({ onSaved: id => saved.push(id), onError: (id, message) => errors.push([id, message]) })
  queue.edit('a', 'retained')
  assert.equal((await queue.save('a', () => { throw new Error('disk full') })).ok, false)
  assert.deepEqual(saved, [])
  assert.equal(queue.get('a').content, 'retained')
  assert.deepEqual(errors, [['a', 'disk full']])
  assert.equal((await queue.save('a', () => true)).ok, true)
  assert.deepEqual(saved, ['a'])
})

test('removing a file cancels its scheduled write', async () => {
  const queue = createDocumentSaveQueue()
  let writes = 0
  queue.edit('a', 'do not resurrect')
  queue.schedule('a', () => { writes++ }, 60000)
  queue.forget('a')
  await queue.flushAll()
  assert.equal(writes, 0)
})
