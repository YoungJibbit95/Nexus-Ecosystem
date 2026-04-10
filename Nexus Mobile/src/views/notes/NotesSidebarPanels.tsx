import React from 'react'
import { Plus, Trash2, Settings, Search, Pin, Upload, FileText } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Glass } from '../../components/Glass'
import type { Note } from '../../store/appStore'

type NotesSidebarPanelsProps = {
  isMobile: boolean
  focusMode: boolean
  showMobileSidebar: boolean
  setShowMobileSidebar: (next: boolean) => void
  notes: Note[]
  filteredNotes: Note[]
  allTags: string[]
  searchQuery: string
  setSearchQuery: (next: string) => void
  showSearch: boolean
  setShowSearch: (next: boolean) => void
  sortBy: 'updated' | 'title' | 'created'
  setSortBy: (next: 'updated' | 'title' | 'created') => void
  tagFilter: string | null
  setTagFilter: (next: string | null) => void
  activeNoteId: string | null
  accent: string
  rgb: string
  mode: 'dark' | 'light'
  addNote: () => void
  setNote: (id: string) => void
  updateNote: (id: string, patch: Partial<Note>) => void
  delNote: (id: string) => void
  onOpenSettings: () => void
  onImportMarkdown: () => void
}

export function NotesSidebarPanels({
  isMobile,
  focusMode,
  showMobileSidebar,
  setShowMobileSidebar,
  notes,
  filteredNotes,
  allTags,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  sortBy,
  setSortBy,
  tagFilter,
  setTagFilter,
  activeNoteId,
  accent,
  rgb,
  mode,
  addNote,
  setNote,
  updateNote,
  delNote,
  onOpenSettings,
  onImportMarkdown,
}: NotesSidebarPanelsProps) {
  return (
    <>
      {!focusMode && !isMobile && (
        <Glass className="flex flex-col shrink-0" style={{ width: 220, overflow: 'hidden', minHeight: 0 }}>
          <div className="flex items-center justify-between px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Notes</span>
            <div className="flex gap-0.5">
              {[
                { icon: Search, action: () => setShowSearch(!showSearch), active: showSearch, tip: 'Suchen' },
                { icon: Plus, action: addNote, active: false, tip: 'Neue Notiz', color: accent },
                { icon: Upload, action: onImportMarkdown, active: false, tip: 'Markdown importieren' },
                { icon: Settings, action: onOpenSettings, active: false, tip: 'Einstellungen' },
              ].map(({ icon: Icon, action, active: isActive, tip, color }) => (
                <button key={tip} onClick={action} title={tip} style={{
                  padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: isActive ? `rgba(${rgb},0.12)` : 'transparent',
                  color: isActive ? accent : (color || 'inherit'),
                  transition: 'all 0.15s', display: 'flex',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = `rgba(${rgb},0.12)`)}
                  onMouseLeave={e => (e.currentTarget.style.background = isActive ? `rgba(${rgb},0.12)` : 'transparent')}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {showSearch && (
            <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input
                autoFocus
                placeholder="Suchen..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  outline: 'none', color: 'inherit',
                }}
              />
            </div>
          )}

          {allTags.length > 0 && (
            <div className="px-3 py-2 shrink-0 flex flex-wrap gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {allTags.slice(0, 8).map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, border: 'none', cursor: 'pointer',
                    background: tagFilter === tag ? `rgba(${rgb},0.25)` : 'rgba(255,255,255,0.06)',
                    color: tagFilter === tag ? accent : 'inherit', transition: 'all 0.15s',
                  }}
                >#{tag}</button>
              ))}
            </div>
          )}

          <div className="px-2 py-1 shrink-0 flex gap-0.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {(['updated', 'title', 'created'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                padding: '3px 8px', borderRadius: 6, fontSize: 10, border: 'none', cursor: 'pointer',
                background: sortBy === s ? `rgba(${rgb},0.15)` : 'transparent',
                color: sortBy === s ? accent : 'inherit', transition: 'all 0.15s',
              }}>
                {s === 'updated' ? 'Aktuell' : s === 'title' ? 'A-Z' : 'Neu'}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px', minHeight: 0 }}>
            {filteredNotes.map((n) => (
              <div
                key={n.id}
                onClick={() => setNote(n.id)}
                role="button"
                tabIndex={0}
                style={{
                  padding: '8px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 2,
                  background: n.id === activeNoteId ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: `2px solid ${n.id === activeNoteId ? accent : 'transparent'}`,
                  transition: 'all 0.13s', position: 'relative',
                }}
                className="group"
                onMouseEnter={e => { if (n.id !== activeNoteId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (n.id !== activeNoteId) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {n.dirty && <span style={{ color: accent, fontSize: 7, flexShrink: 0 }}>●</span>}
                    {n.title}
                  </span>
                  {n.pinned && <Pin size={9} style={{ color: '#FFCC00', flexShrink: 0 }} />}
                </div>
                <div style={{ fontSize: 10, opacity: 0.45, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {n.content.replace(/[#*`]/g, '').slice(0, 45)}…
                </div>
                {n.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                    {n.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `rgba(${rgb},0.12)`, color: accent }}>{tag}</span>
                    ))}
                  </div>
                )}
                <div style={{ position: 'absolute', right: 6, top: 6, display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}
                  className="group-hover:opacity-100"
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <button onClick={e => { e.stopPropagation(); updateNote(n.id, { pinned: !n.pinned }) }}
                    style={{ padding: 3, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', display: 'flex' }}>
                    <Pin size={9} style={{ color: n.pinned ? '#FFCC00' : undefined }} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); delNote(n.id) }}
                    style={{ padding: 3, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'rgba(255,69,58,0.15)', color: '#FF453A', display: 'flex' }}>
                    <Trash2 size={9} />
                  </button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div style={{ fontSize: 11, opacity: 0.35, textAlign: 'center', padding: '24px 0' }}>
                {searchQuery ? 'Keine Ergebnisse' : 'Keine Notizen'}
              </div>
            )}
          </div>
        </Glass>
      )}

      <AnimatePresence>
        {isMobile && showMobileSidebar && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
                background: mode === 'dark' ? 'rgba(12,12,22,0.98)' : 'rgba(248,248,255,0.98)',
                backdropFilter: 'blur(24px)', borderRadius: '20px 20px 0 0',
                border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
                padding: '8px 0 40px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 12px' }} />
              <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>All Notes <span style={{ fontSize: 12, opacity: 0.4, fontWeight: 500 }}>({notes.length})</span></span>
                <button onClick={() => { addNote(); setShowMobileSidebar(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 12, background: accent, border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  <Plus size={15} /> New
                </button>
              </div>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search notes…"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 14, color: 'inherit' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {notes.filter(n => searchQuery ? (n.title + n.content).toLowerCase().includes(searchQuery.toLowerCase()) : true)
                  .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
                  .map(n => (
                    <button key={n.id} onClick={() => { setNote(n.id); setShowMobileSidebar(false) }}
                      style={{
                        width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: 14, cursor: 'pointer', marginBottom: 6,
                        background: n.id === activeNoteId ? `rgba(${rgb},0.15)` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${n.id === activeNoteId ? `rgba(${rgb},0.3)` : 'rgba(255,255,255,0.07)'}`,
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: n.id === activeNoteId ? 700 : 600, color: n.id === activeNoteId ? accent : 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.pinned && '📌 '}{n.title || 'Untitled'}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.45, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.content.replace(/[#*`]/g, '').slice(0, 60)}
                        </div>
                        {n.tags.length > 0 && <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {n.tags.slice(0, 3).map(tag => <span key={tag} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: `rgba(${rgb},0.12)`, color: accent }}>#{tag}</span>)}
                        </div>}
                      </div>
                    </button>
                  ))}
                {notes.length === 0 && <div style={{ opacity: 0.35, textAlign: 'center', padding: '30px 0', fontSize: 14 }}>No notes yet</div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
