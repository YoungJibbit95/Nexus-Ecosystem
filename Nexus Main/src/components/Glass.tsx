import React, { CSSProperties, memo, useState, forwardRef, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTheme } from '../store/themeStore'
import { hexToRgb } from '../lib/utils'
import { getShadowStyles } from '../lib/visualUtils'
import { ThreePanelEffect } from './ThreePanelEffect'
import { useRenderSurfaceBudget } from '../render/useRenderSurfaceBudget'
import { useSurfaceMotionRuntime } from '../render/useSurfaceMotionRuntime'

export interface GlassProps {
  children: React.ReactNode
  className?: string
  style?: CSSProperties
  type?: 'sidebar' | 'panel' | 'modal'
  glow?: boolean
  hover?: boolean
  gradient?: boolean
  shimmer?: boolean
  disablePulse?: boolean
  performanceProfile?: 'auto' | 'balanced' | 'quality'
  onClick?: React.MouseEventHandler<HTMLDivElement>
  animDelay?: number
  onDoubleClick?: React.MouseEventHandler<HTMLDivElement>
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}

const isLowPowerDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const cores = Number(navigator.hardwareConcurrency || 8)
  const memory = Number((navigator as any).deviceMemory || 8)
  return Boolean(reducedMotion) || cores <= 4 || memory <= 4
}

const ensureFakeGlassFilter = () => {
  if (typeof document === 'undefined') return
  if (document.getElementById('nx-fake-glass-filter-defs')) return

  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('id', 'nx-fake-glass-filter-defs')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.left = '-9999px'
  svg.style.top = '-9999px'
  svg.innerHTML = `
    <defs>
      <filter id="nx-fake-glass-filter" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="9" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="1.4" result="blurNoise" />
        <feDisplacementMap in="SourceGraphic" in2="blurNoise" scale="6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  `
  document.body.appendChild(svg)
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
    case 'linen':
      return `repeating-linear-gradient(0deg, rgba(255,255,255,${isDark ? 0.035 : 0.28}) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(${rgb},0.035) 0 1px, transparent 1px 7px)`
    case 'hologram':
      return `linear-gradient(135deg, rgba(${rgb},0.18), transparent 52%), conic-gradient(from 140deg at 80% 20%, rgba(${rgb},0.18), transparent, rgba(255,255,255,${isDark ? 0.08 : 0.32}), transparent)`
    case 'mist':
      return `radial-gradient(420px ellipse at 18% 14%, rgba(${rgb},0.18), transparent 62%), linear-gradient(145deg, rgba(255,255,255,${isDark ? 0.07 : 0.72}), rgba(${rgb},${isDark ? 0.05 : 0.08}))`
    case 'stripes':
      return `repeating-linear-gradient(135deg, rgba(${rgb},0.08) 0 1px, transparent 1px 12px), linear-gradient(145deg, rgba(255,255,255,${isDark ? 0.06 : 0.72}), transparent)`
    case 'gradient':
      return `linear-gradient(135deg, rgba(${rgb},0.14) 0%, transparent 60%)`
    case 'solid':
      return isDark ? 'rgba(15,15,25,0.74)' : 'rgba(255,255,255,0.92)'
    default:
      return ''
  }
}

function getPanelBgSize(mode: string): string {
  switch (mode) {
    case 'dots': return '20px 20px'
    case 'grid': return '20px 20px'
    case 'circuit': return '20px 20px, 20px 20px, 20px 20px'
    case 'linen': return '12px 12px, 18px 18px'
    case 'stripes': return '24px 24px, auto'
    case 'hologram': return '180% 180%, 220% 220%'
    default: return 'auto'
  }
}

