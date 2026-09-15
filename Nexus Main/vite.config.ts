import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: configDir,
  plugins: [react()],
  base: "./",
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(configDir, "./src"),
      "@nexus/core": path.resolve(configDir, "../packages/nexus-core/src"),
      "@nexus/api": path.resolve(configDir, "../packages/nexus-core/src/api"),
      react: path.resolve(configDir, "./node_modules/react"),
      "react-dom": path.resolve(configDir, "./node_modules/react-dom"),
      "react/jsx-runtime": path.resolve(
        configDir,
        "./node_modules/react/jsx-runtime.js",
      ),
      "react/jsx-dev-runtime": path.resolve(
        configDir,
        "./node_modules/react/jsx-dev-runtime.js",
      ),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [path.resolve(configDir, "..")],
    },
  },
  build: {
    manifest: "main-manifest.json",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
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
