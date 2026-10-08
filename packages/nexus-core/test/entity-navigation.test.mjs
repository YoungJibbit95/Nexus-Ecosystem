import assert from 'node:assert/strict'
import test from 'node:test'
import * as navigation from '../src/planning/entityNavigation.ts'
import { draftRegistry } from '../src/storage/draftRegistry.ts'
import { workspaceOperation } from '../src/storage/workspaceOperation.ts'

test('typed navigation is active-owner scoped, once-only and superseded by repeated intent', () => {
  const first = navigation.requestEntityNavigation('main', { kind: 'note', id: 'n' })
  assert.equal(navigation.entityNavigationState('main', first, false), 'pending')
  const next = navigation.requestEntityNavigation('main', { kind: 'note', id: 'n' })
  assert.equal(navigation.entityNavigationState('main', first, true), 'pending')
  assert.equal(navigation.entityNavigationState('main', next, true), 'ready')
  assert.equal(navigation.consumeEntityNavigation('main', next.requestId), true)
  assert.equal(navigation.entityNavigationState('main', next, true), 'pending')
})

test('workspace replacement invalidates same-ID targets for both clients', () => {
  for (const client of ['main', 'mobile']) {
    const request = navigation.requestEntityNavigation(client, { kind: 'canvas-node', canvasId: 'c', id: 'n' })
    draftRegistry.invalidate()
    assert.equal(navigation.entityNavigationState(client, request, true), 'stale')
    navigation.consumeEntityNavigation(client, request.requestId)
  }
})

test('Canvas library destination is a navigation target, not a new Task EntityRef', async () => {
  const request = navigation.requestEntityNavigation('main', { kind: 'canvas', id: 'c' })
  assert.equal(navigation.entityNavigationState('main', request, true), 'ready')
  await workspaceOperation.run(async () => {
    assert.equal(navigation.entityNavigationState('main', request, true), 'pending')
    assert.equal(navigation.requestEntityNavigation('main', { kind: 'note', id: 'n' }), null)
  })
  assert.equal(navigation.consumeEntityNavigation('main', request.requestId), true)
})
