import React from 'react'
import { MobilePlanningSurface } from './planning/MobilePlanningSurface'

export function AgendaView({ setView }: { setView?: (view: string) => void }) {
  return <div className="nx-mobile-agenda-view custom-scrollbar" style={{ height: '100%', overflowY: 'auto', padding: 8 }}>
    <MobilePlanningSurface setView={setView} onOpenTask={() => setView?.('tasks')} />
  </div>
}
