import React, { useState, useMemo, useRef } from 'react'
import {
  Plus, Trash2, Edit3, Search, X, Check, FileText, Code2,
  CheckSquare, Bell, FolderOpen, Grid3x3, List, Star, Clock,
  MoreVertical, ChevronRight, Layers, Package, Copy, ArrowRight,
  Home, Hash, Zap, Archive, Globe
} from 'lucide-react'
import { Glass } from '../components/Glass'
import { useApp, Note, CodeFile, Task, Reminder } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { useWorkspaces, Workspace } from '../store/workspaceStore'
import { hexToRgb } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const ICONS = ['🏠','💼','🚀','🎨','📚','🔬','🎮','💡','⚡','🌊','🎯','🔥','✨','🌿','💎','🎵']
const COLORS = ['#007AFF','#5E5CE6','#FF453A','#FF9F0A','#30D158','#00C7BE','#BF5AF2','#FF6B9E','#64D2FF','#FFD60A']

type ItemType = 'note'|'code'|'task'|'reminder'
type ViewMode = 'grid'|'list'

interface FileItem {
  id: string
  title: string
  type: ItemType
  updated: string
  preview?: string
  tags?: string[]
  lang?: string
  priority?: string
  status?: string
}

const TYPE_META: Record<ItemType, { icon: React.FC<any>; color: string; label: string }> = {
  note:     { icon: FileText,    color: '#007AFF', label: 'Note' },
  code:     { icon: Code2,       color: '#BF5AF2', label: 'Code' },
  task:     { icon: CheckSquare, color: '#FF9F0A', label: 'Task' },
  reminder: { icon: Bell,        color: '#FF453A', label: 'Reminder' },
}

