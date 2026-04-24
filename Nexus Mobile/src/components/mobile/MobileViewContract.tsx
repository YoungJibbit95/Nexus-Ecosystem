import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useMobile } from '../../lib/useMobile'
import { useTheme } from '../../store/themeStore'
import { hexToRgb } from '../../lib/utils'

type MobileHeaderProps = {
  title: string
  subtitle?: string
  right?: React.ReactNode
  sticky?: boolean
}

export function MobileViewHeader({
  title,
  subtitle,
  right,
  sticky = false,
}: MobileHeaderProps) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const isTiny = mob.isMobile && Math.min(mob.screenW, mob.screenH) <= 430
  const isTight = mob.isMobile && mob.screenH <= 900

  return (
    <div
      style={{
        position: sticky ? 'sticky' : 'relative',
        top: 0,
        zIndex: sticky ? 22 : 'auto',
        padding: mob.isMobile ? (isTight ? (isTiny ? '5px 7px' : '6px 8px') : (isTiny ? '6px 8px' : '7px 9px')) : '10px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: sticky
          ? t.mode === 'dark'
            ? 'rgba(13,14,24,0.9)'
            : 'rgba(247,248,254,0.9)'
          : 'transparent',
        backdropFilter: sticky ? 'blur(12px)' : undefined,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: mob.isMobile ? (isTight ? (isTiny ? 5 : 6) : (isTiny ? 6 : 8)) : 10,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: mob.isMobile ? (isTight ? (isTiny ? 12 : 13) : (isTiny ? 13 : 14)) : 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        {subtitle ? (
            <div style={{ fontSize: isTight ? (isTiny ? 9.5 : 10.5) : (isTiny ? 10.5 : 11.5), opacity: 0.62, marginTop: 1 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {right ? (
        <div className={mob.isMobile ? 'nx-mobile-row-scroll' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: mob.isMobile ? 'nowrap' : 'wrap', justifyContent: 'flex-end', maxWidth: mob.isMobile ? '52%' : undefined }}>
          {right}
        </div>
      ) : null}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 0,
          height: 1,
          background: `linear-gradient(90deg, rgba(${rgb},0.32), rgba(${rgb},0.08), transparent)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

type MobileSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  mode?: 'bottom' | 'fullscreen'
  zIndex?: number
  maxHeight?: string
}

export function MobileSheet({
  open,
  onClose,
  title,
  children,
  footer,
  mode = 'bottom',
  zIndex = 240,
  maxHeight = '82vh',
}: MobileSheetProps) {
  const t = useTheme()
  const mob = useMobile()
  const isTiny = mob.isMobile && Math.min(mob.screenW, mob.screenH) <= 430
  const isTight = mob.isMobile && mob.screenH <= 900
  const isFullscreen = mode === 'fullscreen'
  const shouldFullscreen = isFullscreen || !mob.isMobile

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex,
              background: 'rgba(0,0,0,0.52)',
              backdropFilter: 'blur(6px)',
            }}
          />
          <motion.div
            initial={shouldFullscreen ? { opacity: 0 } : { y: '100%' }}
            animate={shouldFullscreen ? { opacity: 1 } : { y: 0 }}
            exit={shouldFullscreen ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            style={
              shouldFullscreen
                ? {
                    position: 'fixed',
                    inset: 0,
                    zIndex: zIndex + 1,
                    background: t.mode === 'dark'
                      ? 'rgba(12,14,24,0.98)'
                      : 'rgba(248,249,255,0.98)',
                    display: 'flex',
                    flexDirection: 'column',
                  }
                : {
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: zIndex + 1,
                    background: t.mode === 'dark'
                      ? 'rgba(12,14,24,0.98)'
                      : 'rgba(248,249,255,0.98)',
                    borderRadius: isTight ? (isTiny ? '12px 12px 0 0' : '14px 14px 0 0') : (isTiny ? '14px 14px 0 0' : '16px 16px 0 0'),
                    borderTop: '1px solid rgba(255,255,255,0.14)',
                    maxHeight: isTight ? (isTiny ? '78vh' : '82vh') : (isTiny ? '84vh' : maxHeight),
                    display: 'flex',
                    flexDirection: 'column',
                    paddingBottom: isTight
                      ? 'calc(var(--sat-bottom, 0px) + 3px)'
                      : (isTiny
                        ? 'calc(var(--sat-bottom, 0px) + 4px)'
                        : 'calc(var(--sat-bottom, 0px) + 6px)'),
                  }
            }
          >
            {!shouldFullscreen ? (
              <div
                style={{
                  width: isTight ? (isTiny ? 24 : 26) : (isTiny ? 26 : 30),
                  height: 3,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.26)',
                  margin: isTight ? '4px auto 4px' : (isTiny ? '5px auto 5px' : '6px auto 6px'),
                }}
              />
            ) : null}
            {title ? (
              <div
                style={{
                  padding: shouldFullscreen
                    ? (isTight ? (isTiny ? '7px 9px 5px' : '8px 10px 6px') : (isTiny ? '8px 10px 6px' : '10px 12px 7px'))
                    : (isTight ? (isTiny ? '2px 8px 5px' : '3px 10px 6px') : (isTiny ? '3px 10px 6px' : '4px 12px 7px')),
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: isTight ? (isTiny ? 11 : 12) : (isTiny ? 12 : 13), fontWeight: 800 }}>{title}</div>
                <button
                  onClick={onClose}
                  style={{
                    width: isTight ? (isTiny ? 30 : 32) : (isTiny ? 32 : 34),
                    height: isTight ? (isTiny ? 30 : 32) : (isTiny ? 32 : 34),
                    minWidth: isTight ? (isTiny ? 30 : 32) : (isTiny ? 32 : 34),
                    borderRadius: 7,
                    border: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    color: 'inherit',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={isTight ? (isTiny ? 13 : 14) : (isTiny ? 14 : 15)} />
                </button>
              </div>
            ) : null}
            <div className="nx-mobile-sheet-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {children}
            </div>
            {footer ? (
              <div
                style={{
                  flexShrink: 0,
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                }}
              >
                {footer}
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

type StickyBarProps = {
  children: React.ReactNode
  hidden?: boolean
}

export function MobileStickyBar({ children, hidden = false }: StickyBarProps) {
  if (hidden) return null
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 'calc(var(--nx-mobile-nav-height, 64px) + 10px)',
        zIndex: 70,
        marginTop: 10,
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 14,
        background: 'rgba(17,20,31,0.92)',
        backdropFilter: 'blur(12px)',
        padding: '7px 9px',
      }}
    >
      {children}
    </div>
  )
}
