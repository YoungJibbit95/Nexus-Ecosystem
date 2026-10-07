import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.github/action-pins.json'), 'utf8'))
const workflows = Object.fromEntries(fs.readdirSync(path.join(root, '.github/workflows'))
  .filter(name => /\.ya?ml$/.test(name))
  .map(name => [name, fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8')]))
const authorizedWrites = {
  'dependency-review.yml:dependency-review': ['pull-requests'],
  'codeql.yml:analyze': ['security-events'],
  'pages-wiki.yml:deploy': ['id-token', 'pages'],
  'build-installers.yml:publish': ['contents'],
  'build-android.yml:publish': ['contents'],
}

// Deliberately narrow checks for the repository's workflow layout. Hosted
// environment/branch protection remains an independent operator requirement.
function assertWorkflow(name, source) {
  source = source.replaceAll('\r\n', '\n')
  for (const line of source.split('\n').filter(line => /^\s*permissions:/.test(line))) assert.match(line, /^\s*permissions:\s*$/, 'Permission maps must use the reviewed block layout')
  const header = source.split(/^jobs:/m)[0]
  assert.match(header, /^permissions:\r?\n  contents: read\r?\n(?:\r?\n|$)/m, 'Global permissions must be exactly contents: read')
  assert.doesNotMatch(header, /secrets\.|github\.token/)
  if (manifest.requiredWorkflows.includes(name)) {
    assert.match(header, /^  pull_request:/m)
    assert.doesNotMatch(header, /^    paths(?:-ignore)?:/m, 'Required status must run for documentation-only PRs too')
  }
  const refs = [...source.matchAll(/^\s+(?:- )?uses:\s+([^\s#]+)/gm)].map(match => match[1])
  for (const ref of refs) {
    assert.match(ref, /^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/)
    assert.ok(Object.hasOwn(manifest.actions, ref), 'Action pin must have recorded official provenance')
  }
  for (const step of source.split(/^      - /m).slice(1)) {
    if (/uses: actions\/checkout@/.test(step)) assert.match(step, /persist-credentials: false/)
  }
  const jobs = [...source.slice(source.indexOf('\njobs:')).matchAll(/^  ([A-Za-z0-9_-]+):\r?\n([\s\S]*?)(?=^  [A-Za-z0-9_-]+:\r?\n|$(?![\s\S]))/gm)]
  for (const [, job, body] of jobs) {
    const permissions = body.match(/^    permissions:\r?\n((?:      [\w-]+: [\w]+\r?\n)+)/m)?.[1] || ''
    const writes = [...permissions.matchAll(/^      ([\w-]+): write$/gm)].map(match => match[1]).sort()
    assert.deepEqual(writes, authorizedWrites[name+':'+job] || [], 'Write permissions must remain on the dedicated job')
  }
  return refs
}

test('all workflows use verified immutable actions, nonpersistent checkout credentials and scoped tokens', () => {
  const refs = new Set()
  for (const [name, source] of Object.entries(workflows)) for (const ref of assertWorkflow(name, source)) refs.add(ref)
  assert.deepEqual([...refs].sort(), Object.keys(manifest.actions).sort())
  for (const metadata of Object.values(manifest.actions)) assert.match(metadata.source, /^https:\/\/api\.github\.com\/repos\/[\w.-]+\/[\w.-]+\/git\/ref\/(tags|heads)\//)
  for (const name of manifest.requiredWorkflows) assert.ok(Object.hasOwn(workflows, name))
})

test('mutable/unrecorded actions, retained credentials, broad tokens and skipped required contexts fail closed', () => {
  const name = manifest.requiredWorkflows[0], source = workflows[name].replaceAll('\r\n', '\n')
  assertWorkflow(name, source.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'))
  for (const mutate of [
    value => value.replace(/@[a-f0-9]{40}/, '@v5'),
    value => value.replace(/@[a-f0-9]{40}/, '@'+'0'.repeat(40)),
    value => value.replace('persist-credentials: false', 'persist-credentials: true'),
    value => value.replace('  contents: read', '  contents: write'),
    value => value.replace('permissions:\n  contents: read', 'permissions: write-all'),
    value => value.replace('  pull_request:', '  push_mistake:'),
    value => value.replace('  pull_request:', "  pull_request:\n    paths: ['source/**']"),
  ]) {
    const candidate = mutate(source)
    assert.notEqual(candidate, source)
    assert.throws(() => assertWorkflow(name, candidate))
  }
})
