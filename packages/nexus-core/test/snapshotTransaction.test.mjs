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
