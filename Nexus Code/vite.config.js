import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";
import { gzipSync } from "node:zlib";

const CHUNK_REPORT_LIMITS = Object.freeze({
  topChunks: 12,
  topAssets: 8,
  warnRawBytes: 850 * 1024,
  warnGzipBytes: 280 * 1024,
  warnModuleCount: 220,
});

const CHUNK_GROUPS = {
  react: ["react", "react-dom"],
  motion: ["framer-motion"],
  router: ["react-router-dom"],
  "codemirror-react": ["@uiw/react-codemirror"],
  "codemirror-core": [
    "codemirror",
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/commands",
    "@codemirror/search",
    "@codemirror/autocomplete",
    "@codemirror/language",
    "@codemirror/lint",
  ],
  radix: [
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-slider",
    "@radix-ui/react-switch",
    "@radix-ui/react-tooltip",
  ],
};

const CODEMIRROR_LANGUAGE_CHUNKS = [
  ["@codemirror/lang-javascript", "cm-lang-js"],
  ["@codemirror/lang-json", "cm-lang-json"],
  ["@codemirror/lang-html", "cm-lang-html"],
  ["@codemirror/lang-css", "cm-lang-css"],
  ["@codemirror/lang-markdown", "cm-lang-md"],
  ["@codemirror/lang-python", "cm-lang-python"],
  ["@codemirror/lang-java", "cm-lang-java"],
  ["@codemirror/lang-cpp", "cm-lang-cpp"],
  ["@codemirror/lang-php", "cm-lang-php"],
  ["@codemirror/lang-rust", "cm-lang-rust"],
  ["@codemirror/lang-sql", "cm-lang-sql"],
  ["@codemirror/lang-xml", "cm-lang-xml"],
  ["@codemirror/legacy-modes", "cm-lang-legacy"],
];

const INTERNAL_CHUNK_GROUPS = [
  {
    chunkName: "editor-feature-core",
    paths: [
      "/src/pages/editor/editorFeatureModel.js",
      "/src/ide/editor/",
      "/src/ide/lsp/",
    ],
  },
  {
    chunkName: "editor-workbench-core",
    paths: [
      "/src/pages/editor/workbenchDockModel.js",
      "/src/pages/editor/editorShellLayout.js",
      "/src/pages/editor/editorInteractionModel.js",
      "/src/pages/editor/editorWorkspaceModel.js",
    ],
  },
  {
    chunkName: "editor-search-git-core",
    paths: [
      "/src/pages/editor/commandPaletteModel.js",
      "/src/pages/editor/searchPanelModel.js",
      "/src/pages/editor/spotlightWorkspaceSearchModel.js",
      "/src/pages/editor/gitPanelModel.js",
      "/src/pages/editor/githubWorkbenchModel.js",
    ],
  },
  {
    chunkName: "editor-extension-core",
    paths: [
      "/src/pages/editor/extensionSystem.js",
      "/src/pages/editor/extensionRuntimeModel.js",
      "/src/pages/editor/themeOptionsModel.js",
      "/src/pages/editor/keybindingModel.js",
      "/src/pages/editor/lspSetupModel.js",
    ],
  },
];

const normalizeModuleId = (id) => String(id || "").replace(/\\/g, "/");

const matchesNodeModule = (id, dep) =>
  id.includes(`/node_modules/${dep}/`) || id.endsWith(`/node_modules/${dep}`);

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const getChunkCategory = (chunk) => {
  const name = chunk.name || "";
  if (chunk.isEntry) return "entry";
  if (INTERNAL_CHUNK_GROUPS.some((group) => group.chunkName === name)) {
    return "editor-internal";
  }
  if (CODEMIRROR_LANGUAGE_CHUNKS.some(([, chunkName]) => chunkName === name)) {
    return "codemirror-language";
  }
  if (Object.prototype.hasOwnProperty.call(CHUNK_GROUPS, name)) {
    return "vendor";
  }
  if (chunk.isDynamicEntry) return "dynamic-entry";
  return "shared";
};

