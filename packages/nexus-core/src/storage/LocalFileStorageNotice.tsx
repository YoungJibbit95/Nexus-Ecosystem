import React, { useSyncExternalStore } from 'react'
import type { createLocalFileRepository } from './localFileRepository'

export function LocalFileStorageNotice({ repository }: { repository: ReturnType<typeof createLocalFileRepository> }) {
  const status = useSyncExternalStore(repository.subscribe, repository.getStatus, repository.getStatus)
  if (!status.error) return null
  return (
    <div role="alert" style={{ padding: '8px 12px', flexShrink: 0, color: '#ffe2b5', background: '#482c16' }}>
      Local files could not be saved. Existing stored data has been retained. {status.error}
      {!status.blocked && <button type="button" onClick={() => repository.flush()} style={{ marginLeft: 12 }}>Retry save</button>}
    </div>
  )
}
