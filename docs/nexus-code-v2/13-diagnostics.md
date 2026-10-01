# Type diagnostic baseline and Wave 1 delta

Base: current main `0cb408b`, not the historical implementation alone. Both historical and freshly measured pre-implementation counts are **4,353**. Final Wave 1: **4,270**, full command still exits **2**. Introduced: **0**; removed: **83**. The separate strict foundation gate exits **0**. No compiler include/exclude scope was reduced. Explicit `.ts` imports use `allowImportingTsExtensions` with noEmit in the existing configs.

The complete [machine inventory](evidence/wave-1/diagnostic-baseline.json) contains every diagnostic, file/code/subsystem/category totals, and introduced/removed identity multisets. [Generator](evidence/wave-1/diagnostics.mjs) can be rerun with Node. [Before log](evidence/wave-1/typecheck-before.log) and [after log](evidence/wave-1/typecheck-after.log) retain original paths and compiler continuation lines.

Comparison ignores line shifts from extraction. Equivalent dependency paths through Windows worktree/junction spellings normalize to `node_modules/...`, including message references; repeated diagnostics are counted as a multiset, not deduplicated. This prevents 444 unchanged vendor errors from appearing as new merely because TypeScript resolved a junction through another path. File/code/message identities remain otherwise exact. Category assignment is a **triage candidate**, not proof that every inferred JS shape mismatch is a runtime defect.

| Architectural subsystem | Before | After |
| --- | ---: | ---: |
| UI/application | 596 | 596 |
| Editor/language | 320 | 320 |
| Extensions | 374 | 374 |
| SCM | 455 | 455 |
| Settings | 369 | 368 |
| Terminal | 89 | 89 |
| Workbench/workspace | 1,402 | 1,320 |
| Shared/core | 304 | 304 |
| Vendor/configuration | 444 | 444 |

| Candidate category | Before | After | Interpretation and next review |
| --- | ---: | ---: | --- |
| REAL CONTRACT VIOLATION | 1,300 | 1,227 | Remaining shape/argument/null/readonly disagreements need source review. Do not treat all inferred JS contracts as proven functional bugs |
| MISSING JS/TS ANNOTATION | 2,349 | 2,340 | Implicit parameter/destructuring/recursive inference issues; annotate bounded public contracts first |
| LEGACY UNTYPED BOUNDARY | 7 | 6 | Bridge/event access without declared contracts; remaining Search/GitHub/LSP/terminal consumers migrate in their own waves |
| TEST/HARNESS TYPE NOISE | 0 | 0 | No matching diagnostics in current compiler scope. Node test `.mjs` fixtures are executed, not claimed as TS-checked production modules |
| THIRD-PARTY/CONFIGURATION ISSUE | 697 | 697 | 444 React implementation diagnostics plus missing JSX/React/Node type resolution. Imported dependency checking needs a separate configuration packet |

Representative source review:

- **Real static contract disagreement:** CommandPalette/Spotlight/codeMirrorLanguages declare a frozen `Object.freeze([])` as mutable `any[]` and receive TS4104. The readonly-to-mutable mismatch is real; it does not alone prove broken user behavior. Future fix: readonly collection contract, not a cast/suppression.
- **Missing annotation:** accountSession's `normalizeAccountMode(modeRaw)` (TS7006) and destructured JSX props (TS7031) need explicit input/prop shapes. Existing object/null defaults often overconstrain optional runtime fields; classify by source before changing behavior.
- **Legacy boundary:** SearchPanel's `window.electronAPI` (TS2339) and electronLspTransport's undeclared bridge/error details are architectural seams. Editor's bridge diagnostic was removed by the adapter, not by an ambient global declaration.
- **Configuration:** shared settingsPrimitives reports missing ReactNode export while shared Canvas JSX reports missing IntrinsicElements, and dependency React implementation files report missing Node `process/module`. Existing bundled resolution and jsconfig `types:[]` explain why a broad backlog fix would exceed this wave. No shared-core/library rewrite was made.
- **Test noise:** the currently excluded test harness is not counted as a production defect; retain executed coverage and add dedicated typed fixture gates if needed later.

Most common codes before: TS7006 1,893; TS2339 726; TS7031 645; TS7026 252; TS2322 200; TS7053 162; TS2741 131. Complete code totals are in the JSON.

## Files touched by Wave 1 still affected

| Existing file | Remaining |
| --- | ---: |
| src/pages/Editor.jsx | 122 |
| src/components/editor/TitleBar.jsx | 41 |
| src/components/editor/CommandPalette.jsx | 22 |
| src/components/editor/SpotlightSearch.jsx | 32 |
| src/pages/editor/commandPaletteModel.js | 105 |
| src/pages/editor/editorShared.jsx | 12 |
| src/pages/editor/editorWorkbenchChrome.jsx | 52 |
| src/pages/editor/workbench/focusSlots.js | 43 |
| src/components/editor/settings/settingsModels.js | 97 |

**New src/platform/*.ts, src/workbench/commands/*.ts and src/settings/*.ts: zero.** Legacy rows above retain pre-existing diagnostics; no new rows remain after identity comparison. Removed diagnostics come from typed IO/settings/controller seams, accurate nullable state, optional status props and a guarded default-key lookup. New architecture has no explicit `any`, `@ts-ignore` or `@ts-expect-error`. Existing scoped bridge suppressions were removed. The legacy JSX/models need later bounded migrations; no claim of a fully typed IDE.
