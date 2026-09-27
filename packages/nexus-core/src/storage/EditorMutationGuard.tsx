import { useLayoutEffect, useRef } from 'react'

/** A native modal makes the editor inert while save/rename/delete/switch is in flight. */
export function EditorMutationGuard({ active }: { active: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    if (active && !dialog.current?.open) dialog.current?.showModal()
    if (!active && dialog.current?.open) dialog.current.close()
  }, [active])
  return <dialog ref={dialog} aria-label="Dateioperation" onCancel={event => event.preventDefault()}
    style={{ borderRadius: 12, padding: 24, border: '1px solid #687185', background: '#171b25', color: '#f0f3fa' }}>
    <p role="status">Änderungen werden gespeichert. Dateioperation läuft …</p>
  </dialog>
}
