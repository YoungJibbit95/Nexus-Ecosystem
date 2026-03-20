export const DEFAULT_FONT_STACK = 'system-ui, -apple-system, sans-serif'

const ensureDocument = () => (typeof document !== 'undefined' ? document : null)

export const sanitizeGlobalFont = (
  requestedFont: string | undefined,
  allowedFonts: Iterable<string>,
  fallback = DEFAULT_FONT_STACK,
) => {
  const allowed = new Set(allowedFonts)
  if (!requestedFont) return fallback
  return allowed.has(requestedFont) ? requestedFont : fallback
}

export const applyGlobalFont = (font: string) => {
  const doc = ensureDocument()
  if (!doc) return

  const normalizedFont = font || DEFAULT_FONT_STACK
  doc.body.style.fontFamily = normalizedFont

  const root = doc.getElementById('root')
  if (root) root.style.fontFamily = normalizedFont

  doc.documentElement.style.setProperty('--nx-font', normalizedFont)

  let styleTag = doc.getElementById('nx-font-override')
  if (!styleTag) {
    styleTag = doc.createElement('style')
    styleTag.id = 'nx-font-override'
    doc.head.appendChild(styleTag)
  }

  styleTag.textContent = `*, *::before, *::after { font-family: ${normalizedFont} !important; }`
}

export const applyAccessibilityFlags = (opts: { reducedMotion: boolean; highContrast: boolean }) => {
  const doc = ensureDocument()
  if (!doc) return

  const root = doc.documentElement
  root.classList.toggle('reduce-motion', opts.reducedMotion)
  root.classList.toggle('high-contrast', opts.highContrast)
}

export const applyTypographyScale = (opts: {
  fontSize: number
  baseline?: number
  useUiScale?: boolean
  minUiScale?: number
  maxUiScale?: number
  lockRootFontSizePx?: number
}) => {
  const doc = ensureDocument()
  if (!doc) return

  const {
    fontSize,
    baseline = 14,
    useUiScale = false,
    minUiScale = 0.82,
    maxUiScale = 1.42,
    lockRootFontSizePx,
  } = opts

  const html = doc.documentElement
  html.style.setProperty('--nx-font-size', `${fontSize}px`)

  if (useUiScale) {
    const uiScale = Math.max(minUiScale, Math.min(maxUiScale, fontSize / baseline))
    html.style.setProperty('--nx-ui-scale', uiScale.toFixed(3))
  }

  if (typeof lockRootFontSizePx === 'number') {
    html.style.fontSize = `${lockRootFontSizePx}px`
  } else {
    html.style.fontSize = `${fontSize}px`
  }

  doc.body.style.fontSize = `${fontSize}px`
}

export const applyPanelDensity = (density: 'comfortable' | 'compact' | 'spacious' | string) => {
  const doc = ensureDocument()
  if (!doc) return

  doc.documentElement.setAttribute('data-density', density)
}

export const applySafeAreaInsets = (top: number, bottom: number) => {
  const doc = ensureDocument()
  if (!doc) return

  const html = doc.documentElement
  html.style.setProperty('--sat-top', `${Math.max(0, top)}px`)
  html.style.setProperty('--sat-bottom', `${Math.max(0, bottom)}px`)
}
