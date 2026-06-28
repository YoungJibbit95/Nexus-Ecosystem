import { createHash, createSign } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const args = parseArgs(process.argv.slice(2))
const releaseDir = path.resolve(args.get('dir') || process.cwd())
const requireSignature = boolArg(
  args.get('require-signature') ||
  args.get('require-signatures') ||
  process.env.NEXUS_INSTALLER_CHECKSUM_SIGNATURE_REQUIRED ||
  process.env.NEXUS_SIGNING_REQUIRED,
)
const signatureAlgorithm = 'ECDSA_P256_SHA256'
const signingKeyId = args.get('signing-key-id') ||
  process.env.NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_ID ||
  process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_ID ||
  'nexus-installer-checksums-p256-v1'
const artifactExtensions = new Set(['.dmg', '.pkg', '.zip', '.exe', '.msi', '.appimage', '.deb'])

const artifacts = await findArtifacts(releaseDir)

if (artifacts.length === 0) {
  console.error(`[generate-installer-checksums] No installer artifacts found in ${releaseDir}`)
  process.exit(1)
}

const lines = []
const metadataArtifacts = []
for (const artifact of artifacts) {
  const hash = await sha256File(artifact)
  const stats = await fs.stat(artifact)
  const relative = path.relative(releaseDir, artifact).replace(/\\/g, '/')
  lines.push(`${hash}  ${relative}`)
  metadataArtifacts.push({
    fileName: relative,
    sha256: hash,
    sizeBytes: stats.size,
  })
}

const checksumText = `${lines.join('\n')}\n`
const checksumPath = path.join(releaseDir, 'SHA256SUMS.txt')
const signaturePath = path.join(releaseDir, 'SHA256SUMS.txt.sig')
const metadataPath = path.join(releaseDir, 'SHA256SUMS.metadata.json')
const signingKey = await readSigningKey()
let signature = null

if (signingKey) {
  signature = signChecksums(checksumText, signingKey)
  await fs.writeFile(signaturePath, `${signature}\n`, 'utf8')
} else if (requireSignature) {
  console.error('[generate-installer-checksums] Missing checksum signing key. Set NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM, NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_BASE64, NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_FILE, or the launcher feed signing key fallback.')
  process.exit(1)
} else {
  console.warn('[generate-installer-checksums] WARN checksum manifest is unsigned; public releases must require checksum signatures')
}

await fs.writeFile(checksumPath, checksumText, 'utf8')
await fs.writeFile(metadataPath, `${JSON.stringify({
  schemaVersion: 1,
  checksumFile: 'SHA256SUMS.txt',
  signatureFile: signature ? 'SHA256SUMS.txt.sig' : null,
  signature: signature
    ? {
        algorithm: signatureAlgorithm,
        keyId: signingKeyId,
        signedAt: new Date().toISOString(),
      }
    : null,
  signingRequired: requireSignature,
  artifacts: metadataArtifacts,
}, null, 2)}\n`, 'utf8')

console.log(`[generate-installer-checksums] wrote ${lines.length} entries${signature ? ' with signed metadata' : ''}`)

async function findArtifacts(dir, out = []) {
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await findArtifacts(fullPath, out)
      continue
    }

    if (!entry.isFile()) continue
    const lowerName = entry.name.toLowerCase()
    const ext = lowerName.endsWith('.appimage') ? '.appimage' : path.extname(lowerName)
    if (artifactExtensions.has(ext)) out.push(fullPath)
  }

  return out.sort((a, b) => a.localeCompare(b))
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function readSigningKey() {
  const inlinePem = args.get('signing-key-pem') ||
    process.env.NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM ||
    process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM
  if (inlinePem) return inlinePem.replaceAll('\\n', '\n')

  const inlineBase64 = args.get('signing-key-base64') ||
    process.env.NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_BASE64 ||
    process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_BASE64
  if (inlineBase64) return Buffer.from(inlineBase64, 'base64').toString('utf8')

  const keyFile = args.get('signing-key-file') ||
    process.env.NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_FILE ||
    process.env.NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE
  if (keyFile) return fs.readFile(path.resolve(process.cwd(), keyFile), 'utf8')

  return null
}

function signChecksums(text, privateKeyPem) {
  const signer = createSign('SHA256')
  signer.update(Buffer.from(text, 'utf8'))
  signer.end()
  return signer.sign(privateKeyPem).toString('base64url')
}

function parseArgs(rawArgs) {
  const parsed = new Map()
  for (let index = 0; index < rawArgs.length; index++) {
    const raw = rawArgs[index]
    if (!raw?.startsWith('--')) continue
    const withoutPrefix = raw.slice(2)
    const equalsIndex = withoutPrefix.indexOf('=')
    if (equalsIndex >= 0) {
      parsed.set(withoutPrefix.slice(0, equalsIndex), withoutPrefix.slice(equalsIndex + 1))
      continue
    }

    const next = rawArgs[index + 1]
    if (next && !next.startsWith('--')) {
      parsed.set(withoutPrefix, next)
      index++
    } else {
      parsed.set(withoutPrefix, 'true')
    }
  }
  return parsed
}

function boolArg(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}
