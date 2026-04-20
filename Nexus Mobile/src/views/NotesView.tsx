import { useMobile } from '../lib/useMobile'
import React, { useState, useMemo, useEffect, useRef, useCallback, useDeferredValue } from 'react'
import {
  Plus, Save, Copy, RotateCcw, Search,
  Bold, Italic, Heading, List, ListOrdered, Quote, Code, Link,
  Download, Clock, Hash, Eye, Edit3, Minus, Strikethrough,
  Maximize2, Minimize2, Wand2, Bell, Zap, Calendar, CreditCard,
  ChevronDown, Table, FileText, MoreHorizontal, ListTree, ArrowUpRight, CheckSquare2, AlarmClock, Orbit
} from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Glass } from '../components/Glass'
import { InteractiveIconButton } from '../components/render/InteractiveIconButton'
import { InteractiveActionButton } from '../components/render/InteractiveActionButton'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp } from '../store/appStore'
import { useCanvas } from '../store/canvasStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb, fmtDt } from '../lib/utils'
import { shallow } from 'zustand/shallow'
import { useNotesAnalysis } from './notes/useNotesAnalysis'
import {
  buildNoteKnowledgeGraph,
  extractHeadings,
  rankNotesForQuery,
  resolveRelatedNotes,
} from '@nexus/core/notes/knowledge'

// ─────────────────────────────────────────────────────────────────
//  MAGIC ELEMENT RENDERERS
// ─────────────────────────────────────────────────────────────────

