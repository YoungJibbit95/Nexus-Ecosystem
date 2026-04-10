export {}

declare global {
  interface Window {
    api?: {
      window: {
        minimize: () => Promise<void> | void
        maximize: () => Promise<void> | void
        close: () => Promise<void> | void
      }
      fs: {
        pickDirectory: () => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
        read: (path: string) => Promise<{ ok: boolean; data?: string; error?: string }>
        readDir: (path: string, recursive?: boolean) => Promise<{
          ok: boolean
          entries?: Array<{
            path: string
            isDirectory: boolean
            size: number
            mtimeMs: number
          }>
          error?: string
        }>
        write: (path: string, content: string) => Promise<{ ok: boolean; error?: string }>
      }
      notify: (title: string, body: string) => Promise<void> | void
    }
  }
}
