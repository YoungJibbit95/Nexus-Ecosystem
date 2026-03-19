const STORAGE_KEYS = {
  baseUrl: 'nexus.control.baseUrl',
  ingestKey: 'nexus.control.ingestKey',
  token: 'nexus.control.token',
  deviceId: 'nexus.control.deviceId',
}
const SESSION_KEYS = {
  signingSecret: 'nexus.control.signingSecret',
}

const DEFAULT_API_URL = 'http://localhost:4399'
const RUNTIME_CONFIG_PATH = './runtime-config.json'
const DEFAULT_RUNTIME_CONFIG = {
  controlApiUrl: DEFAULT_API_URL,
  bootstrapPath: '/api/v1/public/bootstrap',
  privateRepoHint: 'YoungJibbit95/NexusAPI',
  forceApiUrl: false,
}
const ALL_ROLES = ['admin', 'developer', 'viewer', 'agent']
const MUTATION_ROLES = ['admin', 'developer']
const PAYWALL_APP_IDS = ['main', 'mobile', 'code', 'code-mobile']
const TAB_ACCESS = {
  dashboard: ['admin', 'developer', 'viewer', 'agent'],
  build: ['admin', 'developer', 'viewer'],
  settings: ['admin', 'developer', 'viewer'],
  commands: ['admin', 'developer', 'viewer', 'agent'],
  policies: ['admin'],
  paywalls: ['admin'],
  devices: ['admin'],
  audit: ['admin', 'developer', 'viewer'],
  guides: ['admin', 'developer', 'viewer', 'agent'],
}

const encoder = new TextEncoder()
const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
const createDeviceId = () => {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `nxdev-${suffix}`
}

const hasStoredBaseUrl = localStorage.getItem(STORAGE_KEYS.baseUrl) != null

const state = {
  baseUrl: localStorage.getItem(STORAGE_KEYS.baseUrl) || DEFAULT_API_URL,
  ingestKey: localStorage.getItem(STORAGE_KEYS.ingestKey) || '',
  token: localStorage.getItem(STORAGE_KEYS.token) || '',
  deviceId: localStorage.getItem(STORAGE_KEYS.deviceId) || createDeviceId(),
  signingSecret: sessionStorage.getItem(SESSION_KEYS.signingSecret) || '',
  session: null,
  policies: null,
  runtimeConfig: { ...DEFAULT_RUNTIME_CONFIG },
  runtimeConfigLoaded: false,
}

