"use strict";

const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { app, BrowserWindow, Menu, session } = require("electron");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const config = JSON.parse(process.env.NEXUS_CODE_VISUAL_SMOKE_CONFIG || "{}");
const baseUrl = String(config.baseUrl || "").replace(/\/$/, "");
const outputDir = config.outputDir || path.join(os.tmpdir(), "nexus-code-visual-smoke");
const scenarios = Array.isArray(config.scenarios) ? config.scenarios : [];
const timeoutMs = Number(config.timeoutMs || 18_000);

if (!baseUrl) {
  throw new Error("NEXUS_CODE_VISUAL_SMOKE_CONFIG.baseUrl is required.");
}

app.setPath("userData", path.join(os.tmpdir(), `nexus-code-visual-smoke-${process.pid}`));
app.commandLine.appendSwitch("disable-http-cache");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.on("window-all-closed", (event) => {
  event?.preventDefault?.();
});

function sanitizeFileName(value) {
  return String(value || "scenario")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function getScenarioUrl(scenario) {
  const url = new URL(`${baseUrl}/__nexus-code-visual-smoke`);
  url.searchParams.set("surface", scenario.surfaceId);
  url.searchParams.set("viewport", scenario.viewportId);
  return url.toString();
}

function toSerializableRect(rect) {
  return {
    x: Math.round(rect.x * 100) / 100,
    y: Math.round(rect.y * 100) / 100,
    width: Math.round(rect.width * 100) / 100,
    height: Math.round(rect.height * 100) / 100,
    top: Math.round(rect.top * 100) / 100,
    right: Math.round(rect.right * 100) / 100,
    bottom: Math.round(rect.bottom * 100) / 100,
    left: Math.round(rect.left * 100) / 100,
  };
}

async function waitForVisualReady(webContents, scenario) {
  const started = Date.now();
  let lastResult = null;

  while (Date.now() - started < timeoutMs) {
    lastResult = await webContents
      .executeJavaScript(
        `
          (() => {
            const result = window.__NEXUS_CODE_VISUAL_SMOKE_RESULT__ || null;
            const scripts = Array.from(document.scripts || []).map((script) => script.src || script.textContent?.slice(0, 80) || "inline");
            return {
              ready: window.__NEXUS_CODE_VISUAL_SMOKE_READY__ === true,
              result,
              location: window.location.href,
              readyState: document.readyState,
              scriptCount: scripts.length,
              scripts,
              rootHtmlLength: document.getElementById('root')?.innerHTML?.length || 0,
              bodyTextLength: document.body?.innerText?.trim()?.length || 0,
            };
          })()
        `,
        true,
      )
      .catch((error) => ({ ready: false, error: error?.message || String(error) }));

    if (lastResult?.ready) return lastResult;
    if (
      lastResult?.readyState === "complete" &&
      lastResult?.rootHtmlLength > 0 &&
      lastResult?.bodyTextLength > 0
    ) {
      await wait(250);
      return { ...lastResult, fallbackReady: true };
    }
    await wait(120);
  }

  throw new Error(
    `${scenario.id} did not become visual-smoke ready within ${timeoutMs}ms. Last state: ${JSON.stringify(lastResult)}`,
  );
}

async function collectLayoutMetrics(webContents, scenario) {
  return webContents.executeJavaScript(
    `
      (() => {
        const scenario = ${JSON.stringify(scenario)};
        const root = document.querySelector('[data-ui-smoke-root="nexus-code"]');
        const frame = document.querySelector('[data-ui-smoke-surface-frame="' + scenario.surfaceId + '"]');
        const textControls = Array.from(document.querySelectorAll('button, [role="button"], input, textarea, select'));
        const overflowControls = textControls
          .map((element, index) => {
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const label =
              element.getAttribute('aria-label') ||
              element.getAttribute('title') ||
              element.innerText ||
              element.value ||
              element.placeholder ||
              element.className ||
              'control-' + index;
            const scrollOverflow =
              element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1;
            const viewportOverflow =
              rect.left < -1 ||
              rect.top < -1 ||
              rect.right > window.innerWidth + 1 ||
              rect.bottom > window.innerHeight + 1;
            return {
              label: String(label).replace(/\\s+/g, ' ').trim().slice(0, 140),
              tag: element.tagName.toLowerCase(),
              width: Math.round(rect.width * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
              scrollWidth: element.scrollWidth,
              scrollHeight: element.scrollHeight,
              clientWidth: element.clientWidth,
              clientHeight: element.clientHeight,
              scrollOverflow,
              viewportOverflow,
            };
          })
          .filter((entry) => entry.scrollOverflow || entry.viewportOverflow);

        const rootRect = root ? root.getBoundingClientRect() : null;
        const frameRect = frame ? frame.getBoundingClientRect() : null;
        const rootOverflow = root
          ? {
              x: root.scrollWidth > root.clientWidth + 1,
              y: root.scrollHeight > root.clientHeight + 1,
              scrollWidth: root.scrollWidth,
              scrollHeight: root.scrollHeight,
              clientWidth: root.clientWidth,
              clientHeight: root.clientHeight,
            }
          : null;
        const documentOverflow = {
          x: document.documentElement.scrollWidth > window.innerWidth + 1,
          y: document.documentElement.scrollHeight > window.innerHeight + 1,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
        };

        return {
          url: window.location.href,
          title: document.title,
          viewport: {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          },
          rootExists: Boolean(root),
          frameExists: Boolean(frame),
          bodyTextLength: document.body?.innerText?.trim()?.length || 0,
          rootRect: rootRect ? ${toSerializableRect.toString()}(rootRect) : null,
          frameRect: frameRect ? ${toSerializableRect.toString()}(frameRect) : null,
          rootOverflow,
          documentOverflow,
          overflowControls: overflowControls.slice(0, 20),
          visualResult: window.__NEXUS_CODE_VISUAL_SMOKE_RESULT__ || null,
        };
      })()
    `,
    true,
  );
}

function analyzeNativeImage(image) {
  const size = image.getSize();
  const bitmap = image.getBitmap();
  const stride = 4;
  const pixelCount = Math.max(1, Math.floor(bitmap.length / stride));
  const sampleEvery = Math.max(1, Math.floor(pixelCount / 12_000));
  const colors = new Set();
  let opaqueSamples = 0;
  let visibleSamples = 0;
  let brightnessTotal = 0;
  let samples = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += sampleEvery) {
    const offset = pixel * stride;
    const blue = bitmap[offset] || 0;
    const green = bitmap[offset + 1] || 0;
    const red = bitmap[offset + 2] || 0;
    const alpha = bitmap[offset + 3] ?? 255;
    const brightness = red + green + blue;

    samples += 1;
    if (alpha > 240) opaqueSamples += 1;
    if (alpha > 16 && brightness > 18) visibleSamples += 1;
    brightnessTotal += brightness;
    colors.add(`${red >> 4}-${green >> 4}-${blue >> 4}-${alpha >> 6}`);
  }

  return {
    width: size.width,
    height: size.height,
    samples,
    colorBuckets: colors.size,
    opaqueRatio: opaqueSamples / samples,
    visibleRatio: visibleSamples / samples,
    averageBrightness: brightnessTotal / samples,
  };
}

