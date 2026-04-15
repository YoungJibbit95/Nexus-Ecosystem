import React from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  Code,
  FileText,
  Sparkles,
} from 'lucide-react'
import { DashboardWidgetId } from '../../store/appStore'
import { Glass } from '../../components/Glass'
import { fmtDt } from '../../lib/utils'
import { DashboardActionButton, SmallCard, StatCard } from './mobileDashboardPrimitives'

type CaptureIntentType = 'note' | 'task' | 'reminder' | 'code' | 'canvas'

export function buildMobileDashboardWidgetContent({
  t,
  rgb,
  mob,
  notes,
  tasks,
  reminders,
  codes,
  recentNotes,
  upcomingReminders,
  recentActivity,
  pinnedNotes,
  doneTasks,
  openTasks,
  overdueReminders,
  taskProgress,
  runCaptureIntent,
  setView,
}: {
  t: any
  rgb: string
  mob: { isMobile: boolean }
  notes: any[]
  tasks: any[]
  reminders: any[]
  codes: any[]
  recentNotes: any[]
  upcomingReminders: any[]
  recentActivity: any[]
  pinnedNotes: number
  doneTasks: number
  openTasks: number
  overdueReminders: number
  taskProgress: number
  runCaptureIntent: (intentType: CaptureIntentType) => void
  setView?: (view: string) => void
}): Record<DashboardWidgetId, React.ReactNode> {
  return {
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
            <DashboardActionButton
              key={x.label}
              onClick={() => setView?.(x.view)}
              liquidColor={t.accent}
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
            </DashboardActionButton>
          ))}
        </div>
      </SmallCard>
    ),
    tasks: (
      <SmallCard
        title="Task Overview"
        icon={BarChart3}
        color="#FF9F0A"
        action={<DashboardActionButton onClick={() => setView?.('tasks')} liquidColor={t.accent} style={{ border: 'none', background: 'none', color: t.accent, fontSize: 10, cursor: 'pointer', padding: '3px 8px', borderRadius: 8 }}>Öffnen <ArrowRight size={10} style={{ display: 'inline' }} /></DashboardActionButton>}
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
      <SmallCard title="Nächste Erinnerungen" icon={Calendar} color="#FF9F0A" action={<DashboardActionButton onClick={() => setView?.('reminders')} liquidColor="#ff9f0a" style={{ border: 'none', background: 'none', color: t.accent, fontSize: 10, cursor: 'pointer', padding: '3px 8px', borderRadius: 8 }}>Alle</DashboardActionButton>}>
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
      <SmallCard title="Zuletzt bearbeitete Notizen" icon={FileText} color={t.accent} action={<DashboardActionButton onClick={() => setView?.('notes')} liquidColor={t.accent} style={{ border: 'none', background: 'none', color: t.accent, fontSize: 10, cursor: 'pointer', padding: '3px 8px', borderRadius: 8 }}>Alle</DashboardActionButton>}>
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
}