const el = {
  status: document.getElementById('status-line'),
  bootstrapInfo: document.getElementById('bootstrap-info'),
  apiBaseUrl: document.getElementById('api-base-url'),
  apiIngestKey: document.getElementById('api-ingest-key'),
  deviceIdInput: document.getElementById('device-id'),
  signingSecretInput: document.getElementById('mutation-signing-secret'),
  apiSettingsForm: document.getElementById('api-settings-form'),
  loginForm: document.getElementById('login-form'),
  loginUsername: document.getElementById('login-username'),
  loginPassword: document.getElementById('login-password'),
  logoutBtn: document.getElementById('logout-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  authPanel: document.getElementById('auth-panel'),
  workspace: document.getElementById('workspace'),
  tabs: [...document.querySelectorAll('.tab')],
  panels: [...document.querySelectorAll('.tab-panel')],
  roleBadge: document.getElementById('session-role-badge'),
  sessionCapabilities: document.getElementById('session-capabilities'),
  appsTableBody: document.getElementById('apps-table-body'),
  metricOnline: document.getElementById('metric-online'),
  metricStale: document.getElementById('metric-stale'),
  metricEvents: document.getElementById('metric-events'),
  metricRender: document.getElementById('metric-render'),
  globalConfig: document.getElementById('global-config'),
  appConfigSelect: document.getElementById('app-config-select'),
  appConfig: document.getElementById('app-config'),
  saveGlobalConfigBtn: document.getElementById('save-global-config'),
  saveAppConfigBtn: document.getElementById('save-app-config'),
  loadAppConfigBtn: document.getElementById('load-app-config'),
  commandForm: document.getElementById('command-form'),
  commandTarget: document.getElementById('command-target'),
  commandType: document.getElementById('command-type'),
  commandPriority: document.getElementById('command-priority'),
  commandTtl: document.getElementById('command-ttl'),
  commandPayload: document.getElementById('command-payload'),
  commandIdempotency: document.getElementById('command-idempotency'),
  commandSubmitBtn: document.getElementById('command-submit-btn'),
  commandsList: document.getElementById('commands-list'),
  policiesConfig: document.getElementById('policies-config'),
  savePoliciesBtn: document.getElementById('save-policies'),
  paywallEnabled: document.getElementById('paywall-enabled'),
  paywallDefaultTier: document.getElementById('paywall-default-tier'),
  paywallFreeMain: document.getElementById('paywall-free-main'),
  paywallPaidMain: document.getElementById('paywall-paid-main'),
  paywallFreeMobile: document.getElementById('paywall-free-mobile'),
  paywallPaidMobile: document.getElementById('paywall-paid-mobile'),
  paywallFreeCode: document.getElementById('paywall-free-code'),
  paywallPaidCode: document.getElementById('paywall-paid-code'),
  paywallFreeCodeMobile: document.getElementById('paywall-free-code-mobile'),
  paywallPaidCodeMobile: document.getElementById('paywall-paid-code-mobile'),
  paywallUsersFree: document.getElementById('paywall-users-free'),
  paywallUsersPaid: document.getElementById('paywall-users-paid'),
  savePaywallsBtn: document.getElementById('save-paywalls'),
  deviceForm: document.getElementById('device-form'),
  deviceManageId: document.getElementById('device-manage-id'),
  deviceManageLabel: document.getElementById('device-manage-label'),
  deviceManageRoles: document.getElementById('device-manage-roles'),
  deviceApproveBtn: document.getElementById('device-approve-btn'),
  deviceRevokeBtn: document.getElementById('device-revoke-btn'),
  deviceRefreshBtn: document.getElementById('device-refresh-btn'),
  devicesList: document.getElementById('devices-list'),
  auditList: document.getElementById('audit-list'),
  guideSelect: document.getElementById('guide-select'),
  loadGuideBtn: document.getElementById('load-guide'),
  guideContent: document.getElementById('guide-content'),
  buildManifest: document.getElementById('build-manifest'),
  buildManifestRefresh: document.getElementById('build-manifest-refresh'),
}

const setStatus = (message, tone = 'info') => {
  el.status.textContent = message
  el.status.classList.remove('is-error', 'is-success')
  if (tone === 'error') el.status.classList.add('is-error')
  if (tone === 'success') el.status.classList.add('is-success')
}

const prettyJson = (value) => JSON.stringify(value, null, 2)

const parseJsonOrThrow = (text, label) => {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${label} ist kein gueltiges JSON.`)
  }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const normalizeCsvToken = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9._\-:/]/g, '')
  .slice(0, 80)

const parseBool = (value, fallback = false) => {
  if (value == null || value === '') return fallback
  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

const normalizeUrl = (value, fallback) => {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return raw.replace(/\/$/, '')
}

const normalizePath = (value, fallback) => {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return raw.startsWith('/') ? raw : `/${raw}`
}

const parseCsvUnique = (value) => {
  const out = []
  for (const raw of String(value || '').split(',')) {
    const token = normalizeCsvToken(raw)
    if (!token || out.includes(token)) continue
    out.push(token)
  }
  return out
}

const csvFromList = (value) => (Array.isArray(value) ? value.join(',') : '')

const roleAllowed = (tabId, role) => {
  const allowed = TAB_ACCESS[tabId] || []
  return allowed.includes(role)
}

const getRole = () => state.session?.role || ''
const getCapabilities = () => state.session?.capabilities || {}
const isMutationRole = (role) => MUTATION_ROLES.includes(role)

const parseErrorMessage = (error) => {
  if (!error) return 'Unbekannter Fehler'
  const message = String(error.message || error)
  if (message.includes('SIGNING_KEY_NOT_CONFIGURED')) {
    return `${message}. Hinterlege im Control UI ein Mutation Signing Secret und setze am Server NEXUS_MUTATION_SIGNING_SECRETS.`
  }
  if (message.includes('SIGNING_SECRET_MISSING')) {
    return 'Mutation Signing Secret fehlt. Bitte im API-Bereich setzen und speichern.'
  }
  if (message.includes('INVALID_MUTATION_SIGNATURE')) {
    return `${message}. Signatur stimmt nicht mit dem Server-Secret ueberein.`
  }
  if (message.includes('SIGNATURE_REPLAY_DETECTED')) {
    return `${message}. Request wurde als Replay erkannt, bitte erneut senden.`
  }
  if (message.includes('CONTROL_PANEL_OWNER_ONLY')) {
    return 'Dieses Control Panel ist auf Owner-Accounts beschraenkt.'
  }
  return message
}

const sha256Hex = async (value) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto nicht verfuegbar. Signierte Mutationen sind in diesem Browser nicht moeglich.')
  }
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return toHex(digest)
}

const hmacSha256Hex = async (secret, value) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto nicht verfuegbar. Signierte Mutationen sind in diesem Browser nicht moeglich.')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return toHex(signature)
}

const createMutationHeaders = async (method, path, bodyString) => {
  const role = getRole()
  const caps = getCapabilities()
  const requiresSignature = caps.mutationSignatureRequired === true && isMutationRole(role)
  if (!requiresSignature) {
    return {}
  }

  const signingSecret = state.signingSecret.trim()
  if (!signingSecret) {
    throw new Error('SIGNING_SECRET_MISSING')
  }

  const timestampSec = Math.floor(Date.now() / 1000)
  const nonce = createDeviceId()
  const normalizedUsername = String(state.session?.username || '').trim().toLowerCase()
  const payloadHash = await sha256Hex(bodyString || '{}')
  const payload = [
    String(timestampSec),
    nonce,
    normalizedUsername,
    method,
    path,
    payloadHash,
  ].join('.')

  const signature = await hmacSha256Hex(signingSecret, payload)
  return {
    'X-Nexus-Signature-Ts': String(timestampSec),
    'X-Nexus-Signature-Nonce': nonce,
    'X-Nexus-Signature-V1': signature,
  }
}

const apiUrl = (path) => {
  const base = state.baseUrl.replace(/\/$/, '')
  return `${base}${path}`
}

const apiRequest = async (path, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase()
  const hasBody = options.body != null
  const bodyString = hasBody ? JSON.stringify(options.body) : ''

  const mutationHeaders = options.signMutation
    ? await createMutationHeaders(method, path, bodyString || '{}')
    : {}

  const headers = {
    'X-Nexus-Device-Id': state.deviceId,
    'X-Nexus-Device-Label': 'nexus-control-ui',
    ...mutationHeaders,
    ...(options.headers || {}),
  }

  if (hasBody) {
    headers['Content-Type'] = 'application/json'
  }

  if (state.token && options.auth !== false) {
    headers.Authorization = `Bearer ${state.token}`
  }

  const response = await fetch(apiUrl(path), {
    method,
    headers,
    body: hasBody ? bodyString : undefined,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const details = data?.details ? ` (${JSON.stringify(data.details)})` : ''
    throw new Error(`${data?.error || 'HTTP_ERROR'}${details}`)
  }

  return data
}

const setBootstrapInfo = (message) => {
  if (!el.bootstrapInfo) return
  el.bootstrapInfo.textContent = message
}

const normalizeRuntimeConfig = (raw) => ({
  controlApiUrl: normalizeUrl(raw?.controlApiUrl, DEFAULT_RUNTIME_CONFIG.controlApiUrl),
  bootstrapPath: normalizePath(raw?.bootstrapPath, DEFAULT_RUNTIME_CONFIG.bootstrapPath),
  privateRepoHint: String(raw?.privateRepoHint || DEFAULT_RUNTIME_CONFIG.privateRepoHint).trim() || DEFAULT_RUNTIME_CONFIG.privateRepoHint,
  forceApiUrl: parseBool(raw?.forceApiUrl, DEFAULT_RUNTIME_CONFIG.forceApiUrl),
})

const applyRuntimeApiSettings = () => {
  const shouldApplyConfiguredApi = state.runtimeConfig.forceApiUrl || !hasStoredBaseUrl
  if (shouldApplyConfiguredApi) {
    state.baseUrl = state.runtimeConfig.controlApiUrl
  }
}

const updateApiUrlInputLock = () => {
  const locked = state.runtimeConfig.forceApiUrl === true
  el.apiBaseUrl.readOnly = locked
  el.apiBaseUrl.title = locked
    ? 'API URL ist per runtime-config fest vorgegeben.'
    : ''
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

const runBootstrapHandshake = async () => {
  const path = state.runtimeConfig.bootstrapPath || DEFAULT_RUNTIME_CONFIG.bootstrapPath
  setBootstrapInfo('Backend Handshake: pruefe...')

  try {
    const res = await apiRequest(path, { auth: false })
    const item = res?.item || {}
    const service = item.service || 'nexus-control-plane'
    const version = item.version || '1.0.0'
    const repoHint = item.privateRepoHint || state.runtimeConfig.privateRepoHint
    const lockState = item.ownerLockEnabled === true ? 'owner-lock aktiv' : 'owner-lock aus'
    setBootstrapInfo(`Backend Handshake: ok | ${service} v${version} | ${repoHint} | ${lockState}`)
    return true
  } catch (error) {
    setBootstrapInfo(`Backend Handshake: Fehler (${parseErrorMessage(error)}). Pruefe API URL und trustedOrigins.`)
    return false
  }
}

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
  const requiresSignature = caps.mutationSignatureRequired === true && isMutationRole(role)
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

  el.saveGlobalConfigBtn.disabled = !mutationReady
  el.saveAppConfigBtn.disabled = !mutationReady
  el.commandSubmitBtn.disabled = !mutationReady
  el.savePoliciesBtn.disabled = !adminMutationReady
  el.savePaywallsBtn.disabled = !adminMutationReady
  el.deviceApproveBtn.disabled = !adminMutationReady
  el.deviceRevokeBtn.disabled = !adminMutationReady

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

const renderApps = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    el.appsTableBody.innerHTML = '<tr><td colspan="7">Keine Daten vorhanden.</td></tr>'
    return
  }

  const rows = items.map((item) => {
    const stale = item.stale ? 'ja' : 'nein'
    const statusClass = item.stale ? 'chip stale' : 'chip live'
    return `
      <tr>
        <td>${item.appId || '-'}</td>
        <td><span class="${statusClass}">${item.status || 'unknown'}</span></td>
        <td>${item.appVersion || '-'}</td>
        <td>${item.lastSeenAt ? formatDateTime(item.lastSeenAt) : '-'}</td>
        <td>${item.lastNavigation || '-'}</td>
        <td>${item.eventCount ?? 0}</td>
        <td>${stale}</td>
      </tr>
    `
  })

  el.appsTableBody.innerHTML = rows.join('')
}

const loadMetricsAndApps = async () => {
  const [appsRes, metricsRes] = await Promise.all([
    apiRequest('/api/v1/apps'),
    apiRequest('/api/v1/metrics/summary'),
  ])

  renderApps(appsRes.items || [])

  const metrics = metricsRes.item || {}
  el.metricOnline.textContent = String(metrics.onlineApps ?? '-')
  el.metricStale.textContent = String(metrics.staleApps ?? '-')
  el.metricEvents.textContent = String(metrics.totalEvents ?? '-')
  el.metricRender.textContent = metrics.averageViewRenderMs == null ? '-' : String(metrics.averageViewRenderMs)
}

const loadGlobalConfig = async () => {
  const res = await apiRequest('/api/v1/config/global')
  el.globalConfig.value = prettyJson(res.item || {})
}

const loadAppConfig = async () => {
  const appId = el.appConfigSelect.value
  const res = await apiRequest(`/api/v1/config/apps/${encodeURIComponent(appId)}`)
  el.appConfig.value = prettyJson(res.item || {})
}

const loadPolicies = async () => {
  const res = await apiRequest('/api/v1/policies')
  state.policies = res.item || {}
  el.policiesConfig.value = prettyJson(state.policies)
  renderPaywallEditor(state.policies)
}

const getTierViews = (policies, tier, appId) => {
  const list = policies?.paywalls?.tiers?.[tier]?.viewsByApp?.[appId]
  return Array.isArray(list) ? list : []
}

const renderPaywallEditor = (policies) => {
  const paywalls = policies?.paywalls || {}
  const users = paywalls.users || {}

  el.paywallEnabled.value = paywalls.enabled === true ? 'true' : 'false'
  el.paywallDefaultTier.value = paywalls.defaultTier === 'paid' ? 'paid' : 'free'

  el.paywallFreeMain.value = csvFromList(getTierViews(policies, 'free', 'main'))
  el.paywallPaidMain.value = csvFromList(getTierViews(policies, 'paid', 'main'))
  el.paywallFreeMobile.value = csvFromList(getTierViews(policies, 'free', 'mobile'))
  el.paywallPaidMobile.value = csvFromList(getTierViews(policies, 'paid', 'mobile'))
  el.paywallFreeCode.value = csvFromList(getTierViews(policies, 'free', 'code'))
  el.paywallPaidCode.value = csvFromList(getTierViews(policies, 'paid', 'code'))
  el.paywallFreeCodeMobile.value = csvFromList(getTierViews(policies, 'free', 'code-mobile'))
  el.paywallPaidCodeMobile.value = csvFromList(getTierViews(policies, 'paid', 'code-mobile'))

  const freeUsers = []
  const paidUsers = []
  for (const [username, entry] of Object.entries(users)) {
    if (entry?.tier === 'paid') {
      paidUsers.push(username)
    } else {
      freeUsers.push(username)
    }
  }

  el.paywallUsersFree.value = freeUsers.join(',')
  el.paywallUsersPaid.value = paidUsers.join(',')
}

const buildPaywallPayloadFromUi = () => {
  const paywalls = {
    enabled: el.paywallEnabled.value === 'true',
    defaultTier: el.paywallDefaultTier.value === 'paid' ? 'paid' : 'free',
    tiers: {
      free: {
        label: 'Free Tier',
        viewsByApp: {
          main: parseCsvUnique(el.paywallFreeMain.value),
          mobile: parseCsvUnique(el.paywallFreeMobile.value),
          code: parseCsvUnique(el.paywallFreeCode.value),
          'code-mobile': parseCsvUnique(el.paywallFreeCodeMobile.value),
        },
      },
      paid: {
        label: 'Paid Tier',
        viewsByApp: {
          main: parseCsvUnique(el.paywallPaidMain.value),
          mobile: parseCsvUnique(el.paywallPaidMobile.value),
          code: parseCsvUnique(el.paywallPaidCode.value),
          'code-mobile': parseCsvUnique(el.paywallPaidCodeMobile.value),
        },
      },
    },
    users: {},
  }

  for (const username of parseCsvUnique(el.paywallUsersFree.value)) {
    paywalls.users[username] = {
      tier: 'free',
      note: 'Control Panel free template',
    }
  }
  for (const username of parseCsvUnique(el.paywallUsersPaid.value)) {
    paywalls.users[username] = {
      tier: 'paid',
      note: 'Control Panel paid template',
    }
  }

  if (Object.keys(paywalls.users).length === 0) {
    paywalls.users.free_demo = { tier: 'free', note: 'Demo Free User' }
    paywalls.users.paid_demo = { tier: 'paid', note: 'Demo Paid User' }
  }

  for (const appId of PAYWALL_APP_IDS) {
    if (paywalls.tiers.paid.viewsByApp[appId].length === 0) {
      paywalls.tiers.paid.viewsByApp[appId] = [...paywalls.tiers.free.viewsByApp[appId]]
    }
  }

  return paywalls
}

const loadDevices = async () => {
  try {
    const res = await apiRequest('/api/v1/devices?limit=500')
    el.devicesList.textContent = prettyJson(res.items || [])
  } catch (error) {
    el.devicesList.textContent = prettyJson({
      note: 'Device-Liste nicht verfuegbar (vermutlich fehlende Admin/Developer-Rechte).',
      error: parseErrorMessage(error),
    })
  }
}

const loadCommands = async () => {
  const res = await apiRequest('/api/v1/commands?limit=120')
  el.commandsList.textContent = prettyJson(res.items || [])
}

const loadAudit = async () => {
  const res = await apiRequest('/api/v1/audit?limit=220')
  el.auditList.textContent = prettyJson(res.items || [])
}

const loadBuildManifest = async () => {
  try {
    const res = await apiRequest('/api/v1/build/manifest')
    el.buildManifest.textContent = prettyJson(res.item || {})
  } catch (error) {
    el.buildManifest.textContent = prettyJson({
      note: 'Build Manifest nicht verfuegbar.',
      error: parseErrorMessage(error),
    })
  }
}

const loadGuides = async () => {
  const res = await apiRequest('/api/v1/guides')
  const items = res.items || []

  el.guideSelect.innerHTML = items
    .map((item) => `<option value="${item.id}">${item.title}</option>`)
    .join('')

  if (items.length > 0) {
    await loadGuide(items[0].id)
  } else {
    el.guideContent.textContent = 'Keine Guides vorhanden.'
  }
}

const loadGuide = async (guideId) => {
  if (!guideId) {
    el.guideContent.textContent = 'Kein Guide ausgewaehlt.'
    return
  }

  const res = await apiRequest(`/api/v1/guides/${encodeURIComponent(guideId)}`)
  el.guideContent.textContent = res.item?.content || 'Guide ohne Inhalt.'
}

const refreshWorkspace = async () => {
  setStatus('Aktualisiere Daten...')

  await Promise.all([
    loadMetricsAndApps(),
    loadGlobalConfig(),
    loadAppConfig(),
    loadPolicies(),
    loadDevices(),
    loadCommands(),
    loadAudit(),
    loadGuides(),
    loadBuildManifest(),
  ])

  setStatus(`Aktualisiert (${new Date().toLocaleTimeString()})`, 'success')
}

const setLoggedInState = (loggedIn) => {
  el.authPanel.classList.toggle('hidden', loggedIn)
  el.workspace.classList.toggle('hidden', !loggedIn)
  applyRoleAccessControl()
  updateSessionUi()
}

const persistApiSettings = () => {
  localStorage.setItem(STORAGE_KEYS.baseUrl, state.baseUrl)
  localStorage.setItem(STORAGE_KEYS.ingestKey, state.ingestKey)
  localStorage.setItem(STORAGE_KEYS.deviceId, state.deviceId)
  if (state.signingSecret) {
    sessionStorage.setItem(SESSION_KEYS.signingSecret, state.signingSecret)
  } else {
    sessionStorage.removeItem(SESSION_KEYS.signingSecret)
  }
}

const persistToken = () => {
  if (state.token) {
    localStorage.setItem(STORAGE_KEYS.token, state.token)
  } else {
    localStorage.removeItem(STORAGE_KEYS.token)
  }
}

const initApiSettingsUi = () => {
  el.apiBaseUrl.value = state.baseUrl
  el.apiIngestKey.value = state.ingestKey
  el.deviceIdInput.value = state.deviceId
  el.signingSecretInput.value = state.signingSecret
  updateApiUrlInputLock()
  if (!el.deviceManageId.value) {
    el.deviceManageId.value = state.deviceId
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
    persistToken()
    setLoggedInState(false)
    return false
  }
}

el.apiSettingsForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const requestedBaseUrl = el.apiBaseUrl.value.trim() || DEFAULT_API_URL
  state.baseUrl = state.runtimeConfig.forceApiUrl ? state.runtimeConfig.controlApiUrl : requestedBaseUrl
  state.ingestKey = el.apiIngestKey.value.trim()
  state.signingSecret = el.signingSecretInput.value.trim()
  el.apiBaseUrl.value = state.baseUrl
  persistApiSettings()
  updateSessionUi()
  updateApiUrlInputLock()

  setStatus('API Einstellungen gespeichert.', 'success')
  await runBootstrapHandshake()

  if (state.token) {
    const valid = await ensureSession()
    if (valid) {
      await refreshWorkspace()
    }
  }
})

el.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  setStatus('Login laeuft...')

  try {
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
    persistToken()

    const valid = await ensureSession()
    if (!valid) {
      throw new Error('Session konnte nicht verifiziert werden.')
    }

    await refreshWorkspace()
    await runBootstrapHandshake()
    setStatus(`Eingeloggt als ${state.session.username} (${state.session.role})`, 'success')
  } catch (error) {
    setStatus(`Login fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
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
  persistApiSettings()
  persistToken()
  setLoggedInState(false)
  setStatus('Ausgeloggt.', 'success')
})

