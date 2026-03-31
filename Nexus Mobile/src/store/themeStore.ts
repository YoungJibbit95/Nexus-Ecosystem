import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { pickReadableText } from '../lib/utils'

export type GlowMode = 'ambient' | 'outline' | 'focus' | 'gradient' | 'pulse' | 'off'
export type BlendMode = 'normal' | 'screen' | 'multiply' | 'overlay'
export type BgMode = 'solid' | 'gradient' | 'animated-gradient' | 'mesh' | 'noise' | 'aurora'
export type PanelBgMode = 'glass' | 'solid' | 'gradient' | 'noise' | 'dots' | 'grid' | 'carbon' | 'circuit'

export interface GlowConfig {
  mode: GlowMode
  color: string
  intensity: number
  radius: number
  spread: number
  blendMode: BlendMode
  gradientGlow: boolean
  gradientColor1: string
  gradientColor2: string
  gradientAngle: number
  animated: boolean
  animationSpeed: number
}

export interface GradientStop {
  color: string
  position: number
  opacity: number
}

export interface GradientConfig {
  angle: number
  stops: GradientStop[]
  animated: boolean
  animationSpeed: number
}

export interface BackgroundConfig {
  mode: BgMode
  stops: GradientStop[]
  angle: number
  animated: boolean
  animationSpeed: number
  noiseOpacity: number
  meshIntensity: number
  // New
  overlayOpacity: number
  vignette: boolean
  vignetteStrength: number
  scanlines: boolean
  panelBgMode: PanelBgMode
}

export interface BlurConfig {
  strength: number
  noiseOverlay: boolean
  noiseOpacity: number
  sidebarBlur: number
  panelBlur: number
  modalBlur: number
}

export interface GlassmorphismConfig {
  borderOpacity: number
  borderGlow: boolean
  borderGlowIntensity: number
  saturation: number
  tintColor: string
  tintOpacity: number
  frostedGlass: boolean
  chromaticAberration: boolean
  glowOutline: boolean
  glowColor1: string
  glowColor2: string
  glowOutlineStrength: number
  // New options
  glassMode: 'default' | 'frosted' | 'crystal' | 'neon' | 'matte' | 'mirror' | 'plasma'
  glassDepth: number
  innerShadow: boolean
  reflectionLine: boolean
  animatedBlur: boolean
  animatedBlurSpeed: number
  panelRenderer: 'blur' | 'fake-glass' | 'glass-shader'
  glowRenderer: 'css' | 'three'
}

export interface QOLConfig {
  reducedMotion: boolean
  highContrast: boolean
  showTooltips: boolean
  sidebarAutoHide: boolean
  fontSize: number
  panelDensity: 'comfortable' | 'compact' | 'spacious'
  quickActions: boolean
  autoAccentContrast?: boolean
}

export interface VisualConfig {
  borderThickness: number
  shadowDepth: number
  animationSpeed: number
  panelRadius: number
  compactMode: boolean
  spacingDensity: 'comfortable' | 'compact' | 'spacious'
}

export interface AnimationsConfig {
  fade: boolean
  scale: boolean
  slide: boolean
  spring: boolean
  smoothTransitions: boolean
  entryAnimations: boolean
  hoverLift: boolean
  pulseEffects: boolean
  rippleClick: boolean
  pageTransitions: boolean
  glowPulse: boolean
  particleEffects: boolean
  // New
  floatEffect: boolean
  borderFlow: boolean
  shakeOnError: boolean
  confettiOnComplete: boolean
  magneticButtons: boolean
  entranceStyle: 'fade' | 'slide' | 'scale' | 'bounce' | 'flip'
}

export interface EditorConfig {
  autosave: boolean
  autosaveInterval: number
  wordWrap: boolean
  lineNumbers: boolean
  minimap: boolean
  cursorAnimation: boolean
  tabSize: number
  fontSize: number
  fontFamily: string
}

