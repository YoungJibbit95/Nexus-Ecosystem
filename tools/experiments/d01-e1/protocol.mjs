// Synthetic experiment protocol. Deliberately not nexus.local.v1 or a domain dispatcher.
import { randomBytes, timingSafeEqual } from 'node:crypto'

export const VERSION = 'nexus.transport.experiment.v1'
export const MAX_FRAME = 8192
export const MAX_CONNECTIONS = 8
export const DEADLINE_MS = 2000
const hex = (value, size) => typeof value === 'string' && value.length === size && new RegExp(`^[0-9a-f]{${size}}$`).test(value)
const keys = (value, names) => Object.keys(value).sort().join(',') === [...names].sort().join(',')
export const encode = value => Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))))
export function decode(bytes) {
  if (!bytes.length || bytes.length > MAX_FRAME) throw new Error('rejected')
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  const value = JSON.parse(text)
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.values(value).some(v => v !== null && !['string', 'number', 'boolean'].includes(typeof v))) throw new Error('rejected')
  // Fixed ASCII, flat records only. Canonical bytes also reject duplicates/BOM/whitespace.
  if (!encode(value).equals(bytes) || !/^[\x20-\x7e]+$/.test(text)) throw new Error('rejected')
  return value
}
export const rejected = () => encode({ version: VERSION, ok: false, error: 'rejected' })
export function createProtocol({ instance = randomBytes(16).toString('hex'), token = randomBytes(32).toString('hex'), now = Date.now } = {}) {
  if (!hex(instance, 32) || !hex(token, 64)) throw new Error('Invalid experiment identity')
  const sessions = new Map(), nonces = new Set()
  let accepted = 0, denied = 0
  const authentic = value => hex(value, 64) && timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(token, 'hex'))
  return {
    instance, token, authentic,
    get counters() { return { accepted, denied, activeSessions: sessions.size } },
    handle(bytes) {
      try {
        const value = decode(bytes)
        if (value.version !== VERSION || value.instance !== instance || !authentic(value.token) || !Number.isSafeInteger(value.id) || value.id < 1 || value.id > 1_000_000) throw new Error('rejected')
        for (const [id, state] of sessions) if (now() >= state.expires) sessions.delete(id)
        if (value.method === 'experiment.hello') {
          if (!keys(value, ['version', 'id', 'method', 'instance', 'token', 'nonce']) || !hex(value.nonce, 32) || nonces.has(value.nonce) || nonces.size >= 1024 || sessions.size >= MAX_CONNECTIONS) throw new Error('rejected')
          const session = randomBytes(16).toString('hex')
          nonces.add(value.nonce)
          sessions.set(session, { seq: 1, expires: now() + 60_000 })
          accepted++
          return encode({ version: VERSION, id: value.id, ok: true, instance, session, maxFrame: MAX_FRAME })
        }
        if (value.method !== 'experiment.echo' || !keys(value, ['version', 'id', 'method', 'instance', 'token', 'session', 'seq', 'payload'])) throw new Error('rejected')
        const state = sessions.get(value.session)
        if (!state || value.seq !== state.seq || state.seq > 128 || typeof value.payload !== 'string' || !/^synthetic:[0-9a-f]{0,4096}$(?![\s\S])/.test(value.payload)) throw new Error('rejected')
        state.seq++
        accepted++
        return encode({ version: VERSION, id: value.id, ok: true, instance, seq: value.seq, payload: value.payload })
      } catch { denied++; return rejected() }
    },
    clear() { sessions.clear(); nonces.clear() },
  }
}
