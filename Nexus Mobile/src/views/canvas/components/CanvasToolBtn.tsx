import { useState } from 'react'
import { useMobile } from '../../../lib/useMobile'

export function CanvasToolBtn({
  icon: Icon,
  tooltip,
  onClick,
  accent,
  rgb,
  active,
  label,
}: {
  icon: any
  tooltip: string
  onClick: () => void
  accent: string
  rgb: string
  active?: boolean
  label?: string
}) {
  const [hovered, setHovered] = useState(false)
  const mob = useMobile()
  const size = mob.isMobile ? 44 : 30
  const iconSize = mob.isMobile ? 20 : 14
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={tooltip}
      style={{
        background: active ? `rgba(${rgb}, 0.22)` : (hovered ? `rgba(${rgb}, 0.12)` : 'transparent'),
        border: active ? `1px solid rgba(${rgb}, 0.4)` : '1px solid transparent',
        borderRadius: mob.isMobile ? 12 : 7,
        width: mob.isMobile ? 'auto' : size,
        height: size,
        minWidth: size,
        display: 'flex',
        flexDirection: mob.isMobile && label ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        cursor: 'pointer',
        color: (hovered || active) ? accent : 'inherit',
        transition: 'all 0.15s',
        opacity: (hovered || active) ? 1 : 0.65,
        padding: mob.isMobile && label ? '8px 10px' : undefined,
      }}
    >
      <Icon size={iconSize} />
      {mob.isMobile && label && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>}
    </button>
  )
}
