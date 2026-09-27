# Test architecture and protection plan

Audit baseline `d39cfa2`, 2026-09-27, existing Windows checkout. Node `v26.3.1`; installed TypeScript `6.0.3`. The reports existed as untracked drafts when this session began; results below were freshly checked rather than accepted from those drafts. No dependency install, production edit or permanent test implementation occurred. Commands below ran from the repository root. Existing release/IPC tests created and removed their own synthetic fixtures. A passing source inspection or mocked model test is not a browser, native-device or live-server result.

## Executed checks

| Command / check | Result | What it establishes and what it does not |
| --- | --- | --- |
| `node tools/typecheck-nexus-core.mjs` | PASS | Shared core compiles under current non-strict config; not all exports are used/behaviorally correct |
| `node "Nexus Main/node_modules/typescript/bin/tsc" -p "Nexus Main/tsconfig.json" --noEmit --pretty false` | PASS | Main configured TypeScript graph checks; no build output written |
| Same command using `Nexus Mobile` paths | PASS | Mobile configured TypeScript graph checks; no native validation |
| Same installed compiler, `-p "Nexus Code/jsconfig.json" --noEmit --pretty false` | FAIL: 4,345 diagnostic lines | JS checking is currently not a usable green gate; count includes dependencies and type-resolution/config noise |
| `npm --prefix packages/nexus-core test` | PASS: 13 tests, 11-manifest source verification | Bounded execution, quick capture and artifact behavior; manifest shape/contents, not user-flow parity |
| Selected Node suites listed below | PASS: 25/25 | Release signing/checksum helpers, Main IPC and selected source/UI/privacy contracts |
| `node "Nexus Code/scripts/run-ide-core-smoke.mjs"` | PASS: 52/52 scenarios | Editor/LSP documents/protocol, models, commands/layout/extensions and service fixtures; not a real language server or OS integration run |
| `node tools/verify-single-react.mjs` | PASS | Configured React resolution check; not all runtime lifecycle behavior |
| `node tools/verify-encoding.mjs` | PASS | Repository encoding scan; structural audit-document validation is separate |
| `node tools/verify-ecosystem.mjs` | FAIL: 87/88 checks passed | Fails Main Linux icon path expectation; actual icons/config moved in `9e831a4`. Also discovers optional locally present sibling tools, so check denominator varies by workspace |
| Direct `devtools-policy.test.mjs` and Code-Mobile `DebugPanel.test.mjs` | 1 PASS / 1 FAIL | Debug preview labeling passes; core policy test fails at module load because `register-typescript-hooks.mjs` is absent, before any policy assertion |
| Five in-memory behavioral probes below | Expected defect/limitation observations confirmed | Actual exported function logic with synthetic dependencies; not affected-user counts or real browser/device trials |
| AST/import, copy comparison, PostCSS, config and Git-history inspection | Completed | Structural evidence with documented counting and reachability limits |

The 25-test batch was:

```powershell
node --test tools/release-hardening.test.mjs `
  "Nexus Main/electron/ipc-handlers.test.cjs" `
  "Nexus Main/src/app/mainAuthLogout.test.mjs" `
  "Nexus Main/src/components/WelcomeWalkthrough.test.mjs" `
  "Nexus Main/src/views/files-flux-settings-hardening.test.mjs" `
  "Nexus Mobile/src/app/mobileLayout.test.mjs" `
  "Nexus Mobile/src/app/privacyMigrations.test.mjs" `
  "Nexus Mobile/src/views/notes-security.test.mjs" `
  "Nexus Code/src/testing/markupText.test.mjs" `
  "Nexus Code Mobile/src/app-security.test.mjs"
```

The separately invoked tests were:

```powershell
node --test packages/nexus-core/test/devtools-policy.test.mjs `
  "Nexus Code Mobile/src/components/editor/DebugPanel.test.mjs"
```

The fresh JS diagnostic run captured compiler output in memory and counted lines matching `error TS<number>:`; compiler exit status was 2. Leading categories: TS7006 1,881; TS2339 733; TS7031 643; TS7026 244; TS2322 204; TS7053 162; TS2741 131. React dependency JS contributes 251 diagnostics from its development file and 138 from production. Application concentrations include `extensionSystem.js` (236), `Editor.jsx` (211) and `GitPanel.jsx` (107); shared CanvasMagicRenderers also contributes (137). Do not turn this into 4,345 bug tickets or suppress all diagnostics. First establish intended JS/type dependency scope; then classify actionable errors and protect a narrowing baseline.

