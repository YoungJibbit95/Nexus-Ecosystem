import { createHash, randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveApiSource } from './lib/api-source.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const args = process.argv.slice(2)
const command = args[0]

const parseOptions = (argv) => {
  const options = {}
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i]
    if (!part.startsWith('--')) continue
    const key = part.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      options[key] = 'true'
      continue
    }
    options[key] = next
    i += 1
  }
  return options
}

const options = parseOptions(args.slice(1))

const nowIso = () => new Date().toISOString()
const hashSecret = (value) => createHash('sha256').update(String(value)).digest('hex')

const normalizeDeviceId = (value) => String(value || '').replace(/[^a-z0-9\-_:.]/gi, '').slice(0, 120)
const safeUserIdPart = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24)

const resolveDataDir = async () => {
  if (options['data-dir']) {
    return path.resolve(options['data-dir'])
  }

  const source = await resolveApiSource({ root: ROOT, quiet: true })
  return path.join(source.controlPlaneDir, 'data')
}

let files = null

const readJson = async (file, fallback) => {
  try {
    const raw = await fs.readFile(file, 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

const writeJson = async (file, value) => {
  const body = `${JSON.stringify(value, null, 2)}\n`
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, body, 'utf8')
}

const ensureArray = (value) => (Array.isArray(value) ? value : [])

const approveDevice = async ({ deviceId, label = 'Approved Device', roles = ['admin', 'developer'], actor = 'local:security-admin' }) => {
  const normalized = normalizeDeviceId(deviceId)
  if (!normalized) {
    throw new Error('ungueltige --device-id')
  }

  const devices = ensureArray(await readJson(files.devices, []))
  const existing = devices.find((device) => device.deviceId === normalized)
  const approvedAt = nowIso()
  const roleScopes = roles.filter((role) => ['admin', 'developer', 'viewer', 'agent'].includes(role))
  const finalRoles = roleScopes.length > 0 ? roleScopes : ['admin', 'developer']

  if (existing) {
    existing.status = 'approved'
    existing.label = String(label || existing.label || 'Approved Device').slice(0, 80)
    existing.roleScopes = finalRoles
    existing.approvedBy = actor
    existing.approvedAt = approvedAt
    existing.lastSeenAt = approvedAt
    existing.lastSeenBy = actor
  } else {
    devices.push({
      deviceId: normalized,
      label: String(label || 'Approved Device').slice(0, 80),
      status: 'approved',
      roleScopes: finalRoles,
      approvedBy: actor,
      approvedAt,
      createdAt: approvedAt,
      lastSeenAt: approvedAt,
      lastSeenBy: actor,
    })
  }

  await writeJson(files.devices, devices)
  return { deviceId: normalized, roles: finalRoles }
}

const usage = () => {
  console.log('Usage:')
  console.log('  node tools/security-admin.mjs make-admin --username <name> --password <pwd> [--device-id <id>] [--device-label <label>] [--data-dir <path>]')
  console.log('  node tools/security-admin.mjs approve-device --device-id <id> [--roles admin,developer] [--device-label <label>] [--data-dir <path>]')
  console.log('  node tools/security-admin.mjs generate-signing-secret --username <name> [--bytes 32]')
}

const runMakeAdmin = async () => {
  if (options.help === 'true') {
    usage()
    return
  }

  const username = String(options.username || '').trim()
  const password = String(options.password || '')
  const deviceId = String(options['device-id'] || '').trim()
  const deviceLabel = String(options['device-label'] || `${username || 'admin'}-device`).trim()

  if (!username || !password) {
    throw new Error('make-admin benoetigt --username und --password')
  }

  const users = ensureArray(await readJson(files.users, []))
  const existing = users.find((user) => user.username === username)

  if (existing) {
    existing.role = 'admin'
    existing.passwordHash = hashSecret(password)
  } else {
    const suffix = safeUserIdPart(username) || Date.now().toString(36)
    users.push({
      id: `u_${suffix}`,
      username,
      role: 'admin',
      passwordHash: hashSecret(password),
    })
  }

  await writeJson(files.users, users)

  let approved = null
  if (deviceId) {
    approved = await approveDevice({
      deviceId,
      label: deviceLabel,
      roles: ['admin', 'developer'],
      actor: `local:${username}:admin-bootstrap`,
    })
  }

  console.log('Admin user aktualisiert.')
  console.log(`- username: ${username}`)
  console.log('- role: admin')
  if (approved) {
    console.log(`- approved device: ${approved.deviceId}`)
    console.log(`- roles: ${approved.roles.join(',')}`)
  } else {
    console.log('- no device approval performed (kein --device-id)')
  }
}

const runApproveDevice = async () => {
  if (options.help === 'true') {
    usage()
    return
  }

  const deviceId = String(options['device-id'] || '').trim()
  const deviceLabel = String(options['device-label'] || 'Approved Device').trim()
  const roles = String(options.roles || 'admin,developer')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!deviceId) {
    throw new Error('approve-device benoetigt --device-id')
  }

  const approved = await approveDevice({
    deviceId,
    label: deviceLabel,
    roles,
  })

  console.log('Device freigegeben.')
  console.log(`- device: ${approved.deviceId}`)
  console.log(`- roles: ${approved.roles.join(',')}`)
}

const runGenerateSigningSecret = async () => {
  if (options.help === 'true') {
    usage()
    return
  }

  const username = String(options.username || '').trim().toLowerCase()
  const bytesRaw = Number(options.bytes || 32)
  const bytes = Number.isInteger(bytesRaw) ? Math.max(16, Math.min(64, bytesRaw)) : 32

  if (!username) {
    throw new Error('generate-signing-secret benoetigt --username')
  }

  const secret = randomBytes(bytes).toString('base64url')
  console.log('Mutation Signing Secret erzeugt.')
  console.log(`- username: ${username}`)
  console.log(`- bytes: ${bytes}`)
  console.log(`- secret: ${secret}`)
  console.log('\nExport Beispiel (lokal):')
  console.log(`export NEXUS_MUTATION_SIGNING_SECRETS="${username}:${secret}"`)
  console.log('\nMehrere User:')
  console.log(`export NEXUS_MUTATION_SIGNING_SECRETS="youngjibbit:<secret1>,${username}:${secret}"`)
}

const main = async () => {
  const dataDir = await resolveDataDir()
  files = {
    users: path.join(dataDir, 'users.json'),
    devices: path.join(dataDir, 'devices.json'),
  }

  if (!command || command === 'help' || command === '--help') {
    usage()
    return
  }

  if (command === 'make-admin') {
    await runMakeAdmin()
    return
  }

  if (command === 'approve-device') {
    await runApproveDevice()
    return
  }

  if (command === 'generate-signing-secret') {
    await runGenerateSigningSecret()
    return
  }

  usage()
  throw new Error(`Unbekannter Command: ${command}`)
}

main().catch((error) => {
  console.error(`\nSecurity Admin Fehler: ${error.message}`)
  process.exit(1)
})
