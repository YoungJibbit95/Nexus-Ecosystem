# Cross-client duplication and deliberate divergence

Baseline: `d39cfa2`. Exact-copy comparison used tracked same-relative-path files under each pair's `src`, extensions TS/TSX/JS/JSX/CSS, with CRLF normalized to LF. It does not detect renamed, partial or semantically equivalent copies and does not establish runtime reachability.

## Measured duplication

| Pair | Exact matching files | Approximate lines in one copy | Important examples |
| --- | ---: | ---: | --- |
| Main ↔ Mobile | 22 | 2,446 | IDB adapter 397, localStorage manager 276, workspaceStore 152, ThreePanelEffect 517, note-analysis hook 108, worker 73, Code archive 77 |
| Code ↔ Code Mobile | 63 | 5,055 | Queued storageManager 144, many `components/ui` primitives, runtime lag probe; includes unused/scaffold files |

Do not turn all 7,501 lines into a shared package automatically. Duplication of an unconsumed scaffold is a reachability question. Duplication of a storage defect is an urgent contract question. Size includes blank lines/comments and follows report 01's counting method.

## Main and Mobile

| Concern | Actual relationship | Recommendation |
| --- | --- | --- |
| Core render/motion | Client adapters already delegate to shared core; platform/hardware defaults differ | Preserve adapters; share pure policy, not device assumptions |
| Persistence | Identical IDB/localStorage implementations with same failure behavior | Share a tested persistence engine after legacy compatibility tests, retaining separate DB names |
| Workspace membership | Identical store and weak ID-array relationships | Extract shared model/invariants/commands; keep one client store instance |
| App-store entities | Note/Task/Reminder/Code types and many actions copied; seed/merge/dashboard behavior differs | Adopt lossless codecs and common pure transitions gradually, not a simultaneous store rewrite |
| Canvas | Both own local schema, sanitizer, queued patches and gestures. Main flat status/priority/owner/etc; Mobile `pm` includes `idea/backlog/review` and different fields | Compatibility mapper first. Do not simply import Main types into Mobile and drop `pm` data |
| Notes | Same analysis hook/worker; separate large views. Main draft state extracted, Mobile inline | Share analysis and document commands; keep desktop split view versus mobile sheet/input behavior |
| Reminders | Shared templates; Main checker versus Mobile native scheduler plus fallback | Share due/repeat/snooze policy, separate OS adapters. Move scheduling lifetime out of view ownership |
| Calendar | Main has CalendarView and ICS import; Mobile has no corresponding route | Record intentional gap; do not claim parity or add a new feature during structural migration |
| Files | Main folder/IPC export; Mobile download/share/import and checkpoint preview | Shared snapshot envelope/parser and merge plan; retain native IO and distinct UX |
| Code route | Both now have identical archive/export views and helpers | Preserve compatibility; update stale manifests/docs in future. Do not revive old editor components |
| Settings | Similar panels/bridges, divergent large theme models and presets | Share import validation and common controls where behavior matches; retain platform-specific options |
| Auth/bootstrap | Main session-backed safe local startup; Mobile context/env hints and different fallback/allowlists | Define a capability/access policy matrix before extracting boot helpers |
| Navigation/gestures | Desktop sidebar/titlebar; Mobile bottom nav/tabs, safe areas, keyboard and gestures | Keep platform ownership; share view IDs and capability definitions only |

Concrete evidence: both clients' `store/*`, `views/*`, `app/*`, core `api/control/client/view-access.ts`, `canvas/model/canvasTypes.ts`; E02–E19 in [02](02-current-architecture.md#evidence-index).

## Code and Code Mobile

Desktop Code is not merely a bigger rendering of Code Mobile. Desktop uses CodeMirror 6 plus `ide/editor` and `ide/lsp`, Electron LSP processes, Git/GitHub services, extension registry and docking models. Mobile uses Monaco, Capacitor nativeFS and much less extracted page logic. Its terminal is a simulation; Debug is explicitly sample/preview state. Desktop Debug also contains sample/timer behavior, so runtime-debug parity is not established there either.

Both retain similar React file arrays, buffer refs, delayed saves and local index/content persistence. The migration defect in `editorShared.jsx` reproduces in each, despite the modules differing overall. This is accidental domain/persistence duplication. Share a storage codec/engine and a document-save contract first. Preserve the editor engine distinction until a separate product/performance decision justifies convergence.

Suitable shared contracts:

- document identity/URI, revision and dirty/save acknowledgement;
- local-file legacy migration fixtures and v2 read compatibility;
- editor settings codecs for genuinely common fields, with extension fields retained;
- capability descriptions distinguishing local edit, file IO, process execution, LSP and simulation;
- command semantics and error/result shapes where the product actually agrees.

Keep outside common domain packages: Electron process spawning, OS credential storage, arbitrary desktop roots, Capacitor Documents/Data policies, touch keyboard controls, desktop docking and UI library/editor-engine adapters. A common method name (`writeFile`) is insufficient proof of a common failure or permission contract.

## Hidden divergence to resolve before sharing

1. **Data shape:** canvas planning metadata can be discarded by the other client's sanitizer. Handoff needs full roundtrip fixtures, not only successful JSON parsing.
2. **Availability:** Mobile safe/free views exclude some views present in its source; desktop local-free views include Canvas/Flux/archived Code. Treat access policy as a product decision.
3. **Version:** Mobile runtime identifies as `5.0.0` while package version is `6.0.0`; compatibility checks can therefore use stale identity.
4. **Save timing:** different layers debounce independently, so two identical storage APIs do not imply identical user-visible durability.
5. **Origin:** BroadcastChannel/localStorage events cannot provide shared state between different dev ports or independent native containers. Manual workspace handoff documentation is closer to reality than a universal sync assumption.

## Sharing sequence

First freeze readable formats and product capability fixtures. Then extract storage behavior and pure domain transitions behind existing client facades. Only then consolidate common helpers. Keep each platform's presentation/adapters separate. Exact-copy removal is the final result of a verified boundary, not the initial objective.
