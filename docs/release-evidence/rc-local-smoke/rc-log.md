# Nexus Release Candidate Evidence: rc-local-smoke

Created: 2026-06-27T17:11:04.443Z

## Scope

- Main/Mobile polish:
- Product Page:
- Control/API:
- Wiki/Docs:
- Known limits:

## Required Checks

| Check | Command | Result | Notes |
| --- | --- | --- | --- |
| Ecosystem contracts | `npm run verify:ecosystem` | pending | |
| Main/Mobile gate | `npm run release:main-mobile` | pending | |
| Website CI build | `npm --prefix "../nexusproject.dev" run build:ci` | pending | |
| Website API integration | `npm --prefix "../nexusproject.dev" run test:api:integration` | pending | |
| API release data | `npm --prefix "../NexusAPI/API/nexus-control-plane" run verify:release-data` | pending | |
| API contracts | `npm --prefix "../NexusAPI/API/nexus-control-plane" run test:contract` | pending | |

## Screenshots

- Main Dashboard:
- Notes:
- Canvas:
- Settings:
- DevTools:
- Product Page:
- Control UI:

## Decisions

- Ship / hold:
- Follow-up owner:
