export type CanvasViewport = {
  panX: number;
  panY: number;
  zoom: number;
};

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const requestFrame = (cb: () => void): number => {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(cb);
  }
  return setTimeout(cb, 16) as unknown as number;
};

const cancelFrame = (id: number) => {
  if (typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(id);
    return;
  }
  clearTimeout(id);
};

const easeOutCubic = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

export const animateCanvasViewport = (options: {
  from: CanvasViewport;
  to: CanvasViewport;
  onUpdate: (next: CanvasViewport) => void;
  durationMs?: number;
  reducedMotion?: boolean;
  ease?: (t: number) => number;
}): (() => void) => {
  const {
    from,
    to,
    onUpdate,
    durationMs = 280,
    reducedMotion = false,
    ease = easeOutCubic,
  } = options;

  const safeDuration = reducedMotion ? 0 : Math.max(0, durationMs);
  if (safeDuration <= 0) {
    onUpdate(to);
    return () => {
      // no-op
    };
  }

  const startedAt = nowMs();
  let rafHandle = 0;
  let cancelled = false;

  const step = () => {
    if (cancelled) return;
    const elapsed = nowMs() - startedAt;
    const progress = Math.max(0, Math.min(1, elapsed / safeDuration));
    const eased = ease(progress);
    onUpdate({
      panX: from.panX + (to.panX - from.panX) * eased,
      panY: from.panY + (to.panY - from.panY) * eased,
      zoom: from.zoom + (to.zoom - from.zoom) * eased,
    });
    if (progress >= 1) {
      onUpdate(to);
      return;
    }
    rafHandle = requestFrame(step);
  };

  rafHandle = requestFrame(step);

  return () => {
    if (cancelled) return;
    cancelled = true;
    if (rafHandle) {
      cancelFrame(rafHandle);
      rafHandle = 0;
    }
  };
};

