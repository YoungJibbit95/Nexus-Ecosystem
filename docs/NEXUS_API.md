# Nexus Cloud Boundary

Nexus clients can optionally connect to Nexus Cloud for account-based features such as sync, backups, AI/Flux, sharing, team workflows and Pro entitlement checks.

This file intentionally does not document private API routes, backend implementation details, signing material, admin tools, deployment flows or infrastructure. Nexus Cloud is not a public API unless separate public developer documentation explicitly announces one.

## Client Responsibilities

- Keep local-first workspace features usable without private backend code.
- Treat client configuration as public.
- Show clear user-facing errors when cloud features are unavailable.
- Validate cloud responses before changing client state.
- Avoid logging secrets, tokens, private account data or raw infrastructure details.

## Server Responsibilities

Nexus Cloud owns sensitive enforcement:

- Account and session validity
- Pro and cloud feature availability
- Payment and billing state
- Sync, backup and sharing permissions
- AI/Flux limits and abuse controls
- Device and account access decisions

Client-side checks are not a security boundary.

## User-Facing Error Language

Prefer product language over implementation language.

| Avoid | Use instead |
| --- | --- |
| API unavailable | Cloud features are currently unavailable. Local workspace features remain available. |
| Policy denied | This device is not currently allowed to use this cloud feature. |
| Signed mutation rejected | This change could not be applied. Please try again or contact support. |
| Offline tier blocked | Cloud features are unavailable offline. |

## Verification

Use public client checks for this repository:

```bash
npm run verify:ecosystem
npm run check:no-private-strings
npm run check:secrets
```
