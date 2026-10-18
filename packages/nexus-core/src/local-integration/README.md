# NXB-0: inert Nexus Local Protocol contracts

**NXB-0 review candidate; NOT a G0-B sign-off.** Schema/fixture version: **1.0.0**.
Protocol: `nexus.local.v1`. Schema ID: `urn:nexus:local:wire:1.0.0`.

## Provenance and isolation

Authorized on 2026-10-18 against Nexus main
`835cd116174981efe2f330b1083552091f52f808`. References: YJNX-01 RFC v0.2.1,
SHA-256 `b64c3c4483435f06f7af7c5dd126d49c4e937eeb8bdcea6b23a4097680b59c74`;
synthesis SHA-256 `0948e8219ef1d8a160f2d9eba37231df7b7486e4dfd9005f5d9947b16074c018`;
G0-A_ARCHITEKTUR_ABSCHLUSS.md with its generation/scope/test-host clarifications.
The hash-identical supplied RFC file with the NEU suffix was read; the separately
named reference file was not present locally.

Import the explicit `local-integration/index.ts` subpath. No changes to the core
product barrel, dependencies, application entrypoints or existing domain owners.
There is no executor, IPC, transport, pairing, credential/grant service, database
access, draft drain, cursor service, Magic parser or serializer. The module does
not activate methods, register tools or authorize callers.

## Exact catalog and envelopes

| Method | Fixed Jarvis capability | Parameters |
| --- | --- | --- |
| system.hello | nexus.system.hello | supportedSchemaVersions; no profile/domain context |
| capabilities.list | nexus.capabilities.list | empty object |
| mutation.status | nexus.mutation.status | original action identity |
| notes.query | nexus.notes.query | current, limit, fields; optional query/cursor |
| tasks.query | nexus.tasks.query | current, limit, fields; optional query/cursor |
| reminders.query | nexus.reminders.query | current, limit, fields; optional query/cursor |
| planning.queryRange | nexus.planning.queryRange | current, absolute start/end, timeZone, limit; optional cursor |
| flux.getAttention | nexus.flux.getAttention | current, explicit now/timeZone, limit; **no paging** |
| notes.create | nexus.notes.create | title/content; optional tags; capture preconditions |
| tasks.create | nexus.tasks.create | title; optional desc/priority/durationMinutes/deadline/tags; capture preconditions |

Every envelope requires exact protocolVersion/schemaVersion, requestId and method.
Every object is closed. Hello offers bounded schema versions; an unsupported
envelope version fails conformance, and a future boundary may describe the
incompatibility as `unsupported`. Version/schema compatibility never grants access.
Capability descriptors correlate method and capability explicitly. schemaHash is
descriptive: a well-formed but unexpected hash still needs a peer compatibility
check. MagicDescriptorV1 supports bounded field types, syntax/persistence/client
metadata and dependencies, but cannot extend the ten-method catalog.

wire-v1.schema.json uses JSON Schema Draft 2020-12. TypeScript models derive from
the same constructors. validateContract performs only stateless structure/format
validation using the emitted keyword vocabulary, not arbitrary JSON Schemas.
Date/date-time format assertions are mandatory in other implementations too.

Limits: 128 KiB of canonical UTF-8 per wire document; depth <= 64; IDs <= 200
Unicode scalars; page size 1..100; title <= 512; note content <= 65,536; task desc
<= 8,192; 32 unique tags <= 64 scalars; cursor <= 2,048. Other bounds are in the
schema. Revisions/positions are nonnegative safe integers. Duration/field bounds
can be finite binary64 decimals. No defaults are applied.

Instants require a real Gregorian date (years 0001..9999), uppercase T/Z, seconds,
optional 1..9 fractional digits, and Z or an explicit numeric offset. Leap
seconds, 24:00 and unknown -00:00 offsets are outside this profile. Timezones have
bounded IANA-style syntax; existence and offset/DST agreement need future domain
validation. A civil task deadline is `{date,timeZone}`, not an invented UTC time.
Ambiguous local datetime input does not silently become now+1h.

## Context, reads and outcomes

runtimeGeneration is an opaque data/recovery generation. scope is independently
`{kind:"library"}` or `{kind:"workspace",workspaceId}`. Profile, account, session,
instance and renderer epoch remain distinct. Client context values are claims,
not authentication evidence. Null UI selection never grants Library access.

A well-formed workspace create/Planning/Flux request is not a promise of support:
early creates require an actual Library grant; workspace creates stay
unsupported_scope until an acknowledged owner exists. Membership setters and
createAndAssign are absent. Query DTOs are bounded metadata projections with id
always returned; they expose no arbitrary entity fields/content.

Read success uses status=accepted (no write acknowledgement), consistency=current
and separate durability. The future owner must enforce grants, memberships,
requested fields, limits, cross-message consistency and draft/source capture.
snapshotEpoch is SHA-256 of the JCS-normalized actual query/source projection,
including relevant domain fields/order, memberships and query/filter/field input;
never runtimeGeneration alone. The eventual query owner must supply domain
normalization. CursorBinding describes client/grant/context, query/membership/
source fingerprints, position and expiry. It does not protect or verify tokens.
Each future page needs fresh authorization and fingerprint checks. Flux binds
now/timeZone and provides no next page.

