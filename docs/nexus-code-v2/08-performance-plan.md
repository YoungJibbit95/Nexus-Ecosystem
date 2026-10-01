# Performance baseline and plan

Measure before optimizing. Installed versions and reuse constraints are in [baseline](00-current-state.md). [Model samples](evidence/model-performance.json) are Node/in-memory measurements, not renderer latency or a supported-host SLA.

## Measured Wave 0

Eight samples per model operation, host Node 26.3.1:

| Operation | Reported median / max | Meaning |
| --- | --- | --- |
| Build 10,000-file tree + virtual window | 18.059 / 40.208ms | 901 model rows, 43 rendered rows; 9,100 hidden by child cap |
| Search 10,000 candidates, absent query | 4.537 / 8.627ms | Scanned only 1,400 files; limit reached, not complete workspace search |
| Search 1.1M-character file | 0.844 / 1.589ms | File truncated to search budget; needle beyond cap absent with warning |
| Huge-file policy (1MB/20k lines) | 0.007 / 0.256ms | Plain mode; LSP and syntax disabled |

Existing editor thresholds: guarded above 220,000 characters or 7,500 lines; plain above 650,000 characters or 18,000 lines. Existing lazy grammars/large-file handling and Explorer virtualization are assets, not missing features. Tree construction still processes every supplied node; row virtualization does not eliminate model derivation cost.

Build emits `dist/chunk-report.json`; the exact baseline is archived beside this packet. Using decimal kB, Editor is 412.91kB raw/107.91kB gzip, Settings 118.66/28.67kB, legacy grammars 379.89/133.32kB, C++ grammar 445.75/143.67kB. Bundle grouping does not prove on-demand loading: Editor statically imports most panels; Settings is genuinely lazy. Core barrel imports also widen dependency/typecheck reach.

The retained [chunk report](evidence/chunk-report.json) contains 24 chunks, 2,646,439 raw bytes / 852,636 gzip bytes and 664 modules, plus one asset. Its motion grouping warning covers 267 modules; that is a grouping warning, not proof that all 267 execute at startup.

Native/fixture durations in test summaries include initialization, waiting and screenshot capture. Use them for repeatability/debugging only. Authenticated time-to-usable-editor, real LSP first completion/diagnostic, terminal first-byte/cancellation, native workspace scans and Git large-repo latency were not benchmarked as production flows in this session.

## Instrumentation

Keep existing `perfMetrics` events and runtime lag probe. Measure cold/warm boot (account gate separately from authenticated workbench), workspace discovery, first file open, first/next completion, first diagnostic, cancellable search, Git refresh, settings load and process startup. Record commit, versions, OS/hardware, repo manifest, cache state, outcome and p50/p95 over repeated runs. Do not include content/paths/tokens in telemetry without deliberate scrubbing. No new telemetry collection was added here.

Initial investigation thresholds, to calibrate after real-host measurements: input work under a 16ms frame; no synchronous long task over 50ms during normal typing; disclose every scope cap; cancel stale search/SCM requests promptly. These are proposed engineering budgets, not achieved claims.

## Test fixtures and migration priorities

Use disposable repos with 1k/10k/50k files, nested dirs, vendor/node_modules/build ignored, large single directories, empty/Unicode/1MiB/20MiB files, dirty tabs and large Git history/diffs. Compare correctness and visible limits before timing. Test multiple real process sessions and repeated LSP crash/restart.

Bound document subscriptions first; separate provider/server lifecycle from theme dependencies; lazy-load secondary panels when evidence justifies it; cache tree/SCM derivations by generation; stream native search with cancellation/backpressure; cap output with a visible retention policy. Preserve large-file degradation and measure effect removal. Framer Motion/glow/blur need reduced-motion and GPU/compositor checks. Do not replace CodeMirror or add a global store to solve unmeasured costs.
