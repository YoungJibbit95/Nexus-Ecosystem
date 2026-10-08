import { useEffect, useRef } from 'react'
import { isViewCommandScopeActive, useActiveViewCommandScope } from './ViewCommandScope'

export function useDialogFocus(onClose: () => void) {
  const active = useActiveViewCommandScope(), ref = useRef<HTMLDivElement>(null), close = useRef(onClose)
  const currentScope = useRef(active); currentScope.current = active
  close.current = onClose
  useEffect(() => {
    if (!active) return
    const previous = document.activeElement as HTMLElement | null
    const shell = ref.current?.closest<HTMLElement>('.nx-mobile-v6-view-shell')
    const controls = () => [...ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]') || []].filter(item => item.checkVisibility())
    const frame = requestAnimationFrame(() => (ref.current?.querySelector<HTMLElement>('input') || controls()[0] || ref.current)?.focus())
    const keydown = (event: KeyboardEvent) => {
      if (!isViewCommandScopeActive(active) || event.defaultPrevented || event.isComposing) return
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current() }
      if (event.key === 'Tab') {
        const items = controls(), first = items[0], last = items[items.length - 1]
        if (!first) { event.preventDefault(); ref.current?.focus() }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown, true)
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener('keydown', keydown, true)
      if (currentScope.current) requestAnimationFrame(() => {
        if (shell && (!shell.isConnected || shell.dataset.active !== 'true')) return
        if (previous && previous !== document.body && previous !== document.documentElement && previous.isConnected && previous.checkVisibility()) previous.focus()
        else shell?.querySelector<HTMLElement>('button')?.focus()
      })
    }
  }, [active])
  return ref
}
