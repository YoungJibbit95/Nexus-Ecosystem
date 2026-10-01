import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const client = path.join(root, 'Nexus Main'), require = createRequire(path.join(client, 'package.json'))
const evidence = path.resolve(process.argv.find(value => value.startsWith('--evidence='))?.slice(11) || path.join(root, '../Nexus V7 Recovery/implementation/evidence/planning-exchange'))
await mkdir(evidence, { recursive: true })
const profile = await mkdtemp(path.join(evidence, 'synthetic-profile-'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/planningExchangeHarness.tsx').replaceAll('\\', '/')
const servers = []
try {
  for (const kind of ['main', 'mobile']) {
    const server = await createServer({ root: client, cacheDir: path.join(profile, `vite-${kind}`), configFile: false, appType: 'custom', logLevel: 'error', plugins: [react(), { name: 'exchange-page', configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/__exchange')) return next()
        res.setHeader('Content-Type', 'text/html')
        res.end(await server.transformIndexHtml(req.url, `<!doctype html><div id="root"></div><script type="module" src="${entry}"></script>`))
      })
    } }], resolve: { dedupe: ['react', 'react-dom'], alias: { '@nexus/core': path.join(root, 'packages/nexus-core/src'), '@nexus/api': path.join(root, 'packages/nexus-core/src/api'), react: path.join(client, 'node_modules/react'), 'react-dom': path.join(client, 'node_modules/react-dom') } },
    server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } }, optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'zustand/traditional', 'zustand/middleware', 'use-sync-external-store/shim/with-selector'] } })
    await server.listen(); servers.push(server)
  }
  const env = { ...process.env, NEXUS_EXCHANGE_PROFILE: profile, NEXUS_EXCHANGE_RESULTS: path.join(evidence, 'browser-results.json'), NEXUS_EXCHANGE_MAIN_URL: `http://127.0.0.1:${servers[0].httpServer.address().port}/__exchange`, NEXUS_EXCHANGE_MOBILE_URL: `http://127.0.0.1:${servers[1].httpServer.address().port}/__exchange` }
  delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/planning-exchange-electron.cjs')], { env, stdio: 'inherit', windowsHide: true })
    child.once('error', reject); child.once('exit', resolve)
  })
  if (code !== 0) throw new Error(`Planning exchange browser smoke exited ${code}`)
} finally {
  for (const server of servers) await server.close()
  const absoluteProfile = path.resolve(profile)
  if (!absoluteProfile.startsWith(evidence + path.sep + 'synthetic-profile-')) throw new Error('Unexpected synthetic profile cleanup path')
  await rm(absoluteProfile, { recursive: true, force: true })
}