export interface NotesConfig {
  fontSize: number
  fontFamily: string
  lineHeight: number
  mode: 'light' | 'dark'
}

export interface SemanticTokens {
  surface: string
  surfaceElevated: string
  textPrimary: string
  textMuted: string
  success: string
  warning: string
  danger: string
  accentText: string
}

export interface Theme {
  // ── Data ──
  mode: 'dark' | 'light'
  accent: string
  accent2: string
  bg: string
  globalFont: string
  sidebarWidth: number
  sidebarPosition: 'left' | 'right'
  sidebarStyle: 'default' | 'floating' | 'minimal' | 'rail' | 'hidden'
  sidebarLabels: boolean
  sidebarAccentBg: boolean
  toolbar: {
    toolbarMode: 'island' | 'spotlight' | 'full-width'
    position: 'top' | 'bottom'
    mode: 'pill' | 'full-width'
    height: number
    visible: boolean
  }
  setToolbar: (t: Partial<Theme['toolbar']>) => void

  notes: NotesConfig
  glow: GlowConfig
  gradient: GradientConfig
  background: BackgroundConfig
  blur: BlurConfig
  glassmorphism: GlassmorphismConfig
  visual: VisualConfig
  animations: AnimationsConfig
  editor: EditorConfig
  qol: QOLConfig
  tokens: SemanticTokens

  glowOutline: boolean
  glowColor1: string
  glowColor2: string
  glowOutlineStrength: number

  // ── Actions ──
  setMode: (m: 'dark' | 'light') => void
  setColors: (c: Partial<Pick<Theme, 'accent' | 'accent2' | 'bg'>>) => void
  setGlow: (g: Partial<GlowConfig>) => void
  setGradient: (g: Partial<GradientConfig>) => void
  setBackground: (b: Partial<BackgroundConfig>) => void
  setBlur: (b: Partial<BlurConfig>) => void
  setGlassmorphism: (g: Partial<GlassmorphismConfig>) => void
  setVisual: (v: Partial<VisualConfig>) => void
  setAnimations: (a: Partial<AnimationsConfig>) => void
  setEditor: (e: Partial<EditorConfig>) => void
  setNotes: (n: Partial<NotesConfig>) => void
  setQOL: (q: Partial<QOLConfig>) => void
  setGlobalFont: (f: string) => void
  setSidebarWidth: (w: number) => void
  setSidebarPosition: (p: 'left' | 'right') => void
  setSidebarStyle: (s: 'default' | 'floating' | 'minimal' | 'rail' | 'hidden') => void
  setSidebarLabels: (v: boolean) => void
  setSidebarAccentBg: (v: boolean) => void
  setSidebarAutoHide: (v: boolean) => void
  setTokens: (t: Partial<SemanticTokens>) => void
  preset: (n: string) => void
  // Background
  setBackgroundMode: (m: BgMode) => void
  setPanelBgMode: (m: PanelBgMode) => void
}

// ── Presets ──────────────────────────────────────────────────────────────────

