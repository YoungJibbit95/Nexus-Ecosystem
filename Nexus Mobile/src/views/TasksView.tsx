import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Plus, Trash2, X, Search, CheckSquare, Edit3, Calendar, Tag, Flag, Filter,
  ChevronDown, BarChart2, Clock, Link, Maximize2, Hash, AlertCircle, Check, Pin } from 'lucide-react'
import { Glass } from '../components/Glass'
import { InteractiveIconButton } from '../components/render/InteractiveIconButton'
import { SurfaceHighlight } from '../components/render/SurfaceHighlight'
import { ViewHeader } from '../components/ViewHeader'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp, Task } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import { useInteractiveSurfaceMotion } from '../render/useInteractiveSurfaceMotion'
import { useRenderSurfaceBudget } from '../render/useRenderSurfaceBudget'
import { useSurfaceMotionRuntime } from '../render/useSurfaceMotionRuntime'
import { motion, AnimatePresence } from 'framer-motion'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { shallow } from 'zustand/shallow'

const PRIORITY_COLOR = { low: '#30d158', mid: '#ffd60a', high: '#ff453a' }
const PRIORITY_LABEL = { low: 'Low', mid: 'Medium', high: 'High' }
const COLS: { id: 'todo'|'doing'|'done'; label: string; emoji: string; color: string }[] = [
  { id: 'todo',  label: 'To Do',       emoji: '📋', color: '#007AFF' },
  { id: 'doing', label: 'In Progress', emoji: '⚡', color: '#FF9F0A' },
  { id: 'done',  label: 'Done',        emoji: '✅', color: '#30D158' },
]

// ── Stats bar ────────────────────────────────────────────────────
function StatsBar({ tasks }: { tasks: Task[] }) {
  const t = useTheme()
  const total    = tasks.length
  const done     = tasks.filter(t => t.status === 'done').length
  const overdue  = tasks.filter(tk => tk.deadline && new Date(tk.deadline) < new Date() && tk.status !== 'done').length
  const high     = tasks.filter(tk => tk.priority === 'high' && tk.status !== 'done').length
  const pct      = total ? Math.round((done / total) * 100) : 0
  const rgb      = hexToRgb(t.accent)

  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'8px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.1)', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
        <div style={{ height:5, flex:1, borderRadius:3, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', borderRadius:3, background:`linear-gradient(90deg, ${t.accent}, ${t.accent2})`, transition:'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:t.accent, minWidth:30 }}>{pct}%</span>
      </div>
      {[
        { label:'Total', val:total, color:'inherit' },
        { label:'Done',  val:done,  color:'#30d158' },
        { label:'Overdue', val:overdue, color: overdue>0?'#ff453a':'inherit' },
        { label:'High pri', val:high, color: high>0?'#ff9f0a':'inherit' },
      ].map(s => (
        <div key={s.label} style={{ textAlign:'center', fontSize:10 }}>
          <div style={{ fontWeight:800, fontSize:15, color:s.color, lineHeight:1 }}>{s.val}</div>
          <div style={{ opacity:0.45, marginTop:2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Task card ────────────────────────────────────────────────────
function TaskCard({ tk, onEdit, onDelete }: { tk: Task; onEdit: () => void; onDelete: () => void }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [mobileCol, setMobileCol] = useState<'todo'|'doing'|'done'>('todo')
  const [, drag] = useDrag({ type: 'TASK', item: tk })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(false)
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-tasks-card-${tk.id}`,
    hovered,
    focused,
    selected: tk.status === 'doing',
    pressed,
    surfaceClass: 'panel-surface',
    effectClass: 'status-highlight',
    budgetPriority: tk.status === 'doing' ? 'high' : 'normal',
    areaHint: 144,
    family: 'content',
  })
  const isOverdue = tk.deadline && new Date(tk.deadline) < new Date() && tk.status !== 'done'
  const subDone  = (tk.subtasks||[]).filter(s=>s.done).length
  const subTotal = (tk.subtasks||[]).length

  return (
    <div ref={drag as any} style={{ cursor:'grab', marginBottom:8 }}>
      <motion.div
        className="nx-motion-managed"
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
      >
      <Glass glow style={{ padding:'11px 13px', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
        onDoubleClick={onEdit}>
        <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={10}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 10,
              border: `1px solid rgba(${rgb},0.22)`,
              background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.18), rgba(${rgb},0.06) 68%, rgba(${rgb},0.02) 100%)`,
            }}
          />
        </SurfaceHighlight>
        <div style={{ display:'flex', gap:10 }}>
          {/* Priority stripe */}
          <div style={{ width:3, borderRadius:2, background:PRIORITY_COLOR[tk.priority], flexShrink:0, alignSelf:'stretch' }} />
          <div style={{ flex:1, minWidth:0 }}>
            {/* Title row */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, lineHeight:1.4, opacity: tk.status==='done'?0.45:1, textDecoration: tk.status==='done'?'line-through':undefined }}>
                {tk.title}
              </span>
              <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                <InteractiveIconButton motionId={`task-edit-${tk.id}`} onClick={onEdit} idleOpacity={0.35} radius={4}>
                  <Edit3 size={11}/>
                </InteractiveIconButton>
                <InteractiveIconButton motionId={`task-delete-${tk.id}`} onClick={onDelete} intent="danger" idleOpacity={0.35} radius={4}>
                  <Trash2 size={11}/>
                </InteractiveIconButton>
              </div>
            </div>

            {/* Desc */}
            {tk.desc && <div style={{ fontSize:11.5, opacity:0.6, marginTop:4, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{tk.desc}</div>}

            {/* Meta row */}
            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, marginTop:7 }}>
              {/* Deadline */}
              {tk.deadline && (
                <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background: isOverdue?'rgba(255,69,58,0.15)':'rgba(255,255,255,0.07)', color: isOverdue?'#ff453a':'inherit', border: isOverdue?'1px solid rgba(255,69,58,0.3)':'1px solid transparent' }}>
                  <Calendar size={9}/> {new Date(tk.deadline).toLocaleDateString()}
                  {isOverdue && ' ⚠️'}
                </span>
              )}
              {/* Subtasks */}
              {subTotal > 0 && (
                <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background: subDone===subTotal?'rgba(48,209,88,0.12)':'rgba(255,255,255,0.07)', color: subDone===subTotal?'#30d158':'inherit' }}>
                  <CheckSquare size={9}/> {subDone}/{subTotal}
                </span>
              )}
              {/* Tags */}
              {(tk.tags||[]).map(tag => (
                <span key={tag} style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:`rgba(${rgb},0.12)`, color:t.accent, border:`1px solid rgba(${rgb},0.2)` }}>#{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </Glass>
      </motion.div>
    </div>
  )
}

