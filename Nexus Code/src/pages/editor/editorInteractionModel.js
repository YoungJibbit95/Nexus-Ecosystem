export function getWorkbenchDragPanelId(
  event,
  fallbackPanelId = null,
  mimeType = "application/x-nexus-code-workbench-panel",
) {
  const transfer = event?.dataTransfer;
  if (!transfer) return fallbackPanelId;
  return transfer.getData(mimeType) || transfer.getData("text/plain") || fallbackPanelId;
}

export function getIsCompactCodeViewport(width, compactWidth = 980) {
  const resolvedWidth =
    Number.isFinite(Number(width))
      ? Number(width)
      : typeof window === "undefined"
        ? Number.POSITIVE_INFINITY
        : window.innerWidth;
  return resolvedWidth < compactWidth;
}

export function isEditableEventTarget(target) {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) return true;
  const editable = target.closest(
    'input, textarea, [contenteditable="true"], [role="textbox"]',
  );
  return Boolean(editable);
}
