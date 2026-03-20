import { parseErrorMessage, parseJsonOrThrow, parseRoleCsv } from '../helpers.js'

export const bindManagementEvents = ({ state, el, core, workspace }) => {
  const { apiRequest, setStatus } = core
  const {
    buildPaywallPayloadFromUi,
    loadAppConfig,
    loadBuildManifest,
    loadCommands,
    loadDevices,
    renderPaywallEditor,
  } = workspace

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
      el.policiesConfig.value = JSON.stringify(state.policies, null, 2)
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
      el.policiesConfig.value = JSON.stringify(state.policies, null, 2)
      renderPaywallEditor(state.policies)
      setStatus('Paywalls gespeichert.', 'success')
    } catch (error) {
      setStatus(`Paywalls konnten nicht gespeichert werden: ${parseErrorMessage(error)}`, 'error')
    }
  })

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
}
