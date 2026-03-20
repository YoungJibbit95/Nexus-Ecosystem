export const bindTabEvents = ({ el, activateTab }) => {
  for (const tab of el.tabs) {
    tab.addEventListener('click', () => {
      if (tab.disabled) return
      activateTab(tab.dataset.tab)
    })

    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
      const visibleTabs = el.tabs.filter((candidate) => !candidate.classList.contains('hidden'))
      if (visibleTabs.length === 0) return

      const currentIndex = visibleTabs.indexOf(tab)
      if (currentIndex < 0) return

      const nextIndex = event.key === 'ArrowRight'
        ? (currentIndex + 1) % visibleTabs.length
        : (currentIndex - 1 + visibleTabs.length) % visibleTabs.length

      const nextTab = visibleTabs[nextIndex]
      if (!nextTab) return

      activateTab(nextTab.dataset.tab)
      nextTab.focus()
      event.preventDefault()
    })
  }
}