ERROR_STATUSES distinguishes empty success from not_ready, draft_pending,
stale/stale_cursor, scope_denied, unsupported_scope, recovery_pending and
storage_failure. Wire enums are lowercase: conceptual UNKNOWN_OUTCOME is
unknown_outcome. Accepted writes have an action but no receipt. Acknowledged
receipts have no pending effects; completed_with_pending_side_effect requires
structured pending/unknown effects. Receipt status and write method must agree.
A permitted DTO shape does not make a side effect available on a given method.

## mutation.status, retention and reconnection

Before a future write, persist actionId, clientId, exact method, unchanged
idempotencyKey, argumentsDigest and origin RuntimeContext. argumentsDigest is
SHA-256 of canonicalBytes(params), **without final LF**. Origin binds the original
scope/profile/account/generation/session/instance/renderer. Capture preconditions
use planningRevision; this does not impose that counter on future note edits.

After restart, mutation.status uses the **new current authenticated context** in
its envelope and the **unchanged original identity** in params.action. Origin
epochs are lookup data, never reusable authorization. Recheck current grants,
profile/account and scope before revealing a receipt. Never rewrite the original
key/digest. Same key with different arguments/identity must conflict.

Each acknowledged receipt advertises acknowledgedAt and retainedUntil, with the
latter >= the former. A future owner must durably retain receipt/dedupe evidence
at least until that instant; otherwise it cannot acknowledge an external write.
This package claims no operational retention duration; fixture dates are synthetic.
G3 must qualify the duration, index, persistence, restore and recovery behavior.

| Status-query state | Meaning |
| --- | --- |
| acknowledged | authoritative durable receipt; reuse its typed entities |
| completed_with_pending_side_effect | source saved; listed native effect pending/unknown |
| recovery_pending | recovery/index incomplete; await reconciliation |
| unknown_outcome | no authoritative dispatched-action outcome yet |
| not_found | no receipt found; **not proof of non-execution** |
| expired_or_unknown | retention/restore/epoch evidence cannot establish outcome |

None of the uncertain states authorizes a new key. Preserve unresolved client
records beyond the receipt horizon; expiry is not cancellation. Same-key
redelivery requires the separately qualified G3 dedupe/recovery path. A restore
must preserve evidence or report uncertainty. No exactly-once guarantee exists
here. Types cannot prove journal atomicity or equality across separate messages.

## Canonical bytes and reproducible hashes

Canonicalization follows [RFC 8785/JCS](https://www.rfc-editor.org/rfc/rfc8785):
recursive UTF-16 code-unit key ordering, unchanged array order, ECMAScript
binary64 number spelling, preserved Unicode and JSON escaping. No NFC/NFD or
content-newline normalization. Reject invalid Unicode/non-finite/non-JSON values.
Encode UTF-8 without BOM. Digest inputs have **no final newline**.

Corpus files contain canonical JSON plus **exactly one LF**. CRLF, indentation,
duplicate keys and malformed UTF-8 fail canonical-file verification. Python must
use JCS-compatible number/key encoding, not ordinary json.dumps defaults.

Sort the four payload filenames by ASCII byte order. Hash their exact file bytes,
including final LF, and record lengths/hashes in manifest.json. Concatenate one
UTF-8 line per sorted entry: lowercase SHA-256, two ASCII spaces, relative path,
LF. corpusSha256 is SHA-256 of that concatenation. manifest.json is excluded from
its own inventory/hash input. The schemaHash in capability fixtures equals the
wire-v1.schema.json **file hash**; no self-referential hash is embedded in schema.
Exact current hashes are published in test/fixtures/local-integration-v1/manifest.json.

Breaking shapes/meaning need a new schema major and versioned ID. Any corpus byte
change needs a new fixture version and reviewed manifest. The first 1.0.0 candidate
is not frozen by NXB-0; joint G0-B review remains required.

## Verification, handoff, risks and rollback

From repository root:

```powershell
node --import ./packages/nexus-core/node_modules/tsx/dist/esm/index.mjs packages/nexus-core/test/localIntegration.corpus.mjs
node --import ./packages/nexus-core/node_modules/tsx/dist/esm/index.mjs --test packages/nexus-core/test/localIntegration.test.mjs
npm --prefix packages/nexus-core run typecheck
npm --prefix packages/nexus-core test
```

The existing runner discovers the new tests and strict TypeScript negative type
examples. Intentional corpus generation uses the first command with --write;
tests never update goldens. Conformance vectors assert structural validity.
Large boundary payloads are constructed separately in tests. Canonicalization
vectors contain fixed strings, UTF-8 hex and SHA-256 expectations.

**scenarios.json describes future runtime requirements.** Each entry has
runtimeEvidenceRequired=true. Tests check message shapes/identity consistency,
not auth, grants, membership filters, draft draining, cursor staleness, durable
deduplication, crash recovery or model egress. These require later evidence.

YJNX-01A must consume these exact five files from the immutable NXB-0 commit,
verify hashes, implement the same closed schemas/formats and pass the same
conformance/canonicalization cases. Compare case IDs and validity, not diagnostic
wording/order. Report runtime scenarios separately. No Python project is changed
or authorized by this Nexus PR. TS/Python parity and independent review are still
needed for G0-B. D01, G1, D13-D16 and G2+ remain open.

No migration, stored data or end-user behavior changes. Rollback is a normal
revert of these isolated source/test/fixture files. No self-merge or next phase.
