import test from 'node:test'
import assert from 'node:assert/strict'
import { awaitHydration } from '../src/storage/awaitHydration.ts'

test('capture waits for hydration without rereading already hydrated stores', async () => {
  let ready = false, release, reads = 0
  const wait = new Promise(resolve => { release = resolve })
  const store = { persist: { hasHydrated: () => ready, rehydrate: async () => { reads++; await wait; ready = true } } }
  let captured = false
  const run = awaitHydration([store]).then(() => { captured = true })
  await Promise.resolve(); assert.equal(captured, false)
  release(); await run
  await awaitHydration([store]); assert.equal(reads, 1)
})
test('a swallowed persistence read failure cannot authorize default-state replacement', async () => {
  await assert.rejects(awaitHydration([{ persist: { hasHydrated: () => false, rehydrate: async () => {} } }]), /could not be hydrated/)
})
