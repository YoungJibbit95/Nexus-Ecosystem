import { useMobile } from '../lib/useMobile'
import React, { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus, Trash2, Settings, Save, Copy, Pin, X, RotateCcw, Search,
  Bold, Italic, Heading, List, ListOrdered, Quote, Code, Link,
  Download, Clock, Hash, Eye, Edit3, Minus, Strikethrough,
  Maximize2, Minimize2, Wand2, Sparkles, Bell, Zap, Calendar, CreditCard,
  ChevronDown, Table, FileText
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Glass } from '../components/Glass'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb, fmtDt } from '../lib/utils'
import { shallow } from 'zustand/shallow'
import { useNotesAnalysis } from './notes/useNotesAnalysis'

// ─────────────────────────────────────────────────────────────────
//  MAGIC ELEMENT RENDERERS
// ─────────────────────────────────────────────────────────────────

import { MagicElementModal, NexusCodeBlock, NexusInlineCode } from './notes/NotesMagicKit'
const NOTE_COMMIT_DEBOUNCE_MS = 4_200
const NOTE_PREVIEW_DEBOUNCE_MS = 220
const NOTE_UNDO_SNAPSHOT_INTERVAL_MS = 260
const MAX_RENDERED_LINE_NUMBERS = 4_000
const runIdle = (task: () => void, timeoutMs = 320) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(task, { timeout: timeoutMs })
    return
  }
  setTimeout(task, 0)
}
export function NotesView() {
  const { notes, activeNoteId, addNote, updateNote, delNote, setNote, saveNote } = useApp((s) => ({
    notes: s.notes,
    activeNoteId: s.activeNoteId,
    addNote: s.addNote,
    updateNote: s.updateNote,
    delNote: s.delNote,
    setNote: s.setNote,
    saveNote: s.saveNote,
  }), shallow)
  const [mode, setMode] = useState<'edit' | 'split' | 'preview'>('edit')
  const [showSettings, setShowSettings] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [editingTags, setEditingTags] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [showMagic, setShowMagic] = useState(false)
  const [magicStep, setMagicStep] = useState<string | null>(null) // selected element type
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLPreElement>(null)
  const magicBtnRef = useRef<HTMLButtonElement>(null)
  // Save selection before magic menu opens so we can restore it on insert
  const savedSel = useRef<{ start: number; end: number } | null>(null)
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const active = useMemo(() => notes.find((n) => n.id === activeNoteId) ?? notes[0], [notes, activeNoteId])
  const [draftContent, setDraftContent] = useState('')
  const [draftDirty, setDraftDirty] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const draftContentRef = useRef('')
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const lastUndoSnapshotAtRef = useRef(0)
  const commitTimerRef = useRef<number | null>(null)
  const pendingCommitRef = useRef<{ noteId: string; content: string } | null>(null)
  const deferredDraftContent = useDeferredValue(previewContent)
  const analysis = useNotesAnalysis(
    deferredDraftContent,
    MAX_RENDERED_LINE_NUMBERS,
  )

  const [localSettings, setLocalSettings] = useState({
    fontSize: t.notes.fontSize, fontFamily: t.notes.fontFamily,
    lineHeight: t.notes.lineHeight, mode: t.notes.mode,
    autosave: t.editor.autosave, autosaveInterval: t.editor.autosaveInterval,
    wordWrap: t.editor.wordWrap, lineNumbers: t.editor.lineNumbers,
    minimap: t.editor.minimap, cursorAnimation: t.editor.cursorAnimation,
    tabSize: t.editor.tabSize,
    compactMode: t.visual.compactMode, panelRadius: t.visual.panelRadius,
    shadowDepth: t.visual.shadowDepth, spacingDensity: t.visual.spacingDensity as 'comfortable' | 'compact' | 'spacious',
  })

  useEffect(() => {
    draftContentRef.current = draftContent
  }, [draftContent])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreviewContent(draftContent)
    }, NOTE_PREVIEW_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [draftContent])

  const flushPendingCommit = useCallback(() => {
    const pending = pendingCommitRef.current
    if (!pending) return
    runIdle(() => {
      updateNote(pending.noteId, { content: pending.content, dirty: true })
    })
    pendingCommitRef.current = null
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }
  }, [updateNote])

  const queueDraftCommit = useCallback((noteId: string, content: string) => {
    pendingCommitRef.current = { noteId, content }
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
    }
    commitTimerRef.current = window.setTimeout(() => {
      flushPendingCommit()
    }, NOTE_COMMIT_DEBOUNCE_MS)
  }, [flushPendingCommit])

  const saveActiveNow = useCallback(() => {
    if (!active) return
    const currentDraft = draftContentRef.current
    if (active.content !== currentDraft) {
      updateNote(active.id, { content: currentDraft, dirty: true })
    } else {
      flushPendingCommit()
    }
    saveNote(active.id)
    setDraftDirty(false)
    setLastSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
  }, [active, flushPendingCommit, saveNote, updateNote])

  useEffect(() => {
    flushPendingCommit()
    if (!active) {
      setDraftContent('')
      setDraftDirty(false)
      undoStackRef.current = []
      redoStackRef.current = []
      return
    }
    setDraftContent(active.content)
    setPreviewContent(active.content)
    setDraftDirty(Boolean(active.dirty))
    undoStackRef.current = [active.content]
    redoStackRef.current = []
    lastUndoSnapshotAtRef.current = Date.now()
  }, [active?.id, flushPendingCommit])

  useEffect(() => () => {
    flushPendingCommit()
  }, [flushPendingCommit])

  useEffect(() => {
    if (!t.editor.autosave || !active || !draftDirty) return
    const timer = setTimeout(() => {
      saveActiveNow()
    }, t.editor.autosaveInterval)
    return () => clearTimeout(timer)
  }, [active, draftDirty, saveActiveNow, t.editor.autosave, t.editor.autosaveInterval])

  const handleChange = (value: string) => {
    if (!active) return
    setDraftContent(value)
    setDraftDirty(true)
    const undoStack = undoStackRef.current
    const last = undoStack[undoStack.length - 1]
    const nowMs = Date.now()
    const shouldCapture =
      last !== value
      && (
        nowMs - lastUndoSnapshotAtRef.current >= NOTE_UNDO_SNAPSHOT_INTERVAL_MS
        || Math.abs(value.length - (last?.length ?? 0)) >= 12
        || value.endsWith('\n')
      )
    if (shouldCapture) {
      if (undoStack.length >= 50) {
        undoStack.shift()
      }
      undoStack.push(value)
      lastUndoSnapshotAtRef.current = nowMs
    }
    redoStackRef.current = []
    queueDraftCommit(active.id, value)
  }

  const handleUndo = () => {
    if (!active || undoStackRef.current.length <= 1) return
    const stack = [...undoStackRef.current]
    const last = stack.pop()!
    redoStackRef.current = [...redoStackRef.current.slice(-50), last]
    const previous = stack[stack.length - 1] ?? ''
    undoStackRef.current = stack
    setDraftContent(previous)
    setPreviewContent(previous)
    setDraftDirty(true)
    lastUndoSnapshotAtRef.current = Date.now()
    queueDraftCommit(active.id, previous)
  }

  const handleRedo = () => {
    if (!active || redoStackRef.current.length === 0) return
    const redo = [...redoStackRef.current]
    const next = redo.pop()!
    redoStackRef.current = redo
    undoStackRef.current = [...undoStackRef.current.slice(-50), next]
    setDraftContent(next)
    setPreviewContent(next)
    setDraftDirty(true)
    lastUndoSnapshotAtRef.current = Date.now()
    queueDraftCommit(active.id, next)
  }

  const syncLineNumberScroll = useCallback((target?: HTMLTextAreaElement | null) => {
    const area = target ?? editorRef.current
    const lineNumbersEl = lineNumbersRef.current
    if (!area || !lineNumbersEl) return
    lineNumbersEl.style.transform = `translateY(${-area.scrollTop}px)`
  }, [])

  useEffect(() => {
    syncLineNumberScroll()
  }, [draftContent, syncLineNumberScroll])

  const saveAsFile = () => {
    if (!active) return
    const blob = new Blob([draftContentRef.current], { type: 'text/markdown;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob); link.download = active.title.replace(/\s/g, '_') + '.md'
    link.click(); URL.revokeObjectURL(link.href); saveActiveNow()
  }

  // ── Insert format helper — uses saved selection if textarea lost focus ──
  const insertFormat = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    if (!active) return
    const ta = editorRef.current
    const currentContent = draftContentRef.current
    // Use saved selection (from magic menu open) or current selection
    const sel = savedSel.current
    const start = sel?.start ?? (ta?.selectionStart ?? currentContent.length)
    const end   = sel?.end   ?? (ta?.selectionEnd   ?? currentContent.length)
    savedSel.current = null

    const selected = currentContent.substring(start, end) || placeholder
    const before = currentContent.substring(0, start)
    const after  = currentContent.substring(end)
    const newContent = before + prefix + selected + suffix + after
    handleChange(newContent)

    // Restore focus + cursor
    setTimeout(() => {
      if (!ta) return
      ta.focus()
      ta.selectionStart = start + prefix.length
      ta.selectionEnd   = start + prefix.length + selected.length
    }, 10)
  }, [active])

  // Save cursor position before magic menu opens
  const handleMagicOpen = () => {
    if (editorRef.current) {
      savedSel.current = { start: editorRef.current.selectionStart, end: editorRef.current.selectionEnd }
    }
    setMagicStep(null)
    setShowMagic(true)
  }

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); insertFormat('**', '**', 'fett') }
      else if (e.key === 'i') { e.preventDefault(); insertFormat('*', '*', 'kursiv') }
      else if (e.key === 's') {
        e.preventDefault()
        if (active) saveActiveNow()
      }
      else if (e.key === 'z') { e.preventDefault(); handleUndo() }
      else if (e.key === 'y') { e.preventDefault(); handleRedo() }
      else if (e.key === 'k') { e.preventDefault(); insertFormat('[', '](url)', 'Link-Text') }
    }
    if (e.key === 'Tab') { e.preventDefault(); insertFormat('  ', '') }
  }, [insertFormat, active, handleRedo, handleUndo, saveActiveNow])

  const stats = active
    ? { words: analysis.words, chars: analysis.chars, lines: analysis.lines }
    : { words: 0, chars: 0, lines: 0 }

  const filteredNotes = useMemo(() => {
    let result = notes
    if (deferredSearchQuery) {
      const q = deferredSearchQuery.toLowerCase()
      result = result.filter(n => {
        if (n.title.toLowerCase().includes(q)) return true
        if (n.tags.some(t => t.toLowerCase().includes(q))) return true
        return n.content.toLowerCase().includes(q)
      })
    }
    if (tagFilter) result = result.filter(n => n.tags.includes(tagFilter))
    result = [...result].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'created') return new Date(b.created).getTime() - new Date(a.created).getTime()
      return new Date(b.updated).getTime() - new Date(a.updated).getTime()
    })
    return [...result.filter(n => n.pinned), ...result.filter(n => !n.pinned)]
  }, [notes, deferredSearchQuery, sortBy, tagFilter])

  const allTags = useMemo(() => {
    const set = new Set<string>(); notes.forEach(n => n.tags.forEach(t => set.add(t))); return Array.from(set)
  }, [notes])

  const handleApplySettings = () => {
    t.setNotes({ fontSize: localSettings.fontSize, fontFamily: localSettings.fontFamily, lineHeight: localSettings.lineHeight, mode: localSettings.mode })
    t.setEditor({ autosave: localSettings.autosave, autosaveInterval: localSettings.autosaveInterval, wordWrap: localSettings.wordWrap, lineNumbers: localSettings.lineNumbers, minimap: localSettings.minimap, cursorAnimation: localSettings.cursorAnimation, tabSize: localSettings.tabSize })
    t.setVisual({ compactMode: localSettings.compactMode, panelRadius: localSettings.panelRadius, shadowDepth: localSettings.shadowDepth, spacingDensity: localSettings.spacingDensity })
    setShowSettings(false)
  }

  // Small formatting button
  const FmtBtn = ({ icon: Icon, tooltip, action }: { icon: any; tooltip: string; action: () => void }) => {
    const [h, setH] = useState(false)
    return (
      <button
        title={tooltip} onClick={action}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{
          padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
          background: h ? `rgba(${rgb}, 0.15)` : 'transparent',
          color: h ? t.accent : 'inherit',
          transform: h ? 'scale(1.12)' : 'scale(1)',
          transition: 'all 0.13s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Icon size={14} />
      </button>
    )
  }

  // ReactMarkdown components — passed accent via closure
  const mdComponents = useMemo(() => ({
    code({ className, children, ...props }: any) {
      // In react-markdown v9, fenced code blocks get className='language-xxx'
      if (className?.startsWith('language-')) {
        return <NexusCodeBlock className={className} accent={t.accent}>{children}</NexusCodeBlock>
      }
      return <NexusInlineCode accent={t.accent}>{children}</NexusInlineCode>
    },
  }), [t.accent])

  const noteStats = active
    ? {
      words: analysis.words,
      links: analysis.links,
      tasks: analysis.tasks,
      readMins: analysis.readMins,
    }
    : {
      words: 0,
      links: 0,
      tasks: 0,
      readMins: 1,
    }
  const lineNumbersText = active ? analysis.lineNumbersText : '1'

  const insertWorkflowTemplate = (kind: 'daily' | 'meeting' | 'project') => {
    if (!active) return
    const templates: Record<typeof kind, string> = {
      daily: `\n## Daily Focus\n- Top 3 Prioritäten\n- Blocker\n- Heute erledigt\n\n## Review\n- Was lief gut?\n- Was verbessern?\n`,
      meeting: `\n## Meeting\n- Ziel\n- Teilnehmer\n- Entscheidungen\n- Action Items\n`,
      project: `\n## Projekt Plan\n- Scope\n- Milestones\n- Risiken\n- Nächste Schritte\n\n## Tasks\n- [ ] \n`,
    }
    handleChange(`${draftContentRef.current}${templates[kind]}`)
  }

  return (
    <div className="flex h-full gap-3 p-3 relative" style={{ minHeight: 0, flexDirection: mob.isMobile ? 'column' : 'row', gap: mob.isMobile ? 0 : 12, padding: mob.isMobile ? 0 : 12 }}>

      {/* Mobile top bar */}
      {mob.isMobile && !focusMode && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.1)', flexShrink:0 }}>
          <button onClick={()=>setShowMobileSidebar(true)} style={{ width:42, height:42, borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.2)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileText size={20}/>
          </button>
          <div style={{ flex:1, fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:t.accent }}>
            {active ? (active.title || 'Untitled') : 'Notes'}
          </div>
          {active && (
            <div style={{ display:'flex', gap:6 }}>
              {(['edit','preview'] as const).map(m => (
                <button key={m} onClick={()=>setMode(m)}
                  style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${mode===m?t.accent:'rgba(255,255,255,0.1)'}`, background:mode===m?`rgba(${rgb},0.15)`:'transparent', cursor:'pointer', color:mode===m?t.accent:'inherit', fontSize:12, fontWeight:700 }}>
                  {m==='edit'?'✏️':'👁'}
                </button>
              ))}
              <button onClick={() => active && saveActiveNow()} style={{ width:40, height:40, borderRadius:10, background:t.accent, border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Save size={16}/>
              </button>
            </div>
          )}
          {!active && (
            <button onClick={addNote} style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:t.accent, border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Plus size={16}/> New
            </button>
          )}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      {!focusMode && !mob.isMobile && (
        <Glass className="flex flex-col shrink-0" style={{ width: 220, overflow: 'hidden', minHeight: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>Notes</span>
            <div className="flex gap-0.5">
              {[
                { icon: Search, action: () => setShowSearch(!showSearch), active: showSearch, tip: 'Suchen' },
                { icon: Plus,   action: addNote,                         active: false,        tip: 'Neue Notiz', color: t.accent },
                { icon: Settings, action: () => setShowSettings(true),  active: false,        tip: 'Einstellungen' },
              ].map(({ icon: Icon, action, active: isActive, tip, color }) => (
                <button key={tip} onClick={action} title={tip} style={{
                  padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: isActive ? `rgba(${rgb},0.12)` : 'transparent',
                  color: isActive ? t.accent : (color || 'inherit'),
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
                autoFocus placeholder="Suchen..." value={searchQuery}
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
                    color: tagFilter === tag ? t.accent : 'inherit', transition: 'all 0.15s',
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
                color: sortBy === s ? t.accent : 'inherit', transition: 'all 0.15s',
              }}>
                {s === 'updated' ? 'Aktuell' : s === 'title' ? 'A-Z' : 'Neu'}
              </button>
            ))}
          </div>

          {/* Scrollable list — overflow-y:auto always shows scrollbar when needed */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '6px', minHeight: 0 }}>
            {filteredNotes.map((n) => (
              <div
                key={n.id} onClick={() => setNote(n.id)} role="button" tabIndex={0}
                style={{
                  padding: '8px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 2,
                  background: n.id === activeNoteId ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderLeft: `2px solid ${n.id === activeNoteId ? t.accent : 'transparent'}`,
                  transition: 'all 0.13s', position: 'relative',
                }}
                className="group"
                onMouseEnter={e => { if (n.id !== activeNoteId) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (n.id !== activeNoteId) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 500 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {n.dirty && <span style={{ color: t.accent, fontSize: 7, flexShrink: 0 }}>●</span>}
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
                      <span key={tag} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, background: `rgba(${rgb},0.12)`, color: t.accent }}>{tag}</span>
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

      {/* Mobile note list — bottom sheet */}
      <AnimatePresence>
        {mob.isMobile && showMobileSidebar && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={() => setShowMobileSidebar(false)}
              style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(5px)' }}/>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:380,damping:30}}
              style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:201,
                background: t.mode==='dark'?'rgba(12,12,22,0.98)':'rgba(248,248,255,0.98)',
                backdropFilter:'blur(24px)', borderRadius:'20px 20px 0 0',
                border:'1px solid rgba(255,255,255,0.1)', borderBottom:'none',
                padding:'8px 0 40px', maxHeight:'80vh', display:'flex', flexDirection:'column' }}>
              <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.2)', margin:'0 auto 12px' }}/>
              <div style={{ padding:'0 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontWeight:800, fontSize:16 }}>All Notes <span style={{ fontSize:12, opacity:0.4, fontWeight:500 }}>({notes.length})</span></span>
                <button onClick={()=>{addNote();setShowMobileSidebar(false)}}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:t.accent, border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                  <Plus size={15}/> New
                </button>
              </div>
              {/* Search */}
              <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  placeholder="Search notes…"
                  style={{ width:'100%', padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:14, color:'inherit' }}/>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
                {notes.filter(n => searchQuery ? (n.title+n.content).toLowerCase().includes(searchQuery.toLowerCase()) : true)
                  .sort((a,b) => new Date(b.updated).getTime()-new Date(a.updated).getTime())
                  .map(n => (
                  <button key={n.id} onClick={()=>{setNote(n.id);setShowMobileSidebar(false)}}
                    style={{ width:'100%', textAlign:'left', padding:'13px 14px', borderRadius:14, cursor:'pointer', marginBottom:6,
                      background: n.id===activeNoteId?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.04)',
                      border:`1px solid ${n.id===activeNoteId?`rgba(${rgb},0.3)`:'rgba(255,255,255,0.07)'}`,
                      display:'flex', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:n.id===activeNoteId?700:600, color:n.id===activeNoteId?t.accent:'inherit', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {n.pinned && '📌 '}{n.title||'Untitled'}
                      </div>
                      <div style={{ fontSize:12, opacity:0.45, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {n.content.replace(/[#*`]/g,'').slice(0,60)}
                      </div>
                      {n.tags.length>0 && <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                        {n.tags.slice(0,3).map(tag=><span key={tag} style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:`rgba(${rgb},0.12)`, color:t.accent }}>#{tag}</span>)}
                      </div>}
                    </div>
                  </button>
                ))}
                {notes.length===0 && <div style={{ opacity:0.35, textAlign:'center', padding:'30px 0', fontSize:14 }}>No notes yet</div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    {/* ── MAIN PANEL ── */}
      {active ? (
        <div className="flex-1 flex flex-col gap-2" style={{ minHeight: 0, overflow: 'hidden' }}>

          {/* Header bar */}
          <Glass className="flex items-center gap-2 px-3 py-2 shrink-0">
            <input
              className="flex-1 bg-transparent outline-none font-semibold"
              style={{ fontSize: 14, minWidth: 0 }}
              value={active.title}
              onChange={e => updateNote(active.id, { title: e.target.value })}
              placeholder="Titel..."
            />
            <div className="flex gap-0.5 items-center shrink-0">
              {/* View mode */}
              {(['edit', 'split', 'preview'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)} title={m}
                  style={{
                    padding: '4px 8px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: mode === m ? `rgba(${rgb},0.18)` : 'transparent',
                    color: mode === m ? t.accent : 'inherit', transition: 'all 0.15s',
                  }}>
                  {m === 'edit' ? <Edit3 size={13} /> : m === 'preview' ? <Eye size={13} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>SPLIT</span>}
                </button>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              {[
                { icon: RotateCcw, tip: 'Undo (Ctrl+Z)', action: handleUndo },
                { icon: RotateCcw, tip: 'Redo (Ctrl+Y)', action: handleRedo, flip: true },
                { icon: Copy,      tip: 'Kopieren',      action: () => navigator.clipboard.writeText(draftContent) },
                { icon: Download,  tip: 'Download .md',  action: saveAsFile },
                { icon: Save,      tip: 'Speichern (Ctrl+S)', action: saveActiveNow, accent: draftDirty },
              ].map(({ icon: Icon, tip, action, flip, accent: useAccent }: any) => (
                <button key={tip} onClick={action} title={tip} style={{
                  padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: useAccent ? t.accent : 'inherit',
                  transform: flip ? 'scaleX(-1)' : undefined, display: 'flex', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Icon size={13} />
                </button>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <button onClick={() => setFocusMode(!focusMode)} title="Focus Mode" style={{
                padding: '5px', borderRadius: 7, border: 'none', cursor: 'pointer',
                background: focusMode ? `rgba(${rgb},0.15)` : 'transparent',
                color: focusMode ? t.accent : 'inherit', transition: 'all 0.15s', display: 'flex',
              }}>
                {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
          </Glass>

          {/* Workflow strip */}
          <Glass className="shrink-0" style={{ padding: '7px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Words', val: noteStats.words },
                { label: 'Read', val: `${noteStats.readMins}m` },
                { label: 'Links', val: noteStats.links },
                { label: 'Tasks', val: noteStats.tasks },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <strong style={{ fontWeight: 800 }}>{s.val}</strong> <span style={{ opacity: 0.6 }}>{s.label}</span>
                </span>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => insertWorkflowTemplate('daily')} style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid rgba(${rgb},0.3)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Daily</button>
                <button onClick={() => insertWorkflowTemplate('meeting')} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Meeting</button>
                <button onClick={() => insertWorkflowTemplate('project')} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Project</button>
              </div>
            </div>
          </Glass>

          {/* Formatting toolbar */}
          {(mode === 'edit' || mode === 'split') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 4px', flexWrap: 'wrap', opacity: 0.9 }}>
              <FmtBtn icon={Heading}      tooltip="H2"           action={() => insertFormat('\n## ', '', 'Überschrift')} />
              <FmtBtn icon={Bold}         tooltip="Fett (Ctrl+B)" action={() => insertFormat('**', '**', 'fett')} />
              <FmtBtn icon={Italic}       tooltip="Kursiv (Ctrl+I)" action={() => insertFormat('*', '*', 'kursiv')} />
              <FmtBtn icon={Strikethrough} tooltip="Durchgestrichen" action={() => insertFormat('~~', '~~', 'text')} />
              <FmtBtn icon={Code}         tooltip="Inline Code"  action={() => insertFormat('`', '`', 'code')} />
              <FmtBtn icon={Link}         tooltip="Link (Ctrl+K)" action={() => insertFormat('[', '](url)', 'Text')} />
              <FmtBtn icon={Quote}        tooltip="Zitat"        action={() => insertFormat('\n> ', '', 'Zitat')} />
              <FmtBtn icon={List}         tooltip="Liste"        action={() => insertFormat('\n- ', '', 'Eintrag')} />
              <FmtBtn icon={ListOrdered}  tooltip="Num. Liste"   action={() => insertFormat('\n1. ', '', 'Eintrag')} />
              <FmtBtn icon={Table}        tooltip="Tabelle"      action={() => insertFormat('\n| Kopf | Kopf |\n| --- | --- |\n| Zelle | Zelle |\n')} />
              <FmtBtn icon={Minus}        tooltip="Trennlinie"   action={() => insertFormat('\n---\n', '')} />

              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* ✦ Magic Button */}
              <div style={{ position: 'relative' }}>
                <button
                  ref={magicBtnRef}
                  onClick={handleMagicOpen}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: `1px solid ${t.accent}${showMagic ? '60' : '30'}`,
                    background: showMagic ? `linear-gradient(135deg, ${t.accent}30, ${t.accent2}30)` : `linear-gradient(135deg, ${t.accent}18, ${t.accent2}18)`,
                    color: t.accent, cursor: 'pointer', fontSize: 11, fontWeight: 800,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    display: 'flex', alignItems: 'center', gap: 5,
                    boxShadow: showMagic ? `0 0 16px ${t.accent}28` : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Wand2 size={12} style={{ transform: showMagic ? 'rotate(12deg) scale(1.15)' : 'none', transition: 'transform 0.2s' }} />
                  Magic
                </button>
              </div>

              <div style={{ flex: 1 }} />

              {/* Tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={10} style={{ opacity: 0.35 }} />
                {active.tags.map(tag => (
                  <span key={tag} onClick={() => updateNote(active.id, { tags: active.tags.filter(t => t !== tag) })}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
                      background: `rgba(${rgb},0.12)`, color: t.accent, transition: 'opacity 0.15s',
                    }}
                    title="Klicken zum Entfernen"
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.6')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    {tag} ×
                  </span>
                ))}
                {editingTags ? (
                  <input
                    autoFocus value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newTag.trim()) {
                        if (!active.tags.includes(newTag.trim())) updateNote(active.id, { tags: [...active.tags, newTag.trim()] })
                        setNewTag(''); setEditingTags(false)
                      }
                      if (e.key === 'Escape') { setEditingTags(false); setNewTag('') }
                    }}
                    onBlur={() => { setEditingTags(false); setNewTag('') }}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, width: 70,
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none', color: 'inherit',
                    }}
                    placeholder="tag..."
                  />
                ) : (
                  <button onClick={() => setEditingTags(true)}
                    style={{ fontSize: 10, opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', transition: 'opacity 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                  >+ Tag</button>
                )}
              </div>
            </div>
          )}

          {/* ── EDITOR / PREVIEW ── */}
          <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, overflow: 'hidden' }}>

            {/* Editor */}
            {(mode === 'edit' || mode === 'split') && (
              <Glass className="flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }}>
                {t.editor.lineNumbers ? (
                  <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div style={{
                      flexShrink: 0, paddingTop: 20, paddingBottom: 20, paddingLeft: 10, paddingRight: 6,
                      textAlign: 'right', userSelect: 'none',
                      fontSize: t.notes.fontSize - 1,
                      lineHeight: `${t.notes.lineHeight * t.notes.fontSize}px`,
                      fontFamily: "'Fira Code', monospace",
                      opacity: 0.18, width: 36, overflowY: 'hidden',
                    }}>
                      <pre
                        ref={lineNumbersRef}
                        style={{
                          margin: 0,
                          whiteSpace: 'pre',
                          fontFamily: 'inherit',
                          fontSize: 'inherit',
                          lineHeight: 'inherit',
                          willChange: 'transform',
                        }}
                      >
                        {lineNumbersText}
                      </pre>
                    </div>
                    <textarea
                      ref={editorRef}
                      style={{
                        flex: 1, background: 'transparent', resize: 'none', outline: 'none',
                        padding: '20px 16px 20px 4px',
                        overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
                        fontSize: t.notes.fontSize,
                        fontFamily: `"${t.notes.fontFamily}", ui-monospace, Menlo, monospace`,
                        lineHeight: t.notes.lineHeight,
                        tabSize: t.editor.tabSize,
                        whiteSpace: t.editor.wordWrap ? 'pre-wrap' : 'pre',
                        overflowWrap: t.editor.wordWrap ? 'break-word' : 'normal',
                        color: 'inherit', border: 'none',
                      }}
                      value={draftContent}
                      onChange={e => handleChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onScroll={(e) => syncLineNumberScroll(e.currentTarget)}
                    />
                  </div>
                ) : (
                  <textarea
                    ref={editorRef}
                    style={{
                      flex: 1, background: 'transparent', resize: 'none', outline: 'none',
                      padding: 20, overflowY: 'auto', overflowX: 'hidden', minHeight: 0,
                      fontSize: t.notes.fontSize,
                      fontFamily: `"${t.notes.fontFamily}", ui-monospace, Menlo, monospace`,
                      lineHeight: t.notes.lineHeight,
                      tabSize: t.editor.tabSize,
                      whiteSpace: t.editor.wordWrap ? 'pre-wrap' : 'pre',
                      overflowWrap: t.editor.wordWrap ? 'break-word' : 'normal',
                      color: 'inherit', border: 'none',
                    }}
                    value={draftContent}
                    onChange={e => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                )}
              </Glass>
            )}

            {/* Preview — always has a visible scrollbar */}
            {(mode === 'preview' || mode === 'split') && (
              <Glass className="flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'hidden' }} glow>
                {/* The scrollable div is direct child of the Glass content wrapper (which is flex-col) */}
                <div style={{
                  flex: 1, overflowY: 'scroll', overflowX: 'hidden',
                  padding: 20, minHeight: 0,
                }}>
                  <NexusMarkdown content={deferredDraftContent} />
                </div>
              </Glass>
            )}
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '2px 8px', fontSize: 10, opacity: 0.38, flexShrink: 0 }}>
            <span>{stats.words} W</span>
            <span>{stats.chars} Z</span>
            <span>{stats.lines} L</span>
            <div style={{ flex: 1 }} />
            {draftDirty && <span style={{ color: t.accent, opacity: 1 }}>● Ungespeichert</span>}
            {lastSavedAt && !draftDirty && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={9} /> {lastSavedAt}
              </span>
            )}
            <span>{fmtDt(new Date(active.created))}</span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 32 }}>📝</div>
          <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Keine Notiz ausgewählt</div>
          <button onClick={addNote} style={{
            marginTop: 8, padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: `rgba(${rgb},0.2)`, color: t.accent, fontSize: 12, fontWeight: 700,
          }}>+ Neue Notiz</button>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }} onClick={() => setShowSettings(false)} />
            <motion.div
              initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'relative', zIndex: 1, width: 380, maxHeight: '80vh', overflowY: 'auto',
                background: t.mode === 'dark' ? 'rgba(14,14,26,0.97)' : 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(24px)', borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.7)', padding: 22,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>📝 Notes Settings</span>
                <button onClick={() => setShowSettings(false)} style={{
                  padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: 'inherit', display: 'flex',
                }}><X size={14} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Schriftgröße', key: 'fontSize', type: 'number', min: 10, max: 24, step: 1 },
                  { label: 'Zeilenhöhe', key: 'lineHeight', type: 'number', min: 1, max: 3, step: 0.1 },
                  { label: 'Tab Size', key: 'tabSize', type: 'number', min: 2, max: 8, step: 2 },
                ].map(({ label, key, min, max, step }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.8 }}>{label}</span>
                    <input type="number" min={min} max={max} step={step}
                      value={(localSettings as any)[key]}
                      onChange={e => setLocalSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                      style={{
                        width: 60, padding: '4px 8px', borderRadius: 7, fontSize: 12, textAlign: 'right',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        outline: 'none', color: 'inherit',
                      }}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ opacity: 0.8 }}>Schriftart</span>
                  <select value={localSettings.fontFamily} onChange={e => setLocalSettings(s => ({ ...s, fontFamily: e.target.value }))}
                    style={{
                      padding: '4px 8px', borderRadius: 7, fontSize: 11,
                      background: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
                      border: '1px solid rgba(255,255,255,0.1)', outline: 'none', color: 'inherit',
                    }}>
                    {['Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Monaco', 'Inter', 'system-ui'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                {[
                  { label: 'Wortumbruch', key: 'wordWrap' },
                  { label: 'Zeilennummern', key: 'lineNumbers' },
                  { label: 'Autosave', key: 'autosave' },
                ].map(({ label, key }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ opacity: 0.8 }}>{label}</span>
                    <input type="checkbox" checked={(localSettings as any)[key]}
                      onChange={e => setLocalSettings(s => ({ ...s, [key]: e.target.checked }))}
                      style={{ cursor: 'pointer', accentColor: t.accent, width: 15, height: 15 }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleApplySettings} style={{
                marginTop: 16, width: '100%', padding: '10px', borderRadius: 12, border: 'none',
                cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#fff',
                background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                boxShadow: `0 4px 14px ${t.accent}44`,
                transition: 'all 0.15s',
              }}>
                ✓ Anwenden
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          ✦ MAGIC ELEMENT BUILDER MODAL
          Rendered at top level — always above everything
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showMagic && (
          <MagicElementModal
            accent={t.accent}
            accent2={t.accent2}
            onClose={() => setShowMagic(false)}
            onInsert={(snippet) => {
              insertFormat(snippet)
              setShowMagic(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