function validateResult(scenario, metrics, imageStats) {
  const failures = [];
  const visualResult = metrics.visualResult || null;

  if (!metrics.rootExists) failures.push("missing visual smoke root");
  if (!metrics.frameExists) failures.push("missing visual smoke frame");
  if (visualResult && !visualResult.ok) {
    failures.push(...(visualResult.missing || ["component markup guard failed"]));
  }
  if (metrics.viewport.innerWidth !== scenario.width || metrics.viewport.innerHeight !== scenario.height) {
    failures.push(
      `viewport is ${metrics.viewport.innerWidth}x${metrics.viewport.innerHeight}, expected ${scenario.width}x${scenario.height}`,
    );
  }
  if (!metrics.rootRect || Math.abs(metrics.rootRect.width - scenario.width) > 1 || Math.abs(metrics.rootRect.height - scenario.height) > 1) {
    failures.push("root does not match requested viewport dimensions");
  }
  if (metrics.documentOverflow?.x || metrics.documentOverflow?.y) {
    failures.push(
      `document overflow ${metrics.documentOverflow.scrollWidth}x${metrics.documentOverflow.scrollHeight} for ${scenario.width}x${scenario.height}`,
    );
  }
  if (
    scenario.surfaceId === "launchpad" &&
    scenario.viewportId === "short-wide" &&
    (metrics.rootOverflow?.x || metrics.rootOverflow?.y)
  ) {
    failures.push(
      `launchpad root overflows at 900x512 (${metrics.rootOverflow.scrollWidth}x${metrics.rootOverflow.scrollHeight})`,
    );
  }
  if (metrics.bodyTextLength < 24) failures.push("page body has too little visible text");
  if (imageStats.width < 32 || imageStats.height < 32) failures.push("screenshot is too small");
  if (imageStats.visibleRatio < 0.08) failures.push("screenshot appears blank");
  if (imageStats.colorBuckets < 8) failures.push("screenshot has too little color variance");

  return failures;
}

