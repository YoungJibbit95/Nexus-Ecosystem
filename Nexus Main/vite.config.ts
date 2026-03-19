import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nexus/core': path.resolve(__dirname, '../packages/nexus-core/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('monaco-editor')) return 'vendor-monaco'
          if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'vendor-markdown'
          if (id.includes('lucide-react')) return 'vendor-lucide'
        },
      },
    },
  },
  optimizeDeps: {
    // Pre-bundle Monaco so it's available locally, not from CDN
    include: [
      'monaco-editor/esm/vs/language/json/json.worker',
      'monaco-editor/esm/vs/language/css/css.worker',
      'monaco-editor/esm/vs/language/html/html.worker',
      'monaco-editor/esm/vs/language/typescript/ts.worker',
      'monaco-editor/esm/vs/editor/editor.worker',
    ],
  },
})
