import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { mkdir, mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceBase = path.resolve(root, '../Nexus V7 Recovery/implementation/evidence')
const output = path.resolve(process.argv.find(value => value.startsWith('--evidence='))?.slice(11) || path.join(evidenceBase, 'production-interaction'))
const candidate = process.argv.find(value => value.startsWith('--candidate='))?.slice(12)
const label = process.argv.find(value => value.startsWith('--label='))?.slice(8) || 'candidate'
if(!/^[a-z][a-z0-9-]+$/.test(label))throw new Error('Invalid measurement case label')
const builds = candidate ? { [label]:path.resolve(candidate) } : { before: path.join(evidenceBase, 'production-render-before/main'), final: path.join(evidenceBase, 'production-render-final/main') }
const require = createRequire(path.join(root, 'Nexus Main/package.json'))
const stamp = '2026-09-30T10:00:00.000Z'
const fixture = { notes: ['welcome-v6-release','views-guide-v6-release','markdown-showcase-v6-release','canvas-guide-v6-release','ops-guide-v6-release'].map((id, index) => ({ id, title: `Performance note ${index + 1}`, content: `# Performance note ${index + 1}\n\nIdentical synthetic local document.\n\n- Context\n- Follow-up\n`, tags: [], created: stamp, updated: stamp, dirty: false })),
  openNoteIds: ['welcome-v6-release'], activeNoteId: 'welcome-v6-release', codes: [], openCodeIds: [], activeCodeId: null,
  tasks: [1,2,3].map(index => ({ id: `task-welcome-${index}`, title: `Performance task ${index}`, desc: 'Identical synthetic local work', status: index === 3 ? 'doing' : 'todo', priority: 'mid', tags: [], subtasks: [], created: stamp, updated: stamp })), reminders: [], folders: [], activities: [] }
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
async function inventory(directory) {
  const files = []
  async function visit(relative = '') { for (const item of await readdir(path.join(directory, relative), { withFileTypes: true })) { const name = path.join(relative, item.name); if (item.isDirectory()) await visit(name); else if (item.isFile()) { const bytes = await readFile(path.join(directory, name)); files.push({ path: name.replaceAll('\\','/'), bytes: bytes.length, sha256: sha(bytes) }) } } }
  await visit(); files.sort((a,b) => a.path.localeCompare(b.path)); return files
}
await mkdir(output, { recursive: true })
const fixtureBytes = Buffer.from(JSON.stringify(fixture))
await writeFile(path.join(output, 'fixture.json'), fixtureBytes)
const original = Object.fromEntries(await Promise.all(Object.entries(builds).map(async ([name, directory]) => [name, await inventory(directory)])))
await writeFile(path.join(output, 'source-artifact-inventory.json'), JSON.stringify({ builds, files: original, fixtureSha256: sha(fixtureBytes), orchestration: { node: process.version, platform: process.platform, release: os.release(), arch: process.arch, cpus: os.cpus().map(cpu => cpu.model), totalMemory: os.totalmem() } }, null, 2))
const profile = await mkdtemp(path.join(output, 'synthetic-interaction-profile-'))
const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== 'GET') { response.writeHead(405); response.end(); return }
    const [, name, ...parts] = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).split('/')
    const directory = builds[name], filename = directory && path.resolve(directory, parts.join('/'))
    if (!filename || !filename.startsWith(directory + path.sep)) { response.writeHead(403); response.end(); return }
    const bytes = await readFile(filename)
    const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.woff':'font/woff' }
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-store' }); response.end(bytes)
  } catch { response.writeHead(404); response.end() }
})
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const env = { ...process.env, NEXUS_INTERACTION_BASE: `http://127.0.0.1:${server.address().port}`, NEXUS_INTERACTION_PROFILE: profile, NEXUS_INTERACTION_OUTPUT: output, NEXUS_INTERACTION_FIXTURE: JSON.stringify(fixture), NEXUS_INTERACTION_NAMES:JSON.stringify(Object.keys(builds)) }; delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve,reject) => { const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root,'tools/browser-smoke/production-interaction-electron.cjs')], { env, stdio:'inherit', windowsHide:true }); child.on('error', reject); child.on('exit', resolve) })
  if (code !== 0) throw new Error(`Production interaction measurement exited ${code}`)
  for (const [name, directory] of Object.entries(builds)) if (JSON.stringify(await inventory(directory)) !== JSON.stringify(original[name])) throw new Error(`Immutable retained artifact changed: ${name}`)
  await writeFile(path.join(output, 'immutable-artifacts-verified.json'), JSON.stringify({ ok:true, builds, files:original, checkedAtUtc:new Date().toISOString() }, null, 2))
} finally {
  await new Promise(resolve => server.close(resolve))
  if (path.dirname(path.resolve(profile)) !== output || !path.basename(profile).startsWith('synthetic-interaction-profile-')) throw new Error('Unsafe synthetic interaction profile cleanup path')
  await rm(profile, { recursive:true, force:true, maxRetries:5, retryDelay:100 })
}
