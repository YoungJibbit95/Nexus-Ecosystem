import { DEFAULT_REQUEST_TIMEOUT_MS } from '../constants.js'
import {
  abortableFetch,
  classifyNetworkFailure,
  hmacSha256Hex,
  isMutationRole,
  normalizeApiPath,
  sha256Hex,
} from '../helpers.js'

export const createApiCore = ({ state }) => {
  const getRole = () => state.session?.role || ''
  const getCapabilities = () => state.session?.capabilities || {}

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
    const nonce = `nxdev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
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
    const safePath = normalizeApiPath(path)
    return `${base}${safePath}`
  }

  const apiRequest = async (path, options = {}) => {
    const safePath = normalizeApiPath(path)
    const method = String(options.method || 'GET').toUpperCase()
    const hasBody = options.body != null
    const bodyString = hasBody ? JSON.stringify(options.body) : ''
    const timeoutCandidate = Number(options.timeoutMs)
    const timeoutMs = Number.isFinite(timeoutCandidate) && timeoutCandidate > 0
      ? Math.floor(timeoutCandidate)
      : DEFAULT_REQUEST_TIMEOUT_MS

    const mutationHeaders = options.signMutation
      ? await createMutationHeaders(method, safePath, bodyString || '{}')
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

    const requestUrl = apiUrl(safePath)

    let response
    try {
      response = await abortableFetch(requestUrl, {
        method,
        headers,
        body: hasBody ? bodyString : undefined,
      }, timeoutMs)
    } catch (error) {
      const classified = classifyNetworkFailure(error, requestUrl, timeoutMs)
      const wrapped = new Error(classified.code)
      wrapped.nexusCode = classified.code
      wrapped.nexusMessage = classified.message
      wrapped.nexusHint = classified.hint
      throw wrapped
    }

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

  return {
    apiRequest,
    getRole,
    getCapabilities,
  }
}
