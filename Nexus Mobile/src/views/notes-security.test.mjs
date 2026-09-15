import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('./NotesView.tsx', import.meta.url)), 'utf8')

test('Notes keeps user search text session-only', () => {
  const persistenceEffect = source.match(/useEffect\(\(\) => \{\s*const payload = \{([\s\S]*?)\r?\n    \}\s*try \{\s*window\.localStorage\.setItem\(NOTES_UI_STATE_STORAGE_KEY/)?.[1] || ''
  assert.ok(persistenceEffect, 'Notes UI persistence effect must remain detectable')
  assert.doesNotMatch(persistenceEffect, /searchQuery/)
  assert.doesNotMatch(source, /setSearchQuery\(parsed\.searchQuery\)/)
})
