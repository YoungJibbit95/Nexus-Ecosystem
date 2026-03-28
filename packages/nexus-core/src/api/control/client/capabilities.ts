import type { NexusCapabilityReport } from '../../types'
import { NexusControlError, requestJsonWithPolicy } from '../utils'
import { buildWriteHeaders, inferPlatformFromApp } from './common'

export const reportCapabilities = async (client: any, report: Partial<NexusCapabilityReport> = {}) => {
  const appId = report.appId || client.appId
  const payload: NexusCapabilityReport = {
    appId,
    appVersion: report.appVersion || client.appVersion,
    platform: report.platform || inferPlatformFromApp(client, appId),
    supports: {
      schemaVersions: report.supports?.schemaVersions || ['2.0.0'],
      components: report.supports?.components || [],
      layoutProfiles: report.supports?.layoutProfiles || ['desktop-default', 'mobile-adaptive'],
      featureFlags: report.supports?.featureFlags || [],
    },
    reportedAt: report.reportedAt,
  }

  if (!client.baseUrl) {
    return { ok: false, status: 0, item: null, errorCode: 'NO_BASE_URL' }
  }

  try {
    const response = await requestJsonWithPolicy<any>(`${client.baseUrl}/api/v2/clients/capabilities`, {
      method: 'POST',
      headers: buildWriteHeaders(client, appId),
      body: JSON.stringify(payload),
      timeoutMs: client.requestTimeoutMs,
      maxRetries: 0,
      parseJson: true,
    })

    if (!response.ok) {
      return { ok: false, status: response.status, item: null, errorCode: `HTTP_${response.status}` }
    }

    if (response.parseError) {
      return { ok: false, status: response.status, item: null, errorCode: 'INVALID_JSON' }
    }

    const data = response.data
    const item = data?.item ?? null
    if (item != null && typeof item !== 'object') {
      return { ok: false, status: response.status, item: null, errorCode: 'INVALID_SCHEMA' }
    }

    return {
      ok: true,
      status: response.status,
      item,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      item: null,
      errorCode: error instanceof NexusControlError ? error.code : ((error as Error | undefined)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK'),
    }
  }
}
