import React, { CSSProperties, memo, useState, forwardRef, useCallback, useRef } from 'react'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { getNoiseOverlay, getShadowStyles, getTransitionSpeed } from '../lib/visualUtils'

export interface GlassProps {
  children: React.ReactNode
  className?: string
  style?: CSSProperties
  type?: 'sidebar' | 'panel' | 'modal'
  glow?: boolean
  hover?: boolean
  gradient?: boolean
  shimmer?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement>
  animDelay?: number
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}

// ── Panel background pattern generators ──────────────────────────
function getPanelBg(mode: string, accent: string, bg: string, isDark: boolean): string {
  const rgb = hexToRgb(accent)
  switch (mode) {
    case 'dots':
      return isDark
        ? `radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)`
        : `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`
    case 'grid':
      return isDark
        ? `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`
        : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`
    case 'noise':
      return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`
    case 'carbon':
      return `repeating-linear-gradient(45deg, rgba(${rgb},0.03) 0px, rgba(${rgb},0.03) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(${rgb},0.03) 0px, rgba(${rgb},0.03) 1px, transparent 1px, transparent 8px)`
    case 'circuit':
      return `linear-gradient(rgba(${rgb},0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.06) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(${rgb},0.08) 2px, transparent 2px)`
    case 'gradient':
      return `linear-gradient(135deg, rgba(${rgb},0.14) 0%, transparent 60%)`
    case 'solid':
      return isDark ? 'rgba(15,15,25,0.85)' : 'rgba(255,255,255,0.95)'
    default:
      return ''
  }
}

function getPanelBgSize(mode: string): string {
  switch (mode) {
    case 'dots': return '20px 20px'
    case 'grid': return '20px 20px'
    case 'circuit': return '20px 20px, 20px 20px, 20px 20px'
    default: return 'auto'
  }
}

// ── Glass mode backgrounds ────────────────────────────────────────
function getGlassModeBg(mode: string, accentRgb: string, tintRgb: string, tintOpacity: number, isDark: boolean): string {
  const base = isDark ? '255,255,255' : '0,0,0'
  const inv  = isDark ? '0,0,0' : '255,255,255'
  switch (mode) {
    case 'plasma':
      return isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(255,255,255,0.75)'
    case 'frosted':
      return isDark
        ? `linear-gradient(rgba(${tintRgb},${tintOpacity+0.04}),rgba(${tintRgb},${tintOpacity})), rgba(20,20,35,0.82)`
        : `rgba(255,255,255,0.92)`
    case 'crystal':
      return isDark
        ? `linear-gradient(135deg, rgba(${base},0.14) 0%, rgba(${base},0.04) 50%, rgba(${accentRgb},0.06) 100%)`
        : `linear-gradient(135deg, rgba(${inv},0.88) 0%, rgba(${inv},0.72) 100%)`
    case 'neon':
      return isDark
        ? `linear-gradient(135deg, rgba(${accentRgb},0.15) 0%, rgba(${accentRgb},0.04) 100%), rgba(8,8,18,0.88)`
        : `linear-gradient(135deg, rgba(${accentRgb},0.08) 0%, rgba(255,255,255,0.9) 100%)`
    case 'matte':
      return isDark ? `rgba(18,18,28,0.94)` : `rgba(248,248,252,0.98)`
    case 'mirror':
      return isDark
        ? `linear-gradient(160deg, rgba(${base},0.28) 0%, rgba(${base},0.08) 40%, rgba(${accentRgb},0.12) 100%)`
        : `linear-gradient(160deg, rgba(${inv},0.95) 0%, rgba(${inv},0.75) 100%)`
    default: // 'default' / 'glass'
      return isDark
        ? tintOpacity > 0
          ? `linear-gradient(rgba(${tintRgb},${tintOpacity}),rgba(${tintRgb},${tintOpacity})), rgba(255,255,255,0.09)`
          : 'rgba(255,255,255,0.09)'
        : 'rgba(255,255,255,0.78)'
  }
}

