import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { installerNames } from './installer-payload.mjs'

export function validateInstallerPublication({ repoRoot, directory }) {
  if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) throw new Error('Unsafe release directory')
  const expected = []
  const groups = new Map()
  for (const [app, slug] of [['Nexus Main', 'nexus-main'], ['Nexus Code', 'nexus-code']]) {
    for (const [target, arch] of [['mac', 'arm64'], ['mac', 'x64'], ['win', 'x64'], ['linux', 'x64']]) {
      const names = installerNames({ repoRoot, app, target, arch }).sort((a, b) => a.localeCompare(b))
      const prefix = `${slug}-${target}-${arch}`
      const checksum = `${prefix}-SHA256SUMS.txt`, signature = `${checksum}.sig`, metadataFile = `${prefix}-SHA256SUMS.metadata.json`
      expected.push(...names, checksum, signature, metadataFile)
      groups.set(metadataFile, names)
    }
  }
  if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify([...expected].sort())) throw new Error('Incomplete or unexpected release assets')
  for (const name of expected) {
    const stat = fs.lstatSync(path.join(directory, name))
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error('Unsafe/empty release asset')
  }
  for (const metadataFile of expected.filter(name => name.endsWith('.metadata.json'))) {
    const metadataPath = path.join(directory, metadataFile)
    if (fs.statSync(metadataPath).size > 64 * 1024) throw new Error('Unexpected checksum metadata size')
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    const checksum = metadataFile.replace('.metadata.json', '.txt'), signature = `${checksum}.sig`
    if (metadata.schemaVersion !== 1 || metadata.checksumFile !== checksum || metadata.signatureFile !== signature || !metadata.signingRequired || metadata.signature?.algorithm !== 'ECDSA_P256_SHA256' || !Array.isArray(metadata.artifacts)) throw new Error('Signed checksum metadata is required')
    if (!/^[A-Za-z0-9_-]+\s*$/.test(fs.readFileSync(path.join(directory, signature), 'utf8'))) throw new Error('Invalid checksum signature encoding')
    if (JSON.stringify(metadata.artifacts.map(artifact => artifact.fileName)) !== JSON.stringify(groups.get(metadataFile))) throw new Error('Checksum artifact set mismatch')
    let text = ''
    for (const artifact of metadata.artifacts) {
      if (!expected.includes(artifact.fileName) || artifact.fileName.includes('SHA256SUMS')) throw new Error('Unexpected checksum target')
      const file = path.join(directory, artifact.fileName), size = fs.statSync(file).size
      const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex')
      if (artifact.sizeBytes !== size || artifact.sha256 !== hash) throw new Error('Installer checksum mismatch')
      text += `${hash}  ${artifact.fileName}\n`
    }
    if (!metadata.artifacts.length || fs.readFileSync(path.join(directory, checksum), 'utf8') !== text) throw new Error('Checksum document mismatch')
  }
  // Authenticity derives from the protected checksum job and immutable same-run
  // artifact handoff. This consistency check does not claim trust in a key from
  // artifact metadata or replace client verification with configured public keys.
  return expected.map(name => path.join(directory, name))
}

export function validateExistingRelease({ tag, repository, sha, gh }) {
  if (!/^v[0-9][A-Za-z0-9._+-]*$/.test(tag || '') || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '') || !/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Invalid explicit release target')
  gh(['release', 'view', tag, '--repo', repository, '--json', 'tagName'])
  let object = JSON.parse(gh(['api', `repos/${repository}/git/ref/tags/${encodeURIComponent(tag)}`])).object
  for (let depth = 0; object?.type === 'tag' && depth < 8; depth++) {
    if (!/^[a-f0-9]{40}$/.test(object.sha)) throw new Error('Invalid annotated tag object')
    object = JSON.parse(gh(['api', `repos/${repository}/git/tags/${object.sha}`])).object
  }
  if (object?.type !== 'commit' || object.sha !== sha) throw new Error('Release tag must point to the workflow commit')
  return tag
}
