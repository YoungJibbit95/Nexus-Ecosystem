import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Code, CheckSquare, Bell,
  Sparkles, ArrowRight, Layout, X, Eye, EyeOff,
  ChevronUp, ChevronDown, Calendar, Activity,
  AlertCircle, Clock, CheckCircle2, BarChart3, RotateCcw,
} from 'lucide-react'
import { Glass } from '../components/Glass'
import { ViewHeader, EmptyState } from '../components/ViewHeader'
import { useApp, DashboardWidgetId, DashboardWidget } from '../store/appStore'
import { useTheme } from '../store/themeStore'
import { hexToRgb, fmtDt } from '../lib/utils'
import { useMobile } from '../lib/useMobile'
import { buildMotionRuntime } from '../lib/motionEngine'

const DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
  'stats',
  'quick',
  'tasks',
  'reminders',
  'notes',
  'activity',
  'chart',
  'calendar',
]

const DASHBOARD_WIDGET_DEFAULTS: Record<DashboardWidgetId, Pick<DashboardWidget, 'label' | 'icon'>> = {
  stats: { label: 'Stats', icon: '📊' },
  quick: { label: 'Quick Actions', icon: '⚡' },
  tasks: { label: 'Tasks', icon: '✅' },
  reminders: { label: 'Reminders', icon: '🔔' },
  notes: { label: 'Recent Notes', icon: '📝' },
  activity: { label: 'Activity', icon: '📡' },
  chart: { label: 'Progress', icon: '📈' },
  calendar: { label: 'Calendar', icon: '📅' },
}

const DASHBOARD_WIDGET_ORDER_INDEX: Record<DashboardWidgetId, number> = DASHBOARD_WIDGET_ORDER.reduce((acc, id, index) => {
  acc[id] = index
  return acc
}, {} as Record<DashboardWidgetId, number>)