const createNexusCodeChunkReportPlugin = () => ({
  name: "nexus-code-chunk-report",
  apply: "build",
  generateBundle(_options, bundle) {
    const chunks = Object.values(bundle)
      .filter((output) => output.type === "chunk")
      .map((chunk) => {
        const rawBytes = Buffer.byteLength(chunk.code || "", "utf8");
        const gzipBytes = gzipSync(chunk.code || "").byteLength;
        return {
          fileName: chunk.fileName,
          name: chunk.name,
          category: getChunkCategory(chunk),
          isEntry: Boolean(chunk.isEntry),
          isDynamicEntry: Boolean(chunk.isDynamicEntry),
          rawBytes,
          gzipBytes,
          moduleCount: Object.keys(chunk.modules || {}).length,
          imports: chunk.imports || [],
          dynamicImports: chunk.dynamicImports || [],
          facadeModuleId: normalizeModuleId(chunk.facadeModuleId),
        };
      })
      .sort((a, b) => b.rawBytes - a.rawBytes);

    const assets = Object.values(bundle)
      .filter((output) => output.type === "asset")
      .map((asset) => {
        const source = asset.source ?? "";
        const rawBytes =
          typeof source === "string" ? Buffer.byteLength(source, "utf8") : source.byteLength;
        return {
          fileName: asset.fileName,
          rawBytes,
        };
      })
      .sort((a, b) => b.rawBytes - a.rawBytes)
      .slice(0, CHUNK_REPORT_LIMITS.topAssets);

    const totals = chunks.reduce(
      (acc, chunk) => ({
        rawBytes: acc.rawBytes + chunk.rawBytes,
        gzipBytes: acc.gzipBytes + chunk.gzipBytes,
        moduleCount: acc.moduleCount + chunk.moduleCount,
      }),
      { rawBytes: 0, gzipBytes: 0, moduleCount: 0 },
    );
    const warnings = chunks
      .filter(
        (chunk) =>
          chunk.rawBytes >= CHUNK_REPORT_LIMITS.warnRawBytes ||
          chunk.gzipBytes >= CHUNK_REPORT_LIMITS.warnGzipBytes ||
          chunk.moduleCount >= CHUNK_REPORT_LIMITS.warnModuleCount,
      )
      .map((chunk) => ({
        fileName: chunk.fileName,
        rawBytes: chunk.rawBytes,
        gzipBytes: chunk.gzipBytes,
        moduleCount: chunk.moduleCount,
        reasons: [
          chunk.rawBytes >= CHUNK_REPORT_LIMITS.warnRawBytes ? "raw-size" : null,
          chunk.gzipBytes >= CHUNK_REPORT_LIMITS.warnGzipBytes ? "gzip-size" : null,
          chunk.moduleCount >= CHUNK_REPORT_LIMITS.warnModuleCount ? "module-count" : null,
        ].filter(Boolean),
      }));

    const report = {
      generatedAt: new Date().toISOString(),
      limits: CHUNK_REPORT_LIMITS,
      totals,
      chunkCount: chunks.length,
      assetCount: Object.values(bundle).filter((output) => output.type === "asset").length,
      topChunks: chunks.slice(0, CHUNK_REPORT_LIMITS.topChunks),
      topAssets: assets,
      warnings,
      chunks,
    };

    this.emitFile({
      type: "asset",
      fileName: "chunk-report.json",
      source: `${JSON.stringify(report, null, 2)}\n`,
    });

    this.info(
      `[chunk-report] ${chunks.length} JS chunks; total ${formatBytes(
        totals.rawBytes,
      )} raw / ${formatBytes(totals.gzipBytes)} gzip; report dist/chunk-report.json`,
    );
    chunks.slice(0, CHUNK_REPORT_LIMITS.topChunks).forEach((chunk, index) => {
      this.info(
        `[chunk-report] #${index + 1} ${chunk.fileName} ${formatBytes(
          chunk.rawBytes,
        )} raw / ${formatBytes(chunk.gzipBytes)} gzip; ${chunk.moduleCount} modules; ${
          chunk.category
        }`,
      );
    });
    if (warnings.length > 0) {
      this.warn(
        `[chunk-report] ${warnings.length} chunk(s) crossed watch thresholds: ${warnings
          .slice(0, 5)
          .map((chunk) => `${chunk.fileName} (${chunk.reasons.join("+")})`)
          .join(", ")}`,
      );
    }
  },
});

const manualChunks = (id) => {
  const normalizedId = normalizeModuleId(id);
  for (const group of INTERNAL_CHUNK_GROUPS) {
    if (group.paths.some((entry) => normalizedId.includes(entry))) {
      return group.chunkName;
    }
  }

  if (!normalizedId.includes("node_modules")) return undefined;
  for (const [dep, chunkName] of CODEMIRROR_LANGUAGE_CHUNKS) {
    if (matchesNodeModule(normalizedId, dep)) return chunkName;
  }
  for (const [chunkName, deps] of Object.entries(CHUNK_GROUPS)) {
    if (deps.some((dep) => matchesNodeModule(normalizedId, dep))) {
      return chunkName;
    }
  }
  return undefined;
};

export default defineConfig({
  plugins: [react(), createNexusCodeChunkReportPlugin()],
  base: "./",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nexus/core": path.resolve(__dirname, "../packages/nexus-core/src"),
      "@nexus/api": path.resolve(__dirname, "../packages/nexus-core/src/api"),
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(
        __dirname,
        "./node_modules/react/jsx-runtime.js",
      ),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "./node_modules/react/jsx-dev-runtime.js",
      ),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    open: false,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
