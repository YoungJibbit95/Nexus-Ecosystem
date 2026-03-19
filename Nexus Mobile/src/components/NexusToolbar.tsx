import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Code2, FileText, CheckSquare, Layers, Layout,
  Terminal, Settings, Info, Search, Bell, Sparkles, GitBranch, HardDrive,
  X, ArrowRight, BarChart3, Wrench, Plus, Moon, Sun, Clock, Keyboard, RefreshCw,
  PanelLeft, Maximize2, Volume2, VolumeX, Wifi, WifiOff
} from 'lucide-react'
import { useTheme } from '../store/themeStore'
import { useTerminal } from '../store/terminalStore'
import { useApp } from '../store/appStore'
import { useCanvas } from '../store/canvasStore'
import { Glass } from './Glass'
import { hexToRgb } from '../lib/utils'

const VIEW_ITEMS = [
  { id: 'dashboard', icon: BarChart3,   label: 'Dashboard',  color: '#007AFF' },
  { id: 'notes',     icon: FileText,    label: 'Notes',      color: '#30D158' },
  { id: 'code',      icon: Code2,       label: 'Code',       color: '#BF5AF2' },
  { id: 'tasks',     icon: CheckSquare, label: 'Tasks',      color: '#FF9F0A' },
  { id: 'reminders', icon: Bell,        label: 'Reminders',  color: '#FF453A' },
  { id: 'canvas',    icon: GitBranch,   label: 'Canvas',     color: '#64D2FF' },
  { id: 'files',     icon: HardDrive,   label: 'Files',      color: '#5E5CE6' },
  { id: 'devtools',  icon: Wrench,      label: 'DevTools',   color: '#FF6B35' },
  { id: 'settings',  icon: Settings,    label: 'Settings',   color: '#888888' },
]

