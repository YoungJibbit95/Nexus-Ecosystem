import { DEFAULT_API_URL } from '../constants.js'
import { isLoopbackHost, normalizeUrl, parseErrorMessage } from '../helpers.js'

export const bindSessionEvents = ({
  state,
  el,
  core,
  workspace,
  persistApiSettings,
  persistToken,
  ensureSession,
}) => {
  const {
    apiRequest,
    assertHostedLoginApiSafety,
    runBootstrapHandshake,
    setLoggedInState,
    setStatus,
    updateApiUrlInputLock,
    updateSessionUi,
  } = core

  el.apiSettingsForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const requestedBaseUrlRaw = el.apiBaseUrl.value.trim()
    const normalizedRequestedBaseUrl = normalizeUrl(requestedBaseUrlRaw, '', { allowEmpty: true })
    if (requestedBaseUrlRaw && !normalizedRequestedBaseUrl) {
      setStatus('API URL ist ungueltig. Erlaubt sind nur http/https ohne Query/Hash.', 'error')
      return
    }

    const pageHost = String(globalThis.location?.hostname || '').trim().toLowerCase()
    const localUi = !pageHost || isLoopbackHost(pageHost)
    const defaultFallback = localUi ? DEFAULT_API_URL : ''
    const fallbackBaseUrl = normalizeUrl(
      state.runtimeConfig.controlApiUrl || state.baseUrl || defaultFallback,
      defaultFallback,
      { allowEmpty: true },
    )

    state.baseUrl = state.runtimeConfig.forceApiUrl
      ? state.runtimeConfig.controlApiUrl
      : (normalizedRequestedBaseUrl || fallbackBaseUrl)

    if (!state.baseUrl) {
      setStatus('API URL fehlt. Bitte eine gueltige URL eintragen.', 'error')
      return
    }

    state.ingestKey = el.apiIngestKey.value.trim()
    state.signingSecret = el.signingSecretInput.value.trim()

    el.apiBaseUrl.value = state.baseUrl
    persistApiSettings(state)
    updateSessionUi()
    updateApiUrlInputLock()

    setStatus('API Einstellungen gespeichert.', 'success')
    await runBootstrapHandshake({ force: true })

    if (state.token) {
      const valid = await ensureSession()
      if (valid) {
        await workspace.refreshWorkspace()
      }
    }
  })

  el.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault()

    const nowTs = Date.now()
    if (nowTs < state.loginLockedUntil) {
      const waitSec = Math.max(1, Math.ceil((state.loginLockedUntil - nowTs) / 1000))
      setStatus(`Login temporaer gesperrt. Bitte in ${waitSec}s erneut versuchen.`, 'error')
      return
    }

    setStatus('Login laeuft...')
    const submitBtn = el.loginForm.querySelector('button[type="submit"]')
    if (submitBtn) submitBtn.disabled = true
    el.loginUsername.readOnly = true
    el.loginPassword.readOnly = true

    try {
      assertHostedLoginApiSafety()

      const handshakeOk = await runBootstrapHandshake({ force: true })
      if (!handshakeOk) {
        throw new Error('API_BOOTSTRAP_FAILED')
      }

      const payload = {
        username: el.loginUsername.value.trim(),
        password: el.loginPassword.value,
      }

      const res = await apiRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: payload,
      })

      state.token = res.token
      persistToken(state)

      const valid = await ensureSession()
      if (!valid) {
        throw new Error('Session konnte nicht verifiziert werden.')
      }

      await workspace.refreshWorkspace()
      await runBootstrapHandshake({ force: true })
      state.loginFailureCount = 0
      state.loginLockedUntil = 0
      setStatus(`Eingeloggt als ${state.session.username} (${state.session.role})`, 'success')
    } catch (error) {
      state.loginFailureCount += 1
      const lockThreshold = 5
      if (state.loginFailureCount >= lockThreshold) {
        const lockWindowMs = Math.min(120_000, 30_000 + ((state.loginFailureCount - lockThreshold) * 15_000))
        state.loginLockedUntil = Date.now() + lockWindowMs
      }

      el.loginPassword.value = ''
      setStatus(`Login fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
    } finally {
      if (submitBtn) submitBtn.disabled = false
      el.loginUsername.readOnly = false
      el.loginPassword.readOnly = false
    }
  })

  el.logoutBtn.addEventListener('click', async () => {
    if (!state.token) return

    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch {
      // noop
    }

    state.token = ''
    state.session = null
    state.signingSecret = ''
    el.signingSecretInput.value = ''
    persistApiSettings(state)
    persistToken(state)
    setLoggedInState(false)
    setStatus('Ausgeloggt.', 'success')
  })

  el.refreshBtn.addEventListener('click', async () => {
    if (!state.token) {
      await runBootstrapHandshake({ force: true })
      setStatus('Bitte zuerst einloggen.', 'error')
      return
    }

    try {
      await workspace.refreshWorkspace()
      await runBootstrapHandshake({ force: true })
    } catch (error) {
      setStatus(`Aktualisierung fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
    }
  })
}
