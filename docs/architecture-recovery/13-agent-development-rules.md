# Rules for future agent development

These are proposed durable engineering rules derived from the audit at `d39cfa2`. They are documentation for later authorized work, not instructions to begin implementation during this audit. User task scope and repository instructions still control each session.

## Before modifying a subsystem

1. Read the recovery index, the relevant health-matrix row and the subsystem's current local architecture/contract notes. Then inspect actual imports, entry points and callers. Docs are evidence of intent; code/tests establish present behavior.
2. Identify canonical domain state, UI state, drafts, persisted representation, derived projections and remote authority separately. Write down the current writer for each affected concept.
3. Trace one complete user action through UI → command/store → adapter → durable storage/platform result. Include delayed work, hidden views, process-local caches and cleanup.
4. Inspect the active package/build entry and test script. Do not edit Main's alternate Electron TS files assuming they are the running entry, or assume Code's TS build checks its JS application.
5. Inspect Git status and preserve unrelated work. Use the requested checkout and existing conventions; do not reinstall dependencies, regenerate native projects or reformat directories as incidental cleanup.
6. Check relevant history only to explain a concrete ambiguity. Do not replay instructions from old recode plans, worker prompts or unchecked TODOs as current authorization.

## Bound the task

An individual task should have **one architectural objective and one primary owner/contract**. A normal boundary is one feature controller or use case, its direct adapter, relevant tests and docs. Cross-client changes are appropriate when both clients consume the same narrow contract and the same fixture corpus.

File count is a review signal, not a rule: five tightly related files may be simpler than one 2,000-line controller. Pause task expansion when success requires understanding unrelated auth, storage, design and release systems at once. Split at an explicit interface. Do not manufacture dozens of tiny wrappers that still require the whole application to understand.

Use this work-packet template in a task or PR:

```text
Objective and observed problem:
Canonical owner and affected contract:
Current callers / state and storage keys:
Behavior that must stay identical:
Explicitly approved behavior differences:
Characterization and migration fixtures:
Implementation boundary / affected clients:
Checks and environment limits:
Rollback preserving post-change user data:
Docs or ADR affected:
```

## Preserve ownership and behavior

- Never silently create a second owner for existing state. A cache, draft, derived view and persistence mirror must declare which authority they follow and when they invalidate.
- Keep Calendar and Flux as projections unless a product requirement explicitly introduces independent data. Do not create a calendar database merely to simplify a component.
- Use named cross-domain commands for new orchestration. A view should not infer created IDs by diffing unrelated store arrays or directly replace several stores during import.
- Preserve IDs, links, active entities, dirty-close prompts, undo/redo, keyboard/IME behavior, default values and error UX. “Cleanup” is not permission to alter them.
- Keep UI confirmation outside future pure domain rules, while maintaining current prompts through a UI adapter.
- Treat public IPC, editor protocol, snapshot and storage-reader contracts as compatibility surfaces. Renaming internal files is less important than preserving these behaviors.
- Do not conflate Main's domain-command terminal, desktop Code's process terminal and Mobile's simulation. Expose capability differences honestly.
- Do not restore removed embedded editing because old helper files remain. Main/Mobile Code archive is active compatibility functionality.

## Persistence rules

- Distinguish queued, domain-committed and durable state. A resolved enqueue operation or cleared `dirty` flag is not proof of a storage transaction completing.
- Never remove the last recoverable old representation until the replacement has committed and passed the agreed verification. Migration must be restart-safe and idempotent.
- Maintain one writer per selected storage generation. Read-only shadow comparison is safe; uncontrolled old/new dual writes are not.
- Preserve unsupported/future data and unknown fields according to an explicit format policy. Do not silently normalize away Mobile `pm` or Main flat Canvas planning metadata.
- Version payloads and document upgrade/rollback paths. A `-v2` key name does not itself implement a migration.
- Report quota, serialization, transaction and unavailable-platform failures through a testable result. Do not swallow errors merely to keep the UI looking saved.
- Validate snapshot shape, IDs/references and declared integrity before applying it. Coordinate active drafts during restore. Separate clean parse failure from unexpected exceptions.
- Do not run tests or experimental migration against the only copy of real user data. Use sanitized synthetic/consented fixtures and retain recovery copies.
- Keep auth sessions/tokens out of workspace backups and diagnostic fixtures. Preserve existing logout/expiry behavior.

