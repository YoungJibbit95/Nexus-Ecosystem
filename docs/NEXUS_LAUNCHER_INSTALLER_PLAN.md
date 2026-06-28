# Nexus Launcher and Installer Plan

Stand: 2026-06-27

## Zielbild

Nexus bekommt einen gemeinsamen Launcher, der als Erstinstaller, Update-Zentrale
und Reparaturwerkzeug fuer Nexus Main und Nexus Code dient. Nutzer sollen eine
einzige moderne App starten, den Status des Ecosystems sehen, Apps installieren,
starten, reparieren und auf den neuesten Stand bringen koennen.

Die robuste Zieldefinition fuer Updates lautet:

- Default: Installiere den neuesten Commit, der die Release-Gates bestanden hat
  und fuer die Zielplattform ein verifiziertes Artefakt erzeugt hat.
- Developer Mode: Optional den neuesten GitHub-Commit lokal clonen/pullen,
  bauen und installieren, wenn Git, Node, npm und Build-Tools vorhanden sind.
- Public Mode: Keine ungebuildeten oder ungeprueften Commits installieren.

Damit bleibt die Idee "immer vom neuesten GitHub-Stand" erhalten, aber ein
kaputter Commit wird nicht blind an normale Nutzer verteilt.

## Offene Fragen an dich

1. Soll der Launcher zuerst nur Windows unterstuetzen oder direkt Windows,
   macOS und Linux?
2. Soll "latest" wirklich der neueste Commit auf `main` sein, oder der neueste
   Commit mit gruenem Release-Gate?
3. Ist `YoungJibbit95/Nexus-Ecosystem` das zentrale Repo fuer Main und Code,
   oder sollen separate Repos angebunden werden?
4. Ist das Repo privat? Falls ja: Soll der Launcher GitHub OAuth/Device Flow
   bekommen oder nur mit einem manuell eingefuegten Token arbeiten?
5. Soll der Launcher per-user installieren oder per-machine mit Admin-Rechten?
   Die aktuellen NSIS-Installer sind auf per-machine/elevation ausgelegt.
6. Soll der Launcher die vorhandenen Electron-Installer ausfuehren oder die Apps
   selbst in Zielordner entpacken und verwalten?
7. Soll der Launcher sich selbst ebenfalls automatisch aktualisieren?
8. Welche Channels willst du sichtbar haben: Stable, Beta, Nightly, Developer?
9. Soll der Nutzer einzelne Apps waehlen koennen oder immer Main und Code als
   Bundle installieren?
10. Soll der Launcher auch Nexus Mobile, Code Mobile, Wiki, API und Control
    anzeigen, oder fuer v1 nur Desktop Main und Code?
11. Sollen Updates still im Hintergrund laufen oder immer mit sichtbarer
    Bestaetigung?
12. Welche Optik soll gewinnen: ruhiges Nexus Main Arbeitswerkzeug oder die
    staerkere Product-Page Space/Glow-Aesthetik?

Bis diese Fragen entschieden sind, ist die Arbeitsannahme:

- Windows-first.
- C# mit WinUI 3 / Windows App SDK.
- Nexus Main und Nexus Code als v1-Scope.
- Update-Default ist "latest green commit".
- Vorhandene Electron-Installer werden wiederverwendet.
- Stable, Beta und Developer Channel.
- Per-machine Installation, aber mit sauberem Elevation-Flow.
- Launcher-Self-Update ist Teil von v1.1, nicht v1.0.

## Technologieentscheidung

### Empfehlung: C# + WinUI 3

Warum:

- Native moderne Windows-UI mit Fluent-Design-Anmutung.
- Sehr gute Integration fuer Prozesse, Dateisystem, Services, Elevation,
  Windows Notifications und Startmenue/Shortcuts.
- Saubere Trennung in UI, Update-Core, GitHub-Client und Installer-Runner.
- Passt gut zu einem Windows-first Erstinstaller.

Geplante Struktur:

