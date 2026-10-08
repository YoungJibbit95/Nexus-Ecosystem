import assert from 'node:assert/strict'
import test from 'node:test'
import * as context from '../src/planning/contextRelations.ts'
import { entityIdentity, taskEntityLinks } from '../src/planning/entityLinks.ts'

const task = (id, extra = {}) => ({ id, title: id, status: 'todo', priority: 'mid', ...extra })
const note = (id) => ({ id, title: `Note ${id}`, content: '# Written context' })
const canvas = (id, nodeId = 'shared') => ({ id, name: `Project ${id}`, nodes: [{ id: nodeId, title: `Node ${id}`, content: 'Visual context' }] })
const catalog = { notes: [note('n')], canvases: [canvas('a'), canvas('b')] }
const n = { kind: 'note', id: 'n' }, a = { kind: 'canvas-node', canvasId: 'a', id: 'shared' }

test('duplicate Canvas identities cannot manufacture an exact context even with distinct nodes', () => {
  const model = context.buildContextRelations([task('work', { entityLinks: [a] })], { notes: [], canvases: [canvas('a'), canvas('a', 'other')] })
  assert.equal(model.byTask.get('work')[0].state, 'ambiguous')
  assert.equal(model.byCanvas.size, 0)
})

test('typed context resolves exact project identity and derives immutable backlinks once', () => {
  const tasks = [task('work', { entityLinks: [n, a, n], linkedNoteId: 'n', linkedCanvasNodeId: 'shared' })]
  const before = structuredClone({ tasks, catalog })
  const model = context.buildContextRelations(tasks, catalog)
  assert.equal(model.byTask.get('work').length, 2)
  assert.equal(model.byTask.get('work')[1].canvasTitle, 'Project a')
  assert.deepEqual(model.byEntity.get(entityIdentity(n)).map(item => item.id), ['work'])
  assert.deepEqual(model.byCanvas.get('a').map(item => item.id), ['work'])
  assert.equal(model.byCanvas.has('b'), false)
  assert.deepEqual({ tasks, catalog }, before)
  assert.deepEqual(context.buildContextRelations(tasks, catalog), model)
})

test('missing and ambiguous links remain visible and never manufacture backlinks', () => {
  const tasks = [task('missing', { entityLinks: [{ kind: 'note', id: 'gone' }, { kind: 'canvas-node', canvasId: 'a', id: 'gone' }] }), task('ambiguous', { linkedCanvasNodeId: 'shared' }), task('old-missing', { linkedCanvasNodeId: 'gone' })]
  const model = context.buildContextRelations(tasks, catalog)
  assert.deepEqual(model.byTask.get('missing').map(link => link.state), ['missing', 'missing'])
  assert.equal(model.byTask.get('ambiguous')[0].state, 'ambiguous')
  assert.equal(model.byTask.get('ambiguous')[0].legacyId, 'shared')
  assert.equal(model.byTask.get('old-missing')[0].state, 'missing')
  assert.equal(model.byEntity.size, 0)
  assert.equal(tasks[1].linkedCanvasNodeId, 'shared')
})

test('unique legacy readers stay compatible and completed usage is deliberate', () => {
  const unique = { notes: catalog.notes, canvases: [canvas('a')] }
  const tasks = [task('z', { linkedNoteId: 'n', linkedCanvasNodeId: 'shared' }), task('a', { status: 'done', entityLinks: [n] })]
  const model = context.buildContextRelations(tasks, unique)
  assert.deepEqual(model.byTask.get('z').map(link => link.ref), taskEntityLinks(tasks[0], unique).map(link => link.ref))
  assert.deepEqual(model.byEntity.get(entityIdentity(n)).map(item => item.id), ['a', 'z'])
  assert.deepEqual(context.activeContextUsage(model.byEntity.get(entityIdentity(n))).map(item => item.id), ['z'])
  assert.deepEqual(context.activeContextUsage(undefined), [])
})

test('multiple nodes in one Canvas count each using Task only once; project duplicates stay ambiguous', () => {
  const sources = { notes: [note('n'), note('n')], canvases: [{ ...canvas('a'), nodes: [...canvas('a').nodes, { id: 'second', title: 'Second', content: '' }] }] }
  const model = context.buildContextRelations([task('t', { entityLinks: [n, a, { kind: 'canvas-node', canvasId: 'a', id: 'second' }] })], sources)
  assert.equal(model.byTask.get('t')[0].state, 'ambiguous')
  assert.equal(model.byCanvas.get('a').length, 1)
})

test('empty and failed projection are distinct and never repair source data', () => {
  assert.equal(context.readContextRelations([], { notes: [], canvases: [] }).model.byTask.size, 0)
  const invalid = { notes: null, canvases: [] }
  const before = structuredClone(invalid)
  const failed = context.readContextRelations([], invalid)
  assert.equal(failed.model, null)
  assert.ok(failed.error)
  assert.deepEqual(invalid, before)
  assert.equal(context.readContextRelations([], catalog).error, '')
})

test('hundreds of Tasks share one catalog index instead of rescanning content per backlink', () => {
  let contentReads = 0
  const notes = Array.from({ length: 500 }, (_, i) => ({ id: `${i}`, title: `Note ${i}`, get content() { contentReads++; return 'Context' } }))
  const tasks = Array.from({ length: 800 }, (_, i) => task(`${i}`, { entityLinks: [{ kind: 'note', id: `${i % 500}` }] }))
  const model = context.buildContextRelations(tasks, { notes, canvases: [] })
  assert.equal(model.byTask.size, 800)
  assert.equal(model.byEntity.size, 500)
  assert.ok(contentReads <= 500, `content evaluated ${contentReads} times`)
})
