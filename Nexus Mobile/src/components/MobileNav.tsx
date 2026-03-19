import React, { useEffect, useState } from 'react'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { haptic } from '../lib/haptics'
import { View } from './Sidebar'
import {
  BarChart3, FileText, Code2, Columns, Bell, GitBranch,
  HardDrive, Wrench, Zap, Settings, Info, Menu, X
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
  { id: 'flux',      icon: Zap,       label: 'Flux',     color: '#FFD60A' },
  { id: 'settings',  icon: Settings,  label: 'Settings', color: '#8E8E93' },
  { id: 'info',      icon: Info,      label: 'Info',     color: '#8E8E93' },
]

export function MobileNav({
  view, onChange, safeBottom
}: {
  view: View
  onChange: (v: View) => void
  safeBottom: number
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const [showMore, setShowMore] = useState(false)

  const isMore = MORE_ITEMS.some(i => i.id === view)
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
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 91,
              background: t.mode === 'dark'
                ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(12,12,22,0.92))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,250,255,0.85))',
              backdropFilter: 'blur(36px) saturate(220%)',
              WebkitBackdropFilter: 'blur(36px) saturate(220%)',
              borderRadius: '24px 24px 0 0',
              border: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)'}`,
              boxShadow: t.mode === 'dark'
                ? '0 -20px 45px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.28)'
                : '0 -16px 34px rgba(80,110,170,0.2), inset 0 1px 0 rgba(255,255,255,0.95)',
              paddingBottom: safeBottom + 84,
              borderBottom: 'none',
            }}
          >
            <div style={{ padding: '12px 16px 16px' }}>
              {/* Handle */}
              <button
                onClick={() => setShowMore(false)}
                aria-label="Mehr-Menü schließen"
                style={{
                  width: 44, height: 12, borderRadius: 99, background: 'rgba(255,255,255,0.22)',
                  margin: '0 auto 16px', border: 'none', cursor: 'pointer', display: 'block',
                }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {MORE_ITEMS.map(item => {
                  const isActive = view === item.id
                  const iRgb = hexToRgb(item.color)
                  return (
                    <button
                      key={item.id}
                      onClick={() => { press(item.id); setShowMore(false) }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '14px 8px', borderRadius: 14, minHeight: 74,
                        background: isActive ? `rgba(${iRgb},0.18)` : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${isActive ? item.color : 'rgba(255,255,255,0.08)'}`,
                        cursor: 'pointer', color: isActive ? item.color : 'inherit',
                      }}
                    >
                      <item.icon size={22} style={{ color: item.color }}/>
                      <span style={{ fontSize: 11, fontWeight: 600 }}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <div style={{
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
      }}>
        {PRIMARY_ITEMS.map(item => {
          const isActive = view === item.id
          const iRgb = hexToRgb(item.color)
          return (
            <button
              key={item.id}
              onClick={() => press(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 3, padding: '10px 4px', minHeight: 64,
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: isActive ? item.color : (t.mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
                transition: 'color 0.15s',
                position: 'relative',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  style={{
                    position: 'absolute', top: 6, width: 32, height: 32,
                    borderRadius: 11,
                    background: `linear-gradient(180deg, rgba(${iRgb},0.28), rgba(${iRgb},0.14))`,
                    border: `1px solid rgba(${iRgb},0.45)`,
                    boxShadow: `0 8px 20px rgba(${iRgb},0.24), inset 0 1px 0 rgba(255,255,255,0.35)`,
                    zIndex: 0,
                  }}
                />
              )}
              <item.icon size={22} style={{ position: 'relative', zIndex: 1, strokeWidth: isActive ? 2.5 : 1.8 }}/>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, position: 'relative', zIndex: 1 }}>
                {item.label}
              </span>
            </button>
          )
        })}

        {/* More button */}
        <button
          onClick={() => {
            void haptic('medium')
            setShowMore(s => !s)
          }}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, padding: '10px 4px', minHeight: 64,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: (showMore || isMore)
              ? t.accent
              : (t.mode === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)'),
          }}
        >
          {showMore ? <X size={22} strokeWidth={2.5}/> : <Menu size={22} strokeWidth={1.8}/>}
          <span style={{ fontSize: 10, fontWeight: (showMore || isMore) ? 700 : 500 }}>More</span>
        </button>
      </div>
    </>
  )
}