## Existing test locations and discovery

| Area | Tracked test/harness entry points | Discovery and coverage limit |
| --- | --- | --- |
| Main | `electron/ipc-handlers.test.cjs`; `src/app/mainAuthLogout.test.mjs`; `src/components/WelcomeWalkthrough.test.mjs`; `src/views/files-flux-settings-hardening.test.mjs` | All four are explicitly listed by `test:release-ui`. Mixed executable helper/IPC fixtures and source-pattern assertions; no comprehensive mounted-feature suite |
| Mobile | `src/app/mobileLayout.test.mjs`; `src/app/privacyMigrations.test.mjs`; `src/views/notes-security.test.mjs` | Explicit `test:security-ui` list. Layout/privacy coverage does not exercise gestures, reminder scheduling or persistence restarts |
| Code | `src/testing/markupText.test.mjs`; `scripts/run-ide-core-smoke.mjs`; `scripts/run-ui-smoke.mjs`; `scripts/run-electron-visual-smoke.mjs`; `scripts/security-attack-regression.mjs` | Build runs markup tests. IDE model, browser/visual and security harnesses are separate entry points, with different environment needs. Only markup and IDE-core scenarios were executed here |
| Code Mobile | `src/app-security.test.mjs`; `src/components/editor/DebugPanel.test.mjs` | Normal `test:security` names only the first file. The second was explicitly invoked during this audit |
| Core | `test/executionEngine.test.mjs`; `test/devtools-artifacts.test.mjs`; `test/quickCapture.test.mjs`; `test/devtools-policy.test.mjs` | Normal test script lists only the first three, plus `verify-nexus-core.mjs`. The fourth has a missing import and fails before assertions |
| Root release | `tools/release-hardening.test.mjs` | Signing/checksum behavior with synthetic keys/files, plus workflow source assertions; no installer or signing account was exercised |
| Native projects | Each Mobile Android tree contains `ExampleUnitTest.java` and `ExampleInstrumentedTest.java` | Template-level test presence is not evidence of Nexus domain or plugin integration coverage; not executed |
| Wiki | `scripts/check-wiki-i18n.ts`, `scripts/check-bundle-budget.mjs` | Content/bundle checks in `build:ci`; no user-feature test suite inferred from them; inspected, not executed |

Inventory used tracked files and package/workflow scripts. Ignored generated dependency/platform tests were excluded. No consolidated root test discovery exists; adding a test file alone does not ensure that any normal build or CI job runs it.

## What builds and CI actually protect

Parsed TypeScript root-file inventories: Main 173 files (170 TS implementations + three declarations); Mobile 111 (110 + one); Code three (one TS implementation + two declarations); Code Mobile three (one + two). These are config entry roots, not every transitive dependency.

- Main build runs release UI tests, `tsc -b`, Vite and preview verification.
- Mobile build runs security UI tests, `tsc -b` and Vite.
- Code build runs markup tests, `tsc -b` and Vite, but that TS config does not enable JS checking. The independent `typecheck` script uses `jsconfig.json` and currently fails.
- Code Mobile build runs its security suite and Vite; it does not invoke TypeScript.
- Core package test omits `devtools-policy.test.mjs`. Its first import references a helper absent both from tracked files and the checkout. Code-Mobile Debug's test is also not included by its normal package test command.
- `tools/verify-nexus-core.mjs` checks a hardcoded set of 11 manifests; Calendar is absent from that list.
- `.github/workflows/contract-parity-e2e.yml` installs/builds clients and runs static verification/public checks. No browser-driven E2E flow is present. Its name should not be used as evidence of Notes, Canvas or handoff parity.
- Main UI workflow uses Windows/Node 24; contract parity uses Node 20. This audit's local Node 26 result does not establish CI equivalence.
- Code provides component/UI and Electron visual-smoke harnesses. They intentionally bypass the account shell and are valuable for surface regression; they do not test real login/boot. They were inspected, not run.

