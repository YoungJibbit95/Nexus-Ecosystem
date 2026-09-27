# Modernization on dev

Started 2026-09-27 from audited baseline `d39cfa2`. The user authorized implementation of the recovery roadmap on `dev`. The previous local `dev` tip (`da7ff3f`) is preserved at `archive/dev-before-recovery-20260927`; `origin/dev` and `main` have not been changed.

**Paused at the user's request, 2026-09-27.** The current packet is finished and verified. Continue only when the user says `weiter`. Read [the continuation checkpoint](next-session.md) first. The overall modernization is not complete.

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
