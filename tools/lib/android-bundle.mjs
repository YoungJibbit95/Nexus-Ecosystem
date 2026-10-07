import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const apps = new Map([['nexus-mobile', 'Nexus Mobile'], ['nexus-code-mobile', 'Nexus Code Mobile']])
export function androidBundleName(app, signed) {
  if (!apps.has(app)) throw new Error('Unsupported Android application')
  return `${app}-android-${signed ? 'release' : 'unsigned'}.aab`
}

export function androidToolEnvironment(source, javaHome) {
  const allowed = new Set(['path', 'systemroot', 'windir', 'temp', 'tmp', 'tmpdir', 'lang', 'lc_all'])
  const env = {}
  for (const name of Object.keys(source)) if (allowed.has(name.toLowerCase())) env[name] = source[name]
  env.JAVA_HOME = javaHome
  return env
}

function javaTool(javaHome, name, args, env) {
  if (!path.isAbsolute(javaHome || '')) throw new Error('An explicit trusted JAVA_HOME is required')
  const result = spawnSync(path.join(javaHome, 'bin', `${name}${process.platform === 'win32' ? '.exe' : ''}`), args, {
    env, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  // Tool output can contain certificate or keystore details. Keep failure
  // diagnostics to the operation/exit code, never credentials or artifact text.
  if (result.status !== 0 || result.error) throw new Error(`Android ${name} failed (exit ${result.status ?? 'unavailable'})`)
}

export function validateAndroidBundle({ file, signed = false, javaHome, scratchRoot, env = process.env }) {
  const stat = fs.lstatSync(file)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size === 0) throw new Error('Bundle must be a nonempty regular file')
  javaTool(javaHome, 'java', [`-Duser.home=${scratchRoot}`, path.join(root, 'tools/android-bundle/BundleEnvelope.java'), path.resolve(file), signed ? 'signed' : 'unsigned'], androidToolEnvironment(env, javaHome))
}

export function signAndroidBundle({ input, output, javaHome, scratchRoot, env = process.env }) {
  // Validate before reading or materializing signing credentials. The archive is
  // data only; no Gradle, npm, artifact classes or artifact-provided scripts run.
  validateAndroidBundle({ file: input, javaHome, scratchRoot, env })
  if (fs.existsSync(output) || path.resolve(input) === path.resolve(output)) throw new Error('Signed output must be new')
  const parent = fs.realpathSync(path.dirname(output))
  if (parent === root || parent.startsWith(root + path.sep)) throw new Error('Signed output must be outside the checkout')
  const scratch = fs.realpathSync(scratchRoot)
  if (scratch === root || scratch.startsWith(root + path.sep)) throw new Error('Signing scratch must be outside the checkout')
  for (const name of ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD']) {
    if (!env[name]?.trim()) throw new Error(`Missing Android signing configuration: ${name}`)
  }
  const alias = env.ANDROID_KEY_ALIAS
  if (alias.startsWith('-') || alias.length > 256 || /[\x00-\x1f\x7f]/.test(alias)) throw new Error('Invalid Android signing alias')
  const encoded = env.ANDROID_KEYSTORE_BASE64.replace(/\s+/g, '')
  if (encoded.length > 16 * 1024 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error('Invalid Android keystore encoding')
  const material = Buffer.from(encoded, 'base64')
  if (material.length < 64) throw new Error('Invalid Android keystore size')
  const temporary = fs.mkdtempSync(path.join(scratch, 'nexus-android-signing-'))
  const keystore = path.join(temporary, 'release.jks'), signed = path.join(temporary, 'signed.aab')
  try {
    fs.chmodSync(temporary, 0o700)
    fs.writeFileSync(keystore, material, { mode: 0o600, flag: 'wx' })
    material.fill(0)
    const childEnv = androidToolEnvironment(env, javaHome)
    childEnv.ANDROID_KEYSTORE_PASSWORD = env.ANDROID_KEYSTORE_PASSWORD
    childEnv.ANDROID_KEY_PASSWORD = env.ANDROID_KEY_PASSWORD
    const options = [`-J-Duser.home=${temporary}`, '-keystore', keystore, '-storepass:env', 'ANDROID_KEYSTORE_PASSWORD']
    javaTool(javaHome, 'jarsigner', [...options, '-keypass:env', 'ANDROID_KEY_PASSWORD', '-sigfile', 'NEXUS', '-signedjar', signed, path.resolve(input), alias], childEnv)
    javaTool(javaHome, 'jarsigner', ['-verify', '-strict', '-certs', ...options, signed, alias], childEnv)
    validateAndroidBundle({ file: signed, signed: true, javaHome, scratchRoot: temporary, env })
    // Create output only after verification; never overwrite an existing asset.
    fs.copyFileSync(signed, output, fs.constants.COPYFILE_EXCL)
  } finally {
    material.fill(0)
    // Known owned files only. Never recursively traverse links or artifact paths.
    for (const file of [keystore, signed]) {
      if (fs.existsSync(file)) {
        const stat = fs.lstatSync(file)
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Unexpected signing scratch entry')
        fs.unlinkSync(file)
      }
    }
    fs.rmdirSync(temporary)
  }
}
