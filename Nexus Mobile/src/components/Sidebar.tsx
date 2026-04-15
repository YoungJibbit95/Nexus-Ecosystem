import React from 'react'
import { Glass } from './Glass'
import { LiquidGlassSurface } from './LiquidGlassSurface'
import { LiquidGlassButton } from './LiquidGlassButton'
import { useTheme } from '../store/themeStore'
import { useTerminal } from '../store/terminalStore'
import { hexToRgb } from '../lib/utils'
import { buildMotionRuntime } from '../lib/motionEngine'
import {
  Bell, Code2, Columns, FileText, GitBranch, HardDrive, Info,
  Settings, Terminal, Zap, BarChart3, Wrench
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SurfaceHighlight } from './render/SurfaceHighlight'
import { useInteractiveSurfaceMotion } from '../render/useInteractiveSurfaceMotion'

export type View = 'dashboard' | 'notes' | 'code' | 'tasks' | 'reminders' | 'canvas' | 'files' | 'flux' | 'devtools' | 'diagnostics' | 'settings' | 'info'

const ITEMS: { id: View; icon: any; label: string; color?: string }[] = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard', color: '#007AFF' },
  { id: 'notes',     icon: FileText,  label: 'Notes',     color: '#30D158' },
  { id: 'code',      icon: Code2,     label: 'Code',      color: '#BF5AF2' },
  { id: 'tasks',     icon: Columns,   label: 'Tasks',     color: '#FF9F0A' },
  { id: 'reminders', icon: Bell,      label: 'Reminders', color: '#FF453A' },
  { id: 'canvas',    icon: GitBranch, label: 'Canvas',    color: '#64D2FF' },
  { id: 'files',     icon: HardDrive, label: 'Files',     color: '#5E5CE6' },
  { id: 'devtools',  icon: Wrench,    label: 'DevTools',  color: '#FF6B35' },
  { id: 'flux',      icon: Zap,       label: 'Flux',      color: '#FFD60A' },
]

const BOTTOM_ITEMS: { id: View; icon: any; label: string }[] = [
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'info',     icon: Info,     label: 'Info' },
]

