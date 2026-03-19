import http from 'node:http'
import net from 'node:net'
import { URL } from 'node:url'
import {
  normalizeAppId,
  validateCommandInput,
  validateEventBatch,
} from '../../schemas/src/contracts.mjs'
import {
  asJson,
  getBearerToken,
  normalizeOrigin,
  readJsonBody,
  SlidingWindowRateLimiter,
} from './security.mjs'
import { ControlPlaneStore } from './store.mjs'

const DEFAULT_PORT = 4399
const rawPort = Number(process.env.NEXUS_CONTROL_PORT || DEFAULT_PORT)
const PORT = Number.isInteger(rawPort) && rawPort > 0 && rawPort <= 65535 ? rawPort : DEFAULT_PORT

const requestedHost = String(process.env.NEXUS_CONTROL_HOST || '127.0.0.1').trim()
const loopbackHosts = new Set(['127.0.0.1', 'localhost'])
const HOST = loopbackHosts.has(requestedHost) ? '127.0.0.1' : '127.0.0.1'

if (!loopbackHosts.has(requestedHost)) {
  console.warn(`[security] Ignoriere NEXUS_CONTROL_HOST=${requestedHost}. Erzwinge 127.0.0.1`)
}

const assertPortAvailable = (port, host) => new Promise((resolve, reject) => {
  const probe = net.createServer()

  probe.once('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      reject(new Error(`Port ${port} auf ${host} ist bereits belegt`))
      return
    }
    reject(error)
  })

  probe.once('listening', () => {
    probe.close((closeError) => {
      if (closeError) {
        reject(closeError)
        return
      }
      resolve(true)
    })
  })

  probe.listen(port, host)
})

const store = new ControlPlaneStore()
await store.init()

const limiter = new SlidingWindowRateLimiter(store.getPolicies().rateLimitPerMinute, 60_000)

const splitPath = (pathname) => pathname.split('/').filter(Boolean)

const withCors = (req, headers = {}) => {
  const policies = store.getPolicies()
  const origin = normalizeOrigin(req.headers.origin)
  const trusted = policies.trustedOrigins ?? ['*']

  const allowAny = trusted.includes('*')
  const allowOrigin = allowAny || (origin && trusted.includes(origin))

  return {
    'Access-Control-Allow-Origin': allowOrigin ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-Nexus-App-Id, X-Nexus-Ingest-Key, X-Nexus-Device-Id, X-Nexus-Device-Label',
    'Access-Control-Max-Age': '600',
    ...headers,
  }
}

const reject = (req, res, status, error, details = null) => asJson(
  res,
  status,
  {
    ok: false,
    error,
    details,
    at: new Date().toISOString(),
  },
  withCors(req),
)

const allowIngest = (req, body) => {
  const policies = store.getPolicies()

  const token = getBearerToken(req)
  const session = store.getSession(token)
  if (session && ['admin', 'developer', 'agent'].includes(session.role)) {
    return { ok: true, actor: `${session.username}:${session.role}` }
  }

  const appId = normalizeAppId(body?.appId)
  const ingestKey = String(req.headers['x-nexus-ingest-key'] || '')

  if (appId && ingestKey && policies.ingestKeys?.[appId] === ingestKey) {
    return { ok: true, actor: `app:${appId}` }
  }

  if (policies.allowAnonymousIngest) {
    return { ok: true, actor: `anonymous:${appId || 'unknown'}` }
  }

  return { ok: false, actor: null }
}

const requireSession = (req, res, roles = []) => {
  const token = getBearerToken(req)
  const session = store.getSession(token)
  if (!session) {
    reject(req, res, 401, 'UNAUTHORIZED', 'token fehlt oder abgelaufen')
    return null
  }

  if (roles.length > 0 && !roles.includes(session.role)) {
    reject(req, res, 403, 'FORBIDDEN', `Rolle ${session.role} ist nicht erlaubt`)
    return null
  }

  return session
}

const normalizeUsername = (value) => String(value || '').trim().toLowerCase()

const requireMutationSession = (req, res, roles = [], scope = 'mutation') => {
  const session = requireSession(req, res, roles)
  if (!session) return null

  const policies = store.getPolicies()
  const restrictToOwner = policies.restrictMutationsToOwner !== false
  if (!restrictToOwner) return session

  const ownerUsernames = Array.isArray(policies.ownerUsernames)
    ? policies.ownerUsernames.map((value) => normalizeUsername(value)).filter(Boolean)
    : ['youngjibbit']

  const isOwner = ownerUsernames.includes(normalizeUsername(session.username))
  if (isOwner) return session

  reject(req, res, 403, 'OWNER_ONLY_MUTATION', {
    scope,
    username: session.username,
  })
  return null
}

