import type { CSSProperties } from 'react'
import { GlowConfig, GradientConfig, BlurConfig, BackgroundConfig, GlassmorphismConfig, AnimationsConfig, BgMode, Theme, PanelBgMode } from '../store/themeStore'
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

    case 'spotlight': {
      const c1 = bg.stops[0]?.color || '#007AFF'
      const c2 = bg.stops[1]?.color || '#5E5CE6'
      const intensity = Math.max(0.08, Math.min(0.5, bg.meshIntensity))
      return {
        background: solidColor,
        backgroundImage: [
          `radial-gradient(720px circle at 18% 16%, ${c1}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, transparent 62%)`,
          `radial-gradient(620px circle at 84% 22%, ${c2}${Math.round(intensity * 210).toString(16).padStart(2, '0')}, transparent 60%)`,
          `linear-gradient(180deg, ${mode === 'dark' ? 'rgba(3,7,18,0.12)' : 'rgba(255,255,255,0.34)'}, transparent 55%)`,
        ].join(', '),
      }
    }

    case 'prism': {
      const c1 = bg.stops[0]?.color || '#007AFF'
      const c2 = bg.stops[1]?.color || '#5E5CE6'
      const c3 = bg.stops[2]?.color || '#22D3EE'
      return {
        background: solidColor,
        backgroundImage: [
          `conic-gradient(from ${bg.angle}deg at 50% 50%, ${c1}24, ${c2}20, ${c3}18, ${c1}24)`,
          `radial-gradient(circle at 50% 120%, ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}, transparent 44%)`,
        ].join(', '),
        backgroundSize: bg.animated ? '180% 180%' : '100% 100%',
        animation: bg.animated ? `nexus-gradient-shift ${bg.animationSpeed * 5}s ease infinite` : undefined,
      }
    }

    case 'horizon': {
      const c1 = bg.stops[0]?.color || '#007AFF'
      const c2 = bg.stops[1]?.color || '#5E5CE6'
      return {
        background: solidColor,
        backgroundImage: [
          `linear-gradient(180deg, transparent 0%, ${c1}18 48%, ${c2}22 100%)`,
          `radial-gradient(900px ellipse at 50% 105%, ${c2}2f, transparent 68%)`,
        ].join(', '),
      }
    }

    case 'constellation': {
      const c1 = bg.stops[0]?.color || '#64D2FF'
      const c2 = bg.stops[1]?.color || '#BF5AF2'
      return {
        background: solidColor,
        backgroundImage: [
          `radial-gradient(circle at 12% 22%, ${c1}8a 1px, transparent 2px)`,
          `radial-gradient(circle at 74% 18%, ${c2}78 1px, transparent 2px)`,
          `radial-gradient(circle at 38% 66%, ${c1}70 1px, transparent 2px)`,
          `radial-gradient(circle at 88% 72%, ${c2}66 1px, transparent 2px)`,
          `linear-gradient(115deg, transparent 0 48%, ${c1}16 49%, transparent 50% 100%)`,
        ].join(', '),
        backgroundSize: '220px 180px, 260px 210px, 240px 200px, 300px 260px, 360px 280px',
      }
    }

    default:
      return { background: solidColor }
  }
}

// ═══════════════════════════════════════════════════════════════
// GLASSMORPHISM UTILITIES
// ═══════════════════════════════════════════════════════════════

export type PanelSurfaceTokens = {
  background: string
  backgroundSize?: string
  backgroundBlendMode?: string
}

export type AppShellSurfaceTokens = {
  rootBackgroundColor: string
  auraBackground: string
  auraOpacity: number
  gridBackground: string
  gridOpacity: number
  windowBackground: string
  windowAuraBackground: string
  windowGridBackground: string
  windowGridOpacity: number
}

const colorWithOpacity = (color: string, opacity: number) =>
  `${color}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`

