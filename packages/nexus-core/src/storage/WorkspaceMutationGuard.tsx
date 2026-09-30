import { useEffect, useRef, useSyncExternalStore } from 'react'
import { workspaceOperation } from './workspaceOperation'

/** Native modal makes the application inert while a workspace operation is awaiting IO. */
export function WorkspaceMutationGuard() {
  const state = useSyncExternalStore(workspaceOperation.subscribe, workspaceOperation.getSnapshot, workspaceOperation.getSnapshot)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (state.kind !== 'idle' && !element.open) element.showModal()
    if (state.kind === 'idle' && element.open) element.close()
  }, [state.kind])
  return <dialog ref={dialog} aria-label="Workspace-Vorgang" onCancel={event => event.preventDefault()} onKeyDown={event => event.stopPropagation()} style={{ border: 0, borderRadius: 12, padding: 24, maxWidth: 420 }}>
    <p role={state.kind === 'recovery' ? 'alert' : 'status'}>{state.message}</p>
    {state.kind === 'recovery' && <button onClick={() => window.location.reload()}>Wiederherstellung erneut versuchen</button>}
  </dialog>
}
