import React, { CSSProperties } from 'react'

type ChannelSelector = 'R' | 'G' | 'B' | 'A'

export interface LiquidGlassSurfaceProps {
  className?: string
  style?: CSSProperties
  width?: number | string
  height?: number | string
  borderRadius?: number
  borderWidth?: number
  brightness?: number
  opacity?: number
  blur?: number
  displace?: number
  backgroundOpacity?: number
  saturation?: number
  distortionScale?: number
  redOffset?: number
  greenOffset?: number
  blueOffset?: number
  xChannel?: ChannelSelector
  yChannel?: ChannelSelector
  mixBlendMode?: CSSProperties['mixBlendMode']
  lowPower?: boolean
  dark?: boolean
  variant?: 'element' | 'surface'
  interactive?: boolean
  accentColor?: string
}

const sizeToCss = (value: number | string | undefined, fallback: string) => {
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && value.trim().length > 0) return value
  return fallback
}

/**
 * Legacy compatibility surface.
 * Heavy liquid shader/displacement rendering is disabled.
 */
export function LiquidGlassSurface({
  className = '',
  style,
  width,
  height,
  borderRadius = 20,
  borderWidth = 0.1,
  opacity = 0.9,
  blur = 10,
  backgroundOpacity = 0.06,
  accentColor,
  dark = true,
  variant = 'element',
}: LiquidGlassSurfaceProps) {
  const baseColor = accentColor || '#007aff'
  const alpha = Math.max(0.05, Math.min(0.32, opacity * 0.2 + backgroundOpacity))
  const localStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: sizeToCss(width, '100%'),
    height: sizeToCss(height, '100%'),
    borderRadius,
    pointerEvents: 'none',
    border: `${Math.max(1, Math.round(borderWidth * 10))}px solid ${dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)'}`,
    background:
      variant === 'surface'
        ? dark
          ? `linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))`
          : `linear-gradient(160deg, rgba(255,255,255,0.8), rgba(255,255,255,0.6))`
        : dark
          ? `radial-gradient(circle at 30% 25%, ${baseColor}33, rgba(255,255,255,${alpha}) 58%, rgba(255,255,255,0.02) 100%)`
          : `radial-gradient(circle at 30% 25%, ${baseColor}22, rgba(255,255,255,0.7) 58%, rgba(255,255,255,0.35) 100%)`,
    backdropFilter: `blur(${Math.max(4, Math.min(14, blur))}px) saturate(120%)`,
    WebkitBackdropFilter: `blur(${Math.max(4, Math.min(14, blur))}px) saturate(120%)`,
    boxShadow: dark ? `0 8px 18px ${baseColor}1a` : `0 8px 18px rgba(0,0,0,0.08)`,
    ...style,
  }

  return <div aria-hidden className={`nx-liquid-surface-fallback ${className}`.trim()} style={localStyle} />
}

export default LiquidGlassSurface
