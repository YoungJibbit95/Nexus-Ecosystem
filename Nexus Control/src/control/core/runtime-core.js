import { DEFAULT_RUNTIME_CONFIG, RUNTIME_CONFIG_PATH } from '../constants.js'
import {
  isLoopbackHost,
  normalizePath,
  normalizeUrl,
  parseBool,
  parseErrorMessage,
  parseUrlSafe,
} from '../helpers.js'

export const createRuntimeCore = ({ state, el, setBootstrapInfo, apiRequest }) => {
  const handshakeCache = {
    at: 0,
    ok: false,
    message: '',
  }
  const HANDSHAKE_CACHE_MS = 2_500

  const normalizeRuntimeConfig = (raw) => ({
    controlApiUrl: raw?.controlApiUrl == null
      ? DEFAULT_RUNTIME_CONFIG.controlApiUrl
      : normalizeUrl(raw?.controlApiUrl, DEFAULT_RUNTIME_CONFIG.controlApiUrl, { allowEmpty: true }),
    bootstrapPath: normalizePath(raw?.bootstrapPath, DEFAULT_RUNTIME_CONFIG.bootstrapPath),
    privateRepoHint: String(raw?.privateRepoHint || '').trim(),
    forceApiUrl: parseBool(raw?.forceApiUrl, DEFAULT_RUNTIME_CONFIG.forceApiUrl),
  })

  const applyRuntimeApiSettings = () => {
    if (state.runtimeConfig.forceApiUrl || !state.hasStoredBaseUrl) {
      state.baseUrl = state.runtimeConfig.controlApiUrl
    }
  }

  const updateApiUrlInputLock = () => {
    const locked = state.runtimeConfig.forceApiUrl === true
    el.apiBaseUrl.readOnly = locked
    el.apiBaseUrl.title = locked ? 'API URL ist per runtime-config fest vorgegeben.' : ''
  }

  const loadRuntimeConfig = async () => {
    try {
      const response = await fetch(RUNTIME_CONFIG_PATH, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`runtime-config nicht verfuegbar (${response.status})`)
      }

      const payload = await response.json()
      state.runtimeConfig = normalizeRuntimeConfig(payload)
    } catch {
      state.runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG }
    }

    state.runtimeConfigLoaded = true
    applyRuntimeApiSettings()
  }

  const runBootstrapHandshake = async (options = {}) => {
    const force = options.force === true
    if (!force && handshakeCache.at > 0 && (Date.now() - handshakeCache.at) <= HANDSHAKE_CACHE_MS) {
      if (handshakeCache.message) {
        setBootstrapInfo(handshakeCache.message)
      }
      return handshakeCache.ok
    }

    const path = state.runtimeConfig.bootstrapPath || DEFAULT_RUNTIME_CONFIG.bootstrapPath
    const baseUrl = String(state.baseUrl || '').trim()

    if (!baseUrl) {
      const message = 'Backend Handshake: keine API URL gesetzt. Bitte API URL konfigurieren.'
      setBootstrapInfo(message)
      handshakeCache.at = Date.now()
      handshakeCache.ok = false
      handshakeCache.message = message
      return false
    }

    setBootstrapInfo('Backend Handshake: pruefe...')

    try {
      const res = await apiRequest(path, { auth: false })
      const item = res?.item || {}
      const service = item.service || 'nexus-control-plane'
      const version = item.version || '1.0.0'
      const repoHint = item.privateRepoHint || state.runtimeConfig.privateRepoHint
      const lockState = item.ownerLockEnabled === true ? 'owner-lock aktiv' : 'owner-lock aus'
      const originState = item.originTrusted === false ? 'origin nicht trusted' : 'origin trusted'
      const details = [`${service} v${version}`]
      if (repoHint) details.push(repoHint)
      details.push(lockState, originState)
      const message = `Backend Handshake: ok | ${details.join(' | ')}`
      setBootstrapInfo(message)
      handshakeCache.at = Date.now()
      handshakeCache.ok = true
      handshakeCache.message = message
      return true
    } catch (error) {
      const message = `Backend Handshake: Fehler (${parseErrorMessage(error)})`
      setBootstrapInfo(message)
      handshakeCache.at = Date.now()
      handshakeCache.ok = false
      handshakeCache.message = message
      return false
    }
  }

  const assertHostedLoginApiSafety = () => {
    const pageHost = String(globalThis.location?.hostname || '').trim().toLowerCase()
    const pageProtocol = String(globalThis.location?.protocol || '').trim().toLowerCase()
    const hostedUi = Boolean(pageHost) && !isLoopbackHost(pageHost)
    if (!hostedUi) return

    const parsedBase = parseUrlSafe(state.baseUrl)
    if (!parsedBase) {
      const error = new Error('INVALID_API_URL')
      error.nexusCode = 'INVALID_API_URL'
      error.nexusMessage = 'API URL ist ungueltig.'
      error.nexusHint = 'Setze eine gueltige HTTPS API URL in den API Einstellungen.'
      throw error
    }

    if (isLoopbackHost(parsedBase.hostname)) {
      const error = new Error('LOOPBACK_URL_ON_HOSTED_UI')
      error.nexusCode = 'LOOPBACK_URL_ON_HOSTED_UI'
      error.nexusMessage = 'Loopback-API URL ist auf gehosteter UI nicht erreichbar.'
      error.nexusHint = 'Setze NEXUS_CONTROL_PUBLIC_API_URL auf eine oeffentliche HTTPS API URL und deploye die Pages neu.'
      throw error
    }

    if (pageProtocol === 'https:' && parsedBase.protocol === 'http:') {
      const error = new Error('MIXED_CONTENT_BLOCKED')
      error.nexusCode = 'MIXED_CONTENT_BLOCKED'
      error.nexusMessage = 'Mixed Content: HTTPS UI darf nicht gegen HTTP API loggen.'
      error.nexusHint = 'Nutze eine HTTPS API URL und fuege den Pages-Origin in trustedOrigins hinzu.'
      throw error
    }
  }

  return {
    loadRuntimeConfig,
    runBootstrapHandshake,
    assertHostedLoginApiSafety,
    updateApiUrlInputLock,
  }
}
