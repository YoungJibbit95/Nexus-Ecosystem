# Storage migration release acceptance

Designed 2026-09-30 after verifying that PR #396 was already merged as `7b15c69`. Merge status does not constitute release acceptance. The CI repair changes tooling ownership only; it does not change storage formats or their owners.

## Evidence boundaries

- **Editor buffer / dirty state:** `useEditorPersistence` and `documentSaveQueue` own document identity, draft revision and save acknowledgment. A domain-store mutation is not a save acknowledgment.
- **Browser data:** `browserPersistence` / `durableQueue` own queued snapshots and IndexedDB transaction completion; `localFileRepository` owns Code's complete localStorage file snapshot. Tests with injected storage ports are model evidence. The browser harness uses real localStorage/IndexedDB, but its reload stage stays in the same Electron process and temporary partition.
- **Native filesystem:** client adapters supply the filesystem port. Current editor browser tests inject that port; they do not prove installed Electron IPC, permissions, atomic disk replacement or power-loss durability.
- **Application state:** Main's restore facade/journal coordinates backup application and startup rollback. Mobile workspace handoff and Main's disk import are still transitional paths with separate application logic.
- **Backup/export format:** validation, checksum and runtime-snapshot schema have distinct owners. A valid file is not proof that every importer applies empty collections or recovers partial application correctly.

## Acceptance matrix

The existing unit/browser fixtures below are useful evidence, not substitutes for the pending executable acceptance procedure. Run them via `npm run verify:public` and `npm run test:persistence:browser`; session results are recorded in `implementation-status.md`.

| Scenario | Existing protection | Remaining acceptance procedure / required outcome |
| --- | --- | --- |
| 1. Previous-version editor data | `localFileRepository.test.mjs`: legacy/v2 content and metadata survive migration | Seed a disposable profile using the last supported released binary; upgrade Code and Code Mobile; compare contents, IDs, metadata and untouched legacy copies. |
| 2. Existing workspace files | Save All browser fixture excludes unopened native files; file-tree rename preserves identities | Use a temporary real workspace with empty, Unicode, nested and unopened files. Open/save selected files through installed Electron; hash all others before/after. |
| 3. New repository data | Complete snapshot/revision and fresh repository-instance unit tests | Create/edit/delete files in each Code client; close the whole process and reopen the same isolated profile; compare the full manifest. |
| 4. Existing backups | Main backup validation/checksum fixtures; transaction ordering and rollback tests | Import versioned and supported legacy exports into disposable Main/Mobile profiles; re-export and compare semantic content, unknown metadata and attachments. |
| 5. Empty collections | Empty Code index/tombstones and runtime schema tests; browser runtime reader accepts empty arrays | Verify actual import application and subsequent hydration retain intentionally empty Canvas/workspace arrays. Known W2 gap: existing paths can retain old state or seed defaults. |
| 6. Corrupt/partial storage | Malformed/unknown snapshot and incomplete-v2 fixtures block default writes | Corrupt one selected record in each real backend; reopen. Show an actionable error, keep original bytes and allow recovery/export without implicit replacement. |
| 7. Restart after save | IndexedDB commit acknowledgment and fresh-page read | Terminate and start a new process with the same profile after acknowledged save. Verify data and clean/dirty state; current browser reload is not a process restart. |
| 8. Tab switch with dirty buffer | Identity-bound queue tests and real React tab-switch fixture | Exercise rapid switches with delayed native writes; only the matching document/revision may become clean. Repeat on the installed editor. |
| 9. Rename after edit | Native mutation guard ordering and nested-path unit fixture | Rename a file and parent folder with pending native drafts; reopen both paths and verify bytes, stable IDs and absence of stale-path writes. |
| 10. Delete after edit | Removing a file cancels its scheduled write; mutation guard fixture | Delete during queued saves through each client; no delayed write may recreate the file, and restart must preserve deletion. |
| 11. Save failure | Rejected writes remain dirty/retryable; quota and serialization fixtures | Use a denied/read-only real filesystem destination and exhausted disposable browser quota. Fail visibly, retain the previous complete generation, retry successfully. |
| 12. Autosave failure | Same shared save queue retains rejected drafts | Drive the actual autosave timer with a failing port/backend; verify dirty/error UI, no false success and a subsequent successful retry. |
| 13. Close immediately after edit | Synchronous exit checkpoint unit test; React unmount saves latest draft | Trigger the real window-close path immediately after typing. Browser drafts must survive reopen; native pending writes must use the intended close/unsaved-work policy. |
| 14. Crash/unexpected termination | Injected failed commits/rollback; browser fixture leaves Main journal pending before page reload | Kill only an owned test app process at controlled points before/after write acknowledgment and between restore steps. Reopen in a new process; get the prior or acknowledged complete generation, never a silent mixture. Do not claim hardware power-loss safety. |
| 15. Upgrade from old format | Pure legacy readers and migration-failure fixtures retain old copies | Use profiles created by the actual supported previous version, including segmented records, fallback records and v2 file content. Upgrade without clearing storage and compare all logical records. |
| 16. Reopen after upgrade | New repository-instance and browser reload fixtures | After migration, save new edits, close the process and reopen twice. New edits and schema selection must remain stable. Test explicit export/recovery before attempting downgrade. |

## Next bounded validation packet

First add a persistent **temporary** Electron profile harness with separate writer/reopened processes, leaving personal profiles untouched. Seed legacy browser records, migrate, acknowledge new bytes and verify them after a true process restart. Then add controlled process termination around commit/restore boundaries and exercise real filesystem IPC in a temporary directory. Record binary/platform/version, fixture origin, expected manifest and observed result per run.

Select the previous released binary/profile fixture from actual release metadata; do not substitute current-source generated data and call that an installed upgrade test. Installed Windows and supported mobile upgrade acceptance remain required. Preserve downgrade/export caveats in `storage-contract.md`. Complete this safety packet before broadening W2 handoff migration or recommending a production release.
