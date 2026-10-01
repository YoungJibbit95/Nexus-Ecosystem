# N2: locally qualified explicit preview and manual Nexus scheduling

## Boundary

N2 composes the existing N1 AnalysisOnly consumer with the canonical Nexus manual
planning command owner. It introduces no alternate solver, Cerebri ActionPlan,
ExecutionAuthority, lifecycle proof, telemetry, learned ranking or product collector.
The default Main store is disabled; neither App, Electron main, preload nor IPC is
registered. The panel is mounted only by the isolated synthetic browser harness.

The bounded package is locally testable. W5 production activation remains externally
gated on a trusted production collector and current independent integration architecture
qualification. ADR-0016 is Proposed; this implementation does not promote it, claim
independent Architecture/Math/Security qualification, or approve a native/product release.

## Actual dependency contracts

Rust/Node source is the N1 immutable pin
`1e1ecd6a2b38fde70c7d6ba8f6573404089334ac`. The N1 host verifies the actual binary
SHA-256 and both reviewed Node-module hashes before each manifest/suggest call.
CPIR 0.2, integration 0.1, single-event suggestion and zero mutations stay unchanged.
The current Master/Accepted ADRs and roadmap were reviewed; later evaluation
canonicalization checkpoints do not grant planning or execution authority.

The Main adapter consumes the same `planningStore.captureCommandSnapshot()` and
`planningCommands.execute()` used by manual planning. It does not create another
Task store or persistence format. Nexus `taskRevision` is canonical content of all
supplied Task fields, including future metadata. Its generation is a string. These
identities remain local; they are never guessed into Cerebri's numeric source revisions.

## Data and authority flow

1. The panel selects an existing unfinished Task and requires explicit integral duration
   (1..10080 minutes), IANA zone and resolved UTC start/end. The horizon is positive and
   at most 31 days. Nanoseconds finer than milliseconds reject at the Nexus seam because
   the manual command's interval representation uses JavaScript Date precision.
2. The renderer sends exactly six fields: taskId/requestId/traceId/durationMinutes/
   timeZone/window. Raw Task text, Note/Canvas/File content, links, permissions, facts,
   scope capability, CPIR, binary/module paths and secrets are excluded.
3. The host injects the actual source snapshot. Its task ID and window must match the
   explicit request exactly; a renderer cannot widen an existing Complete coverage
   claim. Only duration and zone are explicit user overrides. Coverage, read/plan,
   principal, source generation/revisions, deadline, workflow readiness and busy facts
   remain host-owned. A real collector must independently resolve those sources and
   provide a synchronous current snapshot; the synthetic fixture is not that collector.
4. The pinned Rust bridge returns candidates in Rust order. The UI retains the outcome,
   assessment and actual bounded-profile Rust reason enums. It does not reconstruct
   planning truth. BestFound says the search budget ended and optimality is unproved;
   IncompleteCoverage and PlanningPermissionDenied remain distinct from NoSolution.
5. A host ticket binds the exact input, context freshness key and returned candidates.
   There is at most one active preview, one ticket and no pending process queue. Ticket
   revalidation checks the current trusted snapshot; changed host facts/permissions/
   revisions invalidate it. A ticket conveys no mutation or execution authority.
6. Selection is read-only. Explicit confirmation is required before a separate manual
   Nexus schedule-task command. After the awaited host check, Nexus checks its full
   local Task/planning identity synchronously; the existing command owner checks it
   again before and after journaling. The manual command preserves the canonical Task.
7. Nexus independently evaluates its own coverage/conflicts. User confirmation of a
   Cerebri candidate does not silently accept Nexus issues. Its separate keepConflict
   checkbox is required when those issues exist; accepted issues stay on the block.
8. Success appears only after the existing journal/flush acknowledgement. An unchanged
   retry retains the same full command and receipt key; changed conflict consent gets
   a new command identity. Reload replays the acknowledged receipt without duplicating
   the manual block. Storage failures use the owner's existing rollback/recovery path.

There is no distributed atomic permission/collector transaction with the manual Nexus
write. Host freshness is a preview-quality check immediately before explicit manual
planning; Nexus owns write freshness and storage. This must not be presented as Cerebri
execution preflight or as a collector/permission TOCTOU guarantee.

## Reasons and failure behavior

`previewReasons.ts` translates pinned ValidationIssue, CandidateRejectionReason/
ViolationReason and PlanReason spellings from the bounded N1 profile. Unknown reason
codes or unsupported payload variants fail closed as an unavailable/unverified preview.
Compilation/Dependency payload interpretation is deliberately unimplemented because
N1 does not collect workflow graphs or recurrent series. No raw message becomes a
reason and no code is fabricated from an outcome or a heuristic.

Offline, timeout, budget, no fit, unknown coverage, permission denial, stale Task,
stale host and disabled state never issue an automatic command. The manual planning
button remains available; the browser harness opens the actual shared PlanningPanel
after a real disposable hanging-process timeout.

The explicit UTC fields are a local integration panel; civil-date/time collection and
DST gap/fold resolution stay with the existing manual PlanningPanel. No default local
time or zone is inferred into the N2 envelope.

## Reproduction and evidence

Use the existing pinned N1 Rust debug build and set `NEXUS_CEREBRI_N1_SOURCE` to its
absolute worktree path. Run the new core/host tests through the repository's installed
tsx ESM loader. A missing source makes the real host cases skip during general test
discovery; the recorded qualification sets the path and requires zero skips.

Run `node tools/run-cerebri-preview-browser-smoke.mjs`. Optional output paths are
`NEXUS_CEREBRI_N2_RESULT` (JSON) and `NEXUS_CEREBRI_N2_IMAGES` (screenshots).
The runner binds only loopback, owns closed synthetic scenario routes, uses an isolated
temporary Electron profile and verifies the cleanup target before removing it. It
compiles the pinned disposable Rust transport fixture solely for timeout evidence.
The real planner handles normal, unknown, denied, no-fit and budget cases.

This harness is not product IPC and is never imported by the application. No live
account, calendar, persistence profile or source content is collected. Captured receipts
contain synthetic full Task revisions because that is the existing local Nexus contract.

Executed source inventory, dependency hashes, runtime pins, logs, actual screenshots,
manual block, retained issues and fresh reload receipt proof are recorded under
`Nexus V7 Recovery/implementation/evidence/secondary-gates/N2-local-preview-qualification.md`.
