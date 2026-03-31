import React from 'react'
import { Glass } from './Glass'
import { useTheme } from '../store/themeStore'
import { useTerminal } from '../store/terminalStore'
import { hexToRgb } from '../lib/utils'
import {
  Bell, Code2, Columns, FileText, GitBranch, HardDrive, Info,
  Settings, Terminal, Zap, BarChart3, Wrench
} from 'lucide-react'
import { motion } from 'framer-motion'

export type View = 'dashboard' | 'notes' | 'code' | 'tasks' | 'reminders' | 'canvas' | 'files' | 'flux' | 'devtools' | 'settings' | 'info'

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
  const terminal = useTerminal()
  const rgb = hexToRgb(t.accent)

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

  // Accent background option
  const sidebarBg = accentBg
    ? t.mode === 'dark'
      ? `linear-gradient(to bottom, rgba(${rgb},0.18), rgba(${rgb},0.08))`
      : `linear-gradient(to bottom, rgba(${rgb},0.1), rgba(${rgb},0.04))`
    : undefined

  const itemPad = iconOnly ? '8px 0' : t.visual.compactMode ? '6px 10px' : '8px 12px'
  const itemGap  = iconOnly ? 0 : 10

  const renderItem = (item: { id: View; icon: any; label: string; color?: string }, idx: number) => {
    const isActive = view === item.id
    const itemColor = item.color ?? t.accent
    const itemRgb   = hexToRgb(itemColor)
    const Icon = item.icon

    return (
      <div key={item.id} style={{
        animation: t.animations.entryAnimations
          ? `nexus-slide-right 0.28s cubic-bezier(0.4,0,0.2,1) ${idx * 30}ms both`
          : undefined,
      }}>
        <button onClick={() => onChange(item.id)}
          title={iconOnly ? item.label : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: itemGap, justifyContent: iconOnly ? 'center' : 'flex-start',
            width: '100%', padding: itemPad,
            borderRadius: t.visual.panelRadius * 0.65,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 13, fontWeight: isActive ? 700 : 500,
            color: isActive ? itemColor : (t.mode==='dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)'),
            background: isActive
              ? `rgba(${itemRgb}, 0.15)`
              : 'transparent',
            borderLeft: (!iconOnly && !isRight)
              ? `2px solid ${isActive ? itemColor : 'transparent'}`
              : 'none',
            borderRight: (!iconOnly && isRight)
              ? `2px solid ${isActive ? itemColor : 'transparent'}`
              : 'none',
            transition: `all ${Math.round(180 / Math.max(t.visual.animationSpeed || 1, 0.1))}ms ease`,
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.background = `rgba(${itemRgb},0.08)`
              e.currentTarget.style.color = t.mode==='dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)'
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = t.mode==='dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)'
            }
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

          {/* Active dot (icon-only mode) */}
          {isActive && !iconOnly && (
            <div style={{
              position: 'absolute', right: 8, width: 5, height: 5,
              borderRadius: '50%', background: itemColor,
              boxShadow: `0 0 8px ${itemColor}`,
            }} />
          )}

          {/* Active indicator bar (icon-only) */}
          {isActive && iconOnly && !isRight && (
            <div style={{
              position: 'absolute', left: 0, top: '20%', width: 3, height: '60%',
              borderRadius: '0 2px 2px 0', background: itemColor,
              boxShadow: `2px 0 8px ${itemColor}`,
            }} />
          )}
          {isActive && iconOnly && isRight && (
            <div style={{
              position: 'absolute', right: 0, top: '20%', width: 3, height: '60%',
              borderRadius: '2px 0 0 2px', background: itemColor,
              boxShadow: `-2px 0 8px ${itemColor}`,
            }} />
          )}
        </button>
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
            <div style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1.2, textTransform: 'uppercase' }}>v4.0</div>
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
        <button
          onClick={() => terminal.setOpen(!terminal.isOpen)}
          title={iconOnly ? 'Terminal' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: iconOnly ? 0 : 9, justifyContent: iconOnly ? 'center' : 'flex-start',
            width: '100%', padding: iconOnly ? '8px 0' : '8px 12px',
            borderRadius: t.visual.panelRadius * 0.65,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: terminal.isOpen ? t.accent : 'inherit',
            background: terminal.isOpen ? `rgba(${rgb},0.15)` : `rgba(${rgb},0.07)`,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${rgb},0.18)` }}
          onMouseLeave={e => { e.currentTarget.style.background = terminal.isOpen ? `rgba(${rgb},0.15)` : `rgba(${rgb},0.07)` }}
        >
          <Terminal size={14} style={{ color: t.accent, flexShrink: 0 }} />
          {!iconOnly && <span style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Terminal</span>}
        </button>
      </div>
    </Glass>
  )
}
