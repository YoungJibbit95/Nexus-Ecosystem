export const APP_IDS = ['main', 'mobile', 'code', 'code-mobile', 'control']
export const ROLE_IDS = ['admin', 'developer', 'viewer', 'agent']
export const EVENT_TYPES = [
  'heartbeat',
  'state-sync',
  'navigation',
  'performance-metric',
  'performance-summary',
  'custom',
  'command',
  'config-update',
]

export const DEFAULT_TRUSTED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5180',
  'http://localhost:5181',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5180',
  'http://127.0.0.1:5181',
  'capacitor://localhost',
  'ionic://localhost',
]

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
const isString = (value) => typeof value === 'string'
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

const ok = (value) => ({ ok: true, errors: [], value })
const fail = (...errors) => ({ ok: false, errors, value: null })

export const isValidAppId = (value) => APP_IDS.includes(value)
export const isValidRoleId = (value) => ROLE_IDS.includes(value)

export const normalizeAppId = (value) => {
  if (!isString(value)) return null
  return isValidAppId(value) ? value : null
}

export const validateEventEnvelope = (event) => {
  if (!isRecord(event)) return fail('event muss ein Objekt sein')
  if (!isString(event.id) || event.id.length < 6) return fail('event.id ist ungueltig')
  if (!isFiniteNumber(event.timestamp)) return fail('event.timestamp ist ungueltig')
  if (!isString(event.source) || !isValidAppId(event.source)) return fail('event.source ist ungueltig')

  const target = event.target
  if (!isString(target) || !(target === 'all' || isValidAppId(target))) {
    return fail('event.target ist ungueltig')
  }

  if (!isString(event.type) || !EVENT_TYPES.includes(event.type)) {
    return fail('event.type ist ungueltig')
  }

  return ok(event)
}

export const validateEventBatch = (payload) => {
  if (!isRecord(payload)) return fail('payload muss ein Objekt sein')

  const appId = normalizeAppId(payload.appId)
  if (!appId) return fail('payload.appId ist ungueltig')
  if (!isString(payload.appVersion) || payload.appVersion.length === 0) {
    return fail('payload.appVersion ist erforderlich')
  }
  if (!Array.isArray(payload.events)) return fail('payload.events muss ein Array sein')

  const errors = []
  const events = []
  for (let i = 0; i < payload.events.length; i += 1) {
    const check = validateEventEnvelope(payload.events[i])
    if (!check.ok) {
      errors.push(`events[${i}]: ${check.errors.join(', ')}`)
    } else {
      events.push(check.value)
    }
  }

  if (errors.length > 0) {
    return fail(...errors)
  }

  return ok({
    appId,
    appVersion: payload.appVersion,
    sentAt: isFiniteNumber(payload.sentAt) ? payload.sentAt : Date.now(),
    events,
  })
}

export const validateCommandInput = (payload) => {
  if (!isRecord(payload)) return fail('payload muss ein Objekt sein')
  const targetAppId = normalizeAppId(payload.targetAppId)
  if (!targetAppId) return fail('targetAppId ist ungueltig')

  if (!isString(payload.type) || payload.type.length < 3) {
    return fail('type ist ungueltig')
  }

  const command = {
    targetAppId,
    type: payload.type.trim(),
    payload: isRecord(payload.payload) ? payload.payload : {},
    priority: ['low', 'normal', 'high'].includes(payload.priority) ? payload.priority : 'normal',
    ttlMs: isFiniteNumber(payload.ttlMs) ? Math.max(1_000, Math.min(600_000, payload.ttlMs)) : 60_000,
  }

  return ok(command)
}

export const validatePolicyDocument = (payload) => {
  if (!isRecord(payload)) return fail('policy muss ein Objekt sein')

  const allowAnonymousIngest = Boolean(payload.allowAnonymousIngest)
  const maxEventsPerBatch = isFiniteNumber(payload.maxEventsPerBatch)
    ? Math.max(1, Math.min(500, Math.floor(payload.maxEventsPerBatch)))
    : 150
  const rateLimitPerMinute = isFiniteNumber(payload.rateLimitPerMinute)
    ? Math.max(30, Math.min(10_000, Math.floor(payload.rateLimitPerMinute)))
    : 1_200

  const trustedOrigins = Array.isArray(payload.trustedOrigins)
    ? payload.trustedOrigins.filter((origin) => isString(origin) && origin.length > 0)
    : [...DEFAULT_TRUSTED_ORIGINS]

  const ingestKeys = isRecord(payload.ingestKeys)
    ? Object.fromEntries(
      Object.entries(payload.ingestKeys).filter(([appId, key]) => isValidAppId(appId) && isString(key) && key.length >= 8),
    )
    : {}

  const requireVerifiedDeviceForRoles = Array.isArray(payload.requireVerifiedDeviceForRoles)
    ? payload.requireVerifiedDeviceForRoles.filter((role) => isValidRoleId(role))
    : ['admin', 'developer']

  const allowFirstAdminDeviceBootstrap = payload.allowFirstAdminDeviceBootstrap == null
    ? true
    : Boolean(payload.allowFirstAdminDeviceBootstrap)

  const ownerUsernames = Array.isArray(payload.ownerUsernames)
    ? payload.ownerUsernames
      .filter((value) => isString(value))
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => value.toLowerCase())
      .filter((value, index, list) => list.indexOf(value) === index)
    : ['youngjibbit']

  const restrictMutationsToOwner = payload.restrictMutationsToOwner == null
    ? true
    : Boolean(payload.restrictMutationsToOwner)

  return ok({
    allowAnonymousIngest,
    maxEventsPerBatch,
    rateLimitPerMinute,
    trustedOrigins,
    ingestKeys,
    requireVerifiedDeviceForRoles,
    allowFirstAdminDeviceBootstrap,
    ownerUsernames,
    restrictMutationsToOwner,
  })
}

export const validateConfigPatch = (payload) => {
  if (!isRecord(payload)) return fail('config payload muss ein Objekt sein')

  const config = {
    flags: isRecord(payload.flags) ? payload.flags : {},
    telemetry: isRecord(payload.telemetry) ? payload.telemetry : {},
    ui: isRecord(payload.ui) ? payload.ui : {},
    runtime: isRecord(payload.runtime) ? payload.runtime : {},
  }

  return ok(config)
}

export const defaultPolicies = () => ({
  allowAnonymousIngest: false,
  maxEventsPerBatch: 150,
  rateLimitPerMinute: 1_200,
  trustedOrigins: [...DEFAULT_TRUSTED_ORIGINS],
  ingestKeys: {
    main: 'main-local-dev-key',
    mobile: 'mobile-local-dev-key',
    code: 'code-local-dev-key',
    'code-mobile': 'code-mobile-local-dev-key',
  },
  requireVerifiedDeviceForRoles: ['admin', 'developer'],
  allowFirstAdminDeviceBootstrap: true,
  ownerUsernames: ['youngjibbit'],
  restrictMutationsToOwner: true,
})

export const defaultGlobalConfig = () => ({
  flags: {
    enableTelemetry: true,
    enableRuntimeSync: true,
    enableCommandExecution: true,
  },
  telemetry: {
    sampleRate: 1,
    flushIntervalMs: 5_000,
  },
  ui: {
    defaultDensity: 'comfortable',
    defaultFont: 'system-ui',
  },
  runtime: {
    staleAfterMs: 45_000,
    heartbeatMs: 15_000,
  },
})
