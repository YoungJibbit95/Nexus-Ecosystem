import type { CSSProperties } from 'react'
import { GlowConfig, GradientConfig, BlurConfig, BackgroundConfig, GlassmorphismConfig, AnimationsConfig, BgMode, Theme } from '../store/themeStore'
import { hexToRgb } from './utils'

type ReactCSS = CSSProperties

// ═══════════════════════════════════════════════════════════════
// GLOW UTILITIES
// ═══════════════════════════════════════════════════════════════

export function getGlowStyles(glow: GlowConfig, active: boolean = false): string {
  if (glow.mode === 'off') return 'none'

  const rgb = hexToRgb(glow.color)
  const intensity = active ? glow.intensity * 1.5 : glow.intensity
  const radius = active ? glow.radius * 1.2 : glow.radius

  // Gradient glow: combine two colors
  if (glow.gradientGlow) {
    const rgb2 = hexToRgb(glow.gradientColor2)
    const layers = [
      `0 0 ${radius}px rgba(${rgb}, ${intensity * 0.6})`,
      `0 0 ${radius * 0.6}px rgba(${rgb2}, ${intensity * 0.5})`,
      `0 0 ${radius * 0.3}px rgba(${rgb}, ${intensity * 0.4})`,
      `inset 0 0 ${radius * 0.25}px rgba(${rgb}, ${intensity * 0.15})`,
    ]
    return layers.join(', ')
  }

  switch (glow.mode) {
    case 'ambient':
      return `0 0 ${radius}px rgba(${rgb}, ${intensity * 0.4})`

    case 'outline':
      return [
        `0 0 ${radius}px rgba(${rgb}, ${intensity * 0.6})`,
        `0 0 ${radius * 0.5}px rgba(${rgb}, ${intensity * 0.8})`,
        `inset 0 0 ${radius * 0.3}px rgba(${rgb}, ${intensity * 0.2})`,
      ].join(', ')

    case 'focus':
      if (!active) return 'none'
      return [
        `0 0 ${radius}px rgba(${rgb}, ${intensity})`,
        `0 0 ${radius * 2}px rgba(${rgb}, ${intensity * 0.4})`,
      ].join(', ')

    case 'gradient':
      const rgb2 = hexToRgb(glow.gradientColor2)
      return [
        `0 0 ${radius}px rgba(${rgb}, ${intensity * 0.7})`,
        `0 0 ${radius * 0.7}px rgba(${rgb2}, ${intensity * 0.5})`,
        `0 0 ${radius * 1.5}px rgba(${rgb}, ${intensity * 0.3})`,
      ].join(', ')

    case 'pulse':
      return [
        `0 0 ${radius}px rgba(${rgb}, ${intensity * 0.7})`,
        `0 0 ${radius * 0.5}px rgba(${rgb}, ${intensity})`,
      ].join(', ')

    default:
      return 'none'
  }
}

export function getGlowBlendMode(mode: string): string {
  switch (mode) {
    case 'screen': return 'screen'
    case 'multiply': return 'multiply'
    case 'overlay': return 'overlay'
    default: return 'normal'
  }
}

// ═══════════════════════════════════════════════════════════════
// GRADIENT UTILITIES
// ═══════════════════════════════════════════════════════════════

export function buildGradient(gradient: GradientConfig): string {
  const stops = gradient.stops
    .map(s => `${s.color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')} ${s.position}%`)
    .join(', ')
  return `linear-gradient(${gradient.angle}deg, ${stops})`
}

