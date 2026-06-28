import { spawnSync } from 'node:child_process'

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

if (!['all', 'mac', 'win', 'windows', 'android', 'linux', 'checksums', 'feed', 'launcher-feed'].includes(target)) {
  failures.push(`Unknown signing target: ${target}`)
}

if (['all', 'mac', 'win', 'windows', 'linux', 'checksums'].includes(target)) {
  requireAliases(
    [
      [
        'NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM',
        'NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_BASE64',
        'NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_FILE',
        'NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM',
        'NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64',
        'NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE',
      ],
    ],
    'Installer checksum manifest signing',
  )
}

if (['all', 'feed', 'launcher-feed'].includes(target)) {
  requireAliases(
    [
      [
        'NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM',
        'NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64',
        'NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE',
      ],
    ],
    'Launcher feed signing',
  )
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
}

if (targets.includes('android')) {
  const hasKeystoreSource = hasEnv('ANDROID_KEYSTORE_BASE64') || hasEnv('ANDROID_KEYSTORE_FILE')
  if (!hasKeystoreSource) {
    markMissing('ANDROID_KEYSTORE_BASE64 or ANDROID_KEYSTORE_FILE', 'Android signing')
  }
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

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}
