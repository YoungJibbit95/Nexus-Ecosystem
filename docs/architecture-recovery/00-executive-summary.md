# Nexus architecture recovery — executive summary

Audit date: 2026-09-27. Baseline: `d39cfa2` (`preparing for v7`, 2026-09-22). Scope: this public repository, all four product clients, shared core, Wiki, native boundaries, tooling, tests and historical plans. At the start of this session, all 16 reports already existed as untracked drafts; tracked files were unchanged. The drafts were reviewed against implementation, measurements, Git history and freshly executed checks, then corrected and completed in place. Only audit documentation was edited. No implementation, migration, dependency installation, commit or publication was performed.

## Assessment

**Preserve Nexus; repair its ownership and durability boundaries incrementally.** This is a functional client family with valuable accumulated behavior, not a failed architecture requiring a new product. It has a real shared render/motion and client-runtime foundation, useful pure IDE models, and increasingly explicit Electron services. It does not have a shared authoritative domain/persistence layer. Main/Mobile still own separate domain stores and schemas; Code/Code Mobile own separate editor lifecycles. Broad UI controllers connect these layers directly.

The primary health category for coordination-heavy subsystems is **C — refactor behind existing contracts**. Only two bounded persistence implementations merit **D — partial rewrite**. No whole application or subsystem meets the evidence threshold for **E — recode candidate**. Legacy candidates are provisional, not deletion instructions. See the [health matrix](14-subsystem-health-matrix.md) for one classification per subsystem and the [replacement boundaries](15-recode-candidates.md).

## Five highest-risk problems

1. **Persistence can acknowledge state without retaining recoverable data.** In both Code clients, `editorShared.jsx` seeds its content cache during legacy loading, then skips writing those same contents during migration and removes the legacy key. An in-memory execution of the actual functions reproduced empty content on the next load. Main/Mobile's identical IndexedDB adapter deletes the fallback key before commit and drops a failed queued batch; a failed-open probe using both actual storage modules reproduced both transitions. These are concrete durability problems, not LOC judgments. [Persistence evidence and probes](05-persistence-audit.md).
2. **Workspace import/restore has several writers and no shared commit boundary.** Files import, Mobile handoff and Main Settings restore directly replace multiple stores. Backup parsing accepts an altered checksum and throws on some incomplete objects after its outer guards pass. Main's Auto-Sync setting survives, but `useWorkspaceRuntimeSync` has no application caller. A dormant fingerprint also misses some changes. Do not mistake a setting or an unmounted hook for active synchronization. [State](04-state-ownership-audit.md), [persistence](05-persistence-audit.md).
3. **Draft, saved and durable state are conflated at UI lifecycle boundaries.** Notes' 4.2-second draft commit precedes a separate 3.6-second app-store debounce; its saved indicator does not await storage. Code maintains editor buffers, file arrays, tab dirty flags and an LSP document model; delayed autosave resolves the current tab at callback time. Reminder scheduling/checking starts from the Reminder view. These are concrete race/lifetime risks requiring characterization, not claims of device-reproduced loss. [Ownership](04-state-ownership-audit.md), [hotspots](08-complexity-hotspots.md).
4. **Cross-client contracts are weaker than the shared-package/parity language suggests.** Main canvas planning fields are flat; Mobile uses `pm` with a different status set. Both bypass the shared canvas model. Main/Mobile boot and local-free access lists differ; Mobile reports runtime version `5.0.0` despite package `6.0.0`. Desktop Code uses CodeMirror/LSP; Code Mobile uses Monaco and a simulated terminal/debug surface. A cosmetic consolidation would conceal these differences. [Duplication](06-cross-client-duplication.md), [core](07-core-runtime-audit.md).
5. **Verification can be green while the important behavior is unprotected.** Core/Main/Mobile typechecks pass, but Code's separate JS check reports 4,345 diagnostics, including dependency/type-resolution noise. Code's build TypeScript config has only three root files and excludes its JS/JSX application. The nominal Contract Parity E2E workflow builds clients and scans source; it does not drive end-to-end user flows. A policy test is absent from the core test script and cannot load a missing helper. [Executed checks and protection plan](09-test-protection-plan.md).

## Assets to preserve

