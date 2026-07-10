# Nexus Release Index

This index is the public entry point for client release work.

## Release Tracks

| Track | Scope | Primary Check | Status |
| --- | --- | --- | --- |
| Main / Mobile | Nexus Main, Nexus Mobile, `@nexus/core` | `npm run release:main-mobile` | Active |
| Full Ecosystem | Main, Mobile, Code, Code Mobile, Wiki, Core | `npm run release:gate` | Active, longer run |
| Website | Public product website | Website build and public copy checks | Active |
| Launcher | Public installer/update experience | Launcher release checks | Planned |

Private Nexus Cloud deployment and server operations are intentionally not documented in this public index.

## Required Checks

- `npm run verify:ecosystem`
- `npm run check:no-private-strings`
- `npm run check:secrets`
- `npm run release:main-mobile`
- `npm run release:gate`

Use narrower app builds when touching a single client.

## Automations

- Dependabot is grouped for package updates.
- Dependency Review should block risky new dependencies.
- CODEOWNERS protects sensitive client, workflow and security paths.
- Public release evidence should avoid secrets, private account data and private deployment details.

## Known Public Release Risks

- Large UI changes still need screenshot refreshes.
- Mobile native packaging requires platform-specific local tooling.
- Signing and notarization depend on private CI or local signing environments that must stay outside the repository.

## Evidence

Release evidence should live under `docs/release-evidence/<version>/`:

- `rc-log.md`: commands, date, result and known limits
- `screenshots/`: public app and website screenshots
- `smoke-notes.md`: manual smoke notes

Do not write secrets, tokens, private device IDs, private paths, production infrastructure details or private account data into evidence files.
