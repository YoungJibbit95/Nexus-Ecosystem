import React from 'react'

export function BootSequenceScreen({
  appName,
  progress,
  stage,
  accent,
  accent2,
}: {
  appName: string
  progress: number
  stage: string
  accent: string
  accent2: string
}) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)))
  return (
    <div style={{
      width: '100%',
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 20% 15%, rgba(38,53,110,0.45), transparent 45%), linear-gradient(135deg, #04050c 0%, #0b0f1c 45%, #111628 100%)',
      color: '#d7e6ff',
      fontFamily: 'system-ui, sans-serif',
      padding: 18,
    }}>
      <div style={{
        width: 'min(520px, 94vw)',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(8,12,24,0.68)',
        backdropFilter: 'blur(16px) saturate(130%)',
        WebkitBackdropFilter: 'blur(16px) saturate(130%)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.18)',
        padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            border: `1px solid ${accent}66`,
            background: `linear-gradient(135deg, ${accent}44, ${accent2}30)`,
            display: 'grid',
            placeItems: 'center',
            fontWeight: 900,
            fontSize: 15,
          }}>✦</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{appName}</div>
            <div style={{ fontSize: 10, opacity: 0.62 }}>Boot Sequence</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.88, minHeight: 18 }}>
          {stage}
        </div>
        <div style={{
          marginTop: 10,
          height: 9,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{
            width: `${safeProgress}%`,
            height: '100%',
            borderRadius: 999,
            background: `linear-gradient(90deg, ${accent}, ${accent2})`,
            boxShadow: `0 0 10px ${accent}88`,
            transition: 'width 260ms cubic-bezier(0.2, 0.7, 0.2, 1)',
          }} />
        </div>
        <div style={{ marginTop: 7, fontSize: 10, opacity: 0.7 }}>
          {safeProgress}% geladen
        </div>
      </div>
    </div>
  )
}
