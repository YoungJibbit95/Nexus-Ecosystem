# Persistence audit

Baseline: `d39cfa2`. Highest priority is preserving existing bytes and identifiers. No real user storage, databases, credentials or workspace exports were opened or modified. Reproductions used synthetic in-memory fixtures and the repository's actual functions.

## Storage and serialization inventory

| Data | Where / keys | Serialization and migration owner | Version / corruption handling |
| --- | --- | --- | --- |
| Main domain collections | IndexedDB `nexus-main-state-v1`, object store `persist`, `nx-app-v3` segments | `appStore.ts:603` plus `persistence/indexedDbStorage.ts` | DB version 1; persisted envelope defaults to version 0; no Zustand version/migrate option for this store. Main merge repairs seed/readme/active-note details, not all entity schemas |
| Mobile domain collections | `nexus-mobile-state-v1`, same object store and segment names | Mobile copied adapter + appStore | Same envelope behavior; merge is broadly current state plus persisted state |
| Canvas boards | Same client IDB, `nx-canvas-v1::{canvases,activeCanvasId,__meta}` | Each canvas store normalizes persisted boards | DB/key suffixes are not full migration ladders; viewport reset; Main history is session-only; clients normalize different planning fields |
| IDB fallback | localStorage original key or `name::__meta` and `name::stateKey` | Both copied `storeManager.ts` files | JSON parse errors become null or skipped segments; write/quota errors swallowed; partial segment sets may hydrate |
| Theme | localStorage `nx-theme-v5` via store manager | Client theme normalizer/merge | Merge/default normalization; key name alone does not establish a schema migration sequence |
| Workspaces/root metadata | `nx-workspaces-v1`; Main `nx-workspace-fs-v1` | Zustand default persistence and local merge/partialize | Workspace shape normalization; separate stores and no cross-domain commit |
| Mobile handoff checkpoint | `nx-workspace-handoff-v1` | `workspaceHandoffStore.ts` + FilesView | Checkpoint contains local domain snapshot; manual restore/merge, not remote sync |
| Main application terminal | `nx-terminal`, Zustand version 2 | `terminalStore.ts:742` migration and partialize | Explicit version/migrate exists; preserves selected history/macros rather than runtime processes |
| Mobile application terminal | `nx-terminal-v2` via store manager | Mobile terminalStore | Different key/implementation; suffix alone is not migration logic |
| Main disk handoff | `<selected-root>/Nexus Workspace/state/runtime.json`, individual note/code/task/reminder/canvas files, workspace metadata and manifest | `workspaceFsRuntime.ts` and `views/files/useWorkspaceSync.ts` | Runtime version 1; array-level parser; legacy root fallback; direct IPC file write, no shared transaction across export files |
| Mobile runtime handoff | Download/share/import `runtime.json` | `FilesView.tsx` | Version-1 snapshot; preview/risk/age, selective merge and checkpoint; its own parsing/application implementation |
| Main backups | IDB `nexus-main-workspace-backups-v1`, `snapshots`; exported JSON | `app/workspaceBackup.ts`; Settings applies it | `schemaVersion: 1`, max eight local backups, checksum field; parser does not verify checksum and validates only a small outer shape |
| Code local files, both clients | `nexus-code-files` legacy → `nexus-code-files-index-v2` + `nexus-code-file-content-v2:<id>` | `pages/editor/editorShared.jsx`, queued localStorage manager | Key-based migration; no transaction across index/content/delete; defect reproduced below |
| Code settings | `nexus-code-settings` | Each client's editorShared normalizer + Editor timers | Default merge/range validation; desktop and mobile defaults differ |
| Code workbench and extensions | `nexus-code.workbench-layout.v3` with v1/v2 legacy keys; `nexus-code-extension-registry` plus legacy extension key | `workbench/layoutConfig.js`, layout normalizers; `extensionSystem.js` | Explicit dock v3 and extension registry v3 normalization/migration; passing model smoke coverage |
| Code native workspace files | Actual selected directory via `window.electronAPI`; Code-Mobile Documents/Data via `nativeFS` | Editor/controller + platform adapter | UTF-8 file operations; not a versioned domain DB; dirty-buffer conflict/lifecycle policy remains UI-owned |
| Account sessions and device hints | Main/Code/Code-Mobile sessionStorage; localStorage remember/device hints and legacy-token cleanup | Client auth helpers | Expiry/shape handling varies; credentials are not part of workspace backup contract |
| Desktop GitHub token | Electron userData token-store JSON | `electron/services/secureTokenStore.cjs` | Version 1; Electron safeStorage or machine-local encrypted fallback. Device/account portability requires explicit policy; no secret file was read |
| Shared settings | `nx-settings-v1`, if shared store instantiated | Core settings schema/defaults/migrations/persistence | Schema version 1; normalized import. Not the active Main/Mobile theme persistence path |
| UI and diagnostics | Notes UI keys, dashboard layouts, Flux filters, reminder quiet hours, Canvas UI preferences, warmup stats, DevTools artifacts | Feature-local code/core helper modules | Mixed localStorage/IDB and local validation. Search text privacy migration exists for Mobile Notes; not all UI state should be durable |
| Cloud/client cache | Control instance Maps, in-flight requests, telemetry queue; browser-origin event bus | Core API managers | Catalog/layout/release/access caching. No visible durable Notes/Tasks replication or remote conflict-resolution implementation |

