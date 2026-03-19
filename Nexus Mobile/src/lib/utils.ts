export const cn = (...c: any[]) => c.filter(Boolean).join(' ')
export const hexToRgb = (h: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '0,0,0'
}

const normalizeHex = (hex: string) => {
  const raw = hex.trim().replace('#', '')
  if (raw.length === 3) {
    return `#${raw.split('').map((c) => `${c}${c}`).join('')}`
  }
  if (raw.length === 6) return `#${raw}`
  return '#000000'
}

const toRgb = (hex: string) => {
  const n = normalizeHex(hex)
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(n)
  if (!m) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  }
}

const srgbToLinear = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export const relativeLuminance = (hex: string) => {
  const { r, g, b } = toRgb(hex)
  return (0.2126 * srgbToLinear(r)) + (0.7152 * srgbToLinear(g)) + (0.0722 * srgbToLinear(b))
}

export const contrastRatio = (a: string, b: string) => {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export const pickReadableText = (bg: string, light = '#ffffff', dark = '#111111') => {
  const cLight = contrastRatio(bg, light)
  const cDark = contrastRatio(bg, dark)
  return cLight >= cDark ? light : dark
}

export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
export const fmtDt = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}
