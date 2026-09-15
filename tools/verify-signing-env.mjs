import { spawnSync } from 'node:child_process'
import { createPrivateKey } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const args = new Set(process.argv.slice(2))
const targetArg = [...args].find((arg) => arg.startsWith('--target='))
const target = String(targetArg?.split('=')[1] || process.env.NEXUS_SIGNING_TARGET || 'all')
  .trim()
  .toLowerCase()
const required = args.has('--required') || truthy(process.env.NEXUS_SIGNING_REQUIRED)
const notarizeMac = args.has('--notarize-mac') || truthy(process.env.NEXUS_MAC_NOTARIZE) || required

const targets = target === 'all' ? ['mac', 'win', 'android', 'linux'] : [target]
const failures = []
const warnings = []
const checksumKeyAliases = [
  'NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM',
  'NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_BASE64',
  'NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_FILE',
  'NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM',
  'NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64',
  'NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE',
]
const feedKeyAliases = [
  'NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM',
  'NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64',
  'NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE',
]

if (!['all', 'mac', 'win', 'windows', 'android', 'linux', 'checksums', 'feed', 'launcher-feed'].includes(target)) {
  failures.push(`Unknown signing target: ${target}`)
}

if (['all', 'mac', 'win', 'windows', 'linux', 'checksums'].includes(target)) {
  requireAliases(
    [
      checksumKeyAliases,
    ],
    'Installer checksum manifest signing',
  )
  validateP256PrivateKey(checksumKeyAliases, 'Installer checksum manifest signing')
}

if (['all', 'feed', 'launcher-feed'].includes(target)) {
  requireAliases(
    [
      feedKeyAliases,
    ],
    'Launcher feed signing',
  )
  validateP256PrivateKey(feedKeyAliases, 'Launcher feed signing')
}

if (targets.includes('mac')) {
  requireAliases(
    notarizeMac
      ? [
          ['MAC_CSC_LINK', 'CSC_LINK'],
          ['MAC_CSC_KEY_PASSWORD', 'CSC_KEY_PASSWORD'],
          ['APPLE_ID'],
          ['APPLE_APP_SPECIFIC_PASSWORD'],
          ['APPLE_TEAM_ID'],
        ]
      : [
          ['MAC_CSC_LINK', 'CSC_LINK'],
          ['MAC_CSC_KEY_PASSWORD', 'CSC_KEY_PASSWORD'],
        ],
    'macOS signing/notarization',
  )
  validateCertificateSource(['MAC_CSC_LINK', 'CSC_LINK'], 'macOS signing/notarization')

  if (notarizeMac && process.platform === 'darwin') {
    const result = spawnSync('xcrun', ['notarytool', '--version'], {
      stdio: 'ignore',
      shell: false,
    })
    if ((result.status ?? 1) !== 0) {
      failures.push('macOS notarization requires xcrun notarytool on the runner')
    }
  } else if (notarizeMac && process.platform !== 'darwin') {
    warnings.push('notarytool availability can only be checked on macOS runners')
  }
}

if (targets.includes('win') || targets.includes('windows')) {
  requireAliases(
    [
      ['WIN_CSC_LINK', 'CSC_LINK'],
      ['WIN_CSC_KEY_PASSWORD', 'CSC_KEY_PASSWORD'],
    ],
    'Windows code signing',
  )
  validateCertificateSource(['WIN_CSC_LINK', 'CSC_LINK'], 'Windows code signing')
}

if (targets.includes('android')) {
  const hasKeystoreSource = hasEnv('ANDROID_KEYSTORE_BASE64') || hasEnv('ANDROID_KEYSTORE_FILE')
  if (!hasKeystoreSource) {
    markMissing('ANDROID_KEYSTORE_BASE64 or ANDROID_KEYSTORE_FILE', 'Android signing')
  }
  validateBinarySource(
    ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_FILE'],
    'Android signing keystore',
  )
  requireVars(
    ['ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD'],
    'Android signing',
  )
}

