import test from 'node:test'
import assert from 'node:assert/strict'
import { getFileDescendantIds, renameFileNodes } from '../src/code/fileTree.ts'

test('descendant discovery terminates for cyclic metadata and retains each ID once', () => {
  assert.deepEqual(getFileDescendantIds('a', [{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }]), ['a', 'b', 'c'])
})
test('renaming a directory updates nested native paths while preserving stable identities and metadata', () => {
  for (const sep of ['/', '\\']) {
    const oldPath = ['root', 'src'].join(sep)
    const newPath = ['root', 'source'].join(sep)
    const files = [{ id: 'dir', type: 'folder', fsPath: oldPath }, { id: 'file', parentId: 'dir', fsPath: oldPath + sep + 'keep.ts', content: 'keep', extension: true }, { id: 'other', fsPath: oldPath + '-unrelated' + sep + 'no.ts' }]
    const next = renameFileNodes(files, 'dir', 'source', newPath)
    assert.equal(next[1].fsPath, newPath + sep + 'keep.ts')
    assert.equal(next[1].id, 'file')
    assert.equal(next[1].content, 'keep')
    assert.equal(next[1].extension, true)
    assert.equal(next[2], files[2])
    assert.equal(files[1].fsPath, oldPath + sep + 'keep.ts')
  }
})
