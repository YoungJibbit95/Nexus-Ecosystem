# Baseline results and test strategy

Run date: 2026-09-30. Implementation base `10f8684`, isolated audit worktree. Host Windows, Node 26.3.1/npm 11.3.0; Electron 42.11.3 embeds Node 24.19.0. Reused installed dependencies through junctions, not a clean Node-24 CI install. Commands run from the ecosystem audit root unless noted. Logs/elapsed times: [fast](evidence/baseline-fast.json), [renderer/public](evidence/baseline-renderer.json).

Historical results below are immutable. [2026-10-01 reconciliation](11-main-reconciliation.md) verifies the original harness at 10/10 against current main `0cb408b`; quoting is fixed by merged V7 work. Fresh pre-Wave-1 build/typecheck results and later foundation gates are stored separately under `evidence/wave-1/`.

## Actual results

| Gate | Exit | Result and coverage boundary |
| --- | --- | --- |
| `npm --prefix "./Nexus Code" run lint` | 0 | Current lint rules pass (55.0s); renderer-focused config, not complete native/type verification |
| `npm --prefix "./Nexus Code" run typecheck` | 2 | 4,353 diagnostics (19.8s); 3,605 in 82 `src` files, remainder shared/vendor. Primary checkout also 4,353. Inherited, not green |
| `npm --prefix "./Nexus Code" run smoke:ide-core` | 0 | 52 model/contract scenarios (5.3s); not a real-user/native suite |
| `npm --prefix "./Nexus Code" run smoke:ui` | 0 | 36 SSR component fixture scenarios across four viewports (5.0s); no DOM interaction/auth |
| `npm --prefix "./Nexus Code" run smoke:visual` | 1 | 119/120 real Electron fixture captures (913.8s). editor-scroll@desktop failed while grammar loaded; retained full log |
| Focused editor-scroll@desktop visual recheck | 0 | One scenario passed (15.6s); full suite was not rerun and remains failed |
| `npm --prefix "./Nexus Code" run test:security` | 0 | Navigation and no-localStorage-token regression assertions with mocked storage (1.1s); not physical disk absence or a full audit |
| `npm --prefix "./Nexus Code" run build` | 0 | Markup tests + permissive tsc build + Vite (26.4s); does not erase full JS type failure |
| `npm run verify:single-react` | 0 | Static alias/peer checks (1.0s), not proof of every runtime bundle |
| `npm run verify:ecosystem` | 0 | Static ecosystem package/config checks (2.0s) |
| `npm run test:public` | 0 | 79 deterministic public discovery/tooling tests (3.8s) |
| `npm run test:persistence:browser` | 0 | Real isolated browser localStorage/IndexedDB/React tests (5.5s), injected native writes; page reload, not native app process restart |
| New native characterization | 1 | 9 pass / 1 reproduced Windows quoted-path failure; production main/preload, no auth bypass |
| Model performance script | 0 | Eight-iteration model timings; not rendering/startup or acceptance SLA |

Raw log links: [lint](evidence/lint.log), [typecheck](evidence/typecheck.log), [primary comparison](evidence/primary-typecheck.log), [IDE core](evidence/ide-core.log), [SSR](evidence/ui.log), [full visual](evidence/visual.log), [focused recheck](evidence/visual-recheck.log), [security](evidence/security.log), [build](evidence/build.log), [single React](evidence/single-react.log), [ecosystem](evidence/ecosystem.log), [public](evidence/public-tests.log), [browser persistence](evidence/browser-persistence.log), [native log](evidence/native-baseline.log), [native result](evidence/native-baseline.json).

## Added protection in Wave 0

`Nexus Code/scripts/run-native-baseline.cjs` boots the actual production main/preload and dist renderer with a fresh profile and disposable workspace. Only the native folder picker is substituted. It captures the production account gate at 1920x1080, 1440x900, 1280x720, 1024x768 and 900x600; no credential or signed-out Editor bypass is introduced.

It checks denied IO before root selection, canonical root registration, real acknowledged empty/Unicode/mixed-EOL writes, traversal/protected metadata/symlink escape rejection, real rename/delete, local Git status/stage/commit, and real stdout/stderr/stdin/exit through the runner. A quoted absolute script path containing spaces fails with MODULE_NOT_FOUND; a relative script path passes with exit 7. The failing assertion remains red so a later fix is measurable. The harness requires Git, built dist and the installed Electron runtime; it does not mutate user Git config or files.

Reproduce from app directory after build:

```powershell
node node_modules/electron/cli.js scripts/run-native-baseline.cjs
```

Native artifacts use unique fixture directories but screenshots/summary have stable output names under `.test-artifacts/nexus-code/native-baseline`. Archive a run before another run. Full visual and focused recheck reused one output directory: the original full metrics summary and failed image were overwritten. [Manifest](evidence/visual-baseline-manifest.json) reconstructs 119 successes/one failure from the retained log; eight selected images are retained in Git. This evidence limit is explicit. Always allocate/retain separate output directories in future fixture improvements.

Earlier `native-baseline-*-attempt.log` files record harness development (capture/setup failures and the initial quote reproduction). The final `native-baseline.log`/`native-baseline.json` are the authoritative 9-pass/1-failure result; earlier fixture setup mistakes are not classified as product regressions.

## Test layers and ownership

