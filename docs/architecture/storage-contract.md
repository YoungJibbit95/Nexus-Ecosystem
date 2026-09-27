# Durable storage and editor ownership

Implemented on `dev`, 2026-09-27. The audit under `../architecture-recovery` describes the preceding baseline.

## Owners

- Main/Mobile Zustand storage adapters delegate to `packages/nexus-core/src/storage/browserPersistence.ts`. `durableQueue.ts` owns immutable queued bytes, retries and commit revisions; `persistedSnapshot.ts` owns the envelope and legacy readers. React is only imported by the notice/hook entry points.
- Code/Code Mobile local files use `localFileRepository.ts`, through explicit browser/client adapters. `useEditorPersistence.ts` owns drafts, scheduled saves, manual saves and lifecycle checkpoints. Platform filesystem writes remain injected by the client; CodeMirror/Monaco remain separate.
- Store mutation, enqueue, backend commit and native filesystem acknowledgment are distinct. UI save markers clear only after the matching document revision succeeds. The browser's IndexedDB transaction completion is the acknowledgment boundary, not a claim about hardware fsync.

## Formats and migration

Main/Mobile new records use `<existing-store-name>::__snapshot-v1`, containing `{format:"nexus-persist",formatVersion:1,value:{state,version}}`. A null value is a tombstone. Existing DB names and object stores are retained. Old monolithic and segmented records remain readable and are never deleted by migration.

Code new local records use `nexus-code-files-snapshot-v3`, containing `{schema:"nexus-code-files",version:3,files:[...]}`. Identity, content and unknown metadata are in one atomic localStorage replacement. The legacy `nexus-code-files` and v2 index/content records remain readable and retained. Empty content and an empty file list are valid; missing content is not silently converted to a saved empty file.

Malformed selected records and unknown format versions block writes for the affected store/repository and surface an error. Such profiles require recovery/export; replacing them with defaults is not a recovery policy.

## Failure, fallback and lifecycle

Pending writes survive open/transaction/quota failure in memory and support retry. A later edit during IO cannot be removed by an earlier commit. Serialization captures bytes at enqueue. A local fallback snapshot takes precedence over IndexedDB on restart, preventing stale primary data from replacing a successful fallback write. Once selected, fallback remains the writer for that store. Promotion and retention cleanup require a separate migration; neither happens automatically.

Visibility/pagehide/unload checkpoints synchronously save complete pending snapshots to localStorage. This may select fallback for that store. Local editor checkpoints include drafts still outside React/domain state. Native editor writes are ordered per file and closing with outstanding native drafts requests the browser's unload protection while writes run; abrupt process termination remains outside this guarantee.

Retaining generations uses additional quota. Failure keeps the previous generation and reports unsaved work. Do not roll back to a binary that only reads the older keys without first exporting/projecting the new generation; retained old data does not contain subsequent edits.

## Verification

- `npm run test:public`: all discovered public tests, including storage/revision/access fixtures.
- `npm run test:persistence:browser`: isolated hidden Electron renderer; real IndexedDB commit, page reload, React draft tab switch/manual save/unmount. It does not use a real user profile.
- Main/Mobile/core typechecks and Code/Code Mobile production builds.

Installed Android/iOS upgrade tests, force-kill recovery, multi-window conflict resolution and native filesystem failure tests remain separate acceptance work. This contract does not claim those are complete.
