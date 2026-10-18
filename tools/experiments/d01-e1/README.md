# D01-E1: synthetic transport experiment host

**Experiment only. No transport decision, G1A or D01-E2 approval.**

Authorized baseline: Nexus Main `7721614732ce11042a67f5a44438457286fa8b32`.
G0-A RFC v0.2.1 SHA-256:
`b64c3c4483435f06f7af7c5dd126d49c4e937eeb8bdcea6b23a4097680b59c74`.
The supplied G0-A ZIP was read and hash-verified. Historical authorization/status
text in those archived documents is evidence, not a replacement for the user's
explicit D01-E1 instruction. G0-A's clarification permits experiment host/client
code while production G1A remains blocked.

G0-B accepted `nexus.local.v1`, schema/fixtures `2.0.0`, schema ID
`urn:nexus:local:wire:2.0.0`, corpus SHA-256
`8bb75002fcf8af4f1be76b3043aa868168bea2eee40dad2870f6140f03d5185f`.
Neither those files nor their semantics are changed. The **44 runtime scenarios
remain descriptive**; this experiment does not execute them.

The current V7 product architecture, active `Nexus Main/electron-main.cjs`,
`preload.cjs`, `electron/ipc-handlers.cjs`, security configuration and packaging
roots were inspected. This package imports none of them and leaves V7-C2,
domain owners, stores, account/grant policy and runtime registration untouched.
All payloads are fixed synthetic strings; all ten product methods are rejected.

## Candidates and isolation

| Candidate | Actual experiment implementation | Extra requirements |
| --- | --- | --- |
| macOS UDS | Node stream socket in a fresh `/tmp/nxd01-*` directory; owner verified; directory 0700, socket 0600 | Native macOS; Linux is not macOS evidence |
| Windows Named Pipe | Node controller plus bounded .NET byte bridge; actual DACL inspected; allow only `WindowsIdentity.User`, protected inheritance, `PIPE_REJECT_REMOTE_CLIENTS`, held `FILE_FLAG_FIRST_PIPE_INSTANCE` | Native Windows; .NET 8 SDK to build and runtime to execute |
| Loopback | Node HTTP/1.1 on literal `127.0.0.1`, random port; exact Host; ephemeral 256-bit token; no Origin or browser fetch metadata; no CORS | Node >=24; IPv6 is deliberately not bound or qualified |

No new npm/NuGet dependency, Electron entrypoint, preload, product IPC, SDK,
Nexus provider or ToolSpec is added. `native/NuGet.Config` clears package sources;
the native helper uses .NET's framework references and Win32 APIs only.

This directory is outside both active Electron app roots. Existing Main's broad
`build.files` is relative to **Nexus Main**, not repository root. Code's allowlist
is similarly app-relative. Packaging/isolation tests reject a future resource
copy reaching this experiment. Native outputs must use an external artifacts
directory; tests reject `native/bin` or `native/obj`. These are structural package
exclusion checks, **not** an installed/signed/notarized application qualification.

## Small, deliberately separate wire contract

The experiment uses **`nexus.transport.experiment.v1`**, not `nexus.local.v1`.
Its complete contract and controller handoff are in [PYTHON_HANDOFF.md](PYTHON_HANDOFF.md).
Only `experiment.hello` and `experiment.echo` exist. Neither can name or access a
domain record. Accepted payloads match `synthetic:[0-9a-f]{0,4096}`.

Limits: 8,192 payload bytes, eight stream/HTTP connections or eight pipe slots,
two-second request deadline, eight in-memory logical sessions, 60-second session
lifetime, at most 128 echo sequences per session and 1,024 used handshake nonces.
Host lifetime is at most five minutes. No durable journal or retry queue exists.
One request/response per physical connection; a fresh connection can use a valid
logical session. Reconnecting after a host restart needs a new descriptor and
handshake. Old instance/token/session values are rejected.

The startup descriptor, including its **memory-only experimental token**, is sent
once over the controller's inherited private stdout. Keep it in controller memory;
never redirect it into result logs, discovery files, prompts or version control.
It is not productive discovery, pairing, a Vault credential or app attestation.
The controller keeps stdin open; EOF or parent death shuts down the child helper.

## Reproduction

From repository root, with Node >=24:

