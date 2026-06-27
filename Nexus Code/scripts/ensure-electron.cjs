"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const extract = require("extract-zip");

const packageRoot = path.resolve(__dirname, "..");
const electronRoot = path.join(packageRoot, "node_modules", "electron");
const electronPackagePath = path.join(electronRoot, "package.json");
const electronChecksumsPath = path.join(electronRoot, "checksums.json");
const electronPathFile = path.join(electronRoot, "path.txt");
const electronDist = path.join(electronRoot, "dist");
const electronVersionFile = path.join(electronDist, "version");
const localElectronCache = path.join(packageRoot, ".electron-cache");

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function getInstallPlatform() {
  return process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
}

function getInstallArch() {
  return process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;
}

function getPlatformExecutable(platform = getInstallPlatform()) {
  switch (platform) {
    case "mas":
    case "darwin":
      return path.join("Electron.app", "Contents", "MacOS", "Electron");
    case "freebsd":
    case "openbsd":
    case "linux":
      return "electron";
    case "win32":
      return "electron.exe";
    default:
      throw new Error(`Electron builds are not available on platform: ${platform}`);
  }
}

function getElectronVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(electronPackagePath, "utf8"));
    return String(pkg.version || "").trim();
  } catch {
    return "";
  }
}

function getElectronState() {
  const version = getElectronVersion();
  const expectedExecutable = getPlatformExecutable();
  const pathFileValue = readText(electronPathFile);
  const installedVersion = readText(electronVersionFile).replace(/^v/i, "");
  const executablePath = path.join(electronDist, pathFileValue || expectedExecutable);
  const issues = [];

  if (!version) issues.push("electron package metadata missing");
  if (!installedVersion) issues.push("dist/version missing");
  if (version && installedVersion && installedVersion !== version) {
    issues.push(`dist/version is ${installedVersion}, expected ${version}`);
  }
  if (!pathFileValue) {
    issues.push("path.txt missing");
  } else if (pathFileValue !== expectedExecutable) {
    issues.push(`path.txt is ${pathFileValue}, expected ${expectedExecutable}`);
  }
  if (!fs.existsSync(executablePath)) {
    issues.push(`executable missing at ${executablePath}`);
  }

  return {
    executablePath,
    expectedExecutable,
    installedVersion,
    issues,
    pathFileValue,
    ready: issues.length === 0,
    version,
  };
}

function getExpectedExecutablePath() {
  return getElectronState().executablePath;
}

function ensureElectronPackageExists() {
  if (!fs.existsSync(electronPackagePath)) {
    throw new Error(
      "Electron dependency is missing. Run `npm --prefix \"./Nexus Code\" install` first.",
    );
  }
}

function removePartialInstall() {
  try {
    fs.rmSync(electronPathFile, { force: true });
  } catch {}
  try {
    fs.rmSync(electronDist, { recursive: true, force: true });
  } catch {}
}

function repairPathFileFromExistingBinary() {
  const version = getElectronVersion();
  const expectedExecutable = getPlatformExecutable();
  const installedVersion = readText(electronVersionFile).replace(/^v/i, "");
  const executablePath = path.join(electronDist, expectedExecutable);

  if (version && installedVersion === version && fs.existsSync(executablePath)) {
    fs.writeFileSync(electronPathFile, expectedExecutable, "utf8");
    return true;
  }

  return false;
}

function getElectronCacheRoots() {
  const roots = [];

  roots.push(localElectronCache);

  if (process.env.electron_config_cache) roots.push(process.env.electron_config_cache);
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    roots.push(path.join(process.env.LOCALAPPDATA, "electron", "Cache"));
  }
  if (process.env.XDG_CACHE_HOME) roots.push(path.join(process.env.XDG_CACHE_HOME, "electron"));
  roots.push(path.join(os.homedir(), ".cache", "electron"));

  return roots.filter((root, index, all) => root && all.indexOf(root) === index);
}

