import React from 'react'
import { Glass } from './Glass'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'

export function ViewHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  const t = useTheme()
  const rgb = hexToRgb(t.accent)

  return (
    <Glass style={{ padding: '13px 15px', marginBottom: 10, borderRadius: Math.max(14, t.visual.panelRadius + 2) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {right}
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          height: 2,
          borderRadius: 99,
          background: `linear-gradient(90deg, rgba(${rgb},0.7), rgba(${hexToRgb(t.accent2)},0.4), transparent)`,
        }}
      />
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
