# Security model and audit boundaries

This is a source-backed architectural security review, not a full security scan or exploit validation. Preserve current protections during extraction. No security policy was changed in Wave 0.

## Existing boundaries

Electron main owns privileged filesystem/process/Git/GitHub/LSP operations. BrowserWindow uses context isolation, sandbox, no Node integration, web security, no insecure-content setting and no WebView tag. Navigation is pinned to the development origin or production dist path. Permissions are denied; external URL policy and child environments are sanitized. Preload restricts paths, sizes, IDs, JSON/depth and named API channels rather than exposing raw ipcRenderer.

`openFolder` records canonical user-selected roots. File operations use realpath/parent canonicalization, root containment and metadata guards for `.git/.hg/.svn`, with 20MiB read/write bounds. These boundaries are valuable. A command process running inside a workspace is **not sandboxed to that workspace**; cwd validation does not stop a shell from accessing other permitted OS paths.

Git uses validated argv/pathspecs and bounded/redacted process output. LSP binary presets are main-owned with explicit environment overrides; renderer language selection does not directly supply a binary. GitHub validates requests/repository references and uses API endpoints with rate-limit/error handling. Nexus accountSession stores the normalized session/token in sessionStorage and removes legacy localStorage records on load/save/clear. The Remember flag is sent to the backend; durable local restart behavior is unverified. A mocked sessionStorage test does not establish physical disk absence. No production login bypass was added.

## Token storage truth

GitHub `secureTokenStore.cjs` prefers Electron safeStorage. Its fallback is AES-GCM with a key derived from machine/user/profile attributes plus a stored salt. That is encrypted local storage, **not equivalent to OS secret storage**. `isEncryptionAvailable` alone also does not prove a protected Linux keyring backend. Preserve existing ciphertext readers and auth functionality; design an explicit secure-backend/memory-only migration with visible recovery if encryption becomes unavailable. Do not silently delete tokens, fall back to plaintext or claim OS-backed storage on every host.

## Risks to investigate and protect

| Priority / area | Evidence | Required next protection |
| --- | --- | --- |
| Main sender authority | `main.cjs` handlers generally ignore `_event`; no central senderFrame/webContents validation found | Characterize unexpected sender/frame, then bind every privileged channel to approved app contents; keep payload validation in main |
| Native save durability | `fs:write-file` directly awaits `fs.writeFile` | Atomic replacement/failure/restart tests; distinguish acknowledged API write from fsync/power-loss guarantees |
| Path races | Canonical checks precede IO | Adversarial symlink/parent replacement and platform-specific strategy; current static escape test is narrower |
| Process sessions | Terminal map keyed by renderer-provided ID; shell child termination uses kill flags | Ownership/generation binding, stale exit protection, actual process-tree cancellation and quit tests |
| Error leakage | Filesystem handlers throw native errors; result helper redacts token-like text | Normalize safe messages/codes; retain bounded diagnostics separately; no raw path/stack in routine UI |
| Renderer content policy | Native un-packaged production boot reports insecure CSP; index lacks a CSP | Define production policy compatible with local assets; packaged verification required before claiming remediation |
| Secrets fallback | Machine-derived encrypted token fallback | Explicit backend grade, Linux backend validation, fail-safe migration/backward reader |
| Project trust | No unified workspace trust/execution model | Distinguish manually chosen commands, tasks and AI-generated actions; avoid unsolicited task/server execution |
| Extensions | Declarative catalog, no isolated executable host | Do not eval/download arbitrary JS; schema/permission/size bounds on all future local contributions |

These are risk observations. A missing central validation check alone is not proof of a reachable attacker or a calibrated vulnerability severity. Dedicated exploit analysis would be a separate task.

## Manual terminal and automation policy

Current terminal blocks network/system mutation and destructive command patterns. Preserve these during extraction; do not secretly rewrite manual commands. Evaluate policy separately for manual terminal, user-launched tasks and AI-triggered execution when implementing Wave 8. Main-authorized capability/session ownership and environment hygiene remain mandatory. Stronger confirmation/trust for automation must not be implemented as a misleadingly “safe” regex-only sandbox.

## Verification

Existing security regression tests cover navigation attacks and Nexus token disk persistence, not the entire IPC surface. Wave 0's native harness exercises canonical root selection, real IO, traversal/protected metadata/symlink rejection and real Git/process operations in disposable fixtures. Preserve the storage release acceptance gaps from `docs/architecture/storage-release-validation.md` in the primary checkout: installed upgrade/restart/crash, multi-window and force-kill behavior remain separate work. Add main/preload result parity, unsupported capability and teardown tests before splitting handlers.
