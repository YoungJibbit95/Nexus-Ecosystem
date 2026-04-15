export const cn = (...c: any[]) => c.filter(Boolean).join(' ')
export const hexToRgb = (h: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h)
  return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : '0,0,0'
}
export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36)
export const fmtDt = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date)
}
