# Nexus Public / Private Boundary

Nexus uses an open-core architecture.

## Public In This Repository

- Product clients
- Shared client runtime
- Local-first workspace behavior
- UI components
- Installer tooling
- Public documentation
- Client-side guardrails
- Security model for the public clients

## Private Outside This Repository

- Nexus Cloud backend
- Account/auth implementation
- Payment/billing implementation
- Sync engine
- AI/Flux orchestration
- Cloud storage
- Device management implementation
- Entitlement enforcement
- Control/admin tooling
- Production deployment/infrastructure
- Secrets and signing material
- Abuse/rate limiting logic
- Internal release promotion tooling

## Important

Client configuration is public.

All sensitive permissions are enforced server-side.

The public repository does not contain backend secrets or private server logic.

Nexus Cloud is not a public API unless explicitly announced in separate public developer docs.
