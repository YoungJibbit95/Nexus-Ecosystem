import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

const CHUNK_GROUPS = {
  react: ["react", "react-dom"],
  motion: ["framer-motion"],
  router: ["react-router-dom"],
  radix: [
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-select",
    "@radix-ui/react-slider",
    "@radix-ui/react-switch",
    "@radix-ui/react-tooltip",
  ],
};

const resolveMonacoChunk = (id) => {
  if (!id.includes("monaco-editor")) return null;
  if (id.includes("monaco-editor/esm/vs/editor/")) return "monaco-core";
  if (id.includes("monaco-editor/esm/vs/base/")) return "monaco-base";
  if (id.includes("monaco-editor/esm/vs/language/typescript/"))
    return "monaco-ts";
  if (id.includes("monaco-editor/esm/vs/language/json/")) return "monaco-json";
  if (id.includes("monaco-editor/esm/vs/language/css/")) return "monaco-css";
  if (id.includes("monaco-editor/esm/vs/language/html/")) return "monaco-html";
  if (id.includes("monaco-editor/esm/vs/language/")) return "monaco-lang";
  return "monaco-misc";
};

const manualChunks = (id) => {
  if (!id.includes("node_modules")) return undefined;
  const monacoChunk = resolveMonacoChunk(id);
  if (monacoChunk) return monacoChunk;
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
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nexus/api": path.resolve(__dirname, "../packages/nexus-core/src/api"),
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
