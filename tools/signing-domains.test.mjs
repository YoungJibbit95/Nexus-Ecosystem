import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { generateKeyPairSync, verify } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { artifacts, childEnv, root } from '../.security/runtime.mjs'

function run(script, args, env) {
  return spawnSync(process.execPath, [path.join(root, 'tools', script), ...args], {
    cwd: root, env: { ...childEnv(), ...env }, encoding: 'utf8', windowsHide: true,
  })
}
const key = () => generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const pem = pair => pair.privateKey.export({ type: 'pkcs8', format: 'pem' })
function fixture() {
  const directory = fs.mkdtempSync(path.join(artifacts(), 'signing-domains-'))
  fs.writeFileSync(path.join(directory, 'synthetic.zip'), 'disposable artifact; never distribute')
  return directory
}

test('each feed-only alias fails required checksum signing and preflight', () => {
  const feed = key(), directory = fixture(), file = path.join(directory, 'synthetic.pem')
  fs.writeFileSync(file, pem(feed), { mode: 0o600 })
  try {
    for (const [suffix, value] of [['PEM', pem(feed)], ['BASE64', Buffer.from(pem(feed)).toString('base64')], ['FILE', file]]) {
      const env = { [`NEXUS_LAUNCHER_FEED_SIGNING_KEY_${suffix}`]: value }
      for (const [script, args] of [['generate-installer-checksums.mjs', ['--dir', directory, '--require-signature']], ['verify-signing-env.mjs', ['--target=checksums', '--required']]]) {
        const result = run(script, args, env)
        assert.notEqual(result.status, 0, 'Feed material must never satisfy checksum authority')
        assert.match(result.stderr, /missing.*checksum|checksum.*missing/i)
      }
    }
    assert.equal(fs.existsSync(path.join(directory, 'SHA256SUMS.txt.sig')), false)
  } finally { fs.unlinkSync(file) }
})

test('dedicated checksum aliases work and signatures cannot verify with independent feed key', () => {
  const feed = key(), checksum = key(), directory = fixture(), file = path.join(directory, 'synthetic.pem')
  fs.writeFileSync(file, pem(checksum), { mode: 0o600 })
  try {
    for (const [suffix, value] of [['PEM', pem(checksum)], ['BASE64', Buffer.from(pem(checksum)).toString('base64')], ['FILE', file]]) {
      const env = { [`NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_${suffix}`]: value,
        NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM: pem(feed), NEXUS_LAUNCHER_FEED_SIGNING_KEY_ID: 'feed-fixture-id' }
      const signed = run('generate-installer-checksums.mjs', ['--dir', directory, '--require-signature'], env)
      assert.equal(signed.status, 0, 'Dedicated signing must work')
      assert.equal(run('verify-signing-env.mjs', ['--target=checksums', '--required'], env).status, 0)
      const payload = fs.readFileSync(path.join(directory, 'SHA256SUMS.txt'))
      const signature = Buffer.from(fs.readFileSync(path.join(directory, 'SHA256SUMS.txt.sig'), 'utf8').trim(), 'base64url')
      assert.equal(verify('sha256', payload, checksum.publicKey, signature), true)
      assert.equal(verify('sha256', payload, feed.publicKey, signature), false)
      assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'SHA256SUMS.metadata.json'))).signature.keyId, 'nexus-installer-checksums-p256-v1')
    }
    assert.equal(run('verify-signing-env.mjs', ['--target=feed', '--required'], { NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM: pem(feed) }).status, 0)
  } finally { fs.unlinkSync(file) }
})

test('optional candidates never read feed key paths or inherit a feed key ID', () => {
  const directory = fixture()
  const result = run('generate-installer-checksums.mjs', ['--dir', directory], {
    NEXUS_LAUNCHER_FEED_SIGNING_KEY_FILE: path.join(directory, 'must-not-read.pem'),
    NEXUS_LAUNCHER_FEED_SIGNING_KEY_ID: 'feed-only',
  })
  assert.equal(result.status, 0)
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'SHA256SUMS.metadata.json')))
  assert.equal(metadata.signature, null)
  assert.equal(metadata.signingRequired, false)
})
