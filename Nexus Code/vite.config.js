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

const manualChunks = (id) => {
  if (!id.includes("node_modules")) return undefined;
  for (const [dep, chunkName] of CODEMIRROR_LANGUAGE_CHUNKS) {
    if (id.includes(`/node_modules/${dep}/`)) return chunkName;
  }
  for (const [chunkName, deps] of Object.entries(CHUNK_GROUPS)) {
    if (deps.some((dep) => id.includes(`/node_modules/${dep}/`))) {
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
