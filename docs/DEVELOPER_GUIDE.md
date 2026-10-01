# Developer Guide

Nexus Ecosystem is the public client workspace for Nexus Main, Nexus Mobile, Nexus Code, Nexus Code Mobile and the shared client runtime.

This guide is for contributors. App usage belongs in the [User Guide](USER_GUIDE.md); public operator responsibilities belong in the [Security Model](SECURITY_MODEL.md). Private deployment instructions and credentials remain outside this repository.

## Current Code capability boundary

Main/Mobile `CodeView` is a compatibility archive: read/search/export existing code records and folder metadata. It does not mount the retained editor or execution engine. Existing code records remain in app persistence, runtime snapshots and supported backups; removing navigation or an editor import is not permission to remove those records or their export paths.

Standalone Nexus Code uses CodeMirror. Its desktop command runner is a child process with stdio, not a PTY/persistent interactive shell. The quoted absolute Windows-path regression is corrected at the shell argument boundary; a bounded actual main/preload IPC suite passes 11 probes, including script/executable paths, stdin/output and exit behavior. Language-server requests require an installed server and native bridge, with method/language-specific limits. Local Git is implemented; GitHub requires a connected account/native service and still needs live acceptance. Debug runtime and marketplace-style install records are simulated; there is no accepted DAP/extension package execution host.

The independent Code audit checkpoint is `642bde64f2167d5b254f7be05f0a40be52a3aa47` on its separate audit branch. It records native characterization 9/10, full JS typecheck 4,353 diagnostics, full visual 119/120 and no installed-client/LSP/GitHub/PTY/DAP acceptance. These remain limitations, not a claim of full Code parity. Integrate that branch's standalone Code README deliberately; do not overwrite another owner's Code documentation from this client-doc packet.

Retained Main editor modules under `src/views/code/` and `src/hooks/useWorkspaceRuntimeSync.ts` must stay until imports, callers, current build modules and data-export coverage have been reviewed. A dormant source is not an active product capability. Re-enabling the old runtime-sync helper would require routing it through the acknowledged handoff coordinator; its legacy direct mutation is not the active recovery path.

## Development Model

### Planning and workspace contracts

Main Calendar/Agenda and Mobile Agenda share the [manual planning domain and command contract](../packages/nexus-core/src/planning/README.md). Canonical tasks retain their deadlines; fixed events and linked work blocks have separate exclusive-end intervals. Unknown duration is never estimated, and incomplete coverage is never promoted to free time. Scheduling/moving preserves the complete deadline text; new civil-date deadlines declare an IANA zone.

Commands bind full contents to stable receipts and validate task content, planning revision and workspace generation. The owner journals task/planning preimages, acknowledges storage before success, and retains the recovery journal/freeze when rollback cannot be confirmed. Typed Note/Canvas links resolve actual membership; promotion and repair use this owner rather than writing duplicate tasks or unjournaled canvas backlinks. Separate selected reminder stops run after task-completion acknowledgement and keep their own result.

Complete exports, handoff and backups declare Runtime V2 and include `nexus-planning` schema 1 plus portable reminder occurrence facts. Destination native IDs remain local. Runtime V1 keeps its strict legacy envelope; intentional downgrade is a separate operation with an explicit loss report. Do not add new root fields to V1, infer automatic migration, discard recovery generations or reactivate retained direct-mutation helpers.

ICS import executes only supported direct fixed VEVENT intervals. The acknowledged raw archive preserves the original text, provenance and warnings; recurrence/exception/alarm/embedded-zone semantics are not executed. Series base intervals require explicit consent. See [icsPlanning.ts](../packages/nexus-core/src/planning/icsPlanning.ts) and [runtimeExchange.ts](../packages/nexus-core/src/workspace/runtimeExchange.ts).

The shared application capture facade opens unsaved forms across shell/Dashboard/palette. Opening/cancelling is not persistence. New capture requests get new identities; retries of the same submitted command return the original identity. Cerebri N1/N2 are bounded, default-disabled local qualification seams. Production collection, activation, independent integration architecture and installed-platform qualification remain separate gates; they do not grant automatic writes.

Work in this repository should stay within public client boundaries:

- Product UI and local workspace behavior
- Shared client runtime contracts
- Electron and Capacitor client safety
- Public docs, tests and release tooling
- Installer and checksum support for client releases

Private cloud/backend implementation, payment, account logic, sync infrastructure, admin/control tooling, production deployment and secrets are outside this repository.

## Local Setup

```bash
npm run setup
npm run dev:main
npm run dev:code
```

For mobile web iteration:

```bash
npm run dev:mobile:web
npm run dev:code-mobile:web
```

## Public Client Workflow

1. Implement the user-facing feature in the relevant client or shared runtime.
2. Keep local-first behavior functional without production cloud credentials.
3. Treat cloud-only features as account-bound and server-enforced.
4. Use user-facing error language for cloud failures.
5. Run targeted app builds and repository verification.
6. Update public docs without exposing private cloud internals.

## Compatibility

The public clients share runtime contracts through `packages/nexus-core`. App versions may differ, and release groups define compatible builds for users. Nexus Cloud compatibility is server-managed and should not be documented through private route or rollout details here.

## Checks

```bash
npm run build:main
npm run build:mobile
npm run build:code
npm run build:code-mobile
npm run verify:ecosystem
npm run check:no-private-strings
npm run check:secrets
```

Use the narrower build when you are only touching one app.

## Security Rules

- Client-side configuration is public.
- Do not add secrets, tokens, signing keys, production hosts, private backend routes or deployment details.
- Do not describe private admin/control implementation in public docs.
- Do not weaken Electron or Capacitor guardrails.
- Do not make Pro, payment, AI, sync or team access rely on client-only checks.
- Keep file, terminal and workspace operations explicit and user controlled.

## Helpful Paths

- `Nexus Main/src/App.tsx`
- `Nexus Mobile/src/App.tsx`
- `Nexus Code/src/App.jsx`
- `Nexus Code Mobile/src/App.jsx`
- `packages/nexus-core/src`
- `docs/PUBLIC_PRIVATE_BOUNDARY.md`
- `docs/SECURITY_MODEL.md`