```powershell
# Windows only. Every generated file stays outside source/product packaging.
$workspace = Split-Path -Parent (Get-Location).Path
$evidence = Join-Path $workspace '.workspace-maintenance/2026-10-18/d01-e1'
dotnet build tools/experiments/d01-e1/native/NativePipeHost.csproj --configuration Release --artifacts-path "$evidence/native-build" --nologo
$env:D01_E1_PIPE_HOST = "$evidence/native-build/bin/NativePipeHost/release/NativePipeHost.dll"
node --test --test-timeout=30000 tools/experiments/d01-e1/host.test.mjs tools/experiments/d01-e1/isolation.test.mjs
node tools/experiments/d01-e1/measure.mjs --output "$evidence/windows-measurement.json"
```

On macOS, skip the Windows build/environment setting and run the same tests and
measurement command with an absolute `.workspace-maintenance/<date>/` evidence
path. The runner exercises actual UDS and Loopback, and reports Pipe NOT VERIFIED.
Evidence output is exclusive-create; choose a new filename for a new run.

Optional native Chromium/Edge negative probes:

```powershell
node tools/experiments/d01-e1/measure.mjs --output "$evidence/windows-browser-measurement.json" --browser '<absolute Chromium or Edge executable>'
```

The browser uses a fresh evidence-local profile and a separate synthetic attack
origin, without disabling web security. It attempts JSON/preflight with the
experimental token, a simple unauthenticated POST and GET. Only a completed DOM
result plus zero accepted protocol calls counts as evidence. A missing/timed-out
browser is **NOT VERIFIED**; it never becomes a successful browser test. Full DOM
and tokens are not logged. Browser caches remain in the evidence directory;
they are not product profiles. Controlled DNS rebinding remains NOT VERIFIED.

Individual standalone host (controller captures stdout privately):

```text
node tools/experiments/d01-e1/host.mjs --candidate=loopback
node tools/experiments/d01-e1/host.mjs --candidate=uds
node tools/experiments/d01-e1/host.mjs --candidate=pipe --native-host=<absolute built NativePipeHost.dll>
```

The opt-in workflow `d01-e1-transport-experiment.yml` runs these tests and records
measurements on native Windows/macOS runners. It installs no product dependencies,
launches no Nexus app and publishes only synthetic measurement JSON. Existing
public/release/security/CodeQL/encoding/lockfile gates remain unchanged and also
discover the portable experiment tests.

## Evidence matrix and interpretation

`measure.mjs` records OS, architecture, Node/.NET versions, source commit, scoped
dirty state and a deterministic SHA-256 inventory of actual experiment sources.
Source inventory hashes normalize checkout CRLF to LF, encode UTF-8, sort relative
ASCII filenames and hash `sha256 + two spaces + filename + LF` lines. Documentation
and generated evidence are excluded. This source digest is separate from the
unchanged normative G0-B corpus and from exact wire payload bytes.
It contains every sorted latency sample; median is nearest-rank p50 and p95 is
nearest-rank p95 of 30 sequential fresh-connection echoes. Host setup includes the
helper startup where applicable; it is **not** installed application startup.
Do not rank different OS/CI hosts from these numbers.

| Dimension | Automated evidence | Still NOT VERIFIED / required later |
| --- | --- | --- |
| Access control | Actual UDS owner/modes or actual Windows owner-only protected DACL; wrong experimental credential/instance | Actual different Windows OS user, same-user malware resistance, app/binary attestation |
| Different user | On native macOS, existing `nobody` via noninteractive sudo attempts an actual socket connect from `/tmp`; selected Node or system `nc` must prove a distinct UID and permission-denied connect | If sudo/foreign-user execution unavailable, explicit skip; no accounts are created, no passwords requested/stored |
| Loopback boundary | Real HTTP negative Host/Origin/null-Origin/preflight/forwarded/proxy/header/upgrade/chunked/absolute-target probes; literal IPv4 bind | Controlled DNS changes, IPv6, external proxy deployments; real browser only with explicit completed native probe |
| Reliability | New connections, 32 sequential slot reuses, stale identity, bounded partial frames, hard process crash, restart, duplicate endpoint | Sleep/wake, renderer lifecycle, OS service sessions, install/upgrade/uninstall |
| Stale endpoints | Pipe kernel cleanup after parent/child exit; port reuse; UDS crash residue retained and a fresh path chosen | Production lease/PID/discovery ownership and recovery |
| Resource limits | Byte, deadline, connection, session, nonce, sequence and host-lifetime caps; explicit close, EOF/crash cleanup | Comprehensive denial-of-service qualification under hostile sustained load |
| Packaging | Source and generated outputs excluded from active product roots; no native npm dependency | Installed Electron plus real packaged Python client, macOS signing/notarization and Windows installer checks |
| Maintenance | Shared Node protocol/framing; Windows-specific bounded native helper; explicit runtime dependencies | Future production maintenance/security decision after native installed comparison |

