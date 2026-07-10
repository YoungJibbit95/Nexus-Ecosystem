# Contributing

Thanks for helping improve Nexus.

## Public Contribution Scope

Good public contribution areas:

- Nexus Main, Mobile, Code and Code Mobile client features
- Shared client runtime improvements
- UI polish and accessibility
- Electron and Capacitor client security hardening
- Tests, verification scripts and release tooling
- Public documentation

Out of scope for this repository:

- Nexus Cloud backend implementation
- Account/auth internals
- Payment or billing internals
- Sync infrastructure
- Admin/control tooling
- Production deployment and secrets

## Workflow

1. Keep changes focused.
2. Do not add secrets or private infrastructure details.
3. Run the narrowest relevant build or verification command.
4. Update public docs when behavior changes.
5. Explain user-facing impact in the PR summary.

Useful checks:

```bash
npm run verify:ecosystem
npm run check:no-private-strings
npm run check:secrets
```
