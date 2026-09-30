# Modernization progress

Started 2026-09-27 from audited baseline `d39cfa2` on authorized local `dev`. The previous tip (`da7ff3f`) remains at `archive/dev-before-recovery-20260927`; divergent origin/dev is preserved. On continuation, PR #396 was found already merged into main as `7b15c69`. This session continues on the existing PR branch and does not merge or replace main.

**Bounded checkpoint, 2026-09-30:** public CI repair completed locally and submitted as Draft PR #418; use its checks for final-head status. Resume with `weiter` from [the continuation checkpoint](next-session.md). The overall modernization and release acceptance are incomplete. Older packet entries below describe their historical state.

## Working decisions

- Preserve current product behavior, platform capabilities, identifiers and all supported readable formats. Corrections to reproduced data loss are intentional behavior fixes.
- Keep local/offline access policies as implemented. Do not reactivate dormant automatic workspace synchronization during internal refactoring.
- Preserve both Canvas planning shapes through lossless adapters before consolidating internal use.
- Preserve legacy readers and old complete data. Never perform retention cleanup implicitly during migration.
- Merging or replacing main is the final integration stage, after all applicable verification gates. This ledger must not describe unexecuted native or visual checks as passed.

## Waves and acceptance

| Wave | Status | Acceptance / remaining work |
| --- | --- | --- |
| 0: characterization and contracts | In progress | Executable storage failure/restart fixtures; snapshot/draft/access fixtures; deterministic public test discovery; repair stale verification |
| 1: storage durability | Implemented; acceptance in progress | Both storage families share tested engines and visible errors. Browser commit/reload passes. Native upgrade and interruption acceptance remains |
| 2: snapshot and state ownership | In progress | Code drafts/manual save, Main Notes draft revisions, validated backup restore/journal implemented. Disk/mobile handoff unification, lossless Canvas transfer and remaining cross-domain commands remain |
| 3: lifecycle and feature controllers | Pending | App-owned reminder lifecycle, bounded cross-domain commands, shell/IDE lifecycle boundaries |
| 4: cross-client consolidation | Pending | Adopt verified shared contracts without merging platform presentation or editor engines |
| 5: verified legacy cleanup | Pending | Confirm entry/config/dynamic consumers before removal; retain supported data readers |
| 6: architecture enforcement | Pending | Public CI lane, import constraints, current subsystem docs, build and behavior acceptance |

## Verification record

Audit baseline results are preserved in `../architecture-recovery/09-test-protection-plan.md`. Implementation results will be recorded here per work packet. A passing model test is not installed-device, live Cloud or release-signing evidence.

### Storage and Code draft packet — 2026-09-27

- Deterministic public discovery: 18 files, 62 tests passed; includes previously omitted DevTools and Code Mobile debug tests.
- Public ecosystem verification: 77/77 at initial gate repair. Core/Main/Mobile no-emit typechecks passed.
- Both Code production builds passed after shared draft/save adoption. The Code build's existing TS scope still does not check the full JS application; that debt is not declared resolved.
- Hidden Electron/Chromium smoke: real IndexedDB commit and fresh-page read; identity-bound manual save; dirty acknowledgment; final draft preserved through unmount and reload. All 10 assertions passed.
- Storage formats, ownership, fallback and rollback constraints: [storage contract](storage-contract.md).
- Main, origin/dev and remote history remain unchanged. No release/installer or physical-device acceptance has been claimed.

### Main backup/Notes packet — 2026-09-27

- Non-throwing backup validation, checksum compatibility, immutable capture and transaction-complete backup writes. Five backup roundtrip/rejection fixtures passed.
- Generic journal-before-mutation coordinator: success, compensating rollback and retained evidence after rollback failure tested.
- Main applies through one restore facade; pending recovery is handled before interactive UI mounts. Same-ID restore invalidates previous Notes drafts. Manual Notes save awaits durable storage acknowledgment.
- Browser smoke expanded to 17 assertions including actual Main stores, interrupted restore/reload recovery and Notes final-keystroke preservation. All passed.
- Main production build and web-preview graph verification passed after repairing the stale assertion that still required Monaco in the retired embedded-editor archive. Mobile production build also passed for the storage packet.
- Additional queue regression: empty flush immediately followed by an edit cannot return a false durable acknowledgment; serialization failures remain visible until a valid replacement is queued.
- Details and remaining platform limitations: [restore contract](restore-contract.md).

### Native editor file operations — 2026-09-27

- Save All now writes dirty drafts only; an unopened filesystem entry with no loaded content is never serialized as an empty native file.
- Rename/delete/workspace switch run after acknowledged saves, with an inert editor during the operation. Folder renames update descendant native paths while preserving IDs; descendant traversal terminates on cyclic metadata.
- Core: 43 tests passed. Browser harness: 21 assertions passed, including Save All's unopened-file protection, operation ordering and the actual modal guard. Both Code builds, desktop IDE-core scenarios and 36 component render scenarios passed.
- Native filesystem IO in the new browser fixture is an injected port. Physical-device/native filesystem acceptance remains outstanding.

### Canvas compatibility — 2026-09-27

- Shared planning projections preserve Mobile's richer pm metadata through Main and keep Main-only fields through Mobile. Live imports, backup restore and store hydration use these adapters.
- Both Canvas stores flush queued animation-frame patches before persistence/export/replacement. Unknown entity metadata is retained by normalization.
- Core: 45 tests passed. Browser harness: 25 assertions passed, including actual Main/Mobile roundtrips and queued patch capture. Main/Mobile no-emit typechecks passed.
- Supported mapping and normalization limits: [Canvas compatibility](canvas-compatibility.md).

### Runtime snapshot validation and pause checkpoint — 2026-09-27