el.refreshBtn.addEventListener('click', async () => {
  if (!state.token) {
    await runBootstrapHandshake()
    setStatus('Bitte zuerst einloggen.', 'error')
    return
  }

  try {
    await refreshWorkspace()
    await runBootstrapHandshake()
  } catch (error) {
    setStatus(`Aktualisierung fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
  }
})

el.saveGlobalConfigBtn.addEventListener('click', async () => {
  try {
    const payload = parseJsonOrThrow(el.globalConfig.value, 'Global Config')
    await apiRequest('/api/v1/config/global', {
      method: 'PUT',
      body: payload,
      signMutation: true,
    })

    setStatus('Global Config gespeichert.', 'success')
  } catch (error) {
    setStatus(parseErrorMessage(error), 'error')
  }
})

el.loadAppConfigBtn.addEventListener('click', async (event) => {
  event.preventDefault()
  try {
    await loadAppConfig()
    setStatus(`App Config geladen (${el.appConfigSelect.value}).`, 'success')
  } catch (error) {
    setStatus(`App Config konnte nicht geladen werden: ${parseErrorMessage(error)}`, 'error')
  }
})

el.saveAppConfigBtn.addEventListener('click', async () => {
  try {
    const appId = el.appConfigSelect.value
    const payload = parseJsonOrThrow(el.appConfig.value, 'App Config')

    await apiRequest(`/api/v1/config/apps/${encodeURIComponent(appId)}`, {
      method: 'PUT',
      body: payload,
      signMutation: true,
    })

    setStatus(`App Config gespeichert (${appId}).`, 'success')
  } catch (error) {
    setStatus(parseErrorMessage(error), 'error')
  }
})

el.commandForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  try {
    const payload = parseJsonOrThrow(el.commandPayload.value, 'Command Payload')
    const command = {
      targetAppId: el.commandTarget.value,
      type: el.commandType.value.trim(),
      payload,
      priority: el.commandPriority.value,
      ttlMs: Number(el.commandTtl.value || 60_000),
    }

    const headers = {}
    const idempotency = el.commandIdempotency.value.trim()
    if (idempotency) {
      headers['Idempotency-Key'] = idempotency
    }

    await apiRequest('/api/v1/commands', {
      method: 'POST',
      headers,
      body: command,
      signMutation: true,
    })

    await loadCommands()
    setStatus(`Command erstellt: ${command.type} -> ${command.targetAppId}`, 'success')
  } catch (error) {
    setStatus(`Command fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
  }
})

el.savePoliciesBtn.addEventListener('click', async () => {
  try {
    const payload = parseJsonOrThrow(el.policiesConfig.value, 'Policies')
    const res = await apiRequest('/api/v1/policies', {
      method: 'PUT',
      body: payload,
      signMutation: true,
    })

    state.policies = res.item || payload
    el.policiesConfig.value = prettyJson(state.policies)
    renderPaywallEditor(state.policies)
    setStatus('Policies gespeichert.', 'success')
  } catch (error) {
    setStatus(`Policies konnten nicht gespeichert werden: ${parseErrorMessage(error)}`, 'error')
  }
})

el.savePaywallsBtn.addEventListener('click', async () => {
  try {
    const basePolicies = state.policies || parseJsonOrThrow(el.policiesConfig.value, 'Policies')
    const payload = {
      ...basePolicies,
      paywalls: buildPaywallPayloadFromUi(),
    }

    const res = await apiRequest('/api/v1/policies', {
      method: 'PUT',
      body: payload,
      signMutation: true,
    })

    state.policies = res.item || payload
    el.policiesConfig.value = prettyJson(state.policies)
    renderPaywallEditor(state.policies)
    setStatus('Paywalls gespeichert.', 'success')
  } catch (error) {
    setStatus(`Paywalls konnten nicht gespeichert werden: ${parseErrorMessage(error)}`, 'error')
  }
})

const parseRoleCsv = (csv) => String(csv || '')
  .split(',')
  .map((role) => role.trim())
  .filter(Boolean)

el.deviceApproveBtn.addEventListener('click', async () => {
  try {
    const deviceId = el.deviceManageId.value.trim()
    if (!deviceId) {
      throw new Error('Device ID ist erforderlich.')
    }

    const label = el.deviceManageLabel.value.trim()
    const roleScopes = parseRoleCsv(el.deviceManageRoles.value)

    await apiRequest('/api/v1/devices/approve', {
      method: 'POST',
      body: {
        deviceId,
        label,
        roleScopes,
      },
      signMutation: true,
    })

    await loadDevices()
    setStatus(`Geraet freigegeben: ${deviceId}`, 'success')
  } catch (error) {
    setStatus(`Device-Freigabe fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
  }
})

el.deviceRevokeBtn.addEventListener('click', async () => {
  try {
    const deviceId = el.deviceManageId.value.trim()
    if (!deviceId) {
      throw new Error('Device ID ist erforderlich.')
    }

    await apiRequest('/api/v1/devices/revoke', {
      method: 'POST',
      body: { deviceId },
      signMutation: true,
    })

    await loadDevices()
    setStatus(`Geraet gesperrt: ${deviceId}`, 'success')
  } catch (error) {
    setStatus(`Device-Sperre fehlgeschlagen: ${parseErrorMessage(error)}`, 'error')
  }
})

el.deviceRefreshBtn.addEventListener('click', async () => {
  await loadDevices()
  setStatus('Device-Liste aktualisiert.', 'success')
})

el.buildManifestRefresh.addEventListener('click', async () => {
  if (!state.token) {
    setStatus('Bitte zuerst einloggen.', 'error')
    return
  }

  await loadBuildManifest()
  setStatus('Build Manifest aktualisiert.', 'success')
})

el.loadGuideBtn.addEventListener('click', async (event) => {
  event.preventDefault()

  try {
    await loadGuide(el.guideSelect.value)
    setStatus('Guide geladen.', 'success')
  } catch (error) {
    setStatus(`Guide konnte nicht geladen werden: ${parseErrorMessage(error)}`, 'error')
  }
})

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

const bootstrap = async () => {
  await loadRuntimeConfig()
  persistApiSettings()
  initApiSettingsUi()
  await runBootstrapHandshake()

  const hasSession = await ensureSession()
  if (!hasSession) {
    setStatus('Bitte einloggen, um das Ecosystem zu verwalten.')
    return
  }

  try {
    await refreshWorkspace()
    await runBootstrapHandshake()
    setStatus(`Eingeloggt als ${state.session.username} (${state.session.role})`, 'success')
  } catch (error) {
    setStatus(`Daten konnten nicht geladen werden: ${parseErrorMessage(error)}`, 'error')
  }
}

bootstrap()
