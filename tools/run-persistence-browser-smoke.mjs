import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const client = path.join(root, 'Nexus Code')
const require = createRequire(path.join(client, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/persistenceHarness.tsx').replaceAll('\\', '/')
const server = await createServer({
  root: client, configFile: false, appType: 'custom', logLevel: 'error',
  plugins: [react(), { name: 'persistence-test-page', configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__persistence')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await server.transformIndexHtml(req.url, `<!doctype html><div id="root"></div><script type="module" src="${entry}"></script>`))
    })
  } }],
  resolve: { dedupe: ['react', 'react-dom'], alias: {
    '@nexus/core': path.join(root, 'packages/nexus-core/src'), '@nexus/api': path.join(root, 'packages/nexus-core/src/api'),
    zustand: path.join(root, 'Nexus Main/node_modules/zustand'),
    'use-sync-external-store': path.join(root, 'Nexus Main/node_modules/use-sync-external-store'),
    react: path.join(client, 'node_modules/react'), 'react-dom': path.join(client, 'node_modules/react-dom'),
  } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'zustand/traditional', 'zustand/middleware', 'use-sync-external-store/shim/with-selector'] },
})
try {
  await server.listen()
  const address = server.httpServer.address()
  const url = `http://127.0.0.1:${address.port}/__persistence`
  const env = { ...process.env, NEXUS_PERSISTENCE_SMOKE_URL: url }
  delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/electron.cjs')], { env, stdio: 'inherit', windowsHide: true })
    child.on('error', reject)
    child.on('exit', resolve)
  })
  if (code !== 0) throw new Error(`Persistence browser smoke exited ${code}`)
} finally { await server.close() }
