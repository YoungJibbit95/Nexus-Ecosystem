import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useRenderSurfaceBudget } from '../render/useRenderSurfaceBudget'

type ChannelSelector = 'R' | 'G' | 'B' | 'A'

/**
 * `variant`:
 *   - `'element'` — Full liquid glass effect (SVG displacement + specular + edge glow).
 *                    Use for buttons, pills, small interactive elements.
 *   - `'surface'` — Subtle liquid glass hints only (specular highlight + edge refraction).
 *                    Use as an overlay on large panels that already have blur backdrop.
 *
 * `interactive` — Enables hover/press CSS transitions for element variant.
 */
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

const MAP_CACHE_LIMIT = 96
const displacementMapCache = new Map<string, string>()
let svgSupportCache: boolean | null = null

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const quantize = (value: number, step: number) => Math.max(step, Math.round(value / step) * step)

const formatSize = (value: number | string | undefined, fallback: string) => {
  if (typeof value === 'number') return `${value}px`
  if (typeof value === 'string' && value.trim().length > 0) return value
  return fallback
}

const supportsSvgBackdropFilter = () => {
  if (svgSupportCache !== null) return svgSupportCache
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof CSS === 'undefined') {
    svgSupportCache = false
    return svgSupportCache
  }

  const ua = navigator.userAgent
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium/.test(ua)
  const isFirefox = /Firefox/.test(ua)

  if (isSafari || isFirefox) {
    svgSupportCache = false
    return svgSupportCache
  }

  const supportsBackdrop =
    CSS.supports('backdrop-filter', 'blur(2px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(2px)')

  if (!supportsBackdrop) {
    svgSupportCache = false
    return svgSupportCache
  }

  const probe = document.createElement('div')
  probe.style.backdropFilter = 'url(#nx-probe-filter)'
  svgSupportCache = probe.style.backdropFilter !== ''
  return svgSupportCache
}

const cacheMap = (key: string, value: string) => {
  displacementMapCache.set(key, value)
  if (displacementMapCache.size <= MAP_CACHE_LIMIT) return
  const first = displacementMapCache.keys().next().value
  if (first) displacementMapCache.delete(first)
}

