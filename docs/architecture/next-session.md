# Continuation checkpoint — 2026-09-30

The continuation prioritizes actual CI blockers and storage release safety. Stop after a documented atomic packet; the next session resumes with **weiter**. No automation or background architecture work while paused. The overall modernization and release acceptance remain unfinished.

## Repository and authorization

- Current working directory: `F:\Coding\Nexus Workspace\Nexus-Ecosystem-pr-persistence`. Branch: `fix/persistence-recovery-checkpoint`. Latest implementation commit: `346cc57` (CI repair `05702ad` plus Linux test-path fix); later handoff-only commits may follow it. Check `git log -1` for the documentation tip.
- Original audit-only request was superseded by the user's explicit instruction to implement the full recovery roadmap on `dev`. No new permission is needed for that authorized work after `weiter`.
- PR [#396](https://github.com/YoungJibbit95/Nexus-Ecosystem/pull/396) was already merged on 2026-09-27 as `7b15c69`. Earlier claims that main was unchanged and #396 remained Draft are historical. This session did not merge or replace main. The existing branch was reused, merging origin/main normally at `ff4bd91` without source differences.
- Follow-up Draft PR: [#418](https://github.com/YoungJibbit95/Nexus-Ecosystem/pull/418). Never force-push or discard unmerged work. Original checkout `Nexus-Ecosystem` remains clean on local `dev` at `10f8684`; its persistence checkpoint is in main, but it does not yet contain this CI repair.
- Old local dev is preserved as `archive/dev-before-recovery-20260927` at `da7ff3f`. Dev was rebuilt from the audited `d39cfa2` baseline; upstream was unset. Do not accidentally overwrite origin/dev.
- No subagents are authorized. No active goal or recurring automation was created.
- Audit and roadmap: `docs/architecture-recovery/00-executive-summary.md` through `15-recode-candidates.md`; in particular read the actual filenames for roadmap/target architecture before resuming. Current delivery ledger: `implementation-status.md`.

## Current packet and exact next step

Four lockfiles omitted the already-locked Rolldown OpenHarmony binding; Mobile and Code Mobile also had versionless placeholders. Both old PR and merged-main logs failed during npm installation. Correct metadata is now validated before install on every host. Existing package versions are unchanged. All six public packages use npm ci and the first process failure stops installation. Contract-parity uses Node 24 to satisfy existing Electron dependency engines.

Release verification has an explicit `--public-only` plan requiring all public builds, the Wiki audit, public contracts/regressions and real-browser persistence tests. Default/full mode still requires private Control sources. Public mode rejects partial-public flags and is independent of private siblings. Signing policy and installer workflows are unchanged. A green public check does not certify private products or installed releases.

1. Verify branch/status/latest commit and PR #418 checks. Finish any remaining CI blocker before other work.
2. Follow [storage-release-validation.md](storage-release-validation.md): create an isolated persistent-profile harness with separate Electron writer/reopened processes. Seed legacy browser records, migrate/save and verify the full manifest after a true process restart. The existing harness reloads a page within one Electron process.
3. Add controlled termination and actual filesystem IPC cases in owned temporary profiles/directories. Obtain fixtures from the supported previous release for installed-upgrade acceptance. Record native/mobile/signing gaps explicitly.
4. Only then resume W2 below. Do not reactivate dormant AutoSync or start broad dependency updates. Empty collection application and an app-wide restore operation guard remain known hazards. Issue #397 still tracks unresolved dependency maintenance.

## Completed implementation packets

- Deterministic public test discovery, public-only verification and stale Main web-preview graph assertion repaired.
- Shared queued persistence with transaction acknowledgment, versioned complete records, retained legacy readers/copies, quota retry, fallback and visible errors; Code local-file repository migrated to complete snapshots.
- Shared editor drafts/save queue binds saves to document identity and revision. Save All skips unopened native files. Rename/delete/workspace switch waits for saves and makes the editor inert; descendant native paths update on rename.
- Main backups validate nested data and checksums, capture detached data, and wait for backup database commit. Restore uses a durable recovery journal and compensating transaction; startup recovers before interactive mount. Notes flush the last draft and invalidate stale drafts on restore.
- Shared Canvas flat/pm planning projections preserve richer Mobile values and Main-only metadata. Both store normalizers retain unknown metadata; queued animation-frame patches flush through draftRegistry. See `canvas-compatibility.md` for bounds.
- **Last packet:** shared `packages/nexus-core/src/workspace/runtimeSnapshot.ts` validates complete version-1 runtime files. Main's reader and Mobile's parser delegate to it. Invalid present files throw in Main rather than falling through to loose-file import. Main snapshot builder detaches references. This only validates/captures data; the old import-application code still needs the next packet.

## Deferred W2 packet: workspace handoff after release-safety acceptance

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

## Historical verification — 2026-09-27

- `npm run test:public`: **79 passed**, 23 files.
- `npm --prefix packages/nexus-core run typecheck`: passed.
- `node "Nexus Main/node_modules/typescript/bin/tsc" --noEmit -p "Nexus Main/tsconfig.json"`: passed.
- Same command for `Nexus Mobile/tsconfig.json`: passed.
- `npm run test:persistence:browser`: **27 passed**, hidden Electron/Chromium, isolated profile, actual IndexedDB and fresh-page recovery; native editor writes are injected ports.
- Earlier packets: all four app production builds passed at their respective packet checkpoints; Code IDE core and 36 component render scenarios passed. They are not a substitute for rechecking subsequent changes.
- No known running verification process is left at the pause. Preserve committed work; check `git status` before editing. Resume with a concise German update and continue the roadmap without treating the overall task as newly scoped.

## Verification for the CI repair packet — 2026-09-30

- Fresh `node tools/install-public-packages.mjs`: all six packages passed npm ci with lifecycle scripts enabled (local Node 26.3.1/npm 11.3.0). Existing locked versions are unchanged.
- Local `npm run verify:public`: 78/78 structural checks, 88/88 tests across 26 files, all six lockfile checks, single-React and encoding passed. Core/Main/Mobile typechecks and public-surface/secret guards passed. No outstanding local verification failure.
- GitHub Node 24 Windows Release Gate passed at `05702ad` (run 36692033532): public suite, core/four app production builds, Wiki audit/build, hardening and 27 browser assertions. Signing environment remains optional in this preflight; installed/signing acceptance is not claimed.
- The newly enabled Linux test suite exposed a case-sensitive fixture path (`Titlebar.tsx` vs tracked `TitleBar.tsx`). Corrected at `346cc57`; all four affected local assertions passed unchanged. The original install failures are resolved on both runner platforms.
- Final-head GitHub results are recorded in the [PR #418 description and checks](https://github.com/YoungJibbit95/Nexus-Ecosystem/pull/418); consult that live record before continuing. It is separate from the earlier failed run 36692033550 and the passing Windows evidence above.
- Release status: #396 is already merged but its storage migration is **not release-ready**. Native upgrades, actual process restart/crash, filesystem acceptance and W2 empty-collection/restore-guard gaps remain. Next bounded packet is the isolated restart/upgrade harness above, after confirming #418 checks.
