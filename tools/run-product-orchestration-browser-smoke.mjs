import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp } from 'node:fs/promises'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const client = path.join(root, 'Nexus Main')
const require = createRequire(path.join(client, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/productOrchestrationHarness.tsx').replaceAll('\\', '/')
const server = await createServer({
  root: client, configFile: false, appType: 'custom', logLevel: 'error',
  cacheDir: path.join(client, 'node_modules/.vite-product-orchestration'),
  plugins: [react(), { name: 'product-orchestration-page', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__product_orchestration')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await server.transformIndexHtml(req.url, `<!doctype html><style>html,body,#root{height:100%;margin:0}body{background:#172033;color:white}</style><div id="root"></div><script type="module" src="${entry}"></script>`))
    })
  } }],
  resolve: { dedupe: ['react', 'react-dom'], alias: {
    '@nexus/core': path.join(root, 'packages/nexus-core/src'), '@nexus/api': path.join(root, 'packages/nexus-core/src/api'),
    react: path.join(client, 'node_modules/react'), 'react-dom': path.join(client, 'node_modules/react-dom'),
  } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'zustand/traditional', 'zustand/middleware', 'use-sync-external-store/shim/with-selector', 'react-dnd', 'react-dnd-html5-backend', 'framer-motion', 'react-markdown', 'remark-gfm', 'lucide-react', 'fast-deep-equal', 'style-to-js'] },
})
const evidence = path.resolve(process.argv.find(value => value.startsWith('--evidence='))?.slice(11) || path.join(root, '../.workspace-maintenance', new Date().toISOString().slice(0,10), 'v7-product-wave/visual'))
await mkdir(evidence, { recursive: true })
const profile = await mkdtemp(path.join(evidence, 'synthetic-profile-'))
try {
  await server.listen()
  const env = { ...process.env, NEXUS_PRODUCT_EVIDENCE: evidence, NEXUS_PRODUCT_PROFILE: profile, NEXUS_PRODUCT_URL: `http://127.0.0.1:${server.httpServer.address().port}/__product_orchestration` }
  delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/productOrchestrationElectron.cjs')], { env, stdio: 'inherit', windowsHide: true })
    child.on('error', reject)
    child.on('exit', resolve)
  })
  if (code !== 0) throw new Error(`Product orchestration browser smoke exited ${code}`)
} finally {
  await server.close()
  // Evidence and synthetic profile stay together for inspectable qualification; no recursive cleanup.
}
