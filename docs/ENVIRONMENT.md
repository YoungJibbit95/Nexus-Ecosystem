# Environment

This public repository only documents client-safe configuration.

## Client Configuration

Nexus clients may read public runtime configuration from environment variables during development builds.

Client-side variables are never secrets. Anything bundled into a desktop, mobile or web client must be treated as public.

## Local Development

Most public client development should work without production cloud credentials.

Use `.env.local` only for local, non-secret development options. Do not put tokens, signing keys, payment credentials, private server routes or production infrastructure details into this repository.

Example `.env.local` values for public client development:

```bash
VITE_NEXUS_PUBLIC_CLOUD_MODE=disabled
VITE_NEXUS_PUBLIC_APP_VARIANT=main
```

These values are optional public hints for local builds. They are not security controls.

## Nexus Cloud

Nexus Cloud configuration, backend secrets, payment credentials, sync infrastructure and admin/control settings are private and are not documented in this public repository.

Cloud and Pro features are account-bound and enforced server-side by Nexus Cloud. Client-side UI states are user experience only.

## Security Rule

Do not add secrets, tokens, signing keys, production hosts, private backend routes, private repository names, deployment details, internal admin routes or private cloud implementation notes to this repository.

If a development workflow needs private configuration, keep that documentation in the private operational workspace, not in public client docs.
