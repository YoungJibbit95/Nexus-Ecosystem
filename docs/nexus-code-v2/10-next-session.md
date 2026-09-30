# Continuation checkpoint — STOP after Wave 0

Date: 2026-09-30. Completed: **Phase 0 and Wave 0 only**. Continue when the user says `weiter`. No Wave 1 production migration was performed.

## Branch and commit

- Worktree: `F:/Coding/Nexus Workspace/Nexus-Code-v2-audit`.
- Branch: `recode/nexus-code-v2-wave-0`.
- Audited implementation/base: `10f8684c2da530ddc5549f2298f2794123a093d7`.
- Evidence checkpoint commit: `10352104163c122425ddc412b7deae3f94698af5` (`test(code): capture Wave 0 native and audit baselines`).
- Latest completed packet commit: the final documentation commit at **HEAD of this branch**; resolve with `git rev-parse HEAD` in this worktree. Its literal hash is reported in the session's final answer; a document cannot embed its own resulting commit hash without creating another commit.
- Primary checkout: `F:/Coding/Nexus Workspace/Nexus-Ecosystem`, `dev`, same starting HEAD, pending merge `6458915ba3c5c1e4c71f2e07280dc4d7f9357f38`. Root package.json and two architecture ledgers are conflicted; unrelated staged work remains user-owned. Before/after evidence is retained. No push, PR or primary merge resolution.

## Completed packet

41 subsystem records, exact requested recode classes, all direct runtime/development dependencies and overrides, product core/advanced/experimental/out-of-scope, capability-truth ledger, canonical state owners, final 0–15 wave sequence, six ADRs, current user/developer guides, UI token/surface plan, security/performance plans, baseline logs and selected actual Electron screenshots. Added one native production-main/preload characterization harness; only its native folder picker is replaced. CodeMirror, shared persistence and security behavior are unchanged.

## Tests and known failures

Passed: lint, build/markup, 52 IDE-core cases, 36 SSR fixtures, security navigation/no-localStorage-token assertions, single-React/ecosystem checks, 79 public tests, real-browser persistence tests, model measurements. Native characterization passes nine checks: account gate, root authorization, bytes/empty/Unicode/EOL, traversal/metadata/symlink rejection, rename/delete, disposable Git status/stage/commit and relative runner output/error/input/exit.

Known red gates:

1. Full JS typecheck exits 2: 4,353 diagnostics, identical count in primary. Build is a different permissive gate.
2. Full visual suite exits 1: 119/120, editor-scroll@desktop grammar-loading/no-scroller race. Single focused recheck passes; full matrix remains red. Recheck overwrote original failed image/full metrics summary; raw full log and reconstructed outcome manifest retained.
3. Native suite exits 1: quoted absolute path containing spaces fails on Windows runner IPC. Relative command passes. Keep this regression red until Wave 8 repair.

Detailed commands, limits and logs: [test strategy](09-test-strategy.md). No clean lockfile install (installed junctions reused), authenticated production workbench, real LSP server/GitHub mutation, DAP/PTY, installers or native upgrade/restart/force-kill/multi-window acceptance. No remote CI result for the local base SHA. #418 successful checks concern the pending merge, not this base.

## Current architecture and remaining legacy

Boot/auth/release policy lives in App/boot/account helpers. Local Nexus session/token uses sessionStorage, removes legacy localStorage credentials, and Remember is forwarded to backend; native durable restore is unverified. Editor remains orchestration/state/IO/UI; CodeEditor remains CM+document/providers/process/status. Shared core repository/save queue/mutation guard owns revision-bound persistence. Main/preload gate native operations; existing Git/GitHub/LSP services are real foundations. Docking/tree/feature models and PanelChrome are valuable.

Legacy remains in production: synthetic debug runtime, canned browser terminal path, marketplace-like local extension records, giant Settings/Git/Editor integration, global CSS overrides, separate palette/Spotlight/shortcut dispatch, incomplete workspace diagnostics/search scope/watcher, ad-hoc bridge/errors, scaffold/template dependency candidates. No removal/implementation occurred beyond truthful README documentation.

## Exact next task — Wave 1 foundation only

1. Read this packet, inspect both worktree statuses and current commits/PRs. Decide the implementation base deliberately after the primary merge is reconciled by its owning workflow; preserve its uncommitted work. Do not replay stale July push-main instructions.
2. Read current bridge/command/settings/persistence tests and search all consumers. Add a strict TS noEmit boundary configuration and typed capability/result/error/event contracts; adapt current window/workspace/runner/Git/GitHub/LSP shapes, preserving native guards.
3. Evolve existing command metadata into one dispatch/availability registry with aliases. Migrate the bounded initial set: open folder, new file, save/Save All, sidebar/terminal toggles, settings and format/rename/definition availability. Protect keyboard/menu/palette parity and event teardown.
4. Define bounded workspace/document/workbench/settings/runner/SCM owner interfaces. Extract one workbench command controller as proof; wrap the shared save owner, never duplicate it.
5. Add a compatible initial theme/font/tab-size/word-wrap/autosave/keybinding schema preserving stored keys/defaults; adapt existing SettingsPanel and define acknowledged errors. No full settings UI migration.
6. Publish capability truth at adapters. Handle missing bridge/unsupported/debug/PTY/marketplace states as unavailable/limited, not generated success. Only small tested labeling corrections; runtime rebuilds remain in later waves.
7. Run strict new-boundary checks plus relevant existing gates/native/public persistence protections, report inherited failures, update docs/ledger/checkpoint, make a bounded commit, **STOP**.

Full Wave 1 exclusions/acceptance: [roadmap](04-migration-roadmap.md). No visual shell rebuild, engine swap, new save queue, broad mechanical TS conversion, dependency refresh or auth/security-policy change.

## Parallel chat coordination

The separately authorized V7 chat (`01a0f1f6-03fb-7030-a5c0-153bbfbdf7cc`) is handling Nexus ecosystem/Main/Mobile planning in its own worktree. This packet owns Code audit/test/docs only and does not edit Code Mobile or shared-core production code. Recheck integration before future commits; chat messages do not expand the current Wave 0 authorization.
