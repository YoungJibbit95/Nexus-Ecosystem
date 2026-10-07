import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { androidBundleName } from './android-bundle.mjs'

export function validateAndroidPublication(directory) {
  const root = fs.lstatSync(directory)
  if (!root.isDirectory() || root.isSymbolicLink()) throw new Error('Unsafe Android release directory')
  const groups = ['nexus-mobile', 'nexus-code-mobile'].map(app => ({
    bundle: androidBundleName(app, true), checksum: `${app}-android-SHA256SUMS.txt`,
    signature: `${app}-android-SHA256SUMS.txt.sig`, metadata: `${app}-android-SHA256SUMS.metadata.json`,
  }))
  const expected = groups.flatMap(Object.values).sort()
  if (JSON.stringify(fs.readdirSync(directory).sort()) !== JSON.stringify(expected)) throw new Error('Incomplete or unexpected Android release assets')
  for (const name of expected) {
    const stat = fs.lstatSync(path.join(directory, name))
    const limit = name.endsWith('.aab') ? 512 * 1024 * 1024 : 64 * 1024
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0 || stat.size > limit) throw new Error('Unsafe Android release asset')
  }
  for (const group of groups) {
    const metadata = JSON.parse(fs.readFileSync(path.join(directory, group.metadata), 'utf8'))
    if (metadata.schemaVersion !== 1 || metadata.checksumFile !== group.checksum || metadata.signatureFile !== group.signature || metadata.signingRequired !== true || metadata.signature?.algorithm !== 'ECDSA_P256_SHA256' || metadata.artifacts?.length !== 1) throw new Error('Signed Android checksums are required')
    if (!/^[A-Za-z0-9_-]+\s*$/.test(fs.readFileSync(path.join(directory, group.signature), 'utf8'))) throw new Error('Invalid checksum signature encoding')
    const artifact = metadata.artifacts[0], file = path.join(directory, group.bundle)
    const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    if (artifact.fileName !== group.bundle || artifact.sha256 !== hash || artifact.sizeBytes !== fs.statSync(file).size) throw new Error('Android checksum mismatch')
    if (fs.readFileSync(path.join(directory, group.checksum), 'utf8') !== `${hash}  ${group.bundle}\n`) throw new Error('Android checksum document mismatch')
  }
  // Authenticity comes from the protected signer/checksum jobs and immutable
  // same-run artifacts. Do not trust public keys supplied inside an artifact.
  return expected.map(name => path.join(directory, name))
}
