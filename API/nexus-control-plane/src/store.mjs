import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APP_IDS,
  defaultGlobalConfig,
  defaultPolicies,
  normalizeAppId,
  validateConfigPatch,
  validatePolicyDocument,
} from '../../schemas/src/contracts.mjs'
import { createAccessToken, hashSecret, verifySecret } from './security.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../data')
const DEFAULT_GUIDES_DIR = path.resolve(__dirname, '../guides')

const nowIso = () => new Date().toISOString()

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true })
}

const fileExists = async (file) => {
  try {
    await fs.access(file)
    return true
  } catch {
    return false
  }
}

const readJson = async (file, fallback) => {
  if (!(await fileExists(file))) return fallback
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const writeJson = async (file, value) => {
  await ensureDir(path.dirname(file))
  const next = `${JSON.stringify(value, null, 2)}\n`
  await fs.writeFile(file, next, 'utf8')
}

const defaultUsers = () => ([
  {
    id: 'u_admin',
    username: 'admin',
    role: 'admin',
    passwordHash: hashSecret('change-me-now'),
  },
  {
    id: 'u_dev',
    username: 'developer',
    role: 'developer',
    passwordHash: hashSecret('developer-local'),
  },
  {
    id: 'u_viewer',
    username: 'viewer',
    role: 'viewer',
    passwordHash: hashSecret('viewer-local'),
  },
])

const normalizeDeviceId = (value) => String(value || '').replace(/[^a-z0-9\-_:.]/gi, '').slice(0, 120)

export class ControlPlaneStore {
  constructor(options = {}) {
    this.dataDir = options.dataDir || process.env.NEXUS_CONTROL_DATA_DIR || DEFAULT_DATA_DIR
    this.guidesDir = options.guidesDir || process.env.NEXUS_CONTROL_GUIDES_DIR || DEFAULT_GUIDES_DIR

    this.files = {
      users: path.join(this.dataDir, 'users.json'),
      globalConfig: path.join(this.dataDir, 'global-config.json'),
      appConfig: path.join(this.dataDir, 'app-config.json'),
      policies: path.join(this.dataDir, 'policies.json'),
      auditLog: path.join(this.dataDir, 'audit-log.json'),
      commands: path.join(this.dataDir, 'commands.json'),
      registry: path.join(this.dataDir, 'registry.json'),
      devices: path.join(this.dataDir, 'devices.json'),
    }

    this.sessions = new Map()
    this.commandIdempotency = new Map()

    this.users = []
    this.globalConfig = defaultGlobalConfig()
    this.appConfig = {}
    this.policies = defaultPolicies()
    this.auditLog = []
    this.commands = []
    this.registry = {}
    this.devices = []
  }

  async init() {
    await ensureDir(this.dataDir)
    await ensureDir(this.guidesDir)

    this.users = await readJson(this.files.users, defaultUsers())
    this.globalConfig = await readJson(this.files.globalConfig, defaultGlobalConfig())
    this.appConfig = await readJson(this.files.appConfig, {})

    const rawPolicies = await readJson(this.files.policies, defaultPolicies())
    const policiesCheck = validatePolicyDocument(rawPolicies)
    this.policies = policiesCheck.ok ? policiesCheck.value : defaultPolicies()

    this.auditLog = await readJson(this.files.auditLog, [])
    this.commands = await readJson(this.files.commands, [])
    this.registry = await readJson(this.files.registry, {})
    this.devices = await readJson(this.files.devices, [])

    await this.persistAll()
  }

  async persistAll() {
    await Promise.all([
      writeJson(this.files.users, this.users),
      writeJson(this.files.globalConfig, this.globalConfig),
      writeJson(this.files.appConfig, this.appConfig),
      writeJson(this.files.policies, this.policies),
      writeJson(this.files.auditLog, this.auditLog.slice(-2_000)),
      writeJson(this.files.commands, this.commands.slice(-2_000)),
      writeJson(this.files.registry, this.registry),
      writeJson(this.files.devices, this.devices),
    ])
  }

  cleanupSessions() {
    const now = Date.now()
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token)
      }
    }

    for (const [key, record] of this.commandIdempotency.entries()) {
      if (record.expiresAt <= now) {
        this.commandIdempotency.delete(key)
      }
    }
  }

  async addAudit(entry) {
    this.auditLog.push({
      id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      at: nowIso(),
      ...entry,
    })

    if (this.auditLog.length > 2_000) {
      this.auditLog.splice(0, this.auditLog.length - 2_000)
    }

    await writeJson(this.files.auditLog, this.auditLog)
  }

  authenticate(username, password) {
    const user = this.users.find((candidate) => candidate.username === username)
    if (!user) return null
    if (!verifySecret(password, user.passwordHash)) return null

    const token = createAccessToken()
    const expiresAt = Date.now() + 12 * 60 * 60 * 1_000
    this.sessions.set(token, {
      userId: user.id,
      username: user.username,
      role: user.role,
      expiresAt,
    })

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }
  }

  getSession(token) {
    if (!token) return null
    this.cleanupSessions()
    return this.sessions.get(token) ?? null
  }

  revokeSession(token) {
    this.sessions.delete(token)
  }

  listDevices(limit = 500) {
    return this.devices.slice(-limit).reverse()
  }

  hasApprovedDeviceForRole(role) {
    return this.devices.some((device) => (
      device.status === 'approved'
      && Array.isArray(device.roleScopes)
      && device.roleScopes.includes(role)
    ))
  }

  isDeviceApprovedForRole(deviceId, role) {
    const normalized = normalizeDeviceId(deviceId)
    if (!normalized) return false

    return this.devices.some((device) => (
      device.deviceId === normalized
      && device.status === 'approved'
      && Array.isArray(device.roleScopes)
      && device.roleScopes.includes(role)
    ))
  }

  async markDeviceSeen(deviceId, context = {}) {
    const normalized = normalizeDeviceId(deviceId)
    if (!normalized) return null

    const role = String(context.role || 'viewer')
    const username = String(context.username || 'unknown')
    const label = String(context.label || 'Unlabeled Device').slice(0, 80)

    const existing = this.devices.find((device) => device.deviceId === normalized)
    if (existing) {
      existing.lastSeenAt = nowIso()
      existing.lastSeenBy = username
      existing.roleScopes = Array.isArray(existing.roleScopes) ? existing.roleScopes : []
      if (!existing.roleScopes.includes(role)) {
        existing.roleScopes.push(role)
      }
      await writeJson(this.files.devices, this.devices)
      return existing
    }

    const pending = {
      deviceId: normalized,
      label,
      status: 'pending',
      roleScopes: [role],
      approvedBy: null,
      approvedAt: null,
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      lastSeenBy: username,
    }

    this.devices.push(pending)
    await writeJson(this.files.devices, this.devices)
    return pending
  }

  async approveDevice(input, actor) {
    const deviceId = normalizeDeviceId(input.deviceId)
    if (!deviceId) {
      return { ok: false, errors: ['ungueltige deviceId'] }
    }

    const roleScopes = Array.isArray(input.roleScopes)
      ? input.roleScopes.filter((role) => ['admin', 'developer', 'viewer', 'agent'].includes(role))
      : ['admin', 'developer']

    const label = String(input.label || 'Approved Device').slice(0, 80)
    const now = nowIso()
    const existing = this.devices.find((device) => device.deviceId === deviceId)

    if (existing) {
      existing.status = 'approved'
      existing.label = label || existing.label
      existing.roleScopes = roleScopes.length > 0 ? roleScopes : ['admin', 'developer']
      existing.approvedBy = actor
      existing.approvedAt = now
      existing.lastSeenAt = now
    } else {
      this.devices.push({
        deviceId,
        label,
        status: 'approved',
        roleScopes: roleScopes.length > 0 ? roleScopes : ['admin', 'developer'],
        approvedBy: actor,
        approvedAt: now,
        createdAt: now,
        lastSeenAt: now,
        lastSeenBy: actor,
      })
    }

    await writeJson(this.files.devices, this.devices)
    return { ok: true, value: this.devices.find((device) => device.deviceId === deviceId) ?? null }
  }

  async revokeDevice(deviceId, actor) {
    const normalized = normalizeDeviceId(deviceId)
    if (!normalized) {
      return { ok: false, errors: ['ungueltige deviceId'] }
    }

    const existing = this.devices.find((device) => device.deviceId === normalized)
    if (!existing) {
      return { ok: false, errors: ['device nicht gefunden'] }
    }

    existing.status = 'revoked'
    existing.revokedBy = actor
    existing.revokedAt = nowIso()

    await writeJson(this.files.devices, this.devices)
    return { ok: true, value: existing }
  }

  listApps() {
    const fallback = APP_IDS.filter((id) => id !== 'control').map((appId) => ({
      appId,
      status: 'unknown',
      lastSeenAt: null,
      stale: true,
      appVersion: null,
      lastNavigation: null,
      eventCount: 0,
    }))

    const entries = Object.values(this.registry)
    if (entries.length === 0) return fallback

    const staleAfterMs = this.globalConfig?.runtime?.staleAfterMs ?? 45_000
    const now = Date.now()

    return entries
      .map((entry) => ({
        ...entry,
        stale: !entry.lastSeenAt || now - entry.lastSeenAt > staleAfterMs,
      }))
      .sort((a, b) => a.appId.localeCompare(b.appId))
  }

  getApp(appId) {
    const id = normalizeAppId(appId)
    if (!id) return null
    const entries = this.listApps()
    return entries.find((entry) => entry.appId === id) ?? null
  }

  getPolicies() {
    return this.policies
  }

  async updatePolicies(payload, actor) {
    const check = validatePolicyDocument(payload)
    if (!check.ok) {
      return { ok: false, errors: check.errors }
    }

    this.policies = check.value
    await writeJson(this.files.policies, this.policies)
    await this.addAudit({
      action: 'policies.update',
      actor,
      details: {
        changedKeys: Object.keys(this.policies),
      },
    })

    return { ok: true, value: this.policies }
  }

  getGlobalConfig() {
    return this.globalConfig
  }

  async updateGlobalConfig(payload, actor) {
    const check = validateConfigPatch(payload)
    if (!check.ok) {
      return { ok: false, errors: check.errors }
    }

    this.globalConfig = {
      ...this.globalConfig,
      ...check.value,
      flags: { ...this.globalConfig.flags, ...check.value.flags },
      telemetry: { ...this.globalConfig.telemetry, ...check.value.telemetry },
      ui: { ...this.globalConfig.ui, ...check.value.ui },
      runtime: { ...this.globalConfig.runtime, ...check.value.runtime },
    }

    await writeJson(this.files.globalConfig, this.globalConfig)
    await this.addAudit({
      action: 'config.global.update',
      actor,
      details: {
        changedScopes: Object.keys(check.value),
      },
    })

    return { ok: true, value: this.globalConfig }
  }

  getAppConfig(appId) {
    const id = normalizeAppId(appId)
    if (!id) return null

    return this.appConfig[id] ?? {
      flags: {},
      telemetry: {},
      ui: {},
      runtime: {},
    }
  }

  async updateAppConfig(appId, payload, actor) {
    const id = normalizeAppId(appId)
    if (!id) return { ok: false, errors: ['ungueltige appId'] }

    const check = validateConfigPatch(payload)
    if (!check.ok) {
      return { ok: false, errors: check.errors }
    }

    const current = this.getAppConfig(id)
    const next = {
      ...current,
      ...check.value,
      flags: { ...current.flags, ...check.value.flags },
      telemetry: { ...current.telemetry, ...check.value.telemetry },
      ui: { ...current.ui, ...check.value.ui },
      runtime: { ...current.runtime, ...check.value.runtime },
    }

    this.appConfig[id] = next
    await writeJson(this.files.appConfig, this.appConfig)
    await this.addAudit({
      action: 'config.app.update',
      actor,
      details: {
        appId: id,
        changedScopes: Object.keys(check.value),
      },
    })

    return { ok: true, value: next }
  }

  async createCommand(commandInput, actor, idempotencyKey = '') {
    const dedupeKey = idempotencyKey.trim()
    if (dedupeKey) {
      const cached = this.commandIdempotency.get(dedupeKey)
      if (cached && cached.expiresAt > Date.now()) {
        return { ok: true, value: cached.command, deduped: true }
      }
    }

    const command = {
      id: `cmd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: nowIso(),
      status: 'queued',
      actor,
      ...commandInput,
    }

    this.commands.push(command)
    if (this.commands.length > 2_000) {
      this.commands.splice(0, this.commands.length - 2_000)
    }

    if (dedupeKey) {
      this.commandIdempotency.set(dedupeKey, {
        command,
        expiresAt: Date.now() + 15 * 60 * 1_000,
      })
    }

    await writeJson(this.files.commands, this.commands)
    await this.addAudit({
      action: 'command.create',
      actor,
      details: {
        commandId: command.id,
        targetAppId: command.targetAppId,
        type: command.type,
        dedupeKey: dedupeKey || null,
      },
    })

    return { ok: true, value: command, deduped: false }
  }

  listCommands(limit = 100) {
    return this.commands.slice(-limit).reverse()
  }

  listAudit(limit = 200) {
    return this.auditLog.slice(-limit).reverse()
  }

  async ingestEventBatch(batch) {
    for (const event of batch.events) {
      const appId = event.source
      const current = this.registry[appId] ?? {
        appId,
        status: 'online',
        lastSeenAt: 0,
        appVersion: batch.appVersion,
        lastNavigation: null,
        eventCount: 0,
        lastEventType: null,
        metrics: {
          viewRenderMsAvg: null,
          longTaskCount: 0,
          metricCount: 0,
        },
      }

      current.lastSeenAt = event.timestamp
      current.appVersion = batch.appVersion
      current.lastEventType = event.type
      current.eventCount += 1

      if (event.type === 'heartbeat') {
        const status = event.payload?.status
        current.status = typeof status === 'string' ? status : 'online'
      }

      if (event.type === 'navigation') {
        const route = event.payload?.route
        if (typeof route === 'string') {
          current.lastNavigation = route
        }
      }

      if (event.type === 'performance-metric') {
        const metricValue = Number(event.payload?.value)
        const metricType = String(event.payload?.type || '')

        current.metrics.metricCount += 1

        if (metricType === 'view-render' && Number.isFinite(metricValue)) {
          const prev = current.metrics.viewRenderMsAvg
          if (typeof prev !== 'number' || !Number.isFinite(prev)) {
            current.metrics.viewRenderMsAvg = metricValue
          } else {
            current.metrics.viewRenderMsAvg = Number(((prev * 0.8) + (metricValue * 0.2)).toFixed(2))
          }
        }

        if (metricType === 'long-task') {
          current.metrics.longTaskCount += 1
        }
      }

      this.registry[appId] = current
    }

    await writeJson(this.files.registry, this.registry)
    return { ok: true, count: batch.events.length }
  }

  getMetricsSummary() {
    const apps = this.listApps()
    const metrics = {
      totalApps: apps.length,
      onlineApps: apps.filter((app) => !app.stale).length,
      staleApps: apps.filter((app) => app.stale).length,
      totalEvents: apps.reduce((sum, app) => sum + (app.eventCount ?? 0), 0),
      longTaskEvents: apps.reduce((sum, app) => sum + (app.metrics?.longTaskCount ?? 0), 0),
      averageViewRenderMs: null,
    }

    const viewMetrics = apps
      .map((app) => app.metrics?.viewRenderMsAvg)
      .filter((value) => typeof value === 'number' && Number.isFinite(value))

    if (viewMetrics.length > 0) {
      const avg = viewMetrics.reduce((sum, value) => sum + value, 0) / viewMetrics.length
      metrics.averageViewRenderMs = Number(avg.toFixed(2))
    }

    return metrics
  }

  async listGuides() {
    const files = await fs.readdir(this.guidesDir, { withFileTypes: true })
    return files
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => {
        const id = entry.name.replace(/\.md$/i, '')
        return {
          id,
          title: id.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
          fileName: entry.name,
        }
      })
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  async getGuide(id) {
    const safeId = String(id || '').replace(/[^a-z0-9\-_]/gi, '')
    if (!safeId) return null
    const file = path.join(this.guidesDir, `${safeId}.md`)
    if (!(await fileExists(file))) return null

    const content = await fs.readFile(file, 'utf8')
    return {
      id: safeId,
      content,
    }
  }
}
