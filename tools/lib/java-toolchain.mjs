import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const JAVAC_NAME = process.platform === "win32" ? "javac.exe" : "javac";

const parseMajorVersion = (value) =>
  Number(String(value || "").match(/javac\s+(?:1\.)?(\d+)/iu)?.[1] || 0);

const discoverPathCompilers = () => {
  const lookup = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    [JAVAC_NAME],
    { encoding: "utf8", windowsHide: true },
  );
  if (lookup.status !== 0) return [];
  return String(lookup.stdout || "")
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean);
};

const discoverMacJavaHome = () => {
  if (process.platform !== "darwin") return "";
  const lookup = spawnSync("/usr/libexec/java_home", ["-v", "21"], {
    encoding: "utf8",
  });
  return lookup.status === 0 ? String(lookup.stdout || "").trim() : "";
};

const canonicalHomeFromCompiler = async (compilerPath) => {
  try {
    const realCompiler = await fs.realpath(compilerPath);
    return path.dirname(path.dirname(realCompiler));
  } catch {
    return path.dirname(path.dirname(path.resolve(compilerPath)));
  }
};

const validateJava21Home = async (candidate) => {
  if (!candidate) return null;
  const home = path.resolve(String(candidate).trim());
  const javac = path.join(home, "bin", JAVAC_NAME);
  try {
    await fs.access(javac);
  } catch {
    return null;
  }

  const version = spawnSync(javac, ["-version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const versionText = String(version.stdout || "") + "\n" + String(version.stderr || "");
  if (version.status !== 0 || parseMajorVersion(versionText) !== 21) return null;

  try {
    return await fs.realpath(home);
  } catch {
    return home;
  }
};

export const resolveJava21Home = async (environment = process.env) => {
  const candidates = [
    String(environment.JAVA_HOME || "").trim(),
    discoverMacJavaHome(),
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home",
    "/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home",
    "/usr/lib/jvm/java-21-openjdk",
    "/usr/lib/jvm/jdk-21",
    "/usr/lib/jvm/temurin-21-jdk",
  ].filter(Boolean);

  for (const compiler of discoverPathCompilers()) {
    candidates.push(await canonicalHomeFromCompiler(compiler));
  }

  for (const candidate of new Set(candidates)) {
    const validated = await validateJava21Home(candidate);
    if (validated) return validated;
  }
  return null;
};

export { parseMajorVersion, validateJava21Home };
