import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const securityDir = path.dirname(fileURLToPath(import.meta.url))
export const root = path.dirname(securityDir)
export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
export function artifacts() {
  const directory = process.env.NEXUS_SECURITY_ARTIFACTS || process.env.RUNNER_TEMP ||
    path.resolve(root, '../.workspace-maintenance', new Date().toISOString().slice(0, 10), 'security-scans')
  if (!path.isAbsolute(directory)) throw Error('Artifact directory must be absolute')
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
  return fs.realpathSync(directory)
}
export function childEnv() {
  const env = {}
  for (const key of Object.keys(process.env)) {
    if (/^(path|systemroot|windir|comspec|pathext|temp|tmp)$/i.test(key)) env[key] = process.env[key]
  }
  env.GIT_CONFIG_NOSYSTEM = '1'
  env.GIT_CONFIG_GLOBAL = process.platform === 'win32' ? 'NUL' : '/dev/null'
  env.GIT_TERMINAL_PROMPT = '0'
  const settings = [['core.fsmonitor', 'false'], ['core.hooksPath', env.GIT_CONFIG_GLOBAL],
    ['core.excludesFile', env.GIT_CONFIG_GLOBAL], ['diff.external', ''], ['core.pager', 'cat']]
  env.GIT_CONFIG_COUNT = String(settings.length)
  settings.forEach(([key, value], i) => { env[`GIT_CONFIG_KEY_${i}`] = key; env[`GIT_CONFIG_VALUE_${i}`] = value })
  return env
}
export function git(args, cwd = root) {
  const result = spawnSync('git', ['--no-pager', ...args], { cwd, env: childEnv(), windowsHide: true,
    maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  if (result.status !== 0) throw Error('Git input enumeration failed; raw diagnostics suppressed')
  return result.stdout
}
export function regularFile(file, boundary) {
  const relative = path.relative(boundary, file)
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw Error('Unsafe file boundary')
  let current = boundary
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component)
    const st = fs.lstatSync(current)
    if (st.isSymbolicLink()) throw Error('Linked input rejected')
    if (current !== file && !st.isDirectory()) throw Error('Invalid input ancestor')
  }
  const st = fs.lstatSync(file)
  if (!st.isFile() || st.nlink !== 1) throw Error('Nonregular or hardlinked input rejected')
  if (path.normalize(fs.realpathSync(file)).toLowerCase() !== path.normalize(file).toLowerCase()) throw Error('Aliased input rejected')
  return st
}
export function readSource(file, boundary) {
  const before = regularFile(file, boundary)
  if (before.size > 64 * 1024 * 1024) throw Error('Oversized input requires separate review')
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0))
  try {
    const after = fs.fstatSync(fd)
    if (after.dev !== before.dev || after.ino !== before.ino || after.size !== before.size) throw Error('Input changed during open')
    return fs.readFileSync(fd)
  } finally { fs.closeSync(fd) }
}
export async function installScanner() {
  const pins = JSON.parse(fs.readFileSync(path.join(securityDir, 'gitleaks-pins.json'), 'utf8'))
  const pin = pins.assets[`${process.platform}-${process.arch}`]
  if (!pin) throw Error('No verified scanner for this platform')
  const directory = fs.mkdtempSync(path.join(artifacts(), 'scanner-'))
  const explicit = process.env.NEXUS_GITLEAKS
  if (explicit) {
    const resolved = path.resolve(explicit)
    regularFile(resolved, path.parse(resolved).root)
    if (digest(fs.readFileSync(resolved)) !== pin.binarySha256) throw Error('Scanner digest mismatch')
    return resolved
  }
  const response = await fetch(pin.url, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok || !/^https:\/\/(?:github\.com|release-assets\.githubusercontent\.com)\//.test(response.url)) throw Error('Scanner download failed')
  const chunks = []; let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > pin.archiveSize) throw Error('Scanner archive exceeds pinned size')
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks)
  if (size !== pin.archiveSize || digest(bytes) !== pin.archiveSha256) throw Error('Scanner archive digest mismatch')
  const archive = path.join(directory, 'tool.archive')
  fs.writeFileSync(archive, bytes, { flag: 'wx', mode: 0o600 })
  // Extract only the expected entry to memory; no archive path becomes a target.
  const extracted = spawnSync('tar', ['-xOf', archive, pin.binary], { env: childEnv(), windowsHide: true, maxBuffer: 64 * 1024 * 1024 })
  if (extracted.status !== 0 || digest(extracted.stdout) !== pin.binarySha256) throw Error('Scanner binary verification failed')
  const executable = path.join(directory, pin.binary)
  fs.writeFileSync(executable, extracted.stdout, { flag: 'wx', mode: 0o700 })
  return executable
}
export async function invokeScanner(executable, args, input, cwd = root) {
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, env: childEnv(), windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] })
    const chunks = []; let size = 0; let failed = false
    const timer = setTimeout(() => { failed = true; child.kill() }, 120_000)
    child.stdout.on('data', chunk => { size += chunk.length; if (size > 32 * 1024 * 1024) { failed = true; child.kill() } else chunks.push(chunk) })
    // At error log level, any diagnostic means coverage may be incomplete even
    // if upstream returns zero. Fail closed without exposing its raw contents.
    child.stderr.on('data', () => { failed = true })
    // Upstream intentionally stops reading recognized binary input early.
    child.stdin.on('error', error => { if (error.code !== 'EPIPE') failed = true })
    child.on('error', () => { clearTimeout(timer); reject(Error('Scanner could not start')) })
    child.on('close', code => {
      clearTimeout(timer)
      if (failed || ![0, 42].includes(code)) return reject(Error('Scanner failed; raw output suppressed'))
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '[]')
        if (!Array.isArray(data) || data.some(item => typeof item.RuleID !== 'string' || !Number.isInteger(item.StartLine))) throw Error()
        resolve(data.map(item => ({ rule: item.RuleID, line: item.StartLine, file: item.File || '', commit: item.Commit || '' })))
      } catch { reject(Error('Scanner report invalid; raw output suppressed')) }
    })
    child.stdin.end(input)
  })
}
