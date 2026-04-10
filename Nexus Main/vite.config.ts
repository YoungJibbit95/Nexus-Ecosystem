import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const resolveMonacoChunk = (id: string) => {
  if (!id.includes("monaco-editor")) return null;
  if (id.includes("monaco-editor/esm/vs/editor/")) return "vendor-monaco-core";
  if (id.includes("monaco-editor/esm/vs/base/")) return "vendor-monaco-base";
  if (id.includes("monaco-editor/esm/vs/language/typescript/"))
    return "vendor-monaco-ts";
  if (id.includes("monaco-editor/esm/vs/language/json/"))
    return "vendor-monaco-json";
  if (id.includes("monaco-editor/esm/vs/language/css/"))
    return "vendor-monaco-css";
  if (id.includes("monaco-editor/esm/vs/language/html/"))
    return "vendor-monaco-html";
  if (id.includes("monaco-editor/esm/vs/language/"))
    return "vendor-monaco-lang";
  return "vendor-monaco-misc";
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
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          const monacoChunk = resolveMonacoChunk(id);
          if (monacoChunk) return monacoChunk;
          if (id.includes("/node_modules/three/")) return "vendor-three";
          if (id.includes("react-markdown") || id.includes("remark-gfm"))
            return "vendor-markdown";
          if (id.includes("lucide-react")) return "vendor-lucide";
        },
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle Monaco so it's available locally, not from CDN
    include: [
      "monaco-editor/esm/vs/language/json/json.worker",
      "monaco-editor/esm/vs/language/css/css.worker",
      "monaco-editor/esm/vs/language/html/html.worker",
      "monaco-editor/esm/vs/language/typescript/ts.worker",
      "monaco-editor/esm/vs/editor/editor.worker",
    ],
  },
});
