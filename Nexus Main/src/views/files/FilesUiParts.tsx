import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Plus, Edit3, Trash2, ArrowRight, Package, MoreVertical } from 'lucide-react'
import { Glass } from '../../components/Glass'
import { useTheme } from '../../store/themeStore'
import { useWorkspaces, Workspace } from '../../store/workspaceStore'
import { useApp } from '../../store/appStore'
import { hexToRgb } from '../../lib/utils'
import { ICONS, COLORS, TYPE_META, ViewMode, FileItem } from './filesTypes'

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'6px 10px', background:'none', border:'none', cursor:'pointer', borderRadius:7, fontSize:12, color: danger?'#ff453a':'inherit', textAlign:'left', transition:'background 0.1s' }}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
      {icon} {label}
    </button>
  )
}

export function WorkspaceModal({ ws, onClose }: { ws?: Workspace; onClose: () => void }) {
  const t = useTheme()
  const { addWorkspace, updateWorkspace } = useWorkspaces()
  const [name, setName] = useState(ws?.name ?? '')
  const [icon, setIcon] = useState(ws?.icon ?? '🏠')
  const [color, setColor] = useState(ws?.color ?? '#007AFF')
  const [desc, setDesc] = useState(ws?.description ?? '')

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

export function FileCard({ item, viewMode, onAssign, wsColor }: { item: FileItem; viewMode: ViewMode; onAssign: () => void; wsColor?: string }) {
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

export function WorkspaceCard({ ws, active, onSelect, onEdit, onDelete, itemCount }: {
  ws: Workspace; active: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void; itemCount: number
}) {
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

export function AssignModal({ item, onClose }: { item: FileItem; onClose: () => void }) {
  const { workspaces, addItemToWorkspace, removeItemFromWorkspace } = useWorkspaces()

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

export function WorkspaceCreateButton({ onClick }: { onClick: () => void }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  return (
    <button onClick={onClick} style={{ width:28, height:28, borderRadius:8, background:`rgba(${rgb},0.15)`, border:`1px solid rgba(${rgb},0.25)`, cursor:'pointer', color:t.accent, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.12s' }}
      onMouseEnter={e=>e.currentTarget.style.background=`rgba(${rgb},0.25)`} onMouseLeave={e=>e.currentTarget.style.background=`rgba(${rgb},0.15)`}>
      <Plus size={14}/>
    </button>
  )
}
