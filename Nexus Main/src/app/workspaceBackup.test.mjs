import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceBackupSnapshot, parseWorkspaceBackupSnapshot, hashWorkspaceBackupText } from './workspaceBackup.ts'
import { emptyPlanningDocument } from '../../../packages/nexus-core/src/planning/domain.ts'

const note = { id: 'note', title: 'Keep', content: 'Text ü', tags: [], dirty: false, created: '2026-01-01', updated: '2026-01-01', extension: { preserve: true } }
const create = () => createWorkspaceBackupSnapshot({ app: { notes: [note] }, canvas: {}, workspaces: {}, workspaceFs: {}, terminal: {} })
const stable = value => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}` : JSON.stringify(value)
const resign = snapshot => { snapshot.checksum = hashWorkspaceBackupText(stable({ ...snapshot, checksum: '', stats: { ...snapshot.stats, bytes: 0 } })); return snapshot }

test('backup JSON roundtrip preserves entity metadata and does not alias live data', () => {
  const backup = create()
  assert.notEqual(backup.data.app.notes[0], note)
  const parsed = parseWorkspaceBackupSnapshot(JSON.parse(JSON.stringify(backup)))
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.snapshot.data.app.notes, [note])
  assert.equal(parseWorkspaceBackupSnapshot(parsed.snapshot).ok, true)
})

test('schema-1 exports made before the optional-theme checksum repair stay readable', () => {
  const backup = create()
  backup.checksum = hashWorkspaceBackupText(stable({ ...backup, checksum: '', stats: { ...backup.stats, bytes: 0 }, data: { ...backup.data, theme: undefined } }))
  assert.equal(parseWorkspaceBackupSnapshot(JSON.parse(JSON.stringify(backup))).ok, true)
})

test('malformed, missing, duplicate and future data reject without throwing or mutation', () => {
  const invalid = [null, [], {}, { schemaVersion: 1, data: { app: {}, canvas: {} } }, { ...create(), schemaVersion: 2 }]
  const missing = create(); delete missing.data.app.notes; invalid.push(resign(missing))
  const duplicate = create(); duplicate.data.app.notes.push({ ...note }); invalid.push(resign(duplicate))
  const brokenNode = create(); brokenNode.data.canvas.canvases.push({ id: 'board', name: 'Board', nodes: [null], connections: [] }); invalid.push(resign(brokenNode))
  const action = create(); action.data.app.updateNote = 'replace-action'; invalid.push(resign(action))
  for (const sample of invalid) {
    const before = JSON.stringify(sample)
    assert.equal(parseWorkspaceBackupSnapshot(sample).ok, false)
    assert.equal(JSON.stringify(sample), before)
  }
})

test('tampering with valid content fails checksum verification', () => {
  const backup = create()
  backup.data.app.notes[0].content = 'changed outside writer'
  const parsed = parseWorkspaceBackupSnapshot(backup)
  assert.equal(parsed.ok, false)
  assert.match(parsed.message, /checksum/)
})

test('empty collections remain authoritative', () => {
  const backup = create()
  backup.data.app.notes = []
  const parsed = parseWorkspaceBackupSnapshot(resign(backup))
  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.snapshot.data.app.notes, [])
})

test('version-2 backup binds planning and retains compatible metadata without changing schema-1 readers', () => {
  const document = { ...emptyPlanningDocument('planning-g'), future: { retained: true } }
  const backup = createWorkspaceBackupSnapshot({ app: {}, canvas: {}, workspaces: {}, workspaceFs: {}, terminal: {}, planning: document })
  document.future.retained = false
  assert.equal(backup.schemaVersion, 2)
  assert.equal(parseWorkspaceBackupSnapshot(JSON.parse(JSON.stringify(backup))).snapshot.data.planning.future.retained, true)
  const altered = structuredClone(backup); altered.data.planning.revision++
  assert.match(parseWorkspaceBackupSnapshot(altered).message, /checksum/)
  for (const change of [v => { delete v.data.planning }, v => { v.schemaVersion = 1 }, v => { v.data.planning.schemaVersion = 2 }]) {
    const value = structuredClone(backup); change(value)
    assert.equal(parseWorkspaceBackupSnapshot(resign(value)).ok, false)
  }
})
