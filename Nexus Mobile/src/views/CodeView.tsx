import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Play,
  Copy,
  Plus,
  Trash2,
  Save,
  X,
  FileCode,
  ChevronDown,
  ChevronRight,
  Terminal,
  Download,
  Search,
  RotateCcw,
  Columns,
  Eye,
  Edit3,
  Loader,
  Clock,
  Command,
  Folder,
  PanelBottom,
  MoreHorizontal,
} from 'lucide-react'
import { Glass } from '../components/Glass'
import { InteractiveIconButton } from '../components/render/InteractiveIconButton'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp, CodeFile } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { useMobile } from '../lib/useMobile'
import { hexToRgb } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { shallow } from 'zustand/shallow'
import { LANGS, executeCode, getLang } from '@nexus/core/code'
import { MobileSheet } from '../components/mobile/MobileViewContract'

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return (
    target.isContentEditable ||
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select'
  )
}

const copyTextSafe = async (value: string): Promise<boolean> => {
  if (!value) return false
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Fallback below.
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', 'true')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

function ToolBtn({
  onClick,
  title,
  icon,
  active,
}: {
  onClick: () => void
  title: string
  icon: React.ReactNode
  active?: boolean
}) {
  const t = useTheme()
  return (
    <button
      onClick={onClick}
      title={title}
      className="nx-interactive nx-bounce-target"
      style={{
        background: active ? `rgba(${hexToRgb(t.accent)},0.15)` : 'none',
        border: 'none',
        color: active ? t.accent : 'inherit',
        opacity: active ? 1 : 0.6,
        padding: '5px 7px',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {icon}
    </button>
  )
}

function RunBtn({
  running,
  onClick,
  accent,
}: {
  running: boolean
  onClick: () => void
  accent: string
}) {
  const mob = useMobile()
  const rgb = hexToRgb(accent)
  const compact = mob.isMobile
  return (
    <button
      onClick={onClick}
      disabled={running}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 5 : 6,
        padding: compact ? '5px 10px' : '6px 14px',
        borderRadius: 8,
        background: running ? `rgba(${rgb},0.18)` : accent,
        border: 'none',
        cursor: running ? 'not-allowed' : 'pointer',
        color: '#fff',
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        boxShadow: running ? 'none' : `0 2px 12px rgba(${rgb},0.4)`,
        opacity: running ? 0.7 : 1,
      }}
    >
      {running ? <Loader size={compact ? 12 : 13} className="nx-spin" /> : <Play size={compact ? 12 : 13} fill="currentColor" />}
      {running ? 'Running…' : 'Run'}
    </button>
  )
}

function FileTab({
  file,
  active,
  onSelect,
  onClose,
}: {
  file: CodeFile
  active: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const t = useTheme()
  const lang = getLang(file.lang)
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px 0 12px',
        cursor: 'pointer',
        flexShrink: 0,
        maxWidth: 180,
        minHeight: 38,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        borderBottom: active ? `2px solid ${t.accent}` : '2px solid transparent',
        background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          color: lang.color,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {lang.ext}
      </span>
      <span
        style={{
          fontSize: 12,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          opacity: active ? 1 : 0.6,
        }}
      >
        {file.dirty && <span style={{ color: t.accent, marginRight: 3 }}>●</span>}
        {file.name}
      </span>
      <InteractiveIconButton
        motionId={`mobile-code-tab-close-${file.id}`}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        idleOpacity={0.3}
        radius={3}
        style={{ padding: '2px 1px' }}
      >
        <X size={12} />
      </InteractiveIconButton>
    </div>
  )
}

function OutLine({ text }: { text: string }) {
  const color = text.startsWith('❌')
    ? '#ff453a'
    : text.startsWith('⚠️')
      ? '#ffd60a'
      : text.startsWith('ℹ️')
        ? '#64d2ff'
        : text.startsWith('✓')
          ? '#30d158'
          : undefined
  return (
    <div
      style={{
        fontFamily: "'Fira Code',monospace",
        fontSize: 12.5,
        lineHeight: 1.65,
        color,
        opacity: color ? 1 : 0.85,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        padding: '0.5px 0',
      }}
    >
      {text}
    </div>
  )
}

export function CodeView() {
  const t = useTheme()
  const mob = useMobile()
  const rgb = hexToRgb(t.accent)
  const compactEdge = Math.min(mob.screenW, mob.screenH)
  const isTinyMobile = mob.isMobile && compactEdge <= 430
  const isTightMobile = mob.isMobile && mob.screenH <= 900
  const isLandscapeMobile = mob.isMobile && mob.isLandscape
  const isCompactMobile = mob.isMobile && (isTinyMobile || isTightMobile || isLandscapeMobile)
  const {
    codes,
    folders,
    activeCodeId,
    openCodeIds,
    addCode,
    updateCode,
    delCode,
    setCode,
    openCode,
    closeCode,
    saveCode,
  } = useApp(
    (s) => ({
      codes: s.codes,
      folders: s.folders,
      activeCodeId: s.activeCodeId,
      openCodeIds: s.openCodeIds,
      addCode: s.addCode,
      updateCode: s.updateCode,
      delCode: s.delCode,
      setCode: s.setCode,
      openCode: s.openCode,
      closeCode: s.closeCode,
      saveCode: s.saveCode,
    }),
    shallow,
  )

  const [output, setOutput] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [outOpen, setOutOpen] = useState(true)
  const [outH, setOutH] = useState(220)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpenOpen, setQuickOpenOpen] = useState(false)
  const [quickOpenQuery, setQuickOpenQuery] = useState('')
  const [quickOpenCursor, setQuickOpenCursor] = useState(0)
  const [fileScope, setFileScope] = useState<'all' | 'open'>('all')
  const [folderFilter, setFolderFilter] = useState<string>('all')
  const [newOpen, setNewOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newLang, setNewLang] = useState('javascript')
  const [preview, setPreview] = useState<'editor' | 'split' | 'preview'>('editor')
  const [copiedOut, setCopiedOut] = useState(false)
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false)
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'preview' | 'terminal'>('none')
  const [mobileActionSheetOpen, setMobileActionSheetOpen] = useState(false)
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null)
  const [runHistory, setRunHistory] = useState<
    Array<{ fileId: string; fileName: string; at: string; ok: boolean; ms: number }>
  >([])
  const outRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ y: number; h: number } | null>(null)

  const openFiles = openCodeIds
    .map((id) => codes.find((c) => c.id === id))
    .filter(Boolean) as CodeFile[]
  const active = codes.find((c) => c.id === activeCodeId)
  const pendingDeleteFile = codes.find((c) => c.id === pendingDeleteFileId) ?? null
  const lang = active ? getLang(active.lang) : null
  const hasPreview = Boolean(active && ['html', 'css', 'markdown'].includes(active.lang))

  const folderScopedCodes = useMemo(
    () =>
      codes.filter((file) =>
        folderFilter === 'all' ? true : (file.folderId ?? '__root__') === folderFilter,
      ),
    [codes, folderFilter],
  )

  const quickOpenFiles = useMemo(() => {
    const query = quickOpenQuery.trim().toLowerCase()
    const openSet = new Set(openCodeIds)
    return folderScopedCodes
      .filter((file) => (!query ? true : `${file.name} ${file.lang}`.toLowerCase().includes(query)))
      .sort((a, b) => {
        const aOpen = openSet.has(a.id) ? 1 : 0
        const bOpen = openSet.has(b.id) ? 1 : 0
        if (aOpen !== bOpen) return bOpen - aOpen
        return a.name.localeCompare(b.name)
      })
      .slice(0, 40)
  }, [folderScopedCodes, openCodeIds, quickOpenQuery])

  const sideFiles = useMemo(
    () =>
      folderScopedCodes
        .filter((file) => !search || file.name.toLowerCase().includes(search.toLowerCase()))
        .filter((file) => (fileScope === 'open' ? openCodeIds.includes(file.id) : true)),
    [fileScope, folderScopedCodes, openCodeIds, search],
  )

  useEffect(() => {
    if (!quickOpenOpen) return
    setQuickOpenCursor(0)
  }, [quickOpenOpen, quickOpenQuery])

  useEffect(() => {
    if (!quickOpenOpen) return
    setQuickOpenCursor((cursor) => {
      if (quickOpenFiles.length === 0) return 0
      return Math.min(cursor, quickOpenFiles.length - 1)
    })
  }, [quickOpenFiles, quickOpenOpen])

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight
  }, [output])

  const run = useCallback(async () => {
    if (!active) return
    setRunning(true)
    setOutOpen(true)
    setOutput(['▶  Executing…', ''])
    setElapsed(null)
    await new Promise((r) => setTimeout(r, 40))
    const t0 = performance.now()
    const result = await executeCode(active)
    const ms = performance.now() - t0
    setElapsed(ms)
    setOutput(result.split('\n'))
    setRunning(false)
    setRunHistory((h) => [
      { fileId: active.id, fileName: active.name, at: new Date().toISOString(), ok: !result.includes('❌'), ms },
      ...h,
    ].slice(0, 6))
  }, [active])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const editable = isEditableTarget(e.target)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        run()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && active) {
        e.preventDefault()
        saveCode(active.id)
      }
      if (editable) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setQuickOpenOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen((state) => !state)
      }
      if (e.key === 'Escape') {
        setQuickOpenOpen(false)
        setSearchOpen(false)
        setMobileExplorerOpen(false)
        setMobileActionSheetOpen(false)
        setMobileDrawer('none')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, run, saveCode])

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { y: e.clientY, h: outH }
    const mv = (event: MouseEvent) => {
      if (!dragRef.current) return
      setOutH(Math.max(60, Math.min(600, dragRef.current.h + dragRef.current.y - event.clientY)))
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', mv)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
  }

  const createFile = () => {
    if (!newName.trim()) return
    const l = getLang(newLang)
    const fname = newName.includes('.') ? newName : `${newName}.${l.ext}`
    const f = addCode(fname, newLang)
    updateCode(f.id, { content: l.hello })
    setNewOpen(false)
    setNewName('')
  }

  const handleCopyOut = useCallback(async () => {
    const ok = await copyTextSafe(output.join('\n'))
    if (!ok) return
    setCopiedOut(true)
    window.setTimeout(() => setCopiedOut(false), 1500)
  }, [output])

  const insertSnippet = (kind: 'log' | 'fetch' | 'todo') => {
    if (!active) return
    const map = {
      log: '\nconsole.log("debug:", { value: true })\n',
      fetch: '\nconst res = await fetch("https://example.com/api")\nconst data = await res.json()\nconsole.log(data)\n',
      todo: '\n// TODO: implement\n// 1. parse input\n// 2. validate\n// 3. return output\n',
    }
    updateCode(active.id, { content: `${active.content}${map[kind]}`, dirty: true })
  }

  const openCodeFromQuickOpen = useCallback((id: string) => {
    openCode(id)
    setCode(id)
    setQuickOpenOpen(false)
    setQuickOpenQuery('')
    setQuickOpenCursor(0)
  }, [openCode, setCode])

  const openFile = (id: string) => {
    openCode(id)
    setCode(id)
    if (mob.isMobile) {
      setMobileExplorerOpen(false)
    }
  }

  const renderPreview = () => {
    if (!active) return null
    if (active.lang === 'markdown') {
      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: '16px 16px 18px', color: 'inherit' }}>
          <NexusMarkdown content={active.content} />
        </div>
      )
    }
    return (
      <iframe
        srcDoc={active.lang === 'css'
          ? `<html><head><style>body{margin:20px;font-family:system-ui}${active.content}</style></head><body><div class=\"card\"><h1>CSS Preview</h1><p>Your styles applied here</p></div></body></html>`
          : active.content}
        style={{ width: '100%', height: '100%', border: 'none', background: 'white', display: 'block' }}
        sandbox="allow-scripts allow-same-origin"
        title="Preview"
      />
    )
  }

  const explorerBody = (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ padding: '10px 10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1 }}>Explorer</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <ToolBtn onClick={() => setSearchOpen((s) => !s)} title="Search files" icon={<Search size={13} />} active={searchOpen} />
          <ToolBtn onClick={() => setQuickOpenOpen(true)} title="Quick Open (Ctrl/Cmd+P)" icon={<Command size={13} />} />
          <ToolBtn onClick={() => setNewOpen(true)} title="New file" icon={<Plus size={13} />} />
        </div>
      </div>
      <div style={{ padding: '0 8px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {(['all', 'open'] as const).map((scopeId) => (
          <button
            key={scopeId}
            onClick={() => setFileScope(scopeId)}
            style={{
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.12)',
              background: fileScope === scopeId ? `rgba(${rgb},0.15)` : 'rgba(255,255,255,0.03)',
              color: fileScope === scopeId ? '#7fd2ff' : 'inherit',
              fontSize: 10,
              fontWeight: 700,
              padding: '5px 7px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {scopeId === 'all'
              ? `All (${folderScopedCodes.length})`
              : `Open (${folderScopedCodes.filter((f) => openCodeIds.includes(f.id)).length})`}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 8px 8px' }}>
        <select
          value={folderFilter}
          onChange={(e) => setFolderFilter(e.target.value)}
          style={{ width: '100%', padding: '7px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 12, color: 'inherit' }}
        >
          <option value="all">All folders</option>
          <option value="__root__">Root</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </div>
      {searchOpen ? (
        <div style={{ padding: '0 8px 8px' }}>
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter…" style={{ width: '100%', padding: '7px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: 12, color: 'inherit' }} />
        </div>
      ) : null}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
        {sideFiles.length === 0 ? <div style={{ textAlign: 'center', padding: 24, fontSize: 12, opacity: 0.3 }}>No files in current scope</div> : null}
        {sideFiles.map((f) => {
          const l = getLang(f.lang)
          const isA = f.id === activeCodeId
          return (
            <div
              key={f.id}
              onClick={() => openFile(f.id)}
              className="nx-surface-row"
              data-active={isA ? 'true' : 'false'}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: isA ? `rgba(${rgb},0.12)` : 'transparent', border: isA ? `1px solid rgba(${rgb},0.22)` : '1px solid transparent', ['--nx-row-hover-bg' as any]: 'rgba(255,255,255,0.05)' }}
            >
              <span style={{ fontSize: 9, fontWeight: 800, color: l.color, letterSpacing: 0.3, textTransform: 'uppercase', width: 26, flexShrink: 0 }}>{l.ext}</span>
              <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: isA ? 1 : 0.65 }}>
                {f.dirty && <span style={{ color: t.accent }}>● </span>}
                {f.name}
              </span>
              <InteractiveIconButton
                motionId={`mobile-code-delete-${f.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setPendingDeleteFileId(f.id)
                }}
                intent="danger"
                idleOpacity={0.28}
                radius={4}
                style={{ padding: '2px 3px' }}
              >
                <Trash2 size={11} />
              </InteractiveIconButton>
            </div>
          )
        })}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, opacity: 0.3 }}>
        {sideFiles.length} shown · {codes.length} total
      </div>
    </div>
  )

  return (
    <div className="nx-mobile-view-screen" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {!mob.isMobile ? (
        <div style={{ width: 220, maxWidth: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.14)' }}>
          {explorerBody}
        </div>
      ) : null}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {mob.isMobile ? (
          <div className="nx-mobile-row-scroll" style={{ gap: 5, padding: isCompactMobile ? '4px 7px' : '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)' }}>
            <button onClick={() => setMobileExplorerOpen(true)} style={{ width: isCompactMobile ? 28 : 32, height: isCompactMobile ? 28 : 32, borderRadius: 8, border: `1px solid rgba(${rgb},0.28)`, background: `rgba(${rgb},0.14)`, color: t.accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Folder size={isCompactMobile ? 13 : 14} />
            </button>
            <button onClick={() => setQuickOpenOpen(true)} style={{ padding: isCompactMobile ? '6px 8px' : '7px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: isCompactMobile ? 10 : 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Search size={12} /> Quick
            </button>
            <button onClick={() => setMobileActionSheetOpen(true)} style={{ padding: isCompactMobile ? '6px 8px' : '7px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: isCompactMobile ? 10 : 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <MoreHorizontal size={12} /> More
            </button>
            <div style={{ marginLeft: 'auto' }}>
              <RunBtn running={running} onClick={run} accent={t.accent} />
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.12)', overflowX: 'auto', flexShrink: 0, minHeight: mob.isMobile ? (isCompactMobile ? 28 : 30) : (isCompactMobile ? 32 : 38) }}>
          {openFiles.length === 0 ? (
            <div style={{ padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 12, opacity: 0.3 }}>Open a file →</div>
          ) : (
            openFiles.map((f) => (
              <FileTab key={f.id} file={f} active={f.id === activeCodeId} onSelect={() => setCode(f.id)} onClose={() => closeCode(f.id)} />
            ))
          )}
          <div style={{ flex: 1 }} />
          {active && !mob.isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', flexShrink: 0 }}>
              {hasPreview ? (
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 7, overflow: 'hidden', marginRight: 6 }}>
                  {(['editor', 'split', 'preview'] as const).map((m) => (
                    <button key={m} onClick={() => setPreview(m)} style={{ padding: '5px 8px', background: preview === m ? t.accent : 'transparent', border: 'none', cursor: 'pointer', color: preview === m ? '#fff' : 'inherit', opacity: preview === m ? 1 : 0.5, display: 'flex', alignItems: 'center' }}>
                      {m === 'editor' ? <Edit3 size={11} /> : m === 'split' ? <Columns size={11} /> : <Eye size={11} />}
                    </button>
                  ))}
                </div>
              ) : null}
              <ToolBtn onClick={() => void copyTextSafe(active.content)} title="Copy code" icon={<Copy size={13} />} />
              <ToolBtn
                onClick={() => {
                  const b = new Blob([active.content], { type: 'text/plain' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(b)
                  a.download = active.name
                  a.click()
                }}
                title="Download"
                icon={<Download size={13} />}
              />
              <ToolBtn onClick={() => saveCode(active.id)} title="Save (Ctrl+S)" icon={<Save size={13} />} active={active.dirty} />
              <RunBtn running={running} onClick={run} accent={t.accent} />
            </div>
          ) : null}
        </div>

        {active && !mob.isMobile ? (
          <div className="nx-mobile-row-scroll" style={{ gap: 8, padding: isCompactMobile ? '6px 8px' : '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.08)' }}>
            <button onClick={() => insertSnippet('log')} style={{ padding: isCompactMobile ? '4px 7px' : '5px 9px', borderRadius: 8, border: `1px solid rgba(${rgb},0.3)`, background: `rgba(${rgb},0.14)`, color: t.accent, fontSize: isCompactMobile ? 9 : 10, fontWeight: 700, cursor: 'pointer' }}>+ log()</button>
            <button onClick={() => insertSnippet('fetch')} style={{ padding: isCompactMobile ? '4px 7px' : '5px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: isCompactMobile ? 9 : 10, fontWeight: 700, cursor: 'pointer' }}>+ fetch()</button>
            <button onClick={() => insertSnippet('todo')} style={{ padding: isCompactMobile ? '4px 7px' : '5px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: isCompactMobile ? 9 : 10, fontWeight: 700, cursor: 'pointer' }}>+ TODO</button>
            <div className="nx-mobile-row-scroll" style={{ marginLeft: 'auto', gap: 6 }}>
              {runHistory.slice(0, 2).map((r, i) => (
                <button key={`${r.at}-${i}`} onClick={() => openCodeFromQuickOpen(r.fileId)} style={{ fontSize: 10, padding: '3px 7px', borderRadius: 999, background: r.ok ? 'rgba(48,209,88,0.14)' : 'rgba(255,69,58,0.14)', color: r.ok ? '#30D158' : '#FF453A', border: `1px solid ${r.ok ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}`, cursor: 'pointer' }}>{r.fileName.split('.').pop()} {Math.round(r.ms)}ms</button>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, opacity: 0.55 }}>
              <FileCode size={52} strokeWidth={1} style={{ color: t.accent, opacity: 0.4 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>No file open</div>
                <div style={{ fontSize: 13, opacity: 0.6 }}>Open Explorer and create or select a file</div>
              </div>
              <button onClick={() => setNewOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, background: t.accent, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: `0 4px 18px rgba(${rgb},0.4)` }}>
                <Plus size={14} /> New File
              </button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                <div style={{ flex: 1, overflow: 'hidden', minWidth: 0, position: 'relative' }}>
                  <textarea
                    value={active.content}
                    onChange={(e) => updateCode(active.id, { content: e.target.value, dirty: true })}
                    style={{ width: '100%', height: '100%', padding: mob.isMobile ? (isCompactMobile ? '8px 9px 14px' : '12px 12px 20px') : '14px 16px', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontSize: (t.editor.fontSize || 13) - (isCompactMobile ? 1 : 0), lineHeight: 1.65, fontFamily: "'Fira Code','JetBrains Mono',monospace", color: 'inherit', tabSize: t.editor.tabSize || 2 }}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault()
                        run()
                      }
                      if (e.key === 'Tab') {
                        e.preventDefault()
                        const s = e.currentTarget
                        const i = s.selectionStart
                        const spaces = '  '
                        s.value = s.value.slice(0, i) + spaces + s.value.slice(s.selectionEnd)
                        s.selectionStart = s.selectionEnd = i + spaces.length
                        updateCode(active.id, { content: s.value, dirty: true })
                      }
                    }}
                    spellCheck={false}
                  />
                </div>

                {!mob.isMobile && (preview === 'split' || preview === 'preview') ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.14)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.6, flexShrink: 0 }}>
                      Preview — {lang?.label}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>{renderPreview()}</div>
                  </div>
                ) : null}
              </div>

              {!mob.isMobile ? (
                <div style={{ flexShrink: 0 }}>
                  <div onMouseDown={startDrag} className="nx-surface-row" data-active="false" style={{ height: 5, cursor: 'ns-resize', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.07)', ['--nx-row-hover-bg' as any]: `rgba(${rgb},0.25)` }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 36, background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => setOutOpen((s) => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.55, display: 'flex', alignItems: 'center', gap: 5, padding: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      <Terminal size={12} />
                      Terminal
                      {outOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </button>
                    {elapsed !== null ? <span style={{ fontSize: 10, opacity: 0.35, display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={9} />{elapsed.toFixed(1)}ms</span> : null}
                    {runHistory[0] ? <span style={{ fontSize: 10, opacity: 0.45 }}>Last: {runHistory[0].fileName} · {runHistory[0].ok ? 'ok' : 'error'}</span> : null}
                    <div style={{ flex: 1 }} />
                    <button onClick={handleCopyOut} className="nx-interactive nx-bounce-target nx-icon-fade" style={{ background: 'none', border: 'none', ['--nx-idle-opacity' as any]: 0.4, padding: '2px 6px', borderRadius: 4, fontSize: 10, color: copiedOut ? t.accent : 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {copiedOut ? <><span>✓</span> Copied</> : <><Copy size={9} /> Copy</>}
                    </button>
                    <button onClick={() => setOutput([])} className="nx-interactive nx-bounce-target nx-icon-fade" style={{ background: 'none', border: 'none', ['--nx-idle-opacity' as any]: 0.4, padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <RotateCcw size={9} /> Clear
                    </button>
                    <RunBtn running={running} onClick={run} accent={t.accent} />
                  </div>

                  {outOpen ? (
                    <div ref={outRef} style={{ height: outH, overflowY: 'auto', padding: '10px 16px 12px', background: 'rgba(0,0,0,0.28)' }}>
                      {output.length === 0
                        ? <div style={{ opacity: 0.25, fontSize: 12, fontFamily: 'monospace' }}>Ctrl+Enter to run…</div>
                        : output.map((line, i) => <OutLine key={i} text={line} />)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      <MobileSheet
        open={mob.isMobile && mobileExplorerOpen}
        onClose={() => setMobileExplorerOpen(false)}
        title="Explorer"
        mode="bottom"
      >
        <div style={{ minHeight: 0, height: '68vh' }}>{explorerBody}</div>
      </MobileSheet>

      <MobileSheet
        open={mob.isMobile && mobileDrawer !== 'none'}
        onClose={() => setMobileDrawer('none')}
        title={mobileDrawer === 'preview' ? 'Preview' : 'Terminal'}
        mode="bottom"
      >
        {mobileDrawer === 'preview' ? (
          <div style={{ height: '56vh', overflow: 'hidden' }}>
            {hasPreview ? renderPreview() : <div style={{ padding: 14, fontSize: 12, opacity: 0.64 }}>Für diesen Dateityp gibt es keine Preview.</div>}
          </div>
        ) : (
          <div style={{ height: '56vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {elapsed !== null ? <span style={{ fontSize: 10, opacity: 0.55, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {elapsed.toFixed(1)}ms</span> : null}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={handleCopyOut} style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 700, color: copiedOut ? t.accent : 'inherit', cursor: 'pointer' }}>{copiedOut ? 'Copied' : 'Copy'}</button>
                <button onClick={() => setOutput([])} style={{ padding: '5px 7px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', fontSize: 10, fontWeight: 700, color: 'inherit', cursor: 'pointer' }}>Clear</button>
                <RunBtn running={running} onClick={run} accent={t.accent} />
              </div>
            </div>
            <div ref={outRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 14px', background: 'rgba(0,0,0,0.28)' }}>
              {output.length === 0
                ? <div style={{ opacity: 0.25, fontSize: 12, fontFamily: 'monospace' }}>Ctrl+Enter to run…</div>
                : output.map((line, i) => <OutLine key={i} text={line} />)}
            </div>
          </div>
        )}
      </MobileSheet>

      <MobileSheet
        open={mob.isMobile && mobileActionSheetOpen}
        onClose={() => setMobileActionSheetOpen(false)}
        title="Code Actions"
        mode="bottom"
      >
        <div style={{ padding: '10px 10px 14px', display: 'grid', gap: 8 }}>
          <button onClick={() => { setNewOpen(true); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>
            <Plus size={14} /> New File
          </button>
          {hasPreview ? (
            <button onClick={() => { setMobileDrawer((d) => (d === 'preview' ? 'none' : 'preview')); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: `1px solid ${mobileDrawer === 'preview' ? t.accent : 'rgba(255,255,255,0.14)'}`, borderRadius: 9, background: mobileDrawer === 'preview' ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.06)', color: mobileDrawer === 'preview' ? t.accent : 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>
              <Eye size={14} /> Preview
            </button>
          ) : null}
          <button onClick={() => { setMobileDrawer((d) => (d === 'terminal' ? 'none' : 'terminal')); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: `1px solid ${mobileDrawer === 'terminal' ? t.accent : 'rgba(255,255,255,0.14)'}`, borderRadius: 9, background: mobileDrawer === 'terminal' ? `rgba(${rgb},0.14)` : 'rgba(255,255,255,0.06)', color: mobileDrawer === 'terminal' ? t.accent : 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>
            <PanelBottom size={14} /> Terminal
          </button>
          {active ? (
            <>
              <button onClick={() => { insertSnippet('log'); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>+ log() snippet</button>
              <button onClick={() => { insertSnippet('fetch'); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>+ fetch() snippet</button>
              <button onClick={() => { insertSnippet('todo'); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>+ TODO snippet</button>
              <button onClick={() => { void copyTextSafe(active.content); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 9, background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer', textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>Copy code</button>
              <button onClick={() => { saveCode(active.id); setMobileActionSheetOpen(false) }} style={{ width: '100%', border: `1px solid rgba(${rgb},0.32)`, borderRadius: 9, background: `rgba(${rgb},0.14)`, color: t.accent, cursor: 'pointer', textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 700 }}>Save file</button>
            </>
          ) : null}
        </div>
      </MobileSheet>

      <AnimatePresence>
        {quickOpenOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: mob.isMobile ? 'stretch' : 'flex-start', justifyContent: 'center', zIndex: 240, paddingTop: mob.isMobile ? 0 : 60, backdropFilter: 'blur(4px)' }}
            onClick={() => setQuickOpenOpen(false)}
          >
            <motion.div
              initial={mob.isMobile ? { y: 14, opacity: 0 } : { y: -8, scale: 0.98, opacity: 0 }}
              animate={mob.isMobile ? { y: 0, opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
              exit={mob.isMobile ? { y: 14, opacity: 0 } : { y: -8, scale: 0.98, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              style={mob.isMobile ? { width: '100vw', height: '100dvh', display: 'flex' } : undefined}
            >
              <Glass style={{ width: mob.isMobile ? '100%' : 460, maxWidth: mob.isMobile ? '100%' : '90vw', height: mob.isMobile ? '100%' : 'auto', borderRadius: mob.isMobile ? 0 : 14, padding: 14, display: 'flex', flexDirection: 'column' }} glow>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Search size={13} style={{ opacity: 0.6 }} />
                  <input
                    autoFocus
                    value={quickOpenQuery}
                    onChange={(event) => setQuickOpenQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setQuickOpenOpen(false)
                        return
                      }
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setQuickOpenCursor((cursor) => {
                          if (quickOpenFiles.length === 0) return 0
                          return (cursor + 1) % quickOpenFiles.length
                        })
                        return
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setQuickOpenCursor((cursor) => {
                          if (quickOpenFiles.length === 0) return 0
                          return (cursor - 1 + quickOpenFiles.length) % quickOpenFiles.length
                        })
                        return
                      }
                      const target = quickOpenFiles[quickOpenCursor] ?? quickOpenFiles[0]
                      if (event.key === 'Enter' && target) {
                        openCodeFromQuickOpen(target.id)
                      }
                    }}
                    placeholder="Quick open file…"
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', outline: 'none', fontSize: 13 }}
                  />
                  {mob.isMobile ? (
                    <button onClick={() => setQuickOpenOpen(false)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Close</button>
                  ) : null}
                </div>
                <div style={{ maxHeight: mob.isMobile ? 'none' : 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, flex: mob.isMobile ? 1 : undefined }}>
                  {quickOpenFiles.length === 0 ? (
                    <div style={{ padding: '14px 8px', textAlign: 'center', fontSize: 12, opacity: 0.56 }}>No matching files</div>
                  ) : (
                    quickOpenFiles.map((file, index) => {
                      const isActive = file.id === activeCodeId
                      const isSelected = index === quickOpenCursor
                      const fileLang = getLang(file.lang)
                      return (
                        <button
                          key={file.id}
                          onClick={() => openCodeFromQuickOpen(file.id)}
                          onMouseEnter={() => setQuickOpenCursor(index)}
                          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 8, border: isSelected ? '1px solid rgba(122,169,255,0.42)' : '1px solid rgba(255,255,255,0.1)', background: isSelected ? 'rgba(122,169,255,0.2)' : isActive ? 'rgba(122,169,255,0.15)' : 'rgba(255,255,255,0.03)', color: 'inherit', cursor: 'pointer' }}
                        >
                          <span style={{ width: 26, flexShrink: 0, fontSize: 9, fontWeight: 800, color: fileLang.color, textTransform: 'uppercase' }}>{fileLang.ext}</span>
                          <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{file.name}</span>
                          <span style={{ fontSize: 10, opacity: 0.55 }}>{file.folderId ? 'folder' : 'root'}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDeleteFile ? (
          <MobileSheet
            open={Boolean(pendingDeleteFile)}
            onClose={() => setPendingDeleteFileId(null)}
            title="Delete file"
            mode="bottom"
          >
            <div style={{ padding: '10px 12px 14px', display: 'grid', gap: 10 }}>
              <div style={{ borderRadius: 12, border: '1px solid rgba(255,69,58,0.28)', background: 'rgba(255,69,58,0.1)', padding: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#ff453a', marginBottom: 4 }}>Delete “{pendingDeleteFile.name}”?</div>
                <div style={{ fontSize: 11, opacity: 0.68, lineHeight: 1.4 }}>
                  This removes the file from the embedded CodeView workspace. Use this sheet instead of a native confirm so the mobile flow stays touch-safe.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => setPendingDeleteFileId(null)} style={{ padding: '10px 12px', borderRadius: 11, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: 'inherit', fontSize: 12, fontWeight: 800 }}>
                  Cancel
                </button>
                <button
                  onClick={() => {
                    delCode(pendingDeleteFile.id)
                    setPendingDeleteFileId(null)
                  }}
                  style={{ padding: '10px 12px', borderRadius: 11, border: '1px solid rgba(255,69,58,0.4)', background: 'rgba(255,69,58,0.16)', color: '#ff453a', fontSize: 12, fontWeight: 800 }}
                >
                  Delete
                </button>
              </div>
            </div>
          </MobileSheet>
        ) : null}

        {newOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: mob.isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 220, backdropFilter: 'blur(6px)' }}
            onClick={() => setNewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 14, opacity: 0.88 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 14, opacity: 0.88 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: mob.isMobile ? '100%' : 420, maxHeight: mob.isMobile ? '84vh' : undefined }}
            >
              <Glass style={{ width: '100%', padding: 20, borderRadius: mob.isMobile ? '20px 20px 0 0' : 14 }} glow>
                <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>New File</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>File name</div>
                  <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createFile()} placeholder="main.js" style={{ width: '100%', padding: '8px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none', fontSize: 13, color: 'inherit' }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Language</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                    {LANGS.filter((l) => l.id !== 'plaintext').map((l) => (
                      <button key={l.id} onClick={() => { setNewLang(l.id); const base = newName.split('.')[0] || 'main'; setNewName(`${base}.${l.ext}`) }} style={{ padding: '7px 4px', borderRadius: 8, border: `1px solid ${newLang === l.id ? l.color : 'rgba(255,255,255,0.08)'}`, background: newLang === l.id ? `${l.color}22` : 'transparent', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: newLang === l.id ? l.color : 'inherit' }}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setNewOpen(false)} style={{ flex: 1, padding: '9px', borderRadius: 9, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: 13, color: 'inherit' }}>Cancel</button>
                  <button onClick={createFile} style={{ flex: 1, padding: '9px', borderRadius: 9, background: t.accent, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>Create</button>
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
