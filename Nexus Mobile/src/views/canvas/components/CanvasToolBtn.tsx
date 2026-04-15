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
  const mob = useMobile()
  const size = mob.isMobile ? 44 : 30
  const iconSize = mob.isMobile ? 20 : 14
  return (
    <button
      onClick={onClick}
      className="nx-interactive nx-bounce-target"
      title={tooltip}
      style={{
        background: active ? `rgba(${rgb}, 0.22)` : 'transparent',
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
        color: active ? accent : 'inherit',
        opacity: active ? 1 : 0.65,
        padding: mob.isMobile && label ? '8px 10px' : undefined,
      }}
    >
      <Icon size={iconSize} />
      {mob.isMobile && label && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>}
    </button>
  )
}
