# Security Model

This document describes the public client security model for Nexus. It does not document private Nexus Cloud implementation details.

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
- Keep Monaco workers and editor integrations local to the client.

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