const generateDisplacementMap = ({
  width,
  height,
  borderRadius,
  borderWidth,
  brightness,
  opacity,
  blur,
  mixBlendMode,
}: {
  width: number
  height: number
  borderRadius: number
  borderWidth: number
  brightness: number
  opacity: number
  blur: number
  mixBlendMode: string
}) => {
  const edgeSize = Math.max(1, Math.round(Math.min(width, height) * borderWidth * 0.5))
  const innerWidth = Math.max(1, width - edgeSize * 2)
  const innerHeight = Math.max(1, height - edgeSize * 2)
  const innerRadius = Math.max(1, borderRadius - edgeSize)

  const svgContent = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rg" x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="red"/>
        </linearGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0000"/>
          <stop offset="100%" stop-color="blue"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="black"></rect>
      <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="url(#rg)" />
      <rect x="0" y="0" width="${width}" height="${height}" rx="${borderRadius}" fill="url(#bg)" style="mix-blend-mode:${mixBlendMode}" />
      <rect x="${edgeSize}" y="${edgeSize}" width="${innerWidth}" height="${innerHeight}" rx="${innerRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
    </svg>
  `

  return `data:image/svg+xml,${encodeURIComponent(svgContent)}`
}

export function LiquidGlassSurface({
  className = '',
  style,
  width,
  height,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness = 50,
  opacity = 0.93,
  blur = 11,
  displace = 0,
  backgroundOpacity = 0,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  lowPower = false,
  dark = true,
  variant = 'element',
  interactive = false,
  accentColor,
}: LiquidGlassSurfaceProps) {
  const uniqueId = useId().replace(/:/g, '-')
  const filterId = `nx-liquid-filter-${uniqueId}`

  const containerRef = useRef<HTMLDivElement | null>(null)
  const feImageRef = useRef<SVGFEImageElement | null>(null)
  const redChannelRef = useRef<SVGFEDisplacementMapElement | null>(null)
  const greenChannelRef = useRef<SVGFEDisplacementMapElement | null>(null)
  const blueChannelRef = useRef<SVGFEDisplacementMapElement | null>(null)
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastMapKeyRef = useRef('')

  const [svgSupported] = useState(() => supportsSvgBackdropFilter())
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [visibilityState, setVisibilityState] = useState<'visible' | 'occluded' | 'hidden'>('visible')
  const [areaHint, setAreaHint] = useState(1)

  const isSurfaceVariant = variant === 'surface'
  const hasExplicitSize = width !== undefined || height !== undefined
  const interactionState = interactive
    ? isPressed
      ? 'active'
      : isHovered
        ? 'hovered'
        : 'idle'
    : 'idle'
  const renderDecision = useRenderSurfaceBudget({
    id: `liquid-surface-${uniqueId}`,
    surfaceClass: isSurfaceVariant ? 'panel-surface' : 'liquid-element',
    effectClass: isSurfaceVariant ? 'refractive-edge' : 'liquid-interactive',
    interactionState,
    visibilityState,
    budgetPriority: interactive ? 'high' : isSurfaceVariant ? 'normal' : 'low',
    prefersShader: !isSurfaceVariant,
    prefersBurst: interactive && (isHovered || isPressed),
    areaHint,
    motionClassHint: isSurfaceVariant ? 'content' : 'micro',
    transformOwnerHint: interactive ? 'surface' : 'none',
    filterOwnerHint: 'surface',
    opacityOwnerHint: 'surface',
  })
  const dynamicEnabled =
    renderDecision.dynamic &&
    renderDecision.motionCapability !== 'critical-only' &&
    renderDecision.motionCapability !== 'static-safe'
  const richMotionEnabled =
    renderDecision.animationComplexity === 'rich' ||
    renderDecision.animationComplexity === 'standard'

  // For surface variant, keep the same SVG displacement parameters but
  // control subtlety via overlay opacity (not by reducing displacement which
  // causes partial/broken refraction at certain edges).
  const effectiveDistortionScale = distortionScale

  const config = useMemo(() => {
    const safeBlend = String(mixBlendMode || 'difference')
    return {
      borderRadius: clamp(borderRadius, 0, 120),
      borderWidth: clamp(borderWidth, 0.01, 0.2),
      brightness: clamp(brightness, 20, 85),
      opacity: clamp(opacity, 0.56, 0.98),
      blur: clamp(blur, 0, 18),
      displace: clamp(displace, 0, 3),
      saturation: clamp(saturation, 0.8, 2.4),
      distortionScale: clamp(effectiveDistortionScale, -320, 320),
      safeBlend,
    }
  }, [borderRadius, borderWidth, brightness, opacity, blur, displace, saturation, effectiveDistortionScale, mixBlendMode])

  const updateFilterMap = useCallback(() => {
    if (!renderDecision.shader || lowPower || isSurfaceVariant) return
    const node = containerRef.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const sizeStep = lowPower ? 36 : 20
    const mapWidth = quantize(Math.max(Math.round(rect.width || 320), 120), sizeStep)
    const mapHeight = quantize(Math.max(Math.round(rect.height || 180), 80), sizeStep)
    const mapRadius = quantize(Math.min(config.borderRadius, Math.min(mapWidth, mapHeight) * 0.5), 2)

    const cacheKey = [
      mapWidth,
      mapHeight,
      mapRadius,
      config.borderWidth,
      config.brightness,
      config.opacity,
      config.blur,
      config.safeBlend,
    ].join('|')

    if (lastMapKeyRef.current === cacheKey) return
    lastMapKeyRef.current = cacheKey

    const cached = displacementMapCache.get(cacheKey)
    const dataUrl =
      cached ??
      generateDisplacementMap({
        width: mapWidth,
        height: mapHeight,
        borderRadius: mapRadius,
        borderWidth: config.borderWidth,
        brightness: config.brightness,
        opacity: config.opacity,
        blur: config.blur,
        mixBlendMode: config.safeBlend,
      })

    if (!cached) cacheMap(cacheKey, dataUrl)

    const image = feImageRef.current
    if (image) {
      image.setAttribute('href', dataUrl)
      image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl)
    }
  }, [config, isSurfaceVariant, lowPower, renderDecision.shader])

  useEffect(() => {
    const displacementConfigs = [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset },
    ]

    displacementConfigs.forEach(({ ref, offset }) => {
      if (!ref.current) return
      ref.current.setAttribute('scale', String(clamp(config.distortionScale + offset, -320, 320)))
      ref.current.setAttribute('xChannelSelector', xChannel)
      ref.current.setAttribute('yChannelSelector', yChannel)
    })

    if (gaussianBlurRef.current) {
      gaussianBlurRef.current.setAttribute('stdDeviation', String(config.displace))
    }
  }, [config.displace, config.distortionScale, greenOffset, redOffset, blueOffset, xChannel, yChannel])

  useEffect(() => {
    const node = containerRef.current
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
        setVisibilityState(entry.intersectionRatio < 0.16 ? 'occluded' : 'visible')
      },
      { threshold: [0, 0.08, 0.16, 0.5] },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateArea = () => {
      const rect = node.getBoundingClientRect()
      const next = Math.max(1, Math.round(rect.width * rect.height))
      setAreaHint((prev) => (Math.abs(prev - next) >= 96 ? next : prev))
    }

    updateArea()
    if (typeof ResizeObserver === 'undefined') return
    let frame: number | null = null
    const schedule = () => {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        updateArea()
      })
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(node)
    return () => {
      observer.disconnect()
      if (frame !== null) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node || !renderDecision.shader || lowPower || isSurfaceVariant) return

    const scheduleUpdate = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        updateFilterMap()
      })
    }

    scheduleUpdate()
    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(node)

    return () => {
      observer.disconnect()
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isSurfaceVariant, lowPower, renderDecision.shader, updateFilterMap])

  useEffect(() => {
    if (!renderDecision.shader || lowPower || isSurfaceVariant) return
    updateFilterMap()
  }, [isSurfaceVariant, lowPower, renderDecision.shader, updateFilterMap])

  // ── iOS-style specular highlight color ──
  const specularColor = accentColor
    ? accentColor
    : dark ? 'rgba(255,255,255,' : 'rgba(255,255,255,'

  // ── Compute interactive transform ──
  const interactiveTransform = interactive
    ? isPressed && dynamicEnabled
      ? 'scale(0.97)'
      : isHovered && dynamicEnabled
        ? richMotionEnabled
          ? 'scale(1.02) translateY(-1px)'
          : 'scale(1.008)'
        : 'scale(1)'
    : undefined

  const interactiveTransition = interactive && dynamicEnabled
    ? 'transform var(--nx-motion-quick, 170ms) var(--nx-motion-hover-ease, cubic-bezier(0.2, 0.86, 0.3, 1)), box-shadow var(--nx-motion-regular, 210ms) var(--nx-motion-settle-ease, ease), opacity var(--nx-motion-quick, 170ms) var(--nx-motion-settle-ease, ease)'
    : undefined

  // ── Base container style ──
  const baseSurfaceStyle: CSSProperties = {
    position: hasExplicitSize ? 'relative' : 'absolute',
    inset: hasExplicitSize ? undefined : 0,
    width: formatSize(width, '100%'),
    height: formatSize(height, '100%'),
    borderRadius: `${config.borderRadius}px`,
    overflow: 'hidden',
    pointerEvents: interactive ? 'auto' : 'none',
    transform: interactiveTransform,
    transition: interactiveTransition,
    ...style,
  }

  // ── SVG backdrop filter layer (ELEMENT variant only) ──
  // Surface variant skips SVG displacement entirely — it only refracts at
  // certain corners on large panels. Surface uses CSS-only glass layers instead.
  const svgRefractionStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background: 'transparent',
    backdropFilter: `url(#${filterId}) saturate(${config.saturation})`,
    WebkitBackdropFilter: `url(#${filterId}) saturate(${config.saturation})`,
    border: dark
      ? '1px solid rgba(255,255,255,0.2)'
      : '1px solid rgba(255,255,255,0.3)',
    boxShadow: dark
      ? 'inset 0 1px 0 0 rgba(255,255,255,0.2), inset 0 -1px 0 0 rgba(255,255,255,0.1)'
      : 'inset 0 1px 0 0 rgba(255,255,255,0.42), inset 0 -1px 0 0 rgba(255,255,255,0.2)',
  }

  // ── Fallback (no SVG support) ──
  const fallbackStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.22)',
    backdropFilter: `blur(${lowPower ? 8 : 12}px) saturate(${Math.max(1, config.saturation * 1.35)}) brightness(${dark ? 1.15 : 1.05})`,
    WebkitBackdropFilter: `blur(${lowPower ? 8 : 12}px) saturate(${Math.max(1, config.saturation * 1.35)}) brightness(${dark ? 1.15 : 1.05})`,
  }

  // ═══════════════════════════════════════════════════════════
  //  iOS Liquid Glass Layers
  // ═══════════════════════════════════════════════════════════

  // 1. Specular highlight — bright line at top edge (iOS signature)
  const specularHighlightIntensity = isSurfaceVariant ? 0.45 : 0.35
  const specularHighlightStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: isSurfaceVariant ? '1px' : '2px',
    borderRadius: `${config.borderRadius}px ${config.borderRadius}px 0 0`,
    background: dark
      ? `linear-gradient(90deg, transparent 5%, rgba(255,255,255,${specularHighlightIntensity}) 20%, rgba(255,255,255,${specularHighlightIntensity * 1.6}) 50%, rgba(255,255,255,${specularHighlightIntensity}) 80%, transparent 95%)`
      : `linear-gradient(90deg, transparent 5%, rgba(255,255,255,${specularHighlightIntensity * 1.8}) 20%, rgba(255,255,255,${specularHighlightIntensity * 2.5}) 50%, rgba(255,255,255,${specularHighlightIntensity * 1.8}) 80%, transparent 95%)`,
    pointerEvents: 'none',
    zIndex: 4,
  }

  // 2. Inner light gradient — creates depth / curvature illusion
  const innerLightOpacity = isSurfaceVariant ? 0.09 : 0.08
  const innerLightStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background: dark
      ? `linear-gradient(180deg, rgba(255,255,255,${innerLightOpacity * 1.5}) 0%, transparent 40%, transparent 70%, rgba(0,0,0,${innerLightOpacity * 0.8}) 100%)`
      : `linear-gradient(180deg, rgba(255,255,255,${innerLightOpacity * 3}) 0%, transparent 35%, transparent 75%, rgba(0,0,0,${innerLightOpacity * 0.3}) 100%)`,
    pointerEvents: 'none',
    zIndex: 3,
  }

  // 3. Edge refraction glow — glass border visible on ALL four sides
  const edgeGlowOpacity = isSurfaceVariant ? 0.28 : 0.18
  const edgeGlowStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    border: dark
      ? `1px solid rgba(255,255,255,${edgeGlowOpacity * 1.5})`
      : `1px solid rgba(255,255,255,${edgeGlowOpacity * 3})`,
    boxShadow: dark
      ? [
        `inset 0 0 0 1px rgba(255,255,255,${edgeGlowOpacity * 0.7})`,
        `inset 0 1px 0 0 rgba(255,255,255,${edgeGlowOpacity * 2})`,
        `inset 0 -1px 0 0 rgba(255,255,255,${edgeGlowOpacity * 1.2})`,
        `inset 1px 0 0 0 rgba(255,255,255,${edgeGlowOpacity * 0.8})`,
        `inset -1px 0 0 0 rgba(255,255,255,${edgeGlowOpacity * 0.8})`,
      ].join(', ')
      : [
        `inset 0 0 0 1px rgba(255,255,255,${edgeGlowOpacity * 2})`,
        `inset 0 1px 0 0 rgba(255,255,255,${edgeGlowOpacity * 4})`,
        `inset 0 -1px 0 0 rgba(255,255,255,${edgeGlowOpacity * 2})`,
        `inset 1px 0 0 0 rgba(255,255,255,${edgeGlowOpacity * 1.5})`,
        `inset -1px 0 0 0 rgba(255,255,255,${edgeGlowOpacity * 1.5})`,
      ].join(', '),
    pointerEvents: 'none',
    zIndex: 5,
  }

  // 4. iOS-style outer shadow glow (Removed for Element so it matches native buttons)
  const outerShadowStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    boxShadow: 'none',
    pointerEvents: 'none',
    zIndex: 0,
  }

  // 5. Bottom specular — bottom-edge reflection (iOS bounce light)
  const bottomSpecularStyle: CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: '8%',
    right: '8%',
    height: '1px',
    background: dark
      ? `linear-gradient(90deg, transparent, rgba(255,255,255,${isSurfaceVariant ? 0.22 : 0.1}), transparent)`
      : `linear-gradient(90deg, transparent, rgba(255,255,255,${isSurfaceVariant ? 0.35 : 0.25}), transparent)`,
    pointerEvents: 'none',
    zIndex: 4,
  }

  // 6. Tinted glass fill — the actual glass body color
  const glassFillOpacity = isSurfaceVariant ? 0.02 : 0.06
  const glassFillStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background: dark
      ? `linear-gradient(145deg, rgba(255,255,255,${glassFillOpacity * 1.3}) 0%, rgba(255,255,255,${glassFillOpacity * 0.5}) 50%, rgba(255,255,255,${glassFillOpacity * 0.8}) 100%)`
      : `linear-gradient(145deg, rgba(255,255,255,${glassFillOpacity * 4}) 0%, rgba(255,255,255,${glassFillOpacity * 2}) 50%, rgba(255,255,255,${glassFillOpacity * 3}) 100%)`,
    pointerEvents: 'none',
    zIndex: 2,
  }

  // Interactive hover glow (only for element variant)
  const hoverGlowStyle: CSSProperties = interactive && dynamicEnabled && isHovered ? {
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background: dark
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(255,255,255,0.12)',
    pointerEvents: 'none',
    zIndex: 6,
    transition: 'opacity 150ms ease',
  } : { display: 'none' }

  // SVG filter: only for element variant (buttons). Surface variant uses CSS-only.
  const useSvgFilter =
    svgSupported &&
    !lowPower &&
    !isSurfaceVariant &&
    renderDecision.shader &&
    renderDecision.animationComplexity !== 'minimal' &&
    renderDecision.motionCapability !== 'critical-only'

  return (
    <div
      ref={containerRef}
      className={className}
      data-nx-surface-id={renderDecision.id}
      data-nx-surface-mode={renderDecision.mode}
      data-nx-surface-motion={renderDecision.motionCapability}
      style={baseSurfaceStyle}
      aria-hidden={!interactive}
      onMouseEnter={interactive ? () => setIsHovered(true) : undefined}
      onMouseLeave={interactive ? () => { setIsHovered(false); setIsPressed(false) } : undefined}
      onMouseDown={interactive ? () => setIsPressed(true) : undefined}
      onMouseUp={interactive ? () => setIsPressed(false) : undefined}
    >
      {/* Hidden SVG filter definitions */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
            <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />

            <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
            <feColorMatrix
              in="dispRed"
              type="matrix"
              values="1 0 0 0 0
                      0 0 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="red"
            />

            <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
            <feColorMatrix
              in="dispGreen"
              type="matrix"
              values="0 0 0 0 0
                      0 1 0 0 0
                      0 0 0 0 0
                      0 0 0 1 0"
              result="green"
            />

            <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
            <feColorMatrix
              in="dispBlue"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="blue"
            />

            <feBlend in="red" in2="green" mode="screen" result="rg" />
            <feBlend in="rg" in2="blue" mode="screen" result="output" />
            <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
          </filter>
        </defs>
      </svg>

      {/* Layer 0: Outer shadow (element variant only) */}
      <div style={outerShadowStyle} />

      {/* Layer 1: SVG refraction backdrop OR fallback blur */}
      {useSvgFilter && <div style={svgRefractionStyle} />}
      {!useSvgFilter ? <div style={fallbackStyle} /> : null}

      {/* Layer 2: Glass body fill */}
      <div style={glassFillStyle} />

      {/* Layer 3: Inner light gradient (depth) */}
      <div style={innerLightStyle} />

      {/* Layer 4: Specular highlight (top edge) */}
      <div style={specularHighlightStyle} />

      {/* Layer 4b: Bottom specular (element only) */}
      <div style={bottomSpecularStyle} />

      {/* Layer 5: Edge refraction glow (border) */}
      <div style={edgeGlowStyle} />

      {/* Layer 6: Hover glow (interactive only) */}
      <div style={hoverGlowStyle} />
    </div>
  )
}

export default LiquidGlassSurface
