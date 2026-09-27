import { PersistenceNotice } from '@nexus/core/storage/PersistenceNotice'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <PersistenceNotice />
  </React.StrictMode>
)