// ── Glass mode backgrounds ────────────────────────────────────────
function getGlassModeBg(mode: string, accentRgb: string, accent2Rgb: string, tintRgb: string, tintOpacity: number, isDark: boolean): string {
  const base = isDark ? '255,255,255' : '0,0,0'
  const inv  = isDark ? '0,0,0' : '255,255,255'
  switch (mode) {
    case 'plasma':
      return isDark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(255,255,255,0.62)'
    case 'frosted':
      return isDark
        ? `linear-gradient(rgba(${tintRgb},${tintOpacity + 0.035}),rgba(${tintRgb},${tintOpacity})), rgba(20,20,35,0.68)`
        : `rgba(255,255,255,0.84)`
    case 'crystal':
      return isDark
        ? `linear-gradient(135deg, rgba(${base},0.11) 0%, rgba(${base},0.03) 50%, rgba(${accentRgb},0.05) 100%)`
        : `linear-gradient(135deg, rgba(${inv},0.82) 0%, rgba(${inv},0.66) 100%)`
    case 'neon':
      return isDark
        ? `linear-gradient(135deg, rgba(${accentRgb},0.12) 0%, rgba(${accentRgb},0.035) 100%), rgba(8,8,18,0.72)`
        : `linear-gradient(135deg, rgba(${accentRgb},0.08) 0%, rgba(255,255,255,0.82) 100%)`
    case 'matte':
      return isDark ? `rgba(18,18,28,0.82)` : `rgba(248,248,252,0.9)`
    case 'mirror':
      return isDark
        ? `linear-gradient(160deg, rgba(${base},0.22) 0%, rgba(${base},0.06) 40%, rgba(${accentRgb},0.1) 100%)`
        : `linear-gradient(160deg, rgba(${inv},0.88) 0%, rgba(${inv},0.7) 100%)`
    default: // 'default' / 'glass'
      return isDark
        ? tintOpacity > 0
          ? `linear-gradient(145deg, rgba(${accentRgb},0.12), rgba(${accent2Rgb},0.08) 55%, rgba(${tintRgb},${Math.max(tintOpacity, 0.025)})), rgba(255,255,255,0.05)`
          : `linear-gradient(145deg, rgba(${accentRgb},0.1), rgba(${accent2Rgb},0.07) 60%), rgba(255,255,255,0.05)`
        : 'rgba(255,255,255,0.7)'
  }
}

