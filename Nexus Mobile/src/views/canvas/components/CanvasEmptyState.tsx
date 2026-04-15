import { Plus } from 'lucide-react'

export function CanvasEmptyState({
  addCanvas,
  accent,
  accent2,
  rgb,
}: {
  addCanvas: () => void
  accent: string
  accent2: string
  rgb: string
}) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div style={{
        fontSize: 72,
        opacity: 0.12,
        background: `linear-gradient(135deg, ${accent}, ${accent2})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'nexus-float 3s ease-in-out infinite',
      }}>✦</div>
      <div style={{ fontSize: 18, fontWeight: 700, opacity: 0.7 }}>Kein Canvas vorhanden</div>
      <div style={{ fontSize: 13, opacity: 0.4, maxWidth: 300, textAlign: 'center' }}>
        Erstelle ein neues Canvas, um Ideen, Pläne und Mindmaps visuell zu organisieren.
      </div>
      <button
        onClick={() => addCanvas()}
        className="nx-interactive nx-bounce-target"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 28px',
          borderRadius: 14,
          border: 'none',
          background: `linear-gradient(135deg, ${accent}, ${accent2})`,
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          boxShadow: `0 6px 24px rgba(${rgb}, 0.35)`,
        }}
      >
        <Plus size={20} /> Neues Canvas
      </button>
    </div>
  )
}