import { MagicElementModal, NexusCodeBlock, NexusInlineCode } from './notes/NotesMagicKit'
import { NotesSidebarPanels } from './notes/NotesSidebarPanels'
import { NotesSettingsModal, type NotesLocalSettings } from './notes/NotesSettingsModal'
const NOTE_COMMIT_DEBOUNCE_MS = 4_200
const NOTE_PREVIEW_DEBOUNCE_MS = 220
const NOTE_UNDO_SNAPSHOT_INTERVAL_MS = 260
const MAX_RENDERED_LINE_NUMBERS = 4_000
const NOTES_IMPORT_INPUT_ID = 'nx-mobile-notes-import-markdown'
const runIdle = (task: () => void, timeoutMs = 320) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(task, { timeout: timeoutMs })
    return
  }
  setTimeout(task, 0)
}
export function NotesView() {
  const { notes, activeNoteId, addNote, updateNote, delNote, setNote, saveNote, addTask, updateTask, addRem } = useApp((s) => ({
    notes: s.notes,
    activeNoteId: s.activeNoteId,
    addNote: s.addNote,
    updateNote: s.updateNote,
    delNote: s.delNote,
    setNote: s.setNote,
    saveNote: s.saveNote,
    addTask: s.addTask,
    updateTask: s.updateTask,
    addRem: s.addRem,
  }), shallow)
  const { addCanvas } = useCanvas((s) => ({
    addCanvas: s.addCanvas,
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
  const [showQuickSwitch, setShowQuickSwitch] = useState(false)
  const [quickSwitchQuery, setQuickSwitchQuery] = useState('')
  const [quickSwitchCursor, setQuickSwitchCursor] = useState(0)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const deferredQuickSwitchQuery = useDeferredValue(quickSwitchQuery)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const quickSwitchInputRef = useRef<HTMLInputElement>(null)
  const lineNumbersRef = useRef<HTMLPreElement>(null)
  // Save selection before magic menu opens so we can restore it on insert
  const savedSel = useRef<{ start: number; end: number } | null>(null)
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  const [mobileTopMenuOpen, setMobileTopMenuOpen] = useState(false)
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

  const [localSettings, setLocalSettings] = useState<NotesLocalSettings>({
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

  const importMarkdownFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.currentTarget.value = ''
      if (!file) return
      const rawContent = await file.text()
      const headingMatch = rawContent.match(/^#\s+(.+?)\s*$/m)
      const fallbackTitle = file.name.replace(/\.md$/i, '') || 'Imported Note'
      const title = headingMatch?.[1]?.trim() || fallbackTitle
      addNote()
      const createdId = useApp.getState().activeNoteId
      if (!createdId) return
      updateNote(createdId, {
        title,
        content: rawContent,
        tags: ['imported'],
      })
      saveNote(createdId)
      setNote(createdId)
      setLastSavedAt(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
    },
    [addNote, saveNote, setNote, updateNote],
  )

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

  const searchRanked = useMemo(
    () => rankNotesForQuery(notes, deferredSearchQuery, 320).map((entry) => entry.note),
    [notes, deferredSearchQuery],
  )

  const filteredNotes = useMemo(() => {
    let result = deferredSearchQuery ? searchRanked : notes
    if (tagFilter) result = result.filter(n => n.tags.includes(tagFilter))
    result = [...result].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      if (sortBy === 'created') return new Date(b.created).getTime() - new Date(a.created).getTime()
      return new Date(b.updated).getTime() - new Date(a.updated).getTime()
    })
    return [...result.filter(n => n.pinned), ...result.filter(n => !n.pinned)]
  }, [deferredSearchQuery, notes, searchRanked, sortBy, tagFilter])

  const knowledgeGraph = useMemo(() => buildNoteKnowledgeGraph(notes), [notes])
  const activeHeadings = useMemo(() => extractHeadings(draftContent, 4), [draftContent])
  const activeIncoming = useMemo(
    () => (active ? knowledgeGraph.incomingByNoteId.get(active.id) || [] : []),
    [knowledgeGraph, active?.id],
  )
  const activeOutgoing = useMemo(
    () => (active ? (knowledgeGraph.outgoingByNoteId.get(active.id) || []).filter((edge) => Boolean(edge.targetId)) : []),
    [knowledgeGraph, active?.id],
  )
  const activeUnresolved = useMemo(
    () => (active ? knowledgeGraph.unresolvedByNoteId.get(active.id) || [] : []),
    [knowledgeGraph, active?.id],
  )
  const activeRelatedNotes = useMemo(
    () => (active ? resolveRelatedNotes(active.id, knowledgeGraph, 6) : []),
    [knowledgeGraph, active?.id],
  )
  const quickSwitchResults = useMemo(
    () => rankNotesForQuery(notes, deferredQuickSwitchQuery, 12),
    [deferredQuickSwitchQuery, notes],
  )

  const allTags = useMemo(() => {
    const set = new Set<string>(); notes.forEach(n => n.tags.forEach(t => set.add(t))); return Array.from(set)
  }, [notes])

  const openQuickSwitch = useCallback(() => {
    setShowQuickSwitch(true)
    setQuickSwitchQuery('')
    setQuickSwitchCursor(0)
    requestAnimationFrame(() => {
      quickSwitchInputRef.current?.focus()
      quickSwitchInputRef.current?.select()
    })
  }, [])

  const closeQuickSwitch = useCallback(() => {
    setShowQuickSwitch(false)
    setQuickSwitchQuery('')
    setQuickSwitchCursor(0)
  }, [])

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key !== 'p') return
      event.preventDefault()
      openQuickSwitch()
    }
    window.addEventListener('keydown', onGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', onGlobalKeyDown)
    }
  }, [openQuickSwitch])

  useEffect(() => {
    if (!showQuickSwitch) return
    setQuickSwitchCursor((cursor) => {
      if (quickSwitchResults.length === 0) return 0
      return Math.min(cursor, quickSwitchResults.length - 1)
    })
  }, [quickSwitchResults.length, showQuickSwitch])

  const jumpToHeading = useCallback((index: number) => {
    if (mode === 'preview') {
      setMode('split')
    }
    requestAnimationFrame(() => {
      const textarea = editorRef.current
      if (!textarea) return
      textarea.focus()
      textarea.selectionStart = index
      textarea.selectionEnd = index
      const contentBefore = draftContentRef.current.slice(0, index)
      const line = (contentBefore.match(/\n/g)?.length ?? 0) + 1
      const lineHeightPx = t.notes.fontSize * t.notes.lineHeight
      textarea.scrollTop = Math.max(0, (line - 4) * lineHeightPx)
      syncLineNumberScroll(textarea)
    })
  }, [mode, syncLineNumberScroll, t.notes.fontSize, t.notes.lineHeight])

  const insertWikilink = useCallback((title: string) => {
    if (!title) return
    insertFormat(`[[${title}]]`, '', '')
  }, [insertFormat])

  const convertNoteToTask = useCallback(() => {
    if (!active) return
    const state = useApp.getState()
    const beforeTaskIds = new Set(state.tasks.map((task) => task.id))
    const summary = draftContentRef.current
      .replace(/[#*`\[\]()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220)
    addTask(active.title || 'Notiz Aufgabe', 'todo', summary, 'mid')
    const afterState = useApp.getState()
    const created = afterState.tasks.find((task) => !beforeTaskIds.has(task.id))
    if (!created) return
    updateTask(created.id, {
      linkedNoteId: active.id,
      notes: `Erstellt aus Notiz: ${active.title}`,
    })
  }, [active, addTask, updateTask])

  const convertNoteToReminder = useCallback(() => {
    if (!active) return
    const reminderAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    addRem({
      title: active.title || 'Note Reminder',
      msg: draftContentRef.current.slice(0, 220),
      datetime: reminderAt,
      repeat: 'none',
      linkedNoteId: active.id,
    })
  }, [active, addRem])

  const convertNoteToCanvas = useCallback(() => {
    if (!active) return
    const beforeCanvases = new Set(useCanvas.getState().canvases.map((canvas) => canvas.id))
    addCanvas(`${active.title || 'Notiz'} Canvas`)
    const stateAfterCanvas = useCanvas.getState()
    const createdCanvas = stateAfterCanvas.canvases.find((canvas) => !beforeCanvases.has(canvas.id))
    if (!createdCanvas) return
    const captureNewNode = (type: 'note' | 'markdown', x: number, y: number) => {
      const beforeNodeIds = new Set((useCanvas.getState().getActiveCanvas()?.nodes || []).map((node) => node.id))
      useCanvas.getState().addNode(type, x, y)
      const createdNode = (useCanvas.getState().getActiveCanvas()?.nodes || []).find((node) => !beforeNodeIds.has(node.id))
      return createdNode?.id || null
    }
    const noteNodeId = captureNewNode('note', 140, 120)
    if (noteNodeId) {
      useCanvas.getState().updateNode(noteNodeId, {
        title: active.title || 'Notiz',
        linkedNoteId: active.id,
        content: draftContentRef.current.slice(0, 1200),
      })
    }
    const markdownNodeId = captureNewNode('markdown', 560, 120)
    if (markdownNodeId) {
      useCanvas.getState().updateNode(markdownNodeId, {
        title: `Kontext: ${active.title || 'Notiz'}`,
        linkedNoteId: active.id,
        content: draftContentRef.current,
      })
    }
  }, [active, addCanvas])

  useEffect(() => {
    if (!showQuickSwitch) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeQuickSwitch()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setQuickSwitchCursor((cursor) => {
          if (quickSwitchResults.length === 0) return 0
          return (cursor + 1) % quickSwitchResults.length
        })
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setQuickSwitchCursor((cursor) => {
          if (quickSwitchResults.length === 0) return 0
          return (cursor - 1 + quickSwitchResults.length) % quickSwitchResults.length
        })
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const selected = quickSwitchResults[quickSwitchCursor]
        if (!selected) return
        setNote(selected.note.id)
        closeQuickSwitch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeQuickSwitch, quickSwitchCursor, quickSwitchResults, setNote, showQuickSwitch])

  const handleApplySettings = () => {
    t.setNotes({ fontSize: localSettings.fontSize, fontFamily: localSettings.fontFamily, lineHeight: localSettings.lineHeight, mode: localSettings.mode })
    t.setEditor({ autosave: localSettings.autosave, autosaveInterval: localSettings.autosaveInterval, wordWrap: localSettings.wordWrap, lineNumbers: localSettings.lineNumbers, minimap: localSettings.minimap, cursorAnimation: localSettings.cursorAnimation, tabSize: localSettings.tabSize })
    t.setVisual({ compactMode: localSettings.compactMode, panelRadius: localSettings.panelRadius, shadowDepth: localSettings.shadowDepth, spacingDensity: localSettings.spacingDensity })
    setShowSettings(false)
  }

  // Small formatting button
  const FmtBtn = ({ icon: Icon, tooltip, action }: { icon: any; tooltip: string; action: () => void }) => (
    <InteractiveIconButton
      motionId={`mobile-notes-fmt-${tooltip.replace(/\s+/g, '-').toLowerCase()}`}
      onClick={action}
      title={tooltip}
      idleOpacity={0.72}
      radius={7}
      style={{
        padding: '5px',
        color: t.accent,
      }}
    >
      <Icon size={14} />
    </InteractiveIconButton>
  )

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

  const lineNumbersText = active ? analysis.lineNumbersText : '1'

  const insertWorkflowTemplate = useCallback((kind: 'daily' | 'meeting' | 'project') => {
    if (!active) return
    const templates: Record<typeof kind, string> = {
      daily: `\n## Daily Focus\n- Top 3 Prioritäten\n- Blocker\n- Heute erledigt\n\n## Review\n- Was lief gut?\n- Was verbessern?\n`,
      meeting: `\n## Meeting\n- Ziel\n- Teilnehmer\n- Entscheidungen\n- Action Items\n`,
      project: `\n## Projekt Plan\n- Scope\n- Milestones\n- Risiken\n- Nächste Schritte\n\n## Tasks\n- [ ] \n`,
    }
    handleChange(`${draftContentRef.current}${templates[kind]}`)
  }, [active, handleChange])

  return (
    <div className="flex h-full gap-3 p-3 relative" style={{ minHeight: 0, flexDirection: mob.isMobile ? 'column' : 'row', gap: mob.isMobile ? 0 : 12, padding: mob.isMobile ? 0 : 12 }}>

      {/* Mobile top bar */}
      {mob.isMobile && !focusMode && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.1)', flexShrink:0 }}>
          <InteractiveActionButton
            onClick={()=>setShowMobileSidebar(true)}
            motionId="mobile-notes-open-sidebar"
            areaHint={52}
            radius={12}
            style={{ width:42, height:42, borderRadius:12, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.2)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center' }}
          >
            <FileText size={20}/>
          </InteractiveActionButton>
          <div style={{ flex:1, fontSize:15, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:t.accent }}>
            {active ? (active.title || 'Untitled') : 'Notes'}
          </div>
          {active && (
            <div style={{ display:'flex', gap:6 }}>
              {(['edit','preview'] as const).map(m => (
                <InteractiveActionButton key={m} onClick={()=>setMode(m)}
                  motionId={`mobile-notes-top-mode-${m}`}
                  selected={mode===m}
                  areaHint={58}
                  radius={10}
                  style={{ padding:'8px 12px', borderRadius:10, border:`1px solid ${mode===m?t.accent:'rgba(255,255,255,0.1)'}`, background:mode===m?`rgba(${rgb},0.15)`:'transparent', cursor:'pointer', color:mode===m?t.accent:'inherit', fontSize:12, fontWeight:700 }}>
                  {m==='edit'?'✏️':'👁'}
                </InteractiveActionButton>
              ))}
              <InteractiveActionButton
                onClick={() => active && saveActiveNow()}
                motionId="mobile-notes-top-save"
                areaHint={52}
                radius={10}
                style={{ width:40, height:40, borderRadius:10, background:t.accent, border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}
              >
                <Save size={16}/>
              </InteractiveActionButton>
            </div>
          )}
          {!active && (
            <InteractiveActionButton
              onClick={addNote}
              motionId="mobile-notes-top-add"
              areaHint={86}
              radius={12}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', borderRadius:12, background:t.accent, border:'none', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}
            >
              <Plus size={16}/> New
            </InteractiveActionButton>
          )}
          <div style={{ position: 'relative' }}>
            <InteractiveActionButton
              onClick={() => setMobileTopMenuOpen((open) => !open)}
              motionId="mobile-notes-top-menu"
              selected={mobileTopMenuOpen}
              areaHint={52}
              radius={10}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: mobileTopMenuOpen ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                color: mobileTopMenuOpen ? t.accent : 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Mehr"
            >
              <MoreHorizontal size={16} />
            </InteractiveActionButton>
            {mobileTopMenuOpen ? (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  zIndex: 120,
                  minWidth: 180,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(17,20,31,0.96)',
                  backdropFilter: 'blur(12px)',
                  padding: 6,
                  boxShadow: '0 16px 34px rgba(0,0,0,0.35)',
                }}
              >
                <InteractiveActionButton
                  onClick={() => {
                    addNote()
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-add"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <Plus size={12} /> Neue Notiz
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => {
                    document.getElementById(NOTES_IMPORT_INPUT_ID)?.click()
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-import"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <Download size={12} /> Markdown importieren
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => {
                    openQuickSwitch()
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-switch"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <Search size={12} /> Quick Switch
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => {
                    setShowSettings(true)
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-settings"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <Edit3 size={12} /> Einstellungen
                </InteractiveActionButton>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 4px' }} />
                <InteractiveActionButton
                  onClick={() => {
                    convertNoteToTask()
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-task"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <CheckSquare2 size={12} /> Als Task erstellen
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => {
                    convertNoteToReminder()
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-reminder"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <AlarmClock size={12} /> Als Reminder planen
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => {
                    convertNoteToCanvas()
                    setMobileTopMenuOpen(false)
                  }}
                  motionId="mobile-notes-menu-canvas"
                  areaHint={78}
                  radius={9}
                  style={{ width: '100%', border: 'none', borderRadius: 9, background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', fontSize: 12, fontWeight: 650 }}
                >
                  <Orbit size={12} /> In Canvas abbilden
                </InteractiveActionButton>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <NotesSidebarPanels
        isMobile={mob.isMobile}
        focusMode={focusMode}
        showMobileSidebar={showMobileSidebar}
        setShowMobileSidebar={setShowMobileSidebar}
        notes={notes}
        filteredNotes={filteredNotes}
        allTags={allTags}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        activeNoteId={activeNoteId}
        accent={t.accent}
        rgb={rgb}
        mode={t.mode}
        addNote={addNote}
        setNote={setNote}
        updateNote={updateNote}
        delNote={delNote}
        onOpenSettings={() => setShowSettings(true)}
        onImportMarkdown={() => document.getElementById(NOTES_IMPORT_INPUT_ID)?.click()}
      />

    {/* ── MAIN PANEL ── */}
      {active ? (
        <div className="flex-1 flex flex-col gap-2" style={{ minHeight: 0, overflow: 'visible' }}>

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
                <InteractiveActionButton key={m} onClick={() => setMode(m)} title={m}
                  motionId={`mobile-notes-mode-${m}`}
                  selected={mode === m}
                  areaHint={54}
                  radius={7}
                  style={{
                    padding: '4px 8px', borderRadius: 7, fontSize: 11, fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: mode === m ? `rgba(${rgb},0.18)` : 'transparent',
                    color: mode === m ? t.accent : 'inherit', transition: 'all 0.15s',
                  }}>
                  {m === 'edit' ? <Edit3 size={13} /> : m === 'preview' ? <Eye size={13} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>SPLIT</span>}
                </InteractiveActionButton>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              {[
                { icon: RotateCcw, tip: 'Undo (Ctrl+Z)', action: handleUndo },
                { icon: RotateCcw, tip: 'Redo (Ctrl+Y)', action: handleRedo, flip: true },
                { icon: Search,    tip: 'Quick Switch (Ctrl/Cmd+P)', action: openQuickSwitch },
                { icon: Copy,      tip: 'Kopieren',      action: () => navigator.clipboard.writeText(draftContent) },
                { icon: Download,  tip: 'Download .md',  action: saveAsFile },
                { icon: Save,      tip: 'Speichern (Ctrl+S)', action: saveActiveNow, accent: draftDirty },
              ].map(({ icon: Icon, tip, action, flip, accent: useAccent }: any) => (
                <InteractiveActionButton
                  key={tip}
                  onClick={action}
                  title={tip}
                  motionId={`mobile-notes-top-action-${tip.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
                  selected={Boolean(useAccent)}
                  areaHint={44}
                  radius={7}
                  style={{
                  padding: '5px', borderRadius: 7, border: 'none',
                  background: 'transparent', color: useAccent ? t.accent : 'inherit',
                  display: 'flex',
                }}>
                  <Icon size={13} style={{ transform: flip ? 'scaleX(-1)' : undefined }} />
                </InteractiveActionButton>
              ))}
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
              <InteractiveActionButton onClick={() => setFocusMode(!focusMode)} title="Focus Mode"
                motionId="mobile-notes-focus-mode"
                selected={focusMode}
                areaHint={46}
                radius={7}
                style={{
                padding: '5px', borderRadius: 7, border: 'none',
                background: focusMode ? `rgba(${rgb},0.15)` : 'transparent',
                color: focusMode ? t.accent : 'inherit', display: 'flex',
              }}>
                {focusMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </InteractiveActionButton>
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
              ].map((entry) => (
                <span key={entry.label} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <strong style={{ fontWeight: 800 }}>{entry.val}</strong> <span style={{ opacity: 0.6 }}>{entry.label}</span>
                </span>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <InteractiveActionButton
                  onClick={openQuickSwitch}
                  motionId="mobile-notes-workflow-switch"
                  areaHint={62}
                  radius={8}
                  style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid rgba(${rgb},0.3)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  <ArrowUpRight size={11} /> Jump
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={() => insertWorkflowTemplate('daily')}
                  motionId="mobile-notes-workflow-daily"
                  areaHint={56}
                  radius={8}
                  style={{ padding: '4px 8px', borderRadius: 8, border: `1px solid rgba(${rgb},0.3)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >Daily</InteractiveActionButton>
                <InteractiveActionButton
                  onClick={convertNoteToTask}
                  motionId="mobile-notes-workflow-task"
                  areaHint={62}
                  radius={8}
                  style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  <CheckSquare2 size={11} /> Task
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={convertNoteToReminder}
                  motionId="mobile-notes-workflow-reminder"
                  areaHint={72}
                  radius={8}
                  style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  <AlarmClock size={11} /> Reminder
                </InteractiveActionButton>
                <InteractiveActionButton
                  onClick={convertNoteToCanvas}
                  motionId="mobile-notes-workflow-canvas"
                  areaHint={72}
                  radius={8}
                  style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  <Orbit size={11} /> Canvas
                </InteractiveActionButton>
              </div>
            </div>
            {(activeHeadings.length > 0 || activeOutgoing.length > 0 || activeIncoming.length > 0 || activeUnresolved.length > 0 || activeRelatedNotes.length > 0) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {activeHeadings.slice(0, 4).map((heading) => (
                  <InteractiveActionButton
                    key={heading.id}
                    onClick={() => jumpToHeading(heading.index)}
                    motionId={`mobile-notes-heading-${heading.id}`}
                    areaHint={68}
                    radius={999}
                    style={{ padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', fontSize: 10, cursor: 'pointer', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`Zu Abschnitt springen: ${heading.text}`}
                  >
                    <ListTree size={10} /> {heading.text}
                  </InteractiveActionButton>
                ))}
                {activeOutgoing.slice(0, 4).map((edge) => (
                  <InteractiveActionButton
                    key={`mobile-out-${edge.sourceId}-${edge.targetId}-${edge.targetTitle}`}
                    onClick={() => edge.targetId && setNote(edge.targetId)}
                    motionId={`mobile-notes-outgoing-${edge.targetId || edge.targetTitle}`}
                    areaHint={68}
                    radius={999}
                    style={{ padding: '3px 9px', borderRadius: 999, border: `1px solid rgba(${rgb},0.28)`, background: `rgba(${rgb},0.1)`, color: t.accent, fontSize: 10, cursor: 'pointer', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`Verlinkte Notiz öffnen: ${edge.targetTitle}`}
                  >
                    ↗ {edge.targetTitle}
                  </InteractiveActionButton>
                ))}
                {activeIncoming.slice(0, 4).map((edge) => (
                  <InteractiveActionButton
                    key={`mobile-in-${edge.sourceId}-${edge.targetTitle}`}
                    onClick={() => setNote(edge.sourceId)}
                    motionId={`mobile-notes-backlink-${edge.sourceId}`}
                    areaHint={68}
                    radius={999}
                    style={{ padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, cursor: 'pointer', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`Backlink öffnen: ${edge.sourceTitle}`}
                  >
                    ← {edge.sourceTitle}
                  </InteractiveActionButton>
                ))}
                {activeRelatedNotes.slice(0, 3).map((related) => (
                  <InteractiveActionButton
                    key={`mobile-rel-${related.id}`}
                    onClick={() => setNote(related.id)}
                    motionId={`mobile-notes-related-${related.id}`}
                    areaHint={68}
                    radius={999}
                    style={{ padding: '3px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', fontSize: 10, cursor: 'pointer', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`Verwandte Notiz öffnen: ${related.title}`}
                  >
                    ≈ {related.title}
                  </InteractiveActionButton>
                ))}
                {activeUnresolved.slice(0, 3).map((edge) => (
                  <InteractiveActionButton
                    key={`mobile-missing-${edge.targetTitle}`}
                    onClick={() => insertWikilink(edge.targetTitle)}
                    motionId={`mobile-notes-unresolved-${edge.targetTitle}`}
                    areaHint={68}
                    radius={999}
                    style={{ padding: '3px 9px', borderRadius: 999, border: '1px dashed rgba(255,159,10,0.45)', background: 'rgba(255,159,10,0.1)', color: '#FF9F0A', fontSize: 10, cursor: 'pointer', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={`Nicht aufgelöster Wikilink: ${edge.targetTitle}. Klicken um einzufügen.`}
                  >
                    ? {edge.targetTitle}
                  </InteractiveActionButton>
                ))}
              </div>
            )}
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
              <FmtBtn icon={Bell}         tooltip="Callout Block" action={() => insertFormat('\n```nexus-callout\ninfo | Hinweis\nKurzinfo oder Entscheidung notieren.\n```\n')} />
              <FmtBtn icon={Zap}          tooltip="Kanban Block" action={() => insertFormat('\n```nexus-kanban\nBacklog | Aufgabe sammeln\nDoing | Umsetzung\nReview | QA/Abnahme\nDone | Fertig\n```\n')} />
              <FmtBtn icon={Calendar}     tooltip="Timeline Block" action={() => insertFormat('\n```nexus-timeline\nHeute | Kickoff\nMorgen | Umsetzung\nDiese Woche | Review\n```\n')} />
              <FmtBtn icon={CreditCard}   tooltip="Card Block" action={() => insertFormat('\n```nexus-card\nhttps://images.unsplash.com/photo-1618005182384?w=600 | Titel | Kurze Beschreibung\n```\n')} />
              <FmtBtn icon={ChevronDown}  tooltip="Details/Toggle" action={() => insertFormat('\n<details>\n<summary>Mehr anzeigen</summary>\n\nDetails hier ergänzen...\n\n</details>\n')} />

              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

              {/* ✦ Magic Button */}
              <div style={{ position: 'relative' }}>
                <InteractiveActionButton
                  onClick={handleMagicOpen}
                  motionId="mobile-notes-open-magic"
                  selected={showMagic}
                  areaHint={78}
                  radius={8}
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
                </InteractiveActionButton>
              </div>

              <div style={{ flex: 1 }} />

              {/* Tags */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Hash size={10} style={{ opacity: 0.35 }} />
                {active.tags.map(tag => (
                  <InteractiveActionButton key={tag} onClick={() => updateNote(active.id, { tags: active.tags.filter(t => t !== tag) })}
                    motionId={`mobile-notes-remove-tag-${tag}`}
                    areaHint={46}
                    radius={20}
                    style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, cursor: 'pointer',
                      border: 'none',
                      background: `rgba(${rgb},0.12)`, color: t.accent, transition: 'opacity 0.15s',
                    }}
                    title="Klicken zum Entfernen"
                  >
                    {tag} ×
                  </InteractiveActionButton>
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
                  <InteractiveActionButton onClick={() => setEditingTags(true)}
                    motionId="mobile-notes-add-tag"
                    className="nx-icon-fade"
                    areaHint={40}
                    radius={14}
                    style={{ fontSize: 10, ['--nx-idle-opacity' as any]: 0.4, background: 'none', border: 'none', color: 'inherit' }}
                  >+ Tag</InteractiveActionButton>
                )}
              </div>
            </div>
          )}

          {/* ── EDITOR / PREVIEW ── */}
          <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, overflow: 'visible' }}>

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
              <Glass className="flex-1 flex flex-col" style={{ minHeight: 0, overflow: 'visible', background: `linear-gradient(150deg, rgba(${rgb},0.32), rgba(${hexToRgb(t.accent2)},0.2) 58%, rgba(255,255,255,0.03))` }} glow gradient>
                {/* The scrollable div is direct child of the Glass content wrapper (which is flex-col) */}
                <div style={{
                  flex: 1, overflowY: 'scroll', overflowX: 'hidden',
                  padding: 20, minHeight: 0,
                }}>
                  <NexusMarkdown content={deferredDraftContent} components={mdComponents} />
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
          <InteractiveActionButton onClick={addNote}
            motionId="mobile-notes-empty-add"
            areaHint={96}
            radius={20}
            style={{
            marginTop: 8, padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
            background: `rgba(${rgb},0.2)`, color: t.accent, fontSize: 12, fontWeight: 700,
          }}>+ Neue Notiz</InteractiveActionButton>
        </div>
      )}

      {showQuickSwitch ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2500,
            background: 'rgba(5,8,18,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '16px 14px 24px',
          }}
          onClick={closeQuickSwitch}
        >
          <Glass
            className="flex flex-col"
            style={{
              width: 'min(640px, 100%)',
              maxHeight: '72vh',
              overflow: 'hidden',
              borderRadius: 16,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                ref={quickSwitchInputRef}
                value={quickSwitchQuery}
                onChange={(event) => {
                  setQuickSwitchQuery(event.target.value)
                  setQuickSwitchCursor(0)
                }}
                placeholder="Quick Switch: Notiztitel, Tag oder Inhalt..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: `1px solid rgba(${rgb},0.28)`,
                  background: `rgba(${rgb},0.08)`,
                  color: 'inherit',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '58vh', padding: 8 }}>
              {quickSwitchResults.length > 0 ? quickSwitchResults.map((result, index) => (
                <InteractiveActionButton
                  key={result.note.id}
                  onMouseEnter={() => setQuickSwitchCursor(index)}
                  onClick={() => {
                    setNote(result.note.id)
                    closeQuickSwitch()
                  }}
                  motionId={`mobile-notes-quick-switch-row-${result.note.id}`}
                  selected={index === quickSwitchCursor}
                  areaHint={72}
                  radius={10}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    background: index === quickSwitchCursor ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.04)',
                    padding: '9px 10px',
                    marginBottom: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 3,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: index === quickSwitchCursor ? t.accent : 'inherit' }}>
                    {result.note.title || 'Untitled'}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.66, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {result.preview}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.52, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {result.reason}
                  </span>
                </InteractiveActionButton>
              )) : (
                <div style={{ fontSize: 12, opacity: 0.5, padding: '10px 4px' }}>
                  Keine passenden Notizen gefunden.
                </div>
              )}
            </div>
          </Glass>
        </div>
      ) : null}

      <NotesSettingsModal
        open={showSettings}
        mode={t.mode}
        accent={t.accent}
        accent2={t.accent2}
        localSettings={localSettings}
        setLocalSettings={setLocalSettings}
        onApply={handleApplySettings}
        onClose={() => setShowSettings(false)}
      />

      {/* ══════════════════════════════════════
          ✦ MAGIC ELEMENT BUILDER MODAL
          Rendered at top level — always above everything
      ══════════════════════════════════════ */}
      <input
        id={NOTES_IMPORT_INPUT_ID}
        type="file"
        accept=".md,text/markdown"
        onChange={importMarkdownFile}
        style={{ display: 'none' }}
      />
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
