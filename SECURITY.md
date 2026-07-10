# Security Policy

## Supported Scope

This repository covers the public Nexus clients, shared client runtime, public documentation and client release tooling.

Private Nexus Cloud backend implementation, account/auth logic, payment, sync infrastructure, admin/control operations and production deployment are outside this public repository.

## Reporting A Vulnerability

Please do not report security vulnerabilities in public issues.

Use GitHub Security Advisories for private disclosure and include:

- Affected app or package
- Reproduction steps
- Expected and actual behavior
- Impact assessment
- Relevant files or screenshots without secrets

## Security Rules For Contributions

- Do not commit secrets, tokens, signing keys, payment credentials or production infrastructure details.
- Treat client-side configuration as public.
- Do not expose private cloud routes, admin/control internals or deployment flows in public docs.
- Do not weaken Electron or Capacitor security guardrails.
- Do not rely on client-only checks for Pro, sync, payment, AI, team or cloud limits.

## Response Policy

Critical issues are prioritized. Public notes may describe the user-facing impact and fix category, but should not publish private exploit-enabling operational details.