const parseLimit = (searchParams, fallback, max = 1000) => {
  const raw = Number(searchParams.get('limit') || fallback)
  if (!Number.isFinite(raw)) return fallback
  return Math.max(1, Math.min(max, Math.floor(raw)))
}

const readDeviceId = (req) => String(req.headers['x-nexus-device-id'] || '').replace(/[^a-z0-9\-_:.]/gi, '').slice(0, 120)
const readDeviceLabel = (req) => String(req.headers['x-nexus-device-label'] || '').slice(0, 80)

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = url.pathname
    const parts = splitPath(pathname)

    const rateKey = `${req.socket.remoteAddress || 'unknown'}:${req.headers.authorization || 'anon'}`
    limiter.setLimit(store.getPolicies().rateLimitPerMinute)
    const rateCheck = limiter.check(rateKey)

    if (!rateCheck.ok) {
      return reject(req, res, 429, 'RATE_LIMITED', {
        retryAfterMs: rateCheck.retryAfterMs,
      })
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, withCors(req))
      res.end()
      return
    }

    if (req.method === 'GET' && pathname === '/health') {
      return asJson(res, 200, {
        ok: true,
        status: 'healthy',
        uptimeSec: Math.floor(process.uptime()),
        now: new Date().toISOString(),
      }, withCors(req))
    }

    if (req.method === 'POST' && pathname === '/auth/login') {
      const body = await readJsonBody(req)
      const username = String(body.username || '').trim()
      const password = String(body.password || '')
      const deviceId = readDeviceId(req)
      const deviceLabel = readDeviceLabel(req)

      if (!username || !password) {
        return reject(req, res, 400, 'BAD_REQUEST', 'username und password sind erforderlich')
      }

      const auth = store.authenticate(username, password)
      if (!auth) {
        await store.addAudit({
          action: 'auth.login.failed',
          actor: `user:${username}`,
          details: { reason: 'invalid credentials' },
        })

        return reject(req, res, 401, 'INVALID_CREDENTIALS', null)
      }

      const policies = store.getPolicies()
      const rolesNeedingVerifiedDevice = Array.isArray(policies.requireVerifiedDeviceForRoles)
        ? policies.requireVerifiedDeviceForRoles
        : ['admin', 'developer']

      const roleNeedsVerifiedDevice = rolesNeedingVerifiedDevice.includes(auth.user.role)

      if (!deviceId) {
        await store.addAudit({
          action: 'auth.login.blocked.no-device-id',
          actor: `user:${auth.user.username}`,
          details: { role: auth.user.role },
        })

        store.revokeSession(auth.token)
        return reject(req, res, 400, 'DEVICE_ID_REQUIRED', 'X-Nexus-Device-Id Header fehlt')
      }

      await store.markDeviceSeen(deviceId, {
        role: auth.user.role,
        username: auth.user.username,
        label: deviceLabel || `${auth.user.username}-device`,
      })

      if (roleNeedsVerifiedDevice) {
        const approved = store.isDeviceApprovedForRole(deviceId, auth.user.role)
        if (!approved) {
          const canBootstrapAdmin = (
            auth.user.role === 'admin'
            && policies.allowFirstAdminDeviceBootstrap
            && !store.hasApprovedDeviceForRole('admin')
          )

          if (canBootstrapAdmin) {
            await store.approveDevice({
              deviceId,
              label: deviceLabel || 'Bootstrap Admin Device',
              roleScopes: ['admin', 'developer'],
            }, 'system:bootstrap')

            await store.addAudit({
              action: 'device.bootstrap.approved',
              actor: 'system:bootstrap',
              details: {
                deviceId,
                roleScopes: ['admin', 'developer'],
              },
            })
          } else {
            await store.addAudit({
              action: 'auth.login.blocked.unverified-device',
              actor: `user:${auth.user.username}`,
              details: {
                role: auth.user.role,
                deviceId,
              },
            })

            store.revokeSession(auth.token)
            return reject(req, res, 403, 'DEVICE_NOT_VERIFIED', 'Dieses Geraet ist nicht fuer diese Rolle freigeschaltet')
          }
        }
      }

      const currentSession = store.getSession(auth.token)
      if (currentSession) {
        currentSession.deviceId = deviceId
      }

      await store.addAudit({
        action: 'auth.login.success',
        actor: `user:${auth.user.username}`,
        details: {
          role: auth.user.role,
          deviceId,
        },
      })

      return asJson(res, 200, {
        ok: true,
        token: auth.token,
        expiresAt: auth.expiresAt,
        user: auth.user,
        deviceId,
      }, withCors(req))
    }

    if (req.method === 'POST' && pathname === '/auth/logout') {
      const token = getBearerToken(req)
      const session = store.getSession(token)
      if (token) {
        store.revokeSession(token)
      }
      if (session) {
        await store.addAudit({
          action: 'auth.logout',
          actor: `user:${session.username}`,
          details: { role: session.role },
        })
      }
      return asJson(res, 200, { ok: true }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/session') {
      const session = requireSession(req, res)
      if (!session) return

      return asJson(res, 200, {
        ok: true,
        session: {
          username: session.username,
          role: session.role,
          expiresAt: session.expiresAt,
          deviceId: session.deviceId || null,
        },
      }, withCors(req))
    }

    if (req.method === 'POST' && pathname === '/api/v1/events/batch') {
      const body = await readJsonBody(req)
      const ingest = allowIngest(req, body)
      if (!ingest.ok) {
        return reject(req, res, 401, 'INGEST_UNAUTHORIZED', 'ungueltiger ingest key oder token')
      }

      const parsed = validateEventBatch(body)
      if (!parsed.ok) {
        return reject(req, res, 400, 'INVALID_EVENT_BATCH', parsed.errors)
      }

      const policies = store.getPolicies()
      if (parsed.value.events.length > policies.maxEventsPerBatch) {
        return reject(req, res, 400, 'EVENT_BATCH_TOO_LARGE', {
          maxEventsPerBatch: policies.maxEventsPerBatch,
        })
      }

      const saved = await store.ingestEventBatch(parsed.value)
      await store.addAudit({
        action: 'events.batch.ingest',
        actor: ingest.actor,
        details: {
          appId: parsed.value.appId,
          eventCount: parsed.value.events.length,
        },
      })

      return asJson(res, 202, {
        ok: true,
        accepted: saved.count,
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/apps') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer', 'agent'])
      if (!session) return

      return asJson(res, 200, {
        ok: true,
        items: store.listApps(),
      }, withCors(req))
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'apps' && parts[3]) {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer', 'agent'])
      if (!session) return

      const app = store.getApp(parts[3])
      if (!app) {
        return reject(req, res, 404, 'NOT_FOUND', 'App nicht gefunden')
      }

      return asJson(res, 200, {
        ok: true,
        item: app,
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/config/global') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer'])
      if (!session) return

      return asJson(res, 200, {
        ok: true,
        item: store.getGlobalConfig(),
      }, withCors(req))
    }

    if (req.method === 'PUT' && pathname === '/api/v1/config/global') {
      const session = requireMutationSession(req, res, ['admin', 'developer'], 'config.global.update')
      if (!session) return

      const body = await readJsonBody(req)
      const updated = await store.updateGlobalConfig(body, `user:${session.username}:${session.role}`)
      if (!updated.ok) {
        return reject(req, res, 400, 'INVALID_GLOBAL_CONFIG', updated.errors)
      }

      return asJson(res, 200, {
        ok: true,
        item: updated.value,
      }, withCors(req))
    }

    if (parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'config' && parts[3] === 'apps' && parts[4]) {
      if (req.method === 'GET') {
        const session = requireSession(req, res, ['admin', 'developer', 'viewer'])
        if (!session) return

        const item = store.getAppConfig(parts[4])
        if (!item) {
          return reject(req, res, 404, 'NOT_FOUND', 'App Config nicht gefunden')
        }

        return asJson(res, 200, {
          ok: true,
          appId: parts[4],
          item,
        }, withCors(req))
      }

      if (req.method === 'PUT') {
        const session = requireMutationSession(req, res, ['admin', 'developer'], 'config.app.update')
        if (!session) return

        const body = await readJsonBody(req)
        const updated = await store.updateAppConfig(parts[4], body, `user:${session.username}:${session.role}`)
        if (!updated.ok) {
          return reject(req, res, 400, 'INVALID_APP_CONFIG', updated.errors)
        }

        return asJson(res, 200, {
          ok: true,
          appId: parts[4],
          item: updated.value,
        }, withCors(req))
      }
    }

    if (req.method === 'GET' && pathname === '/api/v1/policies') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer'])
      if (!session) return

      return asJson(res, 200, {
        ok: true,
        item: store.getPolicies(),
      }, withCors(req))
    }

    if (req.method === 'PUT' && pathname === '/api/v1/policies') {
      const session = requireMutationSession(req, res, ['admin'], 'policies.update')
      if (!session) return

      const body = await readJsonBody(req)
      const updated = await store.updatePolicies(body, `user:${session.username}:${session.role}`)
      if (!updated.ok) {
        return reject(req, res, 400, 'INVALID_POLICIES', updated.errors)
      }

      return asJson(res, 200, {
        ok: true,
        item: updated.value,
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/devices') {
      const session = requireSession(req, res, ['admin', 'developer'])
      if (!session) return

      const limit = parseLimit(url.searchParams, 300, 2_000)
      return asJson(res, 200, {
        ok: true,
        items: store.listDevices(limit),
      }, withCors(req))
    }

    if (req.method === 'POST' && pathname === '/api/v1/devices/approve') {
      const session = requireMutationSession(req, res, ['admin'], 'devices.approve')
      if (!session) return

      const body = await readJsonBody(req)
      const approved = await store.approveDevice({
        deviceId: body.deviceId,
        label: body.label,
        roleScopes: body.roleScopes,
      }, `user:${session.username}:${session.role}`)

      if (!approved.ok) {
        return reject(req, res, 400, 'INVALID_DEVICE_APPROVAL', approved.errors)
      }

      await store.addAudit({
        action: 'device.approved',
        actor: `user:${session.username}:${session.role}`,
        details: {
          deviceId: body.deviceId,
          roleScopes: body.roleScopes,
        },
      })

      return asJson(res, 200, {
        ok: true,
        item: approved.value,
      }, withCors(req))
    }

    if (req.method === 'POST' && pathname === '/api/v1/devices/revoke') {
      const session = requireMutationSession(req, res, ['admin'], 'devices.revoke')
      if (!session) return

      const body = await readJsonBody(req)
      const revoked = await store.revokeDevice(body.deviceId, `user:${session.username}:${session.role}`)

      if (!revoked.ok) {
        return reject(req, res, 400, 'INVALID_DEVICE_REVOKE', revoked.errors)
      }

      await store.addAudit({
        action: 'device.revoked',
        actor: `user:${session.username}:${session.role}`,
        details: {
          deviceId: body.deviceId,
        },
      })

      return asJson(res, 200, {
        ok: true,
        item: revoked.value,
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/metrics/summary') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer', 'agent'])
      if (!session) return

      return asJson(res, 200, {
        ok: true,
        item: store.getMetricsSummary(),
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/commands') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer', 'agent'])
      if (!session) return

      const limit = parseLimit(url.searchParams, 100, 400)
      return asJson(res, 200, {
        ok: true,
        items: store.listCommands(limit),
      }, withCors(req))
    }

    if (req.method === 'POST' && pathname === '/api/v1/commands') {
      const session = requireMutationSession(req, res, ['admin', 'developer'], 'commands.create')
      if (!session) return

      const body = await readJsonBody(req)
      const check = validateCommandInput(body)
      if (!check.ok) {
        return reject(req, res, 400, 'INVALID_COMMAND', check.errors)
      }

      const idempotencyKey = String(req.headers['idempotency-key'] || '')
      const created = await store.createCommand(check.value, `user:${session.username}:${session.role}`, idempotencyKey)

      return asJson(res, created.deduped ? 200 : 201, {
        ok: true,
        deduped: created.deduped,
        item: created.value,
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/audit') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer'])
      if (!session) return

      const limit = parseLimit(url.searchParams, 200, 600)
      return asJson(res, 200, {
        ok: true,
        items: store.listAudit(limit),
      }, withCors(req))
    }

    if (req.method === 'GET' && pathname === '/api/v1/guides') {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer', 'agent'])
      if (!session) return

      const items = await store.listGuides()
      return asJson(res, 200, { ok: true, items }, withCors(req))
    }

    if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'guides' && parts[3]) {
      const session = requireSession(req, res, ['admin', 'developer', 'viewer', 'agent'])
      if (!session) return

      const guide = await store.getGuide(parts[3])
      if (!guide) {
        return reject(req, res, 404, 'NOT_FOUND', 'Guide nicht gefunden')
      }

      return asJson(res, 200, { ok: true, item: guide }, withCors(req))
    }

    return reject(req, res, 404, 'NOT_FOUND', 'Route nicht gefunden')
  } catch (error) {
    if (error?.message === 'REQUEST_TOO_LARGE') {
      return reject(req, res, 413, 'REQUEST_TOO_LARGE', 'Body ueberschreitet das Limit')
    }

    if (error?.message === 'INVALID_JSON') {
      return reject(req, res, 400, 'INVALID_JSON', 'JSON Body ist ungueltig')
    }

    console.error('Control Plane Error', error)
    return reject(req, res, 500, 'INTERNAL_ERROR', 'Unerwarteter Fehler')
  }
})

try {
  await assertPortAvailable(PORT, HOST)
} catch (error) {
  console.error(`Control Plane Start fehlgeschlagen: ${error?.message || 'Port nicht verfuegbar'}`)
  process.exit(1)
}

let shuttingDown = false
const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\nControl Plane shutdown via ${signal}`)
  server.close(() => {
    process.exit(0)
  })
  setTimeout(() => process.exit(0), 1_500).unref()
}

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.error(`Control Plane Start fehlgeschlagen: Port ${PORT} bereits belegt`)
    process.exit(1)
  }
  console.error('Control Plane Server Fehler', error)
  process.exit(1)
})

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

server.listen(PORT, HOST, () => {
  console.log(`Nexus Control Plane laeuft auf http://127.0.0.1:${PORT}`)
})
