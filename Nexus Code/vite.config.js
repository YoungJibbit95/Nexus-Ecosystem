import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

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
  plugins: [react()],
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
