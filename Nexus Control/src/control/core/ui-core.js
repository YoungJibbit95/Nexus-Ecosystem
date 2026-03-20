import { MUTATION_ROLES } from '../constants.js'
import { roleAllowed } from '../helpers.js'

export const createUiCore = ({ state, el, apiRequest, getCapabilities, getRole, updateApiUrlInputLock }) => {
  const activateTab = (tabId) => {
    for (const tab of el.tabs) {
      const active = tab.dataset.tab === tabId
      tab.classList.toggle('active', active)
      tab.setAttribute('aria-selected', String(active))
    }

    for (const panel of el.panels) {
      const active = panel.id === `tab-${tabId}`
      panel.classList.toggle('active', active)
      panel.setAttribute('aria-hidden', String(!active))
    }
  }

  const applyRoleAccessControl = () => {
    const role = getRole()
    const allowedTabs = el.tabs
      .map((tab) => tab.dataset.tab)
      .filter((tabId) => roleAllowed(tabId, role))

    for (const tab of el.tabs) {
      const allowed = roleAllowed(tab.dataset.tab, role)
      tab.classList.toggle('hidden', !allowed)
      tab.disabled = !allowed
    }

    for (const panel of el.panels) {
      const tabId = panel.id.replace(/^tab-/, '')
      panel.classList.toggle('hidden', !roleAllowed(tabId, role))
    }

    const activeTab = el.tabs.find((tab) => tab.classList.contains('active'))
    const activeTabId = activeTab?.dataset.tab || ''
    if (!allowedTabs.includes(activeTabId) && allowedTabs.length > 0) {
      activateTab(allowedTabs[0])
    }
  }

  const updateSessionUi = () => {
    const session = state.session
    if (!session) {
      el.roleBadge.textContent = 'nicht eingeloggt'
      el.roleBadge.className = 'chip stale'
      el.sessionCapabilities.textContent = 'Readonly bis Login.'
      return
    }

    const role = session.role || 'unknown'
    const caps = getCapabilities()
    const canMutate = caps.canMutate === true
    const requiresSignature = caps.mutationSignatureRequired === true && MUTATION_ROLES.includes(role)
    const hasSignatureSecret = Boolean(state.signingSecret.trim())
    const signatureReady = !requiresSignature || hasSignatureSecret
    const mutationReady = canMutate && signatureReady
    const isAdmin = role === 'admin'
    const adminMutationReady = mutationReady && isAdmin

    el.roleBadge.textContent = `${session.username} (${role})`
    el.roleBadge.className = `chip ${canMutate ? 'live' : 'stale'}`

    const statusParts = []
    statusParts.push(canMutate ? 'Mutation erlaubt' : 'Mutation blockiert')
    if (requiresSignature) {
      statusParts.push(hasSignatureSecret ? 'Signatur aktiv' : 'Signatur-Key fehlt')
    } else {
      statusParts.push('Signatur nicht erforderlich')
    }
    el.sessionCapabilities.textContent = statusParts.join(' | ')

    el.globalConfig.readOnly = !mutationReady
    el.appConfig.readOnly = !mutationReady
    el.policiesConfig.readOnly = !adminMutationReady
    el.commandPayload.readOnly = !mutationReady
    el.v2FeatureCatalog.readOnly = !adminMutationReady
    el.v2LayoutSchema.readOnly = !adminMutationReady

    el.saveGlobalConfigBtn.disabled = !mutationReady
    el.saveAppConfigBtn.disabled = !mutationReady
    el.commandSubmitBtn.disabled = !mutationReady
    el.savePoliciesBtn.disabled = !adminMutationReady
    el.savePaywallsBtn.disabled = !adminMutationReady
    el.deviceApproveBtn.disabled = !adminMutationReady
    el.deviceRevokeBtn.disabled = !adminMutationReady
    el.v2SaveCatalogBtn.disabled = !adminMutationReady
    el.v2SaveLayoutBtn.disabled = !adminMutationReady
    el.v2PromoteReleaseBtn.disabled = !adminMutationReady
    el.v2ValidateLayoutBtn.disabled = !mutationReady

    const paywallFields = [
      el.paywallEnabled,
      el.paywallDefaultTier,
      el.paywallFreeMain,
      el.paywallPaidMain,
      el.paywallFreeMobile,
      el.paywallPaidMobile,
      el.paywallFreeCode,
      el.paywallPaidCode,
      el.paywallFreeCodeMobile,
      el.paywallPaidCodeMobile,
      el.paywallUsersFree,
      el.paywallUsersPaid,
    ]

    for (const field of paywallFields) {
      field.disabled = !adminMutationReady
    }
  }

  const setLoggedInState = (loggedIn) => {
    el.authPanel.classList.toggle('hidden', loggedIn)
    el.workspace.classList.toggle('hidden', !loggedIn)
    applyRoleAccessControl()
    updateSessionUi()
  }

  const initApiSettingsUi = () => {
    el.apiBaseUrl.value = state.baseUrl
    el.apiIngestKey.value = state.ingestKey
    el.deviceIdInput.value = state.deviceId
    el.signingSecretInput.value = state.signingSecret

    if (!el.deviceManageId.value) {
      el.deviceManageId.value = state.deviceId
    }

    if (typeof updateApiUrlInputLock === 'function') {
      updateApiUrlInputLock()
    }
  }

  const ensureSession = async () => {
    if (!state.token) return false

    try {
      const res = await apiRequest('/api/v1/session')
      state.session = res.session
      setLoggedInState(true)
      return true
    } catch {
      state.token = ''
      state.session = null
      setLoggedInState(false)
      return false
    }
  }

  return {
    activateTab,
    applyRoleAccessControl,
    ensureSession,
    initApiSettingsUi,
    setLoggedInState,
    updateSessionUi,
  }
}
