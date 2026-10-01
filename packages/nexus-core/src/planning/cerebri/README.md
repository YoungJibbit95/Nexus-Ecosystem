# N1 offline Cerebri consumer boundary

Decision status: bounded Nexus implementation approved for review on 2026-09-30.
Independent Architecture/Security qualification is pending. Cerebri ADR-0016 is Proposed;
this consumer does not promote it to Accepted or extend prior Math qualification.

Rust is the planning authority. This pure subtree maps established application facts to
the existing integration 0.1 `single_event_suggestion` profile and decodes its result.
Nexus retains product identities, permission/collection authority and all state changes.
No request or candidate selection writes a store, schedules notifications or creates an Event.

## Reviewed compatibility and ownership

Source: `1e1ecd6a2b38fde70c7d6ba8f6573404089334ac` of Nexus Cerebri.
The full Master v0.4, ADR index, Accepted 0001–6, 0008–9, 0012–15, Proposed 0016,
roadmap, application integration reference, N1 prompt, Rust facade and Node wrapper
were read against that immutable source. The active Lab checkout is not the build source.

Exact manifest axes are checked separately: integration 0.1, CPIR 0.2,
`single_event_suggestion`, FIND_SLOT, Test/Shadow/Suggestion, explicit temporal coverage,
execution false, 262144-byte request limit. Software version is metadata, not compatibility
or artifact authentication. Ranking feature schema 0.1 is decoded independently.

Reviewed Node SHA-256 pins (the host checks both before importing):

| Module | SHA-256 |
| --- | --- |
| `bindings/node/index.mjs` | `fed60240ce5954a251cb4c9be2da8f5cb9542ef064b45339e2cc409948053770` |
| `bindings/node/integration.mjs` | `2be76f3709b70ddcdc7d145e4bd84a1bcbcf1f95e50a2264e3a393f653a902b7` |

The Windows debug artifact built with locked/offline Cargo and Rust 1.97.0 had SHA-256
`9c101ded1fa054e72343e8beac08eb184b9bcbe14c4157a7e47577fba447bde0`.
This is test provenance, not a released or signed binary. Other platforms/builds need their
own reviewed artifact pin. Manifest matching alone cannot authenticate a binary.

## Entry points and mapping

- `prepareSuggestion(intent, snapshot)` constructs CPIR or returns typed clarification.
- `decodeManifest` and `decodeSuggestion` validate consumed transport/result fields.
- `createSuggestionOwner` owns opt-in state, correlation, cancellation and freshness.
- [Desktop host seam](../../../../../Nexus%20Main/electron/cerebri-host.mjs) verifies trusted
  artifacts and calls the actual reviewed Node wrapper, with one active call and no queue.

The intent is exactly `{taskId, requestId, traceId}`. Extra principal, path, argument,
permission, grant and arbitrary CPIR members are rejected before collection. A trusted
host collector must supply principal, read/plan permission, permission revision, workspace
generation, source/context revisions and a certified bounded availability collection.
There is no product collector or active IPC channel in N1. `enabled` defaults to false;
browser/mobile report unavailable, with no process or remote fallback.

The task stays a task. A separate prospective Event has null revision and Missing placement.
Duration is explicit positive integral seconds with USER_EXPLICIT provenance. A known UTC
deadline creates a LatestEnd constraint, never an occupied interval. Busy facts have known
UTC half-open ranges, source revisions and INTEGRATION_FACT provenance. N1 accepts resolved
UTC instants in 1970–9999 with up to nine fractional digits; no local-time solver is added.
Nanoseconds are compared exactly; equivalent Rust UTC serialization is accepted without
rounding. Original IANA zone is supplied explicitly and retained in the request.

Missing/Unknown/Uncertain/Ambiguous/Unresolved required duration/zone, date-only or unresolved
deadline, unsatisfied workflow readiness and unsupported recurrence require clarification.
Workflow edges do not become temporal DependencyOrder edges. Reminders do not become busy
events. Existing temporal recurrence/dependency/DST fixture evidence is retained by the
decoder, but the mapper does not claim those collection capabilities.

Coverage is always supplied explicitly. Empty busy lists do not establish Complete coverage.
Incomplete is passed through to Rust and yields InsufficientInformation, with its actual
evidence. Current product task/reminder views have no authoritative free/busy collection
contract; they cannot be wired as a Complete collector. Optional scope null and empty lists
retain distinct CPIR meanings. Neither scope nor Complete grants permission.

Both scope/policy mutation maxima are zero, allowed actions/grants are empty, uncertain
duration is disabled and confirmation stays conservative. No raw titles, descriptions,
Notes, Canvas content or credentials enter CPIR. No telemetry/evaluation capture exists.

## Result and asynchronous safety

Rust candidate order and original evidence are retained; no cost, ranking, interval search
or constraint repair is recomputed. Solution, NoSolution, NeedsRelaxation,
InsufficientInformation and ProvenOptimal/Complete/BestFound remain separate. Optimality
is grid-relative. The decoder validates every field it exposes as a typed candidate,
including identity, placement, revision, ranking features and analysis-only mutation values.
Remaining evidence is bounded, cloned JSON; consumers must add specific validation before
interpreting additional fields as domain types. It is never a lifecycle authorization proof.

Snapshot freshness includes bounded request content, task revision, workspace generation
and permission revision; capture time is metadata. A synchronous current-key check occurs
after the last asynchronous boundary. Source/scope/permission/sign-out changes must call
`invalidate` and/or change that key. New intent, disable and disposal abort old work;
late replies are discarded even when a port ignores AbortSignal. No stale result is retained.

The trusted host owns all module/binary paths and the reviewed binary checksum. It checks
hashes on each bridge call before import/spawn. This guards configuration/artifact mismatch;
it is not a signature or protection against a compromised host/directory changing bytes
between verification and use. A production package needs separate trusted artifact handling.
Concurrent verification/process calls reject with `busy`, without an unbounded queue.
The reviewed wrapper limits input to 256 KiB, output to 16 MiB and process deadline to
1–60000 ms. Abort/timeout kill the child. Fixed codes discard stderr/parser content.

## Developer conformance

Use a clean detached Cerebri source worktree at the pinned SHA. Preserve active Core/Lab
worktrees. Build there with `cargo build -p cerebri-node --locked --offline`. No source
changes are needed. Set `NEXUS_CEREBRI_N1_SOURCE` to that absolute test worktree path, then
from the Nexus repository run:

```powershell
node --import ./packages/nexus-core/node_modules/tsx/dist/loader.mjs --test packages/nexus-core/test/cerebri-consumer.test.ts 'Nexus Main/electron/cerebri-host.test.mjs'
node tools/run-client-tests.mjs --scope main
npm --prefix packages/nexus-core run build
npm --prefix 'Nexus Main' run build
```

The existing public runners discover the new tests. Without explicit source configuration,
real Rust host tests are visibly skipped; pure/default-off tests still run. Qualification
evidence requires an explicit run with zero skips. Only synthetic fixtures are collected.
Disposable std-only Rust processes test malformed/oversized output, failure and hanging
children; they do not substitute for the real planning conformance.

Rollback keeps the owner disabled and removes the unused seam; there is no database migration.
The next bounded slice is an explicit authoritative availability/host-collector contract,
reviewed independently before any product opt-in UI. Execution, packaging/publication,
provider integrations, observation collection and learning are later work.