```text
Nexus-Ecosystem/
  Nexus Launcher/
    Nexus.Launcher.sln
    src/
      Nexus.Launcher.App/        # WinUI 3 shell
      Nexus.Launcher.Core/       # update, manifest, install orchestration
      Nexus.Launcher.GitHub/     # GitHub API/feed client
      Nexus.Launcher.Installers/ # NSIS/DMG/AppImage/deb runners later
      Nexus.Launcher.Telemetry/  # local logs, opt-in diagnostics
    tests/
      Nexus.Launcher.Core.Tests/
      Nexus.Launcher.Installers.Tests/
```

### Alternative: Rust + Tauri

Tauri ist sinnvoll, wenn Cross-Platform ab Tag 1 Pflicht ist oder die UI sehr
nah an Product-Page/React/Tailwind bleiben soll. Der Nachteil: Installer- und
Windows-Elevation-Flows werden mehr Rust/Plugin-Arbeit, waehrend WinUI 3 diese
Welt nativer trifft.

### Alternative: C++ + Qt/QML oder WinUI C++

Sehr robust, aber langsamer zu schreiben und fuer dieses Ecosystem vermutlich
mehr Aufwand als Nutzen. Nur empfehlenswert, wenn maximale native Kontrolle
wichtiger ist als schnelle Produktiteration.

## Architektur

### Komponenten

1. Launcher App
   - Moderne UI, App-Auswahl, Channel, Install/Update/Repair/Launch.
   - Zeigt Commit, Build-Zeit, Channel, Signatur/Hash-Status und lokale Version.
   - Kann Logs exportieren und fehlgeschlagene Updates wieder aufnehmen.

2. Update Core
   - Vergleicht lokalen Zustand mit Remote-Manifest.
   - Plant Aktionen als idempotente Jobs: download, verify, stop app, install,
     health check, rollback.
   - Schreibt einen Job-State auf Platte, damit Abbrueche reparierbar bleiben.

3. GitHub/Feed Client
   - Liest einen Nexus Update Feed mit Artefakt-URLs, SHA256, App-Version,
     Commit-SHA, Channel und Mindest-Launcher-Version.
   - Kann im Developer Mode GitHub Commit/Status/Workflow APIs lesen.
   - Behandelt Rate Limits, Offline-Zustand und private Repo Auth sauber.

4. Installer Runner
   - v1 Windows: vorhandene NSIS Installer fuer Main und Code starten.
   - Erkennt laufende Nexus-Prozesse und bietet kontrolliertes Schliessen an.
   - Prueft Exit-Codes, Installationspfade und App-Dateien nach dem Install.

5. Local State Store
   - Speichert installierte Apps, Versionen, Commit-SHAs, Installationspfade,
     Channel, letzte erfolgreiche Updates und fehlgeschlagene Jobs.
   - Zielpfade:
     - Machine data: `C:\ProgramData\Nexus\Launcher`
     - User data: `%LOCALAPPDATA%\Nexus\Launcher`
     - Download cache: `C:\ProgramData\Nexus\Launcher\Cache`

6. CI Feed Publisher
   - GitHub Actions baut Main und Code auf Push/Workflow Dispatch.
   - Release-Gates laufen vor dem Feed-Publish.
   - Artefakte werden mit SHA256 versehen.
   - Ein `latest.json` pro Channel/Platform wird als durable Feed veroeffentlicht.

## Update Feed

Der Launcher sollte nicht direkt "irgendein neuester Workflow-Artefakt" suchen.
GitHub Actions Artifacts sind oft kurzlebig und fuer normale Nutzer nicht ideal.
Besser ist ein stabiler Feed, z. B. GitHub Releases, GitHub Pages oder ein
kleiner Nexus-Control-Endpunkt.

Beispiel:

