import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  Trash2,
  X,
  Search,
  CheckSquare,
  Edit3,
  Calendar,
  Flag,
  Filter,
  Clock,
  Link,
  AlertCircle,
  Check,
  Bell,
  Pin,
  Tag,
} from 'lucide-react'
import { Glass } from '../components/Glass'
import { InteractiveIconButton } from '../components/render/InteractiveIconButton'
import { SurfaceHighlight } from '../components/render/SurfaceHighlight'
import { useApp, Task, Reminder, Note } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { useRenderSurfaceBudget } from '../render/useRenderSurfaceBudget'
import { useInteractiveSurfaceMotion } from '../render/useInteractiveSurfaceMotion'
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

const TASK_WORK_MODES = ['board', 'focus', 'due-soon', 'high-priority', 'blocked'] as const
type TaskWorkMode = typeof TASK_WORK_MODES[number]

const TASK_WORK_MODE_META: Record<TaskWorkMode, { label: string; icon: React.ReactNode }> = {
  board: { label: 'Board', icon: <CheckSquare size={11} /> },
  focus: { label: 'My Day / Focus', icon: <Pin size={11} /> },
  'due-soon': { label: 'Due Soon', icon: <Clock size={11} /> },
  'high-priority': { label: 'High Priority', icon: <Flag size={11} /> },
  blocked: { label: 'Blocked', icon: <AlertCircle size={11} /> },
}

const TASK_MODE_STORAGE_KEY = 'nx-tasks-work-mode-v1'
const DUE_SOON_WINDOW_MS = 48 * 60 * 60 * 1000

const normalizeText = (value: string) => value.trim().toLowerCase()

const parseDeadlineTs = (task: Task) => {
  if (!task.deadline) return null
  const ts = new Date(task.deadline).getTime()
  return Number.isFinite(ts) ? ts : null
}

const isTaskDueSoon = (task: Task, nowMs = Date.now()) => {
  if (task.status === 'done') return false
  const ts = parseDeadlineTs(task)
  return ts !== null && ts > nowMs && ts - nowMs <= DUE_SOON_WINDOW_MS
}

const isTaskOverdue = (task: Task, nowMs = Date.now()) => {
  if (task.status === 'done') return false
  const ts = parseDeadlineTs(task)
  return ts !== null && ts < nowMs
}

const getOpenDependencyCount = (task: Task, taskMap: Map<string, Task>) => {
  const dependencies = task.dependsOnTaskIds || []
  if (!dependencies.length) return 0
  return dependencies.reduce((count, depId) => {
    const dependency = taskMap.get(depId)
    if (!dependency || dependency.status === 'done') return count
    return count + 1
  }, 0)
}

const isTaskBlocked = (task: Task, taskMap: Map<string, Task>) =>
  Boolean(task.blocked) || getOpenDependencyCount(task, taskMap) > 0

const scoreTaskForFocus = (task: Task, taskMap: Map<string, Task>, nowMs: number) => {
  if (task.status === 'done') return -1
  let score = 0
  if (task.status === 'doing') score += 4
  if (task.priority === 'high') score += 3
  if (isTaskDueSoon(task, nowMs)) score += 3
  if (isTaskOverdue(task, nowMs)) score += 4
  if (isTaskBlocked(task, taskMap)) score += 2
  if ((task.tags || []).includes('focus')) score += 2
  if ((task.tags || []).includes('today')) score += 1
  return score
}

const applyTaskWorkMode = (tasks: Task[], mode: TaskWorkMode, taskMap: Map<string, Task>) => {
  const nowMs = Date.now()

  if (mode === 'board') return tasks
  if (mode === 'due-soon') return tasks.filter((task) => isTaskDueSoon(task, nowMs))
  if (mode === 'high-priority') return tasks.filter((task) => task.status !== 'done' && task.priority === 'high')
  if (mode === 'blocked') return tasks.filter((task) => task.status !== 'done' && isTaskBlocked(task, taskMap))

  if (mode === 'focus') {
    return [...tasks]
      .filter((task) => task.status !== 'done')
      .sort((a, b) => scoreTaskForFocus(b, taskMap, nowMs) - scoreTaskForFocus(a, taskMap, nowMs))
      .filter((task) => scoreTaskForFocus(task, taskMap, nowMs) > 0)
  }

  return tasks
}

