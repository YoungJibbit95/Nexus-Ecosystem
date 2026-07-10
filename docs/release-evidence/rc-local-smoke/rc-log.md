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
| Public client contracts | `npm run verify:ecosystem` | pending | |
| Public surface guard | `npm run check:no-private-strings && npm run check:secrets` | pending | |

## Screenshots

- Main Dashboard:
- Notes:
- Canvas:
- Settings:
- DevTools:
- Product Page:
- Private cloud administration:

## Decisions

- Ship / hold:
- Follow-up owner:
