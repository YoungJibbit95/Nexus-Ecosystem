import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const sourcePath = fileURLToPath(new URL('./WelcomeWalkthrough.tsx', import.meta.url))
const source = readFileSync(sourcePath, 'utf8')
const stepsSource = source.match(/const STEPS: TourStep\[\] = \[([\s\S]*?)\n\];\n\nconst clampIndex/)?.[1] || ''
const stepIds = [...stepsSource.matchAll(/^  \{\r?\n    id: "([^"]+)"/gm)].map((match) => match[1])

test('guided walkthrough exposes exactly 14 unique interactive chapters', () => {
  assert.deepEqual(stepIds, [
    'welcome',
    'account-setup',
    'dashboard',
    'calendar',
    'notes',
    'tasks',
    'reminders',
    'files',
    'canvas',
    'flux',
    'code',
    'settings',
    'info',
    'finish',
  ])
  assert.equal(new Set(stepIds).size, 14)
  assert.equal((stepsSource.match(/\n    view: "/g) || []).length, 14)
})

test('walkthrough view actions remain entitlement-gated, resumable, and non-mutating', () => {
  assert.match(source, /const canOpenStep = Boolean\(step\.view && \(availableViews\.length === 0 \|\| availableSet\.has\(step\.view\)\)\)/)
  assert.match(source, /const startExploring = \(view: View\) => \{[\s\S]*?onOpenView\(view\)[\s\S]*?setExploring\(view\)/)
  assert.match(source, /Deine Arbeitsdaten werden vom Rundgang nicht verändert/)
  assert.match(source, /TOUR_STORAGE_KEY[\s\S]*?writeProgress/)
})
