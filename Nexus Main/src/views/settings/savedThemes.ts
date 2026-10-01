import { useSyncExternalStore } from 'react'
import { safeJsonParse, safeStorageGet, safeStorageSet } from '@nexus/core/settings'
import type { Theme } from '../../store/themeStore'
import { buildThemeTransferPayload, parseThemeTransferPayload, type ThemeTransferPayload } from './themeTransfer'

export const SAVED_THEMES_KEY = 'nx-saved-themes-v1'
export type SavedTheme = { id: string; name: string; payload: Partial<ThemeTransferPayload> }
const themeId = (name: string) => name.normalize('NFKC').trim().toLowerCase()
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

function readThemes(): SavedTheme[] {
  const document = safeJsonParse<unknown>(safeStorageGet(SAVED_THEMES_KEY), null)
  const themes: SavedTheme[] = []
  if (isRecord(document) && document.version === 1 && Array.isArray(document.themes)) {
    for (const entry of document.themes) {
      if (!isRecord(entry) || typeof entry.name !== 'string' || !entry.name.trim()) continue
      const parsed = parseThemeTransferPayload(entry.payload)
      if (parsed.ok) themes.push({ id: themeId(entry.name), name: entry.name.trim(), payload: parsed.payload })
    }
  }
  // Earlier saves were standalone transfer files with no library index.
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index)
      if (!key?.startsWith('nx-theme-')) continue
      const raw = safeJsonParse<unknown>(safeStorageGet(key), null)
      if (!isRecord(raw) || (raw.version !== 'v5' && raw.version !== 'v6')) continue
      const name = key.slice('nx-theme-'.length).trim(), id = themeId(name)
      const parsed = parseThemeTransferPayload(raw)
      if (name && parsed.ok && !themes.some(theme => theme.id === id)) themes.push({ id, name, payload: parsed.payload })
    }
  } catch { /* The save action reports unavailable storage. */ }
  return themes
}

let themes = readThemes()
const listeners = new Set<() => void>()
const refresh = () => { themes = readThemes(); listeners.forEach(listener => listener()) }
const onStorage = (event: StorageEvent) => {
  if (event.key === null || event.key === SAVED_THEMES_KEY || event.key.startsWith('nx-theme-')) refresh()
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  if (listeners.size === 1) window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', onStorage) }
}
export const useSavedThemes = () => useSyncExternalStore(subscribe, () => themes)

export function saveTheme(name: string, theme: Theme): boolean {
  name = name.trim()
  if (!name) return false
  const existing = safeJsonParse<unknown>(safeStorageGet(SAVED_THEMES_KEY), null)
  if (existing !== null && (!isRecord(existing) || existing.version !== 1 || !Array.isArray(existing.themes))) return false
  const id = themeId(name)
  const entry: SavedTheme = { id, name, payload: buildThemeTransferPayload(theme) }
  const next = [entry, ...readThemes().filter(item => item.id !== id)]
  if (!safeStorageSet(SAVED_THEMES_KEY, JSON.stringify({ version: 1, themes: next }))) return false
  refresh()
  return true
}
