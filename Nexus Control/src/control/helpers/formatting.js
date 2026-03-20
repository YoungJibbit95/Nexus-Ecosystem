export const prettyJson = (value) => JSON.stringify(value, null, 2)

export const parseJsonOrThrow = (text, label) => {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} ist kein gueltiges JSON.`)
  }
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

export const csvFromList = (value) => (Array.isArray(value) ? value.join(',') : '')

export const parseRoleCsv = (csv) => String(csv || '')
  .split(',')
  .map((role) => role.trim())
  .filter(Boolean)
