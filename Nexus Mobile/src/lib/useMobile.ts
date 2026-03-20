import { useState, useEffect } from 'react'

export interface MobileState {
  isMobile: boolean       // < 768px
  isTablet: boolean       // 768–1024px
  isDesktop: boolean      // > 1024px
  isNative: boolean       // running in Capacitor
  safeTop: number         // safe area inset top (notch)
  safeBottom: number      // safe area inset bottom (home bar)
  screenW: number
  screenH: number
  isLandscape: boolean
}

function getSafeArea(side: 'top'|'right'|'bottom'|'left'): number {
  if (typeof window === 'undefined') return 0
  const val = getComputedStyle(document.documentElement).getPropertyValue(`--sat-${side}`)
  return parseInt(val) || 0
}

export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>(() => {
    const w = window.innerWidth, h = window.innerHeight
    return {
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      isNative: !!(window as any).Capacitor?.isNative,
      safeTop: 0, safeBottom: 0,
      screenW: w, screenH: h,
      isLandscape: w > h,
    }
  })

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth, h = window.innerHeight
      const isNative = !!(window as any).Capacitor?.isNative
      setState({
        isMobile: w < 768,
        isTablet: w >= 768 && w < 1024,
        isDesktop: w >= 1024,
        isNative,
        safeTop: getSafeArea('top'),
        safeBottom: getSafeArea('bottom'),
        screenW: w, screenH: h,
        isLandscape: w > h,
      })
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    // initial safe area read after layout
    setTimeout(update, 100)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return state
}