No full production build, complete lint/security runner, dependency audit, installer, browser screenshot, real Electron process/LSP integration, native Android/iOS test or live Cloud call was run. These omissions are explicit limits, not passed checks. Broad builds were unnecessary for a documentation-only change and can update build artifacts; focused checks supplied the relevant evidence.

## Behavioral probe recipes and limits

No probe script or production fix was added. Inline Node/TypeScript/VM harnesses operated only on synthetic memory. The following recipes specify fixture, trigger and oracle so future characterization tests can be implemented independently.

| Probe | Fixture and invocation | Observed oracle |
| --- | --- | --- |
| Code migration, desktop | Parse actual `loadFilesFromStorage`/`saveFilesToStorage` declarations with TypeScript; execute against immediate in-memory storage and fresh module caches. Seed legacy `nexus-code-files` with file `f1`, content `VALUABLE TEXT`. Load, then reset caches and load again | First result has text; legacy key removed; second result has empty text |
| Code migration, mobile | Same method with Code-Mobile declarations and constants | Same loss on second load |
| Main IDB failure | Transpile actual adapter **and actual fallback manager** with Map-backed localStorage, fake timers/idle/RAF and an IndexedDB open that asynchronously fails. Seed legacy note `OLD`, enqueue `NEW`, inspect before/drain timers, then enqueue `LATER` | Old fallback removed before commit; no keys remain after first failed batch; later write creates valid meta/notes segments containing `LATER`. Both Mobile modules are identical after newline normalization |
| Backup validation | Transpile actual backup module; create valid snapshot, alter checksum and parse. Separately parse `{schemaVersion:1,data:{app:{},canvas:{}}}` | Altered checksum accepted; incomplete object throws in statistics construction rather than returning a clean parse failure |
| Dormant fingerprint | Invoke actual `buildWorkspaceRuntimeFingerprint` on otherwise equal snapshots, changing reminder `title`/`msg` and folders | Fingerprint unchanged. Demonstrates omitted inputs, not an active autosync failure because hook is unmounted |

These probes isolate defects but do not test actual quota, transaction abort, process kill, browser unload or installed plugin behavior. Storage promises/queue timing need real browser integration tests as well as deterministic fake-storage fixtures.

## Required protection before migration

Each row lists characterization (existing behavior), stable contracts, persistence/migration and integration/UI protection. New assertions may intentionally reject an existing defect, but that correction must be named instead of treating data loss as compatibility to preserve.