const clampNumber = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export function Sidebar({
  view,
  onChange,
  availableViews,
}: {
  view: View
  onChange: (v: View) => void
  availableViews?: View[]
}) {
  const t = useTheme()
  const motionRuntime = buildMotionRuntime(t)
  const terminal = useTerminal()
  const rgb = hexToRgb(t.accent)
  const [hoveredId, setHoveredId] = React.useState<View | 'terminal' | null>(null)
  const isLiquidSidebar = ((t.glassmorphism as any)?.panelRenderer ?? 'blur') === 'liquid-glass'
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

  const sidebarStyle  = (t as any).sidebarStyle  ?? 'default'
  const showLabels    = (t as any).sidebarLabels  ?? true
  const accentBg      = (t as any).sidebarAccentBg ?? false
  const isRight       = (t as any).sidebarPosition === 'right'
  const isHidden      = sidebarStyle === 'hidden'
  const isFloating    = sidebarStyle === 'floating'
  const isMinimal     = sidebarStyle === 'minimal'
  const isRail        = sidebarStyle === 'rail'
  const allowedViews = new Set<View>(
    Array.isArray(availableViews) && availableViews.length > 0
      ? availableViews
      : [
        ...ITEMS.map((item) => item.id),
        ...BOTTOM_ITEMS.map((item) => item.id),
      ],
  )
  const terminalInteraction = useInteractiveSurfaceMotion({
    id: 'mobile-sidebar-terminal',
    hovered: hoveredId === 'terminal',
    focused: hoveredId === 'terminal',
    selected: terminal.isOpen,
    alignRight: isRight,
    surfaceClass: 'utility-surface',
    effectClass: isLiquidSidebar ? 'liquid-interactive' : 'status-highlight',
    budgetPriority: terminal.isOpen ? 'high' : 'normal',
    areaHint: 74,
    family: 'micro',
  })

  // Rail and narrow modes force icon-only
  const iconOnly = isRail || isMinimal || t.sidebarWidth < 160
  const visibleItems = ITEMS.filter((item) => allowedViews.has(item.id))
  const visibleBottomItems = BOTTOM_ITEMS.filter((item) => allowedViews.has(item.id))

  const borderSide = isRight
    ? { borderLeft: `1px solid ${t.mode==='dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` }
    : { borderRight: `1px solid ${t.mode==='dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}` }

  if (isHidden) return null

  // Floating sidebar has margin and rounded corners
  const containerStyle: React.CSSProperties = isFloating
    ? {
        margin: 8,
        height: 'calc(100% - 16px)',
        borderRadius: 16,
        boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(${rgb},0.15)`,
      }
    : {
        height: '100%',
        borderRadius: 0,
        ...borderSide,
      }

  // Keep subtle theme tint always; accentBg increases strength.
  const sidebarBg = t.mode === 'dark'
    ? `linear-gradient(180deg, rgba(${rgb},${accentBg ? 0.22 : 0.14}), rgba(${rgb},${accentBg ? 0.1 : 0.06}) 46%, rgba(${hexToRgb(t.accent2)},${accentBg ? 0.1 : 0.05}) 100%)`
    : `linear-gradient(180deg, rgba(${rgb},${accentBg ? 0.12 : 0.08}), rgba(${hexToRgb(t.accent2)},${accentBg ? 0.08 : 0.05}) 100%)`

  const itemPad = iconOnly ? '8px 0' : t.visual.compactMode ? '6px 10px' : '8px 12px'
  const itemGap  = iconOnly ? 0 : 10

  const renderItem = (item: { id: View; icon: any; label: string; color?: string }, idx: number) => {
    const isActive = view === item.id
    const isHovered = hoveredId === item.id
    const itemColor = item.color ?? t.accent
    const itemRgb   = hexToRgb(itemColor)
    const Icon = item.icon
    const hoverSlideX = isRight
      ? -Math.max(1, motionRuntime.hoverLiftPx * 0.55)
      : Math.max(1, motionRuntime.hoverLiftPx * 0.55)
    const overlayVisible = isHovered || isActive
    const overlayOpacity = isActive ? 0.76 : 0.52
    const overlayTransition = motionRuntime.reduced
      ? { duration: 0.01, ease: 'linear' as const }
      : { duration: 0.12, ease: [0.2, 0.9, 0.24, 1] as [number, number, number, number] }

    return (
      <div key={item.id} style={{
        animation: t.animations.entryAnimations
          ? `nexus-slide-right 0.28s cubic-bezier(0.4,0,0.2,1) ${idx * 30}ms both`
          : undefined,
      }}>
        <motion.button
          className="nx-sidebar-nav-row nx-bounce-target"
          onClick={() => onChange(item.id)}
          title={iconOnly ? item.label : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: itemGap, justifyContent: iconOnly ? 'center' : 'flex-start',
            width: '100%', padding: itemPad,
            borderRadius: t.visual.panelRadius * 0.65,
            border: isLiquidSidebar ? '1px solid transparent' : 'none',
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: isActive ? 700 : 500,
            color: isActive
              ? itemColor
              : isHovered
                ? (t.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)')
                : (t.mode === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)'),
            background: isLiquidSidebar
              ? 'transparent'
              : isActive
                ? `rgba(${itemRgb}, 0.15)`
                : isHovered
                  ? `rgba(${itemRgb},0.08)`
                  : 'transparent',
            borderLeft: (!iconOnly && !isRight)
              ? `2px solid ${!isLiquidSidebar && isActive ? itemColor : 'transparent'}`
              : 'none',
            borderRight: (!iconOnly && isRight)
              ? `2px solid ${!isLiquidSidebar && isActive ? itemColor : 'transparent'}`
              : 'none',
            transition: `background-color ${motionRuntime.quickMs}ms ease, color ${motionRuntime.quickMs}ms ease, border-color ${motionRuntime.quickMs}ms ease, opacity ${motionRuntime.quickMs}ms ease`,
            position: 'relative', overflow: 'hidden',
            transform: 'translateZ(0)',
            contain: 'paint',
          }}
          onMouseEnter={() => setHoveredId(item.id)}
          onMouseLeave={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
          onFocus={() => setHoveredId(item.id)}
          onBlur={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
        >
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={{
              opacity: overlayVisible ? overlayOpacity : 0,
              scale: overlayVisible ? 1 : 0.925,
            }}
            transition={overlayTransition}
            style={{
              position: 'absolute',
              inset: 1,
              borderRadius: t.visual.panelRadius * 0.58,
              pointerEvents: 'none',
              zIndex: 0,
              overflow: 'hidden',
              transformOrigin: '50% 50%',
            }}
          >
            {isLiquidSidebar ? (
              <LiquidGlassSurface
                variant="element"
                borderRadius={t.visual.panelRadius * 0.58}
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
                accentColor={itemColor}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: t.visual.panelRadius * 0.58,
                  border: `1px solid rgba(${itemRgb},${isActive ? 0.36 : 0.26})`,
                  background: `linear-gradient(160deg, rgba(${itemRgb},${isActive ? 0.22 : 0.14}), rgba(${itemRgb},${isActive ? 0.08 : 0.06}))`,
                  boxShadow: isActive ? `0 10px 20px rgba(${itemRgb},0.16)` : 'none',
                }}
              />
            )}
          </motion.div>

          <motion.div
            animate={
              motionRuntime.reduced
                ? { x: 0, scale: 1 }
                : {
                    x: isHovered ? hoverSlideX : 0,
                    scale: isHovered ? motionRuntime.hoverScale + 0.01 : 1,
                  }
            }
            transition={motionRuntime.hoverSpring}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: itemGap,
              justifyContent: iconOnly ? 'center' : 'flex-start',
              width: '100%',
            }}
          >
            {/* Icon container */}
            <div style={{
              width: iconOnly ? 32 : 20, height: iconOnly ? 32 : 20,
              borderRadius: iconOnly ? t.visual.panelRadius * 0.5 : 6,
              background: isActive && iconOnly ? `rgba(${itemRgb},0.18)` : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <Icon size={iconOnly ? 16 : 15} style={{
                color: isActive ? itemColor : 'inherit',
                opacity: isActive ? 1 : 0.6,
                transition: 'all 0.15s',
              }} />
            </div>

            {/* Label */}
            {!iconOnly && showLabels && <span>{item.label}</span>}
          </motion.div>

          <AnimatePresence>
            {iconOnly && isHovered ? (
              <motion.div
                initial={{ opacity: 0, x: isRight ? -8 : 8, scale: 0.94 }}
                animate={{ opacity: 1, x: 0, scale: 1.04 }}
                exit={{ opacity: 0, x: isRight ? -6 : 6, scale: 0.96 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  [isRight ? 'right' : 'left']: 'calc(100% + 8px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  padding: '4px 8px',
                  borderRadius: 8,
                  border: `1px solid rgba(${itemRgb},0.38)`,
                  background: `linear-gradient(180deg, rgba(${itemRgb},0.2), rgba(${itemRgb},0.1))`,
                  color: itemColor,
                  fontSize: 10,
                  fontWeight: 700,
                  zIndex: 12,
                  boxShadow: `0 10px 24px rgba(${itemRgb},0.22)`,
                }}
              >
                {item.label}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Active dot (icon-only mode) */}
          {isActive && !iconOnly && !isLiquidSidebar && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={motionRuntime.hoverSpring}
              style={{
              position: 'absolute', right: 8, width: 5, height: 5,
              borderRadius: '50%', background: itemColor,
              boxShadow: `0 0 8px ${itemColor}`,
            }}
            />
          )}

          {/* Active indicator bar (icon-only) */}
          {isActive && iconOnly && !isRight && !isLiquidSidebar && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.6 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={motionRuntime.hoverSpring}
              style={{
              position: 'absolute', left: 0, top: '20%', width: 3, height: '60%',
              borderRadius: '0 2px 2px 0', background: itemColor,
              boxShadow: `2px 0 8px ${itemColor}`,
            }}
            />
          )}
          {isActive && iconOnly && isRight && !isLiquidSidebar && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.6 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={motionRuntime.hoverSpring}
              style={{
              position: 'absolute', right: 0, top: '20%', width: 3, height: '60%',
              borderRadius: '2px 0 0 2px', background: itemColor,
              boxShadow: `-2px 0 8px ${itemColor}`,
            }}
            />
          )}
        </motion.button>
      </div>
    )
  }

  return (
    <Glass type="sidebar"
      className="flex flex-col"
      style={{
        ...containerStyle,
        background: sidebarBg,
        padding: iconOnly ? '12px 6px' : '14px 10px',
        gap: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header / Logo */}
      <div style={{ padding: iconOnly ? '0 0 12px' : '0 4px 14px', flexShrink: 0 }}>
        {iconOnly ? (
          <div style={{
            width: 32, height: 32, borderRadius: 10, margin: '0 auto',
            background: `linear-gradient(135deg, rgba(${rgb},0.3), rgba(${rgb},0.1))`,
            border: `1px solid rgba(${rgb},0.4)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 14px rgba(${rgb},0.25)`,
          }}>
            <Zap size={15} style={{ color: t.accent }} />
          </div>
        ) : (
          <div>
            <div style={{
              fontSize: 20, fontWeight: 900, marginBottom: 2,
              background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: `drop-shadow(0 0 ${t.glow.radius * 0.4}px ${t.glow.color})`,
            }}>✦ Nexus</div>
            <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1.2, textTransform: 'uppercase' }}>v5.0</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
        {visibleItems.map((item, idx) => renderItem(item, idx))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 4px' }} />

      {/* Bottom items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {visibleBottomItems.map((item, idx) => renderItem(item, visibleItems.length + idx))}
      </div>

      {/* Terminal button */}
      <div style={{ marginTop: 6 }}>
        <LiquidGlassButton
          className="nx-bounce-target"
          onClick={() => terminal.setOpen(!terminal.isOpen)}
          title={iconOnly ? 'Terminal' : undefined}
          color={t.accent}
          borderRadius={t.visual.panelRadius * 0.65}
          size="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: iconOnly ? 0 : 9,
            justifyContent: iconOnly ? 'center' : 'flex-start',
            width: '100%',
            padding: iconOnly ? '8px 0' : '8px 12px',
            fontFamily: 'inherit',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: terminal.isOpen ? t.accent : 'inherit',
            background: isLiquidSidebar ? 'transparent' : (
              terminal.isOpen
                ? `rgba(${rgb},0.15)`
                : hoveredId === 'terminal'
                  ? `rgba(${rgb},0.18)`
                  : `rgba(${rgb},0.07)`
            ),
            transition: `background-color ${terminalInteraction.runtime.timings.quickMs}ms ease, color ${terminalInteraction.runtime.timings.quickMs}ms ease`,
            transform: 'translateZ(0)',
            contain: 'paint',
            position: 'relative',
            overflow: 'hidden',
            border: isLiquidSidebar ? '1px solid transparent' : 'none',
          }}
          onMouseEnter={() => setHoveredId('terminal')}
          onMouseLeave={() => setHoveredId((prev) => (prev === 'terminal' ? null : prev))}
          onFocus={() => setHoveredId('terminal')}
          onBlur={() => setHoveredId((prev) => (prev === 'terminal' ? null : prev))}
        >
          <SurfaceHighlight
            highlight={terminalInteraction.highlight}
            radius={t.visual.panelRadius * 0.58}
          >
            {isLiquidSidebar ? (
              <LiquidGlassSurface
                variant="element"
                borderRadius={t.visual.panelRadius * 0.58}
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
                  borderRadius: t.visual.panelRadius * 0.58,
                  border: `1px solid rgba(${rgb},${terminal.isOpen ? 0.36 : 0.22})`,
                  background: `linear-gradient(160deg, rgba(${rgb},${terminal.isOpen ? 0.2 : 0.12}), rgba(${rgb},0.06))`,
                }}
              />
            )}
          </SurfaceHighlight>

          <motion.div
            animate={terminalInteraction.content.animate}
            transition={terminalInteraction.content.transition}
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: iconOnly ? 0 : 9,
              justifyContent: iconOnly ? 'center' : 'flex-start',
              width: '100%',
            }}
          >
            <Terminal size={14} style={{ color: t.accent, flexShrink: 0 }} />
            {!iconOnly && <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Terminal</span>}
          </motion.div>
        </LiquidGlassButton>
      </div>
    </Glass>
  )
}