All automated tests are either ordinary protocol/unit tests or actual native
synthetic process tests. The injected clock test proves only expiry logic.
The Windows remote-rejection flag is set; a remote-machine attempt is **not**
claimed. Private UDS parent permissions are the access boundary, not an unproven
Node peer-UID API. No OS security prompt is bypassed.

### Recorded local run, 2026-10-18

Native Windows 10.0.26100 x64, Node 26.3.1, helper runtime .NET 8.0.28.
Each row has 30 sequential fresh-connection synthetic echoes; no competing build
was started during this measurement. The machine is not a controlled benchmark
host and these observations do not select a transport.

| Candidate | Echo p50 ms | Echo p95 ms | Host setup ms | Qualification |
| --- | ---: | ---: | ---: | --- |
| Named Pipe | 0.4246 | 0.8530 | 181.7323 | Native synthetic host/controller only |
| Loopback | 4.4879 | 5.9353 | 16.8470 | Native synthetic HTTP only |
| UDS/macOS | — | — | — | NOT VERIFIED on this Windows host |

Source-inventory SHA-256:
`35a8855e9a1c987f9f03568c9dfc5abfe932f72d332bc8f4bfa33936b03699e1`.
The output records a dirty experiment worktree because measurement preceded the
final corrective commit; this digest binds its actual source bytes. Exact samples remain in
workspace maintenance. Documentation edits do not affect that source digest.

Tests: 25 focused tests, 23 passed and two explicit native-macOS skips; public
suite 557 tests, 538 passed and 19 existing/platform skips; 91/91 ecosystem checks;
Core typecheck, six release-hardening and two workflow-authority tests passed.
An explicitly selected native Edge attempt timed out: browser execution remains
NOT VERIFIED, independently of passing raw HTTP boundary probes. The first
measurement exposed pipe handle reuse failure; it was fixed and the 32-connection
regression plus final measurements passed. Failed attempts were retained rather
than reported as successful samples. Native CI results belong to their exact
PR-head run/artifact links in the handoff.

## Security limits, cleanup and rollback

The token proves possession of an **experimental** controller value only; it is
not mutual app authentication or protection from an administrator/same-user
debugger. Loopback and HTTP are not inherently trusted. Requests with any Origin
are rejected, including same-origin-looking strings and `null`; no PNA/CORS
allowance is emitted. Host aliases, absolute URL targets, CONNECT, WebSocket,
forwarded headers, chunked encoding, compression and duplicate headers are refused.
HTTP tests using forged headers are real socket tests, not browser/DNS evidence.

UDS always uses a fresh owner-private directory; it never unlinks a supplied
endpoint or follows a link for stale recovery. Normal close removes its own socket
and empty, inode-checked directory. A hard crash leaves a stale private socket;
the test inventories and removes only that exact owned socket inode and empty
parent, never recursively. Windows holds its first pipe instance for the helper
lifetime and observes controller EOF; a forced parent termination is tested.

No raw request bodies, tokens, user names or SIDs are written into measurement
JSON. Failures are not turned into measurements. Existing partial/failed local
attempts stay in workspace maintenance as evidence. Local/CI results and final
PR-head run links are reported in the PR handoff, not invented here.

Rollback is a revert of this experiment directory and its opt-in workflow. Stop
test processes, then inspect any private UDS residue before exact-file cleanup.
There is no migration, product data, persistent credential or product startup hook
to undo. No self-merge, transport winner, D01-E2 or G1A continuation.

## Primary technical sources

- [Node net IPC paths and lifecycle](https://nodejs.org/docs/latest-v22.x/api/net.html#ipc-support)
- [Microsoft CreateNamedPipe flags](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-createnamedpipea)
- [Microsoft named-pipe access rights](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights)
- [Microsoft PipeSecurity](https://learn.microsoft.com/en-us/dotnet/api/system.io.pipes.pipesecurity)

These sources explain mechanisms, not a security sign-off for this experiment.
