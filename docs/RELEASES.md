# Releases

This document covers public client releases for the Nexus Ecosystem repository.

## Public Release Scope

- Nexus Main desktop artifacts
- Nexus Code desktop artifacts
- Mobile web builds and native handoff artifacts where supported
- Checksums for downloadable artifacts
- Public release notes

Private Nexus Cloud rollout and operational deployment are not documented here.

## Build Commands

```bash
npm run build:main
npm run build:mobile
npm run build:code
npm run build:code-mobile
npm run build:electron:installers
npm run release:checksums
```

## Verification

```bash
npm run verify:ecosystem
npm run check:no-private-strings
npm run check:secrets
```

## Signing Expectations

Signed and notarized builds should use CI or local signing environments that keep certificates and signing material out of the repository. Public docs may describe that signing exists, but must not include signing keys, tokens or private operational steps.

## Supported Platforms

- Windows
- macOS
- Linux
- Android and iOS handoff flows where supported

## Release Notes Template

```markdown
# Nexus vX.Y

## Highlights

## Downloads

## Checksums

## Supported Platforms

## Security Notes

## Known Issues

## Upgrade Notes
```

## Rollback

If a client release is faulty, publish a corrected client release and mark the affected artifact in release notes. Private cloud rollback procedures are handled outside this repository.
