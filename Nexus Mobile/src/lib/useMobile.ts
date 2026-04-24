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

function readViewportSize() {
  if (typeof window === 'undefined') return { width: 390, height: 844 }
  const viewport = window.visualViewport
  const fallbackWidth = Math.max(120, Math.round(window.innerWidth || 390))
  const fallbackHeight = Math.max(120, Math.round(window.innerHeight || 844))
  const viewportWidth = Number(viewport?.width)
  const viewportHeight = Number(viewport?.height)
  const width = Math.round(
    Number.isFinite(viewportWidth) && viewportWidth >= 120
      ? viewportWidth
      : fallbackWidth,
  )
  const height = Math.round(
    Number.isFinite(viewportHeight) && viewportHeight >= 120
      ? viewportHeight
      : fallbackHeight,
  )
  return { width, height }
}

export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>(() => {
    const { width: w, height: h } = readViewportSize()
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
    let rafId: number | null = null
    const update = () => {
      const { width: w, height: h } = readViewportSize()
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
    const queueUpdate = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        update()
      })
    }
    const viewport = window.visualViewport
    window.addEventListener('resize', queueUpdate, { passive: true })
    window.addEventListener('orientationchange', queueUpdate)
    viewport?.addEventListener('resize', queueUpdate)
    viewport?.addEventListener('scroll', queueUpdate)
    // initial safe area read after layout
    queueUpdate()
    const warmupTimer = window.setTimeout(queueUpdate, 80)
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
      window.clearTimeout(warmupTimer)
      window.removeEventListener('resize', queueUpdate)
      window.removeEventListener('orientationchange', queueUpdate)
      viewport?.removeEventListener('resize', queueUpdate)
      viewport?.removeEventListener('scroll', queueUpdate)
    }
  }, [])

  return state
}
