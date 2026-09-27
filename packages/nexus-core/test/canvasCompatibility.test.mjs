import test from 'node:test'
import assert from 'node:assert/strict'
import { projectPlanningForMain, projectPlanningForMobile, applyMainPlanningPatch } from '../src/canvas/planningCompatibility.ts'

test('Mobile planning statuses and fields survive Main display projection and roundtrip', () => {
  for (const status of ['idea', 'backlog', 'todo', 'doing', 'review', 'done', 'blocked']) {
    const pm = { status, priority: 'critical', owner: 'team', estimate: 8, milestone: 'M2', blockedReason: 'external', tags: ['keep'], future: { retained: true } }
    const mobile = { id: 'node', pm, futureNodeData: ['keep'] }
    const main = projectPlanningForMain(mobile)
    assert.equal(main.effort, 8)
    assert.equal(main.status, status === 'review' ? 'doing' : ['idea', 'backlog'].includes(status) ? 'todo' : status)
    assert.deepEqual(projectPlanningForMobile(main).pm, pm)
    assert.deepEqual(projectPlanningForMobile(main).futureNodeData, ['keep'])
  }
})
test('Main-only planning fields survive Mobile, while explicit Main edits supersede the mapped field', () => {
  const main = { id: 'n', status: 'blocked', priority: 'high', effort: 4, lane: 'Sprint', icon: 'flag' }
  const mobile = projectPlanningForMobile(main)
  assert.equal(mobile.pm.estimate, 4)
  const edited = applyMainPlanningPatch(projectPlanningForMain({ ...mobile, pm: { ...mobile.pm, status: 'review', milestone: 'M2' } }), { title: 'unrelated' })
  assert.equal(edited.pm.status, 'review')
  const changed = applyMainPlanningPatch(edited, { status: 'done', effort: 9 })
  assert.equal(changed.pm.status, 'done')
  assert.equal(changed.pm.estimate, 9)
  assert.equal(changed.pm.milestone, 'M2')
  assert.equal(changed.lane, 'Sprint')
  assert.equal(changed.icon, 'flag')
})