// ── Workspace create / edit modal ─────────────────────────────────
function WorkspaceModal({ ws, onClose }: { ws?: Workspace; onClose: () => void }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { addWorkspace, updateWorkspace } = useWorkspaces()
  const [name,  setName]  = useState(ws?.name ?? '')
  const [icon,  setIcon]  = useState(ws?.icon ?? '🏠')
  const [color, setColor] = useState(ws?.color ?? '#007AFF')
  const [desc,  setDesc]  = useState(ws?.description ?? '')

  const save = () => {
    if (!name.trim()) return
    ws ? updateWorkspace(ws.id, { name, icon, color, description: desc }) : addWorkspace(name, icon, color, desc)
    onClose()
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(8px)' }}
      onClick={onClose}>
      <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()}>
        <Glass glow style={{ width:420, padding:24 }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>{ws?'Edit Workspace':'New Workspace'}</div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Name</label>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ fontSize:28 }}>{icon}</div>
              <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()} placeholder="My Workspace" style={{ flex:1, padding:'8px 11px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:14, fontWeight:700, color:'inherit' }} />
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>Icon</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {ICONS.map(i => (
                <button key={i} onClick={()=>setIcon(i)} style={{ width:36, height:36, borderRadius:8, border:`2px solid ${icon===i?color:'rgba(255,255,255,0.1)'}`, background:icon===i?`${color}22`:'transparent', cursor:'pointer', fontSize:18, transition:'all 0.12s' }}>{i}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>Color</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {COLORS.map(c => (
                <button key={c} onClick={()=>setColor(c)} style={{ width:28, height:28, borderRadius:'50%', background:c, border:`3px solid ${color===c?'white':'transparent'}`, cursor:'pointer', transition:'all 0.12s', transform:color===c?'scale(1.2)':'none', boxShadow:color===c?`0 0 10px ${c}`:'none' }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Description (optional)</label>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What's this workspace for?" style={{ width:'100%', padding:'8px 11px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:13, color:'inherit' }} />
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit' }}>Cancel</button>
            <button onClick={save} style={{ flex:2, padding:'9px', borderRadius:9, background:color, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff', boxShadow:`0 2px 16px ${color}66` }}>
              {ws?'Save':'Create Workspace'}
            </button>
          </div>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

// ── File card ─────────────────────────────────────────────────────
function FileCard({ item, viewMode, onAssign, wsColor }: { item: FileItem; viewMode: ViewMode; onAssign: () => void; wsColor?: string }) {
  const t = useTheme()
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const [menu, setMenu] = useState(false)
  const { openNote, openCode, setNote, setCode } = useApp()

  const open = () => {
    if (item.type === 'note') { openNote(item.id); setNote(item.id) }
    if (item.type === 'code') { openCode(item.id); setCode(item.id) }
  }

  const timeAgo = (iso: string) => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000
    if (d < 60) return 'just now'
    if (d < 3600) return `${Math.floor(d/60)}m ago`
    if (d < 86400) return `${Math.floor(d/3600)}h ago`
    return `${Math.floor(d/86400)}d ago`
  }

  if (viewMode === 'list') {
    return (
      <div onDoubleClick={open} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 14px', borderRadius:10, cursor:'pointer', transition:'background 0.12s', marginBottom:2 }}
        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
        <div style={{ width:30, height:30, borderRadius:8, background:`${meta.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon size={14} style={{ color:meta.color }}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
          {item.preview && <div style={{ fontSize:11, opacity:0.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.preview}</div>}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          {wsColor && <div style={{ width:6, height:6, borderRadius:'50%', background:wsColor }} title="In workspace"/>}
          <span style={{ fontSize:10, opacity:0.4 }}>{timeAgo(item.updated)}</span>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:`${meta.color}20`, color:meta.color, fontWeight:700 }}>{meta.label}</span>
        </div>
      </div>
    )
  }

  return (
    <Glass hover glow style={{ padding:14, cursor:'pointer', position:'relative' }} onDoubleClick={open}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ width:34, height:34, borderRadius:9, background:`${meta.color}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={16} style={{ color:meta.color }}/>
        </div>
        <div style={{ display:'flex', gap:5, alignItems:'center' }}>
          {wsColor && <div style={{ width:8, height:8, borderRadius:'50%', background:wsColor }} title="In workspace"/>}
          <button onClick={e=>{e.stopPropagation();setMenu(m=>!m)}} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.35, padding:3, borderRadius:5, color:'inherit' }}
            onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.35'}>
            <MoreVertical size={13}/>
          </button>
        </div>
      </div>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.title}</div>
      {item.preview && <div style={{ fontSize:11, opacity:0.5, lineHeight:1.4, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, marginBottom:8 }}>{item.preview}</div>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:`${meta.color}20`, color:meta.color, fontWeight:700 }}>{meta.label}</span>
        <span style={{ fontSize:10, opacity:0.4 }}>{timeAgo(item.updated)}</span>
      </div>
      {menu && (
        <div style={{ position:'absolute', top:10, right:30, zIndex:50, background:'rgba(20,20,30,0.95)', backdropFilter:'blur(12px)', borderRadius:10, padding:6, border:'1px solid rgba(255,255,255,0.1)', minWidth:140, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }} onClick={e=>e.stopPropagation()}>
          {(item.type==='note'||item.type==='code') && <MenuItem icon={<ArrowRight size={12}/>} label="Open" onClick={()=>{open();setMenu(false)}}/>}
          <MenuItem icon={<Package size={12}/>} label="Add to Workspace" onClick={()=>{onAssign();setMenu(false)}}/>
        </div>
      )}
    </Glass>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'6px 10px', background:'none', border:'none', cursor:'pointer', borderRadius:7, fontSize:12, color: danger?'#ff453a':'inherit', textAlign:'left', transition:'background 0.1s' }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      {icon} {label}
    </button>
  )
}

// ── Workspace card ────────────────────────────────────────────────
function WorkspaceCard({ ws, active, onSelect, onEdit, onDelete, itemCount }: {
  ws: Workspace; active: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void; itemCount: number
}) {
  const t = useTheme()
  return (
    <Glass hover glow={active} style={{ padding:16, cursor:'pointer', border: active?`1.5px solid ${ws.color}`:'1px solid rgba(255,255,255,0.08)', position:'relative', overflow:'visible' }} onDoubleClick={onSelect}>
      {active && <div style={{ position:'absolute', top:-1, left:0, right:0, height:2, background:ws.color, borderRadius:'2px 2px 0 0', boxShadow:`0 0 10px ${ws.color}` }}/>}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${ws.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:`1px solid ${ws.color}44`, boxShadow: active?`0 0 16px ${ws.color}44`:'none' }}>
          {ws.icon}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button onClick={e=>{e.stopPropagation();onEdit()}} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.35, padding:4, borderRadius:6, color:'inherit' }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.35'}><Edit3 size={12}/></button>
          {ws.id !== 'default' && <button onClick={e=>{e.stopPropagation();onDelete()}} style={{ background:'none', border:'none', cursor:'pointer', color:'#ff453a', opacity:0.35, padding:4, borderRadius:6 }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.35'}><Trash2 size={12}/></button>}
        </div>
      </div>
      <div style={{ fontSize:14, fontWeight:800, marginBottom:3, color: active?ws.color:'inherit' }}>{ws.icon} {ws.name}</div>
      {ws.description && <div style={{ fontSize:11, opacity:0.5, marginBottom:8, lineHeight:1.4 }}>{ws.description}</div>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, opacity:0.5 }}>{itemCount} item{itemCount!==1?'s':''}</span>
        <button onClick={e=>{e.stopPropagation();onSelect()}} style={{ padding:'4px 10px', borderRadius:7, background: active?ws.color:`${ws.color}22`, border:`1px solid ${ws.color}44`, cursor:'pointer', fontSize:11, fontWeight:700, color: active?'#fff':ws.color, transition:'all 0.15s' }}>
          {active?'Active':'Switch'}
        </button>
      </div>
    </Glass>
  )
}

// ── Assign to workspace modal ────────────────────────────────────
function AssignModal({ item, onClose }: { item: FileItem; onClose: () => void }) {
  const t = useTheme()
  const { workspaces, addItemToWorkspace, removeItemFromWorkspace, getWorkspaceForItem } = useWorkspaces()
  const currentWs = getWorkspaceForItem(item.type, item.id)

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <motion.div initial={{scale:0.9,y:20}} animate={{scale:1,y:0}} exit={{scale:0.9,y:20}} onClick={e=>e.stopPropagation()}>
        <Glass style={{ width:360, padding:20 }} glow>
          <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>Add to Workspace</div>
          <div style={{ fontSize:12, opacity:0.5, marginBottom:16 }}>"{item.title}"</div>
          {workspaces.map(ws => {
            const inWs = (ws[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id)
            return (
              <button key={ws.id} onClick={()=>{ inWs ? removeItemFromWorkspace(ws.id,item.type,item.id) : addItemToWorkspace(ws.id,item.type,item.id) }}
                style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'10px 12px', borderRadius:10, background: inWs?`${ws.color}18`:'rgba(255,255,255,0.04)', border:`1px solid ${inWs?ws.color:'rgba(255,255,255,0.08)'}`, cursor:'pointer', marginBottom:6, transition:'all 0.12s' }}>
                <span style={{ fontSize:18 }}>{ws.icon}</span>
                <span style={{ flex:1, textAlign:'left', fontSize:13, fontWeight:600, color: inWs?ws.color:'inherit' }}>{ws.name}</span>
                {inWs && <Check size={14} style={{ color:ws.color }}/>}
              </button>
            )
          })}
          <button onClick={onClose} style={{ width:'100%', padding:'8px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit', marginTop:8 }}>Done</button>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
export function FilesView() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { notes, codes, tasks, reminders } = useApp()
  const { workspaces, activeWorkspaceId, setActive, addWorkspace, updateWorkspace, delWorkspace } = useWorkspaces()

  const [search,      setSearch]      = useState('')
  const [typeFilter,  setTypeFilter]  = useState<'all'|ItemType>('all')
  const [viewMode,    setViewMode]    = useState<ViewMode>('grid')
  const [tab,         setTab]         = useState<'all'|'workspaces'>('all')
  const [newWsOpen,   setNewWsOpen]   = useState(false)
  const [editWs,      setEditWs]      = useState<Workspace|null>(null)
  const [assignItem,  setAssignItem]  = useState<FileItem|null>(null)

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId)

  // Build unified file list
  const allItems = useMemo((): FileItem[] => {
    const items: FileItem[] = []
    notes.forEach(n => items.push({ id:n.id, title:n.title||'Untitled', type:'note', updated:n.updated||n.created, preview:n.content?.slice(0,80) }))
    codes.forEach(c => items.push({ id:c.id, title:c.name, type:'code', updated:c.updated||c.created, preview:`${c.lang} · ${c.content?.split('\n').length} lines`, lang:c.lang }))
    tasks.forEach(tk => items.push({ id:tk.id, title:tk.title, type:'task', updated:tk.updated||tk.created, preview:tk.desc?.slice(0,60), priority:tk.priority, status:tk.status }))
    reminders.forEach(r => items.push({ id:r.id, title:r.title, type:'reminder', updated:r.datetime, preview:r.msg?.slice(0,60) }))
    return items.sort((a,b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
  }, [notes, codes, tasks, reminders])

  const filtered = useMemo(() => {
    let items = allItems
    if (typeFilter !== 'all') items = items.filter(i => i.type === typeFilter)
    if (search) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.preview?.toLowerCase().includes(search.toLowerCase()))
    if (activeWorkspaceId && tab === 'all') {
      // Show workspace items highlighted, not filtered
    }
    return items
  }, [allItems, typeFilter, search, activeWorkspaceId, tab])

  const wsItems = useMemo(() => {
    if (!activeWs) return filtered
    return filtered.filter(item => {
      const key = `${item.type}Ids` as keyof Workspace
      return (activeWs[key] as string[]).includes(item.id)
    })
  }, [filtered, activeWs])

  const displayItems = tab === 'workspaces' && activeWs ? wsItems : filtered

  const getItemWsColor = (item: FileItem) => {
    const ws = workspaces.find(w => (w[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id))
    return ws?.color
  }

  const wsItemCount = (ws: Workspace) =>
    ws.noteIds.length + ws.codeIds.length + ws.taskIds.length + ws.reminderIds.length

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      {/* ── Left: Workspace panel ────────────────────────── */}
      <div style={{ width:260, flexShrink:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.12)', overflow:'hidden' }}>
        <div style={{ padding:'14px 12px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:1 }}>Workspaces</div>
            <div style={{ fontSize:10, opacity:0.4 }}>{workspaces.length} workspace{workspaces.length!==1?'s':''}</div>
          </div>
          <button onClick={()=>setNewWsOpen(true)} style={{ width:28, height:28, borderRadius:8, background:`rgba(${rgb},0.15)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.12s' }}
            onMouseEnter={e=>e.currentTarget.style.background=`rgba(${rgb},0.25)`} onMouseLeave={e=>e.currentTarget.style.background=`rgba(${rgb},0.15)`}>
            <Plus size={14}/>
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'4px 10px 12px' }}>
          {/* All Files */}
          <button onClick={()=>{setActive(null);setTab('all')}}
            style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:10, marginBottom:4, background: !activeWorkspaceId?`rgba(${rgb},0.12)`:'transparent', border: !activeWorkspaceId?`1px solid rgba(${rgb},0.2)`:'1px solid transparent', cursor:'pointer', transition:'all 0.12s', color:'inherit' }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🗂️</div>
            <div style={{ flex:1, textAlign:'left' }}>
              <div style={{ fontSize:13, fontWeight:700, color: !activeWorkspaceId?t.accent:'inherit' }}>All Files</div>
              <div style={{ fontSize:10, opacity:0.45 }}>{allItems.length} items</div>
            </div>
          </button>

          <div style={{ fontSize:10, fontWeight:800, opacity:0.35, textTransform:'uppercase', letterSpacing:1, padding:'8px 4px 4px' }}>My Workspaces</div>

          {workspaces.map(ws => (
            <button key={ws.id} onClick={()=>{setActive(ws.id);setTab('workspaces')}}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:10, marginBottom:4, background: activeWorkspaceId===ws.id?`${ws.color}18`:'transparent', border: activeWorkspaceId===ws.id?`1px solid ${ws.color}44`:'1px solid transparent', cursor:'pointer', transition:'all 0.12s', color:'inherit', position:'relative' }}>
              {activeWorkspaceId===ws.id && <div style={{ position:'absolute', left:0, top:'50%', transform:'translateY(-50%)', width:3, height:'60%', borderRadius:2, background:ws.color, boxShadow:`0 0 8px ${ws.color}` }}/>}
              <div style={{ width:34, height:34, borderRadius:9, background:`${ws.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${ws.color}33` }}>
                {ws.icon}
              </div>
              <div style={{ flex:1, textAlign:'left', minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: activeWorkspaceId===ws.id?ws.color:'inherit' }}>{ws.name}</div>
                <div style={{ fontSize:10, opacity:0.45 }}>{wsItemCount(ws)} items</div>
              </div>
              <button onClick={e=>{e.stopPropagation();setEditWs(ws)}} style={{ background:'none', border:'none', cursor:'pointer', opacity:0, padding:3, borderRadius:5, color:'inherit', transition:'opacity 0.1s' }}
                onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0'}><Edit3 size={11}/></button>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: File list ──────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
          {activeWs ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
              <span style={{ fontSize:20 }}>{activeWs.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:activeWs.color }}>{activeWs.name}</div>
                {activeWs.description && <div style={{ fontSize:11, opacity:0.5 }}>{activeWs.description}</div>}
              </div>
            </div>
          ) : (
            <div style={{ fontSize:14, fontWeight:800, flex:1 }}>All Files</div>
          )}

          <div style={{ position:'relative' }}>
            <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ padding:'6px 10px 6px 28px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit', width:180 }}/>
          </div>

          <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
            {(['all','note','code','task','reminder'] as const).map(f => (
              <button key={f} onClick={()=>setTypeFilter(f)} style={{ padding:'5px 9px', background:typeFilter===f?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:10, fontWeight:700, color:typeFilter===f?'#fff':'inherit', opacity:typeFilter===f?1:0.5, transition:'all 0.12s', textTransform:'capitalize' }}>{f}</button>
            ))}
          </div>

          <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden' }}>
            <button onClick={()=>setViewMode('grid')} style={{ padding:'5px 8px', background:viewMode==='grid'?t.accent:'transparent', border:'none', cursor:'pointer', color:viewMode==='grid'?'#fff':'inherit', display:'flex', alignItems:'center', transition:'all 0.12s' }}><Grid3x3 size={13}/></button>
            <button onClick={()=>setViewMode('list')} style={{ padding:'5px 8px', background:viewMode==='list'?t.accent:'transparent', border:'none', cursor:'pointer', color:viewMode==='list'?'#fff':'inherit', display:'flex', alignItems:'center', transition:'all 0.12s' }}><List size={13}/></button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:'flex', alignItems:'center', gap:16, padding:'6px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.05)', flexShrink:0 }}>
          {[
            { label:'Notes',     val:notes.length,     color:'#007AFF' },
            { label:'Code',      val:codes.length,     color:'#BF5AF2' },
            { label:'Tasks',     val:tasks.length,     color:'#FF9F0A' },
            { label:'Reminders', val:reminders.length, color:'#FF453A' },
          ].map(s => (
            <div key={s.label} style={{ fontSize:10, display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:s.color }}/>
              <span style={{ opacity:0.5 }}>{s.label}</span>
              <span style={{ fontWeight:700, color:s.color }}>{s.val}</span>
            </div>
          ))}
          <div style={{ flex:1 }}/>
          <span style={{ fontSize:10, opacity:0.4 }}>{displayItems.length} item{displayItems.length!==1?'s':''}</span>
        </div>

        {/* Items */}
        <div style={{ flex:1, overflowY:'auto', padding:12 }}>
          {displayItems.length === 0 ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:12, opacity:0.4 }}>
              <Layers size={48} strokeWidth={1} style={{ color:t.accent, opacity:0.4 }}/>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>
                  {activeWs ? `No files in "${activeWs.name}"` : 'No files yet'}
                </div>
                <div style={{ fontSize:12, opacity:0.6 }}>
                  {activeWs ? 'Add files to this workspace via the ⋮ menu on any file' : 'Create notes, code files, tasks, or reminders to see them here'}
                </div>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:10 }}>
              {displayItems.map(item => (
                <FileCard key={item.id} item={item} viewMode="grid" onAssign={()=>setAssignItem(item)} wsColor={getItemWsColor(item)} />
              ))}
            </div>
          ) : (
            <div>
              {displayItems.map(item => (
                <FileCard key={item.id} item={item} viewMode="list" onAssign={()=>setAssignItem(item)} wsColor={getItemWsColor(item)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {newWsOpen && <WorkspaceModal key="new" onClose={()=>setNewWsOpen(false)} />}
        {editWs    && <WorkspaceModal key={editWs.id} ws={editWs} onClose={()=>setEditWs(null)} />}
        {assignItem && <AssignModal key={assignItem.id} item={assignItem} onClose={()=>setAssignItem(null)} />}
      </AnimatePresence>
    </div>
  )
}
