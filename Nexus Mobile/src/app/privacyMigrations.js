export const NOTES_UI_STATE_STORAGE_KEY = 'nx-mobile-notes-ui-state-v1'

const SAFE_NOTES_UI_STATE_KEYS = [
  'mode',
  'sortBy',
  'tagFilter',
  'focusMode',
  'showSearch',
]

const isRecord = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/**
 * Removes the search text written by older Nexus releases while preserving
 * the non-sensitive Notes UI preferences that are still supported.
 */
export const migrateStoredNotesUiState = (storage) => {
  let raw
  try {
    raw = storage.getItem(NOTES_UI_STATE_STORAGE_KEY)
  } catch {
    return false
  }

  if (!raw) return false

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    try {
      storage.removeItem(NOTES_UI_STATE_STORAGE_KEY)
      return true
    } catch {
      return false
    }
  }

  if (!isRecord(parsed) || !Object.hasOwn(parsed, 'searchQuery')) return false

  const sanitized = {}
  for (const key of SAFE_NOTES_UI_STATE_KEYS) {
    if (Object.hasOwn(parsed, key)) sanitized[key] = parsed[key]
  }

  try {
    if (Object.keys(sanitized).length === 0) {
      storage.removeItem(NOTES_UI_STATE_STORAGE_KEY)
    } else {
      storage.setItem(NOTES_UI_STATE_STORAGE_KEY, JSON.stringify(sanitized))
    }
    return true
  } catch {
    return false
  }
}

export const runStartupPrivacyMigrations = () => {
  if (typeof window === 'undefined') return false
  return migrateStoredNotesUiState(window.localStorage)
}
