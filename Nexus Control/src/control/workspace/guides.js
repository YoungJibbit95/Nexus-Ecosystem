import { escapeHtml } from '../helpers.js'

export const createGuideActions = ({ el, apiRequest }) => {
  const loadGuide = async (guideId) => {
    if (!guideId) {
      el.guideContent.textContent = 'Kein Guide ausgewaehlt.'
      return
    }

    const res = await apiRequest(`/api/v1/guides/${encodeURIComponent(guideId)}`)
    el.guideContent.textContent = res.item?.content || 'Guide ohne Inhalt.'
  }

  const loadGuides = async () => {
    const res = await apiRequest('/api/v1/guides')
    const items = res.items || []

    el.guideSelect.innerHTML = items
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`)
      .join('')

    if (items.length > 0) {
      await loadGuide(items[0].id)
    } else {
      el.guideContent.textContent = 'Keine Guides vorhanden.'
    }
  }

  return {
    loadGuide,
    loadGuides,
  }
}
