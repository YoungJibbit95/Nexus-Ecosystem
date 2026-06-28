import { createHash, createSign } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const args = new Map()
for (const raw of process.argv.slice(2)) {
  const [key, value] = raw.split('=')
  if (key?.startsWith('--')) args.set(key.slice(2), value ?? 'true')
}

const dryRun = args.get('dry-run') === 'true'
const channel = normalizeChannel(args.get('channel') || process.env.NEXUS_LAUNCHER_CHANNEL || 'nightly')
const platform = normalizePlatform(args.get('platform') || process.env.NEXUS_LAUNCHER_PLATFORM || currentPlatform())
const inputRoot = path.resolve(ROOT, args.get('input') || 'build/launcher-artifacts')
const outputPath = path.resolve(ROOT, args.get('out') || `build/launcher-feed/${channel}/${platform}/latest.json`)
const signingKeyId = args.get('signing-key-id') || process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_ID || 'nexus-launcher-feed-p256-v1'
const allowUnsignedDev = boolArg(args.get('allow-unsigned-dev') || process.env.NEXUS_LAUNCHER_ALLOW_UNSIGNED_DEV_FEED)
const SIGNATURE_ALGORITHM = 'ECDSA_P256_SHA256'
const API_BROKERED_DOWNLOAD_MODE = 'api-brokered'

const APPS = [
  { appId: 'main', name: 'Nexus Main', version: '6.0.0', requiredTier: 'free', selfUpdate: false },
  { appId: 'code', name: 'Nexus Code', version: '1.0.0', requiredTier: 'pro', selfUpdate: false },
  { appId: 'launcher', name: 'Nexus Launcher', version: '1.0.0', requiredTier: 'free', selfUpdate: true },
]

