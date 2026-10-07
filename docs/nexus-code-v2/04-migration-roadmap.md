# Migration roadmap

Preserve the requested wave order. The 2026-10-07 continuation contract divides waves into independently reviewable, usable Beta PR packets. [Packet 2A](14-wave-2a-visual-foundation.md) establishes the semantic visual foundation. Work only in the permanent `Nexus-Code-v2-wave-1` folder; the older consolidation instruction is superseded. After each PR, stop until `WEITER`; check merge status and newest main before a new branch. No automatic stacking, merging or releases. [Historical comparison](11-main-reconciliation.md) and [implemented Wave 1](12-wave-1-foundation.md) retain provenance.

| Wave | Bounded change | Required evidence / exit |
| --- | --- | --- |
| 0 | Audit, product truth, ownership, baseline checks, native characterization, screenshots/model timings | This packet; honest failed gates; continuation checkpoint; STOP |
| 1 | Typed platform adapters, central command dispatch, bounded owner interfaces, errors, settings schema seam | Exact scope below; existing save/security parity; strict new boundary checks; STOP |
| 2 | Semantic tokens, surface levels, typography/primitives/panel chrome/focus/motion | Computed styles and actual Electron screenshots; scoped CSS removal only; STOP |
| 3 | Workbench composition, title/activity/sidebar/editor/bottom/status, resize/zen | Adapters retain behavior; keyboard/small-window/desktop screenshot tests; STOP |
| 4 | Document/workspace facade, tabs, lazy Explorer, watcher/conflicts/recents | Save/mutation/reload failure fixtures, identity and old-format preservation; STOP |
| 5 | CodeMirror host/document sync/provider separation and large-file policy | Per-document undo/cursor/draft tests, no buffer loss or extra writers; STOP |
| 6 | Workspace/language LSP ownership; Tier 1 first, then Python, then Rust/Go/C/C++ | Actual servers: completion/hover/diagnostics/definition/rename/format/actions; add and accept references/symbols or explicitly document remaining limitations; STOP |
| 7 | Unified quick open/text search/Problems/navigation/controlled replace | Complete scope or visible limit, cancellation, exact result range, dirty-buffer protection; STOP |
| 8 | Real runner/tasks; PTY feasibility and implementation or honest Runner label | Real input/output/exit/cancel/cwd; PTY resize/shell/packaging matrix if chosen; STOP |
| 9 | Local Git domain and focused Changes/Staged/Commit/Branches/History UI | Disposable repo mutation/diff/rename/binary/conflict/network tests; STOP |
| 10 | GitHub client split by auth/repository/issues/PR/projects; focused remote UI | Secure storage migration, request/rate-limit fixtures; explicitly authorized live operations only; STOP |
| 11 | Real run launch configs, then first DAP Node path | Real process/breakpoint/stack/variables/step/stop; no synthetic runtime; STOP |
| 12 | Declarative extension model and truthful local/built-in UI | Manifest/contribution/unknown-ID/storage tests; remove fake marketplace; STOP |
| 13 | Finish schema-driven settings/theme/keybindings | Key preservation, acknowledged errors, all consumers moved before deleting giant SettingsPanel; STOP |
| 14 | Performance/accessibility/install/platform compatibility | Real repos/files/process sessions/crashes, keyboard/zoom/reduced-motion, Windows/macOS/Linux; STOP |
| 15 | Proven dead code/CSS/events/flags/scaffolds removal | Import/dynamic/config audit, all regression gates, supported format readers retained; STOP |

## Wave 1 exact scope — historical plan

The user's 2026-10-01 Wave 1 instruction superseded the larger suggested command set below with one bounded panel/settings slice. The completed scope is in [12](12-wave-1-foundation.md); file/save/format/rename/definition command migration remains for later domain waves. Wave 2 starts only after a new `weiter`.

1. Read this checkpoint and recheck branch/status/PR #418 integration. Establish which merge result becomes the implementation base; never reset the primary merge implicitly. Keep the current audit base fixed for comparison.
2. Add a strict TypeScript boundary configuration with `noEmit`. Introduce result/error/capability interfaces and adapters over **existing** window/filesystem/runner/Git/GitHub/LSP API shapes. Replace bridge capability inference only in migrated consumers. Characterize missing bridge, thrown filesystem errors, structured native errors, oversize payloads and event disposal. No IPC bypass or weakened path guards.
3. Consolidate existing command metadata, keybinding IDs and Editor action routing behind one command service. Migrate palette/menu/keybinding consumers for an initial command set: open folder, new file, save, Save All, toggle sidebar/terminal, open settings, format/rename/definition availability. Preserve legacy IDs through aliases and existing shortcuts through fixtures. Do not rebuild palette visuals yet.
4. Define focused workspace/document/workbench/settings/runner/SCM owner interfaces. Wrap existing persistence rather than copying its state machine. Extract one workbench command controller from Editor as a proof of the seam; no wholesale folder move or second giant Workbench.
5. Introduce a settings schema for existing theme/font/tab-size/word-wrap/autosave and keybinding values, preserving keys/defaults. Keep the old SettingsPanel through an adapter. Define acknowledged settings-error behavior; do not migrate all settings UI or replace file formats.
6. Provide capability-truth metadata at the foundation seam: no true debugger/PTY/network marketplace; server readiness remains conditional. Any production labeling/hiding is a small separately tested correction, not a new debugging implementation. Keep terminal simulation cleanup and runtime rebuild within Waves 8/11, while preventing adapters from claiming simulated success.
7. Inventory the 4,353 existing type diagnostics separately from the strict new boundary gate. Fix only errors introduced by this packet or necessary to its seam; never hide old failures by reducing compiler scope without an explicit tracked replacement gate.

## Wave 1 acceptance and exclusions

The command registry dispatches exactly once and availability matches keyboard/menu/palette; aliases preserve supported IDs. Boundary types have no broad `any` or suppressions. New contract tests plus existing IDE core/native save/security/public persistence tests pass. The inherited full typecheck/visual failures remain explicitly recorded until resolved. Update the feature ledger, architecture and checkpoint; commit only the bounded wave; STOP.

No new editor engine, document save queue, auth/offline policy change, third-party execution host, installer dependency change, large UI redesign, fake-feature implementation or cross-client cleanup. Later waves may be split into multiple sessions; one completed subpacket does not imply a completed wave.
