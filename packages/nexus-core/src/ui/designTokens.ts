import { getNexusViewManifest, type NexusViewLayoutDensity } from '../views'

export type NexusUiThemeMode = 'light' | 'dark' | 'high-contrast'
export type NexusUiSurface = 'desktop' | 'tablet' | 'mobile'

export type NexusUiColorTokens = {
  accent: string
  background: string
  surface: string
  surfaceElevated: string
  border: string
  text: string
  textMuted: string
  success: string
  warning: string
  danger: string
  info: string
}

export type NexusUiSpacingTokens = {
  unit: number
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  toolbarHeight: number
  statusBarHeight: number
  touchTarget: number
}

export type NexusUiTypographyTokens = {
  body: number
  meta: number
  panelTitle: number
  viewTitle: number
  lineHeight: number
  fontWeightBody: number
  fontWeightStrong: number
}

export type NexusUiRadiusTokens = {
  control: number
  panel: number
  sheet: number
  pill: number
}

export type NexusUiMotionTokens = {
  quickMs: number
  regularMs: number
  panelMs: number
  easing: string
}

export type NexusViewUiTokenSet = {
  viewId: string
  themeMode: NexusUiThemeMode
  density: NexusViewLayoutDensity
  surface: NexusUiSurface
  colors: NexusUiColorTokens
  spacing: NexusUiSpacingTokens
  typography: NexusUiTypographyTokens
  radius: NexusUiRadiusTokens
  motion: NexusUiMotionTokens
}

export type NexusViewUiTokenOptions = {
  viewId: string
  themeMode?: NexusUiThemeMode
  density?: NexusViewLayoutDensity
  surface?: NexusUiSurface
  accent?: string
  reducedMotion?: boolean
}

const FALLBACK_ACCENT = '#64d2ff'

const DENSITY_SCALE: Record<NexusViewLayoutDensity, number> = {
  compact: 0.86,
  comfortable: 1,
  spacious: 1.16,
}

const round = (value: number) => Math.round(value * 100) / 100

const scale = (
  value: number,
  density: NexusViewLayoutDensity,
  surface: NexusUiSurface,
) => {
  const surfaceScale = surface === 'mobile' ? 0.92 : surface === 'tablet' ? 0.96 : 1
  return round(value * DENSITY_SCALE[density] * surfaceScale)
}

const resolveMode = (mode: NexusUiThemeMode) => {
  if (mode === 'light') {
    return {
      background: '#f6f8fb',
      surface: 'rgba(255,255,255,0.78)',
      surfaceElevated: 'rgba(255,255,255,0.92)',
      border: 'rgba(20,30,45,0.12)',
      text: '#101522',
      textMuted: 'rgba(16,21,34,0.62)',
    }
  }

  if (mode === 'high-contrast') {
    return {
      background: '#000000',
      surface: '#080808',
      surfaceElevated: '#101010',
      border: 'rgba(255,255,255,0.42)',
      text: '#ffffff',
      textMuted: 'rgba(255,255,255,0.78)',
    }
  }

  return {
    background: '#080a12',
    surface: 'rgba(10,12,20,0.72)',
    surfaceElevated: 'rgba(14,17,28,0.92)',
    border: 'rgba(255,255,255,0.12)',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.64)',
  }
}