const main = async () => {
  const items = []
  for (const app of APPS) {
    const artifact = await discoverArtifact(app)
    if (!artifact && !dryRun) {
      throw new Error(`Missing launcher artifact for ${app.appId} at ${inputRoot}`)
    }

    items.push({
      appId: app.appId,
      name: app.name,
      version: app.version,
      commit: process.env.GITHUB_SHA || 'local',
      channel,
      platform,
      requiredTier: app.requiredTier,
      selfUpdate: app.selfUpdate,
      artifact: artifact || placeholderArtifact(app),
      releaseNotes: {
        title: `${app.name} ${app.version}`,
        summary: dryRun
          ? 'Dry-run feed placeholder.'
          : `Generated from ${path.relative(ROOT, inputRoot)}.`,
        highlights: [
          'User-scope install target',
          'API-brokered download authorization',
          'Signed update feed metadata',
        ],
      },
    })
  }

  const feed = {
    schemaVersion: 1,
    channel,
    platform,
    publishedAt: new Date().toISOString(),
    items,
  }

  if (!dryRun) {
    validateFeedForSigning(feed)
    if (allowUnsignedDev && process.env.GITHUB_ACTIONS) {
      throw new Error('Unsigned launcher feeds are not allowed in GitHub Actions. Provide a launcher feed signing key instead.')
    }

    const signingKey = await readSigningKey()
    if (signingKey) {
      feed.signature = signFeed(feed, signingKey)
    } else if (!allowUnsignedDev) {
      throw new Error('Missing launcher feed signing key. Set NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM, NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64, or NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE; use --allow-unsigned-dev=true only for loopback development feeds.')
    } else {
      console.warn('[launcher-feed] writing unsigned development feed because --allow-unsigned-dev=true was set')
    }
  }

  if (dryRun) {
    console.log(JSON.stringify(feed, null, 2))
    return
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(feed, null, 2)}\n`, 'utf8')
  console.log(`[launcher-feed] wrote ${path.relative(ROOT, outputPath)}`)
}

const discoverArtifact = async (app) => {
  const candidates = [
    path.join(inputRoot, app.appId, platform),
    path.join(inputRoot, platform, app.appId),
    path.join(inputRoot, platform),
  ]

  for (const dir of candidates) {
    if (!existsSync(dir)) continue
    const files = (await readdir(dir))
      .filter((file) => !file.toLowerCase().includes('sha256'))
      .filter((file) => artifactExtensionMatches(file))
    for (const file of files) {
      const fullPath = path.join(dir, file)
      const stats = await stat(fullPath)
      if (!stats.isFile()) continue
      return {
        id: `${app.appId}-${channel}-${platform}-${app.version}`.replaceAll('.', '-'),
        fileName: file,
        kind: artifactKind(platform),
        sizeBytes: stats.size,
        sha256: await sha256(fullPath),
        downloadMode: 'api-brokered',
        cachePath: fullPath,
      }
    }
  }

  return null
}

const placeholderArtifact = (app) => ({
  id: `${app.appId}-${channel}-${platform}-${app.version}`.replaceAll('.', '-'),
  fileName: `${app.appId}-${platform}.placeholder`,
  kind: artifactKind(platform),
  sizeBytes: 0,
  sha256: '0'.repeat(64),
  downloadMode: 'api-brokered',
  cachePath: null,
})

const sha256 = async (filePath) => {
  const hash = createHash('sha256')
  hash.update(await readFile(filePath))
  return hash.digest('hex')
}

async function readSigningKey() {
  const inlinePem = args.get('signing-key-pem') || process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM
  if (inlinePem) return inlinePem.replaceAll('\\n', '\n')

  const inlineBase64 = args.get('signing-key-base64') || process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64
  if (inlineBase64) return Buffer.from(inlineBase64, 'base64').toString('utf8')

  const keyFile = args.get('signing-key-file') || process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE
  if (keyFile) return readFile(path.resolve(ROOT, keyFile), 'utf8')

  return null
}

function signFeed(feed, privateKeyPem) {
  const signer = createSign('SHA256')
  signer.update(Buffer.from(canonicalLauncherFeed(feed), 'utf8'))
  signer.end()
  return {
    algorithm: SIGNATURE_ALGORITHM,
    keyId: signingKeyId,
    signature: signer.sign(privateKeyPem).toString('base64url'),
    signedAt: new Date().toISOString(),
  }
}

function canonicalLauncherFeed(feed) {
  const chunks = []
  appendField(chunks, 'schemaVersion', String(feed.schemaVersion))
  appendField(chunks, 'channel', feed.channel)
  appendField(chunks, 'platform', feed.platform)
  appendField(chunks, 'publishedAtUnixMs', String(Date.parse(feed.publishedAt)))

  const items = [...feed.items].sort((left, right) => compareOrdinal(
    `${left.appId}\0${left.artifact?.id || ''}`,
    `${right.appId}\0${right.artifact?.id || ''}`,
  ))
  appendField(chunks, 'itemCount', String(items.length))

  items.forEach((item, index) => {
    const prefix = `item.${index}.`
    appendField(chunks, `${prefix}appId`, item.appId)
    appendField(chunks, `${prefix}name`, item.name)
    appendField(chunks, `${prefix}version`, item.version)
    appendField(chunks, `${prefix}commit`, item.commit)
    appendField(chunks, `${prefix}channel`, item.channel)
    appendField(chunks, `${prefix}platform`, item.platform)
    appendField(chunks, `${prefix}requiredTier`, item.requiredTier)
    appendField(chunks, `${prefix}selfUpdate`, item.selfUpdate ? 'true' : 'false')
    appendField(chunks, `${prefix}artifact.id`, item.artifact?.id)
    appendField(chunks, `${prefix}artifact.fileName`, item.artifact?.fileName)
    appendField(chunks, `${prefix}artifact.kind`, item.artifact?.kind)
    appendField(chunks, `${prefix}artifact.sizeBytes`, String(item.artifact?.sizeBytes ?? 0))
    appendField(chunks, `${prefix}artifact.sha256`, normalizeSha256(item.artifact?.sha256))
    appendField(chunks, `${prefix}artifact.downloadMode`, item.artifact?.downloadMode)
  })

  return `${chunks.join('\n')}\n`
}

function appendField(chunks, name, value) {
  const text = String(value ?? '')
  chunks.push(`${Buffer.byteLength(name, 'utf8')}:${name}=${Buffer.byteLength(text, 'utf8')}:${text}`)
}

function normalizeSha256(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-f0-9]/g, '')
}

function validateFeedForSigning(feed) {
  if (feed.schemaVersion !== 1) {
    throw new Error('Launcher feed schemaVersion must be 1')
  }

  if (normalizeChannel(feed.channel) !== feed.channel) {
    throw new Error(`Launcher feed channel is not trusted: ${feed.channel}`)
  }

  if (normalizePlatform(feed.platform) !== feed.platform) {
    throw new Error(`Launcher feed platform is not trusted: ${feed.platform}`)
  }

  for (const item of feed.items || []) {
    if (!['main', 'code', 'launcher'].includes(item.appId)) {
      throw new Error(`Launcher feed contains unmanaged app: ${item.appId}`)
    }
    if (item.channel !== feed.channel || item.platform !== feed.platform) {
      throw new Error(`Launcher feed item ${item.appId} does not match feed channel/platform`)
    }
    if (!item.artifact?.id || !item.artifact?.fileName) {
      throw new Error(`Launcher feed item ${item.appId} is missing artifact identity`)
    }
    if (item.artifact.fileName.includes('/') || item.artifact.fileName.includes('\\')) {
      throw new Error(`Launcher feed item ${item.appId} has an unsafe artifact file name`)
    }
    if (normalizeSha256(item.artifact.sha256).length !== 64) {
      throw new Error(`Launcher feed item ${item.appId} has an invalid artifact checksum`)
    }
    if (Number(item.artifact.sizeBytes) <= 0) {
      throw new Error(`Launcher feed item ${item.appId} has an empty artifact`)
    }
    if (item.artifact.downloadMode !== API_BROKERED_DOWNLOAD_MODE) {
      throw new Error(`Launcher feed item ${item.appId} must use API-brokered downloads`)
    }
  }
}

function compareOrdinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0
}

function boolArg(value) {
  return ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase())
}

function normalizeChannel(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return ['stable', 'beta', 'nightly'].includes(normalized) ? normalized : 'nightly'
}

function normalizePlatform(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (['win-x64', 'mac-arm64', 'mac-x64', 'linux-x64', 'linux-arm64'].includes(normalized)) return normalized
  if (normalized === 'windows') return 'win-x64'
  if (normalized === 'macos') return 'mac-arm64'
  if (normalized === 'linux') return 'linux-x64'
  return currentPlatform()
}

function currentPlatform() {
  if (process.platform === 'win32') return 'win-x64'
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64'
  return 'linux-x64'
}

function artifactKind(targetPlatform) {
  if (targetPlatform === 'win-x64') return 'nsis-user'
  if (targetPlatform.startsWith('mac-')) return 'dmg-user'
  return 'appimage-user'
}

function artifactExtensionMatches(file) {
  const lower = file.toLowerCase()
  if (platform === 'win-x64') return lower.endsWith('.exe') || lower.endsWith('.msi') || lower.endsWith('.zip')
  if (platform.startsWith('mac-')) return lower.endsWith('.dmg') || lower.endsWith('.zip')
  return lower.endsWith('.appimage') || lower.endsWith('.tar.gz')
}

main().catch((error) => {
  console.error(`[launcher-feed] ${error.message}`)
  process.exit(1)
})
