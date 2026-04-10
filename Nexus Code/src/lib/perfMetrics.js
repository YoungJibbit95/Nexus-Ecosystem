const metricStarts = new Map();

function getNow() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function getRuntimeFromWindow() {
  if (typeof window === "undefined") return null;
  return window["__NEXUS_CODE_RUNTIME__"] || null;
}

function getViteEnv() {
  const meta = /** @type {any} */ (import.meta);
  return meta?.env || null;
}

function sendToRuntime(metricName, valueMs) {
  const runtime = getRuntimeFromWindow();
  const recordFn = runtime?.performance?.recordCustomMetric;
  if (typeof recordFn !== "function") return;
  try {
    recordFn.call(runtime.performance, metricName, Number(valueMs.toFixed(2)), "ms");
  } catch {
    // keep metric pipeline non-blocking
  }
}

export function beginPerfMetric(metricName) {
  if (!metricName) return;
  metricStarts.set(metricName, getNow());
}

export function markPerfMetric(metricName, valueMs, detail = {}) {
  if (!metricName || !Number.isFinite(valueMs)) return null;
  const rounded = Number(valueMs.toFixed(2));
  sendToRuntime(metricName, rounded);
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("nx-code-perf", {
          detail: { metric: metricName, valueMs: rounded, ...detail },
        }),
      );
    } catch {
      // noop
    }
  }
  const env = getViteEnv();
  if (env?.PROD && env?.VITE_NEXUS_PERF_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.info(`[NexusCode:perf] ${metricName}=${rounded}ms`);
  }
  return rounded;
}

export function endPerfMetric(metricName, detail = {}) {
  const start = metricStarts.get(metricName);
  if (!Number.isFinite(start)) return null;
  metricStarts.delete(metricName);
  const elapsed = Math.max(0, getNow() - start);
  return markPerfMetric(metricName, elapsed, detail);
}