export const resolveNexusViewUiTokens = ({
  viewId,
  themeMode = 'dark',
  density = 'comfortable',
  surface = 'desktop',
  accent,
  reducedMotion = false,
}: NexusViewUiTokenOptions): NexusViewUiTokenSet => {
  const manifest = getNexusViewManifest(viewId)
  const resolvedAccent = accent || manifest?.accent || FALLBACK_ACCENT
  const modeTokens = resolveMode(themeMode)

  return {
    viewId,
    themeMode,
    density,
    surface,
    colors: {
      accent: resolvedAccent,
      ...modeTokens,
      success: '#30d158',
      warning: '#ffd60a',
      danger: '#ff453a',
      info: '#64d2ff',
    },
    spacing: {
      unit: 4,
      xs: scale(4, density, surface),
      sm: scale(8, density, surface),
      md: scale(12, density, surface),
      lg: scale(16, density, surface),
      xl: scale(24, density, surface),
      toolbarHeight: scale(surface === 'mobile' ? 34 : 40, density, surface),
      statusBarHeight: scale(surface === 'mobile' ? 30 : 28, density, surface),
      touchTarget: surface === 'mobile' ? 44 : scale(34, density, surface),
    },
    typography: {
      body: scale(surface === 'mobile' ? 13 : 14, density, surface),
      meta: scale(surface === 'mobile' ? 10 : 11, density, surface),
      panelTitle: scale(surface === 'mobile' ? 12 : 13, density, surface),
      viewTitle: scale(surface === 'mobile' ? 18 : 22, density, surface),
      lineHeight: surface === 'mobile' ? 1.28 : 1.35,
      fontWeightBody: 650,
      fontWeightStrong: 850,
    },
    radius: {
      control: surface === 'mobile' ? 8 : 7,
      panel: surface === 'mobile' ? 12 : 8,
      sheet: surface === 'mobile' ? 14 : 10,
      pill: 999,
    },
    motion: {
      quickMs: reducedMotion ? 1 : 140,
      regularMs: reducedMotion ? 1 : 210,
      panelMs: reducedMotion ? 1 : 260,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  }
}

export type NexusViewCssVars = Record<`--${string}`, string>

export const buildNexusViewCssVars = (
  tokens: NexusViewUiTokenSet,
): NexusViewCssVars => ({
  '--nx-ui-accent': tokens.colors.accent,
  '--nx-ui-background': tokens.colors.background,
  '--nx-ui-surface': tokens.colors.surface,
  '--nx-ui-surface-elevated': tokens.colors.surfaceElevated,
  '--nx-ui-border': tokens.colors.border,
  '--nx-ui-text': tokens.colors.text,
  '--nx-ui-text-muted': tokens.colors.textMuted,
  '--nx-ui-success': tokens.colors.success,
  '--nx-ui-warning': tokens.colors.warning,
  '--nx-ui-danger': tokens.colors.danger,
  '--nx-ui-info': tokens.colors.info,
  '--nx-ui-space-xs': `${tokens.spacing.xs}px`,
  '--nx-ui-space-sm': `${tokens.spacing.sm}px`,
  '--nx-ui-space-md': `${tokens.spacing.md}px`,
  '--nx-ui-space-lg': `${tokens.spacing.lg}px`,
  '--nx-ui-space-xl': `${tokens.spacing.xl}px`,
  '--nx-ui-toolbar-height': `${tokens.spacing.toolbarHeight}px`,
  '--nx-ui-statusbar-height': `${tokens.spacing.statusBarHeight}px`,
  '--nx-ui-touch-target': `${tokens.spacing.touchTarget}px`,
  '--nx-ui-font-body': `${tokens.typography.body}px`,
  '--nx-ui-font-meta': `${tokens.typography.meta}px`,
  '--nx-ui-font-panel-title': `${tokens.typography.panelTitle}px`,
  '--nx-ui-font-view-title': `${tokens.typography.viewTitle}px`,
  '--nx-ui-line-height': String(tokens.typography.lineHeight),
  '--nx-ui-weight-body': String(tokens.typography.fontWeightBody),
  '--nx-ui-weight-strong': String(tokens.typography.fontWeightStrong),
  '--nx-ui-radius-control': `${tokens.radius.control}px`,
  '--nx-ui-radius-panel': `${tokens.radius.panel}px`,
  '--nx-ui-radius-sheet': `${tokens.radius.sheet}px`,
  '--nx-ui-radius-pill': `${tokens.radius.pill}px`,
  '--nx-ui-motion-quick': `${tokens.motion.quickMs}ms`,
  '--nx-ui-motion-regular': `${tokens.motion.regularMs}ms`,
  '--nx-ui-motion-panel': `${tokens.motion.panelMs}ms`,
  '--nx-ui-motion-easing': tokens.motion.easing,
})
