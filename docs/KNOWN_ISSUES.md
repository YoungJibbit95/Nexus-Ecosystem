# Nexus v6 Known Issues

Stand: 2026-05-10

Dieses Dokument ist die ehrliche RC-Liste. Alles hier ist entweder ein bewusst akzeptiertes Risiko fuer einen internen RC oder ein Blocker fuer einen oeffentlichen Release.

## Harte RC-Blocker

| Bereich | Status | Risiko | Naechster Schritt |
| --- | --- | --- | --- |
| API Contract/Attack Tests | Teilweise | Node Attack Smoke ist gruen und das NexusAPI CI-Gate ist in `0428020` erweitert, aber Hosted API kann funktional laufen, ohne dass ein konkreter GitHub-/Staging-Run als Evidence dokumentiert ist. | `Control Plane Release Gate` auf GitHub pruefen und `npm run release:gate -- --with-api-contract` gegen Staging/Hosted ausfuehren. |
| View-Smoke Evidence | Offen | Builds koennen gruen sein, obwohl einzelne Views visuell oder interaktiv brechen. | `docs/VIEW_SMOKE_MATRIX.md` pro View abarbeiten und Evidence unter `docs/release-evidence/<version>/` speichern. |
| Signing/Notarization | Teilweise | Signing-Gate, macOS Hardened Runtime/Entitlements, Notarytool-Pfad und Checksums sind vorbereitet; echte Secrets und erfolgreiche Public-Runner-Evidence fehlen noch. | GitHub Secrets setzen, `Build Electron Installers` mit `signing_required=true`/`notarize_macos=true` laufen lassen und Evidence speichern. |

## Bekannte Release-Einschraenkungen

| Bereich | Einschraenkung | Akzeptanz fuer internen RC |
| --- | --- | --- |
| API Runtime-Daten | Repo-/Dist-Hygiene ist seit NexusAPI `f307229` geschlossen; produktive Daten muessen trotzdem aus Env/Secret Store, DB oder persistentem `NEXUS_CONTROL_DATA_DIR` kommen. | Akzeptiert, wenn `verify:release-data` gruen ist und Deployment-Secrets nicht im Repo liegen. |
| Nexus Code Electron Security | Datei-/Terminal-IPC ist nun workspace-basiert gehaertet; ein echter packaged IDE-Smoke mit Test-Workspace bleibt als Evidence offen. | Akzeptiert fuer internen RC, wenn `verify:ecosystem` gruen ist und Explorer/Terminal im Test-Workspace funktionieren. |
| Linux Packaging auf Windows | AppImage/deb Builds werden auf Windows ohne Symlink-Rechte bewusst uebersprungen. | Akzeptiert, solange Ubuntu/GitHub Actions die Linux-Artefakte baut. |
| Live Payment E2E | Live-Zahlungsfluss wird nicht lokal ausgefuehrt. | Akzeptiert nur fuer Test-/Staging-Rollen; public Release braucht Provider-Smoke. |
| Control UI | Control ist Admin-/Ops-Flaeche und nicht Teil der Product-Page App-Auswahl. | Akzeptiert, wenn Zugriff und Links nur fuer Admin/Ops-Kontext sichtbar sind. |
| DevTools/Diagnostics | DevTools und Render Diagnostics sind hilfreich, aber fuer normale Nutzer riskant. | Akzeptiert nur, wenn sie in packaged Release durch Developer/Admin-Kontext gegated sind. |

## Doku- und Evidence-Regeln

- Jede bekannte Einschraenkung bekommt einen Eintrag hier oder im RC-Log.
- Jede View-Smoke-Abweichung bekommt View, Surface, Build-Version, Screenshot/Video und Repro-Schritte.
- Public Website und Wiki duerfen nur Features versprechen, die durch Build, Smoke oder bewusstes Known-Issue-Label abgedeckt sind.
- Secrets, konkrete Passwoerter und private Betriebswerte gehoeren nicht in dieses Dokument.

## Verweise

- `docs/RELEASE_READY_CHECKLIST.md`
- `docs/VIEW_SMOKE_MATRIX.md`
- `docs/RELEASE_EVIDENCE_GUIDE.md`
- `docs/SIGNING_AND_NOTARIZATION.md`
- `docs/NEXUS_COMPLETION_PLAN.md`
