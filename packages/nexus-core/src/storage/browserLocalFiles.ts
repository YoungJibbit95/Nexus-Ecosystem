import { createLocalFileRepository } from './localFileRepository'

/** Explicit browser lifetime. Call once per client file repository, never from the core barrel. */
export function createBrowserLocalFileRepository() {
  const repository = createLocalFileRepository({
    storage: () => typeof window === 'undefined' ? undefined : window.localStorage,
  })
  const flush = () => { repository.flush() }
  const onVisibility = () => { if (document.visibilityState === 'hidden') flush() }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
  }
  return {
    ...repository,
    dispose: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', flush)
        document.removeEventListener('visibilitychange', onVisibility)
      }
      return repository.dispose()
    },
  }
}
