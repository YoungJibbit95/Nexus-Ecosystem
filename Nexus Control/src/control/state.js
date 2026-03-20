import {
  DEFAULT_API_URL,
  DEFAULT_RUNTIME_CONFIG,
  SESSION_KEYS,
  STORAGE_KEYS,
} from './constants.js'
import { createDeviceId, isLoopbackHost } from './helpers.js'

export const hasStoredBaseUrl = localStorage.getItem(STORAGE_KEYS.baseUrl) != null

const resolveDefaultBaseUrl = () => {
  const pageHost = String(globalThis.location?.hostname || '').trim().toLowerCase()
  if (!pageHost || isLoopbackHost(pageHost)) {
    return DEFAULT_API_URL
  }
  return ''
}

export const createInitialState = () => ({
  baseUrl: localStorage.getItem(STORAGE_KEYS.baseUrl) || resolveDefaultBaseUrl(),
  ingestKey: localStorage.getItem(STORAGE_KEYS.ingestKey) || '',
  token: sessionStorage.getItem(SESSION_KEYS.token) || localStorage.getItem(STORAGE_KEYS.token) || '',
  deviceId: localStorage.getItem(STORAGE_KEYS.deviceId) || createDeviceId(),
  signingSecret: sessionStorage.getItem(SESSION_KEYS.signingSecret) || '',
  session: null,
  policies: null,
  runtimeConfig: { ...DEFAULT_RUNTIME_CONFIG },
  runtimeConfigLoaded: false,
  loginFailureCount: 0,
  loginLockedUntil: 0,
})

export const persistApiSettings = (state) => {
  localStorage.setItem(STORAGE_KEYS.baseUrl, state.baseUrl)
  localStorage.setItem(STORAGE_KEYS.ingestKey, state.ingestKey)
  localStorage.setItem(STORAGE_KEYS.deviceId, state.deviceId)

  if (state.signingSecret) {
    sessionStorage.setItem(SESSION_KEYS.signingSecret, state.signingSecret)
  } else {
    sessionStorage.removeItem(SESSION_KEYS.signingSecret)
  }
}

export const persistToken = (state) => {
  if (state.token) {
    sessionStorage.setItem(SESSION_KEYS.token, state.token)
  } else {
    sessionStorage.removeItem(SESSION_KEYS.token)
  }

  localStorage.removeItem(STORAGE_KEYS.token)
}
