import assert from 'node:assert/strict'
import test from 'node:test'

const { parseCaptureIntentFromQuery } = await import('../src/quickCapture.ts')

test('quick capture preserves supported prefixes and title normalization', () => {
  assert.deepEqual(parseCaptureIntentFromQuery('  NOTE :  Release checklist  '), {
    type: 'note',
    title: 'Release checklist',
    targetView: 'notes',
  })
  assert.deepEqual(parseCaptureIntentFromQuery('rem:'), {
    type: 'reminder',
    title: undefined,
    targetView: 'reminders',
  })
  assert.equal(parseCaptureIntentFromQuery('unknown: value'), null)
})

test('quick capture rejects multiline ambiguity without regex backtracking', () => {
  assert.equal(parseCaptureIntentFromQuery(`rem:${' '.repeat(200_000)}\nnot-a-title`), null)
  assert.equal(parseCaptureIntentFromQuery('task: first\u2028second'), null)
  assert.equal(parseCaptureIntentFromQuery('task: first\u2029second'), null)
})
