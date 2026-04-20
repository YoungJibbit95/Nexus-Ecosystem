import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Bell, Calendar, Search, Settings2, LifeBuoy, ShieldCheck } from 'lucide-react'
import { Glass } from '../components/Glass'
import { useApp } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { AnimatePresence } from 'framer-motion'
import { computeTodayLayerSummary } from '@nexus/core'
import {
  QUIET_HOURS_KEY,
  REMINDER_TEMPLATES,
  createReminderFromTemplate,
  type ReminderTemplateId,
  readQuietHours,
  type QuietHoursState,
  type Toast,
  useChecker,
} from './reminders/reminderHelpers'
import { ReminderCard, ReminderModal, ToastCard } from './reminders/ReminderViewParts'

export function RemindersView({ setView }: { setView?: (viewId: string) => void } = {}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const { reminders, tasks, updateReminder, delRem, addRem } = useApp()

  const [toasts, setToasts]       = useState<Toast[]>([])
  const { dismiss, snooze }       = useChecker(setToasts)
  const [now, setNow]             = useState(new Date())
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all'|'upcoming'|'overdue'|'soon'|'done'>('upcoming')
  const [newOpen, setNewOpen]     = useState(false)
  const [editId, setEditId]       = useState<string|null>(null)
  const [controlOpen, setControlOpen] = useState(false)
  const [controlMsg, setControlMsg] = useState('')
  const [quietHours, setQuietHours] = useState<QuietHoursState>(() => readQuietHours())
  const [lastHealthCheckAt, setLastHealthCheckAt] = useState<string | null>(null)
  const [lastRescheduleAt, setLastRescheduleAt] = useState<string | null>(null)
  const [lastRescheduleReason, setLastRescheduleReason] = useState<string | null>(null)

  // Tick every 30s
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id) }, [])
  useEffect(() => {
    try {
      localStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(quietHours))
    } catch {}
  }, [quietHours])

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
  const openReminderCount = reminders.filter((r) => !r.done).length
  const notifyAvailable = Boolean((window as any).api?.notify)
  const nextReminder = useMemo(() => {
    const next = reminders
      .filter((r) => !r.done)
      .sort((a, b) => new Date(a.snoozeUntil || a.datetime).getTime() - new Date(b.snoozeUntil || b.datetime).getTime())[0]
    return next ? (next.snoozeUntil || next.datetime) : null
  }, [reminders])
  const todaySummary = useMemo(
    () => computeTodayLayerSummary(tasks, reminders, now),
    [tasks, reminders, now],
  )

  const runHealthCheck = useCallback(() => {
    setLastHealthCheckAt(new Date().toISOString())
    setControlMsg(notifyAvailable ? 'Notification bridge verfügbar' : 'Notification bridge nicht verfügbar')
    window.setTimeout(() => setControlMsg(''), 2800)
  }, [notifyAvailable])

  const snoozeAllOverdue = useCallback((minutes: number) => {
    const until = new Date(Date.now() + minutes * 60000).toISOString()
    const overdueItems = reminders
      .filter(r => !r.done && new Date(r.snoozeUntil || r.datetime) < now)
    overdueItems.forEach(r => updateReminder(r.id, { snoozeUntil: until }))
    setLastRescheduleAt(new Date().toISOString())
    setLastRescheduleReason(overdueItems.length > 0 ? `manual-overdue-${minutes}m` : 'no-overdue-reminders')
  }, [reminders, now, updateReminder])

  const clearDone = useCallback(() => {
    const doneItems = reminders.filter(r => r.done)
    doneItems.forEach(r => delRem(r.id))
    setControlMsg(doneItems.length > 0 ? 'Erledigte Reminder gelöscht' : 'Keine erledigten Reminder')
    window.setTimeout(() => setControlMsg(''), 2600)
  }, [reminders, delRem])

  const createTemplateReminder = useCallback((templateId: ReminderTemplateId) => {
    const created = createReminderFromTemplate(templateId, new Date())
    if (!created) {
      setControlMsg("Template nicht verfugbar")
      window.setTimeout(() => setControlMsg(""), 2400)
      return
    }
    addRem({
      title: created.title,
      msg: created.msg,
      datetime: created.datetime,
      repeat: created.repeat,
    })
    setControlMsg(`Template erstellt: ${created.template.label}`)
    window.setTimeout(() => setControlMsg(''), 2400)
  }, [addRem])

  // Group by day for 'all'/'upcoming'
  const grouped = useMemo(() => {
    if (filter !== 'all' && filter !== 'upcoming') return null
    const map = new Map<string, (typeof reminders)[number][]>()
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

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.05)', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, opacity:0.55, fontWeight:700, letterSpacing:0.4, textTransform:'uppercase' }}>Today Layer</span>
          <span style={{ fontSize:11, opacity:0.72 }}>Open Tasks: <b>{todaySummary.openTaskCount}</b></span>
          <span style={{ fontSize:11, opacity:0.72 }}>Due Today: <b>{todaySummary.dueTodayCount}</b></span>
          <span style={{ fontSize:11, opacity:0.72, color: todaySummary.overdueCount > 0 ? '#ff453a' : 'inherit' }}>Overdue: <b>{todaySummary.overdueCount}</b></span>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button onClick={() => setView?.('tasks')} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700 }}>Zu Tasks</button>
          <button onClick={() => setView?.('reminders')} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid rgba(${rgb},0.26)`, background:`rgba(${rgb},0.12)`, color:t.accent, cursor:'pointer', fontSize:11, fontWeight:700 }}>Reminders</button>
          <button onClick={() => setControlOpen((open) => !open)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:controlOpen ? `rgba(${rgb},0.12)` : 'rgba(255,255,255,0.06)', color:controlOpen ? t.accent : 'inherit', cursor:'pointer', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
            <ShieldCheck size={12}/> Control Center
          </button>
        </div>
      </div>

      {controlOpen ? (
        <div style={{ padding:'8px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.04)', flexShrink:0 }}>
          <Glass style={{ padding:'10px 12px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <ShieldCheck size={13} style={{ color:t.accent }} />
                <span style={{ fontSize:12, fontWeight:800 }}>Notification Control Center</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, border: notifyAvailable ? '1px solid rgba(48,209,88,0.35)' : '1px solid rgba(255,69,58,0.35)', background: notifyAvailable ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', color: notifyAvailable ? '#30d158' : '#ff453a', fontWeight:700 }}>
                  {notifyAvailable ? 'Bridge verfügbar' : 'Bridge fehlt'}
                </span>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.05)' }}>
                  Open: <b>{openReminderCount}</b>
                </span>
                <span style={{ fontSize:10, padding:'3px 8px', borderRadius:999, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.05)' }}>
                  Overdue: <b>{overdue.length}</b>
                </span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ fontSize:11, opacity:0.72 }}>
                Nächster Reminder: <b>{nextReminder ? new Date(nextReminder).toLocaleString() : 'keiner'}</b>
              </span>
              <span style={{ fontSize:11, opacity:0.72 }}>
                Letzter Reschedule: <b>{lastRescheduleAt ? new Date(lastRescheduleAt).toLocaleString() : 'noch keiner'}</b>
              </span>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              <button onClick={runHealthCheck} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}>
                <Settings2 size={11} /> Health prüfen
              </button>
              <button onClick={() => snoozeAllOverdue(15)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,159,10,0.24)', background:'rgba(255,159,10,0.1)', color:'#ff9f0a', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                Snooze Overdue +15m
              </button>
              <button onClick={() => snoozeAllOverdue(60)} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,159,10,0.24)', background:'rgba(255,159,10,0.08)', color:'#ff9f0a', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                Snooze Overdue +1h
              </button>
              <button onClick={clearDone} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.06)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700, opacity:0.9 }}>
                Clear Done
              </button>
              <button
                onClick={() => setControlMsg('Fallback: lokaler Polling-Checker läuft alle 15s.')}
                style={{ padding:'6px 10px', borderRadius:8, border:'1px solid rgba(120,180,255,0.22)', background:'rgba(120,180,255,0.1)', color:'#7eb6ff', cursor:'pointer', fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:6 }}
              >
                <LifeBuoy size={11} /> Fallback erklären
              </button>
            </div>
            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:700 }}>Quiet Hours</span>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, opacity:0.82 }}>
                  <input
                    type="checkbox"
                    checked={quietHours.enabled}
                    onChange={(event) => setQuietHours((prev) => ({ ...prev, enabled: event.target.checked }))}
                  />
                  aktiv
                </label>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, opacity:0.8 }}>
                  start
                  <input
                    type="time"
                    value={quietHours.start}
                    onChange={(event) => setQuietHours((prev) => ({ ...prev, start: event.target.value }))}
                    style={{ borderRadius:6, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.05)', color:'inherit', padding:'3px 6px', fontSize:11 }}
                  />
                </label>
                <label style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11, opacity:0.8 }}>
                  ende
                  <input
                    type="time"
                    value={quietHours.end}
                    onChange={(event) => setQuietHours((prev) => ({ ...prev, end: event.target.value }))}
                    style={{ borderRadius:6, border:'1px solid rgba(255,255,255,0.15)', background:'rgba(255,255,255,0.05)', color:'inherit', padding:'3px 6px', fontSize:11 }}
                  />
                </label>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {REMINDER_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => createTemplateReminder(template.id)}
                    style={{ padding:'5px 8px', borderRadius:8, border:'1px solid rgba(255,255,255,0.14)', background:'rgba(255,255,255,0.05)', color:'inherit', cursor:'pointer', fontSize:11, fontWeight:700 }}
                  >
                    Template: {template.label}
                  </button>
                ))}
              </div>
            </div>
            {(controlMsg || lastRescheduleReason || lastHealthCheckAt) ? (
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:4 }}>
                {controlMsg ? <span style={{ fontSize:11, color:t.accent }}>{controlMsg}</span> : null}
                {lastRescheduleReason ? <span style={{ fontSize:10, opacity:0.62 }}>Reschedule-Status: {lastRescheduleReason}</span> : null}
                {lastHealthCheckAt ? <span style={{ fontSize:10, opacity:0.62 }}>Health Check: {new Date(lastHealthCheckAt).toLocaleString()}</span> : null}
              </div>
            ) : null}
          </Glass>
        </div>
      ) : null}

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
