declare const window: Window & typeof globalThis & { api?: any; Capacitor?: any }

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, Check, Bell, X, Clock, Repeat, Calendar,
  ChevronDown, BellRing, Search, AlarmClock,
  Edit3, CheckCircle2, AlertCircle, RefreshCw, Settings2, LifeBuoy } from 'lucide-react'
import { Glass } from '../components/Glass'
import { InteractiveIconButton } from '../components/render/InteractiveIconButton'
import { SurfaceHighlight } from '../components/render/SurfaceHighlight'
import { ViewHeader } from '../components/ViewHeader'
import { MobileSheet } from '../components/mobile/MobileViewContract'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp, Reminder } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { fmtDt, hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import { mobileReminderService } from '../lib/mobileReminderService'
import { useInteractiveSurfaceMotion } from '../render/useInteractiveSurfaceMotion'
import { useRenderSurfaceBudget } from '../render/useRenderSurfaceBudget'
import { useSurfaceMotionRuntime } from '../render/useSurfaceMotionRuntime'
import { motion, AnimatePresence } from 'framer-motion'
import {
  computeTodayLayerSummary,
  REMINDER_TEMPLATES,
  REMINDER_SNOOZE_PRESETS,
  createReminderFromTemplate,
  formatReminderRepeat,
  type ReminderTemplateId,
} from '@nexus/core'

type QuietHoursState = {
  enabled: boolean
  start: string
  end: string
}

const QUIET_HOURS_KEY = 'nx-mobile-reminder-quiet-hours'
const REMINDER_FILTER_STORAGE_KEY = 'nx-mobile-reminders-filter-v1'
const REMINDER_SEARCH_STORAGE_KEY = 'nx-mobile-reminders-search-v1'
const DEFAULT_QUIET_HOURS: QuietHoursState = {
  enabled: false,
  start: '22:00',
  end: '07:00',
}

const readQuietHours = (): QuietHoursState => {
  if (typeof window === 'undefined') return DEFAULT_QUIET_HOURS
  try {
    const raw = localStorage.getItem(QUIET_HOURS_KEY)
    if (!raw) return DEFAULT_QUIET_HOURS
    const parsed = JSON.parse(raw) as Partial<QuietHoursState>
    return {
      enabled: Boolean(parsed.enabled),
      start: typeof parsed.start === 'string' ? parsed.start : DEFAULT_QUIET_HOURS.start,
      end: typeof parsed.end === 'string' ? parsed.end : DEFAULT_QUIET_HOURS.end,
    }
  } catch {
    return DEFAULT_QUIET_HOURS
  }
}

const isNowWithinQuietHours = (date: Date, quietHours: QuietHoursState): boolean => {
  if (!quietHours.enabled) return false
  const [startH, startM] = quietHours.start.split(':').map((v) => Number(v))
  const [endH, endM] = quietHours.end.split(':').map((v) => Number(v))
  if (
    Number.isNaN(startH) || Number.isNaN(startM) ||
    Number.isNaN(endH) || Number.isNaN(endM)
  ) {
    return false
  }

  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM
  const currentMinutes = date.getHours() * 60 + date.getMinutes()

  if (startMinutes === endMinutes) return false
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

const isEditableTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

// ── Sound ────────────────────────────────────────────────────────
function playNotifSound(freq = 880) {
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
    const play = (f: number, start: number, dur: number) => {
      const osc = ctx.createOscillator(), g = ctx.createGain()
      osc.connect(g); g.connect(ctx.destination)
      osc.frequency.value = f; osc.type = 'sine'
      g.gain.value = 0.12
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
    }
    play(freq, 0, 0.4); play(freq * 1.25, 0.25, 0.35)
  } catch {}
}

// ── Toast notification ───────────────────────────────────────────
interface Toast { id: string; title: string; msg: string }

function ToastCard({ toast, onDone, onSnooze }: { toast: Toast; onDone: () => void; onSnooze: (m: number) => void }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const toastDecision = useRenderSurfaceBudget({
    id: `reminder-toast-${toast.id}`,
    surfaceClass: 'utility-surface',
    effectClass: 'status-highlight',
    interactionState: 'active',
    visibilityState: 'visible',
    budgetPriority: 'high',
    areaHint: 120,
    motionClassHint: 'status',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'none',
    opacityOwnerHint: 'surface',
  })
  const toastRuntime = useSurfaceMotionRuntime(toastDecision, { family: 'status' })
  const toastTransition = {
    duration: Math.max(0.12, toastRuntime.timings.regularMs / 1000),
    ease: toastRuntime.timings.framerEase,
  }
  return (
    <motion.div
      initial={mob.isMobile ? { y: 46, opacity: 0 } : { x: 340, opacity:0 }}
      animate={mob.isMobile ? { y: 0, opacity: 1 } : { x:0, opacity:1 }}
      exit={mob.isMobile ? { y: 46, opacity: 0 } : { x:340, opacity:0 }}
      transition={toastTransition}
      style={{
        position:'fixed',
        zIndex:9999,
        width: mob.isMobile ? 'auto' : 360,
        left: mob.isMobile ? 10 : undefined,
        right: mob.isMobile ? 10 : 20,
        top: mob.isMobile ? undefined : 20,
        bottom: mob.isMobile ? 'calc(74px + var(--sat-bottom, 0px))' : undefined,
      }}
    >
      <Glass type="modal" glow style={{ padding:16, borderLeft:`3px solid ${t.accent}`, boxShadow:`0 16px 50px rgba(0,0,0,0.5), 0 0 24px rgba(${rgb},0.18)` }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`rgba(${rgb},0.15)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BellRing size={18} style={{ color:t.accent }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{toast.title}</div>
            {toast.msg && <div style={{ fontSize:12, opacity:0.7, lineHeight:1.45 }}>{toast.msg}</div>}
          </div>
          <InteractiveIconButton motionId={`toast-dismiss-${toast.id}`} onClick={onDone} idleOpacity={0.4} radius={5} style={{ padding: 3, flexShrink: 0 }}>
            <X size={15}/>
          </InteractiveIconButton>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:12 }}>
          <button onClick={onDone} style={{ flex:1, padding:'7px 0', borderRadius:8, background:t.accent, border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
            <Check size={12}/> Dismiss
          </button>
          {REMINDER_SNOOZE_PRESETS.map(m => (
            <button key={m} onClick={()=>onSnooze(m)} style={{ padding:'7px 10px', borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', color:'inherit', fontSize:11, cursor:'pointer' }}>
              {m < 60 ? `${m}m` : '1h'}
            </button>
          ))}
        </div>
      </Glass>
    </motion.div>
  )
}

// ── Reminder checker ─────────────────────────────────────────────
function useChecker(
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>,
  quietHours: QuietHoursState,
) {
  const { reminders, doneRem, snoozeRem } = useApp()
  const fired = useRef(new Set<string>())
  const fallbackEnabledRef = useRef(true)
  const [fallbackMode, setFallbackMode] = useState(true)
  const [nativeReady, setNativeReady] = useState(false)
  const [serviceState, setServiceState] = useState(() => mobileReminderService.getStatus())
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)

  const refreshHealth = useCallback(() => {
    setServiceState(mobileReminderService.getStatus())
  }, [])

  const syncPermissions = useCallback(async () => {
    try {
      const permission = await mobileReminderService.syncPermissions()
      const fallback = !permission.canSchedule
      fallbackEnabledRef.current = fallback
      setFallbackMode(fallback)
      setNativeReady(permission.nativeAvailable && permission.canSchedule)
      setLastSyncError(null)
      refreshHealth()
      return permission
    } catch {
      fallbackEnabledRef.current = true
      setFallbackMode(true)
      setNativeReady(false)
      setLastSyncError('PERMISSION_SYNC_FAILED')
      refreshHealth()
      return null
    }
  }, [refreshHealth])

  const resyncOpenReminders = useCallback(async () => {
    try {
      const result = await mobileReminderService.rescheduleFromStore(reminders)
      fallbackEnabledRef.current = result.fallback
      setFallbackMode(result.fallback)
      setNativeReady(result.nativeAvailable && !result.fallback)
      setLastSyncError(result.reason || null)
      refreshHealth()
      return result
    } catch {
      fallbackEnabledRef.current = true
      setFallbackMode(true)
      setNativeReady(false)
      setLastSyncError('RESCHEDULE_FAILED')
      refreshHealth()
      return null
    }
  }, [refreshHealth, reminders])

  useEffect(() => {
    let active = true
    void syncPermissions().then(() => {
      if (!active) return
      refreshHealth()
    })
    return () => {
      active = false
    }
  }, [refreshHealth, syncPermissions])

  useEffect(() => {
    let active = true
    void resyncOpenReminders().then(() => {
      if (!active) return
      refreshHealth()
    })
    return () => {
      active = false
    }
  }, [refreshHealth, reminders, resyncOpenReminders])

  useEffect(() => {
    if (!fallbackEnabledRef.current) return
    const check = () => {
      const now = new Date()
      if (isNowWithinQuietHours(now, quietHours)) return
      reminders.filter(r => !r.done).forEach(r => {
        const dt = new Date(r.snoozeUntil || r.datetime)
        if (dt <= now && !fired.current.has(r.id)) {
          fired.current.add(r.id)
          playNotifSound()
          setToasts(ts => [...ts, { id: r.id, title: r.title, msg: r.msg }])
          try { window.api?.notify(r.title, r.msg) } catch {}
        }
      })
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [quietHours, reminders])

  const dismiss = (id: string) => {
    doneRem(id)
    void mobileReminderService.cancel(id)
    fired.current.delete(id)
    setToasts(ts => ts.filter(t => t.id !== id))
    refreshHealth()
  }
  const snooze  = (id: string, m: number) => {
    snoozeRem(id, m)
    fired.current.delete(id)
    setToasts(ts => ts.filter(t => t.id !== id))
    refreshHealth()
  }
  return {
    dismiss,
    snooze,
    fallbackMode,
    nativeReady,
    serviceState,
    lastSyncError,
    syncPermissions,
    resyncOpenReminders,
    openSystemSettings: () => mobileReminderService.openSystemSettings(),
    refreshHealth,
  }
}

// ── Reminder form ────────────────────────────────────────────────
function ReminderModal({
  reminder,
  onClose,
  setView,
}: {
  reminder?: Reminder
  onClose: () => void
  setView?: (viewId: string) => void
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const compactEdge = Math.min(mob.screenW, mob.screenH)
  const isTinyMobile = mob.isMobile && compactEdge <= 430
  const isTightMobile = mob.isMobile && mob.screenH <= 900
  const isLandscapeMobile = mob.isMobile && mob.isLandscape
  const isCompactMobile = mob.isMobile && (isTinyMobile || isTightMobile || isLandscapeMobile)
  const modalHeaderPadding = isCompactMobile ? '12px 14px 10px' : '16px 20px 12px'
  const modalTabsPaddingX = isCompactMobile ? '0 14px' : '0 20px'
  const modalBodyPadding = isCompactMobile ? '10px 14px' : '16px 20px'
  const modalFooterPadding = isCompactMobile
    ? '10px 14px calc(10px + var(--sat-bottom, 0px))'
    : '12px 20px calc(16px + var(--sat-bottom, 0px))'
  const modalInputFont = isCompactMobile ? 12 : 13
  const modalActionFont = isCompactMobile ? 12 : 13
  const { addRem, updateReminder, tasks, notes: noteEntries, openNote, setNote } = useApp()

  const now = new Date()
  now.setMinutes(now.getMinutes() + 15)
  const defaultDT = now.toISOString().slice(0,16)

  const [title,    setTitle]    = useState(reminder?.title ?? '')
  const [msg,      setMsg]      = useState(reminder?.msg ?? '')
  const [datetime, setDatetime] = useState(reminder?.datetime ? reminder.datetime.slice(0,16) : defaultDT)
  const [repeat,   setRepeat]   = useState<Reminder['repeat']>(reminder?.repeat ?? 'none')
  const [linkedTaskId, setLinkedTaskId] = useState(reminder?.linkedTaskId ?? '')
  const [linkedNoteId, setLinkedNoteId] = useState(reminder?.linkedNoteId ?? '')
  const [tab,      setTab]      = useState<'basic'|'notes'>('basic')
  const [reminderNotes, setReminderNotes] = useState((reminder as any)?.notes ?? '')
  const linkedTask = linkedTaskId ? tasks.find((task) => task.id === linkedTaskId) ?? null : null
  const linkedNote = linkedNoteId ? noteEntries.find((note) => note.id === linkedNoteId) ?? null : null
  const modalDecision = useRenderSurfaceBudget({
    id: `reminders-modal-${reminder?.id ?? 'new'}`,
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

  const REPEATS: { id: Reminder['repeat']; label: string; icon: string }[] = [
    { id:'none',    label:'Once',    icon:'1' },
    { id:'daily',   label:'Daily',   icon:'D' },
    { id:'weekly',  label:'Weekly',  icon:'W' },
    { id:'monthly', label:'Monthly', icon:'M' },
  ]

  const save = () => {
    if (!title.trim()) return
    if (reminder) {
      updateReminder(
        reminder.id,
        {
          title,
          msg,
          datetime: new Date(datetime).toISOString(),
          repeat,
          linkedTaskId: linkedTaskId || undefined,
          linkedNoteId: linkedNoteId || undefined,
          notes: reminderNotes,
        } as any,
      )
    } else {
      addRem({
        title,
        msg,
        datetime: new Date(datetime).toISOString(),
        repeat,
        linkedTaskId: linkedTaskId || undefined,
        linkedNoteId: linkedNoteId || undefined,
      })
    }
    onClose()
  }

  const setQuick = (mins: number) => {
    const d = new Date(); d.setMinutes(d.getMinutes() + mins)
    setDatetime(d.toISOString().slice(0,16))
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={overlayTransition}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems: mob.isMobile ? 'flex-end' : 'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <motion.div
        initial={panelInitial}
        animate={{scale:1,y:0,opacity:1}}
        exit={panelInitial}
        transition={panelTransition}
        onClick={e=>e.stopPropagation()}
        style={{ width: mob.isMobile ? '100%' : 440, maxHeight: mob.isMobile ? (isCompactMobile ? '92vh' : '90vh') : '85vh', display:'flex', flexDirection:'column', borderRadius: mob.isMobile ? '20px 20px 0 0' : undefined, position: mob.isMobile ? 'fixed' : undefined, bottom: mob.isMobile ? 0 : undefined, left: mob.isMobile ? 0 : undefined, right: mob.isMobile ? 0 : undefined }}
      >
        <Glass glow style={{ padding:0, display:'flex', flexDirection:'column', maxHeight:mob.isMobile ? (isCompactMobile ? '92vh' : '90vh') : '85vh' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:modalHeaderPadding, borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`rgba(${rgb},0.15)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bell size={15} style={{ color:t.accent }}/>
              </div>
              <span style={{ fontSize:isCompactMobile ? 13 : 15, fontWeight:800 }}>{reminder?'Edit Reminder':'New Reminder'}</span>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.4, color:'inherit' }}><X size={16}/></button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', padding:modalTabsPaddingX, borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            {(['basic','notes'] as const).map(tab2 => (
              <button key={tab2} onClick={()=>setTab(tab2)} style={{ padding:isCompactMobile ? '6px 11px' : '8px 14px', background:'none', border:'none', cursor:'pointer', fontSize:isCompactMobile ? 10 : 11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:tab===tab2?t.accent:'inherit', opacity:tab===tab2?1:0.45, borderBottom:`2px solid ${tab===tab2?t.accent:'transparent'}`, marginBottom:-1 }}>
                {tab2}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflow:'auto' }}>
            {tab === 'basic' && (
              <div style={{ padding:modalBodyPadding }}>
                <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Reminder title…" style={{ width:'100%', padding:isCompactMobile ? '8px 10px' : '9px 12px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:isCompactMobile ? 13 : 14, fontWeight:600, color:'inherit', marginBottom:isCompactMobile ? 10 : 12 }} />
                <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Additional details… (optional)" rows={2} style={{ width:'100%', padding:isCompactMobile ? '8px 10px' : '9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:modalInputFont, color:'inherit', resize:'none', fontFamily:'inherit', marginBottom:isCompactMobile ? 12 : 14 }} />

                <div style={{ marginBottom:isCompactMobile ? 12 : 14 }}>
                  <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>When</label>
                  <input type="datetime-local" value={datetime} onChange={e=>setDatetime(e.target.value)} style={{ width:'100%', padding:isCompactMobile ? '8px 10px' : '9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:modalInputFont, color:'inherit', colorScheme: t.mode==='dark'?'dark':'light' }} />
                  <div style={{ display:'flex', gap:6, marginTop:7 }}>
                    {[{l:'15m',m:15},{l:'1h',m:60},{l:'3h',m:180},{l:'Tomorrow',m:24*60},{l:'1 week',m:7*24*60}].map(({l,m}) => (
                      <button key={l} onClick={()=>setQuick(m)} style={{ flex:1, padding:isCompactMobile ? '4px 0' : '5px 0', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', cursor:'pointer', fontSize:isCompactMobile ? 9 : 10, fontWeight:600, color:'inherit' }}>+{l}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Repeat</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {REPEATS.map(r => (
                      <button key={r.id} onClick={()=>setRepeat(r.id)} style={{ flex:1, padding:isCompactMobile ? '7px 0' : '8px 0', borderRadius:8, border:`1px solid ${repeat===r.id?t.accent:'rgba(255,255,255,0.1)'}`, background: repeat===r.id?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.05)', cursor:'pointer', fontSize:isCompactMobile ? 10 : 11, fontWeight:700, color: repeat===r.id?t.accent:'inherit', transition:'all 0.12s' }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <label style={{ display: 'grid', gap: 4, fontSize: 11, opacity: 0.8 }}>
                    Verknupfte Task
                    <select
                      value={linkedTaskId}
                      onChange={(event) => setLinkedTaskId(event.target.value)}
                      style={{ borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'inherit', padding:'7px 9px', fontSize:12 }}
                    >
                      <option value="">Keine Task</option>
                      {tasks.slice(0, 120).map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 4, fontSize: 11, opacity: 0.8 }}>
                    Verknupfte Note
                    <select
                      value={linkedNoteId}
                      onChange={(event) => setLinkedNoteId(event.target.value)}
                      style={{ borderRadius:8, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.05)', color:'inherit', padding:'7px 9px', fontSize:12 }}
                    >
                      <option value="">Keine Note</option>
                      {noteEntries.slice(0, 160).map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {linkedTask || linkedNote ? (
                  <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                    {linkedTask ? (
                      <button
                        onClick={() => setView?.('tasks')}
                        style={{ padding:'4px 9px', borderRadius:7, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:10, fontWeight:700, color:'inherit' }}
                      >
                        Open Task
                      </button>
                    ) : null}
                    {linkedNote ? (
                      <button
                        onClick={() => {
                          openNote(linkedNote.id)
                          setNote(linkedNote.id)
                          setView?.('notes')
                        }}
                        style={{ padding:'4px 9px', borderRadius:7, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:10, fontWeight:700, color:'inherit' }}
                      >
                        Open Note
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            {tab === 'notes' && (
              <div style={{ display:'flex', flexDirection:'column', height:isCompactMobile ? 240 : 280 }}>
                <textarea value={reminderNotes} onChange={e=>setReminderNotes(e.target.value)} placeholder="Markdown notes…" style={{ flex:1, padding:isCompactMobile ? '10px 14px' : '14px 20px', background:'transparent', border:'none', outline:'none', fontSize:modalInputFont, color:'inherit', resize:'none', fontFamily:"'Fira Code',monospace", lineHeight:1.6 }} />
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:8, padding:modalFooterPadding, borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <button onClick={onClose} style={{ flex:1, padding:isCompactMobile ? '8px' : '9px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:modalActionFont, color:'inherit' }}>Cancel</button>
            <button onClick={save} style={{ flex:2, padding:isCompactMobile ? '8px' : '9px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', fontSize:modalActionFont, fontWeight:700, color:'#fff', boxShadow:`0 2px 14px rgba(${rgb},0.4)` }}>
              {reminder ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

// ── Reminder card ─────────────────────────────────────────────────
function ReminderCard({
  r,
  onEdit,
  now,
  setView,
}: {
  r: Reminder
  onEdit: () => void
  now: Date
  setView?: (viewId: string) => void
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { doneRem, delRem, snoozeRem, tasks, notes, openNote, setNote } = useApp()
  const dt       = new Date(r.snoozeUntil || r.datetime)
  const isPast   = dt < now && !r.done
  const isSoon   = !isPast && (dt.getTime() - now.getTime()) < 30 * 60000
  const hasnotes = !!(r as any).notes
  const linkedTask = r.linkedTaskId ? tasks.find((task) => task.id === r.linkedTaskId) ?? null : null
  const linkedNote = r.linkedNoteId ? notes.find((note) => note.id === r.linkedNoteId) ?? null : null
  const mob = useMobile()
  const compactEdge = Math.min(mob.screenW, mob.screenH)
  const isTinyMobile = mob.isMobile && compactEdge <= 430
  const isTightMobile = mob.isMobile && mob.screenH <= 900
  const isCompactMobile = mob.isMobile && (isTinyMobile || isTightMobile || mob.isLandscape)
  const cardPadding = isCompactMobile ? (isTinyMobile ? '9px 11px' : '10px 12px') : '12px 16px'
  const cardTitleSize = isCompactMobile ? 12 : 13
  const cardBodySize = isCompactMobile ? 11 : 12
  const cardMetaSize = isCompactMobile ? 10 : 11
  const cardTagSize = isCompactMobile ? 9 : 10
  const [expanded, setExpanded] = useState(false)
  const cardDecision = useRenderSurfaceBudget({
    id: `reminder-card-${r.id}`,
    surfaceClass: 'panel-surface',
    effectClass: 'status-highlight',
    interactionState: expanded ? 'active' : 'idle',
    visibilityState: 'visible',
    budgetPriority: isPast ? 'high' : 'normal',
    areaHint: 132,
    motionClassHint: 'content',
    transformOwnerHint: 'surface',
    filterOwnerHint: 'none',
    opacityOwnerHint: 'surface',
  })
  const cardRuntime = useSurfaceMotionRuntime(cardDecision, { family: 'content' })
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pressed, setPressed] = useState(false)
  const interaction = useInteractiveSurfaceMotion({
    id: `mobile-reminders-card-${r.id}`,
    hovered,
    focused,
    selected: expanded || isPast,
    pressed,
    surfaceClass: 'panel-surface',
    effectClass: 'status-highlight',
    budgetPriority: isPast ? 'high' : 'normal',
    areaHint: 136,
    family: 'content',
  })
  const cardTransition = {
    duration: Math.max(0.12, cardRuntime.timings.quickMs / 1000),
    ease: cardRuntime.timings.framerEase,
  }

  const statusColor = r.done ? '#30d158' : isPast ? '#ff453a' : isSoon ? '#ff9f0a' : t.accent
  const statusIcon  = r.done ? <CheckCircle2 size={isCompactMobile ? 12 : 14}/> : isPast ? <AlertCircle size={isCompactMobile ? 12 : 14}/> : isSoon ? <AlarmClock size={isCompactMobile ? 12 : 14}/> : <Bell size={isCompactMobile ? 12 : 14}/>

  const fmtDt = (d: Date) => {
    const today = d.toDateString() === now.toDateString()
    const tomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString()
    const timeStr = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    if (today)    return `Today ${timeStr}`
    if (tomorrow) return `Tomorrow ${timeStr}`
    return d.toLocaleDateString([], { month:'short', day:'numeric' }) + ' ' + timeStr
  }

  const openLinkedNote = () => {
    if (!linkedNote) return
    openNote(linkedNote.id)
    setNote(linkedNote.id)
    setView?.('notes')
  }

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={cardTransition}>
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
      <Glass glow={isSoon && !r.done} style={{ padding:cardPadding, marginBottom:isCompactMobile ? 6 : 8, opacity: r.done?0.55:1, borderLeft:`2px solid ${statusColor}`, transition:'all 0.15s', position:'relative', overflow:'hidden' }}>
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
        <div style={{ display:'flex', alignItems:'flex-start', gap:isCompactMobile ? 9 : 12 }}>
          {/* Done toggle */}
          <button onClick={()=>doneRem(r.id)} style={{ width:isCompactMobile ? 20 : 22, height:isCompactMobile ? 20 : 22, borderRadius:isCompactMobile ? 5 : 6, border:`2px solid ${r.done?statusColor:'rgba(255,255,255,0.2)'}`, background:r.done?statusColor:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, color:r.done?'#fff':'inherit', transition:'all 0.15s' }}>
            {r.done && <Check size={isCompactMobile ? 11 : 12}/>}
          </button>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:cardTitleSize, fontWeight:600, opacity:r.done?0.5:1, textDecoration:r.done?'line-through':undefined, lineHeight:1.4 }}>{r.title}</span>
              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                {hasnotes && (
                  <InteractiveIconButton motionId={`reminder-expand-${r.id}`} intent="accent" idleOpacity={0.5} radius={4} onClick={()=>setExpanded(s=>!s)}>
                    <motion.span
                      aria-hidden="true"
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={cardRuntime.framer.transformTransition}
                      style={{ display: 'inline-flex' }}
                    >
                      <ChevronDown size={12}/>
                    </motion.span>
                  </InteractiveIconButton>
                )}
                <InteractiveIconButton motionId={`reminder-edit-${r.id}`} onClick={onEdit} idleOpacity={0.3} radius={4}>
                  <Edit3 size={isCompactMobile ? 11 : 12}/>
                </InteractiveIconButton>
                <InteractiveIconButton motionId={`reminder-del-${r.id}`} onClick={()=>delRem(r.id)} intent="danger" idleOpacity={0.3} radius={4}>
                  <Trash2 size={isCompactMobile ? 11 : 12}/>
                </InteractiveIconButton>
              </div>
            </div>

            {r.msg && !expanded && <div style={{ fontSize:cardBodySize, opacity:0.6, marginTop:3, lineHeight:1.45, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.msg}</div>}

            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:isCompactMobile ? 5 : 6, marginTop:isCompactMobile ? 6 : 7 }}>
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:cardMetaSize, color:statusColor, fontWeight:600 }}>
                {statusIcon} {fmtDt(dt)}
              </span>
              {r.repeat !== 'none' && (
                <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:cardTagSize, padding:isCompactMobile ? '2px 6px' : '2px 7px', borderRadius:10, background:`rgba(${rgb},0.12)`, color:t.accent }}>
                  <Repeat size={isCompactMobile ? 8 : 9}/> {formatReminderRepeat(r.repeat)}
                </span>
              )}
              {linkedTask ? (
                <button
                  onClick={() => setView?.('tasks')}
                  style={{ fontSize:cardTagSize, padding:isCompactMobile ? '2px 6px' : '2px 7px', borderRadius:10, border:'1px solid rgba(255,255,255,0.16)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', maxWidth:180, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden' }}
                  title={linkedTask.title}
                >
                  Task: {linkedTask.title}
                </button>
              ) : null}
              {linkedNote ? (
                <button
                  onClick={openLinkedNote}
                  style={{ fontSize:cardTagSize, padding:isCompactMobile ? '2px 6px' : '2px 7px', borderRadius:10, border:'1px solid rgba(255,255,255,0.16)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', maxWidth:180, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden' }}
                  title={linkedNote.title}
                >
                  Note: {linkedNote.title}
                </button>
              ) : null}
              {r.snoozeUntil && !r.done && (
                <span style={{ fontSize:cardTagSize, padding:isCompactMobile ? '2px 6px' : '2px 7px', borderRadius:10, background:'rgba(255,159,10,0.15)', color:'#ff9f0a', display:'flex', alignItems:'center', gap:3 }}>
                  <AlarmClock size={isCompactMobile ? 8 : 9}/> Snoozed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded notes */}
        <AnimatePresence>
          {expanded && (hasnotes || r.msg) && (
            <motion.div
              initial={{height:0,opacity:0}}
              animate={{height:'auto',opacity:1}}
              exit={{height:0,opacity:0}}
              transition={{
                duration: Math.max(0.14, cardRuntime.timings.regularMs / 1000),
                ease: cardRuntime.timings.framerEase,
              }}
              style={{ overflow:'hidden' }}
            >
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                {r.msg && <div style={{ fontSize:13, opacity:0.7, lineHeight:1.55, marginBottom: hasnotes?10:0 }}>{r.msg}</div>}
                {hasnotes && <NexusMarkdown content={(r as any).notes} />}
                {linkedTask || linkedNote ? (
                  <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                    {linkedTask ? (
                      <button
                        onClick={() => setView?.('tasks')}
                        style={{ padding:'4px 9px', borderRadius:7, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:10, fontWeight:700, color:'inherit' }}
                      >
                        Open Task
                      </button>
                    ) : null}
                    {linkedNote ? (
                      <button
                        onClick={openLinkedNote}
                        style={{ padding:'4px 9px', borderRadius:7, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', cursor:'pointer', fontSize:10, fontWeight:700, color:'inherit' }}
                      >
                        Open Note
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Snooze quick buttons for overdue */}
        {isPast && !r.done && (
          <div style={{ display:'flex', gap:5, marginTop:10 }}>
            {REMINDER_SNOOZE_PRESETS.map(m => (
              <button key={m} onClick={()=>snoozeRem(r.id,m)} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(255,159,10,0.2)', background:'rgba(255,159,10,0.08)', cursor:'pointer', fontSize:10, fontWeight:600, color:'#ff9f0a' }}>
                Snooze {m<60?`${m}m`:'1h'}
              </button>
            ))}
          </div>
        )}
      </Glass>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function RemindersView({ setView }: { setView?: (viewId: string) => void } = {}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { reminders, tasks, addRem } = useApp()
  const mob = useMobile()
  const compactEdge = Math.min(mob.screenW, mob.screenH)
  const isTinyMobile = mob.isMobile && compactEdge <= 430
  const isTightMobile = mob.isMobile && mob.screenH <= 900
  const isLandscapeMobile = mob.isMobile && mob.isLandscape
  const isCompactMobile = mob.isMobile && (isTinyMobile || isTightMobile || isLandscapeMobile)
  const compactHeaderPadding = isCompactMobile ? '6px 8px 0' : (mob.isMobile ? '10px 10px 0' : '10px 14px 0')
  const compactRowPadding = isCompactMobile ? '6px 10px' : '10px 14px'
  const compactControlFont = isCompactMobile ? 10 : 11

  const [toasts, setToasts]       = useState<Toast[]>([])
  const [quietHours, setQuietHours] = useState<QuietHoursState>(() => readQuietHours())
  const {
    dismiss,
    snooze,
    fallbackMode,
    nativeReady,
    serviceState,
    lastSyncError,
    syncPermissions,
    resyncOpenReminders,
    openSystemSettings,
  } = useChecker(setToasts, quietHours)
  const [now, setNow]             = useState(new Date())
  const [search, setSearch]       = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(REMINDER_SEARCH_STORAGE_KEY) || ''
  })
  const [filter, setFilter]       = useState<'all'|'upcoming'|'overdue'|'soon'|'done'>(() => {
    if (typeof window === 'undefined') return 'upcoming'
    const saved = window.localStorage.getItem(REMINDER_FILTER_STORAGE_KEY)
    return (['all','upcoming','overdue','soon','done'] as const).includes(saved as any)
      ? (saved as 'all'|'upcoming'|'overdue'|'soon'|'done')
      : 'upcoming'
  })
  const [newOpen, setNewOpen]     = useState(false)
  const [editId, setEditId]       = useState<string|null>(null)
  const [controlBusy, setControlBusy] = useState<'permissions' | 'reschedule' | 'settings' | null>(null)
  const [controlCenterOpen, setControlCenterOpen] = useState(false)
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Tick every 30s
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id) }, [])
  useEffect(() => {
    try {
      localStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(quietHours))
    } catch {}
  }, [quietHours])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(REMINDER_FILTER_STORAGE_KEY, filter)
  }, [filter])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(REMINDER_SEARCH_STORAGE_KEY, search)
  }, [search])

  const editReminder = reminders.find(r => r.id === editId)

  const filtered = useMemo(() => {
    let rs = reminders
    if (search) rs = rs.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.msg?.toLowerCase().includes(search.toLowerCase()))
    switch(filter) {
      case 'upcoming': return rs.filter(r => !r.done && new Date(r.snoozeUntil||r.datetime) >= now).sort((a,b) => new Date(a.snoozeUntil||a.datetime).getTime() - new Date(b.snoozeUntil||b.datetime).getTime())
      case 'overdue':  return rs.filter(r => !r.done && new Date(r.snoozeUntil||r.datetime) < now).sort((a,b) => new Date(a.snoozeUntil||a.datetime).getTime() - new Date(b.snoozeUntil||b.datetime).getTime())
      case 'soon':     return rs.filter(r => !r.done && new Date(r.snoozeUntil||r.datetime) >= now && (new Date(r.snoozeUntil||r.datetime).getTime() - now.getTime()) <= 30*60000).sort((a,b) => new Date(a.snoozeUntil||a.datetime).getTime() - new Date(b.snoozeUntil||b.datetime).getTime())
      case 'done':     return rs.filter(r => r.done).sort((a,b) => b.datetime.localeCompare(a.datetime))
      default:         return [...rs].sort((a,b) => new Date(a.snoozeUntil||a.datetime).getTime() - new Date(b.snoozeUntil||b.datetime).getTime())
    }
  }, [reminders, search, filter, now])

  const overdue  = reminders.filter(r => !r.done && new Date(r.snoozeUntil||r.datetime) < now)
  const upcoming = reminders.filter(r => !r.done && new Date(r.snoozeUntil||r.datetime) >= now)
  const done     = reminders.filter(r => r.done)
  const soonCount = upcoming.filter(r => (new Date(r.snoozeUntil||r.datetime).getTime() - now.getTime()) < 30*60000).length
  const todayCount = reminders.filter(r => {
    const dt = new Date(r.snoozeUntil || r.datetime)
    return !r.done && dt.toDateString() === now.toDateString()
  }).length
  const todaySummary = useMemo(
    () => computeTodayLayerSummary(tasks, reminders, now),
    [tasks, reminders, now],
  )

  const createTemplateReminder = useCallback((templateId: ReminderTemplateId) => {
    const created = createReminderFromTemplate(templateId, new Date())
    if (!created) return
    addRem({
      title: created.title,
      msg: created.msg,
      datetime: created.datetime,
      repeat: created.repeat,
    })
  }, [addRem])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const cmd = event.metaKey || event.ctrlKey

      if (cmd && key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      if (isEditableTarget(event.target)) return

      if (key === 'n') {
        event.preventDefault()
        setNewOpen(true)
        return
      }
      if (key === '1') {
        event.preventDefault()
        setFilter('upcoming')
        return
      }
      if (key === '2') {
        event.preventDefault()
        setFilter('soon')
        return
      }
      if (key === '3') {
        event.preventDefault()
        setFilter('overdue')
        return
      }
      if (key === '4') {
        event.preventDefault()
        setFilter('all')
        return
      }
      if (key === '5') {
        event.preventDefault()
        setFilter('done')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const nextOpenReminderAt = useMemo(() => {
    const pending = reminders
      .filter((reminder) => !reminder.done)
      .map((reminder) => new Date(reminder.snoozeUntil || reminder.datetime))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    return pending[0] ? pending[0].toISOString() : null
  }, [reminders])

  const controlError = useMemo(() => {
    if (lastSyncError) return lastSyncError
    if (!serviceState.nativeAvailable) return 'PLUGIN_UNAVAILABLE'
    if (serviceState.permission === 'denied') return 'PERMISSION_DENIED'
    if (serviceState.permission === 'prompt') return 'PERMISSION_PROMPT'
    if (serviceState.permission === 'unknown') return 'PERMISSION_UNKNOWN'
    if (reminders.filter((reminder) => !reminder.done).length === 0) return 'NO_OPEN_REMINDERS'
    if (serviceState.lastRescheduleReason && serviceState.lastRescheduleReason !== 'OK') {
      return serviceState.lastRescheduleReason
    }
    return null
  }, [lastSyncError, reminders, serviceState])

  // Group by day for 'all'/'upcoming'
  const grouped = useMemo(() => {
    if (filter !== 'all' && filter !== 'upcoming') return null
    const map = new Map<string, Reminder[]>()
    filtered.forEach(r => {
      const dt = new Date(r.snoozeUntil || r.datetime)
      const today = now.toDateString()
      const tomorrow = new Date(now.getTime() + 86400000).toDateString()
      let key = dt.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })
      if (dt.toDateString() === today) key = 'Today'
      if (dt.toDateString() === tomorrow) key = 'Tomorrow'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    })
    return map
  }, [filtered, filter, now])

  return (
    <div
      className="nx-mobile-view-screen"
      style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}
    >
      <div style={{ padding: compactHeaderPadding }}>
        <ViewHeader
          title="Reminders"
          subtitle={`${upcoming.length} upcoming · ${overdue.length} overdue · ${done.length} done`}
        />
      </div>

      {/* ── Header ── */}
      {mob.isMobile ? (
        <>
          <div className="nx-mobile-row-scroll" style={{ gap:isCompactMobile ? 6 : 8, padding:compactRowPadding, borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
            <div className="nx-mobile-row-flex" style={{ position:'relative', minWidth:isCompactMobile ? 150 : 180 }}>
              <Search size={isCompactMobile ? 12 : 13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
              <input ref={searchInputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reminders…" style={{ width:'100%', padding:isCompactMobile ? '6px 9px 6px 28px' : '7px 10px 7px 32px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:isCompactMobile ? 11 : 12, color:'inherit' }}/>
            </div>
            <button
              onClick={() => setMobileFilterSheetOpen(true)}
              style={{ display:'inline-flex', alignItems:'center', gap:5, padding:isCompactMobile ? '6px 8px' : '7px 10px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.14)', cursor:'pointer', color:'inherit', fontSize:compactControlFont, fontWeight:700, flexShrink:0 }}
            >
              <Search size={11} /> Filter
            </button>
            <button onClick={()=>setControlCenterOpen(true)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:isCompactMobile ? '6px 8px' : '7px 10px', borderRadius:9, background:`rgba(${rgb},0.12)`, border:`1px solid rgba(${rgb},0.26)`, cursor:'pointer', color:t.accent, fontSize:compactControlFont, fontWeight:700, flexShrink:0 }}>
              <Settings2 size={11}/> Control
            </button>
            <button onClick={()=>setNewOpen(true)} style={{ display:'flex', alignItems:'center', gap:5, padding:isCompactMobile ? '6px 9px' : '7px 11px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', color:'#fff', fontSize:isCompactMobile ? 10.5 : 11.5, fontWeight:700, boxShadow:`0 2px 14px rgba(${rgb},0.4)`, flexShrink:0 }}>
              <Plus size={13}/> New
            </button>
          </div>

          <div className="nx-mobile-row-scroll" style={{ gap:8, padding:isCompactMobile ? '5px 10px' : '8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:`rgba(${rgb},0.14)`, border:`1px solid rgba(${rgb},0.28)`, color:t.accent, fontWeight:700, textTransform:'capitalize' }}>
              {filter}
            </span>
            <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)' }}>
              <b>{upcoming.length}</b> Upcoming
            </span>
            <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background: overdue.length ? 'rgba(255,69,58,0.14)' : 'rgba(255,255,255,0.06)', border: overdue.length ? '1px solid rgba(255,69,58,0.3)' : '1px solid rgba(255,255,255,0.1)', color: overdue.length ? '#ff453a' : 'inherit' }}>
              <b>{overdue.length}</b> Overdue
            </span>
            <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, background: soonCount ? 'rgba(255,159,10,0.14)' : 'rgba(255,255,255,0.06)', border: soonCount ? '1px solid rgba(255,159,10,0.3)' : '1px solid rgba(255,255,255,0.1)', color: soonCount ? '#ff9f0a' : 'inherit' }}>
              <b>{soonCount}</b> Soon
            </span>
            <button onClick={() => setView?.('tasks')} style={{ marginLeft:'auto', padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700 }}>
              Tasks {todaySummary.openTaskCount}
            </button>
          </div>
        </>
      ) : (
        <div className="nx-mobile-row-scroll" style={{ gap:isCompactMobile ? 8 : 10, padding:compactRowPadding, borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
          <div className="nx-mobile-row-flex" style={{ position:'relative', minWidth:isCompactMobile ? 150 : 180, maxWidth:isLandscapeMobile ? 230 : 280 }}>
            <Search size={isCompactMobile ? 12 : 13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
            <input ref={searchInputRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reminders…" style={{ width:'100%', padding:isCompactMobile ? '6px 9px 6px 28px' : '7px 10px 7px 32px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:isCompactMobile ? 11 : 12, color:'inherit' }}/>
          </div>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:9, overflowX:'auto', maxWidth:'100%' }}>
            {(['upcoming','soon','overdue','all','done'] as const).map(f => (
              <button key={f} onClick={()=>setFilter(f)} style={{ padding:isCompactMobile ? '5px 8px' : '6px 11px', background:filter===f?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:compactControlFont, fontWeight:700, color:filter===f?'#fff':'inherit', opacity:filter===f?1:0.5, transition:'all 0.12s', textTransform:'capitalize', position:'relative', whiteSpace:'nowrap' }}>
                {f}
                {f==='overdue' && overdue.length>0 && <span style={{ marginLeft:4, fontSize:10, padding:'1px 5px', borderRadius:8, background:filter==='overdue'?'rgba(0,0,0,0.2)':'rgba(255,69,58,0.8)', color:'#fff' }}>{overdue.length}</span>}
                {f==='soon' && soonCount>0 && <span style={{ marginLeft:4, fontSize:10, padding:'1px 5px', borderRadius:8, background:filter==='soon'?'rgba(0,0,0,0.2)':'rgba(255,159,10,0.8)', color:'#fff' }}>{soonCount}</span>}
              </button>
            ))}
          </div>
          <button onClick={()=>setNewOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:isCompactMobile ? '6px 10px' : '7px 14px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', color:'#fff', fontSize:isCompactMobile ? 11 : 12, fontWeight:700, boxShadow:`0 2px 14px rgba(${rgb},0.4)`, flexShrink:0 }}>
            <Plus size={13}/> New
          </button>
        </div>
      )}

      {/* ── Stats / Today strip ── */}
      {!mob.isMobile ? (
        <>
          <div className="nx-mobile-row-scroll" style={{ gap:isCompactMobile ? 10 : 14, padding:isCompactMobile ? '5px 12px' : '8px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.06)', flexShrink:0 }}>
            {[
              { label:'Upcoming', val:upcoming.length, color:t.accent },
              { label:'Overdue',  val:overdue.length,  color: overdue.length?'#ff453a':'inherit' },
              { label:'Soon (<30m)', val:soonCount, color: soonCount?'#ff9f0a':'inherit' },
              { label:'Today', val:todayCount, color:'#64d2ff' },
              { label:'Done',     val:done.length,     color:'#30d158' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center', fontSize:isCompactMobile ? 9 : 10, minWidth:isCompactMobile ? 58 : undefined }}>
                <div style={{ fontWeight:800, fontSize:isCompactMobile ? 13 : 16, color:s.color, lineHeight:1 }}>{s.val}</div>
                <div style={{ opacity:0.4, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="nx-mobile-row-scroll" style={{ gap:8, padding:isCompactMobile ? '5px 10px' : '8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.05)' }}>
            <div className="nx-mobile-row-scroll" style={{ gap:8, flexShrink:0 }}>
              <span style={{ fontSize:10, opacity:0.55, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase' }}>Today Layer</span>
              <span style={{ fontSize:11, opacity:0.72 }}>Open Tasks: <b>{todaySummary.openTaskCount}</b></span>
              <span style={{ fontSize:11, opacity:0.72 }}>Due Today: <b>{todaySummary.dueTodayCount}</b></span>
              <span style={{ fontSize:11, opacity:0.72, color: todaySummary.overdueCount > 0 ? '#ff453a' : 'inherit' }}>
                Overdue: <b>{todaySummary.overdueCount}</b>
              </span>
            </div>
            <div className="nx-mobile-row-scroll" style={{ gap:6, flexShrink:0 }}>
              <button onClick={() => setView?.('tasks')} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700 }}>Zu Tasks</button>
              <button onClick={() => setFilter('upcoming')} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid rgba(${rgb},0.26)`, background:`rgba(${rgb},0.12)`, color:t.accent, cursor:'pointer', fontSize:11, fontWeight:700 }}>Heute/Upcoming</button>
              <button onClick={() => setControlCenterOpen(true)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700 }}>Control Center</button>
            </div>
          </div>
        </>
      ) : null}

      {!mob.isMobile ? (
      <Glass style={{ margin: isCompactMobile ? '6px 10px 6px' : '10px 14px 8px', padding: isCompactMobile ? '8px 10px' : '10px 12px' }}>
        <div className="nx-mobile-tight-stack" style={{ gap: 8 }}>
          <div className="nx-mobile-row-scroll" style={{ gap: 8 }}>
            <span style={{ fontSize: 10, opacity: 0.55, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Notification Control Center
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: serviceState.nativeAvailable ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,69,58,0.3)', background: serviceState.nativeAvailable ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)', color: serviceState.nativeAvailable ? '#30d158' : '#ff453a', fontWeight: 700 }}>
              Native: {serviceState.nativeAvailable ? 'yes' : 'no'}
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: serviceState.permission === 'granted' ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,159,10,0.32)', background: serviceState.permission === 'granted' ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.1)', color: serviceState.permission === 'granted' ? '#30d158' : '#ff9f0a', fontWeight: 700 }}>
              Permission: {serviceState.permission}
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: fallbackMode ? '1px solid rgba(255,159,10,0.3)' : '1px solid rgba(48,209,88,0.3)', background: fallbackMode ? 'rgba(255,159,10,0.1)' : 'rgba(48,209,88,0.1)', color: fallbackMode ? '#ff9f0a' : '#30d158', fontWeight: 700 }}>
              Fallback: {fallbackMode ? 'active' : 'off'}
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: quietHours.enabled ? '1px solid rgba(255,159,10,0.3)' : '1px solid rgba(255,255,255,0.18)', background: quietHours.enabled ? 'rgba(255,159,10,0.1)' : 'rgba(255,255,255,0.05)', color: quietHours.enabled ? '#ff9f0a' : 'inherit', fontWeight: 700 }}>
              Quiet: {quietHours.enabled ? (isNowWithinQuietHours(now, quietHours) ? 'active now' : `${quietHours.start}–${quietHours.end}`) : 'off'}
            </span>
          </div>
          <span style={{ fontSize: 10, opacity: 0.72, color: nativeReady ? '#30d158' : 'inherit', fontWeight: 700 }}>
            {nativeReady ? 'Native Notifications aktiv' : 'Fallback-Poller aktiv'}
          </span>
        </div>

        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px' }}>
            <div style={{ fontSize: 10, opacity: 0.55 }}>Scheduled</div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{serviceState.scheduled}</div>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px' }}>
            <div style={{ fontSize: 10, opacity: 0.55 }}>Next reminder</div>
            <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {serviceState.nextReminderAt ? fmtDt(serviceState.nextReminderAt) : (nextOpenReminderAt ? fmtDt(nextOpenReminderAt) : 'none')}
            </div>
          </div>
          <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px' }}>
            <div style={{ fontSize: 10, opacity: 0.55 }}>Last reschedule</div>
            <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {serviceState.lastRescheduleAt ? fmtDt(serviceState.lastRescheduleAt) : 'never'}
            </div>
          </div>
        </div>

        <div className="nx-mobile-row-scroll" style={{ marginTop: 8, gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
            <input
              type='checkbox'
              checked={quietHours.enabled}
              onChange={(event) => setQuietHours((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            Quiet Hours
          </label>
          <input
            type='time'
            value={quietHours.start}
            onChange={(event) => setQuietHours((prev) => ({ ...prev, start: event.target.value }))}
            style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 11, padding: '4px 6px' }}
          />
          <span style={{ opacity: 0.5, fontSize: 11 }}>→</span>
          <input
            type='time'
            value={quietHours.end}
            onChange={(event) => setQuietHours((prev) => ({ ...prev, end: event.target.value }))}
            style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 11, padding: '4px 6px' }}
          />
          <span style={{ fontSize: 10, opacity: 0.58 }}>
            In Quiet Hours werden lokale Fallback-Alerts unterdrückt.
          </span>
        </div>

        {controlError ? (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid rgba(255,159,10,0.28)', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', padding: '6px 8px', fontSize: 10, fontWeight: 700 }}>
            <AlertCircle size={12}/> {controlError}
          </div>
        ) : null}

        <div className="nx-mobile-row-scroll" style={{ marginTop: 8, gap: 6 }}>
          <button
            onClick={async () => {
              setControlBusy('permissions')
              await syncPermissions()
              setControlBusy(null)
            }}
            style={{ padding:'5px 9px', borderRadius:8, border:`1px solid rgba(${rgb},0.3)`, background:`rgba(${rgb},0.14)`, color:t.accent, fontSize:10, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Bell size={11}/> {controlBusy === 'permissions' ? 'Prüfe…' : 'Permissions prüfen'}
          </button>
          <button
            onClick={async () => {
              setControlBusy('reschedule')
              await resyncOpenReminders()
              setControlBusy(null)
            }}
            style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <RefreshCw size={11}/> {controlBusy === 'reschedule' ? 'Sync…' : 'Alle offenen neu syncen'}
          </button>
          <button
            onClick={async () => {
              setControlBusy('settings')
              await openSystemSettings()
              setControlBusy(null)
            }}
            style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Settings2 size={11}/> {controlBusy === 'settings' ? 'Öffne…' : 'Systemeinstellungen'}
          </button>
          <button
            onClick={() => alert('Fallback aktiviert sich, wenn Local Notifications nicht verfügbar sind oder Permissions fehlen. Erinnerungen werden dann per In-App-Poller geprüft.')}
            style={{ padding:'5px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:10, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <LifeBuoy size={11}/> Fallback erklären
          </button>
          {REMINDER_TEMPLATES.map((template, index) => (
            <button
              key={template.id}
              onClick={() => createTemplateReminder(template.id)}
              style={{
                marginLeft: index === 0 ? 'auto' : undefined,
                padding:'5px 9px',
                borderRadius:8,
                border:index === 0 ? '1px solid rgba(48,209,88,0.26)' : '1px solid rgba(255,255,255,0.14)',
                background:index === 0 ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.06)',
                color:index === 0 ? '#30d158' : 'inherit',
                fontSize:10,
                fontWeight:700,
                cursor:'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {index === 0 ? <Plus size={11}/> : null}
              {template.label}
            </button>
          ))}
        </div>
      </Glass>
      ) : null}

      <MobileSheet
        open={mob.isMobile && mobileFilterSheetOpen}
        onClose={() => setMobileFilterSheetOpen(false)}
        title="Filter reminders"
        mode="bottom"
      >
        <div style={{ padding: '10px 10px 14px', display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
            {(['upcoming','soon','overdue','all','done'] as const).map((entry) => (
              <button
                key={`mobile-reminder-filter-${entry}`}
                onClick={() => {
                  setFilter(entry)
                  setMobileFilterSheetOpen(false)
                }}
                style={{
                  padding:'8px 10px',
                  borderRadius:9,
                  background:filter===entry?t.accent:'rgba(255,255,255,0.06)',
                  border:filter===entry?'1px solid transparent':'1px solid rgba(255,255,255,0.14)',
                  cursor:'pointer',
                  fontSize:12,
                  fontWeight:700,
                  color:filter===entry?'#fff':'inherit',
                  textTransform:'capitalize',
                }}
              >
                {entry}
              </button>
            ))}
          </div>
          <div className="nx-mobile-row-scroll" style={{ gap: 6 }}>
            <button onClick={() => { setFilter('soon'); setMobileFilterSheetOpen(false) }} style={{ padding:'6px 9px', borderRadius:8, border:'1px solid rgba(255,159,10,0.3)', background:'rgba(255,159,10,0.12)', color:'#ff9f0a', cursor:'pointer', fontSize:11, fontWeight:700 }}>
              Soon ({soonCount})
            </button>
            <button onClick={() => { setFilter('overdue'); setMobileFilterSheetOpen(false) }} style={{ padding:'6px 9px', borderRadius:8, border:'1px solid rgba(255,69,58,0.3)', background:'rgba(255,69,58,0.12)', color:'#ff453a', cursor:'pointer', fontSize:11, fontWeight:700 }}>
              Overdue ({overdue.length})
            </button>
            <button onClick={() => { setFilter('upcoming'); setMobileFilterSheetOpen(false) }} style={{ padding:'6px 9px', borderRadius:8, border:`1px solid rgba(${rgb},0.28)`, background:`rgba(${rgb},0.12)`, color:t.accent, cursor:'pointer', fontSize:11, fontWeight:700 }}>
              Upcoming
            </button>
          </div>
        </div>
      </MobileSheet>

      {/* ── List ── */}
      <div style={{ flex:1, overflowY:'auto', padding:isCompactMobile ? '8px 10px' : '12px 14px' }}>
        {filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60%', gap:12, opacity:0.45 }}>
            <Bell size={44} strokeWidth={1} style={{ color:t.accent, opacity:0.4 }}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:5 }}>
                {filter==='overdue'
                  ? 'No overdue reminders'
                  : filter==='done'
                    ? 'No completed reminders'
                    : filter==='soon'
                      ? 'No reminders in the next 30 minutes'
                      : 'No reminders'}
              </div>
              <div style={{ fontSize:12, opacity:0.6 }}>
                {filter==='upcoming'?'You\'re all caught up!':'Click + New to add one'}
              </div>
            </div>
          </div>
        ) : grouped ? (
          Array.from(grouped.entries()).map(([day, items]) => (
            <div key={day} style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, fontWeight:800, opacity:0.4, textTransform:'uppercase', letterSpacing:1, marginBottom:8, display:'flex', alignItems:'center', gap:8 }}>
                <Calendar size={10}/> {day}
                <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)', marginLeft:4 }}/>
                <span style={{ opacity:0.6 }}>{items.length}</span>
              </div>
              <AnimatePresence>
                {items.map(r => <ReminderCard key={r.id} r={r} now={now} onEdit={()=>setEditId(r.id)} setView={setView} />)}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <AnimatePresence>
            {filtered.map(r => <ReminderCard key={r.id} r={r} now={now} onEdit={()=>setEditId(r.id)} setView={setView} />)}
          </AnimatePresence>
        )}
      </div>

      <MobileSheet
        open={mob.isMobile && controlCenterOpen}
        onClose={() => setControlCenterOpen(false)}
        title="Notification Control Center"
        mode="bottom"
      >
        <div style={{ padding: '8px 8px 12px', display: 'grid', gap: 8 }}>
          <div className="nx-mobile-row-scroll" style={{ gap: 6 }}>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: serviceState.nativeAvailable ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,69,58,0.3)', background: serviceState.nativeAvailable ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)', color: serviceState.nativeAvailable ? '#30d158' : '#ff453a', fontWeight: 700 }}>
              Native: {serviceState.nativeAvailable ? 'yes' : 'no'}
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: serviceState.permission === 'granted' ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,159,10,0.32)', background: serviceState.permission === 'granted' ? 'rgba(48,209,88,0.1)' : 'rgba(255,159,10,0.1)', color: serviceState.permission === 'granted' ? '#30d158' : '#ff9f0a', fontWeight: 700 }}>
              Permission: {serviceState.permission}
            </span>
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, border: fallbackMode ? '1px solid rgba(255,159,10,0.3)' : '1px solid rgba(48,209,88,0.3)', background: fallbackMode ? 'rgba(255,159,10,0.1)' : 'rgba(48,209,88,0.1)', color: fallbackMode ? '#ff9f0a' : '#30d158', fontWeight: 700 }}>
              Fallback: {fallbackMode ? 'active' : 'off'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
            <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px' }}>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Scheduled</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{serviceState.scheduled}</div>
            </div>
            <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px' }}>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Next</div>
              <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {serviceState.nextReminderAt ? fmtDt(serviceState.nextReminderAt) : (nextOpenReminderAt ? fmtDt(nextOpenReminderAt) : 'none')}
              </div>
            </div>
            <div style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px' }}>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Reschedule</div>
              <div style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {serviceState.lastRescheduleAt ? fmtDt(serviceState.lastRescheduleAt) : 'never'}
              </div>
            </div>
          </div>

          <div className="nx-mobile-row-scroll" style={{ gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700 }}>
              <input
                type='checkbox'
                checked={quietHours.enabled}
                onChange={(event) => setQuietHours((prev) => ({ ...prev, enabled: event.target.checked }))}
              />
              Quiet Hours
            </label>
            <input
              type='time'
              value={quietHours.start}
              onChange={(event) => setQuietHours((prev) => ({ ...prev, start: event.target.value }))}
              style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 11, padding: '4px 6px' }}
            />
            <span style={{ opacity: 0.5, fontSize: 11 }}>→</span>
            <input
              type='time'
              value={quietHours.end}
              onChange={(event) => setQuietHours((prev) => ({ ...prev, end: event.target.value }))}
              style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'inherit', fontSize: 11, padding: '4px 6px' }}
            />
          </div>

          {controlError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, border: '1px solid rgba(255,159,10,0.28)', background: 'rgba(255,159,10,0.12)', color: '#ff9f0a', padding: '6px 8px', fontSize: 10, fontWeight: 700 }}>
              <AlertCircle size={12}/> {controlError}
            </div>
          ) : null}

          <div className="nx-mobile-row-scroll" style={{ gap: 6 }}>
            <button
              onClick={async () => {
                setControlBusy('permissions')
                await syncPermissions()
                setControlBusy(null)
              }}
              style={{ padding:'6px 9px', borderRadius:8, border:`1px solid rgba(${rgb},0.3)`, background:`rgba(${rgb},0.14)`, color:t.accent, fontSize:11, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Bell size={11}/> {controlBusy === 'permissions' ? 'Prüfe…' : 'Permissions'}
            </button>
            <button
              onClick={async () => {
                setControlBusy('reschedule')
                await resyncOpenReminders()
                setControlBusy(null)
              }}
              style={{ padding:'6px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:11, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <RefreshCw size={11}/> {controlBusy === 'reschedule' ? 'Sync…' : 'Resync'}
            </button>
            <button
              onClick={async () => {
                setControlBusy('settings')
                await openSystemSettings()
                setControlBusy(null)
              }}
              style={{ padding:'6px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:11, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <Settings2 size={11}/> {controlBusy === 'settings' ? 'Öffne…' : 'System'}
            </button>
            <button
              onClick={() => alert('Fallback aktiviert sich, wenn Local Notifications nicht verfügbar sind oder Permissions fehlen. Erinnerungen werden dann per In-App-Poller geprüft.')}
              style={{ padding:'6px 9px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', fontSize:11, fontWeight:700, cursor:'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <LifeBuoy size={11}/> Fallback
            </button>
          </div>

          <div className="nx-mobile-row-scroll" style={{ gap: 6 }}>
            {REMINDER_TEMPLATES.map((template, index) => (
              <button
                key={`mobile-reminder-template-${template.id}`}
                onClick={() => createTemplateReminder(template.id)}
                style={{
                  padding:'6px 9px',
                  borderRadius:8,
                  border:index === 0 ? '1px solid rgba(48,209,88,0.26)' : '1px solid rgba(255,255,255,0.14)',
                  background:index === 0 ? 'rgba(48,209,88,0.12)' : 'rgba(255,255,255,0.06)',
                  color:index === 0 ? '#30d158' : 'inherit',
                  fontSize:11,
                  fontWeight:700,
                  cursor:'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {index === 0 ? <Plus size={11}/> : null}
                {template.label}
              </button>
            ))}
          </div>
        </div>
      </MobileSheet>

      {/* Modals */}
      <AnimatePresence>
        {newOpen  && <ReminderModal key="new" onClose={()=>setNewOpen(false)} setView={setView} />}
        {editId   && <ReminderModal key={editId} reminder={editReminder} onClose={()=>setEditId(null)} setView={setView} />}
      </AnimatePresence>

      {/* Toasts */}
      <AnimatePresence>
        {toasts.slice(-1).map(toast => (
          <ToastCard key={toast.id} toast={toast} onDone={()=>dismiss(toast.id)} onSnooze={m=>snooze(toast.id,m)}/>
        ))}
      </AnimatePresence>
    </div>
  )
}
