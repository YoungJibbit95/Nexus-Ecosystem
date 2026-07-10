# Developer Guide

Nexus Ecosystem is the public client workspace for Nexus Main, Nexus Mobile, Nexus Code, Nexus Code Mobile and the shared client runtime.

## Development Model

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
