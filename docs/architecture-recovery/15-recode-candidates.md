# Evidence-supported partial replacement candidates

The following two candidates justify substantial replacement of **bounded persistence internals**, classified D. They preserve the surrounding applications and public behavior. Evidence and fixture limits are in [05](05-persistence-audit.md) and [09](09-test-protection-plan.md). No replacement is implemented or authorized by this document.

## Candidate 1 — Main/Mobile persistence write and migration engine

**Boundary:** `Nexus Main/src/store/persistence/indexedDbStorage.ts` and `storeManager.ts`, plus their identical Mobile counterparts. Replace internal scheduling, failure recovery, migration selection and durable acknowledgment while retaining compatible adapters for existing Zustand consumers. Domain stores, feature UI, theme behavior and backup UX are outside this replacement.

### Why replacement is justified

Actual source at E06/E07 removes old fallback data in `ensureLegacyCleared` before the new write commits. `queueFlush` clears pending work before `writeChunk`; `disableIndexedDb` discards queued state without replaying the failed batch. The in-memory failed-open fixture demonstrated early deletion and no fallback write for the failed first batch. Later writes use fallback, so apparent continued operation can conceal the missing earlier value.

The IDB transaction helper does wait for its transaction completion. The problem is the surrounding ownership of queued versus durable state, migration cleanup and fallback switching. Local fallback managers also swallow storage errors, and their unload flush does not flush the separate IDB queue.

A targeted repair can stop the reproduced path and may be appropriate as an urgent authorized fix. That repair alone is insufficient as the final architecture: requeue/retry, concurrent updates during failure, selected fallback state, reference/serialization caches, segmented snapshot completeness and cleanup ordering must obey one recoverability invariant. The present split offers no caller-visible durability/error contract. Replacing this small state machine behind its adapter is more bounded and testable than adding independent exception paths to both copied implementations. This is not a claim that incremental repair is mathematically impossible; it is an evidence-based scope choice for durable modernization.

### Behavior and contracts that must remain stable

- Existing storage keys, database/object-store names and supported envelope/segmented readers must continue to hydrate existing profiles. Preserve IDs, content, defaults and current store merge behavior until separately changed.
- Preserve Zustand-facing method shapes and store action APIs. Introduce readiness/commit/error observation through a compatible facade, then migrate save indicators deliberately; do not pretend the old enqueue promise already represented durability.
- Keep immutable-change/coalescing expectations and bounded interactive write cost. Preserve delete semantics and latest-write ordering explicitly.
- Keep Main and Mobile containers isolated as today; identical keys do not authorize sharing their databases across origins.
- Preserve theme/workspace/native ownership boundaries. Do not make this module a new cross-domain service locator.

The intentional corrections are no silent failed-batch loss, no last-copy deletion before a validated durable replacement, and truthful errors/commit status. Data-loss behavior is not a compatibility requirement.

### Required characterization before replacement

Run the same suite against both old adapters and the new facade: monolithic and segmented legacy reads; current IDB state; missing/corrupt segments; absent storage capability; rapid updates to the same key; deletion interleaved with writes; hydration concurrent with user actions; failed open/transaction/serialization/quota; new writes during a failed flush; fallback-to-IDB recovery; page hide/close and fresh-process reload. Assert retained bytes/revision and recovery source, not just setter calls.

For every failure injection point, either the prior complete representation or the latest acknowledged complete representation must remain readable. The existing failing probe establishes one case, not the complete suite. Add real-browser transaction/reload tests and representative installed-client upgrade checks before rollout.

### New boundary

A small storage engine owns the write queue, selected backend/generation, migration state and commit result. The existing adapter translates Zustand envelopes. Format validation/normalization stays explicit and versioned. A separate platform capability wrapper may supply IDB and fallback storage; no new framework is needed.

Expose observable hydration state, queued and durable revisions, flush result and recoverable errors. Decide whether records commit as a transaction or selected complete generation based on existing segment fixtures. Do not claim a cross-store transaction where different stores/backends still commit independently.

### Temporary coexistence

Keep legacy readers and the new implementation behind the same facade. Use a single selected writer per profile; a shadow implementation may compare reads/serialized output without mutating live data. Initially write to a staging generation, validate/read back, then switch the selected representation. Retain the old complete representation through the agreed recovery window.

An implementation switch must not revive the old early-deletion path. Rollback must include post-cutover edits: export/backward projection if proven lossless, or keep the new reader available for forward recovery. A feature flag alone does not solve incompatible stored data.

### Safe deletion gate

