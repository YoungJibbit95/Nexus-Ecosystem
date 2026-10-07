import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generateKeyPairSync } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { assertAndroidWorkflowPolicy } from './lib/android-workflow-policy.mjs'
import { androidBundleName, androidToolEnvironment } from './lib/android-bundle.mjs'
import { validateAndroidPublication } from './lib/android-publication.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, '.github/workflows/build-android.yml'), 'utf8')
const cleanEnv = androidToolEnvironment(process.env, '')
const run = (script, args, extra = {}) => spawnSync(process.execPath, [path.join(root, script), ...args], { env: { ...cleanEnv, ...extra }, encoding: 'utf8', windowsHide: true })

test('Android authority policy allows the separated workflow and rejects unsafe mutations', () => {
  assertAndroidWorkflowPolicy(source)
  for (const [before, after] of [
    ['  contents: read', '  contents: write'],
    ['    timeout-minutes: 45', '    env:\n      KEY: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}'],
    ["github.ref == 'refs/heads/main'", "github.ref != 'refs/heads/main'"],
    ['    needs: sign', '    needs: build'],
    ['    needs: checksums', '    needs: build'],
    ['persist-credentials: false', 'persist-credentials: true'],
    ['bundleRelease -PnexusUnsignedCandidate=true', 'bundleRelease'],
    ['run: npm run build', 'run: echo stale-web-assets'],
    ['environment: release-android-signing', 'environment: anything'],
    ['environment: release-checksum-signing', 'environment: anything'],
    ['name: Sign and strictly verify Android bundle', 'name: Application lifecycle hook'],
    ['node tools/android-bundle.mjs sign', 'npm run sign'],
    ['NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM', 'NEXUS_LAUNCHER_FEED_SIGNING_KEY_PEM'],
    ['--require-signature', ''],
    ['${{ github.sha }}-${{ github.run_attempt }}', 'mutable'],
    ['actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09', 'actions/checkout@v5'],
  ]) {
    assert.ok(source.includes(before), before)
    assert.throws(() => assertAndroidWorkflowPolicy(source.replace(before, after)), before)
  }
})

test('Android tools accept only known bundle names and discard Java/environment injection hooks', () => {
  assert.equal(androidBundleName('nexus-mobile', false), 'nexus-mobile-android-unsigned.aab')
  assert.equal(androidBundleName('nexus-code-mobile', true), 'nexus-code-mobile-android-release.aab')
  assert.throws(() => androidBundleName('../foreign', true))
  assert.deepEqual(androidToolEnvironment({ PATH: 'safe', JAVA_TOOL_OPTIONS: 'injected', _JAVA_OPTIONS: 'injected', JDK_JAVA_OPTIONS: 'injected', CLASSPATH: 'injected', GH_TOKEN: 'synthetic', ANDROID_KEYSTORE_PASSWORD: 'synthetic' }, '/jdk'), { PATH: 'safe', JAVA_HOME: '/jdk' })
  const signer = fs.readFileSync(path.join(root, 'tools/lib/android-bundle.mjs'), 'utf8')
  assert.match(signer, /\['-verify', '-strict', '-certs'/)
  assert.match(signer, /'-storepass:env', 'ANDROID_KEYSTORE_PASSWORD'/)
  assert.match(signer, /'-keypass:env', 'ANDROID_KEY_PASSWORD'/)
  assert.doesNotMatch(signer, /execSync|shell: true/)
})

test('Android publication requires both checksum-covered bundles and rejects corrupt/missing/extra assets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-android-publication-'))
  try {
    const key = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ type: 'pkcs8', format: 'pem' })
    for (const app of ['nexus-mobile', 'nexus-code-mobile']) {
      const part = path.join(directory, app)
      fs.mkdirSync(part)
      fs.writeFileSync(path.join(part, androidBundleName(app, true)), `synthetic ${app} bundle`)
      const result = run('tools/generate-installer-checksums.mjs', ['--dir', part, '--output-prefix', `${app}-android`, '--require-signature'], { NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM: key })
      assert.equal(result.status, 0, result.stderr)
      for (const entry of fs.readdirSync(part)) fs.renameSync(path.join(part, entry), path.join(directory, entry))
      fs.rmdirSync(part)
    }
    assert.equal(validateAndroidPublication(directory).length, 8)
    const file = path.join(directory, androidBundleName('nexus-mobile', true)), original = fs.readFileSync(file)
    fs.appendFileSync(file, 'tampered')
    assert.throws(() => validateAndroidPublication(directory), /checksum mismatch/)
    fs.writeFileSync(file, original)
    fs.renameSync(file, `${file}.unsigned`)
    assert.throws(() => validateAndroidPublication(directory), /unexpected/)
    fs.renameSync(`${file}.unsigned`, file)
    const metadata = path.join(directory, 'nexus-mobile-android-SHA256SUMS.metadata.json'), saved = fs.readFileSync(metadata)
    const data = JSON.parse(saved)
    data.signingRequired = false
    fs.writeFileSync(metadata, JSON.stringify(data))
    assert.throws(() => validateAndroidPublication(directory), /Signed Android/)
    fs.writeFileSync(metadata, saved)
    fs.writeFileSync(path.join(directory, 'payload.sh'), 'must never execute')
    assert.throws(() => validateAndroidPublication(directory), /unexpected/)
    fs.unlinkSync(path.join(directory, 'payload.sh'))
    assert.equal(validateAndroidPublication(directory).length, 8)
    const refused = run('tools/publish-android.mjs', ['--directory', directory], { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' })
    assert.notEqual(refused.status, 0)
    assert.match(refused.stderr, /manual main workflow/)
  } finally {
    // The fixture contains only files created by this test; inventory before any cleanup.
    const entries = fs.readdirSync(directory).map(name => path.join(directory, name))
    for (const file of entries) assert.ok(fs.lstatSync(file).isFile() && !fs.lstatSync(file).isSymbolicLink())
    for (const file of entries) fs.unlinkSync(file)
    fs.rmdirSync(directory)
  }
})

test('flat Android handoffs reject foreign names, directories and empty bundles', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-android-handoff-'))
  const name = androidBundleName('nexus-mobile', true)
  const args = ['validate-data', '--signed', '--app', 'nexus-mobile', '--directory', directory]
  try {
    assert.notEqual(run('tools/android-bundle.mjs', args).status, 0)
    fs.writeFileSync(path.join(directory, name), '')
    assert.notEqual(run('tools/android-bundle.mjs', args).status, 0)
    fs.writeFileSync(path.join(directory, name), 'protected immutable signer output')
    assert.equal(run('tools/android-bundle.mjs', args).status, 0)
    fs.mkdirSync(path.join(directory, 'foreign'))
    assert.notEqual(run('tools/android-bundle.mjs', args).status, 0)
    fs.rmdirSync(path.join(directory, 'foreign'))
  } finally {
    if (fs.existsSync(path.join(directory, name))) fs.unlinkSync(path.join(directory, name))
    fs.rmdirSync(directory)
  }
})
