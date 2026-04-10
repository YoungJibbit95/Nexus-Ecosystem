const DEFAULT_MAX_REPORTS_PER_MINUTE = 36;
const DEFAULT_LONG_TASK_THRESHOLD_MS = 70;
const DEFAULT_INTERACTION_THRESHOLD_MS = 90;

export function installRuntimeLagProbe(options = {}) {
  const {
    enabled = true,
    maxReportsPerMinute = DEFAULT_MAX_REPORTS_PER_MINUTE,
    longTaskThresholdMs = DEFAULT_LONG_TASK_THRESHOLD_MS,
    interactionThresholdMs = DEFAULT_INTERACTION_THRESHOLD_MS,
    onEvent,
  } = options;

  if (!enabled || typeof window === "undefined" || typeof performance === "undefined") {
    return () => {};
  }

  const minuteWindowMs = 60_000;
  const reportTimestamps = [];

  const canEmit = () => {
    const now = performance.now();
    while (reportTimestamps.length > 0 && now - reportTimestamps[0] > minuteWindowMs) {
      reportTimestamps.shift();
    }
    if (reportTimestamps.length >= maxReportsPerMinute) return false;
    reportTimestamps.push(now);
    return true;
  };

  const emit = (event) => {
    if (!canEmit()) return;
    if (typeof onEvent === "function") {
      onEvent(event);
    }
  };

  const perfObserverSupported =
    typeof PerformanceObserver !== "undefined" &&
    Array.isArray(PerformanceObserver.supportedEntryTypes) &&
    PerformanceObserver.supportedEntryTypes.includes("longtask");

  let perfObserver = null;
  if (perfObserverSupported) {
    perfObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        const durationMs = Number(entry.duration || 0);
        if (durationMs < longTaskThresholdMs) continue;
        emit({
          kind: "long-task",
          durationMs,
          name: String(entry.name || "unknown"),
          at: performance.now(),
        });
      }
    });
    perfObserver.observe({ type: "longtask", buffered: true });
  }

  const trackInteraction = (interaction) => {
    const startedAt = performance.now();
    requestAnimationFrame(() => {
      const durationMs = performance.now() - startedAt;
      if (durationMs < interactionThresholdMs) return;
      emit({
        kind: "interaction-lag",
        durationMs,
        interaction,
        at: performance.now(),
      });
    });
  };

  const onPointerDown = () => trackInteraction("pointerdown");
  const onClick = () => trackInteraction("click");
  const onKeyDown = () => trackInteraction("keydown");

  window.addEventListener("pointerdown", onPointerDown, { passive: true });
  window.addEventListener("click", onClick, { passive: true });
  window.addEventListener("keydown", onKeyDown, { passive: true });

  return () => {
    window.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("click", onClick);
    window.removeEventListener("keydown", onKeyDown);
    if (perfObserver) perfObserver.disconnect();
  };
}
