import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { root, securityDir, artifacts, git, readSource, digest, installScanner, invokeScanner } from './runtime.mjs'

const zero = '0'.repeat(40)
function sourcePath(value) {
  if (!value || /[\\:\x00-\x1f]/.test(value) || value.split('/').some(part => !part || part === '.' || part === '..') || path.isAbsolute(value)) throw Error('Unsafe source path')
  return value
}
function checkEnvironmentPath(file) {
  if (/(?:^|\/)data\/users\.json$/i.test(file)) throw Error('Runtime account state cannot enter source scan; remove it from the index')
  const name = path.posix.basename(file)
  if (/^\.env(?:\.|$)/i.test(name) && !/\.example$/i.test(name)) {
    // Only these committed browser build configurations are intentionally public.
    const allowed = JSON.parse(fs.readFileSync(path.join(securityDir, 'public-env-files.json'), 'utf8'))
    if (!allowed.includes(file)) throw Error('Runtime environment file cannot enter source scan; remove it from the index')
  }
}
export function enumerate(mode, cwd = root) {
  if (mode === 'tree') {
    const names = [...new Set(git(['ls-files', '-c', '-o', '--exclude-standard', '-z'], cwd).toString('utf8').split('\0').filter(Boolean))]
    return names.map(sourcePath).sort().map(file => ({ file }))
  }
  if (mode !== 'staged') throw Error('Unsupported source mode')
  const changed = new Set(git(['diff', '--cached', '--name-only', '--diff-filter=ACMRT', '--no-ext-diff', '--no-textconv', '-z'], cwd).toString('utf8').split('\0').filter(Boolean))
  return git(['ls-files', '--stage', '-z'], cwd).toString('utf8').split('\0').filter(Boolean).flatMap(entry => {
    const match = entry.match(/^(\d+) ([a-f0-9]{40,64}) (\d)\t([\s\S]+)$/)
    if (!match) throw Error('Malformed index entry')
    if (!changed.has(match[4])) return []
    if (!['100644', '100755'].includes(match[1]) || match[3] !== '0') throw Error('Linked, nested or conflicted index entry requires separate review')
    return [{ file: sourcePath(match[4]), oid: match[2] }]
  })
}
export function approvedFinding(finding, bytes, entries) {
  const line = bytes.toString('utf8').split(/\r?\n/)[finding.line - 1]
  return line !== undefined && entries.some(entry => entry.file === finding.file && entry.rule === finding.rule &&
    /^[a-f0-9]{64}$/.test(entry.lineSha256) && entry.lineSha256 === digest(line) && typeof entry.reason === 'string' && entry.reason.length > 20)
}
export async function scan(mode, { cwd = root, executable, base, head } = {}) {
  const scratch = fs.mkdtempSync(path.join(artifacts(), 'scan-'))
  const emptyIgnore = path.join(scratch, 'empty-ignore')
  fs.writeFileSync(emptyIgnore, '', { flag: 'wx' })
  const args = ['--config', path.join(securityDir, 'gitleaks.toml'), '--gitleaks-ignore-path', emptyIgnore,
    '--ignore-gitleaks-allow', '--redact=100', '--no-banner', '--no-color', '--log-level=error',
    '--report-format=json', '--report-path=-', '--exit-code=42']
  executable ||= await installScanner()
  if (mode === 'history' || mode === 'range') {
    // Upstream also loads <source>/.gitleaksignore, even with an explicit empty
    // ignore path. Never allow that implicit second source to hide history.
    if (fs.existsSync(path.join(cwd, '.gitleaksignore'))) throw Error('Remove .gitleaksignore before unsuppressed commit/history scanning')
    let opts = '--all --full-history --root --no-ext-diff --no-textconv --no-renames'
    if (mode === 'range') {
      if (![base, head].every(value => /^[a-f0-9]{40}$/.test(value || '') && value !== zero)) throw Error('Range requires two immutable commits')
      for (const value of [base, head]) git(['cat-file', '-e', value + '^{commit}'], cwd)
      opts = `${base}..${head} --root --no-ext-diff --no-textconv --no-renames`
    }
    // History/range scans never apply current-line fixture exceptions or baselines.
    const findings = await invokeScanner(executable, ['git', `--log-opts=${opts}`, ...args, cwd], undefined, scratch)
    return { mode, findings, inspected: mode === 'range' ? `${base}..${head}` : 'all locally available refs' }
  }
  const entries = JSON.parse(fs.readFileSync(path.join(securityDir, 'synthetic-lines.json'), 'utf8'))
  const inputs = enumerate(mode, cwd)
  const findings = []; let cursor = 0; let inspected = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < inputs.length) {
      const item = inputs[cursor++]
      checkEnvironmentPath(item.file)
      let bytes
      let target = path.join(cwd, item.file)
      if (item.oid) {
        const size = Number(git(['cat-file', '-s', item.oid], cwd).toString('utf8').trim())
        if (!Number.isSafeInteger(size) || size > 64 * 1024 * 1024) throw Error('Oversized staged input requires separate review')
        bytes = git(['cat-file', 'blob', item.oid], cwd)
        // Disposable scanner input, not a checkout: preserve the source path for
        // detector rules scoped to filenames (stdin drops that rule context).
        const inputRoot = fs.mkdtempSync(path.join(scratch, 'index-'))
        target = path.join(inputRoot, item.file)
        fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
        fs.writeFileSync(target, bytes, { flag: 'wx', mode: 0o600 })
      }
      else {
        const location = path.join(cwd, item.file)
        try { bytes = readSource(location, fs.realpathSync(cwd)) }
        catch (error) {
          if (error.code === 'ENOENT') {
            // A tracked deletion has no current content; staged/history cover old content.
            const deleted = git(['ls-files', '--deleted', '-z'], cwd).toString('utf8').split('\0')
            if (deleted.includes(item.file)) continue
          }
          throw Error(`Source unavailable or unsafe: ${JSON.stringify(item.file)}`)
        }
      }
      let result
      try {
        // Single regular file target plus isolated cwd prevents repository-local
        // ignore auto-loading while retaining path-specific upstream rules.
        result = await invokeScanner(executable, ['dir', ...args, target], undefined, scratch)
        if (digest(readSource(target, item.oid ? scratch : fs.realpathSync(cwd))) !== digest(bytes)) throw Error('Source changed during scanning')
      } finally {
        if (item.oid) fs.unlinkSync(target) // Only this exclusively created file.
      }
      for (const raw of result) {
        const finding = { ...raw, file: item.file }
        if (!approvedFinding(finding, bytes, entries)) findings.push(finding)
      }
      inspected++
    }
  }))
  return { mode, findings: findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line), inspected }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2] || 'tree'
    if (!['tree', 'staged', 'range', 'history'].includes(mode)) throw Error('Unknown scan mode')
    const result = await scan(mode, { base: process.env.NEXUS_SCAN_BASE, head: process.env.NEXUS_SCAN_HEAD })
    console.log(JSON.stringify(result, null, 2))
    process.exitCode = result.findings.length ? 1 : 0
  } catch (error) {
    console.error('Secret scan incomplete: ' + error.message)
    process.exitCode = 2
  }
}
