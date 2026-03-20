import { escapeHtml, formatDateTime } from '../helpers.js'

export const renderAppsTable = (el, items) => {
  if (!Array.isArray(items) || items.length === 0) {
    el.appsTableBody.innerHTML = '<tr><td colspan="7">Keine Daten vorhanden.</td></tr>'
    return
  }

  const rows = items.map((item) => {
    const stale = item.stale ? 'ja' : 'nein'
    const statusClass = item.stale ? 'chip stale' : 'chip live'
    return `
      <tr>
        <td>${escapeHtml(item.appId || '-')}</td>
        <td><span class="${statusClass}">${escapeHtml(item.status || 'unknown')}</span></td>
        <td>${escapeHtml(item.appVersion || '-')}</td>
        <td>${escapeHtml(item.lastSeenAt ? formatDateTime(item.lastSeenAt) : '-')}</td>
        <td>${escapeHtml(item.lastNavigation || '-')}</td>
        <td>${item.eventCount ?? 0}</td>
        <td>${escapeHtml(stale)}</td>
      </tr>
    `
  })

  el.appsTableBody.innerHTML = rows.join('')
}
