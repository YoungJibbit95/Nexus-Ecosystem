import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, mkdtemp, rm, readFile, unlink } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), client = path.join(root, 'Nexus Main')
const require = createRequire(path.join(client, 'package.json'))
const evidence = path.resolve(process.argv.find(value => value.startsWith('--evidence='))?.slice(11) || path.join(root, '../Nexus V7 Recovery/implementation/evidence/application-capture'))
await mkdir(evidence, { recursive: true })
await unlink(path.join(evidence,'browser-results.json')).catch(error => { if (error.code !== 'ENOENT') throw error })
const profile = await mkdtemp(path.join(evidence, 'synthetic-profile-'))
const { createServer } = await import(pathToFileURL(require.resolve('vite'))), { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/applicationCaptureHarness.tsx').replaceAll('\\','/')
const servers = []
try {
  for (const kind of ['main','mobile']) {
    const server = await createServer({ root: client, configFile: false, appType: 'custom', logLevel: 'error', cacheDir: path.join(profile, `vite-${kind}`), plugins: [react(), { name: 'capture-page', configureServer(server) { server.middlewares.use(async (req,res,next) => { if (!req.url?.startsWith('/__capture')) return next(); res.setHeader('Content-Type','text/html'); res.end(await server.transformIndexHtml(req.url, `<!doctype html><style>html,body,#root{height:100%;margin:0}body{background:#172033;color:white}</style><div id="root"></div><script type="module" src="${entry}"></script>`)) }) } }],
      resolve: { dedupe: ['react','react-dom'], alias: { '@nexus/core': path.join(root,'packages/nexus-core/src'), '@nexus/api': path.join(root,'packages/nexus-core/src/api'), '@': path.join(client,'src'), react: path.join(client,'node_modules/react'), 'react-dom': path.join(client,'node_modules/react-dom') } },
      server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } }, optimizeDeps: { noDiscovery: true, include: ['react','react-dom','react-dom/client','zustand/traditional','zustand/middleware','use-sync-external-store/shim/with-selector','react-dnd','react-dnd-html5-backend','framer-motion','react-markdown','remark-gfm','lucide-react','fast-deep-equal','style-to-js'] } })
    await server.listen(); servers.push(server)
  }
  const env = { ...process.env, NEXUS_CAPTURE_PROFILE: profile, NEXUS_CAPTURE_RESULTS: path.join(evidence,'browser-results.json'), NEXUS_CAPTURE_MAIN_URL: `http://127.0.0.1:${servers[0].httpServer.address().port}/__capture`, NEXUS_CAPTURE_MOBILE_URL: `http://127.0.0.1:${servers[1].httpServer.address().port}/__capture` }; delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve,reject) => { const child = spawn(process.execPath,[require.resolve('electron/cli.js'),path.join(root,'tools/browser-smoke/applicationCaptureElectron.cjs')],{ env,stdio:'inherit',windowsHide:true }); child.once('error',reject); child.once('exit',resolve) })
  if (code !== 0) throw new Error(`Application capture smoke exited ${code}`)
  const proof = JSON.parse(await readFile(path.join(evidence,'browser-results.json'),'utf8'))
  if (proof.ok !== true || proof.stages.length !== 8 || !['main','mobile'].every(client => ['forms','accessibility','fault','reload'].every(phase => proof.stages.some(stage => stage.client === client && stage.phase === phase)))) throw new Error('Missing complete Main/Mobile capture proof')
} finally {
  for (const server of servers) await server.close()
  const absolute = path.resolve(profile)
  if (!absolute.startsWith(evidence + path.sep + 'synthetic-profile-')) throw new Error('Unexpected capture test cleanup path')
  await rm(absolute,{ recursive:true,force:true,maxRetries:5,retryDelay:100 })
}
