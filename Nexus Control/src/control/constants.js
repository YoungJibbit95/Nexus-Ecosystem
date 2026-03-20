export const STORAGE_KEYS = {
  baseUrl: 'nexus.control.baseUrl',
  ingestKey: 'nexus.control.ingestKey',
  token: 'nexus.control.token',
  deviceId: 'nexus.control.deviceId',
}

export const SESSION_KEYS = {
  signingSecret: 'nexus.control.signingSecret',
  token: 'nexus.control.token',
}

export const DEFAULT_API_URL = 'https://youngjibbit95.github.io/Nexus-Ecosystem/'
export const DEFAULT_REQUEST_TIMEOUT_MS = 8_000
export const RUNTIME_CONFIG_PATH = './runtime-config.json'

export const DEFAULT_RUNTIME_CONFIG = {
  controlApiUrl: DEFAULT_API_URL,
  bootstrapPath: '/api/v1/public/bootstrap',
  privateRepoHint: '',
  forceApiUrl: false,
}

export const ALL_ROLES = ['admin', 'developer', 'viewer', 'agent']
export const MUTATION_ROLES = ['admin', 'developer']
export const PAYWALL_APP_IDS = ['main', 'mobile', 'code', 'code-mobile']

export const TAB_ACCESS = {
  dashboard: ['admin', 'developer', 'viewer', 'agent'],
  build: ['admin', 'developer', 'viewer'],
  livesync: ['admin', 'developer', 'viewer'],
  settings: ['admin', 'developer', 'viewer'],
  commands: ['admin', 'developer', 'viewer', 'agent'],
  policies: ['admin'],
  paywalls: ['admin'],
  devices: ['admin'],
  audit: ['admin', 'developer', 'viewer'],
  guides: ['admin', 'developer', 'viewer', 'agent'],
}
