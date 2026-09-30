import test from 'node:test'
import assert from 'node:assert/strict'
import { applySnapshotTransaction } from '../src/storage/snapshotTransaction.ts'

function fixture() {
  let state = { content: 'before' }
  let journal
  let failCommit = false
  let failRollback = false
  const events = []
  return {
    ports: {
      prepare: snapshot => { if (!snapshot || typeof snapshot.content !== 'string') throw new Error('invalid'); return structuredClone(snapshot) },
      beforeCapture: () => events.push('flush-drafts'),
      capture: () => state,
      journal: async (before, after) => { events.push('journal'); journal = { before, after } },
      apply: snapshot => { events.push('apply-' + snapshot.content); state = snapshot },
      invalidateDrafts: () => events.push('invalidate'),
      flush: async () => { events.push('commit'); return state.content === 'after' ? !failCommit : !failRollback },
      clearJournal: async () => { events.push('clear'); journal = undefined },
    },
    events, state: () => state, journal: () => journal,
    fail: (commit, rollback = false) => { failCommit = commit; failRollback = rollback },
  }
}
test('validation precedes capture and mutation; journal precedes application; acknowledgment precedes cleanup', async () => {
  const f = fixture()
  await assert.rejects(applySnapshotTransaction({}, f.ports), /invalid/)
  assert.deepEqual(f.events, [])
  await applySnapshotTransaction({ content: 'after' }, f.ports)
  assert.deepEqual(f.events, ['flush-drafts', 'journal', 'apply-after', 'invalidate', 'commit', 'clear'])
  assert.equal(f.state().content, 'after')
})
test('a failed commit restores all previous data before clearing recovery evidence', async () => {
  const f = fixture(); f.fail(true)
  await assert.rejects(applySnapshotTransaction({ content: 'after' }, f.ports), /previous state was recovered/)
  assert.equal(f.state().content, 'before')
  assert.equal(f.journal(), undefined)
})
test('failure during rollback retains a complete recovery point for restart', async () => {
  const f = fixture(); f.fail(true, true)
  await assert.rejects(applySnapshotTransaction({ content: 'after' }, f.ports), /needs recovery/)
  assert.deepEqual(f.journal(), { before: { content: 'before' }, after: { content: 'after' } })
  assert.equal(f.events.includes('clear'), false)
})

test('partial composition uses the latest flushed draft and detaches its captured preimage', async () => {
  const f = fixture()
  f.ports.beforeCapture = () => { f.events.push('flush-drafts'); f.ports.apply({ content: 'latest draft' }) }
  await applySnapshotTransaction(before => ({ content: before.content + ' + imported' }), f.ports)
  assert.equal(f.state().content, 'latest draft + imported')
  assert.equal(f.events.indexOf('journal') > f.events.indexOf('apply-latest draft'), true)
})

test('failed journal acknowledgement never applies imported state', async () => {
  const f = fixture()
  f.ports.journal = async () => { throw new Error('journal unavailable') }
  await assert.rejects(applySnapshotTransaction({ content: 'after' }, f.ports), /journal unavailable/)
  assert.equal(f.state().content, 'before')
  assert.deepEqual(f.events, ['flush-drafts'])
})

test('a synchronous partial apply failure still restores the entire preimage', async () => {
  const f = fixture(), original = f.ports.apply
  f.ports.apply = snapshot => { original(snapshot); if (snapshot.content === 'after') throw new Error('third store failed') }
  await assert.rejects(applySnapshotTransaction({ content: 'after' }, f.ports), /previous state was recovered/)
  assert.equal(f.state().content, 'before')
  assert.equal(f.journal(), undefined)
})
