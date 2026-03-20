export const createStatusCore = ({ el }) => {
  const setStatus = (message, tone = 'info') => {
    el.status.textContent = message
    el.status.classList.remove('is-error', 'is-success')
    if (tone === 'error') el.status.classList.add('is-error')
    if (tone === 'success') el.status.classList.add('is-success')
  }

  const setBootstrapInfo = (message) => {
    if (!el.bootstrapInfo) return
    el.bootstrapInfo.textContent = message
  }

  return {
    setStatus,
    setBootstrapInfo,
  }
}
