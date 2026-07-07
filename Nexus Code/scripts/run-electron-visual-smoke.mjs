import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.NEXUS_CODE_UI_SMOKE = "true";
process.env.NEXUS_CODE_VISUAL_SMOKE = "true";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const electronCliPath = path.join(projectRoot, "node_modules", "electron", "cli.js");
const electronMainPath = path.join(scriptDir, "electron-visual-main.cjs");
const visualEntryPath = path.join(projectRoot, "src", "testing", "visualSmokeEntry.jsx");
const harnessPath = path.join(projectRoot, "src", "testing", "uiSmokeHarness.jsx");
const host = process.env.NEXUS_CODE_VISUAL_SMOKE_HOST || "127.0.0.1";
const requestedPort = Number(process.env.NEXUS_CODE_VISUAL_SMOKE_PORT || 0);
const outputDir =
  process.env.NEXUS_CODE_VISUAL_SMOKE_OUTPUT_DIR ||
  path.join(os.tmpdir(), "nexus-code-visual-smoke");

const VIEWPORTS = Object.freeze([
  { id: "desktop", width: 1440, height: 900 },
  { id: "tablet", width: 1024, height: 768 },
  { id: "short-wide", width: 900, height: 512 },
  { id: "phone-portrait", width: 390, height: 900 },
]);

const SURFACES = Object.freeze([
  "workbench-shell",
  "launchpad",
  "account-panel",
  "settings-panel",
  "code-editor",
  "panel-chrome",
  "github-workbench",
]);

const scenarios = VIEWPORTS.flatMap((viewport) =>
  SURFACES.map((surfaceId) => ({
    id: `${surfaceId}@${viewport.id}`,
    surfaceId,
    viewportId: viewport.id,
    width: viewport.width,
    height: viewport.height,
  })),
);

function htmlShell() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nexus Code Visual Smoke</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/testing/visualSmokeEntry.jsx"></script>
  </body>
</html>`;
}

async function assertTestBoundary() {
  const [harnessSource, entrySource] = await Promise.all([
    readFile(harnessPath, "utf8"),
    readFile(visualEntryPath, "utf8"),
  ]);
  const sources = [
    ["uiSmokeHarness.jsx", harnessSource],
    ["visualSmokeEntry.jsx", entrySource],
  ];
  const forbiddenPatterns = [
    /from\s+["'][^"']*App\.jsx["']/,
    /from\s+["']@\/App(?:\.jsx)?["']/,
    /localStorage\.setItem\(["']nexus-code\.account-session/i,
    /sessionStorage\.setItem\(["']nexus-code\.account-session/i,
  ];
  const failure = sources
    .flatMap(([name, source]) =>
      forbiddenPatterns
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${name} matches ${pattern}`),
    )
    .at(0);

  if (failure) {
    throw new Error(
      `Visual smoke must stay outside App.jsx boot/login persistence boundaries: ${failure}`,
    );
  }
}

function createVisualSmokePlugin() {
  return {
    name: "nexus-code-visual-smoke-shell",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url || "";
        if (!requestUrl.startsWith("/__nexus-code-visual-smoke")) {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(htmlShell());
      });
    },
  };
}

function terminate(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

function runElectron(baseUrl) {
  return new Promise((resolve, reject) => {
    const config = JSON.stringify({
      baseUrl,
      outputDir,
      scenarios,
      timeoutMs: Number(process.env.NEXUS_CODE_VISUAL_SMOKE_TIMEOUT_MS || 60_000),
    });
    const electron = spawn(process.execPath, [electronCliPath, electronMainPath], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ELECTRON_DEV: "true",
        NEXUS_CODE_UI_SMOKE: "true",
        NEXUS_CODE_VISUAL_SMOKE: "true",
        NEXUS_CODE_VISUAL_SMOKE_CONFIG: config,
      },
      stdio: ["ignore", "inherit", "inherit"],
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      terminate(electron);
      reject(new Error("Electron visual smoke timed out."));
    }, Number(process.env.NEXUS_CODE_VISUAL_SMOKE_PROCESS_TIMEOUT_MS || 180_000));

    electron.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    electron.once("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Electron visual smoke exited with code ${code ?? "unknown"}.`));
    });
  });
}

let server;

try {
  await assertTestBoundary();

  server = await createServer({
    root: projectRoot,
    configFile: false,
    plugins: [react(), createVisualSmokePlugin()],
    appType: "custom",
    clearScreen: false,
    logLevel: "error",
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.join(projectRoot, "src"),
        "@nexus/core": path.resolve(projectRoot, "../packages/nexus-core/src"),
        "@nexus/api": path.resolve(projectRoot, "../packages/nexus-core/src/api"),
        react: path.resolve(projectRoot, "./node_modules/react"),
        "react-dom": path.resolve(projectRoot, "./node_modules/react-dom"),
        "react/jsx-runtime": path.resolve(
          projectRoot,
          "./node_modules/react/jsx-runtime.js",
        ),
        "react/jsx-dev-runtime": path.resolve(
          projectRoot,
          "./node_modules/react/jsx-dev-runtime.js",
        ),
      },
    },
    server: {
      host,
      port: requestedPort,
      strictPort: requestedPort > 0,
      hmr: false,
      fs: {
        allow: [path.resolve(projectRoot, "..")],
      },
    },
    optimizeDeps: {
      noDiscovery: true,
      include: ["react", "react-dom", "react-dom/client"],
    },
  });

  await server.listen();
  const address = server.httpServer.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  const baseUrl = `http://${host}:${port}`;

  console.log(
    `[electron-visual-smoke] serving test-only harness at ${baseUrl}; output ${outputDir}`,
  );
  await runElectron(baseUrl);
} catch (error) {
  console.error("[electron-visual-smoke] failed");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
} finally {
  if (server) {
    await server.close();
  }
}