- The public client/platform separation and active Electron preload contracts, especially canonical-root checks and small services. Existing Main IPC tests pass.
- Core render coordinator, budget/invariant machinery, motion profiles and the thin platform adapters. Missing behavioral tests call for protection, not a replacement render engine.
- Nexus Code editor-engine/LSP protocol, layout, file-tree, command and extension models. All 52 existing IDE-core smoke scenarios passed.
- Local-first Notes/Tasks/Reminders/Canvas data and IDs; existing imports, export formats, handoff previews, backup UX, keyboard behavior and dirty-state semantics.
- The new read/export Code archive in Main/Mobile. Commit `d39cfa2` deliberately removed editing from that route; do not reconstruct the old editor from leftover files.

## Recommended first wave

Authorize **Wave 0: durability characterization and contract baselines** before refactoring. Preserve representative old storage fixtures; add restart/failure tests for both migration families; record snapshot/import and draft-save contracts; repair verification wiring in a separately scoped follow-up. Product decisions about offline access, Auto-Sync and canvas schema compatibility must be explicit. Wave 1 then replaces only storage internals behind compatible APIs. [Roadmap](12-migration-roadmap.md).

## Verification performed

- Core, Main and Mobile no-emit typechecks: pass; all currently use non-strict TypeScript settings.
- Core standard test command: pass, 13 tests plus an 11-manifest source check.
- Selected release/Main/Mobile/Code/Code-Mobile Node tests: 25/25 pass; separately, Code-Mobile Debug labeling test passes.
- Nexus Code IDE-core smoke: 52/52 scenarios pass.
- Code JS no-emit typecheck: fails, 4,345 diagnostics. This is not 4,345 independently confirmed product bugs.
- Ecosystem verifier: 87/88 pass on this workspace; failure is its obsolete Main Linux icon-path expectation. It also conditionally inspected locally present sibling tools, so its denominator is environment-dependent.
- Single-React and encoding checks: pass.
- Direct core DevTools policy test: fails before assertions because `register-typescript-hooks.mjs` is absent.
- Read-only AST import inventory, normalized-copy comparisons, PostCSS analysis, Git-history checks and five targeted in-memory behavior probes completed. No browser/device/installer/full production-build validation was performed. Details and reproducibility limits are in report 09.

## Decisions requiring human confirmation

Confirm intended local/offline entry for each client, whether Auto-Sync is still a supported feature, the canonical canvas planning schema, the supported oldest data formats, reminder delivery requirements while views/apps are closed, and whether desktop/mobile simulated IDE surfaces are intentional product scope. Actual legacy-data prevalence, installed native plugin behavior and private Cloud correctness cannot be established from this public checkout. These uncertainties do not block this documentation audit; they gate later behavioral changes.

## Documents completed and verified

All 16 requested documents were present on arrival. This session retained their useful analysis, independently checked the consequential findings and verification results, corrected provenance and hook counts, and strengthened storage, native-integration, dependency-cycle and test-inventory evidence. The following is the exact delivered set under `docs/architecture-recovery/`.

| File | Purpose |
| --- | --- |
| [00-executive-summary.md](00-executive-summary.md) | Assessment and decisions |
| [01-repository-map.md](01-repository-map.md) | Inventory, source distribution, runtime/build targets |
| [02-current-architecture.md](02-current-architecture.md) | Actual flows, evidence index and history |
| [03-dependency-ownership-map.md](03-dependency-ownership-map.md) | Subsystem contracts, dependencies, consumers and coverage |
| [04-state-ownership-audit.md](04-state-ownership-audit.md) | Canonical, draft, persisted, remote and derived state |
| [05-persistence-audit.md](05-persistence-audit.md) | Storage inventory, migrations and failure evidence |
| [06-cross-client-duplication.md](06-cross-client-duplication.md) | Necessary divergence versus accidental duplication |
| [07-core-runtime-audit.md](07-core-runtime-audit.md) | Shared core's authority and limits |
| [08-complexity-hotspots.md](08-complexity-hotspots.md) | Complexity tied to maintenance risk |
| [09-test-protection-plan.md](09-test-protection-plan.md) | Checks performed and required protection |
| [10-documentation-drift.md](10-documentation-drift.md) | Intent versus implementation |
| [11-target-architecture.md](11-target-architecture.md) | Incremental target boundaries |
| [12-migration-roadmap.md](12-migration-roadmap.md) | Sequenced waves, gates and rollback |
| [13-agent-development-rules.md](13-agent-development-rules.md) | Bounded task rules and ADR proposal |
| [14-subsystem-health-matrix.md](14-subsystem-health-matrix.md) | Primary decision table |
| [15-recode-candidates.md](15-recode-candidates.md) | Only evidence-supported partial replacements |

This audit authorizes no refactor or migration. Implementation requires a subsequent explicit request.
