import { useSyncExternalStore } from 'react'
import { persistenceRegistry } from './browserPersistence'

export function PersistenceNotice() {
  useSyncExternalStore(persistenceRegistry.subscribe, persistenceRegistry.getRevision, persistenceRegistry.getRevision)
  const errors = persistenceRegistry.getStatuses().filter(status => status.error)
  if (!errors.length) return null
  return <div role="alert" style={{ position: 'fixed', zIndex: 100000, bottom: 16, left: 16, right: 16, padding: 12, background: '#452717', color: '#fff1df', border: '1px solid #e8a866', borderRadius: 8 }}>
    <strong>Speichern fehlgeschlagen.</strong> Bestehende gespeicherte Daten wurden beibehalten.{' '}
    {[...new Set(errors.map(status => status.error))].join(' · ')}{' '}
    <button type="button" onClick={() => { void persistenceRegistry.flush() }}>Erneut versuchen</button>
  </div>
}