## Lifecycle and shared-code rules

- Every timer, subscription, worker, runtime and native schedule needs an explicit owner, start/stop condition and stale-result policy. Hidden cached DOM is still mounted.
- Capture entity ID/revision when scheduling save/analysis work. Reject or reconcile late results after tab/workspace/entity changes.
- Do not reactivate Main Auto-Sync by importing its dormant hook as an incidental fix. Hydration, fingerprint coverage, conflict policy and lifecycle must first be characterized, and the feature decision explicit.
- Preserve each client's current auth/fallback policy until changed deliberately. An unavailable service and an explicit authorization denial are different outcomes.
- Keep domain/format code free of React, DOM, Electron, Capacitor and client-store imports. Supply small adapters/factory arguments; avoid a dependency-injection framework.
- Move code into core only when there is a clear reusable contract and consumers. Document whether an export is authoritative, an optional helper or an experimental model.
- Do not adopt the shared settings singleton alongside the existing theme store. Decide ownership before sharing.
- Keep CodeMirror/Monaco, touch/mouse layouts, permission prompts and native IO local when their semantics differ. Sharing percentage is not a quality metric.
- Treat stylesheet order, transform ownership and reduced-motion behavior as contracts. Before broad CSS changes, capture focused visual/computed-style evidence. Do not append another global override to avoid understanding an existing cascade.

## Tests and acceptance

Characterize risky behavior before restructuring it. Prefer assertions on persisted bytes, stable IDs, command outputs and user-visible effects over tests that simply search implementation strings. Preserve source-pattern policy checks where useful, but never call them end-to-end tests.

Run the relevant subsystem checks and both consumers' contract fixtures when changing shared code. Expand to visual/browser/native testing when the changed lifecycle depends on those environments. A model smoke does not validate a real LSP server, native reminder, installer or Cloud account.

Report command, result, environment and known limitation. Keep pre-existing failures distinct from regressions. Do not disable failing checks, widen `any`, or remove assertions to obtain green output without a scoped explanation and compensating protection. Code's current 4,345 diagnostics need scope/triage; they are neither 4,345 confirmed bugs nor permission to ignore JS correctness.

Legacy removal requires import/config/entry/dynamic-reference inspection and supported upgrade fixtures. No static importer is only a candidate signal. Never delete Worker assets or native/generated entries by import count alone.

## Architecture records and documentation

Update the contract/ownership documentation in the same change when authority, lifecycle, format or public capability changes. Keep dated audit findings distinguishable from resolved behavior. Update README/Wiki capability claims when product behavior changes, including archive/simulation distinctions.

Recommend future ADRs under `docs/architecture/decisions/NNNN-short-name.md` with:

```markdown
# NNNN — Short decision name
Status: proposed | accepted | superseded
Date:
Owners / affected subsystems:

## Context
Observed problem, source evidence and constraints.

## Decision
Chosen owner, boundary and invariants.

## Alternatives
Including preserving the present design or a smaller repair.

## Consequences
Benefits, costs, limits and operational behavior.

## Migration impact
Compatibility, rollout, recovery and rollback.

## Affected contracts
Data formats, APIs, commands, lifecycle and tests.
```

Record only decisions made from now onward. Do not invent historical ADRs or label this proposed target accepted without a decision. Likely first ADR topics are durable save semantics, supported storage migration/retention, Canvas cross-client shape, per-client offline access and reminder lifetime. A small extraction that changes no ownership/contract need not acquire an ADR.

Finish each task with changed behavior/owner, preserved contracts, tests, remaining limits and rollback implications. Stop at the authorized scope; an audit or plan is not permission to execute its migrations.
