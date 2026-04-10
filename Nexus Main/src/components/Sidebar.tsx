import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Code2, Columns, FileText, GitBranch, HardDrive, Info,
  Settings, Terminal, Zap, BarChart3, Wrench, Plus, Circle
} from 'lucide-react'
import { Glass } from './Glass'
import { useTheme } from '../store/themeStore'
import { useTerminal } from '../store/terminalStore'
import { useApp } from '../store/appStore'
import { hexToRgb } from '../lib/utils'
import { buildMotionRuntime } from '../lib/motionEngine'
import { shallow } from 'zustand/shallow'

export type View =
  | 'dashboard'
  | 'notes'
  | 'code'
  | 'tasks'
  | 'reminders'
  | 'canvas'
  | 'files'
  | 'flux'
  | 'devtools'
  | 'settings'
  | 'info'

const MAIN_ITEMS: { id: View; icon: any; label: string; color: string }[] = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard', color: '#0a84ff' },
  { id: 'notes', icon: FileText, label: 'Notizen', color: '#34c759' },
  { id: 'code', icon: Code2, label: 'Code', color: '#bf5af2' },
  { id: 'tasks', icon: Columns, label: 'Tasks', color: '#ff9f0a' },
  { id: 'reminders', icon: Bell, label: 'Reminders', color: '#ff453a' },
  { id: 'canvas', icon: GitBranch, label: 'Canvas', color: '#64d2ff' },
  { id: 'files', icon: HardDrive, label: 'Dateien', color: '#5e5ce6' },
  { id: 'devtools', icon: Wrench, label: 'DevTools', color: '#ff6b35' },
  { id: 'flux', icon: Zap, label: 'Flux', color: '#ffd60a' },
]

const FOOTER_ITEMS: { id: View; icon: any; label: string }[] = [
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'info', icon: Info, label: 'Info' },
]

