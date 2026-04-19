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
import { LiquidGlassSurface } from './LiquidGlassSurface'
import { LiquidGlassButton } from './LiquidGlassButton'
import { shallow } from 'zustand/shallow'
import { SurfaceHighlight } from './render/SurfaceHighlight'
import { useInteractiveSurfaceMotion } from '../render/useInteractiveSurfaceMotion'

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
  | 'diagnostics'
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

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

function NavRow({
  id,
  active,
  icon,
  label,
  color,
  iconOnly,
  alignRight,
  onClick,
  onPrefetch,
}: {
  id: View
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
  const rgb = hexToRgb(color)
  const Icon = icon
  const isLiquidSidebar = false
  const liquidPreset = ((t.glassmorphism as any).liquidPreset ?? 'performance') as 'fidelity' | 'performance' | 'no-shader'
  const liquidPresetDefaults = liquidPreset === 'fidelity'
    ? { distortionScale: -180, displace: 0.5, saturation: 2.1 }
    : liquidPreset === 'no-shader'
      ? { distortionScale: -192, displace: 0.46, saturation: 2.2 }
      : { distortionScale: -132, displace: 0.34, saturation: 1.6 }
  const liquidDistortionScaleOverride = Number((t.glassmorphism as any).liquidDistortionScale)
  const liquidDisplaceOverride = Number((t.glassmorphism as any).liquidDisplace)
  const liquidSaturationOverride = Number((t.glassmorphism as any).liquidSaturation)
  const liquidDistortionScale = Number.isFinite(liquidDistortionScaleOverride)
    ? clampNumber(liquidDistortionScaleOverride, -320, 320)
    : liquidPresetDefaults.distortionScale
  const liquidDisplace = Number.isFinite(liquidDisplaceOverride)
    ? clampNumber(liquidDisplaceOverride, 0, 3)
    : liquidPresetDefaults.displace
  const liquidSaturation = Number.isFinite(liquidSaturationOverride)
    ? clampNumber(liquidSaturationOverride, 0.8, 2.8)
    : liquidPresetDefaults.saturation
  const useLiquidShader = liquidPreset !== 'no-shader'
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const interaction = useInteractiveSurfaceMotion({
    id: `main-sidebar-row-${id}`,
    hovered,
    focused,
    selected: active,
    alignRight: Boolean(alignRight),
    surfaceClass: 'utility-surface',
    effectClass: isLiquidSidebar ? 'liquid-interactive' : 'status-highlight',
    budgetPriority: active ? 'high' : 'normal',
    areaHint: iconOnly ? 60 : 76,
    family: 'micro',
  })
  const quickMs = interaction.runtime.timings.quickMs
  const tooltipTransition =
    interaction.runtime.capability === 'static-safe' || interaction.runtime.complexity === 'none'
      ? {
          type: 'tween' as const,
          duration: Math.max(0.1, interaction.runtime.timings.quickMs / 1000),
          ease: interaction.runtime.timings.framerEase,
        }
      : {
          type: 'spring' as const,
          duration: Math.max(0.14, interaction.runtime.timings.transformMs / 1000),
          stiffness: interaction.runtime.complexity === 'rich' ? 360 : 336,
          damping: interaction.runtime.complexity === 'rich' ? 23 : 26,
          mass: interaction.runtime.complexity === 'rich' ? 0.72 : 0.78,
          ease: interaction.runtime.timings.framerEase,
        }

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
        border: isLiquidSidebar
          ? '1px solid transparent'
          : active
            ? `1px solid rgba(${rgb},0.34)`
            : '1px solid transparent',
        background: isLiquidSidebar
          ? 'transparent'
          : active
            ? `rgba(${rgb},0.18)`
            : 'transparent',
        color: active ? color : t.mode === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.68)',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: active ? 700 : 550,
        transition:
          `background-color ${quickMs}ms ease, color ${quickMs}ms ease, border-color ${quickMs}ms ease, opacity ${quickMs}ms ease`,
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
      onFocus={() => {
        setFocused(true)
        onPrefetch?.()
      }}
      onBlur={() => setFocused(false)}
      onPointerDown={() => onPrefetch?.()}
    >
      <SurfaceHighlight highlight={interaction.highlight} radius={9}>
        {isLiquidSidebar ? (
          <LiquidGlassSurface
            variant="element"
            borderRadius={9}
            dark={t.mode === 'dark'}
            lowPower={!useLiquidShader}
            backgroundOpacity={t.mode === 'dark' ? 0.04 : 0.08}
            brightness={t.mode === 'dark' ? 52 : 72}
            opacity={t.mode === 'dark' ? 0.92 : 0.88}
            blur={liquidPreset === 'fidelity' ? 11 : liquidPreset === 'performance' ? 9 : 10}
            saturation={liquidSaturation}
            distortionScale={liquidDistortionScale}
            borderWidth={0.1}
            displace={liquidDisplace}
            accentColor={color}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 9,
              border: `1px solid rgba(${rgb},${active ? 0.36 : 0.26})`,
              background: `linear-gradient(160deg, rgba(${rgb},${active ? 0.22 : 0.14}), rgba(${rgb},${active ? 0.08 : 0.06}))`,
              boxShadow: active ? `0 10px 20px rgba(${rgb},0.16)` : 'none',
            }}
          />
        )}
      </SurfaceHighlight>

      <motion.div
        animate={interaction.content.animate}
        transition={interaction.content.transition}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: iconOnly ? 0 : 10,
          width: '100%',
          justifyContent: iconOnly ? 'center' : 'flex-start',
        }}
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
            transition={tooltipTransition}
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

      {active && !isLiquidSidebar && (
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
          transition={interaction.runtime.framer.transformTransition}
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
  const [terminalHovered, setTerminalHovered] = React.useState(false)
  const [terminalFocused, setTerminalFocused] = React.useState(false)
  const isLiquidSidebar = false
  const liquidPreset = ((t.glassmorphism as any).liquidPreset ?? 'performance') as 'fidelity' | 'performance' | 'no-shader'
  const liquidPresetDefaults = liquidPreset === 'fidelity'
    ? { distortionScale: -180, displace: 0.5, saturation: 2.1 }
    : liquidPreset === 'no-shader'
      ? { distortionScale: -192, displace: 0.46, saturation: 2.2 }
      : { distortionScale: -132, displace: 0.34, saturation: 1.6 }
  const liquidDistortionScaleOverride = Number((t.glassmorphism as any).liquidDistortionScale)
  const liquidDisplaceOverride = Number((t.glassmorphism as any).liquidDisplace)
  const liquidSaturationOverride = Number((t.glassmorphism as any).liquidSaturation)
  const liquidDistortionScale = Number.isFinite(liquidDistortionScaleOverride)
    ? clampNumber(liquidDistortionScaleOverride, -320, 320)
    : liquidPresetDefaults.distortionScale
  const liquidDisplace = Number.isFinite(liquidDisplaceOverride)
    ? clampNumber(liquidDisplaceOverride, 0, 3)
    : liquidPresetDefaults.displace
  const liquidSaturation = Number.isFinite(liquidSaturationOverride)
    ? clampNumber(liquidSaturationOverride, 0.8, 2.8)
    : liquidPresetDefaults.saturation
  const useLiquidShader = liquidPreset !== 'no-shader'

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
  const terminalInteraction = useInteractiveSurfaceMotion({
    id: 'main-sidebar-terminal',
    hovered: terminalHovered,
    focused: terminalFocused,
    selected: terminalOpen,
    alignRight: isRight,
    surfaceClass: 'utility-surface',
    effectClass: isLiquidSidebar ? 'liquid-interactive' : 'status-highlight',
    budgetPriority: terminalOpen ? 'high' : 'normal',
    areaHint: 74,
    family: 'micro',
  })
  const sidebarEntryOffset = isRight ? 10 : -10
  const sidebarEntryStep = Math.max(
    0.015,
    Math.min(0.032, terminalInteraction.runtime.timings.quickMs / 1000 / 8),
  )
  const sidebarEntryTransition =
    terminalInteraction.runtime.capability === 'static-safe' ||
    terminalInteraction.runtime.complexity === 'none'
      ? ({
          type: 'tween' as const,
          duration: Math.max(0.1, terminalInteraction.runtime.timings.quickMs / 1000),
          ease: terminalInteraction.runtime.timings.framerEase,
        })
      : ({
          type: 'spring' as const,
          duration: Math.max(0.14, terminalInteraction.runtime.timings.transformMs / 1000),
          stiffness: terminalInteraction.runtime.complexity === 'rich' ? 348 : 324,
          damping: terminalInteraction.runtime.complexity === 'rich' ? 24 : 27,
          mass: terminalInteraction.runtime.complexity === 'rich' ? 0.74 : 0.8,
          ease: terminalInteraction.runtime.timings.framerEase,
        })

  if (isHidden) return null

  const iconOnly = isRail || isMinimal || t.sidebarWidth < 165 || !showLabels
  const sidebarAccentBg = Boolean((t as any).sidebarAccentBg)
  const sidebarTintBg = t.mode === 'dark'
    ? `linear-gradient(180deg, rgba(${rgb},${sidebarAccentBg ? 0.22 : 0.14}), rgba(${rgb},${sidebarAccentBg ? 0.1 : 0.06}) 46%, rgba(${hexToRgb(t.accent2)},${sidebarAccentBg ? 0.1 : 0.05}) 100%)`
    : `linear-gradient(180deg, rgba(${rgb},${sidebarAccentBg ? 0.12 : 0.08}), rgba(${hexToRgb(t.accent2)},${sidebarAccentBg ? 0.08 : 0.05}) 100%)`
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
        background: sidebarTintBg,
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
              {isLiquidSidebar ? (
                <LiquidGlassButton
                  className="nx-bounce-target"
                  onClick={() => {
                    addNote()
                    if (allowedViews.has('notes')) onChange('notes')
                  }}
                  color={t.accent}
                  borderRadius={8}
                  size="sm"
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    color: t.accent,
                  }}
                >
                  <Plus size={11} /> Note
                </LiquidGlassButton>
              ) : (
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
              )}
              {isLiquidSidebar ? (
                <LiquidGlassButton
                  className="nx-bounce-target"
                  onClick={() => {
                    addTask('Quick Task', 'todo')
                    if (allowedViews.has('tasks')) onChange('tasks')
                  }}
                  color="#ff9f0a"
                  borderRadius={8}
                  size="sm"
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '6px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    color: '#ffb340',
                  }}
                >
                  <Plus size={11} /> Task
                </LiquidGlassButton>
              ) : (
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
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0 }}>
        {visibleMainItems.map((item, idx) => {
          const row = (
            <NavRow
              id={item.id}
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
              initial={{ opacity: 0, x: sidebarEntryOffset }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...sidebarEntryTransition, delay: idx * sidebarEntryStep }}
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
              id={item.id}
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
              initial={{ opacity: 0, x: sidebarEntryOffset }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                ...sidebarEntryTransition,
                delay: Math.max(0.16, sidebarEntryStep * visibleMainItems.length) + idx * sidebarEntryStep,
              }}
            >
              {row}
            </motion.div>
          )
        })}
      </div>

      <div style={{ marginTop: 6 }}>
        <LiquidGlassButton
          className="nx-bounce-target"
          onClick={() => setTerminalOpen(!terminalOpen)}
          color={t.accent}
          borderRadius={10}
          size="sm"
          title={iconOnly ? 'Terminal' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: iconOnly ? 'center' : 'space-between',
            gap: iconOnly ? 0 : 8,
            padding: iconOnly ? '8px 0' : '8px 10px',
            borderRadius: 10,
            color: terminalOpen ? t.accent : 'inherit',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 750,
            textTransform: iconOnly ? undefined : 'uppercase',
            letterSpacing: iconOnly ? undefined : '0.12em',
            position: 'relative',
            overflow: 'hidden',
            transform: 'translateZ(0)',
            contain: 'paint',
            border: isLiquidSidebar ? '1px solid transparent' : (terminalOpen ? `1px solid rgba(${rgb},0.35)` : '1px solid rgba(255,255,255,0.09)'),
            background: isLiquidSidebar ? 'transparent' : (terminalOpen ? `rgba(${rgb},0.16)` : 'rgba(255,255,255,0.05)'),
            transition: `background-color ${terminalInteraction.runtime.timings.quickMs}ms ease, border-color ${terminalInteraction.runtime.timings.quickMs}ms ease, color ${terminalInteraction.runtime.timings.quickMs}ms ease`,
          }}
          onMouseEnter={() => setTerminalHovered(true)}
          onMouseLeave={() => setTerminalHovered(false)}
          onFocus={() => {
            setTerminalHovered(true)
            setTerminalFocused(true)
          }}
          onBlur={() => {
            setTerminalHovered(false)
            setTerminalFocused(false)
          }}
        >
          <SurfaceHighlight highlight={terminalInteraction.highlight} radius={9}>
            {isLiquidSidebar ? (
              <LiquidGlassSurface
                variant="element"
                borderRadius={9}
                dark={t.mode === 'dark'}
                lowPower={!useLiquidShader}
                backgroundOpacity={t.mode === 'dark' ? 0.04 : 0.08}
                brightness={t.mode === 'dark' ? 52 : 72}
                opacity={t.mode === 'dark' ? 0.92 : 0.88}
                blur={liquidPreset === 'fidelity' ? 11 : liquidPreset === 'performance' ? 9 : 10}
                saturation={liquidSaturation}
                distortionScale={liquidDistortionScale}
                borderWidth={0.1}
                displace={liquidDisplace}
                accentColor={t.accent}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 9,
                  border: `1px solid rgba(${rgb},${terminalOpen ? 0.36 : 0.22})`,
                  background: `linear-gradient(160deg, rgba(${rgb},${terminalOpen ? 0.2 : 0.12}), rgba(${rgb},0.06))`,
                }}
              />
            )}
          </SurfaceHighlight>

          <motion.div
            animate={terminalInteraction.content.animate}
            transition={terminalInteraction.content.transition}
            style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Terminal size={14} />
            {!iconOnly && 'Terminal'}
          </motion.div>
          {!iconOnly && (
            <Circle
              size={9}
              fill={terminalOpen ? '#34c759' : 'transparent'}
              color={terminalOpen ? '#34c759' : 'rgba(255,255,255,0.3)'}
            />
          )}
        </LiquidGlassButton>
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