Delete old writer code only after all supported profile fixtures migrate/restart successfully, failure/recovery tests pass, both client adapters use the facade, and rollout evidence supports the retention window. Keep old-format readers as long as supported upgrades require them. Delete old stored generations only through a separate reviewed retention policy with recovery available; absence of current imports is insufficient.

## Candidate 2 — Code/Code-Mobile local file repository and migration coordinator

**Boundary:** file persistence portions of `Nexus Code/src/pages/editor/editorShared.jsx` and `storageManager.js`, and corresponding Code-Mobile modules. Replace their migration/index/content/cache/write coordination behind `loadFilesFromStorage`/`saveFilesToStorage` compatibility wrappers. Shared helper/settings behavior in `editorShared` must not be indiscriminately rewritten. Native workspace IO, editor engine, language services, tabs/panels and CodeMirror/Monaco remain outside this candidate.

### Why replacement is justified

The legacy reader fills `lastFileContentById`, then invokes a writer that skips unchanged cached contents. It writes an index without content and removes the legacy key. On a fresh module load the absent content keys become empty strings. Both actual-function fixtures returned correct first-load text and empty second-load text for the same synthetic legacy file.

Resetting that cache before migration would address this deterministic defect, but not the complete commit problem. Content keys and index writes are independently queued; legacy removal is immediate; the queued manager clears pending entries and swallows errors. A failure can therefore leave an index referencing incomplete contents or remove the only complete representation. Cache equality represents memory knowledge, not a verified persisted record.

A local hotfix remains a valid urgent option, but incremental cache/timeout patches are insufficient as final acceptance criteria. Migration selection, content/index consistency, deletion, error reporting and durable acknowledgment need one repository-level owner. Replacing those internals is narrowly justified by reproduced content loss and the incompatible write lifetimes; workbench/UI replacement is not required.

### Behavior and contracts that must remain stable

- Existing legacy `nexus-code-files` and v2 index/content data must remain readable. Preserve file IDs, names, folders, ordering, content including empty strings/Unicode/newlines, and non-content metadata.
- Preserve public loader/saver use sites during introduction. Keep file/settings migration responsibilities separate even if they originally share a source file.
- Preserve local versus native-workspace mode selection. Do not write native workspace contents into browser storage or change Electron/Capacitor filesystem semantics as a side effect.
- Preserve tab/buffer/editor behavior and current defaults. Improve save/error indication later through the explicit acknowledgment contract and characterized UI.
- Preserve both clients' platform/editor differences while sharing the same local-format guarantees.

The intentional correction is that a successful migration/reload retains legacy content and that failure cannot be reported as a durable save. Users with already-correct v2 records must not be forced through a destructive conversion.

### Required characterization before replacement

Fixture corpus: legacy-only single/multiple files; v2-only valid data; mixed legacy/v2 precedence; empty content; non-ASCII text; large content; folders; unknown metadata; duplicate IDs; missing content; invalid JSON; unsupported format; deleted/renamed/open files. Reset module caches between loads to model restart.

Inject failure between every content write, index write, selection marker and cleanup; include quota/serialization failure and interruption while deleting a file. Verify no selected index points to incomplete contents and that a complete prior generation survives. Exercise repeated save with identical content, content changed after load, and concurrent enqueue. Add a real browser reload trial and native-mode exclusion smoke for both clients.

### New boundary

A local file repository owns loading, format selection, complete snapshot validation, save revision, durable result and cleanup. Its internal content cache is an optimization tied to the committed generation, never proof that bytes exist. Compatibility wrappers keep current call sites stable while later edit-session work consumes commit/error status.

Choose a staged-generation protocol or transactional store only after the supported-format/quota decision. Moving every file to a new database is not required to fix ownership. Whatever backend is chosen, read the old representation without mutation, write and validate a complete replacement, select it, and retain the previous valid data. Native filesystem adapters remain separate repositories with their existing contracts.

### Temporary coexistence

Ship new readers behind the same loader entry point. Migrate one selected profile snapshot, retain the original legacy/v2 representation, and compare normalized content/metadata before selecting the new generation. Only the selected repository may write. Never run the known destructive legacy migration as a parallel “compatibility” writer.

Retain old implementation source for rollback comparison while routing incompatible new data through the new reader. To roll back runtime code safely, preserve edits after cutover via a verified compatible export or recovery path. Do not erase the newer generation just because an older app cannot read it.

### Safe deletion gate

Delete superseded cache/write coordination only after both clients pass the same legacy/v2/current corpus, interruption tests, real-browser reload and local/native mode smoke; validate supported upgrades and recovery retention. Retain backward readers for supported versions. Archive migration fixtures permanently in tests so a later optimization cannot repeat the load-cache-write deletion defect.
