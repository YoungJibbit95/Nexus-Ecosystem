# Security Model

This document describes the public client security model for Nexus. It does not document private Nexus Cloud implementation details.

Audience: developers and operators of public client releases. App users should start with the [User Guide](USER_GUIDE.md). Operational examples here describe public responsibilities, not private deployment procedures or production qualification.

## Principles

- Client configuration is public.
- Secrets do not belong in the public repository.
- Cloud and Pro permissions are enforced server-side.
- Local workspace features should remain available without private backend code.
- User-facing errors should avoid internal route, policy, signing or infrastructure details.

## Electron Clients

Nexus Main and Nexus Code should keep these guardrails:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` where practical
- A small preload API surface
- IPC allowlists instead of generic channel forwarding
- Workspace-bound file operations
- Path traversal prevention
- Explicit user action before file, terminal or project execution flows
- No automatic execution of untrusted install scripts
- Safe external-link handling
- A restrictive Content Security Policy for packaged builds
- Markdown and rich content sanitization

## Nexus Code

Nexus Code is higher risk because it handles project files and terminal workflows.

Required expectations:

- Treat opened folders as workspace trust boundaries.
- Do not automatically run commands from untrusted workspaces.
- Keep terminal execution visible and workspace-bound.
- Avoid logging `.env` values, tokens or credentials.
- Prevent file operations from silently reading sensitive home, keychain or credential paths.
- Keep CodeMirror and editor integrations local to the client.

The active Main/Mobile Code archive reads and exports existing files; it does not execute them. The standalone desktop runner executes explicit commands through child-process stdio and is not a PTY. A quoted absolute Windows path with spaces has a known failing native test. A visible simulated browser terminal, debug panel or marketplace record is not evidence of process execution, DAP support or an extension runtime.

Language-server capabilities require external servers and a ready desktop bridge. GitHub operations require explicit connection and still need live acceptance. Preserve existing native/file/account boundaries while testing those integrations; client capability labels must report missing prerequisites and unsupported methods accurately.

## Public operator responsibilities

- Verify the published client package, checksum/signature metadata and supported platform before recommending a release.
- Keep private account/payment/admin configuration and credentials in their owning private environment.
- Distinguish local build/tests from installed-client, native upgrade/recovery and live-service acceptance.
- Collect visible errors and sanitized diagnostics; do not request tokens or private workspace content in public issues.
- Preserve existing user records and export/recovery paths during a client migration. A dormant editor module does not make its persisted code data disposable.

## Mobile Clients

Nexus Mobile and Nexus Code Mobile should keep native capabilities explicit. Capacitor plugins should be scoped to the feature that needs them and should not silently expose unrelated device data.

## Cloud Features

Nexus Cloud owns sensitive enforcement:

- Account validity
- Pro feature availability
- Sync and backup permissions
- AI/Flux usage and limits
- Team and sharing access
- Abuse and rate controls

Client-side checks can improve user experience, but they are not a security boundary.
