import React, { useEffect, useState } from 'react'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { haptic } from '../lib/haptics'
import { useMobile } from '../lib/useMobile'
import { View } from './Sidebar'
import {
  BarChart3, FileText, Code2, Columns, Bell, GitBranch,
  HardDrive, Wrench, Zap, Settings, Info, Menu, X, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const PRIMARY_ITEMS: { id: View; icon: any; label: string; color: string }[] = [
  { id: 'dashboard',  icon: BarChart3, label: 'Home',      color: '#007AFF' },
  { id: 'notes',      icon: FileText,  label: 'Notes',     color: '#30D158' },
  { id: 'tasks',      icon: Columns,   label: 'Tasks',     color: '#FF9F0A' },
  { id: 'reminders',  icon: Bell,      label: 'Reminders', color: '#FF453A' },
]

const MORE_ITEMS: { id: View; icon: any; label: string; color: string }[] = [
  { id: 'code',      icon: Code2,     label: 'Code',     color: '#BF5AF2' },
  { id: 'canvas',    icon: GitBranch, label: 'Canvas',   color: '#64D2FF' },
  { id: 'files',     icon: HardDrive, label: 'Files',    color: '#5E5CE6' },
  { id: 'devtools',  icon: Wrench,    label: 'DevTools', color: '#FF6B35' },
  ...((import.meta as any).env?.DEV
    ? [{ id: 'diagnostics' as View, icon: Activity, label: 'Diagnostics', color: '#5AC8FA' }]
    : []),
  { id: 'flux',      icon: Zap,       label: 'Flux',     color: '#FFD60A' },
  { id: 'settings',  icon: Settings,  label: 'Settings', color: '#8E8E93' },
  { id: 'info',      icon: Info,      label: 'Info',     color: '#8E8E93' },
]

export function MobileNav({
  view,
  onChange,
  safeBottom,
  availableViews,
}: {
  view: View
  onChange: (v: View) => void
  safeBottom: number
  availableViews?: View[]
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const isTiny = mob.isMobile && Math.min(mob.screenW, mob.screenH) <= 430
  const isTight = mob.isMobile && mob.screenH <= 900
  const isLandscape = mob.isMobile && mob.isLandscape
  const [showMore, setShowMore] = useState(false)
  const allowedViews = new Set<View>(
    Array.isArray(availableViews) && availableViews.length > 0
      ? availableViews
      : [
        ...PRIMARY_ITEMS.map((item) => item.id),
        ...MORE_ITEMS.map((item) => item.id),
      ],
  )
  const visiblePrimaryItems = PRIMARY_ITEMS.filter((item) => allowedViews.has(item.id))
  const visibleMoreItems = MORE_ITEMS.filter((item) => allowedViews.has(item.id))
  const moreGridColumns = mob.isMobile
    ? (isTiny ? 3 : (isTight ? 4 : 4))
    : 4

  const isMore = visibleMoreItems.some(i => i.id === view)
  const press = (next: View) => {
    void haptic('light')
    onChange(next)
  }

  useEffect(() => {
    setShowMore(false)
  }, [view])

  return (
    <>
      {/* More drawer backdrop */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="nx-mobile-nav-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowMore(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />
        )}
      </AnimatePresence>

      {/* More drawer */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="nx-mobile-nav-more-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
              background: t.mode === 'dark'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(12,12,22,0.92))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,255,0.85))',
              backdropFilter: 'blur(36px) saturate(220%)',
              WebkitBackdropFilter: 'blur(36px) saturate(220%)',
              borderRadius: isTight ? (isTiny ? '13px 13px 0 0' : '15px 15px 0 0') : (isTiny ? '15px 15px 0 0' : '18px 18px 0 0'),
              border: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'}`,
              boxShadow: t.mode === 'dark'
                ? '0 -20px 45px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)'
                : '0 -16px 34px rgba(80,110,170,0.2), inset 0 1px 0 rgba(255,255,255,0.95)',
              paddingBottom: safeBottom + (isTight ? (isTiny ? 42 : 46) : (isTiny ? 46 : 52)),
              borderBottom: 'none',
            }}
          >
            <div style={{ padding: isTight ? (isTiny ? '7px 8px 8px' : '8px 10px 10px') : (isTiny ? '8px 10px 10px' : '10px 12px 12px') }}>
              {/* Handle */}
              <button
                onClick={() => setShowMore(false)}
                aria-label="Mehr-Menü schließen"
                style={{
                  width: isTight ? (isTiny ? 30 : 34) : (isTiny ? 34 : 38), height: isTiny ? 8 : 9, borderRadius: 99, background: 'rgba(255,255,255,0.22)',
                  margin: isTight ? '0 auto 8px' : (isTiny ? '0 auto 10px' : '0 auto 12px'), border: 'none', cursor: 'pointer', display: 'block',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${moreGridColumns}, 1fr)`, gap: isTight ? (isTiny ? 3 : 4) : (isTiny ? 5 : 6) }}>
                {visibleMoreItems.map(item => {
                  const isActive = view === item.id
                  const iRgb = hexToRgb(item.color)
                  return (
                    <button
                      className="nx-mobile-touch-button nx-mobile-nav-more-item"
                      key={item.id}
                      onClick={() => { press(item.id); setShowMore(false) }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isTight ? (isTiny ? 3 : 4) : (isTiny ? 4 : 5),
                        padding: isTight ? (isTiny ? '8px 6px' : '9px 7px') : (isTiny ? '9px 7px' : '11px 8px'),
                        borderRadius: isTiny ? 10 : 11,
                        minHeight: isTight ? (isTiny ? 48 : 52) : (isTiny ? 52 : 58),
                        background: isActive ? `rgba(${iRgb},0.18)` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isActive ? item.color : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer', color: isActive ? item.color : 'inherit',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <item.icon size={isTight ? (isTiny ? 16 : 18) : (isTiny ? 18 : 20)} style={{ color: item.color }}/>
                      <span style={{ fontSize: isTight ? (isTiny ? 9 : 10) : (isTiny ? 10 : 11), fontWeight: 600 }}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <div
        className="nx-mobile-bottom-nav"
        style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 80,
        background: t.mode === 'dark'
          ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(9,10,18,0.9))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.97), rgba(245,248,255,0.85))',
        backdropFilter: 'blur(30px) saturate(210%)',
        WebkitBackdropFilter: 'blur(30px) saturate(210%)',
        borderTop: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)'}`,
        boxShadow: t.mode === 'dark'
          ? '0 -14px 28px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.2)'
          : '0 -10px 22px rgba(70,100,170,0.18), inset 0 1px 0 rgba(255,255,255,0.95)',
        paddingBottom: safeBottom,
        display: 'flex', alignItems: 'stretch',
      }}
      >
        {visiblePrimaryItems.map(item => {
          const isActive = view === item.id
          const iRgb = hexToRgb(item.color)
          return (
            <button
              className="nx-mobile-touch-button nx-mobile-nav-button"
              key={item.id}
              onClick={() => press(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: isLandscape ? 0 : (isTight ? 1 : (isTiny ? 1.5 : 2)), padding: isLandscape ? (isTiny ? '2px 2px' : '3px 2px') : (isTight ? (isTiny ? '4px 2px' : '5px 2px') : (isTiny ? '5px 2px' : '6px 3px')), minHeight: isLandscape ? (isTiny ? 34 : 38) : (isTight ? (isTiny ? 36 : 40) : (isTiny ? 40 : 44)),
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: isActive ? item.color : (t.mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
                transition: 'color 0.15s',
                position: 'relative',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
              >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute', top: isTight ? 2 : (isTiny ? 3 : 4), width: isTight ? (isTiny ? 18 : 22) : (isTiny ? 22 : 26), height: isTight ? (isTiny ? 18 : 22) : (isTiny ? 22 : 26),
                    borderRadius: isTiny ? 9 : 10,
                    background: `linear-gradient(180deg, rgba(${iRgb},0.28), rgba(${iRgb},0.14))`,
                    border: `1px solid rgba(${iRgb},0.45)`,
                    boxShadow: `0 8px 20px rgba(${iRgb},0.24), inset 0 1px 0 rgba(255,255,255,0.35)`,
                    zIndex: 0,
                  }}
                />
              )}
              <item.icon size={isLandscape ? (isTiny ? 13 : 15) : (isTight ? (isTiny ? 14 : 16) : (isTiny ? 16 : 18))} style={{ position: 'relative', zIndex: 1, strokeWidth: isActive ? 2.3 : 1.75 }}/>
              {!isLandscape ? (
                <span style={{ fontSize: isTight ? (isTiny ? 7.5 : 8.5) : (isTiny ? 8.5 : 9.5), fontWeight: isActive ? 700 : 500, position: 'relative', zIndex: 1 }}>
                  {item.label}
                </span>
              ) : null}
            </button>
          )
        })}

        {/* More button */}
        {visibleMoreItems.length > 0 ? (
          <button
            className="nx-mobile-touch-button nx-mobile-nav-button"
            onClick={() => {
              void haptic('medium')
              setShowMore(s => !s)
            }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: isLandscape ? 0 : (isTight ? 1 : (isTiny ? 1.5 : 2)), padding: isLandscape ? (isTiny ? '2px 2px' : '3px 2px') : (isTight ? (isTiny ? '4px 2px' : '5px 2px') : (isTiny ? '5px 2px' : '6px 3px')), minHeight: isLandscape ? (isTiny ? 34 : 38) : (isTight ? (isTiny ? 36 : 40) : (isTiny ? 40 : 44)),
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: (showMore || isMore)
                ? t.accent
                : (t.mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {showMore ? <X size={isLandscape ? (isTiny ? 13 : 15) : (isTight ? (isTiny ? 14 : 16) : (isTiny ? 16 : 18))} strokeWidth={2.3}/> : <Menu size={isLandscape ? (isTiny ? 13 : 15) : (isTight ? (isTiny ? 14 : 16) : (isTiny ? 16 : 18))} strokeWidth={1.75}/>}
            {!isLandscape ? (
              <span style={{ fontSize: isTight ? (isTiny ? 7.5 : 8.5) : (isTiny ? 8.5 : 9.5), fontWeight: (showMore || isMore) ? 700 : 500 }}>More</span>
            ) : null}
          </button>
        ) : null}
      </div>
    </>
  )
}
