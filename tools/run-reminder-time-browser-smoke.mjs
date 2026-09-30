import { createRequire } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const client = path.join(root, 'Nexus Main')
const require = createRequire(path.join(client, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { default: react } = await import(pathToFileURL(require.resolve('@vitejs/plugin-react')))
const phase = process.argv[2] || 'after'
const evidence = path.resolve(root, '../Nexus V7 Recovery/implementation/evidence/reminder-time')
const profile = await mkdtemp(path.join(evidence, 'synthetic-ui-profile-'))
const entry = '/@fs/' + path.join(root, 'tools/browser-smoke/reminderTimeHarness.tsx').replaceAll('\\', '/')
const seams = {
  'store/appStore': 'export const useApp = () => window.__reminderFixtureStore',
  'store/themeStore': 'export const useTheme = () => ({ mode: "dark", accent: "#7d5fff" })',
  'components/Glass': 'import React from "react"; export const Glass = ({children, style}) => React.createElement("div", {style}, children)',
  'render/useRenderSurfaceBudget': 'export const useRenderSurfaceBudget = () => ({})',
  'render/useSurfaceMotionRuntime': 'export const useSurfaceMotionRuntime = () => ({ timings: {quickMs: 0, regularMs: 0, framerEase: "linear"}, allowEntry: false, capability: "static-safe" })',
  'lib/useMobile': 'export const useMobile = () => ({ isMobile: true, isLandscape: false, screenW: 390, screenH: 844 })',
}
const server = await createServer({
  root: client, configFile: false, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'reminder-test-seams', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !importer.includes('/src/')) return
      for (const key of Object.keys(seams)) if (source.endsWith('/' + key)) return '\0reminder-seam:' + key
    },
    load(id) { if (id.startsWith('\0reminder-seam:')) return seams[id.slice('\0reminder-seam:'.length)] },
    transform(code, id) { if (id.replaceAll('\\', '/').endsWith('/Nexus Mobile/src/views/RemindersView.tsx')) return code + '\nexport { ReminderModal as ReminderTimeFixtureModal }\n' },
    configureServer(server) { server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__reminder_time')) return next()
      res.setHeader('Content-Type', 'text/html')
      res.end(await server.transformIndexHtml(req.url, `<!doctype html><style>body{color:white;background:#141421;font-family:sans-serif}*{box-sizing:border-box}</style><script>window.addEventListener('error',event=>{window.reminderTimeTestResult={ok:false,error:event.message}});window.addEventListener('unhandledrejection',event=>{window.reminderTimeTestResult={ok:false,error:String(event.reason)}})</script><div id="root"></div><script type="module" src="${entry}"></script>`))
    }) },
  }, react()],
  resolve: { dedupe: ['react', 'react-dom'], alias: {
    '@nexus/core': path.join(root, 'packages/nexus-core/src'), '@nexus/api': path.join(root, 'packages/nexus-core/src/api'),
    react: path.join(client, 'node_modules/react'), 'react-dom': path.join(client, 'node_modules/react-dom'),
  } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [root] } },
  optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom', 'react-dom/client', 'framer-motion', 'lucide-react', 'react-markdown', 'remark-gfm'] },
})
try {
  await server.listen()
  const url = `http://127.0.0.1:${server.httpServer.address().port}/__reminder_time`
  const env = { ...process.env, NEXUS_REMINDER_TIME_URL: url, NEXUS_REMINDER_TIME_PHASE: phase, NEXUS_REMINDER_TIME_PROFILE: profile, NEXUS_REMINDER_TIME_RESULTS: path.join(evidence, `${phase}-ui-results.json`) }
  delete env.ELECTRON_RUN_AS_NODE
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('electron/cli.js'), path.join(root, 'tools/browser-smoke/reminder-time-electron.cjs')], { env, stdio: 'inherit', windowsHide: true })
    child.once('error', reject)
    child.once('exit', resolve)
  })
  if (code !== 0) throw new Error(`Reminder time UI smoke exited ${code}`)
} finally {
  await server.close()
  if (!path.resolve(profile).startsWith(path.resolve(evidence) + path.sep + 'synthetic-ui-profile-')) throw new Error('Unexpected profile cleanup path')
  await rm(profile, { recursive: true, force: true })
}
