import { prettyJson } from '../helpers.js'

export const createV1WorkspaceLoaders = ({
  state,
  el,
  apiRequest,
  parseErrorMessage,
  renderAppsTable,
  renderPaywallEditor,
}) => {
  const loadMetricsAndApps = async () => {
    const [appsRes, metricsRes] = await Promise.all([
      apiRequest('/api/v1/apps'),
      apiRequest('/api/v1/metrics/summary'),
    ])

    renderAppsTable(el, appsRes.items || [])

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

  return {
    loadMetricsAndApps,
    loadGlobalConfig,
    loadAppConfig,
    loadPolicies,
    loadDevices,
    loadCommands,
    loadAudit,
    loadBuildManifest,
  }
}