- Main and Mobile now use one complete version-1 runtime schema. Missing collections, invalid entities, duplicate IDs, unknown versions and unexpected state/action keys are rejected before the import UI applies data. Unknown entity metadata and intentionally empty collections remain valid.
- Main's runtime reader throws for a present but invalid primary/fallback file instead of treating it as absent and continuing with a partial directory import. Runtime snapshot creation detaches live references. This packet does not yet change how accepted imports are applied.
- Public tests: 79/79 passed across 23 test files. Core, Main and Mobile no-emit typechecks passed. Hidden Electron browser smoke: 27 assertions passed across write and reload, including the actual Main runtime reader.
- Pending W2 work: durable multi-store handoff on both clients, empty-collection application/hydration, fresh draft capture in every export path, cross-domain ownership. See the checkpoint before continuing.

### Intermediate PR preparation — 2026-09-27

- User authorized a draft PR for the completed checkpoint while the larger modernization remains paused. `fix/persistence-recovery-checkpoint` carries a snapshot based on current main; local dev remains the continuation branch and the divergent remote dev is preserved.
- All four app production builds passed at source checkpoint `699a06b`; this preparation changes verification/documentation only. No native installer/device upgrade acceptance is claimed.
- Repaired the static backup UI gate to check delegation to the restore coordinator and added a coordinator safety-backup/journal gate. The public verification chain now passes 78 structural checks, all 79 tests, the single-React check and encoding verification. The public-facing secret scan also passed.
- Draft status remains appropriate until installed-app upgrades, interruption/native filesystem cases and the supported downgrade/export procedure have been accepted. No merge or release publication is part of this checkpoint.

### Public CI contract repair — 2026-09-30

- Actual baseline: #396 was already merged at `7b15c69`; installation failures persisted in main runs 36319805381 (contract-parity) and 36319805499 (Release Gate). Mobile reproduced `Invalid Version` locally before repair. Code/Wiki logs named the missing Rolldown OpenHarmony binding. No existing locked package versions changed.
- Install ownership now resides in one six-package public manifest and a fail-fast runner. A host-independent lockfile guard rejects versionless entries and incomplete Rolldown optional-platform records before npm prunes foreign platforms. Node 24 satisfies already-locked Electron tooling engines.
- Release-gate plan owns scope selection: public checkout checks all public builds/audit/contracts/regressions plus browser persistence; default/full workspace verification still requires private Control. Previously the public workflow requested a full workspace while checking out only the public repository. Correcting that input contract does not certify private products or weaken the full release path. Partial-public flags are rejected, and full missing-Control failure is tested.
- Product/storage owners, schema, migration policy and legacy readers are unchanged. W2 handoff/state ownership gaps remain. The [release acceptance matrix](storage-release-validation.md) distinguishes all 16 scenarios, current model/browser evidence and missing installed/native/process-crash acceptance.
- Implementation commits `05702ad` and `346cc57`; follow-up Draft PR [#418](https://github.com/YoungJibbit95/Nexus-Ecosystem/pull/418). Existing branch reused; local dev and main were not edited by this packet. The Linux suite revealed a pre-existing wrong-case `Titlebar.tsx` fixture path; it now uses the tracked `TitleBar.tsx` and retains every assertion.
- Local Node 26.3.1/npm 11.3.0: all six clean npm ci installs passed with lifecycle scripts enabled. Public verification passed 78 structural checks, 88 tests across 26 files, six lockfile checks, single-React and encoding. Core/Main/Mobile no-emit typechecks and public-surface/secret guards passed. Narrow preflight: 12/12; affected titlebar/UI suite: 4/4.
- GitHub Node 24 Windows run 36692033532 passed the complete public Release Gate at `05702ad`: core and four app production builds, Wiki audit/build, public contracts/tests, hardening and 27 browser assertions. Linux installation also succeeded; its subsequent wrong-case fixture failure was corrected at `346cc57`. See the PR description/checks for final-head rerun results rather than treating the earlier run 36692033550 as current status.
- The next packet is actual process-restart/upgrade acceptance in temporary profiles. Existing browser reloads do not prove a new process or installed upgrade. Full workspace/signing/device validation remains outstanding; the already-merged #396 is not approved for a production release.
- npm/GitHub still report dependency advisories outside the repaired lockfile metadata. Issue #397 remains open; no broad upgrades, alert suppression or release approval are part of this packet.

### Main dependency-audit blocker — 2026-09-30

- Linux contract-parity and Windows Release Gate passed at `083da72`. The additionally triggered Main UI Gate failed its unchanged moderate-level audit in run 36692775945. Registry audit reports identified Electron, brace-expansion, fast-uri and undici; this is a concrete CI/security exception to deferred dependency maintenance.
- Commit `fbd65f3` updates only Main's four affected locked packages within existing majors: Electron 42.9.0 to 42.11.9 (manifest minimum ^42.10.0), brace-expansion 5.0.9 to 5.0.12, undici 7.29.0 to 7.29.1, fast-uri 3.1.6 to 3.1.8. Existing security overrides were adjusted; Electron-builder, product dependencies and other clients were not broadly upgraded.
- Regenerated Main lockfile passed the host-independent guard and `npm audit --audit-level=moderate` returned zero vulnerabilities. Final fresh-install/build/runtime and GitHub results are maintained in PR #418's description/checks, linked from the handoff, so later CI completion does not require an endless documentation-only rerun.
- No product owner, persistence schema or legacy-reader change. Installed Electron and mobile upgrade/crash acceptance remain incomplete; the browser harness's default Electron comes from Code. A Main-runtime smoke must select Main's executable explicitly. Other clients' outstanding dependency work remains in #397.
