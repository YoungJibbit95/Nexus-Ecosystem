import assert from 'node:assert/strict'
import test from 'node:test'
import {
  NOTES_UI_STATE_STORAGE_KEY,
  migrateStoredNotesUiState,
} from './privacyMigrations.js'

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

test('startup migration removes a legacy Notes search query', () => {
  const storage = createStorage({
    [NOTES_UI_STATE_STORAGE_KEY]: JSON.stringify({
      mode: 'split',
      sortBy: 'title',
      searchQuery: 'private customer name',
      unknownLegacyValue: 'discard me',
    }),
  })

  assert.equal(migrateStoredNotesUiState(storage), true)
  assert.deepEqual(JSON.parse(storage.getItem(NOTES_UI_STATE_STORAGE_KEY)), {
    mode: 'split',
    sortBy: 'title',
  })
})

test('startup migration removes malformed legacy state safely', () => {
  const storage = createStorage({ [NOTES_UI_STATE_STORAGE_KEY]: '{broken' })
  assert.equal(migrateStoredNotesUiState(storage), true)
  assert.equal(storage.getItem(NOTES_UI_STATE_STORAGE_KEY), null)
})

test('current Notes state is not rewritten', () => {
  const current = JSON.stringify({ mode: 'edit', focusMode: false })
  const storage = createStorage({ [NOTES_UI_STATE_STORAGE_KEY]: current })
  assert.equal(migrateStoredNotesUiState(storage), false)
  assert.equal(storage.getItem(NOTES_UI_STATE_STORAGE_KEY), current)
})
