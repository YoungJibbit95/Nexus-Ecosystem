import React from 'react'
import { Activity } from 'lucide-react'
import { useTheme } from '../store/themeStore'
import { useMobile } from '../lib/useMobile'

declare const window: Window & { api?: any; Capacitor?: any }

export function TitleBar({
  showDiagnosticsButton = false,
  onOpenDiagnostics,
}: {
  showDiagnosticsButton?: boolean
  onOpenDiagnostics?: () => void
}) {
  const t = useTheme()
  const { isMobile, isNative } = useMobile()
  const showDiagnostics = Boolean(showDiagnosticsButton && onOpenDiagnostics)

  // On mobile/native apps there's no TitleBar at all — the status bar is handled natively
  if (isMobile || isNative) return null

  return (
    <div
      style={{
        height: 40, display: 'flex', alignItems: 'center',
        padding: '0 16px', flexShrink: 0,
        background: t.mode === 'dark' ? 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.04))' : 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.45))',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: `1px solid ${t.mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.65)'}`,
        boxShadow: t.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.9)',
        ['-webkit-app-region' as any]: 'drag',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 8, ['-webkit-app-region' as any]: 'no-drag' }}>
        <button
          onClick={() => window.api?.window.close()}
          style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', border: 'none', cursor: 'pointer' }}
        />
        <button
          onClick={() => window.api?.window.minimize()}
          style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', border: 'none', cursor: 'pointer' }}
        />
        <button
          onClick={() => window.api?.window.maximize()}
          style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', border: 'none', cursor: 'pointer' }}
        />
      </div>
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', opacity: 0.72,
        background: `linear-gradient(135deg, ${t.accent}, ${t.accent2})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Nexus
      </div>
      {showDiagnostics ? (
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            ['-webkit-app-region' as any]: 'no-drag',
          }}
        >
          <button
            title='Open Diagnostics'
            onClick={onOpenDiagnostics}
            style={{
              height: 26,
              borderRadius: 8,
              border: t.mode === 'dark' ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.12)',
              background: t.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              color: 'inherit',
              opacity: 0.78,
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
        </div>
      ) : null}
    </div>
  )
}
