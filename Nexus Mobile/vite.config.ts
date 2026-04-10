import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const CHUNK_GROUPS: Record<string, string[]> = {
  'vendor-react': ['react', 'react-dom'],
  'vendor-motion': ['framer-motion'],
  'vendor-markdown': ['react-markdown', 'remark-gfm'],
  'vendor-dnd': ['react-dnd', 'react-dnd-html5-backend'],
}

const resolveMonacoChunk = (id: string) => {
  if (!id.includes('monaco-editor')) return null
  if (id.includes('monaco-editor/esm/vs/editor/')) return 'vendor-monaco-core'
  if (id.includes('monaco-editor/esm/vs/base/')) return 'vendor-monaco-base'
  if (id.includes('monaco-editor/esm/vs/language/typescript/'))
    return 'vendor-monaco-ts'
  if (id.includes('monaco-editor/esm/vs/language/json/'))
    return 'vendor-monaco-json'
  if (id.includes('monaco-editor/esm/vs/language/css/'))
    return 'vendor-monaco-css'
  if (id.includes('monaco-editor/esm/vs/language/html/'))
    return 'vendor-monaco-html'
  if (id.includes('monaco-editor/esm/vs/language/')) return 'vendor-monaco-lang'
  return 'vendor-monaco-misc'
}

const manualChunks = (id: string) => {
  if (!id.includes('node_modules')) return undefined
  const monacoChunk = resolveMonacoChunk(id)
  if (monacoChunk) return monacoChunk
  if (id.includes('/node_modules/three/')) return 'vendor-three'
  for (const [chunkName, deps] of Object.entries(CHUNK_GROUPS)) {
    if (deps.some((dep) => id.includes(`/node_modules/${dep}/`))) {
      return chunkName
    }
  }
  return undefined
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@nexus/core': path.resolve(__dirname, '../packages/nexus-core/src'),
      '@nexus/api': path.resolve(__dirname, '../packages/nexus-core/src/api'),
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
        manualChunks,
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