function findCachedElectronZip() {
  const version = getElectronVersion();
  const platform = getInstallPlatform();
  const arch = getInstallArch();
  const fileName = `electron-v${version}-${platform}-${arch}.zip`;

  for (const root of getElectronCacheRoots()) {
    const candidate = path.join(root, fileName);
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

function getChecksums() {
  if (
    process.env.electron_use_remote_checksums ||
    process.env.npm_config_electron_use_remote_checksums ||
    !fs.existsSync(electronChecksumsPath)
  ) {
    return undefined;
  }

  return require(electronChecksumsPath);
}

function finalizeElectronExtract() {
  const version = getElectronVersion();
  const extractedTypeDefPath = path.join(electronDist, "electron.d.ts");
  const targetTypeDefPath = path.join(electronRoot, "electron.d.ts");

  if (fs.existsSync(extractedTypeDefPath)) {
    try {
      fs.rmSync(targetTypeDefPath, { force: true });
      fs.renameSync(extractedTypeDefPath, targetTypeDefPath);
    } catch {}
  }

  if (version && !readText(electronVersionFile)) {
    fs.writeFileSync(electronVersionFile, version, "utf8");
  }
  fs.writeFileSync(electronPathFile, getPlatformExecutable(), "utf8");
}

function escapePowerShellLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function extractElectronZipWithNativeTool(zipPath) {
  removePartialInstall();
  fs.mkdirSync(electronDist, { recursive: true });

  if (process.platform === "win32") {
    const command = [
      "$ErrorActionPreference = 'Stop'",
      "Add-Type -AssemblyName System.IO.Compression.FileSystem",
      `[System.IO.Compression.ZipFile]::ExtractToDirectory(${escapePowerShellLiteral(zipPath)}, ${escapePowerShellLiteral(electronDist)})`,
    ].join("; ");
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { cwd: packageRoot, stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Native Electron extraction exited with code ${result.status}.`);
    }
    finalizeElectronExtract();
    return;
  }

  const result = spawnSync("unzip", ["-q", zipPath, "-d", electronDist], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Native Electron extraction exited with code ${result.status}.`);
  }
  finalizeElectronExtract();
}

async function extractElectronZip(zipPath) {
  if (process.platform === "win32") {
    extractElectronZipWithNativeTool(zipPath);
    return;
  }

  removePartialInstall();
  fs.mkdirSync(electronDist, { recursive: true });
  await extract(zipPath, { dir: electronDist });
  finalizeElectronExtract();

  if (getElectronState().ready) return;

  console.log("[ensure-electron] Node zip extraction was incomplete; retrying with native extractor...");
  extractElectronZipWithNativeTool(zipPath);
}

async function downloadElectronZip(force = false) {
  const { downloadArtifact } = await import("@electron/get");

  return downloadArtifact({
    version: getElectronVersion(),
    artifactName: "electron",
    platform: getInstallPlatform(),
    arch: getInstallArch(),
    cacheRoot: process.env.electron_config_cache || localElectronCache,
    checksums: getChecksums(),
    force,
  });
}

async function restoreFromZip(zipPath, label) {
  if (!zipPath) return false;

  console.log(`[ensure-electron] Extracting ${label}: ${zipPath}`);
  await extractElectronZip(zipPath);
  return getElectronState().ready;
}

async function restoreFromDownload(force = false) {
  const label = force ? "fresh Electron artifact" : "Electron artifact";
  console.log(`[ensure-electron] Resolving ${label}...`);
  const zipPath = await downloadElectronZip(force);
  return restoreFromZip(zipPath, label);
}

async function main() {
  ensureElectronPackageExists();

  let state = getElectronState();
  if (state.ready) {
    console.log(`[ensure-electron] Electron ${state.version} ready at ${state.executablePath}`);
    return;
  }

  if (repairPathFileFromExistingBinary()) {
    state = getElectronState();
    console.log(`[ensure-electron] Recreated path.txt for Electron ${state.version}.`);
    return;
  }

  console.log(`[ensure-electron] Electron binary incomplete: ${state.issues.join("; ")}`);

  if (await restoreFromZip(findCachedElectronZip(), "cached Electron artifact")) {
    state = getElectronState();
    console.log(`[ensure-electron] Electron ${state.version} restored at ${state.executablePath}`);
    return;
  }

  if (await restoreFromDownload(false)) {
    state = getElectronState();
    console.log(`[ensure-electron] Electron ${state.version} restored at ${state.executablePath}`);
    return;
  }

  console.log("[ensure-electron] Cached artifact did not validate; downloading without cache...");
  if (await restoreFromDownload(true)) {
    state = getElectronState();
    console.log(`[ensure-electron] Electron ${state.version} restored after cache refresh.`);
    return;
  }

  state = getElectronState();
  throw new Error(`Electron binary is still incomplete: ${state.issues.join("; ")}`);
}

main().catch((error) => {
  const expectedPath = (() => {
    try {
      return ` Expected: ${getExpectedExecutablePath()}`;
    } catch {
      return "";
    }
  })();

  console.error(`[ensure-electron] ${error.message || error}${expectedPath}`);
  process.exit(1);
});
