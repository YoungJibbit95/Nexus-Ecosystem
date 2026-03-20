import { isLoopbackHost, parseUrlSafe } from './normalize.js'

export const abortableFetch = async (url, init, timeoutMs) => {
  if (typeof AbortController === 'undefined' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetch(url, init)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export const classifyNetworkFailure = (error, requestUrl, timeoutMs) => {
  const parsedUrl = parseUrlSafe(requestUrl)
  const pageHost = String(globalThis.location?.hostname || '').trim().toLowerCase()
  const pageProtocol = String(globalThis.location?.protocol || '').trim().toLowerCase()
  const targetHost = String(parsedUrl?.hostname || '').trim().toLowerCase()
  const targetProtocol = String(parsedUrl?.protocol || '').trim().toLowerCase()
  const hostedUi = Boolean(pageHost) && !isLoopbackHost(pageHost)

  if (error?.name === 'AbortError') {
    return {
      code: 'NETWORK_TIMEOUT',
      message: `Request Timeout nach ${timeoutMs}ms.`,
      hint: 'Pruefe API-Erreichbarkeit, Response-Zeit und Port.',
    }
  }

  if (!parsedUrl) {
    return {
      code: 'INVALID_API_URL',
      message: 'API URL ist ungueltig.',
      hint: 'Nutze eine vollstaendige URL, z. B. https://api.example.com',
    }
  }

  if (pageProtocol === 'https:' && targetProtocol === 'http:') {
    return {
      code: 'MIXED_CONTENT_BLOCKED',
      message: 'Browser blockiert HTTPS -> HTTP Requests (Mixed Content).',
      hint: 'Nutze fuer die API eine HTTPS URL.',
    }
  }

  if (hostedUi && isLoopbackHost(targetHost)) {
    return {
      code: 'LOOPBACK_URL_ON_HOSTED_UI',
      message: 'Loopback-API URL auf gehosteter UI ist nicht erreichbar.',
      hint: 'Setze eine oeffentliche HTTPS API URL in runtime-config.json oder in den API Einstellungen.',
    }
  }

  return {
    code: 'NETWORK_OR_CORS',
    message: 'API nicht erreichbar oder CORS blockiert.',
    hint: 'Pruefe API URL, trustedOrigins und HTTPS-Konfiguration.',
  }
}