1. Pure models: document revisions, tree IDs, docking, registry availability/aliases, schema merge, diagnostics normalization, search ranges/limits. Use representative behavior and races, not implementation-mirroring tests.
2. Boundary contracts: strict TS new ports, preload/main payload/sender/workspace validation, structured errors/disposers, process identity and path quoting. Avoid success fakes for capabilities unavailable in that runtime.
3. Real browser persistence: draft switching, untouched unopened files, failed/late writes, rename/delete serialization, journal fallback and retained legacy/corrupt formats. Keep the existing shared suite.
4. Native integration: disposable projects, production preload/main, file failures, UTF-8/EOL/empty buffers, quoted cwd/paths, process cancellation, local Git mutations and real installed language servers. Treat current red characterization separately from new regressions.
5. Electron UX: authenticated production flow when credentials/testing access are available, keyboard menus/focus/hover/active states, resize, clipping, zoom and reduced motion. Fixture screenshots are support, not acceptance alone. Compare manual findings with assertions.
6. Release/platform: clean supported-Node installs; Windows/macOS/Linux packaging and launch, safeStorage grades, process trees/PTY ABI, upgrades/full restart/force-kill/multi-window. No release-ready statement before that matrix.

## Per-wave gate

Run existing relevant gates and new behavioral protection; compare inherited failures explicitly. Keep full typecheck visible while a strict incremental boundary gate becomes mandatory. A flaky single visual recheck cannot convert a full failed run to green. Run full regression at the final cleanup wave; avoid repeating the 15-minute matrix for documentation-only edits without new concerns. Update feature status/ADRs/checkpoint and commit a bounded packet.

Wave 0 adds test/evidence/docs only. No installer, live GitHub mutation, actual language server, DAP, PTY, authenticated workbench, power-loss or installed upgrade acceptance was performed. Performance and security observations do not substitute for those tests.

Final packet verification: lint passed again (53.6s; [result](evidence/final-lint-result.json)), native/evidence scripts passed syntax checks ([results](evidence/final-syntax-results.json)), and [primary preservation](evidence/primary-preservation.json) confirms the original branch/HEAD/MERGE_HEAD and status stayed unchanged. [Document/link/screenshot checks](evidence/final-document-check.json) pass. [Staged whitespace checks](evidence/final-whitespace-check.json) pass. Lint logs have only their trailing blank line normalized for repository whitespace rules; output content is preserved.

## Wave 1 final gates — 2026-10-01

Reconciliation first used current main `0cb408b`: build passed, full check remained 4,353, and the **unchanged historical harness passed 10/10** ([result](evidence/wave-1/native-historical-harness.json)). The runner was already fixed; no second fix or historical evidence replacement was made.

Foundation commit `7f63f7b` was integrated in the main folder as **`b0d3fc2`**, after the separate shared persistence fix **`f58ebbb`**. Audit commits were copied as `49408da`/`3a96e4d`. Final gates below were rerun in **Nexus-Ecosystem**, against the combined committed source. Foreign Main README/planning adapter changes were preserved, not staged. Early browser/public checks included concurrent persistence edits; final main checks use their separately reviewed committed version, not attributed to Wave 1.

| Gate | Exit | Final result |
| --- | ---: | --- |
| Strict foundation + unit tests | 0 | Zero new-boundary diagnostics; **20/20** ([log](evidence/wave-1/main-foundation.log)) |
| Full typecheck | 2 | **4,353 → 4,270; 0 introduced / 83 removed**, new TS modules zero ([inventory](13-diagnostics.md), [log](evidence/wave-1/main-typecheck.log)) |
| Lint | 0 | Existing renderer ESLint rules pass ([log](evidence/wave-1/main-lint.log)) |
| IDE-core / UI / security | 0 | **52** model cases, **36** SSR fixtures/four viewports; navigation/token regression ([log](evidence/wave-1/main-core-ui-security.log)) |
| Build | 0 | Markup, permissive TS build and production Vite ([log](evidence/wave-1/main-build.log)) |
| Compiled adapters over real native bridge | 0 | **7/7**, isolated account gate, guarded disk IO, runner events ([result](evidence/wave-1/main-native.json), [log](evidence/wave-1/main-native.log)) |
| Ecosystem checks | 0 | single-React, ecosystem, six lockfiles, encoding; **254 public cases: 237 pass / 17 existing skips** ([log](evidence/wave-1/main-ecosystem.log)) |
| Real browser persistence | 0 | **14 stages**, actual IndexedDB/React reload/handoff/recovery, injected native writes ([log](evidence/wave-1/main-browser-persistence.log)) |

Each log has a sibling `*-result.json` binding exit/time/location/source. The first native attempt exposed a localized denial-classification gap; its [failed development result](evidence/wave-1/foundation-native-first-attempt.json) remains, with corrected unit/native gates passing. Main/preload sources are unchanged by Wave 1.

Full visual remains historical **119/120**, with only its focused recheck green. No authenticated Editor/live LSP/GitHub/DAP/PTY/installer/restart/force-kill/upgrade acceptance is claimed. Lockfile consistency is not a clean install. Native GPU/CSP/deprecation warnings remain visible and unsuppressed in logs.

Ignored historical/current test artifacts, available captures, foreign patch/raw files and SHA-256 manifests are centralized under `F:/Coding/Nexus Workspace/.workspace-maintenance/2026-10-01/nexus-code-wave-1/`. Committed historical evidence is unchanged. [Consolidation record](evidence/wave-1/consolidation.json) gives integration/preservation and remaining cleanup status.