// ── Drop column ──────────────────────────────────────────────────
function DropCol({ id, children }: { id: string; children: React.ReactNode }) {
  const moveTask = useApp((s) => s.moveTask)
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (tk: Task) => { if (tk.status !== id) moveTask(tk.id, id as any) },
    collect: m => ({ isOver: m.isOver() }),
  })
  return (
    <div ref={drop as any} style={{ flex:1, transition:'background 0.15s', borderRadius:12, background: isOver?'rgba(255,255,255,0.04)':'transparent', padding:'2px' }}>
      {children}
    </div>
  )
}

// ── Edit/Create modal ────────────────────────────────────────────
function TaskModal({ task, onClose, status }: { task?: Task; onClose: () => void; status?: 'todo'|'doing'|'done' }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [mobileCol, setMobileCol] = useState<'todo'|'doing'|'done'>('todo')
  const { addTask, updateTask, addSubtask, toggleSubtask } = useApp((s) => ({
    addTask: s.addTask,
    updateTask: s.updateTask,
    addSubtask: s.addSubtask,
    toggleSubtask: s.toggleSubtask,
  }), shallow)
  const [title,    setTitle]    = useState(task?.title ?? '')
  const [desc,     setDesc]     = useState(task?.desc ?? '')
  const [priority, setPriority] = useState<'low'|'mid'|'high'>(task?.priority ?? 'low')
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.split('T')[0] : '')
  const [tagInput, setTagInput] = useState('')
  const [tags,     setTags]     = useState<string[]>(task?.tags ?? [])
  const [notes,    setNotes]    = useState((task as any)?.notes ?? '')
  const [tab,      setTab]      = useState<'details'|'subtasks'|'notes'>('details')
  const subRef = useRef<HTMLInputElement>(null)
  const modalDecision = useRenderSurfaceBudget({
    id: `tasks-modal-${task?.id ?? status ?? 'new'}`,
    surfaceClass: 'modal-surface',
    effectClass: 'backdrop',
    interactionState: 'active',
    visibilityState: 'visible',
    budgetPriority: 'high',
    areaHint: 220,
    motionClassHint: 'sheet',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'surface',
    opacityOwnerHint: 'surface',
  })
  const modalRuntime = useSurfaceMotionRuntime(modalDecision, { family: 'sheet' })
  const overlayTransition = {
    duration: Math.max(0.12, modalRuntime.timings.quickMs / 1000),
    ease: modalRuntime.timings.framerEase,
  }
  const panelTransition = {
    duration: Math.max(0.16, modalRuntime.timings.regularMs / 1000),
    ease: modalRuntime.timings.framerEase,
  }
  const panelInitial =
    modalRuntime.allowEntry && modalRuntime.capability !== 'static-safe'
      ? { scale: 0.94, y: 16, opacity: 0.78 }
      : { scale: 0.985, y: 6, opacity: 0.9 }

  const save = () => {
    if (!title.trim()) return
    if (task) {
      updateTask(task.id, { title, desc, priority, deadline: deadline||undefined, tags, notes } as any)
    } else {
      addTask(title, status || 'todo', desc, priority)
    }
    onClose()
  }

  const addTag = () => {
    const t2 = tagInput.trim().replace(/^#/,'')
    if (t2 && !tags.includes(t2)) setTags(ts => [...ts, t2])
    setTagInput('')
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={overlayTransition}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <motion.div initial={panelInitial} animate={{scale:1,y:0,opacity:1}} exit={panelInitial} transition={panelTransition} onClick={e=>e.stopPropagation()}
        style={{ width:480, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
        <Glass glow style={{ padding:0, display:'flex', flexDirection:'column', maxHeight:'85vh' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
            <div style={{ fontSize:15, fontWeight:800 }}>{task ? 'Edit Task' : 'New Task'}</div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.5, color:'inherit', padding:4, borderRadius:6 }}><X size={16}/></button>
          </div>

          {/* Title + priority */}
          <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
            <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task title…" style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:14, fontWeight:600, color:'inherit', marginBottom:10 }} />
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {(['low','mid','high'] as const).map(p => (
                <button key={p} onClick={()=>setPriority(p)} style={{ flex:1, padding:'6px 0', borderRadius:8, border:`1px solid ${priority===p?PRIORITY_COLOR[p]:'rgba(255,255,255,0.1)'}`, background: priority===p?`${PRIORITY_COLOR[p]}22`:'transparent', cursor:'pointer', fontSize:11, fontWeight:700, color: priority===p?PRIORITY_COLOR[p]:'inherit', transition:'all 0.12s' }}>
                  <Flag size={10} className="inline mr-1"/>  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, padding:'0 20px' }}>
            {(['details','subtasks','notes'] as const).map(tab2 => (
              <button key={tab2} onClick={()=>setTab(tab2)} style={{ padding:'7px 14px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:tab===tab2?t.accent:'inherit', opacity:tab===tab2?1:0.45, borderBottom:`2px solid ${tab===tab2?t.accent:'transparent'}`, transition:'all 0.12s', marginBottom:-1 }}>
                {tab2}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {tab === 'details' && (
              <div style={{ flex:1, overflowY:'auto', padding:'14px 20px' }}>
                <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Description</label>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Add a description…" rows={3} style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit', resize:'vertical', fontFamily:'inherit', marginBottom:14 }} />

                <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Deadline</label>
                <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit', marginBottom:14, colorScheme: t.mode==='dark'?'dark':'light' }} />

                <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Tags</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
                  {tags.map(tg => (
                    <span key={tg} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, padding:'3px 9px', borderRadius:20, background:`rgba(${rgb},0.14)`, color:t.accent, border:`1px solid rgba(${rgb},0.25)` }}>
                      #{tg}
                      <button onClick={()=>setTags(ts=>ts.filter(t=>t!==tg))} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:0.6, padding:0, display:'flex' }}><X size={9}/></button>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTag()}}} placeholder="#tag" style={{ flex:1, padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }} />
                  <button onClick={addTag} style={{ padding:'7px 12px', borderRadius:8, background:t.accent, border:'none', cursor:'pointer', color:'#fff', fontSize:12, fontWeight:700 }}>Add</button>
                </div>
              </div>
            )}

            {tab === 'subtasks' && (
              <div style={{ flex:1, overflowY:'auto', padding:'14px 20px' }}>
                {task && (task.subtasks||[]).map(st => (
                  <div key={st.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:4, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={()=>toggleSubtask(task.id, st.id)} style={{ width:18, height:18, borderRadius:5, border:`2px solid ${st.done?t.accent:'rgba(255,255,255,0.25)'}`, background:st.done?t.accent:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.12s' }}>
                      {st.done && <Check size={10} color="#fff"/>}
                    </button>
                    <span style={{ flex:1, fontSize:13, opacity:st.done?0.4:0.85, textDecoration:st.done?'line-through':undefined }}>{st.title}</span>
                    <InteractiveIconButton
                      motionId={`task-sub-delete-${task.id}-${st.id}`}
                      intent="danger"
                      idleOpacity={0.4}
                      radius={4}
                      style={{ padding: 2 }}
                      onClick={()=>task&&updateTask(task.id,{subtasks:task.subtasks.filter(s=>s.id!==st.id)})}
                    >
                      <Trash2 size={11}/>
                    </InteractiveIconButton>
                  </div>
                ))}
                {task && (
                  <input ref={subRef} placeholder="New subtask… (Enter)" style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit' }}
                    onKeyDown={e=>{if(e.key==='Enter'&&e.currentTarget.value.trim()){addSubtask(task.id,e.currentTarget.value.trim());e.currentTarget.value=''}}} />
                )}
                {!task && <div style={{ textAlign:'center', padding:20, fontSize:13, opacity:0.4 }}>Save the task first to add subtasks</div>}
              </div>
            )}

            {tab === 'notes' && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Markdown notes for this task…" style={{ flex:1, width:'100%', padding:'14px 20px', background:'transparent', border:'none', outline:'none', fontSize:13, color:'inherit', resize:'none', fontFamily:"'Fira Code',monospace", lineHeight:1.6 }} />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display:'flex', gap:8, padding:'12px 20px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <button onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit' }}>Cancel</button>
            <button onClick={save} style={{ flex:2, padding:'9px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff', boxShadow:`0 2px 14px rgba(${rgb},0.4)` }}>
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function TasksView() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const [mobileCol, setMobileCol] = useState<'todo'|'doing'|'done'>('todo')
  const { tasks, addTask, updateTask, delTask, moveTask, addSubtask, toggleSubtask } = useApp((s) => ({
    tasks: s.tasks,
    addTask: s.addTask,
    updateTask: s.updateTask,
    delTask: s.delTask,
    moveTask: s.moveTask,
    addSubtask: s.addSubtask,
    toggleSubtask: s.toggleSubtask,
  }), shallow)

  const [search,     setSearch]    = useState('')
  const [editId,     setEditId]    = useState<string|null>(null)
  const [newStatus,  setNewStatus] = useState<'todo'|'doing'|'done'|null>(null)
  const [filterPri,  setFilterPri] = useState<string[]>([])
  const [filterTag,  setFilterTag] = useState('')
  const [filterPanel,setFilterPanel] = useState(false)
  const [showDone,   setShowDone]  = useState(true)
  const filterPanelDecision = useRenderSurfaceBudget({
    id: 'tasks-filter-panel',
    surfaceClass: 'panel-surface',
    effectClass: 'status-highlight',
    interactionState: filterPanel ? 'active' : 'idle',
    visibilityState: filterPanel ? 'visible' : 'hidden',
    budgetPriority: filterPanel ? 'high' : 'low',
    areaHint: 180,
    motionClassHint: 'status',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'none',
    opacityOwnerHint: 'surface',
  })
  const filterPanelRuntime = useSurfaceMotionRuntime(filterPanelDecision, {
    family: 'status',
  })

  const allTags = useMemo(() => {
    const s = new Set<string>()
    tasks.forEach(tk => (tk.tags||[]).forEach(tg => s.add(tg)))
    return Array.from(s)
  }, [tasks])

  const filtered = useMemo(() => {
    let ts = tasks
    if (search) ts = ts.filter(tk => tk.title.toLowerCase().includes(search.toLowerCase()) || tk.desc?.toLowerCase().includes(search.toLowerCase()))
    if (filterPri.length) ts = ts.filter(tk => filterPri.includes(tk.priority))
    if (filterTag) ts = ts.filter(tk => (tk.tags||[]).includes(filterTag))
    return ts
  }, [tasks, search, filterPri, filterTag])

  const editTask = tasks.find(tk => tk.id === editId)
  const dueSoon = useMemo(() => tasks.filter(tk => tk.deadline && tk.status !== 'done' && new Date(tk.deadline).getTime() - Date.now() < 48 * 3600 * 1000 && new Date(tk.deadline).getTime() > Date.now()).length, [tasks])
  const doingCount = useMemo(() => tasks.filter(tk => tk.status === 'doing').length, [tasks])

  const quickAdd = (kind: 'today' | 'bug' | 'focus') => {
    if (kind === 'today') addTask('Heute: Wichtigste Aufgabe', 'todo', 'Tagesfokus', 'mid')
    if (kind === 'bug') addTask('Hotfix / Bugfix', 'todo', 'Reproduzieren, fixen, testen', 'high')
    if (kind === 'focus') addTask('Deep Work Block', 'doing', '90 Minuten Fokus ohne Kontextwechsel', 'mid')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        <div style={{ padding: mob.isMobile ? '10px 10px 0' : '10px 14px 0' }}>
          <ViewHeader
            title="Tasks"
            subtitle={`${tasks.filter(t => t.status !== 'done').length} offen · ${tasks.filter(t => t.status === 'done').length} erledigt`}
          />
        </div>

        {/* ── Toolbar ── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
          <div style={{ position:'relative', flex:1, maxWidth:300 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tasks…" style={{ width:'100%', padding:'7px 10px 7px 32px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }}/>
          </div>
          <button onClick={()=>setFilterPanel(s=>!s)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 11px', borderRadius:9, background: filterPanel||filterPri.length||filterTag?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${filterPanel||filterPri.length||filterTag?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', fontSize:12, color: filterPri.length||filterTag?t.accent:'inherit', fontWeight:600 }}>
            <Filter size={12}/> Filter {filterPri.length||filterTag?`(${filterPri.length+(filterTag?1:0)})`:''}</button>
          <button onClick={()=>setShowDone(s=>!s)} style={{ padding:'7px 11px', borderRadius:9, background:!showDone?`rgba(${rgb},0.12)`:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:12, color:!showDone?t.accent:'inherit' }}>
            {showDone?'Hide Done':'Show Done'}
          </button>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {filterPanel && (
            <motion.div
              initial={{height:0,opacity:0}}
              animate={{height:'auto',opacity:1}}
              exit={{height:0,opacity:0}}
              transition={{
                duration: Math.max(0.12, filterPanelRuntime.timings.regularMs / 1000),
                ease: filterPanelRuntime.timings.framerEase,
              }}
              style={{ overflow:'hidden', flexShrink:0 }}
            >
              <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', flexWrap:'wrap', gap:10, background:'rgba(0,0,0,0.08)' }}>
                <div>
                  <div style={{ fontSize:10, opacity:0.45, marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Priority</div>
                  <div style={{ display:'flex', gap:5 }}>
                    {(['low','mid','high'] as const).map(p => (
                      <button key={p} onClick={()=>setFilterPri(ps=>ps.includes(p)?ps.filter(x=>x!==p):[...ps,p])} style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${filterPri.includes(p)?PRIORITY_COLOR[p]:'rgba(255,255,255,0.1)'}`, background:filterPri.includes(p)?`${PRIORITY_COLOR[p]}20`:'transparent', cursor:'pointer', fontSize:11, color:filterPri.includes(p)?PRIORITY_COLOR[p]:'inherit' }}>
                        {PRIORITY_LABEL[p]}
                      </button>
                    ))}
                  </div>
                </div>
                {allTags.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, opacity:0.45, marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Tag</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {allTags.map(tg => (
                        <button key={tg} onClick={()=>setFilterTag(t=>t===tg?'':tg)} style={{ padding:'4px 9px', borderRadius:7, border:`1px solid ${filterTag===tg?t.accent:'rgba(255,255,255,0.1)'}`, background:filterTag===tg?`rgba(${rgb},0.15)`:'transparent', cursor:'pointer', fontSize:11, color:filterTag===tg?t.accent:'inherit' }}>
                          #{tg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={()=>{setFilterPri([]);setFilterTag('')}} style={{ alignSelf:'flex-end', padding:'4px 10px', borderRadius:7, background:'rgba(255,69,58,0.1)', border:'1px solid rgba(255,69,58,0.2)', cursor:'pointer', fontSize:11, color:'#ff453a' }}>Clear</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <StatsBar tasks={tasks} />

        {/* Workflow strip */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.06)', flexWrap:'wrap' }}>
          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <strong>{dueSoon}</strong> <span style={{ opacity:0.6 }}>Due &lt; 48h</span>
          </span>
          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:doingCount > 5 ? 'rgba(255,69,58,0.14)' : 'rgba(255,255,255,0.06)', border:doingCount > 5 ? '1px solid rgba(255,69,58,0.35)' : '1px solid rgba(255,255,255,0.1)', color:doingCount > 5 ? '#FF453A' : 'inherit' }}>
            <strong>{doingCount}</strong> <span style={{ opacity:0.7 }}>WIP</span>
          </span>
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <button onClick={() => quickAdd('today')} style={{ padding:'5px 9px', borderRadius:8, border:`1px solid rgba(${rgb},0.3)`, background:`rgba(${rgb},0.14)`, color:t.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Today</button>
            <button onClick={() => quickAdd('focus')} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Focus</button>
            <button onClick={() => quickAdd('bug')} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,69,58,0.35)', background:'rgba(255,69,58,0.12)', color:'#FF453A', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Bugfix</button>
          </div>
        </div>

        {/* Board */}
        {/* Mobile: column tabs */}
        {mob.isMobile && (
          <div style={{ display:'flex', gap:0, padding:'0 12px 8px', flexShrink:0 }}>
            {COLS.map(col => {
              const count = filtered.filter(tk => tk.status === col.id).length
              const isActive = mobileCol === col.id
              return (
                <button key={col.id} onClick={()=>setMobileCol(col.id)} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 4px', borderRadius:0, border:'none', borderBottom:`2px solid ${isActive?col.color:'transparent'}`, background:'transparent', cursor:'pointer', color:isActive?col.color:'inherit', fontSize:12, fontWeight:isActive?700:500, transition:'all 0.15s' }}>
                  <span>{col.emoji}</span> {col.label}
                  <span style={{ fontSize:10, padding:'1px 6px', borderRadius:8, background:`rgba(255,255,255,0.08)`, marginLeft:2 }}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        <div style={{ flex:1, display: mob.isMobile ? 'block' : 'flex', gap:12, padding: mob.isMobile ? '0 12px 12px' : 14, overflow:'visible', minHeight:0, overflowY: mob.isMobile ? 'auto' : undefined }}>
          {COLS.filter(col => !mob.isMobile || col.id === mobileCol).map(col => {
            const items = filtered.filter(tk => tk.status === col.id && (showDone || col.id !== 'done'))
            if (!showDone && col.id === 'done') return null
            return (
              <div key={col.id} style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
                {/* Column header */}
                <Glass style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', marginBottom:8, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>{col.emoji}</span>
                    <span style={{ fontSize:13, fontWeight:700 }}>{col.label}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:`${col.color}1a`, color:col.color, fontWeight:700 }}>{items.length}</span>
                  </div>
                  <InteractiveIconButton
                    motionId={`task-col-add-${col.id}`}
                    intent="accent"
                    idleOpacity={0.7}
                    radius={6}
                    style={{ padding: '3px 5px' }}
                    onClick={()=>{setNewStatus(col.id)}}
                  >
                    <Plus size={15}/>
                  </InteractiveIconButton>
                </Glass>

                {/* Cards */}
                <div style={{ flex: mob.isMobile ? undefined : 1, overflowY: mob.isMobile ? 'visible' : 'auto', padding:'4px 8px 10px' }}>
                  <DropCol id={col.id}>
                    {items.length === 0 ? (
                      <div style={{ height:80, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'2px dashed rgba(255,255,255,0.07)', borderRadius:10, fontSize:12, opacity:0.3, gap:5 }}>
                        <span>Drop tasks here</span>
                      </div>
                    ) : items.map(tk => (
                      <TaskCard key={tk.id} tk={tk} onEdit={()=>setEditId(tk.id)} onDelete={()=>delTask(tk.id)} />
                    ))}
                  </DropCol>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {newStatus && <TaskModal key="new" onClose={()=>setNewStatus(null)} status={newStatus} />}
        {editId    && <TaskModal key={editId} task={editTask} onClose={()=>setEditId(null)} />}
      </AnimatePresence>
    </DndProvider>
  )
}
