import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { gzipSync, brotliCompressSync } from 'node:zlib'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const client = path.join(root, 'Nexus Main'), require = createRequire(path.join(client, 'package.json'))
const evidence = path.resolve(process.argv.find(value => value.startsWith('--evidence='))?.slice(11) || path.join(root, '../Nexus V7 Recovery/implementation/evidence/production-render-before'))
await mkdir(evidence, { recursive: true })
const profile = await mkdtemp(path.join(evidence, 'synthetic-profile-'))
const { build } = await import(pathToFileURL(require.resolve('vite')))
const assets = { main: path.join(evidence, 'main'), fixture: path.join(evidence, 'fixture') }
let server
try {
  for (const name of process.argv.includes('--reuse-build') ? [] : process.argv.includes('--fixture-only') ? ['fixture'] : ['main', 'fixture']) {
    const outDir = assets[name]
    if (!path.resolve(outDir).startsWith(evidence + path.sep)) throw new Error('Unexpected build output path')
    await build({ root: client, configFile: path.join(client, 'vite.config.ts'), logLevel: 'warn',
      ...(name === 'fixture' ? { resolve: { alias: [{ find: /^react-dom\/client$/, replacement: path.join(client, 'node_modules/react-dom/profiling.js') }] } } : {}),
      build: { outDir, emptyOutDir: true, manifest: 'manifest.json', ...(name === 'fixture' ? { rollupOptions: { input: path.join(root, 'tools/browser-smoke/renderPerformanceHarness.tsx') } } : {}) },
    })
    if (name === 'fixture') {
      const manifest = JSON.parse(await readFile(path.join(outDir, 'manifest.json'), 'utf8'))
      const entry = Object.values(manifest).find(value => value.isEntry)
      await writeFile(path.join(outDir, 'index.html'), `<!doctype html><meta charset="utf-8">${(entry.css || []).map(css=>`<link rel="stylesheet" href="./${css}">`).join('')}<div id="root"></div><script type="module" src="./${entry.file}"></script>`)
    }
  }
  const manifest = JSON.parse(await readFile(path.join(assets.main, 'manifest.json'), 'utf8'))
  const entryKey = Object.keys(manifest).find(key => manifest[key].isEntry), closure = new Set(), files = new Set()
  function visit(key) { if (closure.has(key)) return; closure.add(key); const entry=manifest[key]; files.add(entry.file); (entry.css || []).forEach(file=>files.add(file)); (entry.imports || []).forEach(visit) }
  visit(entryKey)
  const sizes = []
  for (const file of files) { const content=await readFile(path.join(assets.main,file)); sizes.push({file,bytes:content.length,gzip:gzipSync(content).length,brotli:brotliCompressSync(content).length}) }
  await writeFile(path.join(evidence, 'initial-asset-closure.json'), JSON.stringify({entryKey,sizes},null,2))
  server = http.createServer(async (request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).slice(1)
      const file = path.resolve(evidence, relative)
      if (!Object.values(assets).some(directory=>file.startsWith(directory + path.sep))) { response.writeHead(403); response.end(); return }
      const data=await readFile(file)
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'}
      response.writeHead(200, {'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'}); response.end(data)
    } catch { response.writeHead(404); response.end() }
  })
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
  const env={...process.env,NEXUS_RENDER_EXPECT_FIXED:String(process.argv.includes('--expect-fixed')),NEXUS_RENDER_PROFILE:profile,NEXUS_RENDER_BASE:`http://127.0.0.1:${server.address().port}`,NEXUS_RENDER_RESULTS:path.join(evidence,'browser-results.json'),NEXUS_RENDER_SCREENSHOT:path.join(evidence,'main.png')};delete env.ELECTRON_RUN_AS_NODE
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[require.resolve('electron/cli.js'),path.join(root,'tools/browser-smoke/render-performance-electron.cjs')],{env,stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',resolve)})
  if(code!==0)throw new Error(`Production render measurement exited ${code}`)
} finally {
  if(server)await new Promise(resolve=>server.close(resolve))
  if(!path.resolve(profile).startsWith(evidence+path.sep+'synthetic-profile-'))throw new Error('Unexpected synthetic profile cleanup path')
  await rm(profile,{recursive:true,force:true})
}