export function buildPanelSurfaceTokens(input: {
  mode: PanelBgMode
  accent: string
  accent2?: string
  appBg?: string
  colorMode: 'dark' | 'light'
}): PanelSurfaceTokens {
  const accentRgb = hexToRgb(input.accent)
  const accent2Rgb = hexToRgb(input.accent2 || input.accent)
  const isDark = input.colorMode === 'dark'
  const base = isDark
    ? 'linear-gradient(145deg, rgba(8,13,28,0.84), rgba(4,7,18,0.76))'
    : 'linear-gradient(145deg, rgba(255,255,255,0.94), rgba(240,244,253,0.88))'
  const tint = `radial-gradient(520px circle at 10% -8%, rgba(${accentRgb},${isDark ? 0.16 : 0.1}), transparent 60%), radial-gradient(460px circle at 100% 0%, rgba(${accent2Rgb},${isDark ? 0.12 : 0.08}), transparent 64%)`
  const glassSheen = isDark
    ? 'linear-gradient(150deg, rgba(255,255,255,0.085), rgba(255,255,255,0.024))'
    : 'linear-gradient(150deg, rgba(255,255,255,0.76), rgba(255,255,255,0.42))'

  switch (input.mode) {
    case 'solid':
      return {
        background: `${tint}, ${base}`,
        backgroundSize: '100% 100%, 100% 100%, 100% 100%',
      }
    case 'gradient':
      return {
        background: `linear-gradient(135deg, rgba(${accentRgb},${isDark ? 0.22 : 0.13}), rgba(${accent2Rgb},${isDark ? 0.16 : 0.1}) 48%, transparent 78%), ${glassSheen}, ${base}`,
        backgroundSize: '100% 100%',
      }
    case 'mist':
      return {
        background: `radial-gradient(700px ellipse at 18% 10%, rgba(${accentRgb},${isDark ? 0.22 : 0.14}), transparent 62%), radial-gradient(620px ellipse at 82% 92%, rgba(${accent2Rgb},${isDark ? 0.16 : 0.1}), transparent 68%), ${glassSheen}, ${base}`,
      }
    case 'hologram':
      return {
        background: `conic-gradient(from 142deg at 82% 16%, rgba(${accentRgb},0.2), transparent 20%, rgba(${accent2Rgb},0.16), transparent 58%, rgba(255,255,255,${isDark ? 0.09 : 0.34}), transparent), linear-gradient(135deg, rgba(${accentRgb},0.1), transparent 58%), ${base}`,
        backgroundSize: '180% 180%, 100% 100%, 100% 100%',
        backgroundBlendMode: isDark ? 'screen, normal, normal' : 'multiply, normal, normal',
      }
    case 'linen':
      return {
        background: `repeating-linear-gradient(0deg, rgba(255,255,255,${isDark ? 0.028 : 0.38}) 0 1px, transparent 1px 7px), repeating-linear-gradient(90deg, rgba(${accentRgb},${isDark ? 0.028 : 0.06}) 0 1px, transparent 1px 9px), ${glassSheen}, ${base}`,
        backgroundSize: '16px 16px, 22px 22px, 100% 100%, 100% 100%',
      }
    case 'dots':
      return {
        background: `radial-gradient(circle, rgba(${accentRgb},${isDark ? 0.22 : 0.15}) 0 1px, transparent 1.6px), ${tint}, ${base}`,
        backgroundSize: '22px 22px, 100% 100%, 100% 100%',
      }
    case 'grid':
      return {
        background: `linear-gradient(rgba(${accentRgb},${isDark ? 0.12 : 0.08}) 1px, transparent 1px), linear-gradient(90deg, rgba(${accent2Rgb},${isDark ? 0.1 : 0.07}) 1px, transparent 1px), ${tint}, ${base}`,
        backgroundSize: '28px 28px, 28px 28px, 100% 100%, 100% 100%',
      }
    case 'stripes':
      return {
        background: `repeating-linear-gradient(135deg, rgba(${accentRgb},${isDark ? 0.095 : 0.06}) 0 1px, transparent 1px 15px), linear-gradient(145deg, rgba(${accent2Rgb},${isDark ? 0.08 : 0.05}), transparent 60%), ${base}`,
        backgroundSize: '30px 30px, 100% 100%, 100% 100%',
      }
    case 'noise':
      return {
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.58' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.024'/%3E%3C/svg%3E"), ${tint}, ${base}`,
        backgroundSize: '220px 220px, 100% 100%, 100% 100%',
        backgroundBlendMode: isDark ? 'screen, normal, normal' : 'multiply, normal, normal',
      }
    case 'carbon':
      return {
        background: `repeating-linear-gradient(45deg, rgba(${accentRgb},0.075) 0 1px, transparent 1px 10px), repeating-linear-gradient(-45deg, rgba(${accent2Rgb},0.055) 0 1px, transparent 1px 10px), ${glassSheen}, ${base}`,
        backgroundSize: '18px 18px, 18px 18px, 100% 100%, 100% 100%',
      }
    case 'circuit':
      return {
        background: `linear-gradient(rgba(${accentRgb},0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(${accent2Rgb},0.09) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(${accentRgb},0.18) 0 1.5px, transparent 2px), ${base}`,
        backgroundSize: '34px 34px, 34px 34px, 68px 68px, 100% 100%',
      }
    case 'glass':
    default:
      return {
        background: `${tint}, ${glassSheen}, ${base}`,
        backgroundSize: '100% 100%',
      }
  }
}