// ── Gradient glow border (always uses theme colors) ───────────────
function GradientGlowBorder({ glow, active, animSpeed }: { glow: any; active: boolean; animSpeed: number }) {
  const c1 = glow.gradientColor1 || glow.color
  const c2 = glow.gradientColor2 || glow.color
  const intensity = glow.intensity * (active ? 1.3 : 0.85)
  // Keep glow wander smooth and stable; avoid over-speeding when multiple speed multipliers stack.
  const effectiveSpeed = Math.max(glow.animationSpeed, 0.1) * Math.max(Math.sqrt(Math.max(animSpeed, 0.1)), 0.35)
  const dur = Math.min(24, Math.max(5.5, 11 / Math.max(effectiveSpeed, 0.1)))
  const wanderAnim = glow.animated ? `nx-gradient-wander ${dur}s linear infinite` : undefined

  return (
    <>
      {/* Glow bloom behind the panel */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: -glow.radius * 0.4,
        pointerEvents: 'none', zIndex: 0, borderRadius: 'inherit',
        background: `conic-gradient(from calc(${glow.gradientAngle}deg + var(--nx-gradient-rot, 0deg)), ${c1}, ${c2}, ${c1})`,
        filter: `blur(${glow.radius * 0.7}px)`,
        opacity: Math.min(intensity * 0.55, 0.9),
        animation: wanderAnim,
      }} />
      {/* Sharp gradient border on top */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: -1.5,
        pointerEvents: 'none', zIndex: 7, borderRadius: 'inherit',
        padding: '2px',
        background: `conic-gradient(from calc(${glow.gradientAngle}deg + var(--nx-gradient-rot, 0deg)), ${c1}dd, ${c2}dd, ${c1}dd)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        animation: wanderAnim,
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
    gradient = false, shimmer = false, disablePulse = false, performanceProfile = 'auto',
    onClick, animDelay = 0,
    onDoubleClick, onMouseEnter: onME, onMouseLeave: onML }: GlassProps,
  ref
) {
  const t = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [visibilityState, setVisibilityState] = useState<'visible' | 'occluded' | 'hidden'>('visible')
  const [areaHint, setAreaHint] = useState(1)
  const rootRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const nextMouseRef = useRef({ x: 0, y: 0 })
  const lowPowerMode = useMemo(() => isLowPowerDevice(), [])

  const accentRgb = hexToRgb(t.accent)
  const accent2Rgb = hexToRgb(t.accent2)
  const tintRgb   = hexToRgb(t.glassmorphism.tintColor)
  const isDark    = t.mode === 'dark'
  const active    = isHovered || isFocused

  const glassMode  = (t.glassmorphism as any).glassMode ?? 'default'
  const panelRenderer = (t.glassmorphism as any)?.panelRenderer ?? 'blur'
  const normalizedPanelRenderer = panelRenderer
  const glowRenderer = (t.glassmorphism as any).glowRenderer ?? 'css'
  const panelBgMode = (t.background as any).panelBgMode ?? 'glass'
  const reflLine   = (t.glassmorphism as any).reflectionLine ?? false
  const innerShadow = (t.glassmorphism as any).innerShadow ?? false
  const glassDepth = (t.glassmorphism as any).glassDepth ?? 0.5
  const isToolbarSurface = className.includes('nx-toolbar-surface')
  const shaderEligibleSurface = !isToolbarSurface && type === 'panel'
  const balancedMode = useMemo(() => {
    if (performanceProfile === 'quality') return false
    if (performanceProfile === 'balanced') return true
    return lowPowerMode || Boolean(t.qol?.reducedMotion)
  }, [lowPowerMode, performanceProfile, t.qol?.reducedMotion])

  const interactionState = isFocused ? 'focused' : isHovered ? 'hovered' : 'idle'
  const motionClassHint = type === 'sidebar' ? 'navigation' : type === 'modal' ? 'sheet' : 'content'
  const transformOwnerHint = hover && type !== 'sidebar' ? 'surface' : 'none'
  const renderDecision = useRenderSurfaceBudget({
    surfaceClass: isToolbarSurface
      ? 'toolbar-surface'
      : type === 'sidebar'
        ? 'shell-surface'
        : type === 'modal'
          ? 'modal-surface'
          : 'panel-surface',
    effectClass: shaderEligibleSurface && normalizedPanelRenderer === 'glass-shader'
      ? 'shader-burst'
      : normalizedPanelRenderer === 'fake-glass'
        ? 'refractive-edge'
        : 'backdrop',
    interactionState,
    budgetPriority: isToolbarSurface ? 'low' : type === 'modal' ? 'high' : type === 'sidebar' ? 'low' : 'normal',
    prefersShader: shaderEligibleSurface && normalizedPanelRenderer === 'glass-shader',
    prefersBurst: Boolean(hover || shimmer),
    areaHint,
    visibilityState,
    motionClassHint,
    transformOwnerHint,
    filterOwnerHint: 'surface',
    opacityOwnerHint: 'surface',
  })
  const surfaceMotion = useSurfaceMotionRuntime(renderDecision, {
    family: motionClassHint as any,
  })
  const quickMotion = `${surfaceMotion.timings.quickMs}ms`
  const regularMotion = `${surfaceMotion.timings.regularMs}ms`
  const motionEase = surfaceMotion.timings.easing
  const renderDynamicEnabled = renderDecision.dynamic
  const renderShaderEnabled =
    shaderEligibleSurface &&
    normalizedPanelRenderer === 'glass-shader' &&
    visibilityState !== 'hidden'
  const renderBurstEnabled = renderDecision.burst
  const renderAllowsHoverMotion = surfaceMotion.allowHover
  const renderAllowsRichMotion = surfaceMotion.allowStagger
  const panelTransition = surfaceMotion.css.panelTransition

  const showGlow = glow && t.glow.mode !== 'off'
  const isGradientGlow = showGlow && t.glow.gradientGlow
  const useThreePanelRenderer =
    normalizedPanelRenderer === 'glass-shader' &&
    !lowPowerMode &&
    !balancedMode &&
    renderShaderEnabled
  const useFakeGlassRenderer = normalizedPanelRenderer === 'fake-glass'
  // CSS glow is currently more stable than the shader path (no flicker/pulsing drift).
  const useThreeGlowRenderer = false

  const blurPx = type === 'sidebar' ? t.blur.sidebarBlur
               : type === 'modal'   ? t.blur.modalBlur
               : t.blur.panelBlur

  // Glass mode determines the saturation boost
  const satMult = glassMode === 'crystal' ? 1.4 : glassMode === 'neon' ? 1.3 : glassMode === 'matte' ? 0.8 : 1
  const effectiveBlur = lowPowerMode ? Math.min(14, Math.max(8, blurPx * 0.52))
                      : glassMode === 'matte' ? blurPx * 0.5
                      : glassMode === 'mirror' ? blurPx * 1.5
                      : glassMode === 'frosted' ? Math.max(blurPx, 28)
                      : blurPx
  const effectiveBlurCapped = balancedMode
    ? Math.min(effectiveBlur, type === 'modal' ? 16 : 14)
    : effectiveBlur
  const saturate = (lowPowerMode
    ? Math.min(130, Math.round(t.glassmorphism.saturation * 0.82))
    : Math.round(t.glassmorphism.saturation * satMult))
    + (glassMode === 'frosted' ? 40 : 0)
    + (glassMode === 'crystal' ? 20 : 0)
  const effectiveSaturate = balancedMode ? Math.min(saturate, 165) : saturate

  // Background
  let bg: string
  if (panelBgMode !== 'glass') {
    const patternBg = getPanelBg(panelBgMode, t.accent, t.bg, isDark)
    const solidBase = glassMode === 'matte'
      ? (isDark ? 'rgba(14,14,22,0.84)' : 'rgba(250,250,252,0.94)')
      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.68)')
    bg = patternBg ? `${patternBg}` : solidBase
  } else {
    const themeTintStrength = type === 'sidebar' ? 0.22 : type === 'modal' ? 0.18 : 0.16
    const themeTint = `linear-gradient(145deg, rgba(${accentRgb},${themeTintStrength}), rgba(${accent2Rgb},${Math.max(themeTintStrength - 0.04, 0.06)}) 58%, rgba(${accentRgb},0.035))`
    bg = gradient
      ? `linear-gradient(135deg, rgba(${accentRgb},0.18), rgba(${accentRgb},0.06))`
      : `${themeTint}, ${getGlassModeBg(glassMode, accentRgb, accent2Rgb, tintRgb, t.glassmorphism.tintOpacity, isDark)}`
  }

  // Border
  const bo = t.glassmorphism.borderOpacity
  const borderColor = isDark
    ? (t.glassmorphism.borderGlow && showGlow
        ? `rgba(${accentRgb}, ${Math.min(bo * 3, 0.8)})`
        : glassMode === 'crystal' ? `rgba(255,255,255,${bo * 1.8})`
        : glassMode === 'neon'    ? `rgba(${accentRgb}, ${bo * 2})`
        : glassMode === 'mirror'  ? `rgba(255,255,255,${bo * 2.5})`
        : `rgba(255,255,255,${bo})`)
    : `rgba(0,0,0,${bo * 0.5})`

  // Box shadow
  const baseShadow = getShadowStyles(
    isHovered && hover && t.animations.hoverLift
      ? Math.min(t.visual.shadowDepth + 0.3, 1)
      : t.visual.shadowDepth,
    t.mode
  )

  // ambientGlow is now handled by a separate div element for proper external glow
  const ambientGlow = ''

  const borderGlowRing = t.glassmorphism.borderGlow && showGlow && !useThreeGlowRenderer
    ? `0 0 ${10 + t.glassmorphism.borderGlowIntensity * (balancedMode ? 14 : 22)}px rgba(${accentRgb}, ${0.14 + t.glassmorphism.borderGlowIntensity * (balancedMode ? 0.24 : 0.35)}), 0 0 0 1px rgba(${accentRgb}, ${0.1 + t.glassmorphism.borderGlowIntensity * (balancedMode ? 0.18 : 0.32)})`
    : ''

  const innerShadowStyle = innerShadow
    ? `inset 0 2px 8px rgba(0,0,0,${glassDepth * 0.3}), inset 0 -1px 4px rgba(255,255,255,${isDark ? 0.04 : 0.2})`
    : ''

  const boxShadow = [baseShadow, ambientGlow, borderGlowRing, innerShadowStyle].filter(Boolean).join(', ')

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisibilityState('visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || !entry.isIntersecting) {
          setVisibilityState('hidden')
          return
        }
        setVisibilityState(entry.intersectionRatio < 0.18 ? 'occluded' : 'visible')
      },
      { threshold: [0, 0.08, 0.18, 0.5] },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = rootRef.current
    if (!node) return

    const updateArea = () => {
      const rect = node.getBoundingClientRect()
      const next = Math.max(1, Math.round(rect.width * rect.height))
      setAreaHint((prev) => (Math.abs(prev - next) >= 120 ? next : prev))
    }

    updateArea()
    if (typeof ResizeObserver === 'undefined') return
    let frame: number | null = null
    const schedule = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        updateArea()
      })
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(node)
    return () => {
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (useFakeGlassRenderer) ensureFakeGlassFilter()
  }, [useFakeGlassRenderer])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!rootRef.current) return
    const r = rootRef.current.getBoundingClientRect()
    nextMouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      if (!rootRef.current) return
      rootRef.current.style.setProperty('--nx-mouse-x', `${nextMouseRef.current.x}px`)
      rootRef.current.style.setProperty('--nx-mouse-y', `${nextMouseRef.current.y}px`)
    })
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
  const isInteractiveSurface = Boolean(type !== 'sidebar' && (hover || onClick || onDoubleClick) && !showGlow)
  const ownsPointerDown = Boolean(onClick || onDoubleClick)
  const allowHoverLift = hover && type !== 'sidebar' && !ownsPointerDown && renderDynamicEnabled && renderAllowsHoverMotion
  const useCssHoverBounce = isInteractiveSurface && !(allowHoverLift && t.animations.hoverLift)
  const baseBackdropFilter = `blur(${(!lowPowerMode && !balancedMode && (t.glassmorphism as any).animatedBlur) ? effectiveBlurCapped * 1.2 : effectiveBlurCapped}px) saturate(${effectiveSaturate}%)${glassMode === 'frosted' ? ' brightness(0.94)' : glassMode === 'mirror' ? ' brightness(1.08)' : glassMode === 'plasma' ? ' brightness(0.97)' : ''}`
  const webkitBaseBackdropFilter = `blur(${effectiveBlurCapped}px) saturate(${effectiveSaturate}%)${glassMode === 'frosted' ? ' brightness(0.94)' : glassMode === 'mirror' ? ' brightness(1.08)' : ''}`

  return (
    <div
      ref={(node) => {
        (rootRef as any).current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) (ref as any).current = node
      }}
      className={[
        'nx-motion-panel',
        type === 'sidebar' ? 'nx-sidebar-surface' : '',
        useCssHoverBounce ? 'nx-bounce-target' : '',
        className,
        t.animations.rippleClick && onClick && !showGlow ? 'nx-ripple-container' : '',
        !lowPowerMode && (t.animations as any).floatEffect && hover && isHovered ? 'nx-float' : '',
        !lowPowerMode && !balancedMode && glassMode === 'plasma' ? 'nx-glass-plasma' : '',
        !lowPowerMode && !balancedMode && (t.glassmorphism as any).animatedBlur ? 'nx-plasma-bg' : '',
      ].filter(Boolean).join(' ')}
      data-nx-surface-id={renderDecision.id}
      data-nx-surface-mode={renderDecision.mode}
      data-nx-surface-motion={renderDecision.motionCapability}
      onDoubleClick={onDoubleClick}
      style={{
        position: 'relative',
        '--nx-rgb': hexToRgb(t.accent),
        '--nx-rgb2': hexToRgb(t.accent2),
        '--nx-panel-radius': `${t.visual.panelRadius}px`,
        '--nx-mouse-x': '50%',
        '--nx-mouse-y': '50%',
        '--nx-plasma-speed': `${4 / Math.max((t.glassmorphism as any).animatedBlurSpeed || 3, 0.5)}s`,
        '--nx-blur-speed': `${4 / Math.max((t.glassmorphism as any).animatedBlurSpeed || 3, 0.5)}s`,
        background: bg,
        backgroundSize: bgSize,
        backdropFilter: normalizedPanelRenderer === 'glass-shader'
          ? `blur(${Math.max(4, Math.floor(effectiveBlurCapped * 0.35))}px) saturate(${Math.round(effectiveSaturate * 0.92)}%)`
          : baseBackdropFilter,
        WebkitBackdropFilter: normalizedPanelRenderer === 'glass-shader'
          ? `blur(${Math.max(4, Math.floor(effectiveBlurCapped * 0.35))}px) saturate(${Math.round(effectiveSaturate * 0.92)}%)`
          : webkitBaseBackdropFilter,
        border: `1px solid ${borderColor}`,
        borderRadius: `${t.visual.panelRadius}px`,
        boxShadow,
        transition: panelTransition,
        willChange: allowHoverLift && isHovered && renderAllowsRichMotion ? 'transform, box-shadow' : 'auto',
        transform: allowHoverLift && isHovered && t.animations.hoverLift
          ? `translateY(-${surfaceMotion.hoverLiftPx}px) scale(${surfaceMotion.hoverScale + 0.006})` : undefined,
        // crystal mode gets a subtle inner highlight via outline
        outline: glassMode === 'crystal' && isDark ? `1px solid rgba(255,255,255,0.06)` : undefined,
        outlineOffset: glassMode === 'crystal' ? '2px' : undefined,
        ...style,
        overflow: 'visible',
      } as React.CSSProperties}
      onClick={handleClick}
      onMouseMove={allowHoverLift && !balancedMode && renderDynamicEnabled && renderAllowsRichMotion ? handleMouseMove : undefined}
      onMouseEnter={(e) => { if (allowHoverLift) setIsHovered(true); onME?.(e) }}
      onMouseLeave={(e) => {
        if (allowHoverLift) setIsHovered(false)
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        onML?.(e)
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {useThreeGlowRenderer && (
        <ThreePanelEffect
          mode="glow"
          colorA={t.glow.gradientColor1 || t.accent}
          colorB={t.glow.gradientColor2 || t.accent2}
          intensity={Math.max(0.2, t.glow.intensity)}
          active={active}
        />
      )}

      {/* Gradient glow border — always reads theme colors */}
      {isGradientGlow && !useThreeGlowRenderer && (
        <GradientGlowBorder glow={t.glow} active={active} animSpeed={t.visual.animationSpeed} />
      )}

      {useThreePanelRenderer && (
        <ThreePanelEffect
          mode="glass"
          colorA={t.accent}
          colorB={t.accent2}
          intensity={Math.max(0.16, Math.min(1.2, t.glassmorphism.borderGlowIntensity + 0.2))}
          depth={(t.glassmorphism as any).glassDepth ?? 1.0}
          reflection={Boolean((t.glassmorphism as any).reflectionLine)}
          active={active}
        />
      )}

      {/* Mouse light sweep */}
      {allowHoverLift && !lowPowerMode && !balancedMode && renderDynamicEnabled && renderAllowsRichMotion && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          opacity: isHovered ? 1 : 0, transition: `opacity ${regularMotion} ${motionEase}`,
          background: `radial-gradient(500px circle at var(--nx-mouse-x, 50%) var(--nx-mouse-y, 50%), rgba(${accentRgb},0.09), transparent 70%)`,
        }} />
      )}

      {useFakeGlassRenderer && (
        <div aria-hidden="true" style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          borderRadius: 'inherit',
          filter: 'url(#nx-fake-glass-filter)',
          background: `linear-gradient(135deg, rgba(${accentRgb}, 0.1), rgba(${hexToRgb(t.accent2)}, 0.08))`,
          mixBlendMode: isDark ? 'screen' : 'overlay',
          opacity: 0.82,
        }} />
      )}

      {/* Noise overlay */}
      {t.blur.noiseOverlay && !lowPowerMode && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
          opacity: t.blur.noiseOpacity * 8,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '150px 150px',
          mixBlendMode: isDark ? 'screen' : 'multiply',
        }} />
      )}

      {/* ── REAL GLOW — element outside panel, not box-shadow ── */}
      {showGlow && !isGradientGlow && t.glow.mode !== 'off' && !lowPowerMode && !useThreeGlowRenderer && (
        <div aria-hidden="true" style={{
          position: 'absolute',
          inset: -(t.glow.radius * 0.72),
          borderRadius: 'inherit',
          background: t.glow.mode === 'ambient'
            ? `radial-gradient(ellipse at 50% 50%, rgba(${accentRgb},${t.glow.intensity * 0.42}), rgba(${hexToRgb(t.accent2)},${t.glow.intensity * 0.28}) 48%, transparent 74%)`
            : `radial-gradient(ellipse at 50% 50%, rgba(${accentRgb},${t.glow.intensity * 0.48}), rgba(${hexToRgb(t.accent2)},${t.glow.intensity * 0.3}) 44%, transparent 68%)`,
          filter: `blur(${t.glow.radius * (balancedMode ? 0.46 : 0.72)}px)`,
          pointerEvents: 'none',
          zIndex: -1,
          opacity: Math.min(1, Math.max(0.18, t.glow.intensity * (active ? 1.08 : 0.92))),
          transition: `opacity ${regularMotion} ${motionEase}`,
          animation: undefined,
        }} />
      )}

      {/* Plasma animated overlay */}
      {glassMode === 'plasma' && !lowPowerMode && !balancedMode && renderDynamicEnabled && (
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
          boxShadow: `0 0 20px rgba(${accentRgb}, 0.22), 0 0 0 1px rgba(${accentRgb}, 0.55)`,
        }} />
      )}

      {/* Reflection line */}
      {reflLine && <ReflectionLine />}

      {/* Shimmer on hover */}
      {!lowPowerMode && !balancedMode && renderBurstEnabled && (shimmer || (allowHoverLift && isHovered && t.animations.hoverLift)) && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
          backgroundSize: '200% 100%', animation: 'nexus-shimmer 2s ease-in-out infinite',
          zIndex: 4, pointerEvents: 'none', borderRadius: 'inherit',
        }} />
      )}

      {/* Content
          Keep overflow visible here so inner controls/icons are never clipped by nested inherited radii. */}
      <div style={{ position: 'relative', zIndex: 5, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'visible' }}>
        {children}
      </div>
    </div>
  )
}))
Glass.displayName = 'Glass'
