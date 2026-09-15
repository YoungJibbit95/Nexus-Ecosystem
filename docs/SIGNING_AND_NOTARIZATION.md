# Signing and Notarization Runbook

Stand: 2026-09-12

Dieses Runbook trennt interne RC-Builds von public Release-Builds:

- Interne RCs duerfen unsigned laufen, solange sie klar als RC behandelt werden.
- Public Releases muessen mit `NEXUS_SIGNING_REQUIRED=true` laufen.
- macOS Public Releases muessen zusaetzlich notarized und gestapled sein.
- Alle Download-Artefakte bekommen eine app-, plattform- und architekturspezifische `*-SHA256SUMS.txt` samt P-256-Signatur.

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

## Release-Workflows

Electron: `.github/workflows/build-installers.yml`

Android: `.github/workflows/build-android.yml`

Manueller RC ohne harte Signing-Pflicht:

```bash
workflow_dispatch signing_required=false notarize_macos=false
```

Public Release:

```bash
workflow_dispatch signing_required=true notarize_macos=true
```

Bei `release: published` wird Signing automatisch als Pflicht behandelt. macOS baut getrennte arm64- und x64-Artefakte, reicht die DMGs bei `xcrun notarytool` ein und stapled sie danach. Anschliessend prueft der Workflow die App-Bundles mit `codesign`; Windows wird mit `Get-AuthenticodeSignature` verifiziert.

Der Android-Workflow erzeugt ausschliesslich signierte AABs. Fehlt auch nur eine Keystore-Variable, bricht der Gradle-Release bereits vor der Paketierung ab. Das fertige Bundle wird mit `jarsigner -verify -strict` kontrolliert.

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
- eindeutig benannte `*-SHA256SUMS.txt` pro Plattform/App/Architektur
- macOS Notarytool Success Log
- Windows SmartScreen/Signatur-Screenshot oder `Get-AuthenticodeSignature`
- Android signierter Release-Build plus Keystore-Fingerprint
