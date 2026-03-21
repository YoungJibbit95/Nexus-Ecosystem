import type { NexusCapabilityReport } from '../../types'
import { abortableFetch } from '../utils'
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
    if (client.localFallbackEnabled) {
      return {
        ok: true,
        status: 200,
        item: {
          accepted: true,
          mode: 'local-fallback',
          appId,
          receivedAt: new Date().toISOString(),
        },
      }
    }
    return { ok: false, status: 0, item: null, errorCode: 'NO_BASE_URL' }
  }

  try {
    const response = await abortableFetch(`${client.baseUrl}/api/v2/clients/capabilities`, {
      method: 'POST',
      headers: buildWriteHeaders(client, appId),
      body: JSON.stringify(payload),
    }, client.requestTimeoutMs)

    if (!response.ok) {
      return { ok: false, status: response.status, item: null, errorCode: `HTTP_${response.status}` }
    }

    const data = await response.json()
    return {
      ok: true,
      status: response.status,
      item: data?.item ?? null,
    }
  } catch (error) {
    if (client.localFallbackEnabled) {
      return {
        ok: true,
        status: 200,
        item: {
          accepted: true,
          mode: 'local-fallback',
          appId,
          receivedAt: new Date().toISOString(),
        },
      }
    }

    return {
      ok: false,
      status: 0,
      item: null,
      errorCode: (error as Error | undefined)?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK',
    }
  }
}
