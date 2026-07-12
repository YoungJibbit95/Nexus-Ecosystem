import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import {
  VISUAL_SMOKE_SURFACES,
  VISUAL_SMOKE_VIEWPORTS,
  createVisualSmokePlan,
} from "../src/testing/visualSmokeScenarios.js";

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
const outputDir =
  process.env.NEXUS_CODE_VISUAL_SMOKE_OUTPUT_DIR ||
  path.join(os.tmpdir(), "nexus-code-visual-smoke");

function parseIntegerEnv(name, fallback, { min = 0 } = {}) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === "") return fallback;

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min}; received "${rawValue}".`);
  }
  return value;
}

let requestedPort = 0;
let visualSmokePlan;
let scenarios = [];
let scenarioTimeoutMs = 60_000;
let processTimeoutMs = 180_000;

const GPU_SANDBOX_FAILURE_PATTERNS = Object.freeze([
  /GPU process isn't usable/i,
  /ContextResult::kFatalFailure/i,
  /SharedImageStub.*ContextResult/i,
  /shared context.*fatal/i,
  /Exiting GPU process/i,
]);

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

function assertScenarioIntegrity() {
  const scenarioIds = new Set();
  for (const scenario of scenarios) {
    if (scenarioIds.has(scenario.id)) {
      throw new Error(`Duplicate visual smoke scenario id: ${scenario.id}`);
    }
    scenarioIds.add(scenario.id);
    if (!VISUAL_SMOKE_SURFACES.includes(scenario.surfaceId)) {
      throw new Error(`Unknown visual smoke surface in scenario: ${scenario.surfaceId}`);
    }
    if (!VISUAL_SMOKE_VIEWPORTS.some((viewport) => viewport.id === scenario.viewportId)) {
      throw new Error(`Unknown visual smoke viewport in scenario: ${scenario.viewportId}`);
    }
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

function classifyElectronStartupFailure(output) {
  const text = String(output || "");
  if (GPU_SANDBOX_FAILURE_PATTERNS.some((pattern) => pattern.test(text))) {
    return [
      "Electron reached the GPU/sandbox layer before the visual smoke could render.",
      "This is reported as environment-blocked, not as a successful visual pass.",
    ].join(" ");
  }
  return null;
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
    let diagnosticOutput = "";
    const captureOutput = (chunk, stream) => {
      const text = String(chunk || "");
      diagnosticOutput = `${diagnosticOutput}${text}`.slice(-32_000);
      stream.write(chunk);
    };
    const config = JSON.stringify({
      baseUrl,
      outputDir,
      scenarios,
      timeoutMs: scenarioTimeoutMs,
      runMeta: {
        preset: visualSmokePlan.presetId,
        presetLabel: visualSmokePlan.presetLabel,
        fullMatrix: visualSmokePlan.isFullMatrix,
        viewportIds: visualSmokePlan.viewportIds,
        surfaceIds: visualSmokePlan.surfaceIds,
        scenarioCount: scenarios.length,
        coverageSummary: visualSmokePlan.coverageSummary,
        requestedFilters: {
          preset: process.env.NEXUS_CODE_VISUAL_SMOKE_PRESET || "full",
          viewportIds: process.env.NEXUS_CODE_VISUAL_SMOKE_VIEWPORTS || "",
          surfaceIds: process.env.NEXUS_CODE_VISUAL_SMOKE_SURFACES || "",
        },
        scenarioTimeoutMs,
        processTimeoutMs,
      },
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
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    electron.stdout?.on("data", (chunk) => {
      captureOutput(chunk, process.stdout);
    });
    electron.stderr?.on("data", (chunk) => {
      captureOutput(chunk, process.stderr);
    });

    const timeout = setTimeout(() => {
      terminate(electron);
      const startupHint = classifyElectronStartupFailure(diagnosticOutput);
      reject(
        new Error(
          startupHint
            ? `Electron visual smoke timed out. ${startupHint}`
            : "Electron visual smoke timed out.",
        ),
      );
    }, processTimeoutMs);

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
      const startupHint = classifyElectronStartupFailure(diagnosticOutput);
      reject(
        new Error(
          startupHint
            ? `Electron visual smoke exited with code ${code ?? "unknown"}. ${startupHint}`
            : `Electron visual smoke exited with code ${code ?? "unknown"}.`,
        ),
      );
    });
  });
}

let server;

try {
  requestedPort = parseIntegerEnv("NEXUS_CODE_VISUAL_SMOKE_PORT", 0);
  visualSmokePlan = createVisualSmokePlan({
    preset: process.env.NEXUS_CODE_VISUAL_SMOKE_PRESET,
    viewportIds: process.env.NEXUS_CODE_VISUAL_SMOKE_VIEWPORTS,
    surfaceIds: process.env.NEXUS_CODE_VISUAL_SMOKE_SURFACES,
  });
  scenarios = visualSmokePlan.scenarios;
  scenarioTimeoutMs = parseIntegerEnv(
    "NEXUS_CODE_VISUAL_SMOKE_TIMEOUT_MS",
    60_000,
    { min: 1_000 },
  );
  processTimeoutMs = parseIntegerEnv(
    "NEXUS_CODE_VISUAL_SMOKE_PROCESS_TIMEOUT_MS",
    Math.max(180_000, 30_000 + scenarios.length * 12_000),
    { min: 5_000 },
  );

  await assertTestBoundary();
  assertScenarioIntegrity();

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
    [
      `[electron-visual-smoke] serving test-only harness at ${baseUrl}`,
      `${visualSmokePlan.presetId} preset`,
      `${scenarios.length} scenarios`,
      `${visualSmokePlan.viewportIds.length} viewport(s)`,
      `${visualSmokePlan.surfaceIds.length} surface(s)`,
      `${visualSmokePlan.coverageSummary.editorLanguageSurfaceCount} editor language surface(s)`,
      `timeout ${scenarioTimeoutMs}ms/scenario`,
      `process timeout ${processTimeoutMs}ms`,
      `output ${outputDir}`,
    ].join("; "),
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
