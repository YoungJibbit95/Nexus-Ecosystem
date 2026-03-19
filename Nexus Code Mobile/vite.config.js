import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // "./" ist zwingend für Capacitor file:// Protokoll
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nexus/api": path.resolve(__dirname, "../API/nexus-api/src"),
    },
  },
  server: {
    port: 5176,
    strictPort: true,
    open: false,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    watch: {
      ignored: ["**/android/**", "**/ios/**", "**/dist/**", "**/build/**"],
    },
  },
  // Monaco Worker muss als ES-Modul gebundelt werden
  worker: {
    format: "es",
  },
  build: {
    // Kleinere Chunks für schnelleres WebView-Laden
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["framer-motion"],
          router: ["react-router-dom"],
          capacitor: [
            "@capacitor/core",
            "@capacitor/filesystem",
            "@capacitor/dialog",
            "@capacitor/status-bar",
            "@capacitor/keyboard",
          ],
          radix: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-slider",
            "@radix-ui/react-switch",
            "@radix-ui/react-tooltip",
          ],
        },
      },
    },
  },
  optimizeDeps: {
    entries: ["index.html"],
  },
  // Verhindert "process is not defined" Fehler in WebView
  define: {
    "process.env": {},
  },
});
