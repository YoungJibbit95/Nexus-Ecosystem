// Haptic feedback wrapper — works in Capacitor native, falls back silently in browser

declare const window: Window & { Capacitor?: any }

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

export async function haptic(style: HapticStyle = 'light') {
  try {
    if (!window.Capacitor?.isNative) {
      // Browser fallback: use Vibration API if available
      if ('vibrate' in navigator) {
        const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 40
        navigator.vibrate(duration)
      }
      return
    }
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    switch (style) {
      case 'light':   await Haptics.impact({ style: ImpactStyle.Light }); break
      case 'medium':  await Haptics.impact({ style: ImpactStyle.Medium }); break
      case 'heavy':   await Haptics.impact({ style: ImpactStyle.Heavy }); break
      case 'success': await Haptics.notification({ type: NotificationType.Success }); break
      case 'warning': await Haptics.notification({ type: NotificationType.Warning }); break
      case 'error':   await Haptics.notification({ type: NotificationType.Error }); break
    }
  } catch {
    // Haptics not available — ignore
  }
}
