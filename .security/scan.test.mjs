import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { scan, approvedFinding } from './scan.mjs'
import { artifacts, childEnv, digest, installScanner, regularFile } from './runtime.mjs'

test('real scanner blocks tree, staged and new-commit secrets, while ignored runtime files stay outside the scan', async () => {
  const executable = await installScanner()
  const cwd = fs.mkdtempSync(path.join(artifacts(), 'secret-regression-'))
  const git = args => {
    const result = spawnSync('git', args, { cwd, env: childEnv(), windowsHide: true, encoding: 'utf8' })
    assert.equal(result.status, 0, 'Synthetic Git operation failed')
    return result.stdout.trim()
  }
  git(['init', '--quiet'])
  git(['config', 'user.name', 'Synthetic scanner test'])
  git(['config', 'user.email', 'scanner@example.invalid'])
  fs.writeFileSync(path.join(cwd, '.gitignore'), '.env\nignored/\n')
  fs.writeFileSync(path.join(cwd, 'source.txt'), 'ordinary source\n')
  git(['add', '--', '.gitignore', 'source.txt'])
  git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'synthetic clean base'])
  const base = git(['rev-parse', 'HEAD'])
  const token = 'gh' + 'p_' + randomBytes(20).toString('hex')
  const secretLine = 'token = "' + token + '"\n'
  fs.writeFileSync(path.join(cwd, '.env'), secretLine)
  assert.equal((await scan('tree', { cwd, executable })).findings.length, 0)
  fs.writeFileSync(path.join(cwd, 'new.txt'), secretLine.trimEnd() + ' # gitleaks:allow\n')
  fs.writeFileSync(path.join(cwd, '.gitleaksignore'), ':github-pat:1\nnew.txt:github-pat:1\n')
  const tree = await scan('tree', { cwd, executable })
  assert.ok(tree.findings.some(f => f.file === 'new.txt' && f.rule === 'github-pat'))
  assert.ok(!JSON.stringify(tree).includes(token))
  assert.equal((await scan('staged', { cwd, executable })).findings.length, 0)
  git(['add', '--', 'new.txt'])
  fs.writeFileSync(path.join(cwd, 'new.txt'), 'safe working copy must not hide staged bytes\n')
  const staged = await scan('staged', { cwd, executable })
  assert.ok(staged.findings.some(f => f.rule === 'github-pat'))
  assert.ok(!JSON.stringify(staged).includes(token))
  git(['-c', 'commit.gpgsign=false', 'commit', '-qm', 'synthetic forbidden credential'])
  const head = git(['rev-parse', 'HEAD'])
  await assert.rejects(scan('range', { cwd, executable, base, head }), /gitleaksignore/)
  fs.unlinkSync(path.join(cwd, '.gitleaksignore'))
  assert.ok((await scan('range', { cwd, executable, base, head })).findings.length > 0)
  assert.ok((await scan('history', { cwd, executable })).findings.length > 0)
  await assert.rejects(scan('range', { cwd, executable, base: '--all', head }))
  git(['add', '--', 'new.txt'])
  assert.equal((await scan('staged', { cwd, executable })).findings.length, 0)
  // A detector restricted to file extensions must retain its path context.
  fs.writeFileSync(path.join(cwd, 'sample.tf'), 'administrator_login_password = "' + randomBytes(9).toString('hex') + '"\n')
  git(['add', '--', 'sample.tf'])
  assert.ok((await scan('staged', { cwd, executable })).findings.some(f => f.rule === 'hashicorp-tf-password'))
  git(['reset', '--', 'sample.tf'])
  // Direct input aliases never cause reads from their target.
  const outside = fs.mkdtempSync(path.join(artifacts(), 'secret-external-'))
  fs.writeFileSync(path.join(outside, 'secret.txt'), secretLine)
  const link = path.join(cwd, 'linked')
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir')
  assert.throws(() => regularFile(path.join(link, 'secret.txt'), cwd), /Linked/)
  await assert.rejects(scan('tree', { cwd, executable }), /unsafe/)
  fs.unlinkSync(link) // Nonrecursive, known synthetic link only.
  const hardlink = path.join(cwd, 'hardlinked.txt')
  fs.linkSync(path.join(outside, 'secret.txt'), hardlink)
  assert.throws(() => regularFile(hardlink, cwd), /hardlinked/)
  fs.unlinkSync(hardlink)
  fs.writeFileSync(path.join(cwd, '.env.credentials'), secretLine)
  git(['add', '--', '.env.credentials'])
  await assert.rejects(scan('staged', { cwd, executable }), /Runtime environment file/)
  git(['reset', '--', '.env.credentials'])
  fs.mkdirSync(path.join(cwd, 'data'))
  fs.writeFileSync(path.join(cwd, 'data/users.json'), '{}')
  git(['add', '--', 'data/users.json'])
  await assert.rejects(scan('staged', { cwd, executable }), /Runtime account state/)
})

test('synthetic exceptions require exact file, rule and reviewed line hash', () => {
  const bytes = Buffer.from('a harmless explicitly synthetic fixture\n')
  const finding = { file: 'test/fixture.txt', rule: 'generic-api-key', line: 1 }
  const entries = [{ ...finding, lineSha256: digest(bytes.toString().trimEnd()), reason: 'Reviewed synthetic placeholder; not authentication material.' }]
  assert.equal(approvedFinding(finding, bytes, entries), true)
  assert.equal(approvedFinding({ ...finding, file: 'production.txt' }, bytes, entries), false)
  assert.equal(approvedFinding({ ...finding, rule: 'private-key' }, bytes, entries), false)
  assert.equal(approvedFinding(finding, Buffer.from('changed input'), entries), false)
})

test('scanner tool tampering fails before executable startup', async () => {
  const directory = fs.mkdtempSync(path.join(artifacts(), 'secret-bad-tool-'))
  const executable = path.join(directory, process.platform === 'win32' ? 'fake.exe' : 'fake')
  fs.writeFileSync(executable, 'not a scanner')
  const previous = process.env.NEXUS_GITLEAKS
  process.env.NEXUS_GITLEAKS = executable
  try { await assert.rejects(installScanner(), /digest mismatch/) }
  finally { if (previous === undefined) delete process.env.NEXUS_GITLEAKS; else process.env.NEXUS_GITLEAKS = previous }
})
