import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.NEXUS_CODE_UI_SMOKE = "true";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const harnessPath = path.join(projectRoot, "src", "testing", "uiSmokeHarness.jsx");

async function assertHarnessBoundary() {
  const source = await readFile(harnessPath, "utf8");
  const forbiddenImportPatterns = [
    /from\s+["'][^"']*App\.jsx["']/,
    /from\s+["']@\/App(?:\.jsx)?["']/,
  ];

  const importsAppBoot = forbiddenImportPatterns.some((pattern) =>
    pattern.test(source),
  );

  if (importsAppBoot) {
    throw new Error(
      "UI smoke harness must not import App.jsx or the production boot gate.",
    );
  }
}

function formatFailure(failure) {
  return `${failure.id}: missing ${failure.missing.join(", ")}`;
}

let server;

try {
  await assertHarnessBoundary();

  server = await createServer({
    root: projectRoot,
    configFile: false,
    plugins: [react()],
    appType: "custom",
    clearScreen: false,
    logLevel: "error",
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.join(projectRoot, "src"),
        "@nexus/core": path.resolve(projectRoot, "../packages/nexus-core/src"),
        "@nexus/api": path.resolve(
          projectRoot,
          "../packages/nexus-core/src/api",
        ),
      },
    },
    server: {
      middlewareMode: true,
      hmr: false,
    },
    optimizeDeps: {
      noDiscovery: true,
    },
  });

  const smokeModule = await server.ssrLoadModule(
    "/src/testing/uiSmokeHarness.jsx",
  );
  const scenarios = smokeModule.createUiSmokeScenarios();

  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error("UI smoke harness did not provide any scenarios.");
  }

  const results = [];
  const failures = [];

  for (const scenario of scenarios) {
    const markup = renderToStaticMarkup(scenario.render());
    const result = smokeModule.assertUiSmokeMarkup(scenario, markup);
    results.push({ id: scenario.id, title: scenario.title, ...result });

    if (!result.ok) {
      failures.push({ id: scenario.id, missing: result.missing });
    }
  }

  if (failures.length > 0) {
    console.error("[ui-smoke] failed");
    failures.forEach((failure) => {
      console.error(`  - ${formatFailure(failure)}`);
    });
    process.exitCode = 1;
  } else {
    console.log(
      `[ui-smoke] ${results.length} Nexus Code component scenarios rendered without App.jsx boot-gate imports.`,
    );
    results.forEach((result) => {
      console.log(`  ok ${result.id} (${result.bytes} bytes)`);
    });
  }
} catch (error) {
  console.error("[ui-smoke] failed");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
} finally {
  if (server) {
    await server.close();
  }
}