export function NexusToolbar({ spotlightMode: forceSpotlight, setView }: {
  spotlightMode?: boolean; setView?: (v: any) => void
}) {
  const t = useTheme()
  const terminal = useTerminal()
  const { notes, tasks, codes, reminders } = useApp()
  const { canvases } = useCanvas()
  const rgb = hexToRgb(t.accent)
  const rgb2 = hexToRgb(t.accent2)

  const [expanded, setExpanded]     = useState(false)
  const [hovered, setHovered]       = useState<string | null>(null)
  const [lastShift, setLastShift]   = useState(0)
  const [shiftDown, setShiftDown]   = useState(0)
  const [search, setSearch]         = useState('')
  const [selIdx, setSelIdx]         = useState(0)
  const [time, setTime]             = useState(new Date())
  const [cmdMode, setCmdMode]       = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toolbarMode = t.toolbar?.toolbarMode ?? 'island'
  const isIsland    = toolbarMode === 'island'
  const isSpotlight = toolbarMode === 'spotlight' || !!forceSpotlight
  const isFullWidth = toolbarMode === 'full-width'
  const isBottom    = (t.toolbar?.position ?? 'bottom') === 'bottom'
  const barHeight   = t.toolbar?.height ?? 44

  // Clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 10000)
    return () => clearInterval(id)
  }, [])

  // Double-shift
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && shiftDown === 0) setShiftDown(Date.now())
      if (e.key === 'Escape') { setExpanded(false); setCmdMode(false) }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return
      const now = Date.now()
      if (now - shiftDown < 250 && now - lastShift < 350) setExpanded(p => !p)
      setLastShift(now); setShiftDown(0)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [lastShift, shiftDown])

  useEffect(() => {
    if (expanded && (isSpotlight || cmdMode)) setTimeout(() => inputRef.current?.focus(), 80)
    if (!expanded) { setSearch(''); setSelIdx(0); setCmdMode(false) }
  }, [expanded, isSpotlight, cmdMode])

  // Commands
  const COMMANDS = useMemo(() => [
    { id: 'new-note',     label: 'New Note',          icon: FileText,    action: () => { useApp.getState().addNote(); setView?.('notes') } },
    { id: 'new-task',     label: 'New Task',          icon: CheckSquare, action: () => { useApp.getState().addTask('Neue Aufgabe', 'todo', '', 'mid'); setView?.('tasks') } },
    { id: 'new-reminder', label: 'New Reminder (+1h)', icon: Bell,       action: () => { useApp.getState().addRem({ title: 'Neue Erinnerung', msg: '', datetime: new Date(Date.now() + 3600000).toISOString(), repeat: 'none' }); setView?.('reminders') } },
    { id: 'new-code',     label: 'New Code File',     icon: Code2,       action: () => { useApp.getState().addCode('untitled.ts', 'typescript'); setView?.('code') } },
    { id: 'toggle-term',  label: 'Toggle Terminal',    icon: Terminal,    action: () => terminal.setOpen(!terminal.isOpen) },
    { id: 'dark-mode',    label: 'Toggle Dark/Light',  icon: Moon,        action: () => t.setMode(t.mode==='dark'?'light':'dark') },
    { id: 'preset-mac',   label: 'Preset: macOS Dark', icon: Sparkles,    action: () => t.preset('macOS Dark') },
    { id: 'preset-ocean', label: 'Preset: Ocean Wave', icon: Sparkles,    action: () => t.preset('Ocean Wave') },
    { id: 'preset-void',  label: 'Preset: Void',       icon: Sparkles,    action: () => t.preset('Void') },
    { id: 'settings',     label: 'Open Settings',      icon: Settings,    action: () => setView?.('settings') },
    ...VIEW_ITEMS.map(v => ({ id: `go-${v.id}`, label: `Go to ${v.label}`, icon: v.icon, action: () => setView?.(v.id) })),
  ], [setView, terminal, t])

  // Search
  const suggestions = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    const res: any[] = []
    notes.forEach(n => (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.tags||[]).some(tag => tag.toLowerCase().includes(q))) && res.push({ type: 'note', title: n.title||'Untitled', icon: FileText, color: '#30D158', action: () => setView?.('notes') }))
    tasks.forEach(tk => (tk.title.toLowerCase().includes(q) || (tk.desc||'').toLowerCase().includes(q)) && res.push({ type: 'task', title: tk.title, icon: CheckSquare, color: '#FF9F0A', action: () => setView?.('tasks') }))
    codes.forEach(c => c.name.toLowerCase().includes(q) && res.push({ type: 'code', title: c.name, icon: Code2, color: '#BF5AF2', action: () => setView?.('code') }))
    reminders.forEach(r => r.title.toLowerCase().includes(q) && res.push({ type: 'reminder', title: r.title, icon: Bell, color: '#FF453A', action: () => setView?.('reminders') }))
    COMMANDS.filter(c => c.label.toLowerCase().includes(q)).forEach(c => res.push({ type: 'command', title: c.label, icon: c.icon, color: t.accent, action: c.action }))
    return res.slice(0, 8)
  }, [search, notes, tasks, codes, reminders, COMMANDS, setView, t.accent])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const list = search ? suggestions : COMMANDS
    if (e.key==='ArrowDown') { e.preventDefault(); setSelIdx(p=>(p+1)%Math.max(list.length,1)) }
    else if (e.key==='ArrowUp') { e.preventDefault(); setSelIdx(p=>(p-1+list.length)%Math.max(list.length,1)) }
    else if (e.key==='Enter' && list[selIdx]) { list[selIdx].action(); setExpanded(false) }
    else if (e.key==='Escape') setExpanded(false)
  }, [suggestions, COMMANDS, selIdx, search])

  const overdueCount = reminders.filter(r => !r.done && new Date(r.snoozeUntil||r.datetime) < new Date()).length
  const pendingTasks = tasks.filter(tk => tk.status !== 'done').length
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // ── Spotlight mode ────────────────────────────────────────────────────
  if (isSpotlight) return (
    <AnimatePresence>
      {expanded && <>
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          style={{ position:'fixed', inset:0, zIndex:899, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(6px)' }}
          onClick={() => setExpanded(false)} />
        <motion.div
          initial={{opacity:0,scale:0.94,y:-16}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.94,y:-16}}
          transition={{type:'spring',stiffness:420,damping:30}}
          style={{ position:'fixed', top:72, left:'50%', transform:'translateX(-50%)', width:700, zIndex:900 }}
        >
          <SpotlightPanel
            search={search} setSearch={setSearch} selIdx={selIdx} setSelIdx={setSelIdx}
            suggestions={suggestions} commands={COMMANDS} handleKey={handleKey}
            inputRef={inputRef} onClose={() => setExpanded(false)}
            views={VIEW_ITEMS} setView={setView}
            rgb={rgb} t={t}
          />
        </motion.div>
      </>}
    </AnimatePresence>
  )

  // ── Full-width bar ────────────────────────────────────────────────────
  if (isFullWidth) return (
    <Glass type="modal" style={{
      width:'100%', height:barHeight, borderRadius:0, flexShrink:0,
      borderTop: isBottom ? '1px solid rgba(255,255,255,0.07)' : 'none',
      borderBottom: !isBottom ? '1px solid rgba(255,255,255,0.07)' : 'none',
      backdropFilter:'blur(30px) saturate(220%)',
      WebkitBackdropFilter:'blur(30px) saturate(220%)',
      display:'flex', alignItems:'center', padding:'0 16px', gap:2,
    }}>
      <LogoPill rgb={rgb} t={t} small />
      <div style={{ width:1, height:18, background:'rgba(255,255,255,0.1)', margin:'0 8px', flexShrink:0 }}/>
      {VIEW_ITEMS.map(item => (
        <button key={item.id} onClick={() => setView?.(item.id)}
          onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}
          style={{ padding:'5px 9px', borderRadius:8, border:'none', background:hovered===item.id?`rgba(${hexToRgb(item.color)},0.14)`:'transparent', cursor:'pointer', display:'flex', alignItems:'center', gap:5, color:hovered===item.id?item.color:'inherit', transition:'all 0.12s', fontSize:11, fontWeight:600 }}>
          <item.icon size={13} style={{ opacity:hovered===item.id?1:0.5 }}/> {item.label}
        </button>
      ))}
      <div style={{ flex:1 }}/>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginRight:10 }}>
        {[
          { icon: FileText, val: notes.length, c: '#30D158' },
          { icon: CheckSquare, val: pendingTasks, c: '#FF9F0A' },
          { icon: Bell, val: overdueCount, c: '#FF453A' },
        ].map(({ icon: Icon, val, c }) => (
          <div key={c} style={{ display:'flex', alignItems:'center', gap:3 }}>
            <Icon size={11} style={{ color:c, opacity:0.7 }}/>
            <span style={{ fontSize:11, fontWeight:700, color:val>0?c:'inherit', opacity:val>0?1:0.5 }}>{val}</span>
          </div>
        ))}
        <span style={{ fontSize:11, opacity:0.35, fontFamily:'monospace' }}>{timeStr}</span>
      </div>
      <button onClick={() => terminal.setOpen(!terminal.isOpen)}
        style={{ padding:'5px 10px', borderRadius:8, border:`1px solid rgba(255,255,255,${terminal.isOpen?0.2:0.08})`, background:terminal.isOpen?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.05)', color:terminal.isOpen?t.accent:'inherit', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, transition:'all 0.15s' }}>
        <Terminal size={12}/> Terminal
      </button>
      <button onClick={() => { setExpanded(p=>!p); setCmdMode(true) }}
        style={{ padding:'5px 10px', borderRadius:8, border:`1px solid rgba(${rgb},0.2)`, background:`rgba(${rgb},0.1)`, color:t.accent, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, transition:'all 0.15s', marginLeft:4 }}>
        <Search size={12}/> Search
      </button>
      {/* Command palette dropdown */}
      <AnimatePresence>
        {expanded && cmdMode && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
            style={{ position:'absolute', bottom:'calc(100% + 8px)', right:0, width:420, zIndex:900 }}>
            <SpotlightPanel search={search} setSearch={setSearch} selIdx={selIdx} setSelIdx={setSelIdx}
              suggestions={suggestions} commands={COMMANDS} handleKey={handleKey}
              inputRef={inputRef} onClose={() => { setExpanded(false); setCmdMode(false) }}
              views={VIEW_ITEMS} setView={setView} rgb={rgb} t={t} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </Glass>
  )

  // ── Island mode ───────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', justifyContent:'center', padding: isBottom?'0 0 10px':'10px 0 0', pointerEvents:'none', position:'relative' }}>
      <motion.div
        animate={{ width: expanded ? 'min(640px, 90vw)' : 216, height: expanded ? 50 : 44 }}
        transition={{ type:'spring', stiffness:360, damping:28, mass:0.9 }}
        onHoverStart={() => setExpanded(true)}
        onHoverEnd={() => setExpanded(false)}
        style={{ pointerEvents:'auto', position:'relative' }}
      >
        {/* Outer glow */}
        <div style={{
          position:'absolute', inset: expanded ? -8 : -4,
          borderRadius: expanded ? 38 : 30,
          background: `conic-gradient(from 0deg, ${t.accent}, ${t.accent2}, ${t.accent})`,
          filter: `blur(${expanded ? 18 : 10}px)`,
          opacity: t.glow.gradientGlow ? (expanded ? t.glow.intensity * 0.5 : t.glow.intensity * 0.25) : 0,
          transition: 'all 0.4s ease',
          animation: t.glow.animated ? `nexus-spin ${3/Math.max(t.glow.animationSpeed,0.1)}s linear infinite` : undefined,
          pointerEvents: 'none',
        }} />

        <Glass type="modal" glow={expanded} style={{
          width:'100%', height:'100%',
          borderRadius: expanded ? 25 : 22,
          border: expanded
            ? `1px solid rgba(${rgb},0.4)`
            : `1px solid rgba(255,255,255,0.12)`,
          backdropFilter:'blur(30px) saturate(220%)',
          WebkitBackdropFilter:'blur(30px) saturate(220%)',
          display:'flex', alignItems:'center', overflow:'hidden',
          padding: expanded ? '0 16px' : '0 18px',
          gap: 0,
          transition:'border-color 0.3s',
          boxShadow: expanded
            ? `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(${rgb},0.15)`
            : `0 8px 28px rgba(0,0,0,0.45), 0 2px 0 0 rgba(255,255,255,0.06) inset`,
        }}>
          {/* Logo */}
          <LogoPill rgb={rgb} t={t} expanded={expanded} />

          {/* Collapsed preview */}
          <AnimatePresence initial={false}>
            {!expanded && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                style={{ display:'flex', alignItems:'center', gap:7, marginLeft:10 }}>
                <span style={{ fontSize:12, fontWeight:800, opacity:0.55, letterSpacing:'0.04em' }}>Nexus</span>
                <div style={{ display:'flex', gap:3, opacity:0.25 }}>
                  {VIEW_ITEMS.slice(0,5).map(v => <v.icon key={v.id} size={9}/>)}
                </div>
                {overdueCount > 0 && (
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#FF453A', boxShadow:'0 0 6px #FF453A' }}/>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded tools */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.14}}
                style={{ display:'flex', alignItems:'center', flex:1, gap:1, marginLeft:8 }}>
                {VIEW_ITEMS.map(item => {
                  const iRgb = hexToRgb(item.color)
                  return (
                    <button key={item.id} onClick={() => item.id && setView?.(item.id)}
                      onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}
                      title={item.label}
                      style={{
                        position:'relative', padding:'7px 8px', borderRadius:11, border:'none',
                        background: hovered===item.id ? `rgba(${iRgb},0.2)` : 'transparent',
                        cursor:'pointer', transition:'all 0.12s', display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                      <item.icon size={15} style={{ color:hovered===item.id?item.color:'inherit', opacity:hovered===item.id?1:0.45, transition:'all 0.12s' }}/>
                      {/* Tooltip */}
                      <AnimatePresence>
                        {hovered===item.id && (
                          <motion.div initial={{opacity:0,y:isBottom?4:-4,scale:0.88}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:isBottom?4:-4,scale:0.88}} transition={{duration:0.1}}
                            style={{ position:'absolute', [isBottom?'bottom':'top']:'calc(100% + 9px)', left:'50%', transform:'translateX(-50%)', background:'rgba(6,6,18,0.95)', backdropFilter:'blur(16px)', border:`1px solid ${item.color}33`, borderRadius:8, padding:'4px 9px', zIndex:9999, pointerEvents:'none', whiteSpace:'nowrap' }}>
                            <span style={{ fontSize:10, fontWeight:700, color:item.color }}>{item.label}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  )
                })}

                <div style={{ width:1, height:18, background:'rgba(255,255,255,0.1)', margin:'0 6px', flexShrink:0 }}/>

                {/* Stats */}
                <div style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 10px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#30D158' }}>{notes.length}<span style={{ fontSize:8, opacity:0.5, marginLeft:2 }}>N</span></span>
                  <span style={{ fontSize:10, fontWeight:700, color: pendingTasks>0?'#FF9F0A':'inherit', opacity:pendingTasks>0?1:0.5 }}>{pendingTasks}<span style={{ fontSize:8, opacity:0.5, marginLeft:2 }}>T</span></span>
                  {overdueCount > 0 && <span style={{ fontSize:10, fontWeight:700, color:'#FF453A' }}>{overdueCount}<span style={{ fontSize:8, opacity:0.5, marginLeft:2 }}>!</span></span>}
                  <span style={{ fontSize:9, opacity:0.35, fontFamily:'monospace' }}>{timeStr}</span>
                </div>

                {/* Terminal + Search */}
                <button onClick={() => terminal.setOpen(!terminal.isOpen)}
                  style={{ padding:'6px 8px', borderRadius:10, border:'none', background:terminal.isOpen?`rgba(${rgb},0.2)`:'transparent', cursor:'pointer', color:terminal.isOpen?t.accent:'inherit', transition:'all 0.12s', flexShrink:0, display:'flex', alignItems:'center' }}>
                  <Terminal size={14} style={{ opacity:terminal.isOpen?1:0.4 }}/>
                </button>
                <button onClick={() => { setCmdMode(true) }}
                  style={{ padding:'6px 8px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', color:'inherit', transition:'all 0.12s', flexShrink:0, display:'flex', alignItems:'center' }}
                  onMouseEnter={e=>e.currentTarget.style.background=`rgba(${rgb},0.15)`}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <Search size={14} style={{ opacity:0.4 }}/>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Glass>

        {/* Command palette overlay when search is triggered from island */}
        <AnimatePresence>
          {cmdMode && (
            <>
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                style={{ position:'fixed', inset:0, zIndex:898, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)' }}
                onClick={() => { setCmdMode(false); setExpanded(false) }} />
              <motion.div initial={{opacity:0,scale:0.95,y:-10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:-10}}
                style={{ position:'fixed', top:isBottom?'auto':'calc(100% + 12px)', bottom:isBottom?'calc(100% + 12px)':'auto', left:'50%', transform:'translateX(-50%)', width:660, zIndex:899 }}>
                <SpotlightPanel
                  search={search} setSearch={setSearch} selIdx={selIdx} setSelIdx={setSelIdx}
                  suggestions={suggestions} commands={COMMANDS} handleKey={handleKey}
                  inputRef={inputRef} onClose={() => { setCmdMode(false); setExpanded(false) }}
                  views={VIEW_ITEMS} setView={setView} rgb={rgb} t={t} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────
function LogoPill({ rgb, t, expanded, small }: any) {
  return (
    <motion.div
      animate={{ scale: expanded ? 1.06 : 1 }}
      style={{
        width: small ? 26 : 30, height: small ? 26 : 30, borderRadius: small ? 8 : 10, flexShrink: 0,
        background: `linear-gradient(135deg, rgba(${rgb},0.35), rgba(${rgb},0.12))`,
        border: `1px solid rgba(${rgb},0.45)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 14px rgba(${rgb},0.3)`,
      }}>
      <Zap size={small ? 12 : 14} style={{ color: t.accent }} />
    </motion.div>
  )
}

function SpotlightPanel({ search, setSearch, selIdx, setSelIdx, suggestions, commands, handleKey, inputRef, onClose, views, setView, rgb, t, compact }: any) {
  const { notes, tasks, reminders, codes } = useApp()
  const list = search ? suggestions : commands
  return (
    <Glass type="modal" glow style={{
      borderRadius: compact ? 14 : 20,
      border: `1px solid rgba(${rgb},0.35)`,
      backdropFilter:'blur(36px) saturate(230%)',
      WebkitBackdropFilter:'blur(36px) saturate(230%)',
      boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(${rgb},0.1), 0 0 40px rgba(${rgb},0.12)`,
    }}>
      {/* Search input */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding: compact ? '11px 14px' : '14px 18px' }}>
        <div style={{ width:32, height:32, borderRadius:10, background:`linear-gradient(135deg,rgba(${rgb},0.28),rgba(${rgb},0.1))`, border:`1px solid rgba(${rgb},0.35)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Search size={14} style={{ color: t.accent }} />
        </div>
        <input ref={inputRef} type="text" value={search} onChange={e => { setSearch(e.target.value); setSelIdx(0) }}
          onKeyDown={handleKey} placeholder={search ? 'Suchen…' : 'Befehl oder suchen…'}
          style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize: compact ? 14 : 16, fontWeight:600, color:'inherit', letterSpacing:'-0.01em' }} />
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, padding:'3px 9px', cursor:'pointer', color:'inherit', fontSize:10, display:'flex', alignItems:'center', gap:3, opacity:0.6 }}>
          <X size={10}/> ESC
        </button>
      </div>

      {/* Quick nav (no search) */}
      {!search && !compact && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'8px 10px 4px' }}>
          <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
            {[
              { label: `Notes ${notes.length}`, c: '#30D158' },
              { label: `Tasks ${tasks.filter((x:any)=>x.status!=='done').length}`, c: '#FF9F0A' },
              { label: `Reminders ${reminders.filter((x:any)=>!x.done).length}`, c: '#FF453A' },
              { label: `Code ${codes.length}`, c: '#BF5AF2' },
            ].map(s => (
              <span key={s.label} style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:12, background:`rgba(${hexToRgb(s.c)},0.12)`, border:`1px solid rgba(${hexToRgb(s.c)},0.25)`, color:s.c }}>{s.label}</span>
            ))}
          </div>
          <div style={{ fontSize:9, opacity:0.3, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.2em', marginBottom:6, paddingLeft:4 }}>Schnell-Navigation</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
            {views.map((v: any) => (
              <button key={v.id} onClick={() => { setView?.(v.id); onClose() }}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:9, background:`rgba(${hexToRgb(v.color)},0.1)`, border:`1px solid rgba(${hexToRgb(v.color)},0.2)`, cursor:'pointer', color:v.color, fontSize:11, fontWeight:700, transition:'all 0.12s' }}>
                <v.icon size={11}/> {v.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop:8, padding:'6px 8px', fontSize:10, opacity:0.45, borderRadius:8, border:'1px dashed rgba(255,255,255,0.18)' }}>
            Tipp: Suche nach Inhalt, z. B. Notiztitel, Task-Text oder Befehl wie <code style={{ fontSize:10 }}>preset</code>, <code style={{ fontSize:10 }}>new</code>.
          </div>
        </div>
      )}

      {/* Results */}
      {list.length > 0 && (
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'5px 8px', maxHeight:320, overflowY:'auto' }}>
          {list.map((item: any, i: number) => {
            const iRgb = item.color ? hexToRgb(item.color) : rgb
            return (
              <button key={i} onClick={() => { item.action(); onClose() }} onMouseEnter={() => setSelIdx(i)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:10, cursor:'pointer', background:selIdx===i?`rgba(${iRgb},0.12)`:'transparent', border:`1px solid ${selIdx===i?`rgba(${iRgb},0.25)`:'transparent'}`, color:'inherit', textAlign:'left', transition:'all 0.1s' }}>
                <div style={{ width:30, height:30, borderRadius:8, flexShrink:0, background:selIdx===i?`rgba(${iRgb},0.2)`:'rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <item.icon size={14} style={{ color:selIdx===i?(item.color||t.accent):'inherit', opacity:selIdx===i?1:0.5 }}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{item.title || item.label}</div>
                  <div style={{ fontSize:10, opacity:0.35, textTransform:'capitalize' }}>{item.type||'command'}</div>
                </div>
                {selIdx===i && <ArrowRight size={12} style={{ color:item.color||t.accent, opacity:0.6 }}/>}
              </button>
            )
          })}
          <div style={{ padding:'5px 12px 2px', fontSize:9, opacity:0.22, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', display:'flex', justifyContent:'space-between' }}>
            <span>{list.length} items</span><span>↑↓ navigate · Enter select</span>
          </div>
        </div>
      )}
    </Glass>
  )
}
