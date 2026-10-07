import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { parseArgs } from 'node:util'
import { signAndroidBundle, validateAndroidBundle, androidToolEnvironment } from './lib/android-bundle.mjs'

const { values } = parseArgs({ options: { 'evidence-dir': { type: 'string' }, 'java-home': { type: 'string' } } })
const javaHome = values['java-home'] || process.env.JAVA_HOME
if (!javaHome || !path.isAbsolute(javaHome)) throw new Error('Set JAVA_HOME to a trusted JDK21 or use --java-home')
const root = fs.realpathSync(fs.mkdtempSync(path.join(values['evidence-dir'] || os.tmpdir(), 'nexus-android-native-')))
const password = randomBytes(24).toString('hex')
const env = { ...androidToolEnvironment(process.env, javaHome), TEST_PASSWORD: password }
const tool = (name, args) => spawnSync(path.join(javaHome, 'bin', `${name}${process.platform === 'win32' ? '.exe' : ''}`), [`-J-Duser.home=${root}`, ...args], { cwd: root, env, encoding: 'utf8', windowsHide: true })
let checks = 0
const scratchEmpty = () => assert.equal(fs.readdirSync(root).some(name => name.startsWith('nexus-android-signing-')), false)
try {
  for (const name of ['expected', 'other']) {
    const result = tool('keytool', ['-genkeypair', '-keystore', `${name}.jks`, '-storetype', 'JKS', '-storepass:env', 'TEST_PASSWORD', '-keypass:env', 'TEST_PASSWORD', '-alias', 'release', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '30', '-dname', 'CN=Synthetic Nexus Test', '-noprompt'])
    assert.equal(result.status, 0, 'Synthetic key generation failed')
  }
  fs.mkdirSync(path.join(root, 'base/manifest'), { recursive: true })
  fs.writeFileSync(path.join(root, 'BundleConfig.pb'), 'synthetic envelope; not installable')
  fs.writeFileSync(path.join(root, 'base/manifest/AndroidManifest.xml'), 'synthetic manifest')
  assert.equal(tool('jar', ['--create', '--file', 'unsigned.aab', 'BundleConfig.pb', 'base']).status, 0)
  const input = path.join(root, 'unsigned.aab'), output = path.join(root, 'signed.aab')
  const signingEnv = {
    ...env, ANDROID_KEYSTORE_BASE64: fs.readFileSync(path.join(root, 'expected.jks')).toString('base64'),
    ANDROID_KEYSTORE_PASSWORD: password, ANDROID_KEY_PASSWORD: password, ANDROID_KEY_ALIAS: 'release',
    JAVA_TOOL_OPTIONS: '-javaagent:must-not-load.jar', JDK_JAVA_OPTIONS: '--invalid-inherited-option',
    _JAVA_OPTIONS: '-javaagent:must-not-load.jar', CLASSPATH: 'untrusted-artifact.jar',
  }
  const options = { input, output, javaHome, scratchRoot: root, env: signingEnv }
  signAndroidBundle(options); scratchEmpty(); checks++
  validateAndroidBundle({ file: output, signed: true, javaHome, scratchRoot: root, env: signingEnv }); checks++
  assert.throws(() => validateAndroidBundle({ file: output, javaHome, scratchRoot: root, env }), /java failed/); checks++
  const verification = ['-verify', '-strict', '-certs', '-keystore', 'expected.jks', '-storepass:env', 'TEST_PASSWORD']
  assert.equal(tool('jarsigner', [...verification, 'signed.aab', 'release']).status, 0); checks++
  assert.notEqual(tool('jarsigner', [...verification, 'unsigned.aab', 'release']).status, 0); checks++
  assert.notEqual(tool('jarsigner', ['-verify', '-strict', '-certs', '-keystore', 'other.jks', '-storepass:env', 'TEST_PASSWORD', 'signed.aab', 'release']).status, 0); checks++
  assert.throws(() => signAndroidBundle({ ...options, output: path.join(root, 'wrong-password.aab'), env: { ...signingEnv, ANDROID_KEYSTORE_PASSWORD: 'synthetic-wrong-password' } }), /jarsigner failed/)
  scratchEmpty(); assert.equal(fs.existsSync(path.join(root, 'wrong-password.aab')), false); checks++
  assert.throws(() => signAndroidBundle({ ...options, output: path.join(root, 'missing-credentials.aab'), env }), /Missing Android signing configuration/); scratchEmpty(); checks++
  fs.copyFileSync(output, path.join(root, 'tampered.aab'))
  fs.writeFileSync(path.join(root, 'BundleConfig.pb'), 'modified synthetic envelope')
  assert.equal(tool('jar', ['--update', '--file', 'tampered.aab', 'BundleConfig.pb']).status, 0)
  assert.throws(() => validateAndroidBundle({ file: path.join(root, 'tampered.aab'), signed: true, javaHome, scratchRoot: root, env }), /java failed/); checks++
  fs.writeFileSync(path.join(root, 'extra.txt'), 'unsigned appended fixture')
  assert.equal(tool('jar', ['--update', '--file', 'signed.aab', 'extra.txt']).status, 0)
  assert.notEqual(tool('jarsigner', [...verification, 'signed.aab', 'release']).status, 0)
  assert.throws(() => validateAndroidBundle({ file: output, signed: true, javaHome, scratchRoot: root, env }), /java failed/); checks++
  fs.writeFileSync(path.join(root, 'malformed.aab'), 'not a ZIP archive')
  assert.throws(() => validateAndroidBundle({ file: path.join(root, 'malformed.aab'), javaHome, scratchRoot: root, env }), /java failed/); checks++
  fs.writeFileSync(path.join(root, 'RESULT.json'), JSON.stringify({ checks, passed: true, syntheticOnly: true }, null, 2)+'\n')
  console.log(`[android-bundle-native] PASS ${checks} signing, trust, tamper, environment and cleanup checks`)
} finally {
  // Explicitly remove only the two synthetic private keystores before retaining
  // any evidence. The signing helper must have removed its own scratch keystore.
  for (const name of ['expected.jks', 'other.jks']) {
    const file = path.join(root, name)
    if (fs.existsSync(file)) { assert.ok(fs.lstatSync(file).isFile()); fs.unlinkSync(file) }
  }
  if (!values['evidence-dir']) {
    const entries = []
    const inventory = file => {
      assert.ok(file === root || file.startsWith(root + path.sep))
      const stat = fs.lstatSync(file), directory = stat.isDirectory() && !stat.isSymbolicLink()
      if (directory) for (const name of fs.readdirSync(file)) inventory(path.join(file, name))
      entries.push({ file, directory })
    }
    inventory(root)
    for (const { file, directory } of entries) if (directory) fs.rmdirSync(file); else fs.unlinkSync(file)
  }
}
