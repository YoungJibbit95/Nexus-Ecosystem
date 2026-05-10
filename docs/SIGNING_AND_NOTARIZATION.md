# Signing and Notarization Runbook

Stand: 2026-05-10

Dieses Runbook trennt interne RC-Builds von public Release-Builds:

- Interne RCs duerfen unsigned laufen, solange sie klar als RC behandelt werden.
- Public Releases muessen mit `NEXUS_SIGNING_REQUIRED=true` laufen.
- macOS Public Releases muessen zusaetzlich notarized und gestapled sein.
- Alle Download-Artefakte bekommen `SHA256SUMS.txt`.

## GitHub Secrets

### macOS

| Secret | Zweck |
| --- | --- |
| `MAC_CSC_LINK` | Base64-codiertes `.p12` Zertifikat oder sicherer Download-Link fuer electron-builder |
| `MAC_CSC_KEY_PASSWORD` | Passwort fuer das `.p12` Zertifikat |
| `APPLE_ID` | Apple Developer Account E-Mail |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-spezifisches Passwort fuer Notarytool |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

### Windows

| Secret | Zweck |
| --- | --- |
| `WIN_CSC_LINK` | Base64-codiertes Code-Signing-Zertifikat oder sicherer Download-Link |
| `WIN_CSC_KEY_PASSWORD` | Passwort fuer das Zertifikat |

### Android

| Secret | Zweck |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` oder `ANDROID_KEYSTORE_FILE` | Release-Keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore-Passwort |
| `ANDROID_KEY_ALIAS` | Alias fuer den Release-Key |
| `ANDROID_KEY_PASSWORD` | Key-Passwort |

## Installer Workflow

Workflow: `.github/workflows/build-installers.yml`

Manueller RC ohne harte Signing-Pflicht:

```bash
workflow_dispatch signing_required=false notarize_macos=false
```

Public Release:

```bash
workflow_dispatch signing_required=true notarize_macos=true
```

Bei `release: published` wird Signing automatisch als Pflicht behandelt. macOS baut dann mit `NEXUS_MAC_NOTARIZE=true`, reicht DMGs bei `xcrun notarytool` ein und stapled sie danach.

## Lokale Checks

```bash
npm run verify:signing
npm run verify:signing:required
npm run release:gate -- --signing-required
```

Ohne Secrets ist `verify:signing` nur warnend. `verify:signing:required` muss fehlschlagen, wenn ein Public-Release-Secret fehlt.

## macOS Build-Konfiguration

`Nexus Main` und `Nexus Code` nutzen:

- `hardenedRuntime: true`
- `entitlements: build/entitlements.mac.plist`
- `entitlementsInherit: build/entitlements.mac.plist`
- `gatekeeperAssess: false` im Build, weil Notarization/Stampling explizit im Pack-Script passiert

## Release Evidence

Vor Public Release speichern:

- GitHub Actions Run URL des Installer-Workflows
- `SHA256SUMS.txt` pro Plattform/App
- macOS Notarytool Success Log
- Windows SmartScreen/Signatur-Screenshot oder `Get-AuthenticodeSignature`
- Android signierter Release-Build plus Keystore-Fingerprint
