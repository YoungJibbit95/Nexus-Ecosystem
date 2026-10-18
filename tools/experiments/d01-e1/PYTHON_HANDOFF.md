# D01-E1 handoff for the separately authorized YJarvis Python testclient

This is a specification, **not authorization or implementation of D01-E2**.
No AgentService, chat, tool registry, policy, approval, model or Nexus domain path
may be connected by the later client experiment. Use synthetic payloads only.

## Controller and endpoint bootstrap

Launch the opt-in Node CLI from a verified experiment checkout; capture stdout
through an inherited private pipe and keep stdin open. Read exactly one LF-ended
startup JSON object. It contains:

```json
{"experiment":true,"version":"nexus.transport.experiment.v1","candidate":"loopback","instance":"<32 lowercase hex>","token":"<64 lowercase hex>","maxFrame":8192,"endpoint":"http://127.0.0.1:<random port>/experiment","security":{}}
```

For UDS, endpoint is a fresh `/tmp/nxd01-*/s` path; for Windows Pipe it is
`\\.\pipe\nexus-d01e1-<32 lowercase hex>`. Native helper runtime/path must be
provided by the controller. A readiness object is process-level experiment state,
never product/domain readiness or an authenticated Nexus installation.

Keep the token only in controller memory. Never place it in argv, a discovery
file, environment variable, test-result JSON, prompt or version control. Closing
controller stdin requests cleanup; losing the parent also closes helper stdin.
At most five minutes per host. Restart means a new descriptor, token and instance.
Never silently reuse stale values or auto-retry a production operation.

## Exact synthetic wire profile v1

Messages are flat ASCII JSON objects with lexicographically sorted ASCII keys,
no insignificant spaces, no BOM, no final LF. For the permitted fields, Python
`json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True)`
encoded as UTF-8 yields the required bytes. Nested values, duplicate keys,
noncanonical spelling, extra/missing fields and other methods are rejected.
This narrow profile is deliberately **not** the accepted domain schema/JCS API.

Only these two request shapes exist (placeholders must be replaced in memory):

```json
{"id":1,"instance":"<instance>","method":"experiment.hello","nonce":"<fresh 32 lowercase hex>","token":"<token>","version":"nexus.transport.experiment.v1"}
```

Successful hello returns exactly `id`, `instance`, `maxFrame`, `ok:true`,
`session` (32 lowercase hex) and `version`. Session is synthetic memory state,
not a productive account/client/session grant.

```json
{"id":2,"instance":"<instance>","method":"experiment.echo","payload":"synthetic:0123456789abcdef","seq":1,"session":"<hello session>","token":"<token>","version":"nexus.transport.experiment.v1"}
```

Successful echo returns exactly `id`, `instance`, `ok:true`, `payload`, `seq`
and `version`. `id` is a JSON integer 1..1,000,000. The hello nonce cannot be
replayed during the host lifetime. Echo `seq` starts at 1 and advances exactly
once, at most 128; repeated/skipped sequences are rejected. Payload must match
`synthetic:[0-9a-f]{0,4096}`. No arbitrary titles/content/IDs or domain names.
Session expires after 60 seconds; at most eight sessions exist simultaneously.
This is only bounded in-memory replay rejection, not durable idempotency.

Protocol rejection is exactly the flat object
`{"error":"rejected","ok":false,"version":"nexus.transport.experiment.v1"}`.
Do not infer an execution/durability outcome from it. Framing/header violations
can close the connection without a protocol response.

## Stream framing (UDS and Windows Pipe)

For **each request**, open a fresh physical connection, write unsigned 32-bit
big-endian payload byte length, then exactly that many UTF-8 bytes. Length must
be 1..8192. Read exactly four response header bytes, validate 1..8192, read the
complete response and close. Do not wait for EOF before consuming the frame;
the native pipe server waits for the reader to close before reusing its slot.
No pipelining or multiplexing. Read/write deadlines must bound partial frames.

Python UDS can use `socket.AF_UNIX` on native macOS. The Windows client needs
native `CreateFileW`/Named Pipe byte-mode access with bounded waits and explicit
handle close; choose/qualify its packaging dependency in its own authorized PR.
Do not assume a Windows pipe is an ordinary portable filesystem path.

## Loopback HTTP profile

POST the canonical message to the exact startup URL. Connect directly to literal
127.0.0.1, no proxy discovery, hostname, redirect, IPv6 fallback or TLS inference.
HTTP/1.1; fresh connection per request; Content-Length is exact byte length.

```text
Host: 127.0.0.1:<exact startup port>
Content-Type: application/json
Content-Length: <1..8192>
X-Nexus-Experiment-Token: <ephemeral token>
Connection: close
```

Do not emit Origin, Sec-Fetch-*, Forwarded, X-Forwarded-*, compression, chunked
encoding or duplicate headers. Do not follow redirects. HTTP boundary rejection
uses 403/413/417 or closes the socket; it does not produce a domain receipt.
HTTP 200 still requires inspecting the protocol's `ok` result. Body and header
tokens must both be correct.

## Required cross-language experiment evidence

Use exactly the same synthetic host shapes/limits on each actual native OS.
Record OS/runtime/architecture, exact Nexus/YJarvis commits, host source digest,
client dependency versions, sample count and raw latency samples, payload bytes,
deadline, error type and cleanup outcome. Never log tokens, body contents or SIDs.

Cover hello/echo; all ten product methods rejected; wrong token/instance; replay;
partial/oversize frames; 32+ reconnects; duplicate endpoint; hard host/client
termination; old descriptor after restart; bounds and handle/process cleanup.
Verify actual access with a second existing OS account where available. Without
that account, native macOS environment or installed Python/Electron builds,
record the relevant matrix cell **NOT VERIFIED**, not PASS.

Installed Electron/Python, signing/notarization, installer/reinstall, sleep/wake,
actual controlled DNS rebinding, same-user attackers, attestation and production
auth/pairing remain open qualification cells. Existing G0-B fixtures and 44
descriptive runtime scenarios must not be relabelled as integration successes.

No transport winner follows from this host package or a single OS measurement.
The joint D01 ADR and any G1A work need separate explicit authorization.