// ── Gradient glow border (always uses theme colors) ───────────────
function GradientGlowBorder({ glow, active, animSpeed }: { glow: any; active: boolean; animSpeed: number }) {
  const c1 = glow.gradientColor1 || glow.color
  const c2 = glow.gradientColor2 || glow.color
  const intensity = glow.intensity * (active ? 1.3 : 0.85)
  const dur = Math.max(3 / Math.max(glow.animationSpeed, 0.1), 1.5)

  return (
    <>
      {/* Glow bloom behind the panel */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: -glow.radius * 0.4,
        pointerEvents: 'none', zIndex: 0, borderRadius: 'inherit',
        background: `conic-gradient(from ${glow.gradientAngle}deg, ${c1}, ${c2}, ${c1})`,
        filter: `blur(${glow.radius * 0.7}px)`,
        opacity: Math.min(intensity * 0.55, 0.9),
        animation: glow.animated ? `nexus-spin ${dur}s linear infinite` : undefined,
      }} />
      {/* Sharp gradient border on top */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', zIndex: 6, borderRadius: 'inherit',
        padding: '1.5px',
        background: `conic-gradient(from ${glow.gradientAngle}deg, ${c1}dd, ${c2}dd, ${c1}dd)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        animation: glow.animated ? `nexus-spin ${dur}s linear infinite` : undefined,
        opacity: Math.min(intensity, 1),
      }} />
    </>
  )
}

// ── Reflection line (top) ─────────────────────────────────────────
function ReflectionLine() {
  return (
    <div aria-hidden="true" style={{
      position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)',
      zIndex: 7, pointerEvents: 'none',
    }} />
  )
}

export const Glass = memo(forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { children, className = '', style, type = 'panel', glow = false, hover = false,
    gradient = false, shimmer = false, onClick, animDelay = 0,
    onDoubleClick, onMouseEnter: onME, onMouseLeave: onML }: GlassProps,
  ref
) {
  const t = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const rootRef = useRef<HTMLDivElement>(null)

  const accentRgb = hexToRgb(t.accent)
  const tintRgb   = hexToRgb(t.glassmorphism.tintColor)
  const isDark    = t.mode === 'dark'
  const active    = isHovered || isFocused

  const glassMode  = (t.glassmorphism as any).glassMode ?? 'default'
  const panelBgMode = (t.background as any).panelBgMode ?? 'glass'
  const reflLine   = (t.glassmorphism as any).reflectionLine ?? false
  const innerShadow = (t.glassmorphism as any).innerShadow ?? false
  const glassDepth = (t.glassmorphism as any).glassDepth ?? 0.5

  const showGlow = glow && t.glow.mode !== 'off'
  const isGradientGlow = showGlow && t.glow.gradientGlow

  const blurPx = type === 'sidebar' ? t.blur.sidebarBlur
               : type === 'modal'   ? t.blur.modalBlur
               : t.blur.panelBlur

  // Glass mode determines the saturation boost
  const satMult = glassMode === 'crystal' ? 1.5 : glassMode === 'neon' ? 1.35 : glassMode === 'matte' ? 0.85 : 1.18
  const effectiveBlur = glassMode === 'matte' ? Math.max(blurPx * 0.7, 14)
                      : glassMode === 'mirror' ? blurPx * 1.65
                      : glassMode === 'frosted' ? Math.max(blurPx, 34)
                      : Math.max(blurPx + 6, 22)
  const saturate = Math.round(t.glassmorphism.saturation * satMult)
    + (glassMode === 'frosted' ? 40 : 0)
    + (glassMode === 'crystal' ? 20 : 0)

  // Background
  let bg: string
  if (panelBgMode !== 'glass') {
    const patternBg = getPanelBg(panelBgMode, t.accent, t.bg, isDark)
    const solidBase = glassMode === 'matte'
      ? (isDark ? 'rgba(14,14,22,0.92)' : 'rgba(250,250,252,0.97)')
      : t.tokens?.surface ?? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)')
    bg = patternBg ? `${patternBg}` : solidBase
  } else {
    bg = gradient
      ? `linear-gradient(135deg, rgba(${accentRgb},0.18), rgba(${accentRgb},0.06))`
      : getGlassModeBg(glassMode, accentRgb, tintRgb, t.glassmorphism.tintOpacity, isDark)
  }

  // Border
  const bo = t.glassmorphism.borderOpacity
  const borderColor = isDark
    ? (t.glassmorphism.borderGlow && showGlow
        ? `rgba(${accentRgb}, ${Math.min(bo * 3, 0.8)})`
        : glassMode === 'crystal' ? `rgba(255,255,255,${bo * 1.8})`
        : glassMode === 'neon'    ? `rgba(${accentRgb}, ${bo * 2})`
        : glassMode === 'mirror'  ? `rgba(255,255,255,${bo * 2.5})`
        : `rgba(255,255,255,${Math.max(bo, 0.2)})`)
    : `rgba(255,255,255,${Math.max(bo * 0.75, 0.16)})`

  // Box shadow
  const baseShadow = getShadowStyles(
    isHovered && hover && t.animations.hoverLift
      ? Math.min(t.visual.shadowDepth + 0.3, 1)
      : t.visual.shadowDepth,
    t.mode
  )
  const iosShadow = isDark
    ? `0 26px 56px rgba(0,0,0,0.38), 0 8px 18px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.2)`
    : `0 20px 42px rgba(8,25,60,0.15), 0 6px 15px rgba(8,25,60,0.1), inset 0 1px 0 rgba(255,255,255,0.68)`

  // ambientGlow is now handled by a separate div element for proper external glow
  const ambientGlow = ''

  const insetGlow = t.glassmorphism.borderGlow && showGlow
    ? `inset 0 0 20px rgba(${accentRgb}, ${t.glassmorphism.borderGlowIntensity * 0.15}), inset 0 1px 0 rgba(${accentRgb}, ${t.glassmorphism.borderGlowIntensity * 0.5})`
    : ''

  const innerShadowStyle = innerShadow
    ? `inset 0 2px 8px rgba(0,0,0,${glassDepth * 0.3}), inset 0 -1px 4px rgba(255,255,255,${isDark ? 0.04 : 0.2})`
    : ''

  const boxShadow = [baseShadow, iosShadow, ambientGlow, insetGlow, innerShadowStyle].filter(Boolean).join(', ')

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!rootRef.current) return
    const r = rootRef.current.getBoundingClientRect()
    setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (t.animations.rippleClick && rootRef.current && onClick) {
      const r = rootRef.current.getBoundingClientRect()
      const ripple = document.createElement('div')
      const size = Math.max(r.width, r.height)
      ripple.className = 'nx-ripple'
      ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`
      rootRef.current.appendChild(ripple)
      ripple.addEventListener('animationend', () => ripple.remove())
    }
    onClick?.(e)
  }, [t.animations.rippleClick, onClick])

  const bgSize = panelBgMode !== 'glass' ? getPanelBgSize(panelBgMode) : undefined

  return (
    <div
      ref={(node) => {
        (rootRef as any).current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as any).current = node
      }}
      className={[
        className,
        t.animations.rippleClick && onClick ? 'nx-ripple-container' : '',
        (t.animations as any).glowPulse && showGlow ? 'nx-glow-pulse' : '',
        (t.animations as any).floatEffect && hover ? 'nx-float' : '',
        glassMode === 'plasma' ? 'nx-glass-plasma' : '',
        (t.glassmorphism as any).animatedBlur ? 'nx-plasma-bg' : '',
        'nx-ios-surface',
      ].filter(Boolean).join(' ')}
      onDoubleClick={onDoubleClick}
      style={{
        position: 'relative',
        ['--nx-rgb' as any]: hexToRgb(t.accent),
        ['--nx-rgb2' as any]: hexToRgb(t.accent2),
        ['--nx-plasma-speed' as any]: `${4 / Math.max((t.glassmorphism as any).animatedBlurSpeed || 3, 0.5)}s`,
        ['--nx-blur-speed' as any]: `${4 / Math.max((t.glassmorphism as any).animatedBlurSpeed || 3, 0.5)}s`,
        background: bg,
        backgroundSize: bgSize,
        backdropFilter: `blur(${(t.glassmorphism as any).animatedBlur ? effectiveBlur * 1.2 : effectiveBlur}px) saturate(${saturate}%)${glassMode === 'frosted' ? ' brightness(0.96)' : glassMode === 'mirror' ? ' brightness(1.08)' : glassMode === 'plasma' ? ' brightness(0.99)' : ' brightness(1.02)'}${(t.glassmorphism as any).animatedBlur ? ' hue-rotate(0deg)' : ''}`,
        WebkitBackdropFilter: `blur(${effectiveBlur}px) saturate(${saturate}%)${glassMode === 'frosted' ? ' brightness(0.96)' : glassMode === 'mirror' ? ' brightness(1.08)' : ' brightness(1.02)'}`,
        border: `1px solid ${borderColor}`,
        borderRadius: `${t.visual.panelRadius}px`,
        boxShadow,
        transition: `box-shadow ${getTransitionSpeed(t.visual.animationSpeed)}, border-color ${getTransitionSpeed(t.visual.animationSpeed)}, transform ${getTransitionSpeed(t.visual.animationSpeed)}, background ${getTransitionSpeed(t.visual.animationSpeed)}`,
        willChange: hover ? 'transform, box-shadow' : 'auto',
        transform: hover && isHovered && t.animations.hoverLift
          ? `translateY(-3px) scale(1.006)` : undefined,
        // crystal mode gets a subtle inner highlight via outline
        outline: glassMode === 'crystal' && isDark ? `1px solid rgba(255,255,255,0.06)` : undefined,
        outlineOffset: glassMode === 'crystal' ? '2px' : undefined,
        ...style,
        overflow: 'hidden',
      }}
      onClick={handleClick}
      onMouseMove={hover ? handleMouseMove : undefined}
      onMouseEnter={(e) => { if (hover) setIsHovered(true); onME?.(e) }}
      onMouseLeave={(e) => { if (hover) setIsHovered(false); onML?.(e) }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {/* Gradient glow border — always reads theme colors */}
      {isGradientGlow && (
        <GradientGlowBorder glow={t.glow} active={active} animSpeed={t.visual.animationSpeed} />
      )}

      {/* Universal chrome overlay for richer glass depth */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          background: isDark
            ? `linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 36%, rgba(0,0,0,0.08) 100%)`
            : `linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.25) 42%, rgba(0,0,0,0.03) 100%)`,
          opacity: glassMode === 'matte' ? 0.3 : 0.68,
        }}
      />

      {/* Mouse light sweep */}
      {hover && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          opacity: isHovered ? 1 : 0, transition: 'opacity 0.6s ease',
          background: `radial-gradient(500px circle at ${mousePos.x}px ${mousePos.y}px, rgba(${accentRgb},0.09), transparent 70%)`,
        }} />
      )}

      {/* Noise overlay */}
      {t.blur.noiseOverlay && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          opacity: t.blur.noiseOpacity * 8,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px 150px',
          mixBlendMode: isDark ? 'screen' : 'multiply',
        }} />
      )}

      {/* ── REAL GLOW — element outside panel, not box-shadow ── */}
      {showGlow && !isGradientGlow && t.glow.mode !== 'off' && (
        <div aria-hidden="true" style={{
          position: 'absolute',
          inset: -(t.glow.radius * 0.6),
          borderRadius: 'inherit',
          background: t.glow.mode === 'ambient'
            ? `radial-gradient(ellipse at 50% 50%, rgba(${accentRgb},${t.glow.intensity * 0.35}), transparent 70%)`
            : `radial-gradient(ellipse at 50% 50%, rgba(${accentRgb},${t.glow.intensity * 0.4}), transparent 65%)`,
          filter: `blur(${t.glow.radius * 0.5}px)`,
          pointerEvents: 'none',
          zIndex: -1,
          opacity: active ? Math.min(t.glow.intensity * 1.2, 1) : Math.min(t.glow.intensity * 0.7, 0.85),
          transition: 'opacity 0.4s ease',
          animation: t.glow.mode === 'pulse'
            ? `nx-glow-pulse-anim ${2.5 / Math.max(t.visual.animationSpeed, 0.1)}s ease-in-out infinite`
            : undefined,
        }} />
      )}

      {/* Plasma animated overlay */}
      {glassMode === 'plasma' && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit',
          background: `linear-gradient(-45deg, rgba(${hexToRgb(t.accent)},0.12), rgba(${hexToRgb(t.accent2)},0.07), rgba(${hexToRgb(t.accent)},0.04), rgba(${hexToRgb(t.accent2)},0.1))`,
          backgroundSize: '400% 400%',
          animation: `nx-plasma-shift ${4 / Math.max((t.glassmorphism as any).animatedBlurSpeed || 3, 0.5)}s ease infinite`,
          mixBlendMode: isDark ? 'screen' : 'multiply',
        }} />
      )}
      {/* Crystal top shine */}
      {(glassMode === 'crystal' || glassMode === 'mirror') && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: '40%', pointerEvents: 'none', zIndex: 3,
          background: `linear-gradient(to bottom, rgba(255,255,255,${isDark ? 0.06 : 0.5}), transparent)`,
          borderRadius: `${t.visual.panelRadius}px ${t.visual.panelRadius}px 0 0`,
        }} />
      )}

      {/* Neon border glow */}
      {glassMode === 'neon' && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, borderRadius: 'inherit',
          boxShadow: `inset 0 0 20px rgba(${accentRgb}, 0.08), inset 0 0 1px rgba(${accentRgb}, 0.6)`,
        }} />
      )}

      {/* Reflection line */}
      {reflLine && <ReflectionLine />}

      {/* Shimmer on hover */}
      {(shimmer || (hover && isHovered && t.animations.hoverLift)) && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
          backgroundSize: '200% 100%', animation: 'nexus-shimmer 2s ease-in-out infinite',
          zIndex: 4, pointerEvents: 'none', borderRadius: 'inherit',
        }} />
      )}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 5, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </div>
    </div>
  )
}))
Glass.displayName = 'Glass'
