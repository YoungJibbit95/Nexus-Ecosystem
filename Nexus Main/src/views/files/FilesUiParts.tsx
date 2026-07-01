import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Plus, Edit3, Trash2, ArrowRight, Package, MoreVertical } from 'lucide-react'
import { Glass } from '../../components/Glass'
import { InteractiveIconButton } from '../../components/render/InteractiveIconButton'
import { SurfaceHighlight } from '../../components/render/SurfaceHighlight'
import { useTheme } from '../../store/themeStore'
import { useWorkspaces, Workspace } from '../../store/workspaceStore'
import { useApp } from '../../store/appStore'
import { hexToRgb } from '../../lib/utils'
import { useInteractiveSurfaceMotion } from '../../render/useInteractiveSurfaceMotion'
import { ICONS, COLORS, TYPE_META, ViewMode, FileItem } from './filesTypes'

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`nx-interactive nx-bounce-target nx-files-menu-item ${danger ? 'is-danger' : ''}`}
      type="button"
    >
      {icon} {label}
    </button>
  )
}

export function WorkspaceModal({ ws, onClose }: { ws?: Workspace; onClose: () => void }) {
  const { addWorkspace, updateWorkspace } = useWorkspaces()
  const [name, setName] = useState(ws?.name ?? '')
  const [icon, setIcon] = useState(ws?.icon ?? ICONS[0] ?? 'Home')
  const [color, setColor] = useState(ws?.color ?? '#007AFF')
  const [desc, setDesc] = useState(ws?.description ?? '')

  const save = () => {
    if (!name.trim()) return
    ws ? updateWorkspace(ws.id, { name, icon, color, description: desc }) : addWorkspace(name, icon, color, desc)
    onClose()
  }

  return (
    <motion.div
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
      className="nx-files-modal-backdrop"
      onClick={onClose}
    >
      <motion.div initial={{scale:0.94,y:16}} animate={{scale:1,y:0}} exit={{scale:0.94,y:16}} onClick={e=>e.stopPropagation()}>
        <Glass glow style={{ width:420, padding:24, maxWidth:'calc(100vw - 32px)' }}>
          <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>{ws?'Edit Workspace':'New Workspace'}</div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Name</label>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ fontSize:28, minWidth:36, textAlign:'center' }}>{icon}</div>
              <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&save()} placeholder="My Workspace" style={{ flex:1, minWidth:0, padding:'8px 11px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:14, fontWeight:700, color:'inherit' }} />
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>Icon</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {ICONS.map(i => (
                <button key={i} type="button" onClick={()=>setIcon(i)} style={{ width:36, height:36, borderRadius:8, border:`2px solid ${icon===i?color:'rgba(255,255,255,0.1)'}`, background:icon===i?`${color}22`:'transparent', cursor:'pointer', fontSize:18, transition:'all 0.12s' }}>{i}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:0.5 }}>Color</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={()=>setColor(c)} aria-label={`Color ${c}`} style={{ width:28, height:28, borderRadius:'50%', background:c, border:`3px solid ${color===c?'white':'transparent'}`, cursor:'pointer', transition:'all 0.12s', transform:color===c?'scale(1.14)':'none', boxShadow:color===c?`0 0 10px ${c}`:'none' }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Description (optional)</label>
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What's this workspace for?" style={{ width:'100%', padding:'8px 11px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:13, color:'inherit' }} />
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit' }}>Cancel</button>
            <button type="button" onClick={save} style={{ flex:2, padding:'9px', borderRadius:9, background:color, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff', boxShadow:`0 2px 16px ${color}66` }}>
              {ws?'Save':'Create Workspace'}
            </button>
          </div>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

export function FileCard({
  item,
  viewMode,
  onAssign,
  onOpen,
  onSelect,
  selected = false,
  wsColor,
  wsName,
  folderName,
}: {
  item: FileItem
  viewMode: ViewMode
  onAssign: () => void
  onOpen?: (item: FileItem) => void
  onSelect?: (item: FileItem) => void
  selected?: boolean
  wsColor?: string
  wsName?: string
  folderName?: string
}) {
  const meta = TYPE_META[item.type]
  const Icon = meta.icon
  const [menu, setMenu] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(false)
  const { openNote, openCode, setNote, setCode } = useApp()
  const metaRgb = hexToRgb(meta.color)
  const interaction = useInteractiveSurfaceMotion({
    id: `files-card-${item.id}`,
    hovered,
    focused,
    selected: Boolean(menu) || selected,
    pressed,
    surfaceClass: 'utility-surface',
    effectClass: 'status-highlight',
    budgetPriority: menu || selected ? 'high' : 'normal',
    areaHint: viewMode === 'list' ? 96 : 132,
    family: 'content',
  })

  const open = () => {
    if (onOpen) {
      onOpen(item)
      return
    }
    if (item.type === 'note') {
      openNote(item.id)
      setNote(item.id)
    }
    if (item.type === 'code') {
      openCode(item.id)
      setCode(item.id)
    }
  }

  const select = () => {
    onSelect?.(item)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      open()
    }
    if (event.key === ' ') {
      event.preventDefault()
      select()
    }
  }

  const timeAgo = (iso: string) => {
    const d = (Date.now() - new Date(iso).getTime()) / 1000
    if (!Number.isFinite(d)) return 'unknown'
    if (d < 60) return 'just now'
    if (d < 3600) return `${Math.floor(d/60)}m ago`
    if (d < 86400) return `${Math.floor(d/3600)}h ago`
    return `${Math.floor(d/86400)}d ago`
  }

  const cardStyle = {
    '--files-card-color': meta.color,
    '--files-card-rgb': metaRgb,
    '--files-workspace-color': wsColor || meta.color,
  } as React.CSSProperties

  const menuNode = menu ? (
    <div className="nx-files-menu nx-files-card-menu" onClick={e=>e.stopPropagation()}>
      <MenuItem icon={<ArrowRight size={12}/>} label="Open" onClick={()=>{open();setMenu(false)}}/>
      <MenuItem icon={<Package size={12}/>} label="Add to Workspace" onClick={()=>{onAssign();setMenu(false)}}/>
    </div>
  ) : null

  return (
    <motion.div
      className={`nx-motion-managed nx-files-card nx-files-card--${viewMode} ${selected ? 'is-selected' : ''}`}
      animate={interaction.content.animate}
      transition={interaction.content.transition}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        setPressed(false)
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => {
        setFocused(false)
        setPressed(false)
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={select}
      onDoubleClick={open}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      style={cardStyle}
    >
      <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={10}>
        <div className="nx-files-card-highlight" />
      </SurfaceHighlight>

      <div className="nx-files-card-top">
        <div className="nx-files-card-icon">
          <Icon size={viewMode === 'list' ? 15 : 17}/>
        </div>
        <div className="nx-files-card-actions">
          {wsColor && <div className="nx-files-card-workspace-dot" title={wsName || 'In workspace'}/>}
          {viewMode === 'list' ? (
            <>
              <span className="nx-files-card-time">{timeAgo(item.updated)}</span>
              <span className="nx-files-card-type">{meta.label}</span>
            </>
          ) : null}
          <InteractiveIconButton
            motionId={`files-card-menu-${item.id}`}
            onClick={(e) => { e.stopPropagation(); setMenu((m) => !m) }}
            idleOpacity={0.62}
            radius={6}
            className="nx-files-card-menu-trigger"
            aria-label={`Actions for ${item.title}`}
          >
            <MoreVertical size={14}/>
          </InteractiveIconButton>
          {menuNode}
        </div>
      </div>

      <div className="nx-files-card-main">
        <div className="nx-files-card-title">{item.title}</div>
        {item.preview && (
          <div className={`nx-files-card-preview ${viewMode === 'grid' ? 'nx-files-card-preview--grid' : ''}`}>
            {item.preview}
          </div>
        )}
        <div className="nx-files-card-badges">
          {folderName ? <span>{folderName}</span> : null}
          {wsName ? <span>{wsName}</span> : <span>Unassigned</span>}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="nx-files-card-bottom">
          <span className="nx-files-card-type">{meta.label}</span>
          <span className="nx-files-card-time">{timeAgo(item.updated)}</span>
        </div>
      ) : null}
    </motion.div>
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
          <InteractiveIconButton
            motionId={`workspace-edit-${ws.id}`}
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            idleOpacity={0.35}
            radius={6}
            style={{ padding:4 }}
          >
            <Edit3 size={12}/>
          </InteractiveIconButton>
          {ws.id !== 'default' && (
            <InteractiveIconButton
              motionId={`workspace-delete-${ws.id}`}
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              intent="danger"
              idleOpacity={0.35}
              radius={6}
              style={{ padding:4 }}
            >
              <Trash2 size={12}/>
            </InteractiveIconButton>
          )}
        </div>
      </div>
      <div style={{ fontSize:14, fontWeight:800, marginBottom:3, color: active?ws.color:'inherit' }}>{ws.icon} {ws.name}</div>
      {ws.description && <div style={{ fontSize:11, opacity:0.5, marginBottom:8, lineHeight:1.4 }}>{ws.description}</div>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, opacity:0.5 }}>{itemCount} item{itemCount!==1?'s':''}</span>
        <button type="button" onClick={e=>{e.stopPropagation();onSelect()}} style={{ padding:'4px 10px', borderRadius:7, background: active?ws.color:`${ws.color}22`, border:`1px solid ${ws.color}44`, cursor:'pointer', fontSize:11, fontWeight:700, color: active?'#fff':ws.color, transition:'all 0.15s' }}>
          {active?'Active':'Switch'}
        </button>
      </div>
    </Glass>
  )
}

export function AssignModal({ item, onClose }: { item: FileItem; onClose: () => void }) {
  const { workspaces, addItemToWorkspace, removeItemFromWorkspace } = useWorkspaces()

  return (
    <motion.div
      initial={{opacity:0}}
      animate={{opacity:1}}
      exit={{opacity:0}}
      className="nx-files-modal-backdrop"
      onClick={onClose}
    >
      <motion.div initial={{scale:0.94,y:16}} animate={{scale:1,y:0}} exit={{scale:0.94,y:16}} onClick={e=>e.stopPropagation()}>
        <Glass style={{ width:360, padding:20, maxWidth:'calc(100vw - 32px)' }} glow>
          <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>Add to Workspace</div>
          <div style={{ fontSize:12, opacity:0.5, marginBottom:16 }}>"{item.title}"</div>
          {workspaces.map(ws => {
            const inWs = (ws[`${item.type}Ids` as keyof Workspace] as string[]).includes(item.id)
            return (
              <button key={ws.id} type="button" onClick={()=>{ inWs ? removeItemFromWorkspace(ws.id,item.type,item.id) : addItemToWorkspace(ws.id,item.type,item.id) }}
                style={{ display:'flex', alignItems:'center', gap:12, width:'100%', padding:'10px 12px', borderRadius:10, background: inWs?`${ws.color}18`:'rgba(255,255,255,0.04)', border:`1px solid ${inWs?ws.color:'rgba(255,255,255,0.08)'}`, cursor:'pointer', marginBottom:6, transition:'all 0.12s', color:'inherit' }}>
                <span style={{ fontSize:18 }}>{ws.icon}</span>
                <span style={{ flex:1, textAlign:'left', fontSize:13, fontWeight:600, color: inWs?ws.color:'inherit' }}>{ws.name}</span>
                {inWs && <Check size={14} style={{ color:ws.color }}/>}
              </button>
            )
          })}
          <button type="button" onClick={onClose} style={{ width:'100%', padding:'8px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit', marginTop:8 }}>Done</button>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

export function WorkspaceCreateButton({ onClick }: { onClick: () => void }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  return (
    <button
      type="button"
      onClick={onClick}
      className="nx-interactive nx-bounce-target"
      style={{ width:28, height:28, borderRadius:8, background:`rgba(${rgb},0.15)`, border:`1px solid rgba(${rgb},0.25)`, color:t.accent, display:'flex', alignItems:'center', justifyContent:'center' }}
    >
      <Plus size={14}/>
    </button>
  )
}
