import http from "node:http";
import net from "node:net";
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

function pipeOutput(child, scope) {
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(
      String(chunk)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => `[${scope}] ${line}`)
        .join("\n") + "\n",
    );
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(
      String(chunk)
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => `[${scope}] ${line}`)
        .join("\n") + "\n",
    );
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function findFreePort() {
  for (let offset = 0; offset < maxPortAttempts; offset += 1) {
    const port = preferredPort + offset;
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `Kein freier Nexus-Code-Dev-Port zwischen ${preferredPort} und ${
      preferredPort + maxPortAttempts - 1
    } gefunden.`,
  );
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

async function waitForHttp(url, label, timeoutMs = 25_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await requestOk(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  throw new Error(`${label} wurde nicht rechtzeitig erreichbar: ${url}`);
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
  const port = await findFreePort();
  const devUrl = `http://${host}:${port}`;
  if (port !== preferredPort) {
    log(
      "DEV",
      `Port ${preferredPort} ist belegt; starte isoliert auf ${port}, damit kein stale Vite-Server verwendet wird.`,
    );
  }

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
  pipeOutput(vite, "VITE");

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

  await waitForHttp(devUrl, "Vite Dev Server");
  await waitForHttp(`${devUrl}/src/pages/Editor.jsx`, "Editor route module");
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
