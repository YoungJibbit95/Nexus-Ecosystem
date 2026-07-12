/* global process */

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");

const DEFAULT_SCAN_TARGETS = Object.freeze([
  "src",
  "scripts",
  "electron",
  "vite.config.js",
  "eslint.config.js",
  "tailwind.config.js",
  "postcss.config.js",
]);

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const IGNORED_DIRS = new Set([
  ".electron-cache",
  ".git",
  "build",
  "dist",
  "node_modules",
  "release",
]);

const argv = process.argv.slice(2);

function hasFlag(name) {
  return argv.includes(name);
}

function readOption(name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1 || index === argv.length - 1) return fallback;
  return argv[index + 1];
}

function readPositiveIntegerOption(name, fallback, { min = 1 } = {}) {
  const rawValue = readOption(name, String(fallback));
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min}; received "${rawValue}".`);
  }
  return value;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function toProjectPath(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, "/");
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function collectSourceFiles(targetPath, results = []) {
  const details = await stat(targetPath).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (!details) return results;

  if (details.isFile()) {
    if (SOURCE_EXTENSIONS.has(path.extname(targetPath))) {
      results.push({
        filePath: targetPath,
        relativePath: toProjectPath(targetPath),
        bytes: details.size,
      });
    }
    return results;
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await collectSourceFiles(childPath, results);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      const childDetails = await stat(childPath);
      results.push({
        filePath: childPath,
        relativePath: toProjectPath(childPath),
        bytes: childDetails.size,
      });
    }
  }
  return results;
}

async function readChunkReport(reportPath, chunkWarnBytes, limit) {
  if (!(await exists(reportPath))) {
    return {
      found: false,
      path: toProjectPath(reportPath),
      hint: "Run vite build first to generate dist/chunk-report.json.",
      warnings: [],
      topChunks: [],
    };
  }

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const chunks = Array.isArray(report.chunks)
    ? report.chunks
    : Array.isArray(report.topChunks)
      ? report.topChunks
      : [];
  const sortedChunks = [...chunks].sort((a, b) => (b.rawBytes || 0) - (a.rawBytes || 0));
  const warnings = Array.isArray(report.warnings)
    ? report.warnings
    : sortedChunks
        .filter((chunk) => (chunk.rawBytes || 0) >= chunkWarnBytes)
        .map((chunk) => ({
          fileName: chunk.fileName,
          rawBytes: chunk.rawBytes || 0,
          gzipBytes: chunk.gzipBytes || 0,
          moduleCount: chunk.moduleCount || 0,
          reasons: ["raw-size"],
        }));

  return {
    found: true,
    path: toProjectPath(reportPath),
    generatedAt: report.generatedAt || null,
    chunkCount: report.chunkCount || chunks.length,
    totals: report.totals || null,
    warnings,
    topChunks: sortedChunks.slice(0, limit),
  };
}

function summarizeWarnings(files, chunkReport, fileWarnBytes) {
  const largeFiles = files
    .filter((file) => file.bytes >= fileWarnBytes)
    .map((file) => ({
      path: file.relativePath,
      bytes: file.bytes,
      reason: "source-file-size",
    }));

  const chunkWarnings = chunkReport.warnings.map((warning) => ({
    path: warning.fileName,
    bytes: warning.rawBytes || 0,
    reason: `chunk-${(warning.reasons || ["size"]).join("+")}`,
  }));

  return [...largeFiles, ...chunkWarnings];
}

function printSummary(summary) {
  console.log("[code-quality] Nexus Code snapshot");
  console.log(
    `  scanned ${summary.fileCount} source/test files (${formatBytes(
      summary.totalSourceBytes,
    )} total)`,
  );
  console.log(`  file warning threshold: ${formatBytes(summary.fileWarnBytes)}`);
  console.log("");
  console.log("  largest source/test files:");
  summary.largestFiles.forEach((file, index) => {
    const marker = file.bytes >= summary.fileWarnBytes ? " watch" : "";
    console.log(
      `  ${String(index + 1).padStart(2, " ")}. ${formatBytes(file.bytes).padStart(
        8,
        " ",
      )} ${file.relativePath}${marker}`,
    );
  });

  console.log("");
  if (!summary.chunkReport.found) {
    console.log(`  chunk report: missing (${summary.chunkReport.path})`);
    console.log(`  ${summary.chunkReport.hint}`);
  } else {
    const totals = summary.chunkReport.totals;
    const totalLabel = totals
      ? `${formatBytes(totals.rawBytes)} raw / ${formatBytes(totals.gzipBytes)} gzip`
      : "total size unknown";
    console.log(
      `  chunk report: ${summary.chunkReport.path} (${summary.chunkReport.chunkCount} chunks, ${totalLabel})`,
    );
    summary.chunkReport.topChunks.forEach((chunk, index) => {
      console.log(
        `  ${String(index + 1).padStart(2, " ")}. ${formatBytes(
          chunk.rawBytes || 0,
        ).padStart(8, " ")} ${chunk.fileName} (${formatBytes(
          chunk.gzipBytes || 0,
        )} gzip, ${chunk.moduleCount || 0} modules)`,
      );
    });
  }

  console.log("");
  console.log(`  watch items: ${summary.warnings.length}`);
  summary.warnings.slice(0, summary.limit).forEach((warning) => {
    console.log(`  - ${warning.reason}: ${warning.path} (${formatBytes(warning.bytes)})`);
  });
}

async function main() {
  const limit = readPositiveIntegerOption("--limit", 12);
  const fileWarnBytes = readPositiveIntegerOption("--file-warn-kb", 120) * 1024;
  const chunkWarnBytes = readPositiveIntegerOption("--chunk-warn-kb", 850) * 1024;
  const chunkReportPath = path.resolve(
    projectRoot,
    readOption("--chunk-report", path.join("dist", "chunk-report.json")),
  );

  const files = (
    await Promise.all(
      DEFAULT_SCAN_TARGETS.map((target) =>
        collectSourceFiles(path.resolve(projectRoot, target), []),
      ),
    )
  )
    .flat()
    .sort((a, b) => b.bytes - a.bytes);
  const totalSourceBytes = files.reduce((total, file) => total + file.bytes, 0);
  const chunkReport = await readChunkReport(chunkReportPath, chunkWarnBytes, limit);
  const warnings = summarizeWarnings(files, chunkReport, fileWarnBytes);

  const summary = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    limit,
    fileWarnBytes,
    chunkWarnBytes,
    fileCount: files.length,
    totalSourceBytes,
    largestFiles: files.slice(0, limit),
    chunkReport,
    warnings,
  };

  if (hasFlag("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printSummary(summary);
  }

  if (hasFlag("--strict") && warnings.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[code-quality] failed");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
