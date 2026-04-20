import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import {
  Play, Copy, Plus, Trash2, Save, X, FileCode,
  ChevronDown, ChevronRight, Terminal, Download,
  Search, RotateCcw, Columns, Eye, Edit3, Loader, Clock, Command
} from 'lucide-react'
import { Glass } from '../components/Glass'
import { InteractiveIconButton } from '../components/render/InteractiveIconButton'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp, CodeFile } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { shallow } from 'zustand/shallow'
import { LANGS, executeCode, getLang } from '@nexus/core/code'

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function ToolBtn({ onClick, title, icon, active }: { onClick: () => void; title: string; icon: React.ReactNode; active?: boolean }) {
  const t = useTheme()
  return (
    <button
      onClick={onClick}
      title={title}
      className="nx-interactive nx-bounce-target"
      style={{ background: active ? `rgba(${hexToRgb(t.accent)},0.15)` : 'none', border: 'none', color: active ? t.accent : 'inherit', opacity: active ? 1 : 0.5, padding: '5px 7px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
    >
      {icon}
    </button>
  )
}

function RunBtn({ running, onClick, accent }: { running: boolean; onClick: () => void; accent: string }) {
  const rgb = hexToRgb(accent)
  return (
    <button onClick={onClick} disabled={running}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:8, background: running ? `rgba(${rgb},0.18)` : accent, border:'none', cursor: running?'not-allowed':'pointer', color:'#fff', fontSize:12, fontWeight:700, boxShadow: running?'none':`0 2px 12px rgba(${rgb},0.4)`, transition:'all 0.15s', opacity: running?0.7:1 }}>
      {running ? <Loader size={13} className="nx-spin" /> : <Play size={13} fill="currentColor" />}
      {running ? 'Running…' : 'Run'}
    </button>
  )
}

function FileTab({ file, active, onSelect, onClose }: { file: CodeFile; active: boolean; onSelect: () => void; onClose: () => void }) {
  const t = useTheme()
  const lang = getLang(file.lang)
  return (
    <div onClick={onSelect} style={{ display:'flex', alignItems:'center', gap:6, padding:'0 10px 0 12px', cursor:'pointer', flexShrink:0, maxWidth:180, minHeight:38, borderRight:'1px solid rgba(255,255,255,0.06)', borderBottom: active?`2px solid ${t.accent}`:'2px solid transparent', background: active?'rgba(255,255,255,0.07)':'transparent', transition:'all 0.12s' }}>
      <span style={{ fontSize:9, fontWeight:800, color:lang.color, letterSpacing:0.3, textTransform:'uppercase', flexShrink:0 }}>{lang.ext}</span>
      <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, opacity: active?1:0.6 }}>
        {file.dirty && <span style={{ color:t.accent, marginRight:3 }}>●</span>}{file.name}
      </span>
      <InteractiveIconButton
        motionId={`mobile-code-tab-close-${file.id}`}
        onClick={e=>{e.stopPropagation();onClose()}}
        idleOpacity={0.3}
        radius={3}
        style={{ padding:'2px 1px' }}
      >
        <X size={12} />
      </InteractiveIconButton>
    </div>
  )
}

