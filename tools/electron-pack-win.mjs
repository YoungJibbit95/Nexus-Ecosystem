import { spawnSync } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

const appDir = process.cwd();

const args = process.argv.slice(2);
const commandSeparator = args.indexOf("--");
const rawCommand =
  commandSeparator >= 0
    ? args.slice(commandSeparator + 1)
    : ["electron-builder", "--win"];

if (rawCommand.length === 0) {
  console.error("[electron-pack-win] Kein Build-Command uebergeben.");
  process.exit(1);
}

const fileExists = async (target) => {
  try {
    await fs.access(target, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const ensureSystem7za = async () => {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    return null;
  }

  const archCandidates =
    process.arch === "arm64" ? ["arm64", "x64"] : ["x64", "arm64"];

  const localCandidates = archCandidates.map((arch) =>
    path.join(appDir, "node_modules", "7zip-bin", "mac", arch, "7za"),
  );

  const siblingAppCandidates = [
    path.join(path.dirname(appDir), "Nexus Main"),
    path.join(path.dirname(appDir), "Nexus Code"),
  ]
    .filter((dir) => dir !== appDir)
    .flatMap((dir) =>
      archCandidates.map((arch) =>
        path.join(dir, "node_modules", "7zip-bin", "mac", arch, "7za"),
      ),
    );

  const candidates = [...localCandidates, ...siblingAppCandidates];

  let source = null;
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      source = candidate;
      break;
    }
  }

  if (!source) {
    return null;
  }

  const binDir = path.join(appDir, ".cache", "bin");
  const target = path.join(binDir, "7za");

  await fs.mkdir(binDir, { recursive: true });
  await fs.copyFile(source, target);
  await fs.chmod(target, 0o755);

  return { binDir, target };
};

const quoteArgForCmd = (value) => {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const resolveExecutable = async (requestedCommand) => {
  const requestedBase = requestedCommand.trim();

  if (
    requestedBase.includes("/") ||
    requestedBase.includes("\\") ||
    path.isAbsolute(requestedBase)
  ) {
    return requestedBase;
  }

  const isWin = process.platform === "win32";
  const binName = isWin ? `${requestedBase}.cmd` : requestedBase;

  const candidates = [
    path.join(appDir, "node_modules", ".bin", binName),
    path.join(path.dirname(appDir), "node_modules", ".bin", binName),
    path.join(
      path.dirname(path.dirname(appDir)),
      "node_modules",
      ".bin",
      binName,
    ),
  ];

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return requestedBase;
};

const runWindowsCmdLike = (command, commandArgs, env) => {
  const fullCommand = [
    quoteArgForCmd(command),
    ...commandArgs.map(quoteArgForCmd),
  ].join(" ");

  console.log(`[electron-pack-win] cmdline=${fullCommand}`);

  return spawnSync(
    process.env.ComSpec || "cmd.exe",
    ["/d", "/s", "/c", fullCommand],
    {
      cwd: appDir,
      stdio: "inherit",
      env,
      shell: false,
      windowsHide: false,
    },
  );
};

const run = async () => {
  const env = {
    ...process.env,
  };

  let localShim = null;

  const sevenZip = await ensureSystem7za();
  if (sevenZip) {
    localShim = path.join(appDir, "7za");
    await fs.copyFile(sevenZip.target, localShim);
    await fs.chmod(localShim, 0o755);

    env.USE_SYSTEM_7ZA = "true";
    env.PATH = `${appDir}${path.delimiter}${sevenZip.binDir}${path.delimiter}${env.PATH || ""}`;
    console.log(`[electron-pack-win] using system 7za from ${sevenZip.binDir}`);
  } else {
    console.warn(
      "[electron-pack-win] no readable 7za candidate found, fallback to default electron-builder behavior",
    );
  }

  const command = await resolveExecutable(rawCommand[0]);
  const commandArgs = rawCommand.slice(1);

  console.log(`[electron-pack-win] cwd=${appDir}`);
  console.log(`[electron-pack-win] command=${command}`);
  console.log(
    `[electron-pack-win] args=${commandArgs.length > 0 ? commandArgs.join(" ") : "(none)"}`,
  );

  const isWindowsCmdLike =
    process.platform === "win32" && /\.(cmd|bat)$/i.test(command);

  const result = isWindowsCmdLike
    ? runWindowsCmdLike(command, commandArgs, env)
    : spawnSync(command, commandArgs, {
        cwd: appDir,
        stdio: "inherit",
        env,
        shell: false,
        windowsHide: false,
      });

  if (localShim) {
    await fs.unlink(localShim).catch(() => {});
  }

  if (result.error) {
    console.error(
      `[electron-pack-win] Fehler: ${result.error.message || result.error}`,
    );
    process.exit(typeof result.status === "number" ? result.status : 1);
  }

  process.exit(typeof result.status === "number" ? result.status : 0);
};

run().catch((error) => {
  console.error(`[electron-pack-win] Fehler: ${error.message || error}`);
  process.exit(1);
});
