import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), client = path.join(root, 'Nexus Main')
const require = createRequire(path.join(client, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/planningInteractionHarness.tsx').replaceAll('\\', '/')
const server = await createServer({ root: client, configFile: false, appType: 'custom', logLevel: 'error', cacheDir: path.join(client, 'node_modules/.vite-planning-interaction'),
  plugins: [react(), { name: 'planning-interaction-page', configureServer(server) { server.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/__planning_interaction')) return next()
    res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(req.url, `<!doctype html><style>html,body,#root{height:100%;margin:0}body{background:#172033;color:white}</style><div id="root"></div><script type="module" src="${entry}"></script>`))
  }) } }],
  resolve: { dedupe: ['react', 'react-dom'], alias: { '@nexus/core': path.join(root, 'packages/nexus-core/src'), '@nexus/api': path.join(root, 'packages/nexus-core/src/api'), react: path.join(client, 'node_modules/react'), 'react-dom': path.join(client, 'node_modules/react-dom') } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } },
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'zustand/traditional', 'zustand/middleware', 'use-sync-external-store/shim/with-selector', 'react-dnd', 'react-dnd-html5-backend', 'framer-motion', 'react-markdown', 'remark-gfm', 'lucide-react', 'fast-deep-equal', 'style-to-js'] },
})
const profile = await mkdtemp(path.join(os.tmpdir(), 'nexus-planning-interaction-'))
try {
  await server.listen()
  const env = { ...process.env, NEXUS_PLANNING_PROFILE: profile, NEXUS_PLANNING_URL: `http://127.0.0.1:${server.httpServer.address().port}/__planning_interaction` }; delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => { const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/planningInteractionElectron.cjs')], { env, stdio: 'inherit', windowsHide: true }); child.on('error', reject); child.on('exit', resolve) })
  if (code !== 0) throw new Error(`Planning interaction browser smoke exited ${code}`)
} finally {
  await server.close()
  if (path.dirname(path.resolve(profile)) !== path.resolve(os.tmpdir()) || !path.basename(profile).startsWith('nexus-planning-interaction-')) throw new Error('Invalid planning test profile cleanup path')
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
