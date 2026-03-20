import { MUTATION_ROLES, TAB_ACCESS } from '../constants.js'

export const normalizeCsvToken = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._\-:/]/g, '')
  .slice(0, 80)

export const parseBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

export const parseUrlSafe = (value) => {
  try {
    return new URL(String(value || ''))
  } catch {
    return null
  }
}

export const normalizeUrl = (value, fallback, options = {}) => {
  const allowEmpty = options.allowEmpty === true
  const raw = String(value || '').trim()
  if (!raw) return allowEmpty ? '' : fallback
  const parsed = parseUrlSafe(raw)
  if (!parsed) return allowEmpty ? '' : fallback
  if (!['http:', 'https:'].includes(parsed.protocol)) return allowEmpty ? '' : fallback
  if (parsed.username || parsed.password) return allowEmpty ? '' : fallback
  if (parsed.hash || parsed.search) return allowEmpty ? '' : fallback
  if (!parsed.hostname) return allowEmpty ? '' : fallback
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname
  const normalized = `${parsed.protocol}//${parsed.host}${pathname}`
  return normalized.replace(/\/$/, '')
}

export const normalizePath = (value, fallback) => {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return raw.startsWith('/') ? raw : `/${raw}`
}

export const parseCsvUnique = (value) => {
  const out = []
  for (const raw of String(value || '').split(',')) {
    const token = normalizeCsvToken(raw)
    if (!token || out.includes(token)) continue
    out.push(token)
  }
  return out
}

export const normalizeApiPath = (value) => {
  const path = String(value || '').trim()
  if (!path.startsWith('/')) {
    throw new Error('INVALID_API_PATH')
  }
  return path
}

export const isLoopbackHost = (host) => {
  const normalized = String(host || '').trim().toLowerCase()
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]'
}

export const roleAllowed = (tabId, role) => {
  const allowed = TAB_ACCESS[tabId] || []
  return allowed.includes(role)
}

export const isMutationRole = (role) => MUTATION_ROLES.includes(role)