| Risk area | Characterization and contract tests | Persistence / migration tests | Integration / UI smoke |
| --- | --- | --- | --- |
| Main/Mobile storage | Key/envelope compatibility; enqueue versus commit; coalescing; reads during hydration; delete ordering; error reporting | Legacy monolith/segments; corrupt/missing segment; IDB open/transaction/quota failure; crash/restart at each boundary; no legacy deletion before verified commit; unsupported version retained | Real browser IDB reload; hidden tab and fast close; latest note recoverable after failure; fallback recovery |
| Code local files | IDs, names, folders/order, empty versus absent content, deletion, settings defaults; local/native mode separation | The reproduced legacy restart case in both clients; existing v2; interrupted content/index writes; quota failure; stale caches; duplicate/unknown IDs; corrupt index; rollback after migration | Edit/open/close/reload several files; legacy profile import; failure indicator agrees with durable data; native workspace unchanged |
| Workspace/handoff/backup | Current replace/merge/empty-array policy; active IDs; linked entities; preview counts/conflicts; checksum semantics | Malformed and future schema; invalid entity shapes; checksum mismatch; unknown fields; failed apply; restart recovery; stale files and runtime JSON precedence; lossless Main↔Mobile roundtrip | Import into populated workspace; pre-restore snapshot recovery; mounted draft during same-ID restore; no half-applied state shown as success |
| Notes/drafts | Selection, undo/redo, autosave, dirty close prompt; cross-domain capture IDs; external revision handling | Flush before navigation/close; persistence rejection; same-ID restore; late worker analysis ignored after note switch | Rapid note switch/type/undo, hidden cached view, background tab, close/reopen, theme/toolbar screenshots |
| Tasks/Calendar | Task/subtask transition and dependency rules; due dates, completion, repeat and ICS parse warnings | Snapshot normalization; deletion link policy; imported IDs; timezone/DST and all-day/recurrence fixtures | Reschedule from Calendar reflected in Tasks/Reminders; import preview/cancel/confirm; no separate calendar authority introduced |
| Reminders | Due/overdue/quiet hours/snooze/repeat/dedupe; schedule ID stability; view never mounted/hidden/remounted | Permission changes; restart reconciliation; canceled/deleted reminders; overlapping schedule generations | Fake native scheduler integration then physical-device foreground/background/closed-app delivery; web fallback behavior with view unopened |
| Canvas | Graph commands, selection, drag, viewport, history group, undo/redo, linked task creation; flat versus `pm` mapping | Old boards, malformed edges/nodes, unknown metadata and statuses; Main↔Mobile↔Main field-preserving roundtrip; history exclusion | Mouse/touch/multiselect/resize/text editing; linked entity deletion; large board interaction; no visual regressions |
| Shell/auth/views | Explicit boot-state matrix: guest/valid/expired, timeout/offline, explicit 401/403; per-client allowlists; command handler availability | Session expiry/logout, remembered-device hints, cached view normalization; no credential migration through workspace backup | First boot/retry/login/logout, hidden view effects and disposal; strict Code workbench entry preserved; unavailable commands absent |
| Code workbench | File-ID-bound saves, tab switch, rename/delete/open, dirty close, external refresh; engine URI/version consistency | Local and native errors, late write acknowledgment, open-file restore, conflict policy; pending save across tab/workspace switch | Real CodeMirror/Monaco event sequences; native read/write; multiple tabs; actual LSP start/crash/restart in desktop harness |
| Render/motion/settings | Single property owner, register/dispose, profile/budget/degrade/reduced motion; settings defaults/import/reset | Theme snapshot roundtrip with explicitly documented losses; older keys normalized without erasing unknown data | Theme × viewport × reduced-motion smoke; hidden/unmounted surfaces release resources; screenshots before CSS extraction |
| Electron/Capacitor/tools | Existing sender/canonical-root/token/process contracts; plugin unavailable result shape; capability declarations | File path errors and interrupted writes; token fallback behavior with synthetic data; install upgrade preserves profiles | OS process/LSP teardown; native Documents/Data paths, keyboard/safe-area; clean public checkout release checks without private siblings |

## Sequencing and quality of evidence

Wave 0 starts with storage restart/failure fixtures, snapshot/draft characterization and honest verification wiring. Record fixture origin/schema without real credentials or personal data. Prefer assertions on persisted bytes, IDs, outputs and visible behavior over source-string tests that mirror implementation. Keep existing source gates where they cheaply catch a specific policy, but label them accurately.

For each refactor, capture the old implementation behind the intended contract, run the same behavioral fixture corpus against old/new, explicitly list approved differences, then add focused browser/native evidence where lifecycle matters. Do not require every hypothetical test in this document for a small unrelated change; select tests by the changed ownership boundary. No blanket coverage percentage or whole-repository rewrite is proposed.

## Audit-document validation

All 16 requested filenames are present, with no extra files in this directory. Local Markdown link targets and referenced heading anchors resolve; table column counts and fenced-block balance pass; no Unicode replacement characters were found. The health matrix contains 29 subsystem rows, each with one classification: 20 C, six B, two D and one provisional F. Git inspection shows only the same untracked audit directory present at session start, containing the completed 16 reports, and no tracked production/configuration/test changes. These structural document checks do not replace the behavioral limits stated above.

The fresh structural pass independently confirmed the 1,050 tracked-file inventory, 766 screened source files, 238,148 counted lines, both exact-copy totals, CSS rule/important/repeated-selector counts and key store import counts. Hook counts were corrected using AST call expressions: Main App has 24 `useState` calls and Mobile App 15. This supersedes the drafts' narrower lexical counts without changing the hotspot rationale. A second import pass excluded explicitly type-only imports and found one four-file strongly connected component around Main configuration, preload and DevTools; it includes a lazy edge and is documented at E31. This is structural coupling evidence, not an executed initialization failure.