Evidence: E05–E11, E18–E23, E28 in [02](02-current-architecture.md#evidence-index); named constants in the sources are authoritative. Web storage is scoped to an origin/container. Identical keys across clients are copy drift, not proof they collide in their normal deployments.

## P1 — Code legacy migration can discard content (reproduced)

Both `Nexus Code/src/pages/editor/editorShared.jsx` and its Mobile counterpart do the following:

1. `loadFilesFromStorage` reads legacy files and populates `lastFileContentById` with each file's text.
2. It calls `saveFilesToStorage(normalized)` to migrate them.
3. `saveFilesToStorage` writes content only if it differs from `lastFileContentById`. The just-loaded text is therefore skipped.
4. It writes an index with `content` removed and removes `nexus-code-files`.
5. On a new module/session load, the index's missing content keys default to an empty string.

**Probe:** Extracted the two actual function declarations with the installed TypeScript parser, executed them in a VM with an in-memory Storage facade and fresh module caches, and seeded a single legacy `{id:'f1', name:'keep.txt', content:'VALUABLE TEXT'}`. First load returned the original text. Second load after the same store was migrated returned `''`. Both clients reproduced this. Immediate fixture writes eliminate timer/crash issues, demonstrating that the migration defect is independent of debouncing.

Scope: users with that legacy key and absent corresponding v2 content keys. Existing correct v2 data is not shown to be affected by this particular defect. Frequency in deployed profiles is unknown. Do not run a migration against production data to establish prevalence.

## P2 — Main/Mobile fallback removal precedes commit (reproduced)

`indexedDbStorage.ts:260` implements `ensureLegacyCleared` by calling fallback `removeItem`. `queuePersistedValue` calls it while queuing the new data, before the debounce/idle/frame/IDB transaction executes. At flush, pending entries are removed from the map before `writeChunk`; a failure calls `disableIndexedDb`, which clears pending state without replaying the failed full value to fallback.

**Probe:** Transpiled both actual modules, `indexedDbStorage.ts` and `storeManager.ts`, in memory. Injected Map-backed localStorage, deterministic timers/idle/frame callbacks, and IDB whose first open reports an error. Seeded `nx-app-v3` with a note containing `OLD`, then queued `NEW` using segmented mode with `notes`. After `setItem`, the old key was already absent while no scheduled task had run. Draining tasks left no storage keys: neither the old value nor the failed first batch survived. A later `setItem` containing `LATER` produced `nx-app-v3::__meta` and `nx-app-v3::notes` through the real fallback manager. Thus the loss window concerns preservation of the failed batch, not total absence of fallback support. Main/Mobile adapters and fallback managers are byte-identical after newline normalization; this fixture executed Main's pair. Actual browser IDB transaction behavior remains untested.

There is no explicit flush/durable acknowledgement or pagehide handling in the IDB adapter. The localStorage fallback has beforeunload/visibility handlers, but those do not flush data still owned by the IDB queue. Normal writes use a transaction and await `tx.oncomplete`, which is worth retaining; migration/failure ownership is the broken surrounding contract.

## P3 — Backup validation and commit are incomplete (reproduced/static)

`parseWorkspaceBackupSnapshot` checks schema version, `data`, `data.app` and `data.canvas`, then trusts the cast. `buildStats` accesses deeper arrays/workspace/terminal state. A fixture `{schemaVersion:1,data:{app:{},canvas:{}}}` throws after passing the outer checks. A valid synthetic snapshot with its checksum replaced by `'tampered'` is accepted with `ok: true`.

The checksum is informational in this implementation, not verified integrity. Do not retroactively claim it protects imports. `SettingsBackupRestorePanel.tsx:192` saves a safety backup, then separately sets five stores and optionally imports theme. The safety-backup UX is valuable; it does not make the following state changes atomic or validate referential consistency.

## P4 — Workspace synchronization intent exceeds active wiring (static)

Main Files imports and exports version-1 snapshots using the actual hook `useWorkspaceSync`; it exposes an Auto-Sync setting from `workspaceFsStore`. The separate automatic hook has no production caller in AST and text searches. Its `buildWorkspaceRuntimeFingerprint` considers timestamps/counts but omits folders and reminder title/message. A pure-function fixture changing those fields produced the same fingerprint. This is **latent reactivation risk**, not a demonstrated active autosync omission: the automatic caller is absent.

Manual import prefers runtime JSON over individual files, replaces several domains, and only replaces canvases/workspaces when incoming collections are nonempty. These semantics differ from “restore exactly this snapshot,” particularly for intentional empty collections. Preserve or explicitly change that behavior with fixtures. Individual filesystem exports are sequential and do not delete stale files; runtime JSON precedence therefore matters during fallback import. Main IPC `fs:write` uses a direct write, not a temp-file/rename snapshot protocol. [E09,E23]

## P5 — Serialization is close to UI/domain state (static risks)

- A note's `dirty`/`lastSaved` fields are saved with its content, but changing them is not proof that IDB committed. Code's local save indicators similarly precede queued storage completion.
- Segmented storage skips unchanged object references. In-place mutation by a future agent would defeat change detection; current immutable action patterns must remain an invariant.
- IDB fallback, domain IDB, workspace localStorage and native files are separate commit domains. Import success needs validation and a recovery record, not five unrelated successful setter calls.
- Quota and serialization errors are intentionally swallowed in queued localStorage managers to keep UI responsive. Users cannot distinguish saved from memory-only data through those APIs.
- Most app stores use versioned key names but omit explicit payload migrations. Unknown future versions and unsupported fields need a documented non-destructive policy.
- Code nativeFS returns `false`/empty arrays in some unavailable/error cases, while Electron bridge methods use other result shapes. Consumers need adapter contract tests rather than inferred equivalence from method names.

## Minimum future storage contract

Keep existing read formats and public CRUD APIs while introducing a storage boundary that can report hydration state, queued revision, last durable revision and errors. Migrations must read old data without deleting it, validate a complete new representation, commit it, read it back or otherwise verify it, then mark the new version selected. Retain old data until rollback criteria are satisfied. A metadata switch can select one format; simultaneous competing writers are prohibited.

Prefer a small versioned snapshot plus transactional IndexedDB records or staged filesystem replacement where the platform supports it. Do not introduce event sourcing or a distributed database. Validate schema and referential integrity before applying snapshots. Preserve unknown fields where lossless compatibility requires it. Proposed partial replacements and their coexistence strategy are in [15](15-recode-candidates.md); required tests are in [09](09-test-protection-plan.md).