function StatsBar({ tasks }: { tasks: Task[] }) {
  const t = useTheme()
  const total    = tasks.length
  const done     = tasks.filter((task) => task.status === 'done').length
  const overdue  = tasks.filter((task) => isTaskOverdue(task)).length
  const high     = tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length
  const blocked  = tasks.filter((task) => task.blocked).length
  const pct      = total ? Math.round((done / total) * 100) : 0

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
        { label:'Overdue', val:overdue, color: overdue > 0 ? '#ff453a' : 'inherit' },
        { label:'High', val:high, color: high > 0 ? '#ff9f0a' : 'inherit' },
        { label:'Blocked', val:blocked, color: blocked > 0 ? '#ff453a' : 'inherit' },
      ].map((stat) => (
        <div key={stat.label} style={{ textAlign:'center', fontSize:10 }}>
          <div style={{ fontWeight:800, fontSize:15, color:stat.color, lineHeight:1 }}>{stat.val}</div>
          <div style={{ opacity:0.45, marginTop:2 }}>{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

type TaskCardProps = {
  tk: Task
  onEdit: () => void
  onDelete: () => void
  batchMode: boolean
  selected: boolean
  onToggleSelect: (taskId: string) => void
  reminderCount: number
  linkedNoteTitle?: string
  isBlocked: boolean
  blockedByDepsCount: number
  onOpenLinkedNote?: (task: Task) => void
}

function TaskCard({
  tk,
  onEdit,
  onDelete,
  batchMode,
  selected,
  onToggleSelect,
  reminderCount,
  linkedNoteTitle,
  isBlocked,
  blockedByDepsCount,
  onOpenLinkedNote,
}: TaskCardProps) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const [, drag] = useDrag({ type: 'TASK', item: tk })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(false)
  const interaction = useInteractiveSurfaceMotion({
    id: `tasks-card-${tk.id}`,
    hovered,
    focused,
    selected: tk.status === 'doing' || selected,
    pressed,
    surfaceClass: 'panel-surface',
    effectClass: 'status-highlight',
    budgetPriority: tk.status === 'doing' || selected ? 'high' : 'normal',
    areaHint: 160,
    family: 'content',
  })

  const overdue = isTaskOverdue(tk)
  const subDone  = (tk.subtasks || []).filter((sub) => sub.done).length
  const subTotal = (tk.subtasks || []).length

  return (
    <div ref={drag as any} style={{ cursor: batchMode ? 'default' : 'grab', marginBottom:8 }}>
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
        <Glass glow style={{ padding:'11px 13px', transition:'all 0.15s', position:'relative', overflow:'hidden' }} onDoubleClick={onEdit}>
          <SurfaceHighlight highlight={interaction.highlight} inset={1} radius={10}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 10,
                border: `1px solid rgba(${rgb},0.22)`,
                background: selected
                  ? `radial-gradient(circle at 50% 50%, rgba(${rgb},0.22), rgba(${rgb},0.08) 68%, rgba(${rgb},0.03) 100%)`
                  : `radial-gradient(circle at 50% 50%, rgba(${rgb},0.18), rgba(${rgb},0.06) 68%, rgba(${rgb},0.02) 100%)`,
              }}
            />
          </SurfaceHighlight>

          <div style={{ display:'flex', gap:10 }}>
            <div style={{ width:3, borderRadius:2, background:PRIORITY_COLOR[tk.priority], flexShrink:0, alignSelf:'stretch' }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:8, minWidth:0, flex:1 }}>
                  {batchMode && (
                    <button
                      onClick={() => onToggleSelect(tk.id)}
                      style={{
                        marginTop: 1,
                        width: 16,
                        height: 16,
                        borderRadius: 5,
                        border: `1px solid ${selected ? t.accent : 'rgba(255,255,255,0.35)'}`,
                        background: selected ? t.accent : 'transparent',
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      aria-label={selected ? 'Deselect task' : 'Select task'}
                    >
                      {selected && <Check size={10} />}
                    </button>
                  )}
                  <span style={{ fontSize:13, fontWeight:600, lineHeight:1.4, opacity: tk.status==='done'?0.45:1, textDecoration: tk.status==='done'?'line-through':undefined, overflow:'hidden', textOverflow:'ellipsis' }}>
                    {tk.title}
                  </span>
                </div>
                <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                  <InteractiveIconButton motionId={`task-edit-${tk.id}`} onClick={onEdit} idleOpacity={0.35} radius={4}>
                    <Edit3 size={11}/>
                  </InteractiveIconButton>
                  <InteractiveIconButton motionId={`task-delete-${tk.id}`} onClick={onDelete} intent="danger" idleOpacity={0.35} radius={4}>
                    <Trash2 size={11}/>
                  </InteractiveIconButton>
                </div>
              </div>

              {tk.desc && (
                <div style={{ fontSize:11.5, opacity:0.6, marginTop:4, lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
                  {tk.desc}
                </div>
              )}

              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, marginTop:7 }}>
                {tk.deadline && (
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background: overdue ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.07)', color: overdue ? '#ff453a' : 'inherit', border: overdue ? '1px solid rgba(255,69,58,0.3)' : '1px solid transparent' }}>
                    <Calendar size={9}/> {new Date(tk.deadline).toLocaleDateString()}
                    {overdue && ' ⚠️'}
                  </span>
                )}
                {subTotal > 0 && (
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background: subDone===subTotal?'rgba(48,209,88,0.12)':'rgba(255,255,255,0.07)', color: subDone===subTotal?'#30d158':'inherit' }}>
                    <CheckSquare size={9}/> {subDone}/{subTotal}
                  </span>
                )}
                {isBlocked && (
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background:'rgba(255,69,58,0.14)', color:'#ff453a', border:'1px solid rgba(255,69,58,0.26)' }}>
                    <AlertCircle size={9} /> Blocked
                  </span>
                )}
                {blockedByDepsCount > 0 && (
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background:'rgba(255,159,10,0.14)', color:'#ff9f0a', border:'1px solid rgba(255,159,10,0.24)' }}>
                    <Pin size={9} /> {blockedByDepsCount} deps
                  </span>
                )}
                {reminderCount > 0 && (
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background:'rgba(100,210,255,0.14)', color:'#64d2ff', border:'1px solid rgba(100,210,255,0.24)' }}>
                    <Bell size={9} /> {reminderCount}
                  </span>
                )}
                {linkedNoteTitle && (
                  <button
                    onClick={() => onOpenLinkedNote?.(tk)}
                    style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background:`rgba(${rgb},0.12)`, color:t.accent, border:`1px solid rgba(${rgb},0.2)`, cursor:'pointer', maxWidth:170 }}
                    title={linkedNoteTitle}
                  >
                    <Link size={9} />
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{linkedNoteTitle}</span>
                  </button>
                )}
                {(tk.tags || []).map((tag) => (
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

function DropCol({ id, children }: { id: string; children: React.ReactNode }) {
  const moveTask = useApp((state) => state.moveTask)
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (tk: Task) => {
      if (tk.status !== id) moveTask(tk.id, id as any)
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  })

  return (
    <div ref={drop as any} style={{ flex:1, transition:'background 0.15s', borderRadius:12, background: isOver?'rgba(255,255,255,0.04)':'transparent', padding:'2px' }}>
      {children}
    </div>
  )
}

function TaskModal({
  task,
  onClose,
  status,
  setView,
}: {
  task?: Task
  onClose: () => void
  status?: 'todo'|'doing'|'done'
  setView?: (viewId: string) => void
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const {
    addTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    addRem,
    notes,
    tasks,
    reminders,
    openNote,
    setNote,
    addNote,
    updateNote,
  } = useApp((state) => ({
    addTask: state.addTask,
    updateTask: state.updateTask,
    addSubtask: state.addSubtask,
    toggleSubtask: state.toggleSubtask,
    addRem: state.addRem,
    notes: state.notes,
    tasks: state.tasks,
    reminders: state.reminders,
    openNote: state.openNote,
    setNote: state.setNote,
    addNote: state.addNote,
    updateNote: state.updateNote,
  }), shallow)

  const [title,    setTitle]    = useState(task?.title ?? '')
  const [desc,     setDesc]     = useState(task?.desc ?? '')
  const [priority, setPriority] = useState<'low'|'mid'|'high'>(task?.priority ?? 'low')
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.split('T')[0] : '')
  const [tagInput, setTagInput] = useState('')
  const [tags,     setTags]     = useState<string[]>(task?.tags ?? [])
  const [notesMd,  setNotesMd]  = useState((task as any)?.notes ?? '')
  const [tab,      setTab]      = useState<'details'|'subtasks'|'notes'>('details')
  const [linkedNoteId, setLinkedNoteId] = useState(task?.linkedNoteId ?? '')
  const [blocked, setBlocked] = useState(Boolean(task?.blocked))
  const [blockedReason, setBlockedReason] = useState(task?.blockedReason ?? '')
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>(task?.dependsOnTaskIds ?? [])
  const [linkedCanvasNodeId, setLinkedCanvasNodeId] = useState(task?.linkedCanvasNodeId ?? '')

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

  const linkedReminders = useMemo(() => {
    if (!task) return [] as Reminder[]
    return reminders
      .filter((reminder) => reminder.linkedTaskId === task.id)
      .sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime))
      .slice(0, 5)
  }, [reminders, task])

  const dependencyOptions = useMemo(
    () => tasks.filter((entry) => entry.id !== task?.id).slice(0, 24),
    [tasks, task?.id],
  )

  const openLinkedNote = useCallback((noteId: string) => {
    if (!noteId) return
    openNote(noteId)
    setNote(noteId)
    setView?.('notes')
  }, [openNote, setNote, setView])

  const createOrOpenLinkedNote = useCallback(() => {
    if (linkedNoteId) {
      openLinkedNote(linkedNoteId)
      return
    }

    const beforeIds = new Set(useApp.getState().notes.map((note) => note.id))
    addNote()
    const stateAfterCreate = useApp.getState()
    const createdNote = stateAfterCreate.notes.find((note) => !beforeIds.has(note.id)) || stateAfterCreate.notes[0]
    if (!createdNote) return

    const seededTitle = title.trim() ? `${title.trim()} Notes` : 'Task Notes'
    updateNote(createdNote.id, {
      title: seededTitle,
      content: `# ${seededTitle}\n\nLinked task: ${title.trim() || 'Untitled task'}\n\n## Context\n- Status: ${task?.status || status || 'todo'}\n- Priority: ${priority}\n`,
      tags: Array.from(new Set([...(createdNote.tags || []), 'task-link'])),
    })

    setLinkedNoteId(createdNote.id)
    if (task) {
      updateTask(task.id, { linkedNoteId: createdNote.id })
    }

    openLinkedNote(createdNote.id)
  }, [addNote, linkedNoteId, openLinkedNote, priority, status, task, title, updateNote, updateTask])

  const createLinkedReminder = useCallback(() => {
    if (!task) return
    const reminderDate = deadline
      ? new Date(`${deadline}T09:00:00`).toISOString()
      : new Date(Date.now() + 60 * 60 * 1000).toISOString()

    addRem({
      title: title.trim() ? `Reminder: ${title.trim()}` : `Reminder: ${task.title}`,
      msg: desc?.trim() || task.desc || 'Task follow-up',
      datetime: reminderDate,
      repeat: 'none',
      linkedTaskId: task.id,
      linkedNoteId: linkedNoteId || undefined,
    })
  }, [addRem, deadline, desc, linkedNoteId, task, title])

  const toggleDependency = useCallback((dependencyId: string) => {
    setDependsOnTaskIds((previous) => (
      previous.includes(dependencyId)
        ? previous.filter((id) => id !== dependencyId)
        : [...previous, dependencyId]
    ))
  }, [])

  const addTag = () => {
    const nextTag = tagInput.trim().replace(/^#/, '')
    if (nextTag && !tags.includes(nextTag)) setTags((previous) => [...previous, nextTag])
    setTagInput('')
  }

  const save = () => {
    if (!title.trim()) return

    const taskPatch: Partial<Task> = {
      title,
      desc,
      priority,
      deadline: deadline || undefined,
      tags,
      notes: notesMd,
      linkedNoteId: linkedNoteId || undefined,
      blocked,
      blockedReason: blocked ? blockedReason.trim() || undefined : undefined,
      dependsOnTaskIds,
      linkedCanvasNodeId: linkedCanvasNodeId || undefined,
    }

    if (task) {
      updateTask(task.id, taskPatch)
      onClose()
      return
    }

    const beforeIds = new Set(useApp.getState().tasks.map((entry) => entry.id))
    addTask(title, status || 'todo', desc, priority)
    const stateAfterCreate = useApp.getState()
    const createdTask = stateAfterCreate.tasks.find((entry) => !beforeIds.has(entry.id))
    if (createdTask) {
      updateTask(createdTask.id, taskPatch)
    }

    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={overlayTransition}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={panelInitial}
        animate={{ scale:1, y:0, opacity:1 }}
        exit={panelInitial}
        transition={panelTransition}
        onClick={(event) => event.stopPropagation()}
        style={{ width:520, maxHeight:'85vh', display:'flex', flexDirection:'column' }}
      >
        <Glass glow style={{ padding:0, display:'flex', flexDirection:'column', maxHeight:'85vh' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
            <div style={{ fontSize:15, fontWeight:800 }}>{task ? 'Edit Task' : 'New Task'}</div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.5, color:'inherit', padding:4, borderRadius:6 }}>
              <X size={16}/>
            </button>
          </div>

          <div style={{ padding:'14px 20px 0', flexShrink:0 }}>
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title…" style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:14, fontWeight:600, color:'inherit', marginBottom:10 }} />
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              {(['low','mid','high'] as const).map((priorityKey) => (
                <button
                  key={priorityKey}
                  onClick={() => setPriority(priorityKey)}
                  style={{
                    flex:1,
                    padding:'6px 0',
                    borderRadius:8,
                    border:`1px solid ${priority===priorityKey?PRIORITY_COLOR[priorityKey]:'rgba(255,255,255,0.1)'}`,
                    background: priority===priorityKey?`${PRIORITY_COLOR[priorityKey]}22`:'transparent',
                    cursor:'pointer',
                    fontSize:11,
                    fontWeight:700,
                    color: priority===priorityKey?PRIORITY_COLOR[priorityKey]:'inherit',
                    transition:'all 0.12s',
                  }}
                >
                  <Flag size={10} style={{ display:'inline', marginRight:4 }} /> {PRIORITY_LABEL[priorityKey]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:0, borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, padding:'0 20px' }}>
            {(['details','subtasks','notes'] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                style={{ padding:'7px 14px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:tab===tabKey?t.accent:'inherit', opacity:tab===tabKey?1:0.45, borderBottom:`2px solid ${tab===tabKey?t.accent:'transparent'}`, transition:'all 0.12s', marginBottom:-1 }}
              >
                {tabKey}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {tab === 'details' && (
              <div style={{ flex:1, overflowY:'auto', padding:'14px 20px' }}>
                <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Description</label>
                <textarea value={desc} onChange={(event) => setDesc(event.target.value)} placeholder="Add a description…" rows={3} style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit', resize:'vertical', fontFamily:'inherit', marginBottom:14 }} />

                <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Deadline</label>
                <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} style={{ width:'100%', padding:'8px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit', marginBottom:14, colorScheme: t.mode==='dark'?'dark':'light' }} />

                <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Tags</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:6 }}>
                  {tags.map((taskTag) => (
                    <span key={taskTag} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, padding:'3px 9px', borderRadius:20, background:`rgba(${rgb},0.14)`, color:t.accent, border:`1px solid rgba(${rgb},0.25)` }}>
                      #{taskTag}
                      <button onClick={() => setTags((previous) => previous.filter((entry) => entry !== taskTag))} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:0.6, padding:0, display:'flex' }}>
                        <X size={9}/>
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6, marginBottom:16 }}>
                  <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag() } }} placeholder="#tag" style={{ flex:1, padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }} />
                  <button onClick={addTag} style={{ padding:'7px 12px', borderRadius:8, background:t.accent, border:'none', cursor:'pointer', color:'#fff', fontSize:12, fontWeight:700 }}>Add</button>
                </div>

                <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:12, marginTop:2, display:'grid', gap:12 }}>
                  <div>
                    <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Linked Note</label>
                    <div style={{ display:'flex', gap:6 }}>
                      <select value={linkedNoteId} onChange={(event) => setLinkedNoteId(event.target.value)} style={{ flex:1, padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }}>
                        <option value="">No linked note</option>
                        {notes.slice(0, 200).map((note: Note) => (
                          <option key={note.id} value={note.id}>{note.title || 'Untitled note'}</option>
                        ))}
                      </select>
                      <button onClick={() => linkedNoteId ? openLinkedNote(linkedNoteId) : createOrOpenLinkedNote()} style={{ padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.08)', color:'inherit', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        {linkedNoteId ? 'Open' : 'Create'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Task Dependencies</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {dependencyOptions.length === 0 && (
                        <span style={{ fontSize:11, opacity:0.5 }}>No other tasks available</span>
                      )}
                      {dependencyOptions.map((entry) => {
                        const active = dependsOnTaskIds.includes(entry.id)
                        return (
                          <button
                            key={entry.id}
                            onClick={() => toggleDependency(entry.id)}
                            style={{
                              padding:'4px 8px',
                              borderRadius:999,
                              border:`1px solid ${active ? '#ff9f0a' : 'rgba(255,255,255,0.12)'}`,
                              background:active ? 'rgba(255,159,10,0.16)' : 'rgba(255,255,255,0.06)',
                              color:active ? '#ff9f0a' : 'inherit',
                              cursor:'pointer',
                              fontSize:10,
                              maxWidth:220,
                              overflow:'hidden',
                              textOverflow:'ellipsis',
                              whiteSpace:'nowrap',
                            }}
                            title={entry.title}
                          >
                            {entry.status !== 'done' ? '● ' : '✓ '}{entry.title}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Blocker</label>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <label style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, cursor:'pointer' }}>
                        <input type="checkbox" checked={blocked} onChange={(event) => setBlocked(event.target.checked)} />
                        Mark task as blocked
                      </label>
                      {blocked && (
                        <input value={blockedReason} onChange={(event) => setBlockedReason(event.target.value)} placeholder="Blocked reason (optional)" style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }} />
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Canvas Link (optional)</label>
                    <input value={linkedCanvasNodeId} onChange={(event) => setLinkedCanvasNodeId(event.target.value)} placeholder="Canvas node id / anchor" style={{ width:'100%', padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }} />
                  </div>

                  {task && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      <button onClick={createLinkedReminder} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(100,210,255,0.34)', background:'rgba(100,210,255,0.14)', color:'#64d2ff', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                        <Bell size={12} /> Reminder from Task
                      </button>
                      <button onClick={createOrOpenLinkedNote} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.16)', background:'rgba(255,255,255,0.08)', color:'inherit', fontSize:11, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5 }}>
                        <Link size={12} /> Note Link
                      </button>
                      <button onClick={() => setView?.('canvas')} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(191,90,242,0.34)', background:'rgba(191,90,242,0.14)', color:'#bf5af2', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                        Open Canvas
                      </button>
                    </div>
                  )}

                  {task && linkedReminders.length > 0 && (
                    <div>
                      <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Linked Reminders</label>
                      <div style={{ display:'grid', gap:5 }}>
                        {linkedReminders.map((reminder) => (
                          <div key={reminder.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 8px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{reminder.title}</div>
                              <div style={{ fontSize:10, opacity:0.6 }}>{new Date(reminder.datetime).toLocaleString()}</div>
                            </div>
                            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:reminder.done?'rgba(48,209,88,0.16)':'rgba(255,255,255,0.07)', color:reminder.done?'#30d158':'inherit' }}>
                              {reminder.done ? 'Done' : 'Open'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'subtasks' && (
              <div style={{ flex:1, overflowY:'auto', padding:'14px 20px' }}>
                {task && (task.subtasks||[]).map((subtask) => (
                  <div key={subtask.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:4, borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => toggleSubtask(task.id, subtask.id)} style={{ width:18, height:18, borderRadius:5, border:`2px solid ${subtask.done?t.accent:'rgba(255,255,255,0.25)'}`, background:subtask.done?t.accent:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.12s' }}>
                      {subtask.done && <Check size={10} color="#fff"/>}
                    </button>
                    <span style={{ flex:1, fontSize:13, opacity:subtask.done?0.4:0.85, textDecoration:subtask.done?'line-through':undefined }}>{subtask.title}</span>
                    <InteractiveIconButton
                      motionId={`task-sub-delete-${task.id}-${subtask.id}`}
                      intent="danger"
                      idleOpacity={0.4}
                      radius={4}
                      style={{ padding: 2 }}
                      onClick={() => task && updateTask(task.id,{subtasks:task.subtasks.filter((entry) => entry.id !== subtask.id)})}
                    >
                      <Trash2 size={11}/>
                    </InteractiveIconButton>
                  </div>
                ))}
                {task && (
                  <input
                    ref={subRef}
                    placeholder="New subtask… (Enter)"
                    style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit' }}
                    onKeyDown={(event) => {
                      if (event.key==='Enter' && event.currentTarget.value.trim()) {
                        addSubtask(task.id,event.currentTarget.value.trim())
                        event.currentTarget.value=''
                      }
                    }}
                  />
                )}
                {!task && <div style={{ textAlign:'center', padding:20, fontSize:13, opacity:0.4 }}>Save the task first to add subtasks</div>}
              </div>
            )}

            {tab === 'notes' && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <textarea value={notesMd} onChange={(event) => setNotesMd(event.target.value)} placeholder="Markdown notes for this task…" style={{ flex:1, width:'100%', padding:'14px 20px', background:'transparent', border:'none', outline:'none', fontSize:13, color:'inherit', resize:'none', fontFamily:"'Fira Code',monospace", lineHeight:1.6 }} />
              </div>
            )}
          </div>

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

export function TasksView({ setView }: { setView?: (viewId: string) => void } = {}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const {
    tasks,
    reminders,
    notes,
    addTask,
    updateTask,
    delTask,
    openNote,
    setNote,
  } = useApp((state) => ({
    tasks: state.tasks,
    reminders: state.reminders,
    notes: state.notes,
    addTask: state.addTask,
    updateTask: state.updateTask,
    delTask: state.delTask,
    openNote: state.openNote,
    setNote: state.setNote,
  }), shallow)

  const [search, setSearch] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<'todo'|'doing'|'done'|null>(null)
  const [filterPri, setFilterPri] = useState<string[]>([])
  const [filterTag, setFilterTag] = useState('')
  const [filterPanel, setFilterPanel] = useState(false)
  const [showDone, setShowDone] = useState(true)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [batchTagInput, setBatchTagInput] = useState('')
  const [workMode, setWorkMode] = useState<TaskWorkMode>(() => {
    if (typeof window === 'undefined') return 'board'
    const saved = window.localStorage.getItem(TASK_MODE_STORAGE_KEY)
    return TASK_WORK_MODES.includes(saved as TaskWorkMode) ? (saved as TaskWorkMode) : 'board'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TASK_MODE_STORAGE_KEY, workMode)
  }, [workMode])

  useEffect(() => {
    if (!batchMode && selectedTaskIds.length) {
      setSelectedTaskIds([])
    }
  }, [batchMode, selectedTaskIds.length])

  useEffect(() => {
    setSelectedTaskIds((previous) => previous.filter((id) => tasks.some((task) => task.id === id)))
  }, [tasks])

  const filterPanelDecision = useRenderSurfaceBudget({
    id: 'tasks-filter-panel',
    surfaceClass: 'panel-surface',
    effectClass: 'status-highlight',
    interactionState: filterPanel ? 'active' : 'idle',
    visibilityState: filterPanel ? 'visible' : 'hidden',
    budgetPriority: filterPanel ? 'high' : 'low',
    areaHint: 190,
    motionClassHint: 'status',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'none',
    opacityOwnerHint: 'surface',
  })
  const filterPanelRuntime = useSurfaceMotionRuntime(filterPanelDecision, { family: 'status' })

  const taskMap = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])

  const modeCounts = useMemo(() => {
    const counts: Record<TaskWorkMode, number> = {
      board: tasks.length,
      focus: applyTaskWorkMode(tasks, 'focus', taskMap).length,
      'due-soon': applyTaskWorkMode(tasks, 'due-soon', taskMap).length,
      'high-priority': applyTaskWorkMode(tasks, 'high-priority', taskMap).length,
      blocked: applyTaskWorkMode(tasks, 'blocked', taskMap).length,
    }
    return counts
  }, [tasks, taskMap])

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    tasks.forEach((task) => (task.tags || []).forEach((tag) => tagSet.add(tag)))
    return Array.from(tagSet)
  }, [tasks])

  const remindersByTaskId = useMemo(() => {
    const map = new Map<string, Reminder[]>()
    reminders.forEach((reminder) => {
      if (!reminder.linkedTaskId) return
      const list = map.get(reminder.linkedTaskId) || []
      list.push(reminder)
      map.set(reminder.linkedTaskId, list)
    })
    return map
  }, [reminders])

  const noteById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])

  const filtered = useMemo(() => {
    let next = applyTaskWorkMode(tasks, workMode, taskMap)

    const searchQuery = normalizeText(search)
    if (searchQuery) {
      next = next.filter((task) => {
        const source = `${task.title}\n${task.desc || ''}`.toLowerCase()
        return source.includes(searchQuery)
      })
    }

    if (filterPri.length) {
      next = next.filter((task) => filterPri.includes(task.priority))
    }

    if (filterTag) {
      next = next.filter((task) => (task.tags || []).includes(filterTag))
    }

    if (!showDone) {
      next = next.filter((task) => task.status !== 'done')
    }

    return next
  }, [tasks, workMode, taskMap, search, filterPri, filterTag, showDone])

  const editTask = tasks.find((task) => task.id === editId)
  const dueSoonCount = useMemo(() => tasks.filter((task) => isTaskDueSoon(task)).length, [tasks])
  const doingCount = useMemo(() => tasks.filter((task) => task.status === 'doing').length, [tasks])

  const selectedCount = selectedTaskIds.length

  const toggleSelectedTask = useCallback((taskId: string) => {
    setSelectedTaskIds((previous) => (
      previous.includes(taskId)
        ? previous.filter((id) => id !== taskId)
        : [...previous, taskId]
    ))
  }, [])

  const applyBatchPatch = useCallback((patch: Partial<Task>) => {
    selectedTaskIds.forEach((taskId) => updateTask(taskId, patch))
  }, [selectedTaskIds, updateTask])

  const applyBatchStatus = useCallback((status: Task['status']) => {
    applyBatchPatch({ status })
  }, [applyBatchPatch])

  const applyBatchPriority = useCallback((priority: Task['priority']) => {
    applyBatchPatch({ priority })
  }, [applyBatchPatch])

  const applyBatchTag = useCallback(() => {
    const nextTag = batchTagInput.trim().replace(/^#/, '')
    if (!nextTag) return

    selectedTaskIds.forEach((taskId) => {
      const task = taskMap.get(taskId)
      if (!task) return
      const nextTags = Array.from(new Set([...(task.tags || []), nextTag]))
      updateTask(taskId, { tags: nextTags })
    })

    setBatchTagInput('')
  }, [batchTagInput, selectedTaskIds, taskMap, updateTask])

  const batchDelete = useCallback(() => {
    selectedTaskIds.forEach((taskId) => delTask(taskId))
    setSelectedTaskIds([])
  }, [delTask, selectedTaskIds])

  const openLinkedNote = useCallback((task: Task) => {
    if (!task.linkedNoteId) return
    openNote(task.linkedNoteId)
    setNote(task.linkedNoteId)
    setView?.('notes')
  }, [openNote, setNote, setView])

  const quickAdd = (kind: 'today' | 'bug' | 'focus') => {
    if (kind === 'today') addTask('Heute: Wichtigste Aufgabe', 'todo', 'Tagesfokus', 'mid')
    if (kind === 'bug') addTask('Hotfix / Bugfix', 'todo', 'Reproduzieren, fixen, testen', 'high')
    if (kind === 'focus') addTask('Deep Work Block', 'doing', '90 Minuten Fokus ohne Kontextwechsel', 'mid')
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
          <div style={{ position:'relative', flex:1, maxWidth:320 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks…" style={{ width:'100%', padding:'7px 10px 7px 32px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }}/>
          </div>

          <button onClick={() => setFilterPanel((state) => !state)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 11px', borderRadius:9, background: filterPanel||filterPri.length||filterTag?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.07)', border:`1px solid ${filterPanel||filterPri.length||filterTag?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', fontSize:12, color: filterPri.length||filterTag?t.accent:'inherit', fontWeight:600 }}>
            <Filter size={12}/> Filter {filterPri.length||filterTag?`(${filterPri.length+(filterTag?1:0)})`:''}
          </button>

          <button onClick={() => setShowDone((state) => !state)} style={{ padding:'7px 11px', borderRadius:9, background:!showDone?`rgba(${rgb},0.12)`:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:12, color:!showDone?t.accent:'inherit' }}>
            {showDone?'Hide Done':'Show Done'}
          </button>

          <button onClick={() => setBatchMode((state) => !state)} style={{ padding:'7px 11px', borderRadius:9, background:batchMode?`rgba(${rgb},0.16)`:'rgba(255,255,255,0.07)', border:`1px solid ${batchMode?t.accent:'rgba(255,255,255,0.1)'}`, cursor:'pointer', fontSize:12, color:batchMode?t.accent:'inherit', fontWeight:700 }}>
            {batchMode ? 'Batch On' : 'Batch'}
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0, background:'rgba(0,0,0,0.07)', flexWrap:'wrap' }}>
          {TASK_WORK_MODES.map((mode) => {
            const active = mode === workMode
            const meta = TASK_WORK_MODE_META[mode]
            return (
              <button
                key={mode}
                onClick={() => setWorkMode(mode)}
                style={{
                  display:'flex',
                  alignItems:'center',
                  gap:5,
                  padding:'5px 9px',
                  borderRadius:999,
                  border: `1px solid ${active ? t.accent : 'rgba(255,255,255,0.12)'}`,
                  background: active ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.06)',
                  color: active ? t.accent : 'inherit',
                  fontSize:11,
                  fontWeight:700,
                  cursor:'pointer',
                }}
              >
                {meta.icon}
                {meta.label}
                <span style={{ opacity:0.65 }}>{modeCounts[mode]}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence>
          {batchMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow:'hidden', flexShrink:0 }}
            >
              <div style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.07)', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, padding:'3px 8px', borderRadius:999, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)' }}>
                  {selectedCount} selected
                </span>

                <button onClick={() => applyBatchStatus('todo')} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.07)', color:'inherit', cursor:'pointer', fontSize:10, fontWeight:700 }}>To Do</button>
                <button onClick={() => applyBatchStatus('doing')} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,159,10,0.24)', background:'rgba(255,159,10,0.12)', color:'#ff9f0a', cursor:'pointer', fontSize:10, fontWeight:700 }}>Doing</button>
                <button onClick={() => applyBatchStatus('done')} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(48,209,88,0.28)', background:'rgba(48,209,88,0.12)', color:'#30d158', cursor:'pointer', fontSize:10, fontWeight:700 }}>Done</button>

                <button onClick={() => applyBatchPriority('low')} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(48,209,88,0.28)', background:'rgba(48,209,88,0.12)', color:'#30d158', cursor:'pointer', fontSize:10, fontWeight:700 }}>Low</button>
                <button onClick={() => applyBatchPriority('mid')} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,214,10,0.3)', background:'rgba(255,214,10,0.12)', color:'#ffd60a', cursor:'pointer', fontSize:10, fontWeight:700 }}>Mid</button>
                <button onClick={() => applyBatchPriority('high')} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,69,58,0.28)', background:'rgba(255,69,58,0.12)', color:'#ff453a', cursor:'pointer', fontSize:10, fontWeight:700 }}>High</button>

                <div style={{ display:'flex', alignItems:'center', gap:5, marginLeft:'auto' }}>
                  <input value={batchTagInput} onChange={(event) => setBatchTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyBatchTag() } }} placeholder="#tag" style={{ width:90, padding:'4px 7px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, outline:'none' }} />
                  <button onClick={applyBatchTag} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.07)', color:'inherit', cursor:'pointer', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><Tag size={10} /> Tag</button>
                  <button onClick={batchDelete} style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,69,58,0.3)', background:'rgba(255,69,58,0.12)', color:'#ff453a', cursor:'pointer', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><Trash2 size={10} /> Delete</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {filterPanel && (
            <motion.div
              initial={{height:0,opacity:0}}
              animate={{height:'auto',opacity:1}}
              exit={{height:0,opacity:0}}
              transition={{ duration: Math.max(0.12, filterPanelRuntime.timings.regularMs / 1000), ease: filterPanelRuntime.timings.framerEase }}
              style={{ overflow:'hidden', flexShrink:0 }}
            >
              <div style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', flexWrap:'wrap', gap:10, background:'rgba(0,0,0,0.08)' }}>
                <div>
                  <div style={{ fontSize:10, opacity:0.45, marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Priority</div>
                  <div style={{ display:'flex', gap:5 }}>
                    {(['low','mid','high'] as const).map((priorityKey) => (
                      <button key={priorityKey} onClick={() => setFilterPri((previous) => previous.includes(priorityKey) ? previous.filter((entry) => entry !== priorityKey) : [...previous, priorityKey])} style={{ padding:'4px 10px', borderRadius:7, border:`1px solid ${filterPri.includes(priorityKey)?PRIORITY_COLOR[priorityKey]:'rgba(255,255,255,0.1)'}`, background:filterPri.includes(priorityKey)?`${PRIORITY_COLOR[priorityKey]}20`:'transparent', cursor:'pointer', fontSize:11, color:filterPri.includes(priorityKey)?PRIORITY_COLOR[priorityKey]:'inherit' }}>
                        {PRIORITY_LABEL[priorityKey]}
                      </button>
                    ))}
                  </div>
                </div>
                {allTags.length > 0 && (
                  <div>
                    <div style={{ fontSize:10, opacity:0.45, marginBottom:5, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Tag</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {allTags.map((tag) => (
                        <button key={tag} onClick={() => setFilterTag((current) => current === tag ? '' : tag)} style={{ padding:'4px 9px', borderRadius:7, border:`1px solid ${filterTag===tag?t.accent:'rgba(255,255,255,0.1)'}`, background:filterTag===tag?`rgba(${rgb},0.15)`:'transparent', cursor:'pointer', fontSize:11, color:filterTag===tag?t.accent:'inherit' }}>
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => { setFilterPri([]); setFilterTag('') }} style={{ alignSelf:'flex-end', padding:'4px 10px', borderRadius:7, background:'rgba(255,69,58,0.1)', border:'1px solid rgba(255,69,58,0.2)', cursor:'pointer', fontSize:11, color:'#ff453a' }}>
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <StatsBar tasks={tasks} />

        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.06)', flexWrap:'wrap' }}>
          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <strong>{dueSoonCount}</strong> <span style={{ opacity:0.6 }}>Due &lt; 48h</span>
          </span>
          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:doingCount > 5 ? 'rgba(255,69,58,0.14)' : 'rgba(255,255,255,0.06)', border:doingCount > 5 ? '1px solid rgba(255,69,58,0.35)' : '1px solid rgba(255,255,255,0.1)', color:doingCount > 5 ? '#FF453A' : 'inherit' }}>
            <strong>{doingCount}</strong> <span style={{ opacity:0.7 }}>WIP</span>
          </span>
          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
            <strong>{filtered.length}</strong> <span style={{ opacity:0.7 }}>{TASK_WORK_MODE_META[workMode].label}</span>
          </span>
          <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
            <button onClick={() => quickAdd('today')} style={{ padding:'5px 9px', borderRadius:8, border:`1px solid rgba(${rgb},0.3)`, background:`rgba(${rgb},0.14)`, color:t.accent, fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Today</button>
            <button onClick={() => quickAdd('focus')} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Focus</button>
            <button onClick={() => quickAdd('bug')} style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,69,58,0.35)', background:'rgba(255,69,58,0.12)', color:'#FF453A', fontSize:10, fontWeight:700, cursor:'pointer' }}>+ Bugfix</button>
          </div>
        </div>

        <div style={{ flex:1, display:'flex', gap:12, padding:14, overflow:'visible', minHeight:0 }}>
          {COLS.map((column) => {
            if (!showDone && column.id === 'done') return null

            const items = filtered.filter((task) => task.status === column.id)

            return (
              <div key={column.id} style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0 }}>
                <Glass style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', marginBottom:8, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:15 }}>{column.emoji}</span>
                    <span style={{ fontSize:13, fontWeight:700 }}>{column.label}</span>
                    <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:`${column.color}1a`, color:column.color, fontWeight:700 }}>{items.length}</span>
                  </div>
                  <InteractiveIconButton motionId={`task-col-add-${column.id}`} intent="accent" idleOpacity={0.7} radius={6} style={{ padding: '3px 5px' }} onClick={() => setNewStatus(column.id)}>
                    <Plus size={15}/>
                  </InteractiveIconButton>
                </Glass>

                <div style={{ flex:1, overflowY:'auto', padding:'4px 8px 10px' }}>
                  <DropCol id={column.id}>
                    {items.length === 0 ? (
                      <div style={{ height:80, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', border:'2px dashed rgba(255,255,255,0.07)', borderRadius:10, fontSize:12, opacity:0.3, gap:5 }}>
                        <span>Drop tasks here</span>
                      </div>
                    ) : items.map((task) => {
                      const reminderCount = remindersByTaskId.get(task.id)?.length || 0
                      const linkedNote = task.linkedNoteId ? noteById.get(task.linkedNoteId) : undefined
                      const blockedByDepsCount = getOpenDependencyCount(task, taskMap)
                      return (
                        <TaskCard
                          key={task.id}
                          tk={task}
                          onEdit={() => setEditId(task.id)}
                          onDelete={() => delTask(task.id)}
                          batchMode={batchMode}
                          selected={selectedTaskIds.includes(task.id)}
                          onToggleSelect={toggleSelectedTask}
                          reminderCount={reminderCount}
                          linkedNoteTitle={linkedNote?.title}
                          isBlocked={isTaskBlocked(task, taskMap)}
                          blockedByDepsCount={blockedByDepsCount}
                          onOpenLinkedNote={openLinkedNote}
                        />
                      )
                    })}
                  </DropCol>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {newStatus && <TaskModal key="new" onClose={() => setNewStatus(null)} status={newStatus} setView={setView} />}
        {editId && <TaskModal key={editId} task={editTask} onClose={() => setEditId(null)} setView={setView} />}
      </AnimatePresence>
    </DndProvider>
  )
}