function NavRow({
  active,
  icon,
  label,
  color,
  iconOnly,
  alignRight,
  onClick,
  onPrefetch,
}: {
  active: boolean
  icon: any
  label: string
  color: string
  iconOnly: boolean
  alignRight?: boolean
  onClick: () => void
  onPrefetch?: () => void
}) {
  const t = useTheme()
  const motionRuntime = buildMotionRuntime(t)
  const rgb = hexToRgb(color)
  const Icon = icon
  const [hovered, setHovered] = React.useState(false)
  const hoverSlideX = alignRight
    ? -Math.max(1, motionRuntime.hoverLiftPx * 0.55)
    : Math.max(1, motionRuntime.hoverLiftPx * 0.55)

  return (
    <motion.button
      className="nx-sidebar-nav-row nx-bounce-target"
      onClick={onClick}
      title={iconOnly ? label : undefined}
      style={{
        '--nx-row-hover-bg': `rgba(${rgb},0.1)`,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: iconOnly ? 'center' : 'flex-start',
        gap: iconOnly ? 0 : 10,
        padding: iconOnly ? '8px 0' : '8px 10px',
        borderRadius: 10,
        border: active ? `1px solid rgba(${rgb},0.34)` : '1px solid transparent',
        background: active ? `rgba(${rgb},0.18)` : 'transparent',
        color: active ? color : t.mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.68)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: active ? 700 : 550,
        transition:
          `background-color ${motionRuntime.quickMs}ms ease, color ${motionRuntime.quickMs}ms ease, border-color ${motionRuntime.quickMs}ms ease, opacity ${motionRuntime.quickMs}ms ease`,
        position: 'relative',
        overflow: 'hidden',
        transform: 'translateZ(0)',
        contain: 'paint',
      } as React.CSSProperties}
      onMouseEnter={() => {
        setHovered(true)
        onPrefetch?.()
      }}
      onMouseLeave={() => {
        setHovered(false)
      }}
      onFocus={() => onPrefetch?.()}
      onPointerDown={() => onPrefetch?.()}
    >
      <motion.div
        animate={
          motionRuntime.reduced
            ? { x: 0, scale: 1 }
            : {
                x: hovered ? hoverSlideX : 0,
                scale: hovered ? motionRuntime.hoverScale + 0.01 : 1,
              }
        }
        transition={motionRuntime.hoverSpring}
        style={{ display: 'flex', alignItems: 'center', gap: iconOnly ? 0 : 10, width: '100%', justifyContent: iconOnly ? 'center' : 'flex-start' }}
      >
        <div
          style={{
            width: iconOnly ? 30 : 20,
            height: iconOnly ? 30 : 20,
            borderRadius: iconOnly ? 9 : 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: active && iconOnly ? `rgba(${rgb},0.22)` : 'transparent',
          }}
        >
          <Icon size={iconOnly ? 16 : 14} style={{ opacity: active ? 1 : 0.75 }} />
        </div>
        {!iconOnly && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
      </motion.div>

      <AnimatePresence>
        {iconOnly && hovered ? (
          <motion.div
            initial={{ opacity: 0, x: alignRight ? -8 : 8, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1.04 }}
            exit={{ opacity: 0, x: alignRight ? -6 : 6, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute',
              [alignRight ? 'right' : 'left']: 'calc(100% + 8px)',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              padding: '4px 8px',
              borderRadius: 8,
              border: `1px solid rgba(${rgb},0.38)`,
              background: `linear-gradient(180deg, rgba(${rgb},0.2), rgba(${rgb},0.1))`,
              color,
              fontSize: 10,
              fontWeight: 700,
              zIndex: 12,
              boxShadow: `0 10px 24px rgba(${rgb},0.22)`,
            }}
          >
            {label}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {active && (
        <motion.span
          style={{
            position: 'absolute',
            left: 0,
            top: '20%',
            width: 3,
            height: '60%',
            borderRadius: '0 3px 3px 0',
            background: color,
            boxShadow: `0 0 12px ${color}`,
          }}
          initial={{ opacity: 0, scaleY: 0.6 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={motionRuntime.hoverSpring}
        />
      )}
    </motion.button>
  )
}

export function Sidebar({
  view,
  onChange,
  availableViews,
  onPrefetch,
}: {
  view: View
  onChange: (v: View) => void
  availableViews?: View[]
  onPrefetch?: (v: View) => void
}) {
  const t = useTheme()
  const { terminalOpen, setTerminalOpen } = useTerminal((s) => ({
    terminalOpen: s.isOpen,
    setTerminalOpen: s.setOpen,
  }), shallow)
  const { notes, tasks, reminders, addNote, addTask, addRem } = useApp((s) => ({
    notes: s.notes,
    tasks: s.tasks,
    reminders: s.reminders,
    addNote: s.addNote,
    addTask: s.addTask,
    addRem: s.addRem,
  }), shallow)
  const rgb = hexToRgb(t.accent)
  const motionRuntime = buildMotionRuntime(t)

  const sidebarStyle = (t as any).sidebarStyle ?? 'default'
  const showLabels = (t as any).sidebarLabels ?? true
  const isRight = (t as any).sidebarPosition === 'right'
  const isHidden = sidebarStyle === 'hidden'
  const isFloating = sidebarStyle === 'floating'
  const isMinimal = sidebarStyle === 'minimal'
  const isRail = sidebarStyle === 'rail'
  const enableEntryMotion =
    Boolean(t.animations.entryAnimations) &&
    !((import.meta as any).env?.PROD) &&
    !(t.qol?.reducedMotion ?? false)
  const allowedViews = new Set<View>(
    Array.isArray(availableViews) && availableViews.length > 0
      ? availableViews
      : [
        ...MAIN_ITEMS.map((item) => item.id),
        ...FOOTER_ITEMS.map((item) => item.id),
      ],
  )

  if (isHidden) return null

  const iconOnly = isRail || isMinimal || t.sidebarWidth < 165 || !showLabels
  const visibleMainItems = MAIN_ITEMS.filter((item) => allowedViews.has(item.id))
  const visibleFooterItems = FOOTER_ITEMS.filter((item) => allowedViews.has(item.id))
  const pendingTasks = tasks.filter((tk) => tk.status !== 'done').length
  const overdueReminders = reminders.filter((r) => !r.done && new Date(r.snoozeUntil || r.datetime) < new Date()).length

  return (
    <Glass
      type="sidebar"
      className="flex flex-col"
      style={{
        height: isFloating ? 'calc(100% - 14px)' : '100%',
        margin: isFloating ? 7 : 0,
        borderRadius: isFloating ? 16 : 0,
        borderRight: !isRight && !isFloating ? (t.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)') : undefined,
        borderLeft: isRight && !isFloating ? (t.mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)') : undefined,
        padding: iconOnly ? '12px 6px' : '12px 10px',
        gap: 4,
      }}
    >
      <div style={{ padding: iconOnly ? '0 0 8px' : '0 2px 10px' }}>
        {iconOnly ? (
          <div
            style={{
              width: 32,
              height: 32,
              margin: '0 auto',
              borderRadius: 10,
              border: `1px solid rgba(${rgb},0.45)`,
              background: `linear-gradient(135deg, rgba(${rgb},0.32), rgba(${rgb},0.08))`,
              boxShadow: `0 0 18px rgba(${rgb},0.24)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={15} style={{ color: t.accent }} />
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Nexus
                </div>
                <div style={{ fontSize: 9, opacity: 0.45, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Productivity OS</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34c759', boxShadow: '0 0 10px #34c759' }} />
            </div>

            <div
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                padding: '8px 9px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 10, opacity: 0.4 }}>Notes</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{notes.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, opacity: 0.4 }}>Tasks</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: pendingTasks ? '#ff9f0a' : undefined }}>{pendingTasks}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, opacity: 0.4 }}>Due</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: overdueReminders ? '#ff453a' : undefined }}>{overdueReminders}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <button
                className="nx-bounce-target"
                onClick={() => {
                  addNote()
                  if (allowedViews.has('notes')) onChange('notes')
                }}
                style={{
                  flex: 1,
                  border: `1px solid rgba(${rgb},0.32)`,
                  background: `rgba(${rgb},0.14)`,
                  color: t.accent,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Plus size={11} /> Note
              </button>
              <button
                className="nx-bounce-target"
                onClick={() => {
                  addTask('Quick Task', 'todo')
                  if (allowedViews.has('tasks')) onChange('tasks')
                }}
                style={{
                  flex: 1,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'inherit',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <Plus size={11} /> Task
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
        {visibleMainItems.map((item, idx) => {
          const row = (
            <NavRow
              active={view === item.id}
              icon={item.icon}
              label={item.label}
              color={item.color}
              iconOnly={iconOnly}
              alignRight={isRight}
              onClick={() => onChange(item.id)}
              onPrefetch={() => onPrefetch?.(item.id)}
            />
          )
          if (!enableEntryMotion) {
            return <div key={item.id}>{row}</div>
          }
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: idx * 0.02 }}
            >
              {row}
            </motion.div>
          )
        })}
      </div>

      <div style={{ height: 1, margin: '6px 2px', background: 'rgba(255,255,255,0.08)' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleFooterItems.map((item, idx) => {
          const row = (
            <NavRow
              active={view === item.id}
              icon={item.icon}
              label={item.label}
              color={t.accent}
              iconOnly={iconOnly}
              alignRight={isRight}
              onClick={() => onChange(item.id)}
              onPrefetch={() => onPrefetch?.(item.id)}
            />
          )
          if (!enableEntryMotion) {
            return <div key={item.id}>{row}</div>
          }
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: 0.2 + idx * 0.03 }}
            >
              {row}
            </motion.div>
          )
        })}
      </div>

      <div style={{ marginTop: 6 }}>
        <button
          className="nx-bounce-target"
          onClick={() => setTerminalOpen(!terminalOpen)}
          title={iconOnly ? 'Terminal' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: iconOnly ? 'center' : 'space-between',
            gap: iconOnly ? 0 : 8,
            padding: iconOnly ? '8px 0' : '8px 10px',
            borderRadius: 10,
            border: terminalOpen ? `1px solid rgba(${rgb},0.35)` : '1px solid rgba(255,255,255,0.09)',
            background: terminalOpen ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.05)',
            color: terminalOpen ? t.accent : 'inherit',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 750,
            textTransform: iconOnly ? undefined : 'uppercase',
            letterSpacing: iconOnly ? undefined : '0.12em',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Terminal size={14} />
            {!iconOnly && 'Terminal'}
          </div>
          {!iconOnly && (
            <Circle
              size={9}
              fill={terminalOpen ? '#34c759' : 'transparent'}
              color={terminalOpen ? '#34c759' : 'rgba(255,255,255,0.3)'}
            />
          )}
        </button>
      </div>

      {!iconOnly && (
        <button
          className="nx-bounce-target"
          onClick={() => {
            addRem({
              title: 'Quick Reminder',
              msg: 'Created from sidebar',
              datetime: new Date(Date.now() + 60 * 60000).toISOString(),
              repeat: 'none',
            })
            onChange('reminders')
          }}
          style={{
            marginTop: 6,
            width: '100%',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: 'inherit',
            fontSize: 11,
            fontWeight: 650,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            opacity: 0.75,
          }}
        >
          <Plus size={11} /> Reminder in 1h
        </button>
      )}
    </Glass>
  )
}