function OutLine({ text }: { text: string }) {
  const color = text.startsWith('❌') ? '#ff453a' : text.startsWith('⚠️') ? '#ffd60a' : text.startsWith('ℹ️') ? '#64d2ff' : text.startsWith('✓') ? '#30d158' : undefined
  return <div style={{ fontFamily:"'Fira Code',monospace", fontSize:12.5, lineHeight:1.65, color, opacity: color?1:0.85, whiteSpace:'pre-wrap', wordBreak:'break-all', padding:'0.5px 0' }}>{text}</div>
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function CodeView() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { codes, folders, activeCodeId, openCodeIds, addCode, updateCode, delCode, setCode, openCode, closeCode, saveCode } = useApp((s) => ({
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
  }), shallow)

  const [output, setOutput]         = useState<string[]>([])
  const [running, setRunning]       = useState(false)
  const [elapsed, setElapsed]       = useState<number|null>(null)
  const [outOpen, setOutOpen]       = useState(true)
  const [outH, setOutH]             = useState(220)
  const [search, setSearch]         = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickOpenOpen, setQuickOpenOpen] = useState(false)
  const [quickOpenQuery, setQuickOpenQuery] = useState('')
  const [fileScope, setFileScope] = useState<'all' | 'open'>('all')
  const [folderFilter, setFolderFilter] = useState<string>('all')
  const [newOpen, setNewOpen]       = useState(false)
  const [newName, setNewName]       = useState('')
  const [newLang, setNewLang]       = useState('javascript')
  const [preview, setPreview]       = useState<'editor'|'split'|'preview'>('editor')
  const [copiedOut, setCopiedOut]   = useState(false)
  const [runHistory, setRunHistory] = useState<{ file: string; at: string; ok: boolean; ms: number }[]>([])
  const outRef  = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{y:number;h:number}|null>(null)

  const openFiles = openCodeIds.map(id => codes.find(c => c.id === id)).filter(Boolean) as CodeFile[]
  const active = codes.find(c => c.id === activeCodeId)
  const lang   = active ? getLang(active.lang) : null
  const hasPreview = active && ['html','css','markdown'].includes(active.lang)
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

  useEffect(() => { if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight }, [output])

  const run = useCallback(async () => {
    if (!active) return
    setRunning(true); setOutOpen(true); setOutput(['▶  Executing…', '']); setElapsed(null)
    await new Promise(r => setTimeout(r, 40))
    const t0 = performance.now()
    const result = await executeCode(active)
    const ms = performance.now() - t0
    setElapsed(ms)
    setOutput(result.split('\n'))
    setRunning(false)
    setRunHistory(h => [{ file: active.name, at: new Date().toISOString(), ok: !result.includes('❌'), ms }, ...h].slice(0, 6))
  }, [active])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey) && e.key === 'Enter') { e.preventDefault(); run() }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setQuickOpenOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setSearchOpen((state) => !state)
      }
      if ((e.ctrlKey||e.metaKey) && e.key === 's' && active) { e.preventDefault(); saveCode(active.id) }
      if (e.key === 'Escape') setQuickOpenOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [run, saveCode, active])

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { y: e.clientY, h: outH }
    const mv = (e: MouseEvent) => { if (dragRef.current) setOutH(Math.max(60, Math.min(600, dragRef.current.h + dragRef.current.y - e.clientY))) }
    const up = () => { dragRef.current = null; window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up)
  }

  const createFile = () => {
    if (!newName.trim()) return
    const l = getLang(newLang)
    const fname = newName.includes('.') ? newName : newName + '.' + l.ext
    const f = addCode(fname, newLang)
    updateCode(f.id, { content: l.hello })
    setNewOpen(false); setNewName('')
  }

  const sideFiles = folderScopedCodes
    .filter((file) => !search || file.name.toLowerCase().includes(search.toLowerCase()))
    .filter((file) => (fileScope === 'open' ? openCodeIds.includes(file.id) : true))

  const handleCopyOut = () => {
    navigator.clipboard.writeText(output.join('\n'))
    setCopiedOut(true); setTimeout(() => setCopiedOut(false), 1500)
  }

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
  }, [openCode, setCode])

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────── */}
      <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.14)' }}>
        <div style={{ padding:'12px 10px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:10, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1 }}>Explorer</span>
          <div style={{ display:'flex', gap:2 }}>
            <ToolBtn onClick={() => setSearchOpen(s=>!s)} title="Search files" icon={<Search size={13}/>} active={searchOpen} />
            <ToolBtn onClick={() => setQuickOpenOpen(true)} title="Quick Open (Ctrl/Cmd+P)" icon={<Command size={13}/>} />
            <ToolBtn onClick={() => setNewOpen(true)} title="New file" icon={<Plus size={13}/>} />
          </div>
        </div>
        <div style={{ padding:'0 8px 8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {(['all','open'] as const).map(scopeId => (
            <button
              key={scopeId}
              onClick={() => setFileScope(scopeId)}
              style={{
                borderRadius:7,
                border:'1px solid rgba(255,255,255,0.12)',
                background: fileScope === scopeId ? `rgba(${rgb},0.15)` : 'rgba(255,255,255,0.03)',
                color: fileScope === scopeId ? '#7fd2ff' : 'inherit',
                fontSize:10,
                fontWeight:700,
                padding:'5px 7px',
                cursor:'pointer',
                textTransform:'uppercase',
              }}
            >
              {scopeId === 'all' ? `All (${folderScopedCodes.length})` : `Open (${folderScopedCodes.filter((f) => openCodeIds.includes(f.id)).length})`}
            </button>
          ))}
        </div>
        <div style={{ padding:'0 8px 8px' }}>
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            style={{ width:'100%', padding:'5px 8px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }}
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
        {searchOpen && (
          <div style={{ padding:'0 8px 8px' }}>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter…" style={{ width:'100%', padding:'5px 8px', borderRadius:7, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }} />
          </div>
        )}
        <div style={{ flex:1, overflowY:'auto', padding:'0 6px' }}>
          {sideFiles.length === 0 && <div style={{ textAlign:'center', padding:24, fontSize:12, opacity:0.3 }}>No files in current scope</div>}
          {sideFiles.map(f => {
            const l = getLang(f.lang)
            const isA = f.id === activeCodeId
            return (
              <div
                key={f.id}
                onClick={() => { openCode(f.id); setCode(f.id) }}
                className="nx-surface-row"
                data-active={isA ? 'true' : 'false'}
                style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 8px', borderRadius:8, cursor:'pointer', marginBottom:2, background:isA?`rgba(${rgb},0.12)`:'transparent', border:isA?`1px solid rgba(${rgb},0.22)`:'1px solid transparent', ['--nx-row-hover-bg' as any]:'rgba(255,255,255,0.05)' }}
              >
                <span style={{ fontSize:9, fontWeight:800, color:l.color, letterSpacing:0.3, textTransform:'uppercase', width:26, flexShrink:0 }}>{l.ext}</span>
                <span style={{ flex:1, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:isA?1:0.65 }}>
                  {f.dirty && <span style={{ color:t.accent }}>● </span>}{f.name}
                </span>
                <InteractiveIconButton
                  motionId={`mobile-code-delete-${f.id}`}
                  onClick={e=>{e.stopPropagation(); if(confirm(`Delete "${f.name}"?`)) delCode(f.id)}}
                  intent="danger"
                  idleOpacity={0.28}
                  radius={4}
                  style={{ padding:'2px 3px' }}
                >
                  <Trash2 size={11}/>
                </InteractiveIconButton>
              </div>
            )
          })}
        </div>
        <div style={{ padding:'8px 12px', borderTop:'1px solid rgba(255,255,255,0.06)', fontSize:11, opacity:0.3 }}>{sideFiles.length} shown · {codes.length} total</div>
      </div>

      {/* ── Editor area ─────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Tab strip */}
        <div style={{ display:'flex', alignItems:'stretch', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', overflowX:'auto', flexShrink:0, minHeight:38 }}>
          {openFiles.length === 0
            ? <div style={{ padding:'0 14px', display:'flex', alignItems:'center', fontSize:12, opacity:0.3 }}>Open a file →</div>
            : openFiles.map(f => <FileTab key={f.id} file={f} active={f.id===activeCodeId} onSelect={() => setCode(f.id)} onClose={() => closeCode(f.id)} />)
          }
          <div style={{ flex:1 }} />
          {active && (
            <div style={{ display:'flex', alignItems:'center', gap:2, padding:'0 8px', flexShrink:0 }}>
              {hasPreview && (
                <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:7, overflow:'hidden', marginRight:6 }}>
                  {(['editor','split','preview'] as const).map(m => (
                    <button key={m} onClick={()=>setPreview(m)} style={{ padding:'5px 8px', background:preview===m?t.accent:'transparent', border:'none', cursor:'pointer', color:preview===m?'#fff':'inherit', opacity:preview===m?1:0.5, transition:'all 0.12s', display:'flex', alignItems:'center' }}>
                      {m==='editor'?<Edit3 size={11}/>:m==='split'?<Columns size={11}/>:<Eye size={11}/>}
                    </button>
                  ))}
                </div>
              )}
              <ToolBtn onClick={() => navigator.clipboard.writeText(active.content)} title="Copy code" icon={<Copy size={13}/>} />
              <ToolBtn onClick={() => { const b=new Blob([active.content],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=active.name; a.click() }} title="Download" icon={<Download size={13}/>} />
              <ToolBtn onClick={() => saveCode(active.id)} title="Save (Ctrl+S)" icon={<Save size={13}/>} active={active.dirty} />
              <RunBtn running={running} onClick={run} accent={t.accent} />
            </div>
          )}
        </div>

        {active && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.08)', flexWrap:'wrap' }}>
            <button onClick={() => insertSnippet('log')} style={{ padding:'5px 9px', borderRadius:8, border:`1px solid rgba(${rgb},0.3)`, background:`rgba(${rgb},0.14)`, color:t.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>+ log()</button>
            <button onClick={() => insertSnippet('fetch')} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ fetch()</button>
            <button onClick={() => insertSnippet('todo')} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ TODO block</button>
            <button onClick={() => setQuickOpenOpen(true)} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer' }}>Quick Open</button>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:10, opacity:0.5 }}>Scratch-first, full IDE in Nexus Code.</span>
              {runHistory.slice(0, 3).map((r, i) => (
                <button
                  key={`${r.at}-${i}`}
                  onClick={() => {
                    const file = codes.find((codeFile) => codeFile.name === r.file)
                    if (file) openCodeFromQuickOpen(file.id)
                  }}
                  style={{ fontSize:10, padding:'3px 7px', borderRadius:999, background:r.ok?'rgba(48,209,88,0.14)':'rgba(255,69,58,0.14)', color:r.ok?'#30D158':'#FF453A', border:`1px solid ${r.ok?'rgba(48,209,88,0.3)':'rgba(255,69,58,0.3)'}`, cursor:'pointer' }}
                >
                  {r.file.split('.').pop()} {Math.round(r.ms)}ms
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          {!active ? (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, opacity:0.55 }}>
              <FileCode size={52} strokeWidth={1} style={{ color:t.accent, opacity:0.4 }} />
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:17, fontWeight:700, marginBottom:6 }}>No file open</div>
                <div style={{ fontSize:13, opacity:0.6 }}>Select from sidebar or create a new file</div>
              </div>
              <button onClick={()=>setNewOpen(true)} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 20px', borderRadius:10, background:t.accent, border:'none', cursor:'pointer', color:'#fff', fontSize:13, fontWeight:700, boxShadow:`0 4px 18px rgba(${rgb},0.4)` }}>
                <Plus size={14}/> New File
              </button>
            </div>
          ) : (
            <>
              <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>
                {/* Editor */}
                {(preview==='editor'||preview==='split') && (
                  <div style={{ flex:1, overflow:'hidden', minWidth:0, position:'relative' }}>
                    <textarea
                      value={active.content}
                      onChange={e => updateCode(active.id, { content: e.target.value, dirty: true })}
                      style={{
                        width: '100%', height: '100%', padding: '14px 16px',
                        background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                        fontSize: t.editor.fontSize || 13, lineHeight: 1.65,
                        fontFamily: "'Fira Code','JetBrains Mono',monospace",
                        color: 'inherit', tabSize: t.editor.tabSize || 2,
                      }}
                      onKeyDown={e => {
                        if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); run() }
                        if (e.key==='Tab') { e.preventDefault(); const s=e.currentTarget; const i=s.selectionStart; const spaces='  '; s.value=s.value.slice(0,i)+spaces+s.value.slice(s.selectionEnd); s.selectionStart=s.selectionEnd=i+spaces.length; updateCode(active.id,{content:s.value,dirty:true}) }
                      }}
                      spellCheck={false}
                    />
                  </div>
                )}
                {/* Preview */}
                {(preview==='split'||preview==='preview') && (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', borderLeft:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', minWidth:0 }}>
                    <div style={{ padding:'6px 14px', background:'rgba(0,0,0,0.14)', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:10, fontWeight:700, opacity:0.4, textTransform:'uppercase', letterSpacing:0.6, flexShrink:0 }}>
                      Preview — {lang?.label}
                    </div>
                    <div style={{ flex:1, overflow:'hidden', minHeight:0 }}>
                      {active.lang==='markdown' ? (
                        <div style={{ height:'100%', overflowY:'auto', padding:'20px 24px', color:'inherit' }}>
                          <NexusMarkdown content={active.content} />
                        </div>
                      ) : (
                        <iframe
                          srcDoc={active.lang==='css'
                            ? `<html><head><style>body{margin:20px;font-family:system-ui}${active.content}</style></head><body><div class="card"><h1>CSS Preview</h1><p>Your styles applied here</p></div></body></html>`
                            : active.content}
                          style={{ width:'100%', height:'100%', border:'none', background:'white', display:'block' }}
                          sandbox="allow-scripts allow-same-origin"
                          title="Preview"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Output panel */}
              <div style={{ flexShrink:0 }}>
                <div
                  onMouseDown={startDrag}
                  className="nx-surface-row"
                  data-active="false"
                  style={{ height:5, cursor:'ns-resize', background:'rgba(255,255,255,0.04)', borderTop:'1px solid rgba(255,255,255,0.07)', ['--nx-row-hover-bg' as any]:`rgba(${rgb},0.25)` }}
                />

                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 14px', height:36, background:'rgba(0,0,0,0.2)', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={()=>setOutOpen(s=>!s)} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:0.55, display:'flex', alignItems:'center', gap:5, padding:0, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>
                    <Terminal size={12}/>
                    Terminal
                    {outOpen ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                  </button>
                  {elapsed !== null && <span style={{ fontSize:10, opacity:0.35, display:'flex', alignItems:'center', gap:3 }}><Clock size={9}/>{elapsed.toFixed(1)}ms</span>}
                  {runHistory[0] && <span style={{ fontSize:10, opacity:0.45 }}>Last: {runHistory[0].file} · {runHistory[0].ok ? 'ok' : 'error'}</span>}
                  <div style={{ flex:1 }} />
                  <button
                    onClick={handleCopyOut}
                    className="nx-interactive nx-bounce-target nx-icon-fade"
                    style={{ background:'none', border:'none', ['--nx-idle-opacity' as any]:0.4, padding:'2px 6px', borderRadius:4, fontSize:10, color: copiedOut?t.accent:'inherit', display:'flex', alignItems:'center', gap:3 }}
                  >
                    {copiedOut?<><span>✓</span> Copied</>:<><Copy size={9}/> Copy</>}
                  </button>
                  <button
                    onClick={()=>setOutput([])}
                    className="nx-interactive nx-bounce-target nx-icon-fade"
                    style={{ background:'none', border:'none', ['--nx-idle-opacity' as any]:0.4, padding:'2px 6px', borderRadius:4, fontSize:10, color:'inherit', display:'flex', alignItems:'center', gap:3 }}
                  >
                    <RotateCcw size={9}/> Clear
                  </button>
                  <RunBtn running={running} onClick={run} accent={t.accent} />
                </div>

                {outOpen && (
                  <div ref={outRef} style={{ height:outH, overflowY:'auto', padding:'10px 16px 12px', background:'rgba(0,0,0,0.28)' }}>
                    {output.length===0
                      ? <div style={{ opacity:0.25, fontSize:12, fontFamily:'monospace' }}>Ctrl+Enter to run…</div>
                      : output.map((line,i) => <OutLine key={i} text={line}/>)
                    }
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Quick Open modal ───────────────────────────── */}
      <AnimatePresence>
        {quickOpenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-start', justifyContent:'center', zIndex:240, paddingTop:60, backdropFilter:'blur(4px)' }}
            onClick={() => setQuickOpenOpen(false)}
          >
            <motion.div
              initial={{ y:-8, scale:0.98, opacity:0 }}
              animate={{ y:0, scale:1, opacity:1 }}
              exit={{ y:-8, scale:0.98, opacity:0 }}
              onClick={(event) => event.stopPropagation()}
            >
              <Glass style={{ width:460, maxWidth:'90vw', padding:14 }} glow>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Search size={13} style={{ opacity:0.6 }} />
                  <input
                    autoFocus
                    value={quickOpenQuery}
                    onChange={(event) => setQuickOpenQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        setQuickOpenOpen(false)
                        return
                      }
                      if (event.key === 'Enter' && quickOpenFiles[0]) {
                        openCodeFromQuickOpen(quickOpenFiles[0].id)
                      }
                    }}
                    placeholder="Quick open file…"
                    style={{ width:'100%', padding:'8px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', outline:'none', fontSize:13 }}
                  />
                </div>
                <div style={{ maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                  {quickOpenFiles.length === 0 ? (
                    <div style={{ padding:'14px 8px', textAlign:'center', fontSize:12, opacity:0.56 }}>
                      No matching files
                    </div>
                  ) : (
                    quickOpenFiles.map((file) => {
                      const isActive = file.id === activeCodeId
                      const fileLang = getLang(file.lang)
                      return (
                        <button
                          key={file.id}
                          onClick={() => openCodeFromQuickOpen(file.id)}
                          style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:isActive ? 'rgba(122,169,255,0.15)' : 'rgba(255,255,255,0.03)', color:'inherit', cursor:'pointer' }}
                        >
                          <span style={{ width:26, flexShrink:0, fontSize:9, fontWeight:800, color:fileLang.color, textTransform:'uppercase' }}>
                            {fileLang.ext}
                          </span>
                          <span style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                            {file.name}
                          </span>
                          <span style={{ fontSize:10, opacity:0.55 }}>{file.folderId ? 'folder' : 'root'}</span>
                        </button>
                      )
                    })
                  )}
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── New file modal ──────────────────────────────── */}
      <AnimatePresence>
        {newOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(6px)' }}
            onClick={()=>setNewOpen(false)}>
            <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()}>
              <Glass style={{ width:420, padding:24 }} glow>
                <div style={{ fontSize:17, fontWeight:800, marginBottom:20 }}>New File</div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, opacity:0.5, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>File name</div>
                  <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFile()} placeholder="main.js" style={{ width:'100%', padding:'8px 11px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:13, color:'inherit' }} />
                </div>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, opacity:0.5, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Language</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {LANGS.filter(l=>l.id!=='plaintext').map(l => (
                      <button key={l.id} onClick={()=>{ setNewLang(l.id); const base=newName.split('.')[0]||'main'; setNewName(base+'.'+l.ext) }}
                        style={{ padding:'7px 4px', borderRadius:8, border:`1px solid ${newLang===l.id?l.color:'rgba(255,255,255,0.08)'}`, background:newLang===l.id?`${l.color}22`:'transparent', cursor:'pointer', fontSize:10, fontWeight:700, color:newLang===l.id?l.color:'inherit', transition:'all 0.12s' }}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setNewOpen(false)} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit' }}>Cancel</button>
                  <button onClick={createFile} style={{ flex:1, padding:'9px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff' }}>Create</button>
                </div>
              </Glass>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