export function buildAppShellSurfaceTokens(input: {
  background: BackgroundConfig
  accent: string
  accent2?: string
  appBg: string
  colorMode: 'dark' | 'light'
}): AppShellSurfaceTokens {
  const accentRgb = hexToRgb(input.accent)
  const accent2Rgb = hexToRgb(input.accent2 || input.accent)
  const isDark = input.colorMode === 'dark'
  const bg = input.background
  const visibility = Math.max(
    0.42,
    Math.min(1, 0.5 + (Number(bg.overlayOpacity) || 0) * 0.42 + (Number(bg.meshIntensity) || 0.3) * 0.14),
  )
  const tone = (dark: number, light: number) => (isDark ? dark : light) * visibility
  const stopA = bg.stops[0]?.color || input.accent
  const stopB = bg.stops[1]?.color || input.accent2 || input.accent
  const stopC = bg.stops[2]?.color || (isDark ? '#22D3EE' : '#2563EB')
  const rootBackgroundColor = input.appBg
  const defaultAura = isDark
    ? 'radial-gradient(circle at 20% 8%, rgba(34, 211, 238, 0.18), transparent 34%), radial-gradient(circle at 84% 4%, rgba(129, 140, 248, 0.2), transparent 36%), radial-gradient(circle at 54% 92%, rgba(16, 185, 129, 0.1), transparent 42%), linear-gradient(180deg, rgba(8, 9, 26, 0.28), rgba(8, 9, 26, 0.66))'
    : 'radial-gradient(circle at 20% 8%, rgba(34, 211, 238, 0.16), transparent 34%), radial-gradient(circle at 84% 4%, rgba(129, 140, 248, 0.14), transparent 36%), radial-gradient(circle at 54% 92%, rgba(16, 185, 129, 0.08), transparent 42%), linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(245, 248, 255, 0.5))'
  const defaultGrid = isDark
    ? 'linear-gradient(rgba(129, 140, 248, 0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.08) 1px, transparent 1px)'
    : 'linear-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37, 99, 235, 0.055) 1px, transparent 1px)'
  const defaultWindow = isDark
    ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.72), rgba(8, 13, 32, 0.54)), radial-gradient(circle at top left, rgba(34, 211, 238, 0.08), transparent 42%), radial-gradient(circle at bottom right, rgba(129, 140, 248, 0.08), transparent 42%)'
    : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(244, 247, 255, 0.76)), radial-gradient(circle at top left, rgba(34, 211, 238, 0.11), transparent 42%), radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.08), transparent 42%)'
  const defaultWindowAura = isDark
    ? 'linear-gradient(180deg, rgba(255,255,255,0.1), transparent 18%), radial-gradient(640px circle at -6% -20%, rgba(34, 211, 238, 0.2), transparent 52%), radial-gradient(780px circle at 120% -30%, rgba(167, 139, 250, 0.18), transparent 60%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.72), transparent 22%), radial-gradient(640px circle at -6% -20%, rgba(34, 211, 238, 0.13), transparent 52%), radial-gradient(780px circle at 120% -30%, rgba(99, 102, 241, 0.11), transparent 60%)'
  const defaultWindowGrid = isDark
    ? 'linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px)'
    : 'linear-gradient(rgba(15, 23, 42, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px)'

  const base: AppShellSurfaceTokens = {
    rootBackgroundColor,
    auraBackground: defaultAura,
    auraOpacity: isDark ? 0.74 : 0.62,
    gridBackground: defaultGrid,
    gridOpacity: isDark ? 0.045 : 0.035,
    windowBackground: defaultWindow,
    windowAuraBackground: defaultWindowAura,
    windowGridBackground: defaultWindowGrid,
    windowGridOpacity: isDark ? 0.055 : 0.04,
  }

  switch (bg.mode) {
    case 'gradient':
    case 'animated-gradient':
      return {
        ...base,
        auraBackground: `radial-gradient(740px circle at 10% 6%, ${colorWithOpacity(stopA, tone(0.42, 0.24))}, transparent 58%), radial-gradient(780px circle at 92% 4%, ${colorWithOpacity(stopB, tone(0.36, 0.2))}, transparent 60%), linear-gradient(${bg.angle}deg, ${colorWithOpacity(stopA, tone(0.24, 0.16))}, ${colorWithOpacity(stopB, tone(0.2, 0.14))}, transparent 72%)`,
        auraOpacity: bg.mode === 'animated-gradient' ? 0.88 : 0.78,
        windowBackground: `linear-gradient(145deg, ${isDark ? 'rgba(5, 9, 22, 0.54)' : 'rgba(255, 255, 255, 0.76)'}, ${isDark ? 'rgba(10, 14, 34, 0.4)' : 'rgba(246, 249, 255, 0.62)'}), radial-gradient(circle at 0% 0%, ${colorWithOpacity(stopA, tone(0.28, 0.17))}, transparent 48%), radial-gradient(circle at 100% 0%, ${colorWithOpacity(stopB, tone(0.24, 0.13))}, transparent 48%)`,
      }
    case 'mesh':
      return {
        ...base,
        auraBackground: `radial-gradient(620px ellipse at 15% 20%, ${colorWithOpacity(stopA, tone(0.5, 0.28))}, transparent 62%), radial-gradient(520px ellipse at 78% 28%, ${colorWithOpacity(stopB, tone(0.4, 0.22))}, transparent 60%), radial-gradient(560px ellipse at 52% 88%, rgba(${accentRgb},${tone(0.26, 0.16)}), transparent 65%)`,
        auraOpacity: Math.max(0.68, Math.min(0.95, 0.56 + bg.meshIntensity * 0.5)),
        windowAuraBackground: `radial-gradient(720px circle at 0% -10%, ${colorWithOpacity(stopA, tone(0.34, 0.2))}, transparent 58%), radial-gradient(700px circle at 108% -12%, ${colorWithOpacity(stopB, tone(0.28, 0.16))}, transparent 60%)`,
      }
    case 'noise':
      return {
        ...base,
        auraBackground: `${defaultAura}, url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.52' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
        auraOpacity: 0.5,
        gridOpacity: 0.012,
        windowGridOpacity: 0.012,
      }
    case 'aurora':
      return {
        ...base,
        auraBackground: `radial-gradient(900px ellipse at 0% 34%, ${colorWithOpacity(stopA, tone(0.52, 0.28))}, transparent 66%), radial-gradient(820px ellipse at 96% 12%, ${colorWithOpacity(stopB, tone(0.42, 0.22))}, transparent 62%), radial-gradient(760px ellipse at 48% 108%, ${colorWithOpacity(stopC, tone(0.32, 0.18))}, transparent 68%)`,
        auraOpacity: 0.92,
        windowAuraBackground: `linear-gradient(180deg, rgba(255,255,255,${isDark ? 0.08 : 0.58}), transparent 20%), radial-gradient(660px circle at 8% -18%, ${colorWithOpacity(stopA, tone(0.32, 0.18))}, transparent 58%), radial-gradient(660px circle at 96% -12%, ${colorWithOpacity(stopB, tone(0.26, 0.15))}, transparent 62%)`,
      }
    case 'spotlight':
      return {
        ...base,
        auraBackground: `radial-gradient(820px circle at 18% 16%, rgba(${accentRgb},${tone(0.46, 0.26)}), transparent 62%), radial-gradient(720px circle at 82% 18%, rgba(${accent2Rgb},${tone(0.34, 0.2)}), transparent 60%), linear-gradient(180deg, rgba(255,255,255,${isDark ? 0.02 : 0.2}), transparent 70%)`,
        auraOpacity: 0.86,
      }
    case 'prism':
      return {
        ...base,
        auraBackground: `conic-gradient(from ${bg.angle}deg at 50% 46%, ${colorWithOpacity(stopA, tone(0.4, 0.24))}, ${colorWithOpacity(stopB, tone(0.34, 0.2))}, ${colorWithOpacity(stopC, tone(0.28, 0.16))}, ${colorWithOpacity(stopA, tone(0.4, 0.24))}), radial-gradient(circle at 50% 50%, transparent 24%, rgba(0,0,0,${isDark ? 0.16 : 0.025}) 74%)`,
        auraOpacity: 0.76,
        gridOpacity: 0.018,
        windowGridOpacity: 0.018,
      }
    case 'horizon':
      return {
        ...base,
        auraBackground: `linear-gradient(180deg, transparent 0 28%, ${colorWithOpacity(stopA, 0.16)} 55%, ${colorWithOpacity(stopB, 0.24)} 100%), radial-gradient(980px ellipse at 50% 108%, ${colorWithOpacity(stopB, 0.3)}, transparent 68%)`,
        auraOpacity: 0.7,
        windowAuraBackground: `linear-gradient(180deg, rgba(255,255,255,${isDark ? 0.06 : 0.5}), transparent 28%), radial-gradient(900px ellipse at 50% 110%, ${colorWithOpacity(stopB, isDark ? 0.2 : 0.12)}, transparent 66%)`,
      }
    case 'constellation':
      return {
        ...base,
        auraBackground: `radial-gradient(circle at 12% 22%, ${colorWithOpacity(stopA, 0.7)} 1px, transparent 2px), radial-gradient(circle at 74% 18%, ${colorWithOpacity(stopB, 0.58)} 1px, transparent 2px), radial-gradient(circle at 38% 66%, ${colorWithOpacity(stopA, 0.5)} 1px, transparent 2px), radial-gradient(circle at 88% 72%, ${colorWithOpacity(stopB, 0.5)} 1px, transparent 2px), ${defaultAura}`,
        gridBackground: `linear-gradient(115deg, transparent 0 48%, ${colorWithOpacity(stopA, 0.12)} 49%, transparent 50% 100%), ${defaultGrid}`,
        gridOpacity: 0.08,
        windowGridOpacity: 0.045,
      }
    case 'solid':
    default:
      return base
  }
}

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
  const normalized = Math.min(Math.max(Number.isFinite(speed) ? speed : 1, 0.1), 3)
  return `${Math.round(300 / normalized)}ms`
}
