const STORAGE_KEYS = {
  baseUrl: 'nexus.control.baseUrl',
  ingestKey: 'nexus.control.ingestKey',
  token: 'nexus.control.token',
  deviceId: 'nexus.control.deviceId',
}

const DEFAULT_API_URL = 'http://localhost:4399'
const createDeviceId = () => {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `nxdev-${suffix}`
}

const state = {
  baseUrl: localStorage.getItem(STORAGE_KEYS.baseUrl) || DEFAULT_API_URL,
  ingestKey: localStorage.getItem(STORAGE_KEYS.ingestKey) || '',
  token: localStorage.getItem(STORAGE_KEYS.token) || '',
  deviceId: localStorage.getItem(STORAGE_KEYS.deviceId) || createDeviceId(),
  session: null,
}

const el = {
  status: document.getElementById('status-line'),
  apiBaseUrl: document.getElementById('api-base-url'),
  apiIngestKey: document.getElementById('api-ingest-key'),
  deviceIdInput: document.getElementById('device-id'),
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
  commandsList: document.getElementById('commands-list'),
  policiesConfig: document.getElementById('policies-config'),
  savePoliciesBtn: document.getElementById('save-policies'),
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

const apiUrl = (path) => {
  const base = state.baseUrl.replace(/\/$/, '')
  return `${base}${path}`
}

const apiRequest = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Nexus-Device-Id': state.deviceId,
    'X-Nexus-Device-Label': 'nexus-control-ui',
    ...(options.headers || {}),
  }

  if (state.token && options.auth !== false) {
    headers.Authorization = `Bearer ${state.token}`
  }

  const response = await fetch(apiUrl(path), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
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

const activateTab = (tabId) => {
  for (const tab of el.tabs) {
    tab.classList.toggle('active', tab.dataset.tab === tabId)
  }

  for (const panel of el.panels) {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`)
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
  el.policiesConfig.value = prettyJson(res.item || {})
}

const loadDevices = async () => {
  try {
    const res = await apiRequest('/api/v1/devices?limit=500')
    el.devicesList.textContent = prettyJson(res.items || [])
  } catch (error) {
    el.devicesList.textContent = prettyJson({
      note: 'Device-Liste nicht verfuegbar (vermutlich fehlende Admin/Developer-Rechte).',
      error: error.message,
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
  ])

  setStatus(`Aktualisiert (${new Date().toLocaleTimeString()})`, 'success')
}

const setLoggedInState = (loggedIn) => {
  el.authPanel.classList.toggle('hidden', loggedIn)
  el.workspace.classList.toggle('hidden', !loggedIn)
}

const persistApiSettings = () => {
  localStorage.setItem(STORAGE_KEYS.baseUrl, state.baseUrl)
  localStorage.setItem(STORAGE_KEYS.ingestKey, state.ingestKey)
  localStorage.setItem(STORAGE_KEYS.deviceId, state.deviceId)
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
  state.baseUrl = el.apiBaseUrl.value.trim() || DEFAULT_API_URL
  state.ingestKey = el.apiIngestKey.value.trim()
  persistApiSettings()

  setStatus('API Einstellungen gespeichert.', 'success')

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
    setStatus(`Eingeloggt als ${state.session.username} (${state.session.role})`, 'success')
  } catch (error) {
    setStatus(`Login fehlgeschlagen: ${error.message}`, 'error')
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
  persistToken()
  setLoggedInState(false)
  setStatus('Ausgeloggt.', 'success')
})

el.refreshBtn.addEventListener('click', async () => {
  if (!state.token) {
    setStatus('Bitte zuerst einloggen.', 'error')
    return
  }

  try {
    await refreshWorkspace()
  } catch (error) {
    setStatus(`Aktualisierung fehlgeschlagen: ${error.message}`, 'error')
  }
})

el.saveGlobalConfigBtn.addEventListener('click', async () => {
  try {
    const payload = parseJsonOrThrow(el.globalConfig.value, 'Global Config')
    await apiRequest('/api/v1/config/global', {
      method: 'PUT',
      body: payload,
    })

    setStatus('Global Config gespeichert.', 'success')
  } catch (error) {
    setStatus(error.message, 'error')
  }
})

el.loadAppConfigBtn.addEventListener('click', async (event) => {
  event.preventDefault()
  try {
    await loadAppConfig()
    setStatus(`App Config geladen (${el.appConfigSelect.value}).`, 'success')
  } catch (error) {
    setStatus(`App Config konnte nicht geladen werden: ${error.message}`, 'error')
  }
})

el.saveAppConfigBtn.addEventListener('click', async () => {
  try {
    const appId = el.appConfigSelect.value
    const payload = parseJsonOrThrow(el.appConfig.value, 'App Config')

    await apiRequest(`/api/v1/config/apps/${encodeURIComponent(appId)}`, {
      method: 'PUT',
      body: payload,
    })

    setStatus(`App Config gespeichert (${appId}).`, 'success')
  } catch (error) {
    setStatus(error.message, 'error')
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
    })

    await loadCommands()
    setStatus(`Command erstellt: ${command.type} -> ${command.targetAppId}`, 'success')
  } catch (error) {
    setStatus(`Command fehlgeschlagen: ${error.message}`, 'error')
  }
})

el.savePoliciesBtn.addEventListener('click', async () => {
  try {
    const payload = parseJsonOrThrow(el.policiesConfig.value, 'Policies')
    await apiRequest('/api/v1/policies', {
      method: 'PUT',
      body: payload,
    })

    await loadPolicies()
    setStatus('Policies gespeichert.', 'success')
  } catch (error) {
    setStatus(`Policies konnten nicht gespeichert werden: ${error.message}`, 'error')
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
    })

    await loadDevices()
    setStatus(`Geraet freigegeben: ${deviceId}`, 'success')
  } catch (error) {
    setStatus(`Device-Freigabe fehlgeschlagen: ${error.message}`, 'error')
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
    })

    await loadDevices()
    setStatus(`Geraet gesperrt: ${deviceId}`, 'success')
  } catch (error) {
    setStatus(`Device-Sperre fehlgeschlagen: ${error.message}`, 'error')
  }
})

el.deviceRefreshBtn.addEventListener('click', async () => {
  await loadDevices()
  setStatus('Device-Liste aktualisiert.', 'success')
})

el.loadGuideBtn.addEventListener('click', async (event) => {
  event.preventDefault()

  try {
    await loadGuide(el.guideSelect.value)
    setStatus('Guide geladen.', 'success')
  } catch (error) {
    setStatus(`Guide konnte nicht geladen werden: ${error.message}`, 'error')
  }
})

for (const tab of el.tabs) {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab))
}

const bootstrap = async () => {
  persistApiSettings()
  initApiSettingsUi()

  const hasSession = await ensureSession()
  if (!hasSession) {
    setStatus('Bitte einloggen, um das Ecosystem zu verwalten.')
    return
  }

  try {
    await refreshWorkspace()
    setStatus(`Eingeloggt als ${state.session.username} (${state.session.role})`, 'success')
  } catch (error) {
    setStatus(`Daten konnten nicht geladen werden: ${error.message}`, 'error')
  }
}

bootstrap()