const P: Record<string, Partial<Theme>> = {
  'macOS Dark': {
    mode: 'dark', accent: '#007AFF', accent2: '#5E5CE6', bg: '#1a1a2e',
    glow: { mode: 'outline', color: '#007AFF', intensity: 0.85, radius: 28, spread: 8, blendMode: 'screen', gradientGlow: true, gradientColor1: '#007AFF', gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 24, noiseOverlay: false, noiseOpacity: 0.035, sidebarBlur: 24, panelBlur: 20, modalBlur: 28 },
    glassmorphism: { borderOpacity: 0.18, borderGlow: true, borderGlowIntensity: 0.5, saturation: 200, tintColor: '#007AFF', tintOpacity: 0.04, frostedGlass: false, chromaticAberration: false, glowOutline: true, glowColor1: '#007AFF', glowColor2: '#5E5CE6', glowOutlineStrength: 14 , glassMode: 'default' as any, glassDepth: 0.5, innerShadow: false, reflectionLine: false, animatedBlur: false, animatedBlurSpeed: 3, panelRenderer: 'blur', glowRenderer: 'css' },
  },
  'Neon Ultra': {
    mode: 'dark', accent: '#00FFAA', accent2: '#FF00FF', bg: '#0a0a14',
    glow: { mode: 'outline', color: '#00FFAA', intensity: 0.9, radius: 28, spread: 8, blendMode: 'screen', gradientGlow: true, gradientColor1: '#00FFAA', gradientColor2: '#FF00FF', gradientAngle: 135, animated: true, animationSpeed: 1.5 },
    blur: { strength: 24, noiseOverlay: false, noiseOpacity: 0.06, sidebarBlur: 24, panelBlur: 20, modalBlur: 28 },
    background: { mode: 'animated-gradient', stops: [{ color: '#00FFAA', position: 0, opacity: 0.15  }, { color: '#FF00FF', position: 100, opacity: 0.15 }], angle: 135, animated: true, animationSpeed: 3, noiseOpacity: 0.04, meshIntensity: 0.5 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Ocean Wave': {
    mode: 'dark', accent: '#00AAFF', accent2: '#00DDCC', bg: '#0a1929',
    glow: { mode: 'ambient', color: '#00AAFF', intensity: 0.5, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: false, gradientColor1: '#00AAFF', gradientColor2: '#00DDCC', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 18, panelBlur: 16, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#0a1929', position: 0, opacity: 1  }, { color: '#0d2840', position: 100, opacity: 1 }], angle: 160, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Light Clean': {
    mode: 'light', accent: '#007AFF', accent2: '#5E5CE6', bg: '#f5f5f7',
    glow: { mode: 'focus', color: '#007AFF', intensity: 0.3, radius: 16, spread: 2, blendMode: 'normal', gradientGlow: false, gradientColor1: '#007AFF', gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 16, panelBlur: 14, modalBlur: 20 },
  },
  'Cyberpunk': {
    mode: 'dark', accent: '#FFE600', accent2: '#FF2D78', bg: '#07080f',
    glow: { mode: 'outline', color: '#FFE600', intensity: 0.85, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#FFE600', gradientColor2: '#FF2D78', gradientAngle: 90, animated: true, animationSpeed: 2 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.05, sidebarBlur: 16, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'animated-gradient', stops: [{ color: '#07080f', position: 0, opacity: 1  }, { color: '#1a0a1e', position: 50, opacity: 1 }, { color: '#07080f', position: 100, opacity: 1 }], angle: 135, animated: true, animationSpeed: 5, noiseOpacity: 0.06, meshIntensity: 0.6 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
    glassmorphism: { borderOpacity: 0.3, borderGlow: true, borderGlowIntensity: 0.7, saturation: 200, tintColor: '#FFE600', tintOpacity: 0.04, frostedGlass: true, chromaticAberration: false, glowOutline: true, glowColor1: '#FFE600', glowColor2: '#FF2D78', glowOutlineStrength: 14 , glassMode: 'default' as any, glassDepth: 0.5, innerShadow: false, reflectionLine: false, animatedBlur: false, animatedBlurSpeed: 3, panelRenderer: 'blur', glowRenderer: 'css' },
  },
  'SuBset Glow': {
    mode: 'dark', accent: '#FF6B35', accent2: '#FF2D78', bg: '#1a0a0f',
    glow: { mode: 'ambient', color: '#FF6B35', intensity: 0.7, radius: 26, spread: 8, blendMode: 'screen', gradientGlow: true, gradientColor1: '#FF6B35', gradientColor2: '#FF2D78', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 18, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'gradient', stops: [{ color: '#1a0a0f', position: 0, opacity: 1  }, { color: '#2a0f1a', position: 100, opacity: 1 }], angle: 145, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.4 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Forest Dark': {
    mode: 'dark', accent: '#30D158', accent2: '#64D2FF', bg: '#0b1a10',
    glow: { mode: 'ambient', color: '#30D158', intensity: 0.55, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: false, gradientColor1: '#30D158', gradientColor2: '#64D2FF', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    background: { mode: 'gradient', stops: [{ color: '#0b1a10', position: 0, opacity: 1  }, { color: '#101f16', position: 100, opacity: 1 }], angle: 170, animated: false, animationSpeed: 4, noiseOpacity: 0.04, meshIntensity: 0.3 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Deep Space': {
    mode: 'dark', accent: '#BF5AF2', accent2: '#64D2FF', bg: '#060614',
    glow: { mode: 'outline', color: '#BF5AF2', intensity: 0.75, radius: 26, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#BF5AF2', gradientColor2: '#64D2FF', gradientAngle: 135, animated: true, animationSpeed: 0.8 },
    blur: { strength: 22, noiseOverlay: false, noiseOpacity: 0.05, sidebarBlur: 22, panelBlur: 18, modalBlur: 26 },
    background: { mode: 'aurora', stops: [{ color: '#BF5AF2', position: 0, opacity: 0.12  }, { color: '#007AFF', position: 50, opacity: 0.08 }, { color: '#64D2FF', position: 100, opacity: 0.1 }], angle: 135, animated: true, animationSpeed: 6, noiseOpacity: 0.04, meshIntensity: 0.5 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
    glassmorphism: { borderOpacity: 0.2, borderGlow: true, borderGlowIntensity: 0.5, saturation: 180, tintColor: '#BF5AF2', tintOpacity: 0.05, frostedGlass: true, chromaticAberration: false, glowOutline: true, glowColor1: '#BF5AF2', glowColor2: '#64D2FF', glowOutlineStrength: 13 , glassMode: 'default' as any, glassDepth: 0.5, innerShadow: false, reflectionLine: false, animatedBlur: false, animatedBlurSpeed: 3, panelRenderer: 'blur', glowRenderer: 'css' },
  },
  'Rose Gold': {
    mode: 'dark', accent: '#FF6B9E', accent2: '#FFB3C8', bg: '#1a0d12',
    glow: { mode: 'ambient', color: '#FF6B9E', intensity: 0.6, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#FF6B9E', gradientColor2: '#FFB3C8', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.035, sidebarBlur: 18, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#1a0d12', position: 0, opacity: 1  }, { color: '#251020', position: 100, opacity: 1 }], angle: 135, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Arctic': {
    mode: 'light', accent: '#007AFF', accent2: '#5E5CE6', bg: '#eef4ff',
    glow: { mode: 'focus', color: '#007AFF', intensity: 0.35, radius: 18, spread: 3, blendMode: 'normal', gradientGlow: false, gradientColor1: '#007AFF', gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 20, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'gradient', stops: [{ color: '#eef4ff', position: 0, opacity: 1  }, { color: '#dce8ff', position: 100, opacity: 1 }], angle: 160, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.2 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Dracula': {
    mode: 'dark', accent: '#BD93F9', accent2: '#FF79C6', bg: '#282a36',
    glow: { mode: 'outline', color: '#BD93F9', intensity: 0.65, radius: 20, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#BD93F9', gradientColor2: '#FF79C6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    background: { mode: 'solid', stops: [{ color: '#282a36', position: 0, opacity: 1  }, { color: '#1e2030', position: 100, opacity: 1 }], angle: 135, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Void': {
    mode: 'dark', accent: '#ffffff', accent2: '#888888', bg: '#000000',
    glow: { mode: 'outline', color: '#ffffff', intensity: 0.5, radius: 18, spread: 4, blendMode: 'screen', gradientGlow: false, gradientColor1: '#ffffff', gradientColor2: '#aaaaaa', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    glassmorphism: { borderOpacity: 0.1, borderGlow: false, borderGlowIntensity: 0.2, saturation: 120, tintColor: '#ffffff', tintOpacity: 0.01, frostedGlass: false, chromaticAberration: false, glowOutline: false, glowColor1: '#fff', glowColor2: '#aaa', glowOutlineStrength: 8 , glassMode: 'default' as any, glassDepth: 0.5, innerShadow: false, reflectionLine: false, animatedBlur: false, animatedBlurSpeed: 3, panelRenderer: 'blur', glowRenderer: 'css' },
  },
  'Sakura': {
    mode: 'light', accent: '#E91E8C', accent2: '#FF6B6B', bg: '#fff5f8',
    glow: { mode: 'ambient', color: '#E91E8C', intensity: 0.35, radius: 18, spread: 4, blendMode: 'normal', gradientGlow: true, gradientColor1: '#E91E8C', gradientColor2: '#FF6B6B', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.01, sidebarBlur: 20, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'gradient', stops: [{ color: '#fff5f8', position: 0, opacity: 1  }, { color: '#ffe0ec', position: 100, opacity: 1 }], angle: 160, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.2 , overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
  },
  'Graphite Pro': {
    mode: 'dark', accent: '#8DB4FF', accent2: '#4DE0D0', bg: '#0e1218',
    glow: { mode: 'outline', color: '#8DB4FF', intensity: 0.58, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#8DB4FF', gradientColor2: '#4DE0D0', gradientAngle: 120, animated: true, animationSpeed: 0.7 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 18, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#0e1218', position: 0, opacity: 1 }, { color: '#161f2b', position: 100, opacity: 1 }], angle: 145, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.22, overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
    glassmorphism: { borderOpacity: 0.2, borderGlow: true, borderGlowIntensity: 0.6, saturation: 165, tintColor: '#8DB4FF', tintOpacity: 0.035, frostedGlass: false, chromaticAberration: false, glowOutline: true, glowColor1: '#8DB4FF', glowColor2: '#4DE0D0', glowOutlineStrength: 12, glassMode: 'default' as any, glassDepth: 0.5, innerShadow: false, reflectionLine: false, animatedBlur: false, animatedBlurSpeed: 3, panelRenderer: 'blur', glowRenderer: 'css' },
  },
  'Sunset Haze': {
    mode: 'light', accent: '#F97316', accent2: '#EC4899', bg: '#fff7ef',
    glow: { mode: 'focus', color: '#F97316', intensity: 0.34, radius: 16, spread: 3, blendMode: 'normal', gradientGlow: true, gradientColor1: '#F97316', gradientColor2: '#EC4899', gradientAngle: 95, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.01, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    background: { mode: 'gradient', stops: [{ color: '#fff7ef', position: 0, opacity: 1 }, { color: '#ffe7ef', position: 100, opacity: 1 }], angle: 165, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.18, overlayOpacity: 0, vignette: false, vignetteStrength: 0.4, scanlines: false, panelBgMode: 'glass' },
    glassmorphism: { borderOpacity: 0.16, borderGlow: true, borderGlowIntensity: 0.4, saturation: 150, tintColor: '#F97316', tintOpacity: 0.02, frostedGlass: false, chromaticAberration: false, glowOutline: true, glowColor1: '#F97316', glowColor2: '#EC4899', glowOutlineStrength: 10, glassMode: 'default' as any, glassDepth: 0.5, innerShadow: false, reflectionLine: false, animatedBlur: false, animatedBlurSpeed: 3, panelRenderer: 'blur', glowRenderer: 'css' },
  },
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_NOTES: NotesConfig = { fontSize: 13, fontFamily: 'Fira Code', lineHeight: 1.5, mode: 'dark' }

export const GLOBAL_FONTS = [
  { value: 'system-ui', label: 'System Default' },
  { value: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", label: 'SF Pro Display' },
  { value: "'Product Sans', 'Google Sans', sans-serif", label: 'Product Sans' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Outfit', sans-serif", label: 'Outfit' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
  { value: "'DM Sans', sans-serif", label: 'DM Sans' },
  { value: "'Satoshi', sans-serif", label: 'Satoshi' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Plus Jakarta Sans' },
  { value: "'Manrope', sans-serif", label: 'Manrope' },
  { value: "'Sora', sans-serif", label: 'Sora' },
  { value: "'Geist', sans-serif", label: 'Geist' },
]

const DEFAULT_GLOW: GlowConfig = {
  mode: 'outline', color: '#007AFF', intensity: 0.85, radius: 28, spread: 8,
  blendMode: 'screen', gradientGlow: true, gradientColor1: '#007AFF',
  gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1,
}

const DEFAULT_BG: BackgroundConfig = {
  mode: 'solid',
  stops: [{ color: '#007AFF', position: 0, opacity: 0.15 }, { color: '#5E5CE6', position: 100, opacity: 0.15 }],
  angle: 135, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3,
  overlayOpacity: 0, vignette: false, vignetteStrength: 0.4,
  scanlines: false, panelBgMode: 'glass',
}

const DEFAULT_GLASS: GlassmorphismConfig = {
  borderOpacity: 0.24, borderGlow: true, borderGlowIntensity: 0.6,
  saturation: 240, tintColor: '#007AFF', tintOpacity: 0.06,
  frostedGlass: true, chromaticAberration: false,
  glowOutline: true, glowColor1: '#007AFF', glowColor2: '#5E5CE6', glowOutlineStrength: 14,
  glassMode: 'default', glassDepth: 0.5, innerShadow: false, reflectionLine: false,
  animatedBlur: false, animatedBlurSpeed: 3,
  panelRenderer: 'blur',
  glowRenderer: 'css',
}

const DEFAULT_ANIMS: AnimationsConfig = {
  fade: true, scale: true, slide: true, spring: false,
  smoothTransitions: true, entryAnimations: true, hoverLift: true,
  pulseEffects: false, rippleClick: true, pageTransitions: true,
  glowPulse: false, particleEffects: false,
  floatEffect: false, borderFlow: false, shakeOnError: false,
  confettiOnComplete: false, magneticButtons: false, entranceStyle: 'fade',
}

const buildTokens = (
  mode: 'dark' | 'light',
  accent: string,
  autoAccentContrast = true
): SemanticTokens => ({
  surface: mode === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
  surfaceElevated: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.95)',
  textPrimary: mode === 'dark' ? '#f6f8ff' : '#101318',
  textMuted: mode === 'dark' ? 'rgba(255,255,255,0.62)' : 'rgba(16,19,24,0.64)',
  success: '#30D158',
  warning: '#FF9F0A',
  danger: '#FF453A',
  accentText: autoAccentContrast ? pickReadableText(accent, '#ffffff', '#101318') : (mode === 'dark' ? '#ffffff' : '#101318'),
})

// ── Store ──────────────────────────────────────────────────────────────────────

export const useTheme = create<Theme>()(
  persist(
    (set) => ({
      // ── State ──
      mode: 'dark',
      accent: '#007AFF',
      accent2: '#5E5CE6',
      bg: '#1a1a2e',
      globalFont: 'system-ui',
      sidebarWidth: 240,
      sidebarPosition: 'left',
      sidebarStyle: 'default',
      sidebarLabels: true,
      sidebarAccentBg: false,
      toolbar: { toolbarMode: 'island', position: 'bottom', mode: 'pill', height: 40, visible: true },

      notes: DEFAULT_NOTES,
      glow: DEFAULT_GLOW,
      gradient: { angle: 135, stops: [{ color: '#007AFF', position: 0, opacity: 1 }, { color: '#5E5CE6', position: 100, opacity: 1 }], animated: false, animationSpeed: 1 },
      background: DEFAULT_BG,
      blur: { strength: 24, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 30, panelBlur: 28, modalBlur: 34 },
      glassmorphism: DEFAULT_GLASS,
      visual: { shadowDepth: 0.4, animationSpeed: 1, panelRadius: 14, compactMode: false, spacingDensity: 'comfortable', borderThickness: 0 },
      animations: DEFAULT_ANIMS,
      editor: { autosave: true, autosaveInterval: 2000, wordWrap: true, lineNumbers: true, minimap: true, cursorAnimation: true, tabSize: 2, fontSize: 13, fontFamily: 'monospace' },
      qol: { reducedMotion: false, highContrast: false, showTooltips: true, sidebarAutoHide: false, fontSize: 14, panelDensity: 'comfortable', quickActions: false, autoAccentContrast: true } as QOLConfig,
      tokens: buildTokens('dark', '#007AFF', true),

      glowOutline: true, glowColor1: '#00bcd4', glowColor2: '#2196f3', glowOutlineStrength: 12,

      // ── Actions ──
      setMode: (mode) => set((s) => ({
        mode,
        tokens: buildTokens(mode, s.accent, (s.qol as any).autoAccentContrast ?? true),
      })),
      setColors: (c) => set((s) => {
        const accent = c.accent ?? s.accent
        const accent2 = c.accent2 ?? s.accent2
        const bg = c.bg ?? s.bg
        return {
          accent,
          accent2,
          bg,
          tokens: buildTokens(s.mode, accent, (s.qol as any).autoAccentContrast ?? true),
        }
      }),
      setGlow: (g) => set((s) => ({ glow: { ...s.glow, ...g } })),
      setGradient: (g) => set((s) => ({ gradient: { ...s.gradient, ...g } })),
      setBackground: (b) => set((s) => ({ background: { ...s.background, ...b  } })),
      setBlur: (b) => set((s) => ({ blur: { ...s.blur, ...b } })),
      setGlassmorphism: (g) => set((s) => ({ glassmorphism: { ...s.glassmorphism, ...g } })),
      setVisual: (v) => set((s) => ({ visual: { ...s.visual, ...v } })),
      setAnimations: (a) => set((s) => ({ animations: { ...s.animations, ...a } })),
      setEditor: (e) => set((s) => ({ editor: { ...s.editor, ...e } })),
      setNotes: (n) => set((s) => ({ notes: { ...s.notes, ...n } })),
      setQOL: (q) => set((s) => {
        const nextQol = { ...s.qol, ...q } as QOLConfig & { autoAccentContrast?: boolean }
        return {
          qol: nextQol,
          tokens: buildTokens(s.mode, s.accent, nextQol.autoAccentContrast ?? true),
        }
      }),
      setGlobalFont: (globalFont) => set({ globalFont }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setSidebarPosition: (sidebarPosition) => set({ sidebarPosition }),
      setSidebarStyle: (sidebarStyle) => set({ sidebarStyle }),
      setSidebarLabels: (sidebarLabels) => set({ sidebarLabels }),
      setSidebarAccentBg: (sidebarAccentBg) => set({ sidebarAccentBg }),
      setSidebarAutoHide: (v) => set((s) => ({ qol: { ...s.qol, sidebarAutoHide: v } })),
      setTokens: (tokens) => set((s) => ({ tokens: { ...s.tokens, ...tokens } })),
      setBackgroundMode: (m) => set((s) => ({ background: { ...s.background, mode: m  } })),
      setPanelBgMode: (m) => set((s) => ({ background: { ...s.background, panelBgMode: m  } })),
      setToolbar: (tb) => set((s) => ({ toolbar: { ...s.toolbar, ...tb } })),

      preset: (n) => {
        const p = P[n]
        if (p) set((s) => ({
          ...s, ...p,
          glow: { ...s.glow, ...p.glow },
          blur: { ...s.blur, ...p.blur },
          background: { ...s.background, ...p.background  },
          glassmorphism: { ...s.glassmorphism, ...p.glassmorphism },
          tokens: buildTokens(
            (p.mode ?? s.mode) as 'dark' | 'light',
            (p.accent ?? s.accent) as string,
            ((s.qol as any).autoAccentContrast ?? true) as boolean
          ),
        }))
      },
    }),
    { name: 'nx-theme-v5' }
  )
)

export const PRESETS = Object.keys(P)