```json
{
  "schemaVersion": 1,
  "channel": "stable",
  "platform": "win-x64",
  "publishedAt": "2026-06-27T12:00:00Z",
  "apps": [
    {
      "id": "main",
      "name": "Nexus Main",
      "version": "6.0.0",
      "commit": "abc123",
      "buildRunId": 123456789,
      "artifactName": "Nexus_Main_Setup_6.0.0.exe",
      "url": "https://github.com/.../Nexus_Main_Setup_6.0.0.exe",
      "sha256": "...",
      "requiredLauncher": "1.0.0",
      "releaseGate": "passed"
    },
    {
      "id": "code",
      "name": "Nexus Code",
      "version": "1.0.0",
      "commit": "abc123",
      "buildRunId": 123456789,
      "artifactName": "Nexus_Code_Setup_1.0.0.exe",
      "url": "https://github.com/.../Nexus_Code_Setup_1.0.0.exe",
      "sha256": "...",
      "requiredLauncher": "1.0.0",
      "releaseGate": "passed"
    }
  ]
}
```

## Installationsfluss

### Erstinstallation

1. Launcher startet und liest lokalen Zustand.
2. Nutzer waehlt Channel und Apps: Main, Code oder beide.
3. Launcher prueft Internet, Speicherplatz, Admin-Rechte und vorhandene
   Installationen.
4. Feed wird geladen und gegen Schema validiert.
5. Artefakte werden parallel heruntergeladen.
6. SHA256 wird geprueft.
7. Installer werden nacheinander ausgefuehrt.
8. Launcher validiert Installation und bietet "Starten" an.
9. Lokaler Zustand wird atomar gespeichert.

### Auto-Update

1. Beim Start und optional im Hintergrund Feed pruefen.
2. Wenn Remote-Commit neuer ist als lokal, Update-Plan erstellen.
3. Download im Hintergrund mit Resume.
4. Hash pruefen.
5. Nutzer informieren, wenn Apps laufen.
6. App kontrolliert schliessen oder Update auf naechsten Start verschieben.
7. Installer ausfuehren.
8. Health Check: App-Dateien, Version, optional erster Prozessstart.
9. Bei Erfolg Cache bereinigen, bei Fehler Rollback/Repair anbieten.

### Developer Mode: Build aus neuestem Commit

Dieser Modus ist fuer dich/Entwickler, nicht fuer normale Nutzer.

1. GitHub neuesten Commit fuer Branch lesen.
2. Lokalen Workspace clonen oder pullen.
3. `npm ci` pro App ausfuehren, wenn Lockfile geaendert wurde.
4. `npm run release:main-mobile` oder passender Gate fuer Main/Code.
5. `npm run build:main` und `npm run build:code` oder Installer-Builds.
6. Erzeugte Installer hashen.
7. Lokal installieren.

Wenn Build-Tools fehlen, zeigt der Launcher eine klare Prerequisite-Liste statt
eines generischen Fehlers.

## UI-Konzept

Der Launcher soll optisch zu Nexus Main und der Product Page passen, aber als
Werkzeug ruhiger und scanbarer bleiben.

### Layout

- Linke kompakte Navigation: Home, Apps, Updates, Downloads, Settings, Logs.
- Home als Operations-Dashboard, keine Marketing-Landing-Page.
- App-Zeilen fuer Main und Code mit Icon, Status, Version, Commit, Channel,
  Primaeraktion und kleinem Fortschritt.
- Rechte Detailflaeche fuer Release Notes, Build Evidence und Health Checks.
- Bottom Status Bar fuer Netzwerk, GitHub, Cache, Signing/Hash und letzte Aktion.

### Visual Style

- Basisfarben aus `assets/global/branding/nexus-brand.tokens.json`.
- Zusaetzlich an Main/Product Page angelehnt:
  - Deep background `#08091a` / `#0A0A14`.
  - Cyan/Indigo Akzente.
  - Dezente Glass-Surfaces, keine ueberladene Card-Kaskade.
  - Klare Progress-Bars und Status-Chips.
  - Segoe Fluent Icons in WinUI, nicht textlastige Buttons.
- Motion nur fuer Statuswechsel und Fortschritt, respektiert Reduced Motion.

### Hauptscreens

1. Home
   - "Nexus Ecosystem" Status.
   - Main/Code Installationsstatus.
   - Ein Button: "Alles aktualisieren".
   - Kurzer Release-Gate Status.

