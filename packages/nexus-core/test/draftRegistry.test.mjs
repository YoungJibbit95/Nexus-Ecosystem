import test from 'node:test'
import assert from 'node:assert/strict'
import { draftRegistry } from '../src/storage/draftRegistry.ts'

test('drafts enqueue before store drains regardless of registration order', () => {
  const events = [], pending = []
  const unregisterStore = draftRegistry.register(() => { events.push(...pending.splice(0)) }, { phase: 'store' })
  const unregisterDraft = draftRegistry.register(() => { pending.push('last Canvas keystroke') })
  try { draftRegistry.flush(); assert.deepEqual(events, ['last Canvas keystroke']); assert.deepEqual(pending, []) }
  finally { unregisterDraft(); unregisterStore() }
})

test('unmounted sessions are omitted and invalidation synchronously advances generation', () => {
  let called = false, observed
  const unregister = draftRegistry.register(() => { called = true })
  unregister()
  const unsubscribe = draftRegistry.subscribe(() => { observed = draftRegistry.getGeneration() })
  const before = draftRegistry.getGeneration()
  try { draftRegistry.flush(); draftRegistry.invalidate(); assert.equal(called, false); assert.equal(observed, before + 1) }
  finally { unsubscribe() }
})
