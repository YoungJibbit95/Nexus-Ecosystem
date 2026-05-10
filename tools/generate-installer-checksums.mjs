import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const dirIndex = args.indexOf('--dir')
const releaseDir = path.resolve(dirIndex >= 0 ? args[dirIndex + 1] || '' : process.cwd())
const artifactExtensions = new Set(['.dmg', '.pkg', '.zip', '.exe', '.msi', '.appimage', '.deb'])

const artifacts = await findArtifacts(releaseDir)

if (artifacts.length === 0) {
  console.error(`[generate-installer-checksums] No installer artifacts found in ${releaseDir}`)
  process.exit(1)
}

const lines = []
for (const artifact of artifacts) {
  const hash = await sha256File(artifact)
  const relative = path.relative(releaseDir, artifact).replace(/\\/g, '/')
  lines.push(`${hash}  ${relative}`)
}

await fs.writeFile(path.join(releaseDir, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8')
console.log(`[generate-installer-checksums] wrote ${lines.length} entries`)

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