2. Apps
   - Main und Code als installierbare Apps.
   - Aktionen: Installieren, Aktualisieren, Starten, Reparieren, Deinstallieren.
   - Pfad, Version, Commit, Channel, letzter Check.

3. Updates
   - Update Queue und Verlauf.
   - Download-Fortschritt, Verify, Install, Health Check.
   - Fehlgeschlagene Jobs mit Retry.

4. Settings
   - Channel.
   - Auto-Update Verhalten.
   - Installationspfad.
   - GitHub Auth.
   - Cache Limit.
   - Developer Mode.

5. Logs
   - Filterbarer Ereignisstream.
   - Export als ZIP mit Manifest, Logs und Versionsstatus.

## Sicherheit und Robustheit

- Nie direkt ungepruefte Downloads ausfuehren.
- SHA256 ist Pflicht.
- Public Releases sollen signiert sein.
- Feed-Schema validieren, unbekannte Felder tolerieren, fehlende Pflichtfelder
  blockieren.
- Keine GitHub Tokens im Klartext speichern. Windows Credential Manager nutzen.
- Downloads in `.partial` schreiben und erst nach Hash-Pruefung promoten.
- Install-Jobs atomar speichern.
- Rollback-Information vor Install sichern.
- Rate Limits und Offline-Modus sichtbar behandeln.
- Keine silent Admin-Elevation ohne Nutzerkontext.

## Integration mit bestehendem Ecosystem

Vorhandene Anker:

- `Nexus-Ecosystem/package.json`
  - `build:main`
  - `build:code`
  - `build:electron:installers`
  - `verify:ecosystem`
  - `release:gate`
  - `verify:signing`
- `.github/workflows/build-installers.yml`
  - baut bereits Main und Code fuer win/mac/linux.
  - erzeugt Checksums.
  - laedt Installer als Artifacts hoch.
- `docs/SIGNING_AND_NOTARIZATION.md`
  - beschreibt RC/Public Signing Regeln.
- `assets/global/branding/nexus-brand.tokens.json`
  - Basis fuer Launcher-Design.

Noetige Erweiterungen:

1. Neuer Workflow `publish-launcher-feed.yml`
   - Nach erfolgreichem Installer-Build Manifest erzeugen.
   - Artefakte dauerhaft veroeffentlichen.
   - `latest.json` pro Channel/Platform schreiben.

2. Neues Tool `tools/publish-update-feed.mjs`
   - Release-Artefakte scannen.
   - SHA256SUMS lesen.
   - Manifest erzeugen und validieren.

3. Neuer Launcher-Ordner
   - C# Solution.
   - Core Libraries.
   - WinUI Shell.
   - Tests.

4. Optional `packages/nexus-release-schema`
   - Gemeinsames JSON Schema fuer Feed und Release Evidence.

## Meilensteine

### Phase 0: Entscheidungen und Repo-Setup

Ergebnis:

- Antworten auf die offenen Fragen.
- Entscheidung fuer C# WinUI 3 oder Rust/Tauri.
- Ordnerstruktur und Projektdateien.

Akzeptanz:

- Leerer Launcher startet.
- CI kann Launcher bauen.
- Branding Tokens sind eingebunden.

### Phase 1: Update Feed

Ergebnis:

- Manifest-Schema.
- Feed-Publisher Tool.
- Beispiel-Feed fuer Main/Code win-x64.
- Tests fuer Schema und Hash-Felder.

Akzeptanz:

- `latest.json` laesst sich lokal erzeugen.
- Ungueltiger Feed wird abgelehnt.
- Fehlende Checksums brechen den Publisher.

### Phase 2: Launcher UI MVP

Ergebnis:

- Home, Apps, Updates, Settings.
- Lokaler State Store.
- Feed lesen und Installationsstatus anzeigen.

Akzeptanz:

- Main/Code werden mit Remote-Version und lokalem Status angezeigt.
- Offline-Zustand ist klar sichtbar.
- UI ist bei 1280x720 und 1920x1080 stabil.

### Phase 3: Download und Verify

Ergebnis:

- Resumable Downloads.
- SHA256 Verification.
- Cache Management.

