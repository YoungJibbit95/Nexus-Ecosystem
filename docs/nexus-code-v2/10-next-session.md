# Continuation checkpoint — STOP after packet 2A

Date: 2026-10-07. **Phase 0, Wave 0 and Wave 1 remain complete. Wave 2A semantic visual foundation is the current Beta PR packet.** See [implementation and qualification](14-wave-2a-visual-foundation.md) and [local state](LOCAL_WORKSPACE_STATE.md).

Use **F:/Coding/Nexus Workspace/Nexus-Code-v2-wave-1**, branch `recode/nexus-code-v2-beta-wave-2a-visual-foundation`. This permanent folder supersedes the historical main-folder instruction below. Base is `5532bebcb9827e1a3d1629004fd17a261c8fb815`; only the bounded UI packet may be pushed. The prior local security/foundation branch remains preserved; do not push its old ancestry.

Stop after this PR. After the user says `WEITER`, inspect whether it merged, fetch/prune, inspect current security/product changes and CI, and create the next fresh branch in this same folder. An unmerged PR does not authorize stacking. Next planned packet: **Wave 3 workbench composition**. A 2B follow-up is optional only if concrete remaining common-primitive work warrants it; none is pre-authorized. No merge, release, deployment or automatic continuation.

## Historical Wave 1 checkpoint (superseded workflow, retained provenance)

Date: 2026-10-01. **Phase 0, Wave 0 and Wave 1 foundation complete. Wave 2 has not started.** Continue only after a new `weiter`.

## Main folder and commits

Work only in **F:/Coding/Nexus Workspace/Nexus-Ecosystem**, currently branch `dev`. Read Workspace/AGENTS.md and run the workspace's `npm run check:workspace` at task start/end. No additional source copies/worktrees without explicit human authorization. The user authorized consolidation via the Security chat; that workflow owns remaining workspace cleanup.

- Original audit **642bde64f2167d5b254f7be05f0a40be52a3aa47**, evidence **10352104163c122425ddc412b7deae3f94698af5**, implementation **10f8684**. Historical branch refs/evidence remain available.
- Fresh fetched base **0cb408b02f4ba54f0626b4031d73541b8cb94287**. [Reconciliation](11-main-reconciliation.md) verifies the already merged Windows runner fix: unchanged original harness 10/10. **Do not fix it again.**
- Separate shared persistence fix **f58ebbb2c3151ad930aad988de525c9b86ca2807** owns the five concurrent legacy IndexedDB files; not a Code foundation change.
- Audit integrated as **49408da / 3a96e4d**. Foundation integrated as **b0d3fc203054bffed525d901688d5e43c1db4b0c** (original isolated commit 7f63f7b). Final checkpoint/evidence commit is HEAD after this document's commit: resolve `git rev-parse HEAD`. No push or PR requested/performed.
- Final boundary review added a fixed allowlist for technical error codes and its secret-string regression test. That small source change is included in the final checkpoint/evidence commit; final foundation tests are **20/20**.
- Original primary merge was resolved by its separately authorized owner; no MERGE_HEAD remains. Foreign Nexus Main/README.md and packages/nexus-core/src/planning/cerebri/adapter.ts remain untouched/uncommitted. Recheck status and coordinate before editing them.

## Implemented foundation

[12-wave-1-foundation.md](12-wave-1-foundation.md) records exact contracts and the seven-domain ownership matrix.

1. Typed window/workspace/terminal/git/github/lsp ports wrap existing secure preload. Browser/test adapters and partial capability states are explicit. No main/preload/security/auth rewrite.
2. Safe structured result/errors and typed idempotent subscriptions. Workspace writes require the actual true acknowledgment; existing shared revision/save owner stays canonical.
3. Central command registry/aliases/availability/handler. Six panel/settings commands share menu/keyboard/palette/Spotlight dispatch; separate visuals and other commands stay legacy.
4. One panel/settings controller extracted from Editor, with existing state/dock functions injected. No mirrored store or new writer.
5. Seven-key settings schema under the current loader/UI preserves compatible unknown keys/custom themes/future shortcut IDs and legacy known-shortcut validation.

Editor still owns tabs/workspace/files/layout/UI and remaining actions. CodeEditor/providers/LSP transports, terminal/Git/GitHub/extensions/settings UI and persistence queues remain largely legacy. Other raw bridge consumers are documented. Do not claim the whole renderer is migrated.

## Final evidence

[09](09-test-strategy.md) links all gates and scope. Strict new TS gate + **20 tests** pass. Full JS check remains red at **4,270 vs 4,353**, **0 new / 83 removed**, exact [inventory](13-diagnostics.md). New TS modules: zero; legacy touched files remain enumerated.

Main-folder gates pass: lint, 52 IDE-core cases, 36 SSR cases, security, markup/build, seven actual adapter-native checks, 254 public cases (237 pass / 17 skips), ecosystem/single-React/lockfiles/encoding and 14 real browser persistence stages. Full visual remains historical 119/120; isolated recheck is not a green full matrix. No authenticated Editor/live LSP/GitHub/PTY/DAP/installed durability acceptance.

## Consolidation and preserved work

Both temporary Code worktree registrations were removed with Git after integration and verified backups. Windows Git removal left physical contents. Wave1 leftovers were reversibly archived; Audit Move-Item failed at a fixture junction and the subsequent nonrecursive Directory.Move was denied by Windows. **The remaining Audit folder must not be used for development.** Further physical operations stopped at the consolidation chat's request while it investigates workspace links. Automatic command policy also rejected junction/directory removal with only 'blocked by policy', no additional explanation. [Consolidation record](evidence/wave-1/consolidation.json) is authoritative.

Archive root: **F:/Coding/Nexus Workspace/.workspace-maintenance/2026-10-01/nexus-code-wave-1/**. Contains historical/current test ZIPs (125+5 PNGs), SHA manifest, foreign patch/raw copies, preserved foreign-file hashes, residual-wave-1 and partial residual-audit. A separate verified foreign backup remains under .workspace-maintenance/2026-10-01/wave1-persistence-*/. Five foreign edits are already integrated as f58ebbb, not lost/reapplied. Historical and foundation branch refs are retained.

## Exact next task — Wave 2 only after weiter

1. Read this checkpoint, AGENTS/status/main history; coordinate foreign work and workspace cleanup. Work in the main folder.
2. Read [05 UI system](05-ui-system.md), [CSS/source inventory](evidence/source-inventory.json), [captures](evidence/visual-baseline.md). Begin with **semantic CSS tokens, surface levels, typography/spacing/radius/focus/motion primitives**, using existing src/theme/nexusThemeResolver.js and src/components/editor/panels/PanelChrome.jsx as seams; inspect globals.css before scoped edits.
3. Add a bounded token/primitives layer with computed-style/contrast/theme/keyboard/reduced-motion evidence. Preserve persisted appearance options/fallbacks; remove only proven cascade duplication. No broad globals.css replacement.
4. Validate actual Electron fixtures/screenshots for touched primitives plus focus/small-window/theme behavior. Keep strict/full diagnostic delta, build/security/save protections.
5. Update docs/checkpoint, commit a bounded Wave 2 packet and **STOP**. Do not expand into Wave 3 shell composition, Settings/Git/Terminal redesign, PTY, DAP, extensions or persistence redesign.

The old suggested Wave 1 file/save/format/navigation expansion was superseded by the human's bounded panel/settings scope. Continue those migrations in their domain waves.
