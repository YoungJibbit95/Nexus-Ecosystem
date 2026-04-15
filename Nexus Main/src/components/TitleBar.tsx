import React, { useState } from 'react'
import { Minus, Maximize2, X, Search, Command, Activity, Cloud } from 'lucide-react'
import { useTheme } from '../store/themeStore'

export function TitleBar({
  showDiagnosticsButton = false,
  onOpenDiagnostics,
  releaseId = null,
}: {
  showDiagnosticsButton?: boolean
  onOpenDiagnostics?: () => void
  releaseId?: string | null
}) {
  const t = useTheme()
  const [hovered, setHovered] = useState<string | null>(null)
  const isDark = t.mode === 'dark'
  const showDiagnostics = Boolean(showDiagnosticsButton && onOpenDiagnostics)

  const actions = [
    { id: 'close', color: '#ff5f57', icon: <X size={9} />, run: () => window.api?.window.close() },
    { id: 'minimize', color: '#febc2e', icon: <Minus size={9} />, run: () => window.api?.window.minimize() },
    { id: 'maximize', color: '#28c840', icon: <Maximize2 size={9} />, run: () => window.api?.window.maximize() },
  ]

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: 44,
        padding: '0 14px',
        flexShrink: 0,
        borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        background: isDark
          ? 'linear-gradient(to bottom, rgba(27,30,45,0.7), rgba(15,18,30,0.45))'
          : 'linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(245,248,255,0.72))',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, ['-webkit-app-region' as any]: 'drag' }} />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          ['-webkit-app-region' as any]: 'no-drag',
        }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onMouseEnter={() => setHovered(action.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={action.run}
            title={action.id}
            aria-label={action.id}
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: action.color,
              boxShadow: hovered === action.id ? `0 0 14px ${action.color}88` : 'none',
              transition: 'box-shadow 140ms ease, transform 140ms ease',
              transform: hovered === action.id ? 'scale(1.06)' : 'scale(1)',
              color: '#1b1b1d',
            }}
          >
            <span style={{ opacity: hovered === action.id ? 0.85 : 0 }}>{action.icon}</span>
          </button>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: 0.68,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
            boxShadow: `0 0 10px ${t.accent}88`,
          }}
        />
        Nexus Workspace
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          ['-webkit-app-region' as any]: 'no-drag',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: 999,
            border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            opacity: 0.8,
          }}
        >
          <Command size={10} />
          Shift x2 Spotlight
        </div>
        {releaseId ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.04em',
              padding: '4px 8px',
              borderRadius: 999,
              border: isDark ? `1px solid ${t.accent}55` : `1px solid ${t.accent}66`,
              background: isDark
                ? `linear-gradient(135deg, ${t.accent}2a, ${t.accent2}20)`
                : `linear-gradient(135deg, ${t.accent}22, ${t.accent2}1a)`,
              color: t.accent,
              boxShadow: `0 8px 18px ${t.accent}28`,
              whiteSpace: 'nowrap',
              maxWidth: 220,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={`Live Release ${releaseId}`}
          >
            <Cloud size={11} />
            <span style={{ opacity: 0.86 }}>Release</span>
            <span style={{ opacity: 0.96 }}>{releaseId}</span>
          </div>
        ) : null}
        {showDiagnostics ? (
          <button
            title="Open Diagnostics"
            onClick={onOpenDiagnostics}
            style={{
              height: 28,
              borderRadius: 8,
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: 'inherit',
              opacity: 0.72,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0 10px',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <Activity size={12} />
            Diagnostics
          </button>
        ) : null}
        <button
          title="Search"
          onClick={() => window.dispatchEvent(new CustomEvent('nx-open-spotlight', { detail: { query: '' } }))}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            color: 'inherit',
            opacity: 0.65,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search size={13} />
        </button>
      </div>
    </div>
  )
}
