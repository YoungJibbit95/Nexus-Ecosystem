import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { Plus, Trash2, Check, Bell, X, Clock, Repeat, Calendar,
  ChevronDown, BellRing, Search, Filter, AlarmClock, Tag,
  Edit3, CheckCircle2, Circle, AlertCircle, Zap, Pin, Archive } from 'lucide-react'
import { Glass } from '../components/Glass'
import { NexusMarkdown } from '../components/NexusMarkdown'
import { useApp, Reminder } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
  return (
    <motion.div initial={{ x: 340, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:340, opacity:0 }} style={{ position:'fixed', top:20, right:20, zIndex:9999, width:360 }}>
      <Glass type="modal" glow style={{ padding:16, borderLeft:`3px solid ${t.accent}`, boxShadow:`0 16px 50px rgba(0,0,0,0.5), 0 0 24px rgba(${rgb},0.18)` }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`rgba(${rgb},0.15)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <BellRing size={18} style={{ color:t.accent }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{toast.title}</div>
            {toast.msg && <div style={{ fontSize:12, opacity:0.7, lineHeight:1.45 }}>{toast.msg}</div>}
          </div>
          <button onClick={onDone} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.4, color:'inherit', padding:3, borderRadius:5, flexShrink:0 }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.4'}><X size={15}/></button>
        </div>
        <div style={{ display:'flex', gap:6, marginTop:12 }}>
          <button onClick={onDone} style={{ flex:1, padding:'7px 0', borderRadius:8, background:t.accent, border:'none', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
            <Check size={12}/> Dismiss
          </button>
          {[5,15,60].map(m => (
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
function useChecker(setToasts: React.Dispatch<React.SetStateAction<Toast[]>>) {
  const { reminders, doneRem, snoozeRem } = useApp()
  const fired = useRef(new Set<string>())

  useEffect(() => {
    const check = () => {
      const now = new Date()
      reminders.filter(r => !r.done).forEach(r => {
        const dt = new Date(r.snoozeUntil || r.datetime)
        if (dt <= now && !fired.current.has(r.id)) {
          fired.current.add(r.id)
          playNotifSound()
          setToasts(ts => [...ts, { id: r.id, title: r.title, msg: r.msg }])
          try { (window as any).api?.notify(r.title, r.msg) } catch {}
        }
      })
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [reminders])

  const dismiss = (id: string) => { doneRem(id); fired.current.delete(id); setToasts(ts => ts.filter(t => t.id !== id)) }
  const snooze  = (id: string, m: number) => { snoozeRem(id, m); fired.current.delete(id); setToasts(ts => ts.filter(t => t.id !== id)) }
  return { dismiss, snooze }
}

// ── Reminder form ────────────────────────────────────────────────
function ReminderModal({ reminder, onClose }: { reminder?: Reminder; onClose: () => void }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { addRem, updateReminder } = useApp()

  const now = new Date()
  now.setMinutes(now.getMinutes() + 15)
  const defaultDT = now.toISOString().slice(0,16)

  const [title,    setTitle]    = useState(reminder?.title ?? '')
  const [msg,      setMsg]      = useState(reminder?.msg ?? '')
  const [datetime, setDatetime] = useState(reminder?.datetime ? reminder.datetime.slice(0,16) : defaultDT)
  const [repeat,   setRepeat]   = useState<Reminder['repeat']>(reminder?.repeat ?? 'none')
  const [tab,      setTab]      = useState<'basic'|'notes'>('basic')
  const [notes,    setNotes]    = useState((reminder as any)?.notes ?? '')

  const REPEATS: { id: Reminder['repeat']; label: string; icon: string }[] = [
    { id:'none',    label:'Once',    icon:'1' },
    { id:'daily',   label:'Daily',   icon:'D' },
    { id:'weekly',  label:'Weekly',  icon:'W' },
    { id:'monthly', label:'Monthly', icon:'M' },
  ]

  const save = () => {
    if (!title.trim()) return
    if (reminder) {
      updateReminder(reminder.id, { title, msg, datetime: new Date(datetime).toISOString(), repeat, notes } as any)
    } else {
      addRem({ title, msg, datetime: new Date(datetime).toISOString(), repeat })
    }
    onClose()
  }

  const setQuick = (mins: number) => {
    const d = new Date(); d.setMinutes(d.getMinutes() + mins)
    setDatetime(d.toISOString().slice(0,16))
  }

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(6px)' }}
      onClick={onClose}>
      <motion.div initial={{scale:0.92,y:20}} animate={{scale:1,y:0}} exit={{scale:0.92,y:20}} onClick={e=>e.stopPropagation()} style={{ width:440, maxHeight:'85vh', display:'flex', flexDirection:'column' }}>
        <Glass glow style={{ padding:0, display:'flex', flexDirection:'column', maxHeight:'85vh' }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:9, background:`rgba(${rgb},0.15)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bell size={15} style={{ color:t.accent }}/>
              </div>
              <span style={{ fontSize:15, fontWeight:800 }}>{reminder?'Edit Reminder':'New Reminder'}</span>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', opacity:0.4, color:'inherit' }}><X size={16}/></button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', padding:'0 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            {(['basic','notes'] as const).map(tab2 => (
              <button key={tab2} onClick={()=>setTab(tab2)} style={{ padding:'8px 14px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, color:tab===tab2?t.accent:'inherit', opacity:tab===tab2?1:0.45, borderBottom:`2px solid ${tab===tab2?t.accent:'transparent'}`, marginBottom:-1 }}>
                {tab2}
              </button>
            ))}
          </div>

          <div style={{ flex:1, overflow:'auto' }}>
            {tab === 'basic' && (
              <div style={{ padding:'16px 20px' }}>
                <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Reminder title…" style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', outline:'none', fontSize:14, fontWeight:600, color:'inherit', marginBottom:12 }} />
                <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Additional details… (optional)" rows={2} style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit', resize:'none', fontFamily:'inherit', marginBottom:14 }} />

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>When</label>
                  <input type="datetime-local" value={datetime} onChange={e=>setDatetime(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:13, color:'inherit', colorScheme: t.mode==='dark'?'dark':'light' }} />
                  <div style={{ display:'flex', gap:6, marginTop:7 }}>
                    {[{l:'15m',m:15},{l:'1h',m:60},{l:'3h',m:180},{l:'Tomorrow',m:24*60},{l:'1 week',m:7*24*60}].map(({l,m}) => (
                      <button key={l} onClick={()=>setQuick(m)} style={{ flex:1, padding:'5px 0', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', cursor:'pointer', fontSize:10, fontWeight:600, color:'inherit' }}>+{l}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:11, opacity:0.5, display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Repeat</label>
                  <div style={{ display:'flex', gap:6 }}>
                    {REPEATS.map(r => (
                      <button key={r.id} onClick={()=>setRepeat(r.id)} style={{ flex:1, padding:'8px 0', borderRadius:8, border:`1px solid ${repeat===r.id?t.accent:'rgba(255,255,255,0.1)'}`, background: repeat===r.id?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.05)', cursor:'pointer', fontSize:11, fontWeight:700, color: repeat===r.id?t.accent:'inherit', transition:'all 0.12s' }}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'notes' && (
              <div style={{ display:'flex', flexDirection:'column', height:280 }}>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Markdown notes…" style={{ flex:1, padding:'14px 20px', background:'transparent', border:'none', outline:'none', fontSize:13, color:'inherit', resize:'none', fontFamily:"'Fira Code',monospace", lineHeight:1.6 }} />
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:8, padding:'12px 20px 16px', borderTop:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <button onClick={onClose} style={{ flex:1, padding:'9px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', fontSize:13, color:'inherit' }}>Cancel</button>
            <button onClick={save} style={{ flex:2, padding:'9px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff', boxShadow:`0 2px 14px rgba(${rgb},0.4)` }}>
              {reminder ? 'Save Changes' : 'Create Reminder'}
            </button>
          </div>
        </Glass>
      </motion.div>
    </motion.div>
  )
}

// ── Reminder card ─────────────────────────────────────────────────
function ReminderCard({ r, onEdit, now }: { r: Reminder; onEdit: () => void; now: Date }) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { doneRem, delRem, snoozeRem } = useApp()
  const dt       = new Date(r.snoozeUntil || r.datetime)
  const isPast   = dt < now && !r.done
  const isSoon   = !isPast && (dt.getTime() - now.getTime()) < 30 * 60000
  const isToday  = dt.toDateString() === now.toDateString()
  const hasnotes = !!(r as any).notes
  const [expanded, setExpanded] = useState(false)

  const statusColor = r.done ? '#30d158' : isPast ? '#ff453a' : isSoon ? '#ff9f0a' : t.accent
  const statusIcon  = r.done ? <CheckCircle2 size={14}/> : isPast ? <AlertCircle size={14}/> : isSoon ? <AlarmClock size={14}/> : <Bell size={14}/>

  const fmtDt = (d: Date) => {
    const today = d.toDateString() === now.toDateString()
    const tomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString()
    const timeStr = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    if (today)    return `Today ${timeStr}`
    if (tomorrow) return `Tomorrow ${timeStr}`
    return d.toLocaleDateString([], { month:'short', day:'numeric' }) + ' ' + timeStr
  }

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
      <Glass glow={isSoon && !r.done} style={{ padding:'12px 16px', marginBottom:8, opacity: r.done?0.55:1, borderLeft:`2px solid ${statusColor}`, transition:'all 0.15s' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
          {/* Done toggle */}
          <button onClick={()=>doneRem(r.id)} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${r.done?statusColor:'rgba(255,255,255,0.2)'}`, background:r.done?statusColor:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, color:r.done?'#fff':'inherit', transition:'all 0.15s' }}>
            {r.done && <Check size={12}/>}
          </button>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <span style={{ fontSize:13, fontWeight:600, opacity:r.done?0.5:1, textDecoration:r.done?'line-through':undefined, lineHeight:1.4 }}>{r.title}</span>
              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                {hasnotes && <button onClick={()=>setExpanded(s=>!s)} style={{ background:'none', border:'none', cursor:'pointer', color:t.accent, opacity:0.5, padding:'2px 3px', borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.5'}><ChevronDown size={12} style={{ transform: expanded?'rotate(180deg)':'none', transition:'transform 0.2s' }}/></button>}
                <button onClick={onEdit} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:0.3, padding:'2px 3px', borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.3'}><Edit3 size={12}/></button>
                <button onClick={()=>delRem(r.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ff453a', opacity:0.3, padding:'2px 3px', borderRadius:4 }} onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='0.3'}><Trash2 size={12}/></button>
              </div>
            </div>

            {r.msg && !expanded && <div style={{ fontSize:12, opacity:0.6, marginTop:3, lineHeight:1.45, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.msg}</div>}

            <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, marginTop:7 }}>
              <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:statusColor, fontWeight:600 }}>
                {statusIcon} {fmtDt(dt)}
              </span>
              {r.repeat !== 'none' && (
                <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 7px', borderRadius:10, background:`rgba(${rgb},0.12)`, color:t.accent }}>
                  <Repeat size={9}/> {r.repeat}
                </span>
              )}
              {r.snoozeUntil && !r.done && (
                <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:'rgba(255,159,10,0.15)', color:'#ff9f0a', display:'flex', alignItems:'center', gap:3 }}>
                  <AlarmClock size={9}/> Snoozed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expanded notes */}
        <AnimatePresence>
          {expanded && (hasnotes || r.msg) && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{ overflow:'hidden' }}>
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                {r.msg && <div style={{ fontSize:13, opacity:0.7, lineHeight:1.55, marginBottom: hasnotes?10:0 }}>{r.msg}</div>}
                {hasnotes && <NexusMarkdown content={(r as any).notes} />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Snooze quick buttons for overdue */}
        {isPast && !r.done && (
          <div style={{ display:'flex', gap:5, marginTop:10 }}>
            {[5,15,60].map(m => (
              <button key={m} onClick={()=>snoozeRem(r.id,m)} style={{ padding:'4px 10px', borderRadius:7, border:'1px solid rgba(255,159,10,0.2)', background:'rgba(255,159,10,0.08)', cursor:'pointer', fontSize:10, fontWeight:600, color:'#ff9f0a' }}>
                Snooze {m<60?`${m}m`:'1h'}
              </button>
            ))}
          </div>
        )}
      </Glass>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export function RemindersView() {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { reminders, updateReminder, delRem } = useApp()

  const [toasts, setToasts]       = useState<Toast[]>([])
  const { dismiss, snooze }       = useChecker(setToasts)
  const [now, setNow]             = useState(new Date())
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all'|'upcoming'|'overdue'|'soon'|'done'>('upcoming')
  const [newOpen, setNewOpen]     = useState(false)
  const [editId, setEditId]       = useState<string|null>(null)

  // Tick every 30s
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id) }, [])

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

  const snoozeAllOverdue = useCallback((minutes: number) => {
    const until = new Date(Date.now() + minutes * 60000).toISOString()
    reminders
      .filter(r => !r.done && new Date(r.snoozeUntil || r.datetime) < now)
      .forEach(r => updateReminder(r.id, { snoozeUntil: until }))
  }, [reminders, now, updateReminder])

  const clearDone = useCallback(() => {
    reminders.filter(r => r.done).forEach(r => delRem(r.id))
  }, [reminders, delRem])

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
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0, background:'rgba(0,0,0,0.1)' }}>
        <div style={{ position:'relative', flex:1, maxWidth:280 }}>
          <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', opacity:0.4 }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reminders…" style={{ width:'100%', padding:'7px 10px 7px 32px', borderRadius:9, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', outline:'none', fontSize:12, color:'inherit' }}/>
        </div>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:9, overflow:'hidden' }}>
          {(['upcoming','soon','overdue','all','done'] as const).map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'6px 11px', background:filter===f?t.accent:'transparent', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, color:filter===f?'#fff':'inherit', opacity:filter===f?1:0.5, transition:'all 0.12s', textTransform:'capitalize', position:'relative' }}>
              {f}
              {f==='overdue' && overdue.length>0 && <span style={{ marginLeft:4, fontSize:10, padding:'1px 5px', borderRadius:8, background:filter==='overdue'?'rgba(0,0,0,0.2)':'rgba(255,69,58,0.8)', color:'#fff' }}>{overdue.length}</span>}
              {f==='soon' && soonCount>0 && <span style={{ marginLeft:4, fontSize:10, padding:'1px 5px', borderRadius:8, background:filter==='soon'?'rgba(0,0,0,0.2)':'rgba(255,159,10,0.8)', color:'#fff' }}>{soonCount}</span>}
            </button>
          ))}
        </div>
        <button onClick={()=>setNewOpen(true)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, background:t.accent, border:'none', cursor:'pointer', color:'#fff', fontSize:12, fontWeight:700, boxShadow:`0 2px 14px rgba(${rgb},0.4)`, flexShrink:0 }}>
          <Plus size={13}/> New
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'8px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(0,0,0,0.06)', flexShrink:0 }}>
        {[
          { label:'Upcoming', val:upcoming.length, color:t.accent },
          { label:'Overdue',  val:overdue.length,  color: overdue.length?'#ff453a':'inherit' },
          { label:'Soon (<30m)', val:soonCount, color: soonCount?'#ff9f0a':'inherit' },
          { label:'Done',     val:done.length,     color:'#30d158' },
        ].map(s => (
          <div key={s.label} style={{ textAlign:'center', fontSize:10 }}>
            <div style={{ fontWeight:800, fontSize:16, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ opacity:0.4, marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.04)', flexShrink:0 }}>
        <button
          onClick={() => snoozeAllOverdue(15)}
          style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,159,10,0.24)', background:'rgba(255,159,10,0.1)', color:'#ff9f0a', cursor:'pointer', fontSize:11, fontWeight:700 }}
        >
          Snooze Overdue +15m
        </button>
        <button
          onClick={() => snoozeAllOverdue(60)}
          style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,159,10,0.24)', background:'rgba(255,159,10,0.08)', color:'#ff9f0a', cursor:'pointer', fontSize:11, fontWeight:700 }}
        >
          Snooze Overdue +1h
        </button>
        <button
          onClick={clearDone}
          style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700, opacity:0.82 }}
        >
          Clear Done
        </button>
      </div>

      {/* ── List ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
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
                {items.map(r => <ReminderCard key={r.id} r={r} now={now} onEdit={()=>setEditId(r.id)}/>)}
              </AnimatePresence>
            </div>
          ))
        ) : (
          <AnimatePresence>
            {filtered.map(r => <ReminderCard key={r.id} r={r} now={now} onEdit={()=>setEditId(r.id)}/>)}
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {newOpen  && <ReminderModal key="new" onClose={()=>setNewOpen(false)}/>}
        {editId   && <ReminderModal key={editId} reminder={editReminder} onClose={()=>setEditId(null)}/>}
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
