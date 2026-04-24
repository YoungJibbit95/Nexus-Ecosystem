import React from 'react'
import { Glass } from './Glass'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { useMobile } from '../lib/useMobile'

export function ViewHeader({
  title,
  subtitle,
  right,
  compact,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
  compact?: boolean
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)
  const mob = useMobile()
  const isCompact = compact ?? mob.isMobile
  const isTiny = mob.isMobile && Math.min(mob.screenW, mob.screenH) <= 430
  const isTight = mob.isMobile && mob.screenH <= 900
  const paddingY = isCompact ? (isTight ? (isTiny ? 3 : 4) : (isTiny ? 4 : 5)) : 12
  const paddingX = isCompact ? (isTiny ? 6 : 8) : 14

  return (
    <Glass style={{ padding: `${paddingY}px ${paddingX}px`, marginBottom: isCompact ? (isTight ? 3 : (isTiny ? 4 : 5)) : 10, borderRadius: Math.max(isTiny ? 9 : 11, t.visual.panelRadius + 2), overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isCompact ? (isTiny ? 6 : 8) : 10, flexWrap: isCompact ? 'nowrap' : 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: isCompact ? (isTight ? (isTiny ? 10.5 : 11.5) : (isTiny ? 11 : 12)) : 16, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</div>
          {subtitle && <div style={{ fontSize: isTight ? (isTiny ? 8.5 : 9.5) : (isTiny ? 9 : 10), opacity: 0.58, marginTop: 1, lineHeight: 1.2, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{subtitle}</div>}
        </div>
        {right && (
          <div className={isCompact ? 'nx-mobile-row-scroll' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, maxWidth: isCompact ? '56%' : undefined, justifyContent: 'flex-end' }}>
            {right}
          </div>
        )}
      </div>
      {!isCompact ? (
        <div
          style={{
            marginTop: 10,
            height: 1,
            borderRadius: 99,
            background: `linear-gradient(90deg, rgba(${rgb},0.7), rgba(${hexToRgb(t.accent2)},0.4), transparent)`,
          }}
        />
      ) : null}
    </Glass>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', opacity: 0.72 }}>
        <div style={{ marginBottom: 8 }}>{icon}</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 12, opacity: 0.65, marginBottom: action ? 10 : 0 }}>{description}</div>
        {action}
      </div>
    </div>
  )
}
