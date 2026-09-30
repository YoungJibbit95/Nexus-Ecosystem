import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const generator = path.join(ROOT, 'tools', 'generate-installer-checksums.mjs')
const verifier = path.join(ROOT, 'tools', 'verify-signing-env.mjs')

const runNode = (script, args, env = {}) => spawnSync(process.execPath, [script, ...args], {
  cwd: ROOT,
  env: { ...process.env, ...env },
  encoding: 'utf8',
  windowsHide: true,
})

test('release checksum manifests are uniquely named, P-256 signed, and self-verified', async () => {
  const tempRoot = path.join(ROOT, '.test-artifacts')
  await mkdir(tempRoot, { recursive: true })
  const releaseDir = await mkdtemp(path.join(tempRoot, 'release-hardening-'))
  try {
    await writeFile(path.join(releaseDir, 'app-release.aab'), 'signed-release-fixture')
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
    const result = runNode(generator, [
      '--dir', releaseDir,
      '--output-prefix', 'Nexus Mobile Android',
      '--require-signature',
    ], {
      NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM: pem,
    })
    assert.equal(result.status, 0, result.stderr)

    const metadata = JSON.parse(await readFile(
      path.join(releaseDir, 'nexus-mobile-android-SHA256SUMS.metadata.json'),
      'utf8',
    ))
    assert.equal(metadata.checksumFile, 'nexus-mobile-android-SHA256SUMS.txt')
    assert.equal(metadata.signatureFile, 'nexus-mobile-android-SHA256SUMS.txt.sig')
    assert.equal(metadata.signature.algorithm, 'ECDSA_P256_SHA256')
    assert.equal(metadata.artifacts[0].fileName, 'app-release.aab')
  } finally {
    await rm(releaseDir, { recursive: true, force: true })
  }
})

test('RSA and malformed signing material fail closed', async () => {
  const tempRoot = path.join(ROOT, '.test-artifacts')
  await mkdir(tempRoot, { recursive: true })
  const releaseDir = await mkdtemp(path.join(tempRoot, 'release-hardening-invalid-'))
  try {
    await writeFile(path.join(releaseDir, 'installer.exe'), 'fixture')
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const rsaPem = privateKey.export({ type: 'pkcs8', format: 'pem' })
    const wrongCurve = runNode(generator, ['--dir', releaseDir, '--require-signature'], {
      NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM: rsaPem,
    })
    assert.notEqual(wrongCurve.status, 0)
    assert.match(`${wrongCurve.stdout}\n${wrongCurve.stderr}`, /ECDSA P-256/)

    const malformed = runNode(verifier, ['--target=checksums', '--required'], {
      NEXUS_INSTALLER_CHECKSUM_SIGNING_KEY_PEM: 'not-a-private-key',
    })
    assert.notEqual(malformed.status, 0)
    assert.match(`${malformed.stdout}\n${malformed.stderr}`, /is invalid/)
  } finally {
    await rm(releaseDir, { recursive: true, force: true })
  }
})

test('public release workflows enforce fresh artifacts, architecture, and signatures', async () => {
  const [electronWorkflow, androidWorkflow, gate, buildScript, packageJson] = await Promise.all([
    readFile(path.join(ROOT, '.github', 'workflows', 'build-installers.yml'), 'utf8'),
    readFile(path.join(ROOT, '.github', 'workflows', 'build-android.yml'), 'utf8'),
    readFile(path.join(ROOT, 'tools', 'lib', 'release-gate-plan.mjs'), 'utf8'),
    readFile(path.join(ROOT, 'tools', 'build-ecosystem.mjs'), 'utf8'),
    readFile(path.join(ROOT, 'package.json'), 'utf8'),
  ])
  assert.match(electronWorkflow, /target: "mac"[\s\S]*?arch: "arm64"/)
  assert.match(electronWorkflow, /target: "mac"[\s\S]*?arch: "x64"/)
  assert.match(
    electronWorkflow,
    /- name: Build installer[\s\S]*?NEXUS_MAC_ARCH: "\$\{\{ matrix\.target == 'mac' && matrix\.arch \|\| '' \}\}"/,
  )
  assert.match(
    electronWorkflow,
    /- name: Build installer[\s\S]*?CSC_FORCE_CODE_SIGNING: "\$\{\{ matrix\.target == 'win'/,
  )
  assert.match(electronWorkflow, /codesign --verify --deep --strict/)
  assert.match(electronWorkflow, /Get-AuthenticodeSignature/)
  assert.match(electronWorkflow, /--output-prefix "\$\{\{ matrix\.app_slug \}\}-\$\{\{ matrix\.target \}\}-\$\{\{ matrix\.arch \}\}"/)
  assert.match(androidWorkflow, /bundleRelease/)
  assert.match(androidWorkflow, /jarsigner -verify -strict -certs/)
  assert.match(gate, /NEXUS_CONTROL_UI_ROOT/)
  assert.match(gate, /Nexus Control source required/)
  assert.match(packageJson, /build-ecosystem\.mjs --with-android --with-installers --strict-android --strict-installers/)
  assert.match(buildScript, /strictInstallers[\s\S]*?fs\.rm\(releaseRoot, \{ recursive: true, force: true \}\)/)
  assert.match(buildScript, /strictAndroid[\s\S]*?fs\.rm\(outputRoot, \{ recursive: true, force: true \}\)/)
})
