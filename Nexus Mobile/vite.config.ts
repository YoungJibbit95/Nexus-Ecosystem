import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nexus/core': path.resolve(__dirname, '../packages/nexus-core/src'),
      '@nexus/api': path.resolve(__dirname, '../.nexus-private/NexusAPI/API/nexus-api/src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    watch: {
      ignored: ['**/android/**', '**/ios/**', '**/dist/**', '**/build/**'],
    },
  },
  build: {
    // Capacitor needs smaller chunks for WebView
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-dnd': ['react-dnd', 'react-dnd-html5-backend'],
        }
      }
    }
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: [
      'monaco-editor/esm/vs/language/json/json.worker',
      'monaco-editor/esm/vs/language/css/css.worker',
      'monaco-editor/esm/vs/language/html/html.worker',
      'monaco-editor/esm/vs/language/typescript/ts.worker',
      'monaco-editor/esm/vs/editor/editor.worker',
    ],
  },
})
