import { parseJsonOrThrow, prettyJson } from '../helpers.js'

export const createV2WorkspaceActions = ({ el, apiRequest }) => {
  const getV2Selection = () => ({
    appId: String(el.v2AppSelect.value || 'main'),
    channel: String(el.v2ChannelSelect.value || 'production'),
  })

  const loadV2Runtime = async () => {
    const { appId, channel } = getV2Selection()
    const query = `appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channel)}`

    const [catalogRes, layoutRes, releaseRes] = await Promise.all([
      apiRequest(`/api/v2/features/catalog?${query}`),
      apiRequest(`/api/v2/layout/schema?${query}`),
      apiRequest(`/api/v2/releases/current?${query}`),
    ])

    const catalog = catalogRes.item || {}
    const schema = layoutRes.item || {}
    const release = releaseRes.item || {}

    el.v2FeatureCatalog.value = prettyJson(catalog)
    el.v2LayoutSchema.value = prettyJson(schema)
    el.v2ReleaseOutput.textContent = prettyJson({
      appId,
      channel,
      release,
      etags: {
        catalog: catalogRes.etag || null,
        schema: layoutRes.etag || null,
        release: releaseRes.etag || null,
      },
    })
  }

  const loadV2Capabilities = async () => {
    const { appId } = getV2Selection()
    const res = await apiRequest(`/api/v2/clients/capabilities?appId=${encodeURIComponent(appId)}&limit=240`)
    el.v2CapabilitiesOutput.textContent = prettyJson(res.items || [])
  }

  const validateV2LayoutSchema = async () => {
    const { appId, channel } = getV2Selection()
    const document = parseJsonOrThrow(el.v2LayoutSchema.value, 'Layout Schema')
    const res = await apiRequest('/api/v2/layout/validate', {
      method: 'POST',
      body: {
        appId,
        channel,
        document,
      },
    })
    el.v2ValidateOutput.textContent = prettyJson(res.item || {})
  }

  const saveV2FeatureCatalog = async () => {
    const catalog = parseJsonOrThrow(el.v2FeatureCatalog.value, 'Feature Catalog')
    const channel = 'staging'
    const res = await apiRequest(`/api/v2/features/catalog?channel=${encodeURIComponent(channel)}`, {
      method: 'PUT',
      body: catalog,
      signMutation: true,
    })
    el.v2FeatureCatalog.value = prettyJson(res.item || catalog)
  }

  const saveV2LayoutSchema = async () => {
    const { appId } = getV2Selection()
    const schema = parseJsonOrThrow(el.v2LayoutSchema.value, 'Layout Schema')
    const channel = 'staging'

    const res = await apiRequest(
      `/api/v2/layout/schema?appId=${encodeURIComponent(appId)}&channel=${encodeURIComponent(channel)}`,
      {
        method: 'PUT',
        body: schema,
        signMutation: true,
      },
    )

    el.v2LayoutSchema.value = prettyJson(res.item || schema)
  }

  const promoteV2Release = async () => {
    const { appId } = getV2Selection()
    const payload = {
      appId,
      fromChannel: String(el.v2PromoteFrom.value || 'staging'),
      toChannel: String(el.v2PromoteTo.value || 'production'),
      note: String(el.v2PromoteNote.value || '').trim(),
    }

    const res = await apiRequest('/api/v2/releases/promote', {
      method: 'POST',
      body: payload,
      signMutation: true,
    })

    el.v2ReleaseOutput.textContent = prettyJson({
      promoted: true,
      item: res.item || null,
    })
  }

  return {
    loadV2Runtime,
    loadV2Capabilities,
    validateV2LayoutSchema,
    saveV2FeatureCatalog,
    saveV2LayoutSchema,
    promoteV2Release,
  }
}
