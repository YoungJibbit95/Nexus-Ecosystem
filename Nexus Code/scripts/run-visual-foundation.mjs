import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = process.env.NEXUS_CODE_FOUNDATION_VISUAL_OUTPUT;
if (!output || !path.isAbsolute(output)) throw new Error('Set NEXUS_CODE_FOUNDATION_VISUAL_OUTPUT to an absolute evidence directory.');
await mkdir(output, { recursive: true });
const server = await createServer({
  root, configFile: false, appType: 'custom', logLevel: 'error',
  plugins: [react(), {
    name: 'visual-foundation-fixture',
    configureServer(vite) {
      vite.middlewares.use((req, res, next) => {
        if (req.url !== '/__visual-foundation') return next();
        res.setHeader('Content-Type', 'text/html');
        res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:;"></head><body><div id="root"></div><script type="module" src="/src/testing/visualFoundationEntry.jsx"></script></body></html>`);
      });
    },
  }],
  resolve: { dedupe: ['react', 'react-dom'], alias: {
    '@': path.join(root, 'src'), '@nexus/core': path.resolve(root, '../packages/nexus-core/src'),
    '@nexus/api': path.resolve(root, '../packages/nexus-core/src/api'),
    react: path.join(root, 'node_modules/react'), 'react-dom': path.join(root, 'node_modules/react-dom'),
  } },
  server: { host: '127.0.0.1', port: 0, hmr: false, fs: { allow: [path.resolve(root, '..')] } },
});
try {
  await server.listen();
  const port = server.httpServer.address().port;
  const exitCode = await new Promise((resolve, reject) => {
    const env = { ...process.env, NEXUS_CODE_FOUNDATION_VISUAL_URL: `http://127.0.0.1:${port}/__visual-foundation` };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(process.execPath, [path.join(root, 'node_modules/electron/cli.js'), path.join(root, 'scripts/visual-foundation-main.cjs')], { cwd: root, env, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  process.exitCode = exitCode;
} finally {
  await server.close();
}