async function captureScenario(window, scenario) {
  const url = getScenarioUrl(scenario);
  await window.setContentSize(scenario.width, scenario.height, false);
  await window.loadURL(url);
  await waitForVisualReady(window.webContents, scenario);
  await wait(180);

  const metrics = await collectLayoutMetrics(window.webContents, scenario);
  const image = await window.capturePage();
  const imageStats = analyzeNativeImage(image);
  const screenshotPath = path.join(outputDir, `${sanitizeFileName(scenario.id)}.png`);
  await fs.writeFile(screenshotPath, image.toPNG());

  const failures = validateResult(scenario, metrics, imageStats);
  return {
    ok: failures.length === 0,
    failures,
    scenario,
    screenshotPath,
    metrics,
    imageStats,
  };
}

async function run() {
  if (scenarios.length === 0) {
    throw new Error("Visual smoke scenarios are required.");
  }

  await fs.mkdir(outputDir, { recursive: true });
  Menu.setApplicationMenu(null);

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler(() => false);

  const window = new BrowserWindow({
    show: false,
    useContentSize: true,
    width: 1024,
    height: 768,
    minWidth: 320,
    minHeight: 320,
    frame: false,
    transparent: false,
    backgroundColor: "#050712",
    paintWhenInitiallyHidden: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    },
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    const source = sourceId ? `${path.basename(sourceId)}:${line || 0}` : `line:${line || 0}`;
    console.log(`[electron-visual-smoke:renderer] level=${level} ${source} ${message}`);
  });
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame) return;
    console.error(
      `[electron-visual-smoke] renderer did-fail-load code=${errorCode} desc=${errorDescription} url=${validatedUrl}`,
    );
  });
  window.webContents.on("render-process-gone", (_event, details) => {
    console.error(
      `[electron-visual-smoke] renderer gone ${details ? JSON.stringify(details) : "no-details"}`,
    );
  });

  const results = [];

  for (const scenario of scenarios) {
    const result = await captureScenario(window, scenario);
    results.push(result);
    const label = `${scenario.surfaceId}@${scenario.viewportId} ${scenario.width}x${scenario.height}`;
    if (result.ok) {
      console.log(
        `[electron-visual-smoke] ok ${label} -> ${result.screenshotPath} (${result.imageStats.width}x${result.imageStats.height}, ${result.imageStats.colorBuckets} color buckets)`,
      );
    } else {
      console.error(`[electron-visual-smoke] failed ${label}`);
      result.failures.forEach((failure) => console.error(`  - ${failure}`));
      console.error(`  screenshot: ${result.screenshotPath}`);
    }
  }

  const summaryPath = path.join(outputDir, "summary.json");
  await fs.writeFile(
    summaryPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        outputDir,
        total: results.length,
        passed: results.filter((result) => result.ok).length,
        failed: results.filter((result) => !result.ok).length,
        results,
      },
      null,
      2,
    ),
  );

  const failures = results.filter((result) => !result.ok);
  window.destroy();

  if (failures.length > 0) {
    console.error(`[electron-visual-smoke] ${failures.length}/${results.length} scenarios failed. Summary: ${summaryPath}`);
    process.exitCode = 1;
    return;
  }

  console.log(`[electron-visual-smoke] ${results.length} scenarios captured across ${new Set(scenarios.map((scenario) => scenario.viewportId)).size} viewports. Summary: ${summaryPath}`);
}

app.whenReady().then(run).catch((error) => {
  console.error("[electron-visual-smoke] failed");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
}).finally(() => {
  app.exit(process.exitCode || 0);
});
