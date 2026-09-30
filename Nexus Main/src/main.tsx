import { PersistenceNotice } from '@nexus/core/storage/PersistenceNotice'
import { WorkspaceMutationGuard } from '@nexus/core/storage/WorkspaceMutationGuard'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { recoverWorkspaceRestore } from './app/workspaceRestore'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
recoverWorkspaceRestore().then(recovered => root.render(
  <React.StrictMode>
    {recovered && <div role="status">Eine unterbrochene Wiederherstellung wurde auf den vorherigen Stand zurückgesetzt.</div>}
    <App />
    <WorkspaceMutationGuard />
    <PersistenceNotice />
  </React.StrictMode>,
)).catch(error => root.render(
  <main role="alert" style={{ padding: 32 }}>
    <h1>Workspace-Wiederherstellung benötigt Aufmerksamkeit</h1>
    <p>{error instanceof Error ? error.message : String(error)}</p>
    <p>Die gespeicherten Daten und der Wiederherstellungspunkt wurden beibehalten.</p>
    <button onClick={() => window.location.reload()}>Erneut versuchen</button>
  </main>,
))
