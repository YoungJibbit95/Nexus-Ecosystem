import type { CSSProperties } from 'react'
import { Maximize2, Type, Wand2 } from 'lucide-react'

const actionButton = (accent: string, primary = false): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  minHeight: 42,
  padding: '10px 12px',
  borderRadius: 11,
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.14)',
  background: primary ? accent : 'rgba(255,255,255,0.07)',
  color: primary ? '#fff' : 'inherit',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
})

export function CanvasEmptyState({
  accent,
  accent2,
  rgb,
  overlay = false,
  onCreateText,
  onUseTemplate,
  onOpenTools,
}: {
  accent: string
  accent2: string
  rgb: string
  overlay?: boolean
  onCreateText: () => void
  onUseTemplate: () => void
  onOpenTools: () => void
}) {
  return (
    <div
      style={{
        position: overlay ? 'absolute' : 'relative',
        inset: overlay ? 0 : undefined,
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        pointerEvents: overlay ? 'none' : 'auto',
        zIndex: overlay ? 190 : undefined,
      }}
    >
      <div style={{ width: 'min(520px, 100%)', display: 'grid', gap: 13, textAlign: 'center', pointerEvents: 'auto' }}>
        <div
          aria-hidden="true"
          style={{
            justifySelf: 'center',
            width: 56,
            height: 56,
            borderRadius: 18,
            display: 'grid',
            placeItems: 'center',
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            boxShadow: `0 18px 44px rgba(${rgb},0.28)`,
            color: '#fff',
            fontSize: 24,
            fontWeight: 900,
          }}
        >
          +
        </div>
        <div style={{ display: 'grid', gap: 5 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 850, letterSpacing: 0 }}>Canvas starten</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.45 }}>
            Starte direkt mit einem Node, einem Magic-Template oder den Canvas-Tools.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
          <button type="button" onClick={onCreateText} style={actionButton(accent, true)}>
            <Type size={15} /> Text-Node
          </button>
          <button type="button" onClick={onUseTemplate} style={actionButton(accent)}>
            <Wand2 size={15} /> Starter-Template
          </button>
          <button type="button" onClick={onOpenTools} style={actionButton(accent)}>
            <Maximize2 size={15} /> Canvas-Tools
          </button>
        </div>
      </div>
    </div>
  )
}