function normalizeDashboardWidgets(input: DashboardWidget[]): DashboardWidget[] {
  const byId = new Map(input.map((widget) => [widget.id, widget]))
  const merged = DASHBOARD_WIDGET_ORDER.map((id, fallbackOrder) => {
    const stored = byId.get(id)
    const hasOrder = typeof stored?.order === 'number' && Number.isFinite(stored.order)
    return {
      id,
      label: stored?.label ?? DASHBOARD_WIDGET_DEFAULTS[id].label,
      icon: stored?.icon ?? DASHBOARD_WIDGET_DEFAULTS[id].icon,
      span: stored?.span === 2 ? 2 : 1,
      visible: stored?.visible !== false,
      order: hasOrder ? stored.order : fallbackOrder,
    } satisfies DashboardWidget
  })

  return merged
    .sort((a, b) => a.order - b.order || DASHBOARD_WIDGET_ORDER_INDEX[a.id] - DASHBOARD_WIDGET_ORDER_INDEX[b.id])
    .map((widget, index) => ({ ...widget, order: index }))
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  onClick,
}: {
  icon: any
  label: string
  value: string | number
  sub?: string
  color: string
  onClick?: () => void
}) {
  const rgb = hexToRgb(color)
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ filter: 'brightness(1.05)' }}
      whileTap={{ filter: 'brightness(0.97)' }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '12px 13px',
        textAlign: 'left',
        background: `rgba(${rgb},0.1)`,
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `rgba(${rgb},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 24, lineHeight: 1, fontWeight: 800 }}>{value}</div>
      <div style={{ marginTop: 3, fontSize: 11, opacity: 0.6 }}>{label}</div>
      {sub && <div style={{ marginTop: 3, fontSize: 10, opacity: 0.5 }}>{sub}</div>}
    </motion.button>
  )
}

function SmallCard({ title, icon: Icon, color, children, action }: { title: string; icon: any; color: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <motion.div layout whileHover={{ filter: 'brightness(1.03)' }} transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}>
    <Glass style={{ padding: '14px 14px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Icon size={14} style={{ color }} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </Glass>
    </motion.div>
  )
}

export function DashboardView({ setView }: { setView?: (v: string) => void }) {
  const t = useTheme()
  const mob = useMobile()
  const motionRuntime = useMemo(() => buildMotionRuntime(t), [t])
  const rgb = hexToRgb(t.accent)
  const {
    notes,
    tasks,
    reminders,
    activities,
    codes,
    dashboardWidgets,
    setDashboardWidgets,
    resetDashboardWidgets,
  } = useApp()

  const [editLayout, setEditLayout] = useState(false)

  const ordered = useMemo(() => normalizeDashboardWidgets(dashboardWidgets), [dashboardWidgets])
  const visible = useMemo(() => ordered.filter((w) => w.visible), [ordered])

  const doneTasks = tasks.filter((x) => x.status === 'done').length
  const openTasks = tasks.filter((x) => x.status !== 'done').length
  const overdueReminders = reminders.filter((x) => !x.done && new Date(x.datetime) < new Date()).length
  const upcomingReminders = reminders.filter((x) => !x.done).sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)).slice(0, 5)
  const recentNotes = [...notes].sort((a, b) => +new Date(b.updated) - +new Date(a.updated)).slice(0, 5)
  const recentActivity = activities.slice(0, 7)
  const pinnedNotes = notes.filter((n) => n.pinned).length

  const taskProgress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Guten Morgen' : now.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'

  const setWidgets = (next: DashboardWidget[]) => setDashboardWidgets(normalizeDashboardWidgets(next))
  const toggleWidget = (id: DashboardWidgetId) => setWidgets(ordered.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  const setSpan = (id: DashboardWidgetId, span: 1 | 2) => setWidgets(ordered.map((w) => (w.id === id ? { ...w, span } : w)))
  const move = (id: DashboardWidgetId, dir: -1 | 1) => {
    const copy = [...ordered]
    const idx = copy.findIndex((w) => w.id === id)
    const nxt = idx + dir
    if (idx < 0 || nxt < 0 || nxt >= copy.length) return
    const oldOrder = copy[idx].order
    copy[idx].order = copy[nxt].order
    copy[nxt].order = oldOrder
    setWidgets(copy)
  }

  const widgetNodes: Record<DashboardWidgetId, React.ReactNode> = {
    stats: (
      <Glass style={{ padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: mob.isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10 }}>
          <StatCard icon={FileText} label="Notizen" value={notes.length} sub={`${pinnedNotes} angeheftet`} color={t.accent} onClick={() => setView?.('notes')} />
          <StatCard icon={CheckSquare} label="Tasks" value={openTasks} sub={`${doneTasks} erledigt`} color="#30D158" onClick={() => setView?.('tasks')} />
          <StatCard icon={Bell} label="Reminders" value={reminders.filter((r) => !r.done).length} sub={overdueReminders ? `${overdueReminders} überfällig` : 'Alles im Plan'} color={overdueReminders ? '#FF453A' : '#FF9F0A'} onClick={() => setView?.('reminders')} />
          <StatCard icon={Code} label="Code Files" value={codes.length} sub="Projektdateien" color="#BF5AF2" onClick={() => setView?.('code')} />
        </div>
      </Glass>
    ),
    quick: (
      <SmallCard title="Quick Actions" icon={Sparkles} color={t.accent2}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Neue Notiz', view: 'notes' },
            { label: 'Task Board', view: 'tasks' },
            { label: 'Reminders', view: 'reminders' },
            { label: 'Dateien', view: 'files' },
            { label: 'Settings', view: 'settings' },
          ].map((x) => (
            <motion.button
              key={x.label}
              onClick={() => setView?.(x.view)}
              whileHover={{ filter: 'brightness(1.06)' }}
              whileTap={{ filter: 'brightness(0.97)' }}
              transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
              style={{
                border: `1px solid rgba(${rgb},0.25)`,
                background: `rgba(${rgb},0.12)`,
                color: t.accent,
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 11px',
                cursor: 'pointer',
              }}
            >
              {x.label}
            </motion.button>
          ))}
        </div>
      </SmallCard>
    ),
    tasks: (
      <SmallCard
        title="Task Overview"
        icon={BarChart3}
        color="#FF9F0A"
        action={<button onClick={() => setView?.('tasks')} style={{ border: 'none', background: 'none', color: t.accent, fontSize: 10, cursor: 'pointer' }}>Öffnen <ArrowRight size={10} style={{ display: 'inline' }} /></button>}
      >
        <div style={{ marginBottom: 8, height: 6, borderRadius: 4, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
          <div style={{ width: `${taskProgress}%`, height: '100%', background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          <div><div style={{ fontSize: 18, fontWeight: 800 }}>{openTasks}</div><div style={{ fontSize: 10, opacity: 0.5 }}>Offen</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: '#30D158' }}>{doneTasks}</div><div style={{ fontSize: 10, opacity: 0.5 }}>Done</div></div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: '#FF9F0A' }}>{taskProgress}%</div><div style={{ fontSize: 10, opacity: 0.5 }}>Progress</div></div>
        </div>
      </SmallCard>
    ),
    reminders: (
      <SmallCard title="Nächste Erinnerungen" icon={Calendar} color="#FF9F0A" action={<button onClick={() => setView?.('reminders')} style={{ border: 'none', background: 'none', color: t.accent, fontSize: 10, cursor: 'pointer' }}>Alle</button>}>
        {upcomingReminders.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5 }}>Keine offenen Erinnerungen.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcomingReminders.map((r) => {
              const overdue = new Date(r.datetime) < new Date()
              return (
                <div key={r.id} style={{ padding: '8px 9px', borderRadius: 9, border: `1px solid ${overdue ? 'rgba(255,69,58,0.25)' : 'rgba(255,255,255,0.08)'}`, background: overdue ? 'rgba(255,69,58,0.08)' : 'rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                  <div style={{ marginTop: 2, fontSize: 10, opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={9} /> {fmtDt(r.datetime)}</div>
                </div>
              )
            })}
          </div>
        )}
      </SmallCard>
    ),
    notes: (
      <SmallCard title="Zuletzt bearbeitete Notizen" icon={FileText} color={t.accent} action={<button onClick={() => setView?.('notes')} style={{ border: 'none', background: 'none', color: t.accent, fontSize: 10, cursor: 'pointer' }}>Alle</button>}>
        {recentNotes.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5 }}>Noch keine Notizen vorhanden.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentNotes.map((n) => (
              <div key={n.id} style={{ padding: '8px 9px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || 'Untitled'}</div>
                <div style={{ marginTop: 2, fontSize: 10, opacity: 0.6 }}>{fmtDt(n.updated)}</div>
              </div>
            ))}
          </div>
        )}
      </SmallCard>
    ),
    activity: (
      <SmallCard title="Aktivität" icon={Activity} color={t.accent2}>
        {recentActivity.length === 0 ? (
          <div style={{ fontSize: 12, opacity: 0.5 }}>Noch keine Aktivität erfasst.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentActivity.map((a) => (
              <div key={a.id} style={{ paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{a.action}</div>
                <div style={{ marginTop: 2, fontSize: 10, opacity: 0.6 }}>{fmtDt(a.timestamp)}</div>
              </div>
            ))}
          </div>
        )}
      </SmallCard>
    ),
    chart: (
      <SmallCard title="Produktivität" icon={BarChart3} color={t.accent}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Abschlussrate der Tasks</div>
        <div style={{ height: 8, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${taskProgress}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})` }} />
        </div>
        <div style={{ marginTop: 7, fontSize: 11, color: t.accent, fontWeight: 700 }}>{taskProgress}% erledigt</div>
      </SmallCard>
    ),
    calendar: (
      <SmallCard title="Heute" icon={Calendar} color={t.accent2}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          {upcomingReminders.length} anstehende Reminder, {openTasks} offene Tasks
        </div>
      </SmallCard>
    ),
  }

  return (
    <div className="h-full overflow-y-auto" style={{ padding: mob.isMobile ? '12px' : '18px 20px' }}>
      <ViewHeader
        title={`${greeting} ✦`}
        subtitle={`${openTasks} offene Tasks · ${overdueReminders} überfällige Erinnerungen`}
        right={
          <button
            onClick={() => setEditLayout((s) => !s)}
            style={{
              border: `1px solid ${editLayout ? t.accent : 'rgba(255,255,255,0.14)'}`,
              borderRadius: 10,
              padding: '7px 10px',
              fontSize: 11,
              fontWeight: 700,
              background: editLayout ? `rgba(${rgb},0.18)` : 'rgba(255,255,255,0.05)',
              color: editLayout ? t.accent : 'inherit',
              cursor: 'pointer',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <Layout size={12} /> Layout
          </button>
        }
      />

      <AnimatePresence>
        {editLayout && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Glass style={{ padding: '12px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Widget Layout</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={resetDashboardWidgets} style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'inherit', cursor: 'pointer', borderRadius: 8, padding: '5px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}><RotateCcw size={11} /> Reset</button>
                  <button onClick={() => setEditLayout(false)} style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'inherit', cursor: 'pointer', borderRadius: 8, padding: '5px 8px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 5 }}><X size={11} /> Schließen</button>
                </div>
              </div>

              {mob.isMobile && (
                <div style={{ marginBottom: 8, fontSize: 10, opacity: 0.45 }}>
                  Mobile rendert Widgets immer einspaltig. `2w` bleibt für Desktop gespeichert.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: mob.isMobile ? '1fr' : '1fr 1fr', gap: 7 }}>
                {ordered.map((w) => (
                  <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 9, background: w.visible ? `rgba(${rgb},0.08)` : 'rgba(255,255,255,0.04)', border: `1px solid ${w.visible ? `rgba(${rgb},0.2)` : 'rgba(255,255,255,0.09)'}` }}>
                    <span style={{ fontSize: 14 }}>{w.icon}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, opacity: w.visible ? 1 : 0.5 }}>{w.label}</span>
                    <button onClick={() => setSpan(w.id, 1)} style={{ border: `1px solid ${w.span === 1 ? t.accent : 'rgba(255,255,255,0.12)'}`, background: w.span === 1 ? `rgba(${rgb},0.2)` : 'transparent', color: w.span === 1 ? t.accent : 'inherit', borderRadius: 6, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>1w</button>
                    <button
                      onClick={() => setSpan(w.id, 2)}
                      disabled={mob.isMobile}
                      style={{
                        border: `1px solid ${w.span === 2 ? t.accent : 'rgba(255,255,255,0.12)'}`,
                        background: w.span === 2 ? `rgba(${rgb},0.2)` : 'transparent',
                        color: w.span === 2 ? t.accent : 'inherit',
                        borderRadius: 6,
                        padding: '2px 6px',
                        fontSize: 10,
                        cursor: mob.isMobile ? 'not-allowed' : 'pointer',
                        opacity: mob.isMobile ? 0.45 : 1,
                      }}
                    >
                      2w
                    </button>
                    <button onClick={() => move(w.id, -1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.7, color: 'inherit' }}><ChevronUp size={12} /></button>
                    <button onClick={() => move(w.id, 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', opacity: 0.7, color: 'inherit' }}><ChevronDown size={12} /></button>
                    <button onClick={() => toggleWidget(w.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: w.visible ? t.accent : 'inherit', opacity: w.visible ? 1 : 0.45 }}>
                      {w.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                  </div>
                ))}
              </div>
            </Glass>
          </motion.div>
        )}
      </AnimatePresence>

      {visible.length === 0 ? (
        <Glass>
          <EmptyState
            icon={<AlertCircle size={28} style={{ opacity: 0.6 }} />}
            title="Keine Widgets sichtbar"
            description="Aktiviere mindestens ein Widget im Layout-Editor."
            action={
              <button
                onClick={() => setEditLayout(true)}
                style={{ border: `1px solid rgba(${rgb},0.25)`, background: `rgba(${rgb},0.12)`, color: t.accent, borderRadius: 9, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                Layout öffnen
              </button>
            }
          />
        </Glass>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mob.isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          {visible.map((w, idx) => (
            <motion.div
              key={w.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ filter: 'brightness(1.03)' }}
              transition={{ ...motionRuntime.spring, delay: idx * 0.03, duration: 0.2 }}
              style={{ gridColumn: mob.isMobile ? 'span 1' : `span ${w.span === 2 ? 2 : 1}` }}
            >
              {widgetNodes[w.id]}
            </motion.div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 10, opacity: 0.35 }}>
        <CheckCircle2 size={10} style={{ display: 'inline', marginRight: 5 }} />
        Dashboard personalisierbar · Widgets sind persistent gespeichert
      </div>
    </div>
  )
}
