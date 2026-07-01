import { runIdeCoreSmoke } from "../src/testing/ideCoreSmoke.mjs";

try {
  const results = await runIdeCoreSmoke();
  console.log(
    `[ide-core-smoke] ${results.length} Nexus Code IDE-core scenarios passed.`,
  );
  results.forEach((result) => {
    console.log(`  ok ${result.id} (${result.ms}ms)`);
  });
} catch (error) {
  console.error("[ide-core-smoke] failed");
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
}
