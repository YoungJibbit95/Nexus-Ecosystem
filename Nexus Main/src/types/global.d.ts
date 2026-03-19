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
        read: (path: string) => Promise<{ ok: boolean; data?: string; error?: string }>
        write: (path: string, content: string) => Promise<{ ok: boolean; error?: string }>
      }
      notify: (title: string, body: string) => Promise<void> | void
    }
  }
}
