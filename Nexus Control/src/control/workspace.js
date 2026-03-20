import { renderAppsTable } from './workspace/render-apps.js'
import { createGuideActions } from './workspace/guides.js'
import { createPaywallActions } from './workspace/paywalls.js'
import { createV1WorkspaceLoaders } from './workspace/v1-loaders.js'
import { createV2WorkspaceActions } from './workspace/v2-actions.js'

export const createWorkspaceActions = ({ state, el, apiRequest, setStatus, parseErrorMessage }) => {
  const paywallActions = createPaywallActions({ el })

  const v1Loaders = createV1WorkspaceLoaders({
    state,
    el,
    apiRequest,
    parseErrorMessage,
    renderAppsTable,
    renderPaywallEditor: paywallActions.renderPaywallEditor,
  })

  const v2Actions = createV2WorkspaceActions({
    el,
    apiRequest,
  })

  const guideActions = createGuideActions({
    el,
    apiRequest,
  })

  const refreshWorkspace = async () => {
    setStatus('Aktualisiere Daten...')

    await Promise.all([
      v1Loaders.loadMetricsAndApps(),
      v1Loaders.loadGlobalConfig(),
      v1Loaders.loadAppConfig(),
      v1Loaders.loadPolicies(),
      v1Loaders.loadDevices(),
      v1Loaders.loadCommands(),
      v1Loaders.loadAudit(),
      guideActions.loadGuides(),
      v1Loaders.loadBuildManifest(),
      v2Actions.loadV2Runtime(),
      v2Actions.loadV2Capabilities(),
    ])

    setStatus(`Aktualisiert (${new Date().toLocaleTimeString()})`, 'success')
  }

  return {
    ...paywallActions,
    ...v1Loaders,
    ...v2Actions,
    ...guideActions,
    refreshWorkspace,
  }
}
