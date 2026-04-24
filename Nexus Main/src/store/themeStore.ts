import { createWithEqualityFn as create } from 'zustand/traditional'
import { persist } from 'zustand/middleware'
import { createStoreManagerStorage } from './persistence/storeManager'

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
  motionProfile?: 'minimal' | 'balanced' | 'expressive' | 'cinematic'
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
  preset: (n: string) => void
  // Background
  setBackgroundMode: (m: BgMode) => void
  setPanelBgMode: (m: PanelBgMode) => void
}

// ── Presets ──────────────────────────────────────────────────────────────────

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const P: Record<string, DeepPartial<Theme>> = {
  'macOS Dark': {
    mode: 'dark', accent: '#007AFF', accent2: '#5E5CE6', bg: '#1a1a2e',
    glow: { mode: 'outline', color: '#007AFF', intensity: 0.85, radius: 28, spread: 8, blendMode: 'screen', gradientGlow: true, gradientColor1: '#007AFF', gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 24, noiseOverlay: false, noiseOpacity: 0.035, sidebarBlur: 24, panelBlur: 20, modalBlur: 28 },
    glassmorphism: { borderOpacity: 0.18, borderGlow: true, borderGlowIntensity: 0.5, saturation: 200, tintColor: '#007AFF', tintOpacity: 0.04, frostedGlass: false, chromaticAberration: false, glowOutline: true, glowColor1: '#007AFF', glowColor2: '#5E5CE6', glowOutlineStrength: 14 },
  },
  'Neon Ultra': {
    mode: 'dark', accent: '#00FFAA', accent2: '#FF00FF', bg: '#0a0a14',
    glow: { mode: 'outline', color: '#00FFAA', intensity: 0.9, radius: 28, spread: 8, blendMode: 'screen', gradientGlow: true, gradientColor1: '#00FFAA', gradientColor2: '#FF00FF', gradientAngle: 135, animated: true, animationSpeed: 1.5 },
    blur: { strength: 24, noiseOverlay: false, noiseOpacity: 0.06, sidebarBlur: 24, panelBlur: 20, modalBlur: 28 },
    background: { mode: 'animated-gradient', stops: [{ color: '#00FFAA', position: 0, opacity: 0.15 }, { color: '#FF00FF', position: 100, opacity: 0.15 }], angle: 135, animated: true, animationSpeed: 3, noiseOpacity: 0.04, meshIntensity: 0.5 },
  },
  'Ocean Wave': {
    mode: 'dark', accent: '#00AAFF', accent2: '#00DDCC', bg: '#0a1929',
    glow: { mode: 'ambient', color: '#00AAFF', intensity: 0.5, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: false, gradientColor1: '#00AAFF', gradientColor2: '#00DDCC', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 18, panelBlur: 16, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#0a1929', position: 0, opacity: 1 }, { color: '#0d2840', position: 100, opacity: 1 }], angle: 160, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3 },
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
    background: { mode: 'animated-gradient', stops: [{ color: '#07080f', position: 0, opacity: 1 }, { color: '#1a0a1e', position: 50, opacity: 1 }, { color: '#07080f', position: 100, opacity: 1 }], angle: 135, animated: true, animationSpeed: 5, noiseOpacity: 0.06, meshIntensity: 0.6 },
    glassmorphism: { borderOpacity: 0.3, borderGlow: true, borderGlowIntensity: 0.7, saturation: 200, tintColor: '#FFE600', tintOpacity: 0.04, frostedGlass: true, chromaticAberration: false, glowOutline: true, glowColor1: '#FFE600', glowColor2: '#FF2D78', glowOutlineStrength: 14 },
  },
  'SuBset Glow': {
    mode: 'dark', accent: '#FF6B35', accent2: '#FF2D78', bg: '#1a0a0f',
    glow: { mode: 'ambient', color: '#FF6B35', intensity: 0.7, radius: 26, spread: 8, blendMode: 'screen', gradientGlow: true, gradientColor1: '#FF6B35', gradientColor2: '#FF2D78', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 18, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'gradient', stops: [{ color: '#1a0a0f', position: 0, opacity: 1 }, { color: '#2a0f1a', position: 100, opacity: 1 }], angle: 145, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.4 },
  },
  'Forest Dark': {
    mode: 'dark', accent: '#30D158', accent2: '#64D2FF', bg: '#0b1a10',
    glow: { mode: 'ambient', color: '#30D158', intensity: 0.55, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: false, gradientColor1: '#30D158', gradientColor2: '#64D2FF', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    background: { mode: 'gradient', stops: [{ color: '#0b1a10', position: 0, opacity: 1 }, { color: '#101f16', position: 100, opacity: 1 }], angle: 170, animated: false, animationSpeed: 4, noiseOpacity: 0.04, meshIntensity: 0.3 },
  },
  'Deep Space': {
    mode: 'dark', accent: '#BF5AF2', accent2: '#64D2FF', bg: '#060614',
    glow: { mode: 'outline', color: '#BF5AF2', intensity: 0.75, radius: 26, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#BF5AF2', gradientColor2: '#64D2FF', gradientAngle: 135, animated: true, animationSpeed: 0.8 },
    blur: { strength: 22, noiseOverlay: false, noiseOpacity: 0.05, sidebarBlur: 22, panelBlur: 18, modalBlur: 26 },
    background: { mode: 'aurora', stops: [{ color: '#BF5AF2', position: 0, opacity: 0.12 }, { color: '#007AFF', position: 50, opacity: 0.08 }, { color: '#64D2FF', position: 100, opacity: 0.1 }], angle: 135, animated: true, animationSpeed: 6, noiseOpacity: 0.04, meshIntensity: 0.5 },
    glassmorphism: { borderOpacity: 0.2, borderGlow: true, borderGlowIntensity: 0.5, saturation: 180, tintColor: '#BF5AF2', tintOpacity: 0.05, frostedGlass: true, chromaticAberration: false, glowOutline: true, glowColor1: '#BF5AF2', glowColor2: '#64D2FF', glowOutlineStrength: 13 },
  },
  'Rose Gold': {
    mode: 'dark', accent: '#FF6B9E', accent2: '#FFB3C8', bg: '#1a0d12',
    glow: { mode: 'ambient', color: '#FF6B9E', intensity: 0.6, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#FF6B9E', gradientColor2: '#FFB3C8', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.035, sidebarBlur: 18, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#1a0d12', position: 0, opacity: 1 }, { color: '#251020', position: 100, opacity: 1 }], angle: 135, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3 },
  },
  'Arctic': {
    mode: 'light', accent: '#007AFF', accent2: '#5E5CE6', bg: '#eef4ff',
    glow: { mode: 'focus', color: '#007AFF', intensity: 0.35, radius: 18, spread: 3, blendMode: 'normal', gradientGlow: false, gradientColor1: '#007AFF', gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 20, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'gradient', stops: [{ color: '#eef4ff', position: 0, opacity: 1 }, { color: '#dce8ff', position: 100, opacity: 1 }], angle: 160, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.2 },
  },
  'Dracula': {
    mode: 'dark', accent: '#BD93F9', accent2: '#FF79C6', bg: '#282a36',
    glow: { mode: 'outline', color: '#BD93F9', intensity: 0.65, radius: 20, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#BD93F9', gradientColor2: '#FF79C6', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.04, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    background: { mode: 'solid', stops: [{ color: '#282a36', position: 0, opacity: 1 }, { color: '#1e2030', position: 100, opacity: 1 }], angle: 135, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3 },
  },
  'Void': {
    mode: 'dark', accent: '#ffffff', accent2: '#888888', bg: '#000000',
    glow: { mode: 'outline', color: '#ffffff', intensity: 0.5, radius: 18, spread: 4, blendMode: 'screen', gradientGlow: false, gradientColor1: '#ffffff', gradientColor2: '#aaaaaa', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    glassmorphism: { borderOpacity: 0.1, borderGlow: false, borderGlowIntensity: 0.2, saturation: 120, tintColor: '#ffffff', tintOpacity: 0.01, frostedGlass: false, chromaticAberration: false, glowOutline: false, glowColor1: '#fff', glowColor2: '#aaa', glowOutlineStrength: 8 },
  },
  'Sakura': {
    mode: 'light', accent: '#E91E8C', accent2: '#FF6B6B', bg: '#fff5f8',
    glow: { mode: 'ambient', color: '#E91E8C', intensity: 0.35, radius: 18, spread: 4, blendMode: 'normal', gradientGlow: true, gradientColor1: '#E91E8C', gradientColor2: '#FF6B6B', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.01, sidebarBlur: 20, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'gradient', stops: [{ color: '#fff5f8', position: 0, opacity: 1 }, { color: '#ffe0ec', position: 100, opacity: 1 }], angle: 160, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.2 },
  },
  'Graphite Pro': {
    mode: 'dark', accent: '#8DB4FF', accent2: '#4DE0D0', bg: '#0e1218',
    glow: { mode: 'outline', color: '#8DB4FF', intensity: 0.58, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#8DB4FF', gradientColor2: '#4DE0D0', gradientAngle: 120, animated: true, animationSpeed: 0.7 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 18, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#0e1218', position: 0, opacity: 1 }, { color: '#161f2b', position: 100, opacity: 1 }], angle: 145, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.22 },
    glassmorphism: { borderOpacity: 0.2, borderGlow: true, borderGlowIntensity: 0.6, saturation: 165, tintColor: '#8DB4FF', tintOpacity: 0.035, frostedGlass: false, chromaticAberration: false, glowOutline: true, glowColor1: '#8DB4FF', glowColor2: '#4DE0D0', glowOutlineStrength: 12 },
  },
  'Sunset Haze': {
    mode: 'light', accent: '#F97316', accent2: '#EC4899', bg: '#fff7ef',
    glow: { mode: 'focus', color: '#F97316', intensity: 0.34, radius: 16, spread: 3, blendMode: 'normal', gradientGlow: true, gradientColor1: '#F97316', gradientColor2: '#EC4899', gradientAngle: 95, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.01, sidebarBlur: 16, panelBlur: 12, modalBlur: 20 },
    background: { mode: 'gradient', stops: [{ color: '#fff7ef', position: 0, opacity: 1 }, { color: '#ffe7ef', position: 100, opacity: 1 }], angle: 165, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.18 },
    glassmorphism: { borderOpacity: 0.16, borderGlow: true, borderGlowIntensity: 0.4, saturation: 150, tintColor: '#F97316', tintOpacity: 0.02, frostedGlass: false, chromaticAberration: false, glowOutline: true, glowColor1: '#F97316', glowColor2: '#EC4899', glowOutlineStrength: 10 },
  },
  'Nordic Night': {
    mode: 'dark', accent: '#88C0D0', accent2: '#5E81AC', bg: '#1c2330',
    glow: { mode: 'outline', color: '#88C0D0', intensity: 0.55, radius: 22, spread: 5, blendMode: 'screen', gradientGlow: true, gradientColor1: '#88C0D0', gradientColor2: '#5E81AC', gradientAngle: 125, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 18, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#1c2330', position: 0, opacity: 1 }, { color: '#243245', position: 100, opacity: 1 }], angle: 155, animated: false, animationSpeed: 4, noiseOpacity: 0.02, meshIntensity: 0.24 },
  },
  'Emerald Mist': {
    mode: 'dark', accent: '#2DD4BF', accent2: '#22C55E', bg: '#0a1514',
    glow: { mode: 'ambient', color: '#2DD4BF', intensity: 0.62, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#2DD4BF', gradientColor2: '#22C55E', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.025, sidebarBlur: 18, panelBlur: 15, modalBlur: 22 },
    background: { mode: 'aurora', stops: [{ color: '#2DD4BF', position: 0, opacity: 0.12 }, { color: '#22C55E', position: 60, opacity: 0.08 }, { color: '#0a1514', position: 100, opacity: 1 }], angle: 140, animated: true, animationSpeed: 5, noiseOpacity: 0.03, meshIntensity: 0.36 },
  },
  'Ruby Graphite': {
    mode: 'dark', accent: '#EF476F', accent2: '#F78C6B', bg: '#16181f',
    glow: { mode: 'outline', color: '#EF476F', intensity: 0.6, radius: 23, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#EF476F', gradientColor2: '#F78C6B', gradientAngle: 110, animated: false, animationSpeed: 1 },
    blur: { strength: 17, noiseOverlay: false, noiseOpacity: 0.022, sidebarBlur: 17, panelBlur: 14, modalBlur: 21 },
    background: { mode: 'gradient', stops: [{ color: '#16181f', position: 0, opacity: 1 }, { color: '#211b26', position: 100, opacity: 1 }], angle: 152, animated: false, animationSpeed: 4, noiseOpacity: 0.02, meshIntensity: 0.24 },
  },
  'Solar Flare': {
    mode: 'dark', accent: '#FFB020', accent2: '#FF5D5D', bg: '#140f08',
    glow: { mode: 'gradient', color: '#FFB020', intensity: 0.72, radius: 26, spread: 7, blendMode: 'screen', gradientGlow: true, gradientColor1: '#FFB020', gradientColor2: '#FF5D5D', gradientAngle: 95, animated: true, animationSpeed: 0.9 },
    blur: { strength: 20, noiseOverlay: false, noiseOpacity: 0.028, sidebarBlur: 20, panelBlur: 16, modalBlur: 24 },
    background: { mode: 'animated-gradient', stops: [{ color: '#140f08', position: 0, opacity: 1 }, { color: '#2a120e', position: 55, opacity: 1 }, { color: '#140f08', position: 100, opacity: 1 }], angle: 140, animated: true, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.32 },
  },
  'Lavender Storm': {
    mode: 'dark', accent: '#A78BFA', accent2: '#38BDF8', bg: '#121222',
    glow: { mode: 'outline', color: '#A78BFA', intensity: 0.64, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#A78BFA', gradientColor2: '#38BDF8', gradientAngle: 132, animated: true, animationSpeed: 0.8 },
    blur: { strength: 19, noiseOverlay: false, noiseOpacity: 0.025, sidebarBlur: 19, panelBlur: 15, modalBlur: 23 },
    background: { mode: 'aurora', stops: [{ color: '#A78BFA', position: 0, opacity: 0.12 }, { color: '#38BDF8', position: 55, opacity: 0.08 }, { color: '#121222', position: 100, opacity: 1 }], angle: 135, animated: true, animationSpeed: 6, noiseOpacity: 0.03, meshIntensity: 0.38 },
  },
  'Paper Ink': {
    mode: 'light', accent: '#1F6FEB', accent2: '#7C3AED', bg: '#f7f8fb',
    glow: { mode: 'focus', color: '#1F6FEB', intensity: 0.28, radius: 14, spread: 2, blendMode: 'normal', gradientGlow: false, gradientColor1: '#1F6FEB', gradientColor2: '#7C3AED', gradientAngle: 135, animated: false, animationSpeed: 1 },
    blur: { strength: 14, noiseOverlay: false, noiseOpacity: 0.01, sidebarBlur: 14, panelBlur: 11, modalBlur: 18 },
    background: { mode: 'gradient', stops: [{ color: '#f7f8fb', position: 0, opacity: 1 }, { color: '#edf1f8', position: 100, opacity: 1 }], angle: 170, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.14 },
  },
  'Mint Frost': {
    mode: 'light', accent: '#0EA5A2', accent2: '#22C55E', bg: '#eefcf9',
    glow: { mode: 'focus', color: '#0EA5A2', intensity: 0.32, radius: 16, spread: 3, blendMode: 'normal', gradientGlow: true, gradientColor1: '#0EA5A2', gradientColor2: '#22C55E', gradientAngle: 130, animated: false, animationSpeed: 1 },
    blur: { strength: 15, noiseOverlay: false, noiseOpacity: 0.01, sidebarBlur: 15, panelBlur: 12, modalBlur: 19 },
    background: { mode: 'gradient', stops: [{ color: '#eefcf9', position: 0, opacity: 1 }, { color: '#dff7f0', position: 100, opacity: 1 }], angle: 162, animated: false, animationSpeed: 4, noiseOpacity: 0.01, meshIntensity: 0.16 },
  },
  'Midnight Amber': {
    mode: 'dark', accent: '#F59E0B', accent2: '#F97316', bg: '#111013',
    glow: { mode: 'ambient', color: '#F59E0B', intensity: 0.66, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: true, gradientColor1: '#F59E0B', gradientColor2: '#F97316', gradientAngle: 110, animated: false, animationSpeed: 1 },
    blur: { strength: 18, noiseOverlay: false, noiseOpacity: 0.024, sidebarBlur: 18, panelBlur: 14, modalBlur: 22 },
    background: { mode: 'gradient', stops: [{ color: '#111013', position: 0, opacity: 1 }, { color: '#1d1614', position: 100, opacity: 1 }], angle: 148, animated: false, animationSpeed: 4, noiseOpacity: 0.02, meshIntensity: 0.22 },
  },
  'Matrix Terminal': {
    mode: 'dark', accent: '#22C55E', accent2: '#16A34A', bg: '#05110a',
    glow: { mode: 'outline', color: '#22C55E', intensity: 0.72, radius: 24, spread: 6, blendMode: 'screen', gradientGlow: false, gradientColor1: '#22C55E', gradientColor2: '#16A34A', gradientAngle: 120, animated: false, animationSpeed: 1 },
    blur: { strength: 16, noiseOverlay: false, noiseOpacity: 0.02, sidebarBlur: 16, panelBlur: 13, modalBlur: 20 },
    background: { mode: 'gradient', stops: [{ color: '#05110a', position: 0, opacity: 1 }, { color: '#0a1a12', position: 100, opacity: 1 }], angle: 170, animated: false, animationSpeed: 4, noiseOpacity: 0.02, meshIntensity: 0.2 },
  },
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_NOTES: NotesConfig = { fontSize: 13, fontFamily: 'Fira Code', lineHeight: 1.5, mode: 'dark' }

export const GLOBAL_FONTS = [
  { value: 'system-ui', label: 'System Default' },
  { value: "'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif", label: 'SF Pro Display' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Poppins', sans-serif", label: 'Poppins' },
  { value: "'Outfit', sans-serif", label: 'Outfit' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
  { value: "'DM Sans', sans-serif", label: 'DM Sans' },
  { value: "'Manrope', sans-serif", label: 'Manrope' },
  { value: "'Sora', sans-serif", label: 'Sora' },
  { value: "'Avenir Next', 'Avenir', 'Segoe UI', sans-serif", label: 'Avenir Next' },
  { value: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", label: 'Segoe / Helvetica' },
  { value: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, Consolas, monospace", label: 'JetBrains Mono' },
  { value: "'Fira Code', 'SF Mono', Menlo, Monaco, Consolas, monospace", label: 'Fira Code Mono' },
]

const DEFAULT_GLOW: GlowConfig = {
  mode: 'outline', color: '#007AFF', intensity: 0.85, radius: 28, spread: 8,
  blendMode: 'screen', gradientGlow: true, gradientColor1: '#007AFF',
  gradientColor2: '#5E5CE6', gradientAngle: 135, animated: false, animationSpeed: 1,
}

const DEFAULT_TOOLBAR: Theme['toolbar'] = {
  toolbarMode: 'island',
  position: 'bottom',
  mode: 'pill',
  height: 40,
  visible: true,
}

const DEFAULT_GRADIENT: GradientConfig = {
  angle: 135,
  stops: [{ color: '#007AFF', position: 0, opacity: 1 }, { color: '#5E5CE6', position: 100, opacity: 1 }],
  animated: false,
  animationSpeed: 1,
}

const DEFAULT_BG: BackgroundConfig = {
  mode: 'solid',
  stops: [{ color: '#007AFF', position: 0, opacity: 0.15 }, { color: '#5E5CE6', position: 100, opacity: 0.15 }],
  angle: 135, animated: false, animationSpeed: 4, noiseOpacity: 0.03, meshIntensity: 0.3,
  overlayOpacity: 0, vignette: false, vignetteStrength: 0.4,
  scanlines: false, panelBgMode: 'glass',
}

const DEFAULT_BLUR: BlurConfig = {
  strength: 24,
  noiseOverlay: false,
  noiseOpacity: 0.035,
  sidebarBlur: 24,
  panelBlur: 20,
  modalBlur: 28,
}

const DEFAULT_GLASS: GlassmorphismConfig = {
  borderOpacity: 0.18, borderGlow: true, borderGlowIntensity: 0.5,
  saturation: 200, tintColor: '#007AFF', tintOpacity: 0.04,
  frostedGlass: false, chromaticAberration: false,
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

const DEFAULT_VISUAL: VisualConfig = {
  shadowDepth: 0.4,
  animationSpeed: 1,
  panelRadius: 14,
  compactMode: false,
  spacingDensity: 'comfortable',
  borderThickness: 0,
}

const DEFAULT_EDITOR: EditorConfig = {
  autosave: true,
  autosaveInterval: 2000,
  wordWrap: true,
  lineNumbers: true,
  minimap: true,
  cursorAnimation: true,
  tabSize: 2,
  fontSize: 13,
  fontFamily: 'monospace',
}

const DEFAULT_QOL: QOLConfig = {
  reducedMotion: false,
  highContrast: false,
  showTooltips: true,
  sidebarAutoHide: false,
  fontSize: 14,
  panelDensity: 'comfortable',
  quickActions: false,
  autoAccentContrast: true,
  motionProfile: 'balanced',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const mergeConfig = <T extends object>(base: T, incoming: unknown): T => (
  isRecord(incoming) ? ({ ...base, ...(incoming as Partial<T>) } as T) : ({ ...base } as T)
)

const sanitizePanelRenderer = (value: unknown): GlassmorphismConfig['panelRenderer'] => {
  if (value === 'fake-glass' || value === 'glass-shader') return value
  return 'blur'
}

const sanitizeGlowRenderer = (value: unknown): GlassmorphismConfig['glowRenderer'] => (
  value === 'three' ? 'three' : 'css'
)

const sanitizeSidebarStyle = (
  value: unknown,
  fallback: Theme['sidebarStyle'],
): Theme['sidebarStyle'] => {
  if (
    value === 'default' ||
    value === 'floating' ||
    value === 'minimal' ||
    value === 'rail' ||
    value === 'hidden'
  ) {
    return value
  }
  return fallback
}

const sanitizeToolbarConfig = (
  value: unknown,
  fallback: Theme['toolbar'],
): Theme['toolbar'] => {
  if (!isRecord(value)) {
    return { ...fallback }
  }
  const toolbarMode =
    value.toolbarMode === 'spotlight' || value.toolbarMode === 'full-width'
      ? value.toolbarMode
      : 'island'
  const position = value.position === 'top' ? 'top' : 'bottom'
  const mode = value.mode === 'full-width' ? 'full-width' : 'pill'
  const visible = typeof value.visible === 'boolean' ? value.visible : fallback.visible
  return {
    ...fallback,
    toolbarMode,
    position,
    mode,
    visible,
    // toolbar geometry is release-frozen
    height: fallback.height,
  }
}

const sanitizeQolConfig = (
  value: unknown,
  fallback: QOLConfig,
): QOLConfig => {
  const merged = mergeConfig(fallback, value)
  const panelDensity =
    merged.panelDensity === 'compact' || merged.panelDensity === 'spacious'
      ? merged.panelDensity
      : 'comfortable'
  const motionProfile =
    merged.motionProfile === 'minimal' ||
    merged.motionProfile === 'expressive' ||
    merged.motionProfile === 'cinematic'
      ? merged.motionProfile
      : 'balanced'
  return {
    ...merged,
    panelDensity,
    motionProfile,
    autoAccentContrast: typeof merged.autoAccentContrast === 'boolean' ? merged.autoAccentContrast : true,
  }
}

const sanitizeThemeSnapshot = (persistedRaw: unknown, current: Theme): Theme => {
  const persisted = isRecord(persistedRaw) ? (persistedRaw as Partial<Theme>) : {}
  const sidebarWidthRaw = Number(persisted.sidebarWidth)
  const sidebarWidth = Number.isFinite(sidebarWidthRaw)
    ? Math.max(180, Math.min(420, sidebarWidthRaw))
    : current.sidebarWidth
  const mergedGlassmorphism = mergeConfig(current.glassmorphism, persisted.glassmorphism)
  mergedGlassmorphism.panelRenderer = sanitizePanelRenderer(mergedGlassmorphism.panelRenderer)
  mergedGlassmorphism.glowRenderer = sanitizeGlowRenderer(mergedGlassmorphism.glowRenderer)
  mergedGlassmorphism.reflectionLine = typeof mergedGlassmorphism.reflectionLine === 'boolean'
    ? mergedGlassmorphism.reflectionLine
    : current.glassmorphism.reflectionLine
  mergedGlassmorphism.glassDepth = Number.isFinite(Number(mergedGlassmorphism.glassDepth))
    ? Math.max(0.1, Math.min(3, Number(mergedGlassmorphism.glassDepth)))
    : current.glassmorphism.glassDepth
  const mergedQol = sanitizeQolConfig(persisted.qol, current.qol)

  return {
    ...current,
    ...persisted,
    mode: persisted.mode === 'light' ? 'light' : 'dark',
    accent: typeof persisted.accent === 'string' && persisted.accent.length > 0 ? persisted.accent : current.accent,
    accent2: typeof persisted.accent2 === 'string' && persisted.accent2.length > 0 ? persisted.accent2 : current.accent2,
    bg: typeof persisted.bg === 'string' && persisted.bg.length > 0 ? persisted.bg : current.bg,
    globalFont: typeof persisted.globalFont === 'string' && persisted.globalFont.length > 0 ? persisted.globalFont : current.globalFont,
    sidebarWidth,
    sidebarPosition: persisted.sidebarPosition === 'right' ? 'right' : 'left',
    sidebarStyle: sanitizeSidebarStyle(persisted.sidebarStyle, current.sidebarStyle),
    sidebarLabels: typeof persisted.sidebarLabels === 'boolean' ? persisted.sidebarLabels : current.sidebarLabels,
    sidebarAccentBg: typeof persisted.sidebarAccentBg === 'boolean' ? persisted.sidebarAccentBg : current.sidebarAccentBg,
    toolbar: sanitizeToolbarConfig(persisted.toolbar, current.toolbar),
    notes: mergeConfig(current.notes, persisted.notes),
    glow: mergeConfig(current.glow, persisted.glow),
    gradient: mergeConfig(current.gradient, persisted.gradient),
    background: mergeConfig(current.background, persisted.background),
    blur: mergeConfig(current.blur, persisted.blur),
    glassmorphism: mergedGlassmorphism,
    visual: mergeConfig(current.visual, persisted.visual),
    animations: mergeConfig(current.animations, persisted.animations),
    editor: mergeConfig(current.editor, persisted.editor),
    qol: mergedQol,
    glowOutline: typeof persisted.glowOutline === 'boolean' ? persisted.glowOutline : current.glowOutline,
    glowColor1: typeof persisted.glowColor1 === 'string' && persisted.glowColor1.length > 0 ? persisted.glowColor1 : current.glowColor1,
    glowColor2: typeof persisted.glowColor2 === 'string' && persisted.glowColor2.length > 0 ? persisted.glowColor2 : current.glowColor2,
    glowOutlineStrength: Number.isFinite(Number(persisted.glowOutlineStrength))
      ? Number(persisted.glowOutlineStrength)
      : current.glowOutlineStrength,
  }
}

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
      toolbar: DEFAULT_TOOLBAR,

      notes: DEFAULT_NOTES,
      glow: DEFAULT_GLOW,
      gradient: DEFAULT_GRADIENT,
      background: DEFAULT_BG,
      blur: DEFAULT_BLUR,
      glassmorphism: DEFAULT_GLASS,
      visual: DEFAULT_VISUAL,
      animations: DEFAULT_ANIMS,
      editor: DEFAULT_EDITOR,
      qol: DEFAULT_QOL,

      glowOutline: true, glowColor1: '#00bcd4', glowColor2: '#2196f3', glowOutlineStrength: 12,

      // ── Actions ──
      setMode: (mode) => set({ mode }),
      setColors: (c) => set(c),
      setGlow: (g) => set((s) => ({ glow: { ...s.glow, ...g } })),
      setGradient: (g) => set((s) => ({ gradient: { ...s.gradient, ...g } })),
      setBackground: (b) => set((s) => ({ background: { ...s.background, ...b } })),
      setBlur: (b) => set((s) => ({ blur: { ...s.blur, ...b } })),
      setGlassmorphism: (g) => set((s) => ({ glassmorphism: { ...s.glassmorphism, ...g } })),
      setVisual: (v) => set((s) => ({ visual: { ...s.visual, ...v } })),
      setAnimations: (a) => set((s) => ({ animations: { ...s.animations, ...a } })),
      setEditor: (e) => set((s) => ({ editor: { ...s.editor, ...e } })),
      setNotes: (n) => set((s) => ({ notes: { ...s.notes, ...n } })),
      setQOL: (q) => set((s) => ({ qol: sanitizeQolConfig(q, s.qol) })),
      setGlobalFont: (globalFont) => set({ globalFont }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setSidebarPosition: (sidebarPosition) => set({ sidebarPosition }),
      setSidebarStyle: (sidebarStyle) => set({ sidebarStyle }),
      setSidebarLabels: (sidebarLabels) => set({ sidebarLabels }),
      setSidebarAccentBg: (sidebarAccentBg) => set({ sidebarAccentBg }),
      setSidebarAutoHide: (v) => set((s) => ({ qol: { ...s.qol, sidebarAutoHide: v } })),
      setBackgroundMode: (m) => set((s) => ({ background: { ...s.background, mode: m } })),
      setPanelBgMode: (m) => set((s) => ({ background: { ...s.background, panelBgMode: m } })),
      setToolbar: (tb) => set((s) => ({ toolbar: { ...s.toolbar, ...tb } })),

      preset: (n) => {
        const p = P[n] as Partial<Theme> | undefined
        if (p) set((s) => ({
          ...s, ...p,
          glow: { ...s.glow, ...p.glow },
          blur: { ...s.blur, ...p.blur },
          background: { ...s.background, ...p.background },
          glassmorphism: { ...s.glassmorphism, ...p.glassmorphism },
        }))
      },
    }),
    {
      name: 'nx-theme-v5',
      storage: createStoreManagerStorage<Theme>({
        debounceMs: 2_800,
        idleTimeoutMs: 1_900,
        flushBudgetMs: 9,
      }),
      merge: (persistedState, currentState) => sanitizeThemeSnapshot(persistedState, currentState as Theme),
    }
  )
)

export const PRESETS = Object.keys(P)

export const PRESET_PREVIEWS = PRESETS.reduce<
  Record<string, { mode: 'dark' | 'light'; accent: string; accent2: string; bg: string }>
>((acc, presetName) => {
  const preset = P[presetName] || {}
  acc[presetName] = {
    mode: (preset.mode === 'light' ? 'light' : 'dark'),
    accent: String(preset.accent || '#007AFF'),
    accent2: String(preset.accent2 || preset.accent || '#5E5CE6'),
    bg: String(preset.bg || '#12141f'),
  }
  return acc
}, {})
