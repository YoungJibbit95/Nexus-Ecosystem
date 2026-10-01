import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawn, spawnSync, execFileSync } from 'node:child_process'
import { copyFile, mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), client = path.join(root, 'Nexus Main')
const coreRequire = createRequire(path.join(root, 'packages/nexus-core/package.json'))
if (process.env.NEXUS_CEREBRI_N2_LOADER !== '1') {
  const child = spawnSync(process.execPath, ['--import', pathToFileURL(coreRequire.resolve('tsx/esm')).href, fileURLToPath(import.meta.url)], { env: { ...process.env, NEXUS_CEREBRI_N2_LOADER: '1' }, stdio: 'inherit', windowsHide: true })
  if (child.error) throw child.error
  process.exit(child.status ?? 1)
}
const source = process.env.NEXUS_CEREBRI_N1_SOURCE
if (!source || !path.isAbsolute(source)) throw new Error('An explicit pinned synthetic source worktree is required')
const { createCerebriPreviewHost } = await import('../Nexus Main/electron/cerebri-preview-host.mjs')
const { REVIEWED_CEREBRI_SOURCE, artifactSha256 } = await import('../Nexus Main/electron/cerebri-host.mjs')
const { createSuggestionOwner } = await import('../packages/nexus-core/src/planning/cerebri/owner.ts')
const { prepareSuggestion } = await import('../packages/nexus-core/src/planning/cerebri/adapter.ts')
const { validPreviewRequest } = await import('../packages/nexus-core/src/planning/cerebri/inputContracts.ts')
const { syntheticSnapshot } = await import('../packages/nexus-core/test/fixtures/cerebriSynthetic.ts')
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, windowsHide: true, encoding: 'utf8' }).trim() !== REVIEWED_CEREBRI_SOURCE) throw new Error('Source pin mismatch')
const profile = await mkdtemp(path.join(os.tmpdir(), 'nexus-cerebri-n2-'))
const suffix = process.platform === 'win32' ? '.exe' : ''
const configuration = { sourceSha: REVIEWED_CEREBRI_SOURCE, binary: path.join(source, 'target/debug/cerebri-node-bridge' + suffix), nodeModule: path.join(source, 'bindings/node/index.mjs'), timeoutMs: 10000 }
configuration.binarySha256 = await artifactSha256(configuration.binary)
const transport = path.join(profile, 'fixture' + suffix), hanging = path.join(profile, 'hang' + suffix)
execFileSync('rustc', ['--edition=2024', path.join(source, 'bindings/node/test-fixtures/bridge.rs'), '-o', transport], { cwd: source, windowsHide: true })
await copyFile(transport, hanging)
const hangingHash = await artifactSha256(hanging)
const require = createRequire(path.join(client, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
let context = syntheticSnapshot(), host, mode = 'complete', previews = 0, confirmations = 0
const requests = []
function reset(next) {
  host?.dispose(); mode = next; context = syntheticSnapshot()
  if (next === 'unknown') context = { ...context, coverage: 'Incomplete' }
  if (next === 'denied') context = { ...context, plan: false }
  if (next === 'nofit') context = { ...context, busy: [{ ...context.busy[0], range: context.window }] }
  if (next === 'budget') context = { ...context, maxCandidates: 6 }
  const config = next === 'offline' ? { ...configuration, binary: path.join(profile, 'absent' + suffix) } : next === 'timeout' ? { ...configuration, binary: hanging, binarySha256: hangingHash, timeoutMs: 3000 } : configuration
  host = createCerebriPreviewHost({ consumer: createSuggestionOwner, prepare: prepareSuggestion, validRequest: validPreviewRequest,
    enabled: next !== 'disabled', configuration: config, capture: async () => structuredClone(context), currentSnapshot: () => context })
}
reset('complete')
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/cerebriPreviewHarness.tsx').replaceAll('\\', '/')
const server = await createServer({ root: client, configFile: false, appType: 'custom', logLevel: 'error', cacheDir: path.join(client, 'node_modules/.vite-cerebri-preview'),
  plugins: [react(), { name: 'synthetic-cerebri-preview', configureServer(server) { server.middlewares.use(async (req, res, next) => {
    if (!req.url?.startsWith('/__cerebri_n2')) return next()
    const pathname = req.url.split('?')[0]
    if (pathname === '/__cerebri_n2') { res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(req.url, `<!doctype html><style>body{margin:0;padding:20px;background:#101827;color:#edf1f8;font:16px system-ui}button,input,select{font:inherit}button{padding:6px 10px}input,select{color:#111;background:#fff}</style><div id="root"></div><script type="module" src="${entry}"></script>`)); return }
    res.setHeader('Content-Type', 'application/json')
    try {
      if (pathname === '/__cerebri_n2/stats' && req.method === 'GET') { res.end(JSON.stringify({ mode, previews, confirmations, requests, sourceSha: REVIEWED_CEREBRI_SOURCE, binarySha256: configuration.binarySha256, syntheticTransportSha256: hangingHash })); return }
      if (req.method !== 'POST' || req.headers.origin !== `http://${req.headers.host}`) { res.statusCode = 400; res.end('{"error":"synthetic_request_rejected"}'); return }
      let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) throw new Error('bounded fixture input') }
      const payload = JSON.parse(raw)
      if (pathname === '/__cerebri_n2/mode') {
        if (Object.keys(payload).length !== 1 || !['complete', 'unknown', 'denied', 'nofit', 'budget', 'offline', 'timeout', 'disabled', 'mutate-host'].includes(payload.mode)) throw new Error('invalid synthetic mode')
        if (payload.mode === 'mutate-host') context = { ...context, contextRevision: context.contextRevision + 1 }
        else reset(payload.mode)
        res.end('{"ok":true}'); return
      }
      if (pathname === '/__cerebri_n2/preview') { previews++; requests.push(structuredClone(payload)); res.end(JSON.stringify(await host.preview(payload))); return }
      if (pathname === '/__cerebri_n2/revalidate') { confirmations++; res.end(JSON.stringify(await host.revalidate(payload))); return }
      throw new Error('unknown fixture route')
    } catch { res.statusCode = 400; res.end('{"error":"synthetic_request_rejected"}') }
  }) } }],
  resolve: { dedupe: ['react', 'react-dom'], alias: { '@nexus/core': path.join(root, 'packages/nexus-core/src'), '@nexus/api': path.join(root, 'packages/nexus-core/src/api'), react: path.join(client, 'node_modules/react'), 'react-dom': path.join(client, 'node_modules/react-dom') } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } },
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'zustand/traditional', 'zustand/middleware', 'use-sync-external-store/shim/with-selector'] },
})
try {
  await server.listen()
  const env = { ...process.env, NEXUS_CEREBRI_N2_PROFILE: profile, NEXUS_CEREBRI_N2_URL: `http://127.0.0.1:${server.httpServer.address().port}/__cerebri_n2` }; delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => { const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/cerebriPreviewElectron.cjs')], { env, stdio: 'inherit', windowsHide: true }); child.on('error', reject); child.on('exit', resolve) })
  if (code !== 0) throw new Error(`Cerebri local browser smoke exited ${code}`)
} finally {
  host.dispose(); await server.close()
  if (path.dirname(path.resolve(profile)) !== path.resolve(os.tmpdir()) || !path.basename(profile).startsWith('nexus-cerebri-n2-')) throw new Error('Invalid synthetic profile cleanup path')
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