export function getAnimatedGradient(gradient: GradientConfig): string {
  if (!gradient.animated) return buildGradient(gradient)
  return buildGradient(gradient)
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND UTILITIES
// ═══════════════════════════════════════════════════════════════

export function buildBackground(bg: BackgroundConfig, solidColor: string, mode: 'dark' | 'light'): ReactCSS {
  switch (bg.mode) {
    case 'solid':
      return { background: solidColor }

    case 'gradient': {
      const stops = bg.stops
        .map(s => `${s.color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')} ${s.position}%`)
        .join(', ')
      return { background: `linear-gradient(${bg.angle}deg, ${stops})` }
    }

    case 'animated-gradient': {
      const stops = bg.stops
        .map(s => `${s.color}${Math.round(s.opacity * 255).toString(16).padStart(2, '0')} ${s.position}%`)
        .join(', ')
      return {
        background: solidColor,
        backgroundImage: `linear-gradient(${bg.angle}deg, ${stops})`,
        backgroundSize: '200% 200%',
        animation: `nexus-gradient-shift ${bg.animationSpeed * 3}s ease infinite`,
      }
    }

    case 'mesh': {
      const c1 = bg.stops[0]?.color || '#007AFF'
      const c2 = bg.stops[1]?.color || '#5E5CE6'
      const intensity = bg.meshIntensity
      return {
        background: solidColor,
        backgroundImage: [
          `radial-gradient(ellipse 80% 80% at 20% 20%, ${c1}${Math.round(intensity * 30).toString(16).padStart(2, '0')}, transparent)`,
          `radial-gradient(ellipse 60% 60% at 80% 80%, ${c2}${Math.round(intensity * 25).toString(16).padStart(2, '0')}, transparent)`,
          `radial-gradient(ellipse 70% 50% at 50% 50%, ${mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'}, transparent)`,
        ].join(', '),
      }
    }

    case 'noise': {
      return {
        background: solidColor,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${bg.noiseOpacity}'/%3E%3C/svg%3E")`,
      }
    }

    case 'aurora': {
      const c1 = bg.stops[0]?.color || '#BF5AF2'
      const c2 = bg.stops[1]?.color || '#007AFF'
      const c3 = bg.stops[2]?.color || '#64D2FF'
      const o1 = bg.stops[0]?.opacity ?? 0.12
      const o2 = bg.stops[1]?.opacity ?? 0.08
      const o3 = bg.stops[2]?.opacity ?? 0.1
      return {
        background: solidColor,
        backgroundImage: [
          `radial-gradient(ellipse 100% 60% at 10% 40%, ${c1}${Math.round(o1 * 255).toString(16).padStart(2, '0')}, transparent 60%)`,
          `radial-gradient(ellipse 80% 70% at 90% 20%, ${c2}${Math.round(o2 * 255).toString(16).padStart(2, '0')}, transparent 60%)`,
          `radial-gradient(ellipse 90% 80% at 50% 90%, ${c3}${Math.round(o3 * 255).toString(16).padStart(2, '0')}, transparent 60%)`,
        ].join(', '),
        backgroundSize: bg.animated ? '200% 200%' : '100% 100%',
        animation: bg.animated ? `nexus-aurora-shift ${bg.animationSpeed * 4}s ease-in-out infinite alternate` : undefined,
      }
    }

    default:
      return { background: solidColor }
  }
}

// ═══════════════════════════════════════════════════════════════
// GLASSMORPHISM UTILITIES
// ═══════════════════════════════════════════════════════════════

export function getGlassmorphismStyles(
  glass: GlassmorphismConfig,
  glow: GlowConfig,
  mode: 'dark' | 'light',
  showGlow: boolean
): ReactCSS {
  const rgb = hexToRgb(glow.color)
  const rgb2 = hexToRgb(glass.tintColor)

  const base: ReactCSS = {
    backdropFilter: `blur(0px) saturate(${glass.saturation}%)`,
    WebkitBackdropFilter: `blur(0px) saturate(${glass.saturation}%)`,
  }

  if (glass.tintOpacity > 0) {
    base.backgroundColor = `rgba(${rgb2}, ${glass.tintOpacity})`
  }

  return base
}

export function getGlassBorderStyle(
  glass: GlassmorphismConfig,
  glow: GlowConfig,
  mode: 'dark' | 'light',
  showGlow: boolean
): ReactCSS {
  const rgb = hexToRgb(glow.color)
  const baseOpacity = glass.borderOpacity

  if (glass.borderGlow && showGlow) {
    const glowIntensity = glass.borderGlowIntensity
    return {
      border: `1px solid rgba(${rgb}, ${baseOpacity * 1.5})`,
      boxShadow: `inset 0 0 12px rgba(${rgb}, ${glowIntensity * 0.15}), inset 0 1px 0 rgba(${rgb}, ${glowIntensity * 0.3})`,
    }
  }

  return {
    border: `1px solid ${mode === 'dark' ? `rgba(255,255,255,${baseOpacity})` : `rgba(0,0,0,${baseOpacity * 0.7})`}`,
  }
}

// ═══════════════════════════════════════════════════════════════
// BLUR UTILITIES
// ═══════════════════════════════════════════════════════════════

// Standard Glow
export function getGlowStyle(t: Theme) {
  if (!t.glow) return {};
  const accentRgb = hexToRgb(t.glowColor1);
  return {
    boxShadow: `0 0 32px 0 rgba(${accentRgb},0.45)`
  };
}

// Gradient Outline Glow
export function getGradientGlowOutlineStyle(t: Theme) {
  // Verwendet die im Settings-Menü einstellbaren Farben und Intensitäten
  const color1 = hexToRgb(t.glow.gradientColor1);
  const color2 = hexToRgb(t.glow.gradientColor2);
  const strength = (t.glow.spread || 4) * 2;
  const intensity = t.glow.intensity;
  // Zwei box-shadows nach links und rechts verschieben, damit sie nicht übereinander liegen
  return {
    boxShadow:
      `-${strength}px 0 ${strength * 1.5}px 0 rgba(${color1}, ${intensity * 0.8}), ${strength}px 0 ${strength * 1.5}px 0 rgba(${color2}, ${intensity * 0.8})`
  };
}

export function getNoiseOverlay(blur: BlurConfig): ReactCSS | null {
  if (!blur.noiseOverlay) return null

  return {
    position: 'absolute',
    inset: 0,
    opacity: blur.noiseOpacity,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
    borderRadius: 'inherit',
  }
}

// ═══════════════════════════════════════════════════════════════
// SHADOW UTILITIES
// ═══════════════════════════════════════════════════════════════

export function getShadowStyles(depth: number, mode: 'dark' | 'light'): string {
  const opacity = mode === 'dark' ? depth : depth * 0.5
  return [
    `0 ${depth * 4}px ${depth * 16}px rgba(0,0,0,${opacity * 0.6})`,
    `0 ${depth * 2}px ${depth * 8}px rgba(0,0,0,${opacity * 0.4})`,
  ].join(', ')
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION UTILITIES
// ═══════════════════════════════════════════════════════════════

export function getEntryAnimation(animations: AnimationsConfig, delay = 0): React.CSSProperties {
  if (!animations.entryAnimations) return {}
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return {}
  return {
    animation: `nexus-fade-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
  }
}

export function getRippleStyle(animations: AnimationsConfig): boolean {
  return animations.rippleClick
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE UTILITIES
// ═══════════════════════════════════════════════════════════════

export function shouldReduceMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getTransitionSpeed(speed: number): string {
  if (shouldReduceMotion()) return '0ms'
  return `${300 * speed}ms`
}
