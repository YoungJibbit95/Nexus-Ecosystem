# Continuation checkpoint — 2026-09-27

The user requested: finish the current step quickly, stop, and continue at this exact point when they say **weiter**. Do not start an automation or continue work while paused. The overall cleanup/recode is unfinished; this is a verified checkpoint, not final acceptance.

## Repository and authorization

- Working directory: the `Nexus-Ecosystem` repository inside the Nexus workspace. Branch: `dev`.
- Original audit-only request was superseded by the user's explicit instruction to implement the full recovery roadmap on `dev`. No new permission is needed for that authorized work after `weiter`.
- Keep `main` untouched until implementation and applicable acceptance gates are complete. The user intends a later main integration/replacement; it has not happened. The user subsequently authorized an intermediate draft PR on `fix/persistence-recovery-checkpoint`; see this chat's attached PR. That separate snapshot does not resume the larger modernization or overwrite origin/dev.
- Old local dev is preserved as `archive/dev-before-recovery-20260927` at `da7ff3f`. Dev was rebuilt from the audited `d39cfa2` baseline; upstream was unset. Do not accidentally overwrite origin/dev.
- No subagents are authorized. No active goal or recurring automation was created.
- Audit and roadmap: `docs/architecture-recovery/00-executive-summary.md` through `15-recode-candidates.md`; in particular read the actual filenames for roadmap/target architecture before resuming. Current delivery ledger: `implementation-status.md`.

## Completed implementation packets

- Deterministic public test discovery, public-only verification and stale Main web-preview graph assertion repaired.
- Shared queued persistence with transaction acknowledgment, versioned complete records, retained legacy readers/copies, quota retry, fallback and visible errors; Code local-file repository migrated to complete snapshots.
- Shared editor drafts/save queue binds saves to document identity and revision. Save All skips unopened native files. Rename/delete/workspace switch waits for saves and makes the editor inert; descendant native paths update on rename.
- Main backups validate nested data and checksums, capture detached data, and wait for backup database commit. Restore uses a durable recovery journal and compensating transaction; startup recovers before interactive mount. Notes flush the last draft and invalidate stale drafts on restore.
- Shared Canvas flat/pm planning projections preserve richer Mobile values and Main-only metadata. Both store normalizers retain unknown metadata; queued animation-frame patches flush through draftRegistry. See `canvas-compatibility.md` for bounds.
- **Last packet:** shared `packages/nexus-core/src/workspace/runtimeSnapshot.ts` validates complete version-1 runtime files. Main's reader and Mobile's parser delegate to it. Invalid present files throw in Main rather than falling through to loose-file import. Main snapshot builder detaches references. This only validates/captures data; the old import-application code still needs the next packet.

## Exact next step: complete W2 workspace handoff

Start from these current files:

- `Nexus Main/src/lib/workspaceFsRuntime.ts`: shared schema adopted; fingerprint still ignores some changed fields; native writer is still a direct one-file write. Dormant `hooks/useWorkspaceRuntimeSync.ts` has no caller: **do not reactivate AutoSync**.
- `Nexus Main/src/views/files/useWorkspaceSync.ts`: runtime import still directly mutates several stores and skips empty Canvas/workspace arrays; loose-file import does likewise. Export captures some render-prop values instead of flushing drafts and reading all current stores. Use the existing validated Main backup/restore facade for one journaled operation, or a proven shared coordinator. Preserve file layout and existing loose-file import behavior while making application recoverable.
- `Nexus Mobile/src/views/FilesView.tsx`: large inline capture/merge/apply methods. Extract a pure tested merge/selection policy, then a client handoff coordinator. Capture after draft flush, preserve selected-section merging, include folder definitions referenced by imported entities, await durable acknowledgment before success, and recover interrupted changes before mounting UI.
- `Nexus Mobile/src/store/workspaceHandoffStore.ts`: current checkpoint is session-only (partialize excludes it). It is not a durable restore journal. Preserve the UI checkpoint feature, add durable recovery separately.
- `Nexus Main/src/app/workspaceRestore.ts`, `workspaceRestoreJournal.ts`, core `storage/snapshotTransaction.ts`: existing Main backup mechanism can be reused. A shared recovery-journal factory/global workspace-operation guard was considered, **but no unfinished scaffolding was kept**. Main restore currently has a local running flag and Settings busy UI; background UI edits during journal IO still need an app-wide operation guard.
- `Nexus Main/src/store/workspaceStore.ts` and Mobile equivalent: hydration falls back to defaults when a persisted workspace array is empty. Preserve intentional empty lists; normalizers should retain unknown entity metadata. App-store bundled README seeding is separate existing policy: characterize it rather than silently removing it.
- Add real-store browser interruption/rollback tests for Mobile handoff and accepted empty-snapshot application. The harness already proves Main backup recovery and Canvas cross-client roundtrips.

## Later roadmap work still outstanding

- W3: app-owned reminder runtime (currently owned by views), serial native notification reconciliation, explicit permission flows, controller/lifecycle boundaries and stable-ID cross-domain commands. Inspect current behavior before moving it; keep offline/auth policy.
- W4: additional proven shared behavior/contracts; preserve different editor engines and platform presentation. Main global CSS requires visual characterization before extraction.
- W5: verify entry points/config/dynamic references before deleting retired embedded-editor helpers, alternate Electron entries, dormant hooks or generated tracked files. Keep supported legacy storage readers. Main's small Code archive view remains a supported surface.
- W6: public CI, import/ownership constraints, meaningful Code JS checking (existing normal builds omit most JS), current architecture/product/Wiki docs, builds and behavior acceptance.
- Known small debt: `mainAppConfig.ts` imports view IDs via lazy `viewPreload.tsx` rather than registry; Mobile App version literal is stale; shared settings ownership and client Code settings persistence need review.
- Native devices, installed-app upgrades, signing and visual acceptance have not been proven by the injected/browser fixtures. Do not label the overall migration or main integration complete based only on model tests.

## Verification at this checkpoint

- `npm run test:public`: **79 passed**, 23 files.
- `npm --prefix packages/nexus-core run typecheck`: passed.
- `node "Nexus Main/node_modules/typescript/bin/tsc" --noEmit -p "Nexus Main/tsconfig.json"`: passed.
- Same command for `Nexus Mobile/tsconfig.json`: passed.
- `npm run test:persistence:browser`: **27 passed**, hidden Electron/Chromium, isolated profile, actual IndexedDB and fresh-page recovery; native editor writes are injected ports.
- Earlier packets: all four app production builds passed at their respective packet checkpoints; Code IDE core and 36 component render scenarios passed. They are not a substitute for rechecking subsequent changes.
- No known running verification process is left at the pause. Preserve committed work; check `git status` before editing. Resume with a concise German update and continue the roadmap without treating the overall task as newly scoped.