if (targets.includes('linux')) {
  warnings.push('Linux artifacts rely on signed checksum metadata and signed launcher feed validation; no platform-native code-signing gate is available')
}

if (failures.length > 0) {
  console.error('[verify-signing-env] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[verify-signing-env] OK target=${target} required=${required ? 'yes' : 'no'}`)
for (const warning of warnings) console.warn(`[verify-signing-env] WARN ${warning}`)

function requireVars(keys, label) {
  for (const key of keys) {
    if (!hasEnv(key)) markMissing(key, label)
  }
}

function requireAliases(groups, label) {
  for (const group of groups) {
    if (!group.some((key) => hasEnv(key))) markMissing(group.join(' or '), label)
  }
}

function markMissing(key, label) {
  const message = `${label}: missing ${key}`
  if (required) {
    failures.push(message)
  } else {
    warnings.push(message)
  }
}

function hasEnv(key) {
  return String(process.env[key] || '').trim().length > 0
}

function firstConfigured(keys) {
  const key = keys.find((candidate) => hasEnv(candidate))
  return key ? { key, value: String(process.env[key]).trim() } : null
}

function decodeBase64(value) {
  const compact = String(value || '').replace(/\s+/g, '')
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) {
    throw new Error('invalid base64 encoding')
  }
  const decoded = Buffer.from(compact, 'base64')
  if (decoded.length === 0) throw new Error('decoded value is empty')
  return decoded
}

function readConfiguredMaterial(configured) {
  if (configured.key.endsWith('_FILE')) {
    const filePath = path.resolve(process.cwd(), configured.value)
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new Error(`file does not exist: ${filePath}`)
    }
    return readFileSync(filePath)
  }
  if (configured.key.endsWith('_BASE64')) return decodeBase64(configured.value)
  return Buffer.from(configured.value.replaceAll('\\n', '\n'), 'utf8')
}

function validateP256PrivateKey(keys, label) {
  const configured = firstConfigured(keys)
  if (!configured) return
  try {
    const privateKey = createPrivateKey(readConfiguredMaterial(configured))
    const curve = String(privateKey.asymmetricKeyDetails?.namedCurve || '').toLowerCase()
    if (privateKey.asymmetricKeyType !== 'ec' || !['prime256v1', 'p-256', 'secp256r1'].includes(curve)) {
      throw new Error('expected an ECDSA P-256 private key')
    }
  } catch (error) {
    failures.push(`${label}: ${configured.key} is invalid (${error.message})`)
  }
}

function validateCertificateSource(keys, label) {
  const configured = firstConfigured(keys)
  if (!configured) return
  const value = configured.value
  try {
    if (/^https:\/\//i.test(value)) return
    if (/^file:\/\//i.test(value)) {
      const filePath = new URL(value)
      if (!existsSync(filePath) || statSync(filePath).size < 64) throw new Error('certificate file is missing or empty')
      return
    }
    if (existsSync(path.resolve(process.cwd(), value))) {
      const stats = statSync(path.resolve(process.cwd(), value))
      if (!stats.isFile() || stats.size < 64) throw new Error('certificate file is empty')
      return
    }
    const payload = value.startsWith('data:') ? value.split(',').slice(1).join(',') : value
    if (decodeBase64(payload).length < 64) throw new Error('decoded certificate is too small')
  } catch (error) {
    failures.push(`${label}: ${configured.key} is not a usable file, HTTPS URL, data URL, or base64 certificate (${error.message})`)
  }
}

function validateBinarySource(keys, label) {
  const configured = firstConfigured(keys)
  if (!configured) return
  try {
    const material = readConfiguredMaterial(configured)
    if (material.length < 64) throw new Error('material is too small')
  } catch (error) {
    failures.push(`${label}: ${configured.key} is invalid (${error.message})`)
  }
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}
