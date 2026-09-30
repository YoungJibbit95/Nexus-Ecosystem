import { createContext, useContext } from 'react'
import { workspaceOperation } from '@nexus/core/storage/workspaceOperation'

const ActiveViewCommandScope = createContext(true)
export const ViewCommandScope = ActiveViewCommandScope.Provider
export const useActiveViewCommandScope = () => useContext(ActiveViewCommandScope)

export const isEditableShortcutTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null
  return Boolean(element && (
    element.isContentEditable ||
    element.closest?.('input, textarea, select, [role="textbox"], [contenteditable]:not([contenteditable="false"])')
  ))
}

export const isViewCommandScopeActive = (active: boolean) => active && !workspaceOperation.isActive()

export const canHandleViewKeyboardEvent = (event: KeyboardEvent, active: boolean) =>
  isViewCommandScopeActive(active) && !event.defaultPrevented &&
  !event.isComposing && event.keyCode !== 229 && !event.repeat

export const hasPlainShortcutModifiers = (event: KeyboardEvent) =>
  event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