Akzeptanz:

- Download-Abbruch kann fortgesetzt werden.
- Falscher Hash blockiert Installation.
- Cache wird nicht unbegrenzt gross.

### Phase 4: Install, Update, Repair

Ergebnis:

- NSIS Installer Runner fuer Windows.
- App-Prozess-Erkennung.
- Update Queue.
- Repair-Aktion.

Akzeptanz:

- Frische Maschine: Main und Code installierbar.
- Bestehende Installation: Update wird erkannt und installiert.
- Fehlgeschlagener Installer laesst Retry zu.

### Phase 5: Auto-Update und Notifications

Ergebnis:

- Hintergrundcheck beim Launcher-Start.
- Optional Windows Notification.
- Update auf naechsten Start verschieben.

Akzeptanz:

- Nutzer wird nicht mitten in aktiver Arbeit hart unterbrochen.
- Updates lassen sich manuell starten.
- Launcher zeigt letzten erfolgreichen Updatezeitpunkt.

### Phase 6: Developer Mode

Ergebnis:

- GitHub Commit Check.
- Lokaler Clone/Pull.
- Prerequisite Check fuer Git, Node, npm.
- Build Main/Code aus Workspace.

Akzeptanz:

- Neuester Commit kann lokal gebaut werden, wenn Toolchain vorhanden ist.
- Fehlende Toolchain wird konkret angezeigt.
- Developer Mode ist klar als riskanter Modus markiert.

### Phase 7: Self-Update und Public Release Hardening

Ergebnis:

- Launcher aktualisiert sich selbst.
- Signatur-/Publisher-Checks.
- Release Evidence Export.

Akzeptanz:

- Launcher kann neue Version installieren.
- Public Build blockiert ohne geforderte Signing Evidence.
- Logs reichen fuer Support/Debugging.

## Teststrategie

- Unit Tests:
  - Feed parsing.
  - Version/Commit Vergleich.
  - Hash Verification.
  - State Store Migration.
  - Job Recovery.

- Integration Tests:
  - Fake Feed Server.
  - Fake Installer mit kontrollierten Exit-Codes.
  - Offline/Timeout/Rate Limit.
  - Abbruch waehrend Download und Install.

- Manual Smoke:
  - Frische VM.
  - Bestehende alte Main/Code Installation.
  - Kein Admin.
  - Defekter Hash.
  - Laufende App waehrend Update.

- CI Gates:
  - Launcher build.
  - Launcher tests.
  - Feed schema validation.
  - Existing `release:gate`.
  - Existing installer checksums.

## Erste konkrete Schreibschritte

1. Entscheidungen aus den offenen Fragen fixieren.
2. `Nexus Launcher` C# Solution anlegen.
3. WinUI Shell mit Nexus Theme Tokens bauen.
4. `Nexus.Launcher.Core` mit Models fuer App, Feed, Artifact, LocalState,
   UpdateJob schreiben.
5. Feed-Schema und Beispiel-Feed in `references/launcher-feed/` ablegen.
6. Feed-Client mit Tests schreiben.
7. Download/Hash-Service mit Tests schreiben.
8. Installer-Runner erst mit Fake Installer, dann mit echtem Main/Code NSIS.
9. GitHub Actions Feed Publisher erweitern.
10. Developer Mode als bewusst getrennten Advanced Flow bauen.

## V1 Scope

Muss:

- Nexus Main und Nexus Code installieren.
- Updates aus Feed erkennen.
- Artefakte herunterladen und per SHA256 pruefen.
- Bestehende Electron-Installer ausfuehren.
- Installation reparieren oder erneut versuchen.
- Modernes Nexus UI.
- Lokale Logs.

Soll:

- Channel-Auswahl.
- Auto-Check beim Start.
- Download Resume.
- App starten.
- GitHub Auth fuer private Feeds.

Spaeter:

- Self-Update.
- macOS/Linux.
- Mobile/Code Mobile Anzeige.
- Vollautomatische Background Updates.
- Nexus Control Integration.
- Remote Telemetry Dashboard.
