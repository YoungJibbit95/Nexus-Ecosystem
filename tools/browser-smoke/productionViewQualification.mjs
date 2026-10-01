import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, readFile, readdir, writeFile, rm, cp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import http from 'node:http'
import path from 'node:path'
import vm from 'node:vm'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const evidence = path.resolve(process.argv.find(arg => arg.startsWith('--evidence='))?.slice(11) || path.join(root, '../Nexus V7 Recovery/implementation/evidence/b02-production'))
await mkdir(evidence, { recursive: true })
const profile = await mkdtemp(path.join(evidence, 'synthetic-profile-'))
const require = createRequire(path.join(root, 'Nexus Main/package.json'))
const hash = data => createHash('sha256').update(data).digest('hex')
async function inventory(directory, prefix = '') {
  const files = []
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const local = path.join(directory, entry.name), name = prefix + entry.name
    if (entry.isDirectory()) files.push(...await inventory(local, name + '/'))
    else { const bytes = await readFile(local); files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) }) }
  }
  return files
}
const sources = []
for (const dir of ['Nexus Main/src', 'Nexus Mobile/src', 'packages/nexus-core/src']) sources.push(...await inventory(path.join(root, dir), dir + '/'))
for (const file of ['Nexus Main/vite.config.ts', 'Nexus Mobile/vite.config.ts', 'Nexus Main/package-lock.json', 'Nexus Mobile/package-lock.json']) { const bytes = await readFile(path.join(root, file)); sources.push({ path: file, bytes: bytes.length, sha256: hash(bytes) }) }
await writeFile(path.join(evidence, 'source-pins.json'), JSON.stringify({ recordedAt: new Date().toISOString(), node: process.version, files: sources, aggregate: hash(JSON.stringify(sources)) }, null, 2))
const { build } = await import(pathToFileURL(require.resolve('vite')))
const themes = {}, urls = {}, servers = []
try {
  for (const [client, product] of [['main', 'Nexus Main'], ['mobile', 'Nexus Mobile']]) {
    const outDir = path.join(evidence, client)
    if (!outDir.startsWith(evidence + path.sep)) throw new Error('Unexpected build output')
    // Normal product config and entry; only the isolated output directory differs.
    if (process.argv.includes('--use-current-dist')) await cp(path.join(root, product, 'dist'), outDir, { recursive: true })
    else await build({ root: path.join(root, product), configFile: path.join(root, product, 'vite.config.ts'), logLevel: 'warn', build: { outDir, emptyOutDir: true } })
    const source = await readFile(path.join(root, product, 'src/store/themeStore.ts'), 'utf8')
    themes[client] = {}
    for (const [mode, preset] of [['dark', 'macOS Dark'], ['light', 'Light Clean']]) {
      const literal = new RegExp("'" + preset + "':\\s*(\\{[\\s\\S]*?\\n  \\}),").exec(source)?.[1]
      if (!literal) throw new Error('Missing actual theme preset')
      themes[client][mode] = { ...vm.runInNewContext('(' + literal + ')'), qol: { reducedMotion: true, fontSize: 14 } }
    }
    const server = http.createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
        if (pathname === '/seed.html') { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<!doctype html><meta charset="utf-8"><title>Synthetic profile initialization</title>'); return }
        const file = path.resolve(outDir, '.' + (pathname === '/' ? '/index.html' : pathname))
        if (!file.startsWith(outDir + path.sep)) { response.writeHead(403); response.end(); return }
        const data = await readFile(file), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data)
      } catch { response.writeHead(404); response.end() }
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server)
    urls[client] = `http://127.0.0.1:${server.address().port}`
    await writeFile(path.join(evidence, client + '-build-pins.json'), JSON.stringify(await inventory(outDir), null, 2))
  }
  const requestedClient = process.argv.find(arg => arg.startsWith('--client='))?.slice(9)
  if (requestedClient && !['main', 'mobile'].includes(requestedClient)) throw new Error('Invalid client filter')
  const requestedViews = process.argv.find(arg => arg.startsWith('--views='))?.slice(8).split(',')
  const fixture = { themes, urls, profile, evidence, clients: requestedClient ? [requestedClient] : ['main', 'mobile'], views: requestedViews }
  const fixturePath = path.join(evidence, 'synthetic-fixture.json'); await writeFile(fixturePath, JSON.stringify(fixture, null, 2))
  const env = { ...process.env, NEXUS_B02_FIXTURE: fixturePath }; delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => { const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/productionViewQualificationElectron.cjs')], { env, stdio: 'inherit', windowsHide: true }); child.on('error', reject); child.on('exit', resolve) })
  if (code !== 0) throw new Error(`Production view matrix exited ${code}`)
  const result = JSON.parse(await readFile(path.join(evidence, 'browser-results.json'), 'utf8'))
  if (!result.ok || !result.probes.length) throw new Error('Production matrix did not complete successfully')
  for (const file of sources) if (hash(await readFile(path.join(root, file.path))) !== file.sha256) throw new Error('Source changed during qualification: ' + file.path)
  await writeFile(path.join(evidence, 'source-stability.json'), JSON.stringify({ stable: true, checkedFiles: sources.length, aggregate: hash(JSON.stringify(sources)) }, null, 2))
} finally {
  for (const server of servers) await new Promise(resolve => server.close(resolve))
  if (path.dirname(path.resolve(profile)) !== evidence || !path.basename(profile).startsWith('synthetic-profile-')) throw new Error('Unexpected disposable profile cleanup target')
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
