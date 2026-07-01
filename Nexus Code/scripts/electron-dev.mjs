import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const preferredPort = Number(process.env.NEXUS_CODE_DEV_PORT || 5175);
const host = process.env.NEXUS_CODE_DEV_HOST || "127.0.0.1";
const maxPortAttempts = 40;

const viteCliPath = path.join(appRoot, "node_modules", "vite", "bin", "vite.js");
const electronCliPath = path.join(appRoot, "node_modules", "electron", "cli.js");

function log(scope, message) {
  process.stdout.write(`[${scope}] ${message}\n`);
}

function pipeOutput(child, scope, onLine) {
  const writeLines = (chunk, stream) => {
    const lines = String(chunk)
      .split(/\r?\n/)
      .filter(Boolean);
    lines.forEach((line) => {
      onLine?.(line);
      stream.write(`[${scope}] ${line}\n`);
    });
  };

  child.stdout?.on("data", (chunk) => {
    writeLines(chunk, process.stdout);
  });
  child.stderr?.on("data", (chunk) => {
    writeLines(chunk, process.stderr);
  });
}

function requestOk(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 400);
    });
    request.setTimeout(1_500, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => resolve(false));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assertProcessAlive(child, label) {
  if (!child || child.killed || child.exitCode !== null) {
    throw new Error(`${label} Prozess wurde vor Readiness beendet.`);
  }
}

async function waitForOwnedHttp(child, url, label, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    assertProcessAlive(child, label);
    const ok = await requestOk(url);
    if (ok) {
      await sleep(180);
      assertProcessAlive(child, label);
      return;
    }
    await sleep(220);
  }
  throw new Error(`${label} wurde nicht rechtzeitig erreichbar: ${url}`);
}

function spawnVite(port, devUrl) {
  let markReady = null;
  let markFailed = null;
  const readyPromise = new Promise((resolve, reject) => {
    markReady = resolve;
    markFailed = reject;
  });
  const vite = spawn(
    process.execPath,
    [viteCliPath, "--host", host, "--port", String(port), "--strictPort"],
    {
      cwd: appRoot,
      env: { ...process.env, NEXUS_CODE_DEV_URL: devUrl },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  const readyPattern = new RegExp(`Local:\\s+http://(?:${host.replace(/\./g, "\\.")}|localhost):${port}/?`);
  pipeOutput(vite, "VITE", (line) => {
    if (readyPattern.test(line)) markReady();
  });
  vite.once("exit", (code) => {
    markFailed(new Error(`Vite Prozess wurde vor Readiness beendet (code ${code ?? "unknown"}).`));
  });
  return { process: vite, readyPromise };
}

async function waitForViteBanner(readyPromise, port, timeoutMs = 10_000) {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error(`Vite hat fuer Port ${port} kein eigenes Local-Banner gemeldet.`)),
      timeoutMs,
    );
  });
  try {
    await Promise.race([readyPromise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function startOwnedVite() {
  let lastError = null;
  for (let offset = 0; offset < maxPortAttempts; offset += 1) {
    const port = preferredPort + offset;
    const devUrl = `http://${host}:${port}`;
    if (offset > 0) {
      log("DEV", `Retry auf Port ${port}.`);
    }

    const { process: vite, readyPromise } = spawnVite(port, devUrl);
    try {
      await waitForViteBanner(readyPromise, port);
      await waitForOwnedHttp(vite, devUrl, "Vite Dev Server");
      await waitForOwnedHttp(vite, `${devUrl}/src/pages/Editor.jsx`, "Editor route module");
      if (port !== preferredPort) {
        log(
          "DEV",
          `Port ${preferredPort} war nicht nutzbar; Nexus Code laeuft isoliert auf ${port}.`,
        );
      }
      return { vite, port, devUrl };
    } catch (error) {
      lastError = error;
      terminate(vite);
      if (offset === maxPortAttempts - 1) break;
      log("DEV", `${error?.message || "Vite Start fehlgeschlagen"} Port ${port} wird uebersprungen.`);
      await sleep(260);
    }
  }

  throw lastError || new Error("Nexus Code Dev Server konnte nicht gestartet werden.");
}

function terminate(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  if (isWindows) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  child.kill("SIGTERM");
}

async function run() {
  const { vite, devUrl } = await startOwnedVite();

  let electron = null;
  let shuttingDown = false;
  const shutdown = (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    terminate(electron);
    terminate(vite);
    setTimeout(() => process.exit(code), 120);
  };

  process.once("SIGINT", () => shutdown(130));
  process.once("SIGTERM", () => shutdown(143));

  vite.once("exit", (code) => {
    if (shuttingDown) return;
    if (!electron) {
      log("DEV", `Vite wurde vor Electron beendet (code ${code ?? "unknown"}).`);
      shutdown(code || 1);
      return;
    }
    shutdown(code || 1);
  });

  log("DEV", `Renderer bereit: ${devUrl}`);

  if (process.env.NEXUS_CODE_DEV_PROBE_ONLY === "1") {
    log("DEV", "Probe erfolgreich; Electron-Start uebersprungen.");
    shutdown(0);
    return;
  }

  electron = spawn(process.execPath, [electronCliPath, "."], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_DEV: "true",
      NEXUS_CODE_DEV_URL: devUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  pipeOutput(electron, "ELECTRON");
  electron.once("exit", (code) => shutdown(code || 0));
}

run().catch((error) => {
  log("DEV", error?.message || "Nexus Code Dev Start fehlgeschlagen.");
  process.exit(1);
});
