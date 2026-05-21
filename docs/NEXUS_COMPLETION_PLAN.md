# Nexus Fertigstellungs- und Releaseplan

Stand: 2026-05-21

Arbeitsstand nach Start der Abarbeitung:

- P0 Build-Basis fuer Main, Mobile, Nexus Code und Code Mobile ist repariert und erneut verifiziert.
- Website API Integration ist Node/tsx-sicher repariert und besteht.
- `verify:single-react`, `verify:encoding` und `verify:ecosystem` bestehen; Ecosystem-Gate meldet 63/63 Checks.
- Erste UI-Shell-Konsolidierung fuer Nexus Main ist umgesetzt: Main nutzt `MainShellLayout`/`MainViewHost`, View Error Boundaries sitzen im Host, der alte Inline-Shell-Block ist entfernt, und Boot-/View-Konstanten liegen wieder in `mainAppConfig.ts`.
- `packages/nexus-core` hat ein erstes View Manifest v2 fuer alle Kernviews inklusive Actions, Panels, Responsive Modes, Status-Signalen und ableitbarer Command Registry.
- `packages/nexus-core` hat ein eigenes Package-Gate mit Typecheck, Manifest-Test und Build-Script.
- Core View Runtime v2 ist erweitert: Layout Schema v2, Panel Engine, resolved Command Registry und sicherer Command Execution Hook sind angelegt und in Nexus Main sichtbar angebunden.
- Nexus Main hat eine zentrale `mainViewRegistry.ts`: Sidebar, View Preload, Boot-Prioritaeten, Heavy-View-Liste und persistenter View-Cache haengen jetzt an derselben Registry.
- Erste echte Shell-Commands sind angebunden: Quick Capture/New Note/New Task/New Reminder erzeugen Daten und wechseln in die passende View; alle weiteren Commands werden als `nexus:view-command` Event weitergereicht.
- UI-Cleanup fuer Nexus Main ist nachgezogen: doppelte Context-Bar entfernt, v6-Header kompakter, Sidebar-Topbereich vereinfacht, Statusleiste reduziert und Hover-Transforms fuer zentrale Klickziele weiter entschaerft.
- Nexus Main nutzt dieses Manifest sichtbar in der `NexusV6ViewShell`, einer reduzierten Statusleiste und manifest-basierten View-Actions.
- Ein Encoding-Gate (`npm run verify:encoding`) sucht jetzt in Source und Docs nach typischen Mojibake-Signaturen und besteht aktuell.
- Ein zentrales RC-Gate (`npm run release:gate`) und ein GitHub Actions Release-Gate sind angelegt.
- Die View-Smoke-Matrix ist als Markdown-Dokument und Wiki-Eintrag uebernommen.
- Grosser Nexus-v6-UI-Schnitt ist gestartet: Nexus Main und Nexus Mobile stehen auf Version `6.0.0`; alle Main-Views laufen durch eine neue `NexusV6ViewShell` mit einheitlichem Header, Fokusmodus, funktionaler Quick-View-Navigation, Inspector Rail, Panel-/Action-Modell und Status-Signalen.
- v6-UI wurde weiter entschlackt: Main-Content bekommt mehr Raum, die Inspector Rail startet geschlossen, das sichtbare Action/Activity-Modell wurde entfernt, Quick Navigation sitzt kompakt im Header und die Shell nutzt staerker transparente blurry Gradient-/Glow-Surfaces.
- Globales Main-Design ist enger an `nexusproject.dev` angelehnt: Space-Base, Cyan/Indigo/Violet-Produktpalette, cosmic glass panels, feines Grid, Text-Glow und Product-Page-aehnliche Radial-Glows sind in die v6-Shell uebernommen.
- Notes hat einen gezielten v6-Layout-Schnitt erhalten: kompaktere globale Topbar, mehr Schreibraum, breitere Library, bessere Editor-/Preview-Panes, glaeserne Toolbars und responsives Stack-Verhalten.
- Weiterer Nexus-v6-UI-Schritt ist umgesetzt: Dashboard-Hero, Today Layer, Resume-Lane, Widget Grid, globale Shell-Abstaende, View-Enhancer-Bar und Nexus Toolbar sind dichter, ruhiger und content-first ausgerichtet; Drag-/Hover-Scale ist fuer Dashboard-Widgets stabilisiert.
- Notes hat einen weiteren Release-Polish-Schnitt erhalten: schmalere Sidebar, kompakter Header, Command-Strip statt grossem Button-Panel, Advanced Blocks Menu, kleinere Format-Toolbar, mehr Editor-/Preview-Flaeche und ruhigere Surfaces.
- Dashboard Layout Editing ist erweitert: Widgets koennen per Drag/drop auch ueber Zeilen hinweg direkt getauscht werden; Drops in freie Bereiche werden als Positions-Insert behandelt und die Zielzeile nutzt den realen Grid-Gap.
- Weiterer v6-UI-Schritt umgesetzt: globale View-Shell ohne grossen Orb und mit kleinerem Header, Tasks Board/Stats/Controls verdichtet, Task-Karten klickstabiler gemacht, Canvas startet content-fokussierter mit Jump Search/Double-click Quick Add und Flux triagiert dringende Tasks ohne Auto-Done.
- InfoView und Notes-Starter-Readmes sind auf v6 aktualisiert: Welcome, kompletter View Guide, Markdown/Magic Showcase, Canvas Guide sowie Tasks/Flux Guide liegen als Default-Notes vor; bestehende Workspaces bekommen diese v6-Readmes additiv ueber Store-Merge, ohne alte Notizen zu ueberschreiben.
- InfoView wurde zur vollstaendigen App-Dokumentation ausgebaut: App-Struktur, Account/API/Tiers, jede einzelne Main-View, Notes/Magic, Settings/Design, Architektur, Release-Smokes, Shortcuts und Changelog sind wieder in der View dokumentiert.
- InfoView wurde weiter releasefertig gemacht: jede Main-View hat jetzt einen eigenen Guide-Tab mit Daily Flow, Quality Bar, Release-Check, praktischem Tipp und Wiki-Themen; die Texte sind handlungsnaeher und mit Emoji-Struktur lesbarer.
- Settings und Nexus Wiki haben einen v6-Polish-Pass erhalten: neue abwechslungsreiche Theme-Presets, reichere Theme-Library-Cards, sichere `nexus-theme-v6.json` Exporte, aktualisierte Wiki-v6-Labels und neue InfoView-Guide-Tab-Doku.
- Sichtbare v5-/KI-Platzhalter sind weiter bereinigt: App-Titel, Terminal-Intro, Main-Guides, Architektur-Doc, Paritaetsmatrix, Wiki-README, Canvas Magic und Wiki-Tags sprechen jetzt v6/Project-Brief statt alten v5-/AI-Project-Begriffen.
- Notes-Starter-Readmes haben einen weiteren Release-Guide-Pass erhalten: neue v6-Release-IDs, mehr Emoji-Struktur, Tabellen, Callouts, Checklisten, Metrics, Steps, Grid, Code-Fence und Magic-Block-Beispiele fuer alle Guide-Notizen.
- Wiki/Release-Doku wurde fuer Phase 4 verbunden: Release Ready Checklist, Known Issues, Completion Plan und Visual Evidence Guide sind jetzt eigene Wiki-Eintraege; `docs/KNOWN_ISSUES.md` und `docs/RELEASE_EVIDENCE_GUIDE.md` legen RC-Risiken und Screenshot-/Video-Evidence sauber fest.
- Electron Packaging ist weiter gehaertet: Main/Code haben explizite All-Platform-Installer-Skripte, v6-/versionierte Artefaktnamen, Linux-AppImage-Targets und die Installer-GitHub-Action baut jetzt macOS, Windows und Linux fuer Main und Code.
- NexusAPI hat einen Release-Daten-Hygiene-Pass erhalten: Runtime-JSON, lokale Dist-Daten, `.DS_Store` und Rust-Targets sind aus Git entfernt und ignoriert; Node/Rust Owner-Bootstrap verlangt fuer Production ein explizites `NEXUS_OWNER_BOOTSTRAP_PASSWORD`; Dev-User bleiben hinter `NEXUS_ENABLE_DEV_BOOTSTRAP_USERS`; `verify:release-data`, Runbook und env-Beispiel dokumentieren die neue Grenze.
- API-Node-Smoke ist erneut gelaufen: `build:node`, `verify:release-data` und `test:attack` bestehen; der lokale Rust-Check ist auf diesem Windows-Workspace nur durch fehlendes MSVC-`link.exe` blockiert.
- NexusAPI CI wurde zum Control Plane Release Gate erweitert: Commit `0428020` fuehrt auf Ubuntu Release-Datenhygiene, Node-Dist-Build, Rust-Format, Rust-Release-Build, Attack-Smoke und Node-vs-Rust-Contract aus; finaler GitHub-Run bleibt als Evidence zu pruefen.
- Nexus Code Electron Security ist angeglichen: Datei-IPC laeuft nur noch in per `openFolder` registrierten Workspace Roots, Terminal-CWD ist workspace-gebunden, Preload validiert Payloads, Permissions/WebViews/Navigation sind gehaertet und `verify:ecosystem` prueft die Grenzen statisch.
- Lokale Evidence nach Nexus-Code-Security-Pass: `node --check` fuer Main/Preload, `npm --prefix "Nexus Code" run lint`, `npm run verify:encoding`, `npm run verify:ecosystem`, `npm run release:gate -- --fast` und `npm --prefix "Nexus Code" run build` bestehen.
- Signing/Notarization ist fuer den naechsten RC vorbereitet: Main/Code nutzen macOS Hardened Runtime mit Entitlements, der Installer-Workflow hat ein Signing-Secret-Gate, macOS-Notarization via `notarytool`/`stapler`, SHA256SUMS Uploads und `tools/verify-signing-env.mjs`.
- Lokale Evidence nach Signing-Pass: `npm run verify:signing`, `npm run verify:ecosystem`, `npm run release:gate -- --fast`, `npm --prefix "Nexus Main" run build`, `npm --prefix "Nexus Code" run build`, `npm --prefix "Nexus Wiki" run build:ci` und ein Temp-Smoke fuer `tools/generate-installer-checksums.mjs` bestehen.
- DevTools hat jetzt ein eigenes Release Health Dashboard: API/Auth, View-Smokes, Packaging, Signing, Security und Evidence sind als persistente Checkliste, Score-Karten, Runtime-View-Map, Gate-Kommandos, Markdown-Report sowie redigierter Support-Diagnostics-Export direkt in Nexus Main sichtbar.
- Gefuehrtes Onboarding ist ausgebaut: Der First-Start-Walkthrough hat eine persistente Setup-Checkliste fuer Website-Account, App-Login/Remember-Me, Workspace-Ordner, Import, erste Note, Task/Reminder, Canvas-Hub und InfoView.
- Runtime Channel Guardrails sind im Client angelegt: Stable nutzt canonical Production API, Canary/Dev sind nur in Dev/Admin-Override-Kontext sichtbar, der Bootflow nutzt denselben Channel fuer Catalog/Layout/Release und Release Health zeigt Channel/API/Warnungen.
- DevTools hat jetzt einen lokalen Control Feature-Flag Editor: Feature Catalog Drafts, Layout Schema Guard, stufenweiser Rollout-Plan, Import/Export, Validierung und lokaler Audit Trail sind als Admin-Vorbereitung sichtbar; echte Production-Mutationen bleiben beim Hosted Control Plane.
- Notes Editor QoL ist stabilisiert: Enter/Zeilenumbrueche werden nicht mehr von globalen QuickSwitch-Handlern geschluckt, Toolbar-/Blocks-/Emoji-Buttons behalten die Textarea-Selection, Details/Toggle erzeugt `nexus-details` statt rohem HTML und interaktive Buttons defaulten appweit auf `type=button`.

Scope dieser Analyse:

- Nexus Main Desktop App mit allen Views
- Nexus Mobile App mit allen Views
- Nexus Code Desktop und Nexus Code Mobile
- `packages/nexus-core` inklusive Runtime, Live Sync und Control API Client
- `NexusAPI/API/nexus-control-plane` und API Contracts
- Nexus Wiki
- Public Website `nexusproject.dev`
- Release-, Build-, Sicherheits- und Dokumentationsreife

Hinweis: Dependency-Diffs und frisch aktualisierte Lockfiles wurden auf Wunsch nicht bewertet. Die Build- und Releaseaussagen beziehen sich auf den aktuell ausgecheckten Stand nach diesen Updates.

## Kurzfazit

Nexus ist funktional breit angelegt und in der Architektur deutlich weiter als ein Prototyp: Die Views sind in Desktop und Mobile fast vollstaendig vorhanden, `nexus-core` kapselt Runtime, Live Sync, View-Validierung und Control API sauber, die Control Plane hat eine ernsthafte Sicherheitsbaseline, Wiki und Website bauen erfolgreich.

Der aktuelle Stand ist trotzdem noch nicht releasefertig fuer App-Binaries. Die vorherigen Build-Blocker fuer Main, Mobile, Nexus Code und Code Mobile sind geschlossen; die naechsten Release-Gates sind Hosted/Node-vs-Rust-API-Evidence, fehlende Ende-zu-Ende-Smokes fuer alle Views, macOS Signing/Notarization und Packaging-/RC-Automatisierung.

Zusaetzlich sollte vor einem grossen Public Release ein sichtbarer UI-/UX-Schub eingeplant werden. Die Views sind funktional breit, brauchen aber ein staerkeres gemeinsames Layout-System, bessere reaktive Zustaende, klarere Primaeraktionen, konsistente Panel-/Toolbar-Strukturen und Core-Features, die komplexere und schoenere Oberflaechen ermoeglichen.

Release-Ampel:

| Bereich | Status | Einschaetzung |
| --- | --- | --- |
| Nexus Main | Gelb | Build repariert, Version `6.0.0`, alle Views laufen durch `NexusV6ViewShell`; View-Smokes und tiefere ViewShell-Migration offen. |
| Nexus Mobile | Gelb | Build repariert, Version `6.0.0`, Core-Manifest-Aenderung erneut bestaetigt; View-Smokes und Login/Register-Paritaet offen. |
| Nexus Code | Gelb/Gruen | Build repariert; Filesystem-/Terminal-Hardening ist umgesetzt und im Ecosystem-Gate verankert; packaged IDE-Smoke und Signing bleiben offen. |
| Nexus Code Mobile | Gelb | Build repariert; Mobile IDE Smoke, Packaging und Artifact-Namen offen. |
| Nexus Core | Gelb/Gruen | Gemeinsame Runtime ist deutlich reifer: Package-Gate, Layout Schema v2, Panel Engine und Command Registry sind angelegt; view-spezifische Handler bleiben offen. |
| Nexus API / Control Plane | Gelb/Gruen | Repo-/Dist-Datenhygiene ist geschlossen, Owner-Bootstrap ist env-pflichtig und Node Attack Smoke besteht; Hosted/Node-vs-Rust-Contract-Evidence bleibt offen. |
| Nexus Wiki | Gruen/Gelb | Build, Budget und i18n bestehen; Release-Links, Known Issues, Checklist und Visual Evidence Guide sind verbunden; echte Browser-/Mobile-QA bleibt offen. |
| Website | Gruen/Gelb | Build, Budget und API-Integration bestehen; Payment-E2E bleibt bewusst offen. |
| Gesamt | Gelb fuer RC-Vorbereitung | Build-, Website-, API-Datenhygiene-, Electron-Security- und Signing-Infrastruktur sind geschlossen; Hosted/API-Contract-Evidence, View-Smokes und echte Signing-Runner-Evidence bleiben offen. |

## Gepruefte Kommandos

Aus `F:\Coding\Nexus Workspace\Nexus-Ecosystem`:

```powershell
npm run verify:single-react
npm run verify:ecosystem
npm run doctor:release
npm run release:gate
npm run release:gate -- --fast
npm run verify:signing
npm --prefix "Nexus Wiki" run build:ci
node tools/generate-installer-checksums.mjs --dir <release-dir>
npm --prefix "packages/nexus-core" run build
npm --prefix "Nexus Main" run build
npm --prefix "Nexus Mobile" run build
npm --prefix "Nexus Code" run build
npm --prefix "Nexus Code Mobile" run build
npm --prefix "Nexus Wiki" run build
npm --prefix "Nexus Wiki" run build:ci
npm run verify:encoding
```

Aus `F:\Coding\Nexus Workspace\nexusproject.dev`:

```powershell
npm run build
npm run build:ci
npm run test:api:integration
```

Aus `F:\Coding\Nexus Workspace\NexusAPI`:

```powershell
npm --prefix "API/nexus-control-plane" run build:node
npm --prefix "API/nexus-control-plane" run verify:release-data
npm --prefix "API/nexus-control-plane" run test:attack
cargo fmt --manifest-path "API\nexus-control-plane\rust\Cargo.toml"
cargo check --manifest-path "API\nexus-control-plane\rust\Cargo.toml"
```

Ergebnisse:

| Check | Ergebnis | Notiz |
| --- | --- | --- |
| `verify:single-react` | Pass | Eine React-Instanz im Ecosystem erkannt. |
| `verify:ecosystem` | Pass | 23/23 Checks bestanden: Runtime-Nutzung, View-Validierung, Live Sync, interne API-Pfade. |
| `verify:encoding` | Pass | Source und Docs sind frei von typischen Mojibake-Signaturen. |
| Core Package Gate | Pass | `packages/nexus-core` prueft TypeScript und View Manifest v2. |
| `release:gate -- --fast` | Pass | Schneller RC-Gate-Pfad fuer Single React, Encoding, Ecosystem und Core Package. |
| `doctor:release` | Warn | Hosted API erreichbar, Android/JDK ok; macOS Notarization env und `xcrun notarytool` fehlen. |
| Main Build | Pass | Nach Nexus-v6-ViewShell, Version `6.0.0`, Core-Manifest-Context und App-Config-Cleanup erneut gruen. |
| Mobile Build | Pass | Nach Version `6.0.0` und Core-Manifest-Erweiterung erneut gruen. |
| Nexus Code Build | Pass | Tailwind 4 ueber `@tailwindcss/postcss` angebunden und CSS-Apply-Probleme bereinigt. |
| Nexus Code Mobile Build | Pass | Tailwind 4 ueber `@tailwindcss/postcss` angebunden und CSS-Apply-Probleme bereinigt. |
| Wiki Build | Pass | Vite Build erfolgreich. |
| Wiki Build CI | Pass | Build, Perf Budget und i18n bestehen. |
| Website Build | Pass | Vite Build erfolgreich. |
| Website Build CI | Pass | Build und Bundle Budget bestehen. |
| Website API Integration | Pass | `apiHostPolicy.ts` liest Vite Env defensiv und faellt in Node/tsx auf `process.env`/Defaults zurueck. |
| API Node Build | Pass | `dist` wird neu erzeugt, aber Runtime-JSON wird nicht mehr in `dist/data` kopiert. |
| API Release Data Gate | Pass | Keine verbotenen getrackten Runtime-JSONs, Rust-Targets, Logs oder `.DS_Store`; lokale Runtime-JSONs werden nur als ignored Warnung gemeldet. |
| API Attack Smoke | Pass | 23/23 Checks: Login/Register/Session, Signed Mutation, Replay-Schutz, Rate Limit, CORS, Webhooks und Owner-Gates. |
| API Release Gate CI | Angelegt | NexusAPI `0428020` erweitert GitHub Actions auf Release-Daten, Node Build, Rust Build, Attack-Smoke und Node-vs-Rust-Contract; Status des GitHub-Runs muss noch dokumentiert werden. |
| Rust Format | Pass | `cargo fmt` auf Control-Plane-Rust-Code ausgefuehrt. |
| Rust Check | Blockiert lokal | Windows-Workspace hat kein MSVC-`link.exe`; Ubuntu/VPS/GitHub-Runner muss den Rust-Build verifizieren. |

Nicht ausgefuehrt:

- Live-Payment-E2E der Website, weil dieser Pfad echte Sessions gegen eine API erzeugen kann.
- Voller Node-vs-Rust-API-Contract und Hosted/Staging-Contract-Gate. Node Attack Smoke ist gruen, aber der lokale Rust-Contract ist durch fehlendes MSVC-`link.exe` blockiert.
- Visuelle Browser-Smokes fuer alle Views. Die Matrix ist dokumentiert, die reale Ausfuehrung bleibt noetig vor Release.

## View-Analyse Main und Mobile

Desktop und Mobile enthalten dieselbe Kernnavigation:

- Dashboard
- Notes
- Tasks
- Reminders
- Canvas
- Files
- Code
- Flux
- Settings
- Info
- DevTools
- Render Diagnostics in Dev/Debug-Kontext

Die Views sind nicht nur Platzhalter. Viele Dateien sind umfangreich implementiert, inklusive lokaler Persistence, Runtime-Anbindung, View-Validierung, Mobile-Adaption und spezialisierten Workflows. Trotzdem gilt: Ohne erfolgreiche Builds und E2E-Smokes ist der Status "implementiert", nicht "releasebewiesen".

| View | Main | Mobile | Release-Einschaetzung | Fertigstellen |
| --- | --- | --- | --- | --- |
| Dashboard | Implementiert | Implementiert | Gute Startflaeche, Layout-/Statuslogik vorhanden; Desktop ist jetzt kompakter, content-first und stabiler bei Widget-Drag/Hover inklusive vertikalem Widget-Swap. | Persistenz, leerer Zustand, Widget-Konfiguration und Sync-Fehler per Smoke testen. |
| Notes | Stark implementiert | Stark implementiert | Editor, Magic-/Markdown-/Organisationslogik vorhanden; Desktop ist weiter verdichtet mit mehr Schreibflaeche, Command-Strip und Advanced Blocks Menu. | Import/Export, Konfliktfaelle und visuelle Browser-Smokes testen. |
| Tasks | Stark implementiert | Stark implementiert | Board-/Listen-/Produktivitaetsflows vorhanden. | Drag/drop, Filter, Persistenz und mobile Touch-Flows testen. |
| Reminders | Implementiert | Stark implementiert | Mobile wirkt sehr weit, Desktop braucht Notification-Smoke. | Reminder-Erstellung, Faelligkeit, Snooze, lokale Notifications und Zeitzonen testen. |
| Canvas | Stark implementiert | Stark implementiert | Umfangreich und visuell zentral. | Rendering, Touch/Gesten, Export, Undo/Redo und Performance-Budget pruefen. |
| Files | Stark implementiert | Stark implementiert | Main mit Electron-FS-Runtime, Mobile mit Plattformpfaden. | Rechte, Import/Export, Workspace Snapshot, grosse Dateien und Fehlerzustaende testen. |
| Code View | Implementiert | Implementiert | In-App-Codeflaeche vorhanden, getrennt von Nexus Code App. | Laufzeit-Ausfuehrung, Speicherung, Fehlerausgabe und Sandbox-Grenzen testen. |
| Flux | Stark implementiert | Stark implementiert | Ideen-/Flow-Modul vorhanden. | Kernworkflow definieren: Was ist MVP, was ist spaetere Automatisierung? |
| Settings | Implementiert | Implementiert | Viele Optionen und Runtime-Status vorhanden. | Kein Setting darf nur UI sein: jedes Toggle braucht Wirkung oder klare Deaktivierung. |
| Info | Implementiert | Implementiert | Produkt-/Systeminfos vorhanden. | Release-Version, Build-Channel, API-Status und Links finalisieren. |
| DevTools | Stark implementiert | Stark implementiert | Hilfreich fuer Diagnose, aber fuer Endnutzer riskant. | In Release nur gated anzeigen oder klar in Debug/Developer Mode kapseln. |
| Render Diagnostics | Klein, vorhanden | Klein, vorhanden | Nuetzlich fuer QA. | In Release nicht prominent zeigen, aber fuer Support abrufbar lassen. |

Wichtige Beobachtungen:

- `Nexus Main/src/App.tsx` rendert Views nicht mehr direkt, sondern delegiert an `MainShellLayout` und `MainViewHost`.
- `Nexus Main/src/app/mainAppConfig.ts` zentralisiert Boot-Timeouts, Fallback-Views, Preload-Gruppen und gemeinsame Helper wieder fuer Main.
- `packages/nexus-core/src/views.ts` enthaelt ein erstes View Manifest v2 als fachliche Quelle fuer Titel, Actions, Panels, Modes, Shortcuts und Status-Signale.
- Restliche Architekturdrift bleibt: `Sidebar`, `viewPreload` und die neuen Manifeste sollten als naechster Schritt vollstaendig aus einer Registry gespeist werden.
- Desktop Main hat Login/Register-Flows gegen `https://nexus-api.cloud`.
- Mobile bootet robuster mit Last-Known-Good-Fallbacks, hat aber keinen gleichwertigen sichtbaren Login/Register-Flow.
- In mehreren Textdaten sind Encoding-Artefakte sichtbar, zum Beispiel falsche Darstellung von deutschen Umlauten und Symbolen. Das ist kein Core-Feature-Bug, aber ein Release-Polish-Blocker.

## UI Design Leitbild

Nexus sollte sich weniger wie eine Sammlung einzelner Tools anfuehlen und staerker wie ein zusammenhaengender kreativer Workbench. Die App darf ruhig, dicht und produktiv wirken, aber nicht flach oder technisch roh. Ziel ist ein Interface, das fuer wiederholte Arbeit gebaut ist: schnell scannbar, reaktionsstark, visuell hochwertig, aber nicht dekorativ ueberladen.

Design-Richtung:

- Arbeitsflaeche zuerst, Marketing zuletzt.
- Ruhige, professionelle Flaechen statt viele dekorative Karten.
- Klare Primaeraktionen pro View.
- Sichtbare Systemzustaende: Speichern, Sync, Offline, Fehler, Verarbeitung.
- Gute Dichte auf Desktop, gut erreichbare Controls auf Mobile.
- Einheitliche Toolbars, Panels, Tabs, Filter, Suchfelder, Inspector Rails und Statusleisten.
- Icons fuer bekannte Aktionen, Text nur dort, wo Bedeutung sonst unklar wird.
- Keine verschachtelten Cards. Wiederholte Items duerfen Cards sein, ganze Seitenbereiche nicht.
- Stabile Hoehen/Breiten fuer Toolbars, Buttons, Tabs, Boards und Tiles, damit Hover, Labels oder Ladezustaende kein Layout verschieben.
- Text darf auf keiner View ueberlaufen oder Controls sprengen.

Visueller Zielcharakter:

- Produktivitaets-App: dicht, ruhig, schnell.
- Kreativwerkzeug: grosszuegige Canvas-/Editor-Flaechen.
- Developer Tool: praezise, monospace dort wo sinnvoll, klare Status- und Fehlerzonen.
- Mobile: weniger Spalten, mehr Bottom Sheets, Segmented Controls und Floating Toolbars.

## Gemeinsame View-Shell

Aktuell wirken viele Views einzeln stark, aber das System braucht eine gemeinsame Shell-Logik. Diese Shell sollte als UI-Kern in Core oder als geteiltes App-Package gedacht werden, damit Main, Mobile, Wiki-nahe Demos und Code-Oberflaechen dieselben Layoutregeln sprechen.

Empfohlene Desktop-Struktur:

| Zone | Zweck | Verhalten |
| --- | --- | --- |
| Global Rail | App-Wechsel, Hauptviews, Status-Badges | Schmal, icon-basiert, immer stabil. |
| Top Command Bar | Suche, Command Palette, globale Aktionen, Account/API-Status | Sticky, kompakt, keyboard-first. |
| View Header | Titel, Breadcrumb, View-spezifische Primaeraktion | Nicht hero-gross, eher arbeitsnah. |
| View Toolbar | Filter, Sortierung, Modes, Tools | Einheitliche Hoehe, segmentierte Controls, Icon Buttons. |
| Main Surface | Liste, Board, Editor, Canvas oder Dashboard | Maximale Flaeche, keine dekorative Umrandung. |
| Inspector Rail | Details, Eigenschaften, Kontextaktionen | Rechts andockbar, resizable, auf Mobile als Sheet. |
| Bottom Status Bar | Sync, Speicherstatus, Auswahl, Performance, Fehler | Schmal, informativ, nicht laut. |
| Modal/Sheet Layer | Bestaetigungen, Quick Create, Detail-Editor | Einheitliches Verhalten, Fokusfang, Escape/Back. |

Mobile-Adaption:

- Global Rail wird Bottom Navigation oder kompaktes View Switcher Sheet.
- View Toolbar wird horizontal scrollbar oder in ein Actions Sheet verschoben.
- Inspector Rail wird Bottom Sheet mit Snap Points.
- Multi-Column Layouts werden zu Stack Navigation: Liste -> Detail -> Inspector.
- Drag/drop-Flows brauchen Touch-Alternativen: Move Menu, Reorder Handles, Long Press.
- Primaeraktion pro View als gut erreichbarer Floating Action Button oder Toolbar-Button.

## UI Komponenten, Tokens und Verhalten

Nexus braucht ein klares internes Design System. Nicht als grosses eigenes Framework, sondern als kleine Menge harter Primitiven, die alle Views verwenden.

### Tokens

Ein gemeinsames Token-Set sollte definieren:

- Farbrollen: `background`, `surface`, `surfaceElevated`, `border`, `text`, `textMuted`, `accent`, `success`, `warning`, `danger`, `info`.
- Semantische Statusfarben, nicht pro View neu erfundene Paletten.
- Typografie: feste Skala fuer App Shell, View Header, Panel Header, Body, Meta, Monospace.
- Spacing: 4/8/12/16/24 Raster.
- Radius: Standard 6 bis 8 px, groessere Radien nur fuer Sheets/Overlays.
- Border/Elevation: sehr sparsam, lieber klare Trennung durch Flaechen und Linien.
- Motion: kurze, funktionale Transitions fuer Panels, Sheets, Auswahl, Ladewechsel.

### Basiskomponenten

Prioritaet fuer geteilte Komponenten:

- `AppShell`
- `ViewShell`
- `ViewToolbar`
- `InspectorRail`
- `StatusBar`
- `CommandPalette`
- `SearchBox`
- `SegmentedControl`
- `IconButton`
- `SplitPane`
- `ResizablePanel`
- `Tabs`
- `DataTable`
- `CardList`
- `KanbanBoard`
- `Timeline`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConfirmDialog`
- `Toast`
- `BottomSheet`
- `ContextMenu`
- `KeyboardShortcutHint`

Diese Komponenten sollten nicht nur optisch gleich sein, sondern gleich reagieren:

- Focus Ring konsistent.
- Disabled State konsistent.
- Loading State konsistent.
- Error State mit Retry.
- Tooltips fuer Icon Buttons.
- Tastaturbedienung fuer Menus, Tabs, Dialoge und Command Palette.
- Mobile Touch Targets mindestens komfortabel gross.

## UI Engine und Core Feature-Roadmap

Damit Nexus komplexere und schoenere UIs bauen kann, sollte `nexus-core` nicht nur Daten, Runtime und API kapseln, sondern auch UI-faehige Primitiven bereitstellen. Das heisst nicht, dass Core React-Komponenten enthalten muss. Besser ist eine Schicht aus Schema, Registries, Layout-Modellen und Interaktionskontrakten, die Main/Mobile/Code dann rendern.

Empfohlene Core-Erweiterungen:

| Feature | Nutzen | Konkrete Form |
| --- | --- | --- |
| View Manifest v2 | Jede View beschreibt Navigation, Actions, Shortcuts, Permissions und Responsive Modes. | `NexusViewManifest` mit `id`, `title`, `icon`, `actions`, `panels`, `shortcuts`, `mobileMode`. |
| Layout Schema v2 | Server/API kann komplexere Oberflaechen validieren, ohne Renderer zu kennen. | Split panes, tabs, rails, boards, grids, inspectors, status zones. |
| Command Registry | Jede Aktion wird suchbar, per Shortcut ausfuehrbar und in UI eingebunden. | `registerCommand`, `canRun`, `run`, `shortcut`, `scope`. |
| Panel Engine | Views koennen Inspector, Details, Filter, Preview und Debug Panels einheitlich andocken. | Dock left/right/bottom, resizable, collapsed, persisted. |
| Interaction State | Einheitlicher Umgang mit selection, hover, focus, dirty, saving, offline, error. | Shared finite state contracts oder kleine state helpers. |
| Undo/Redo Stack | Notes, Tasks, Canvas, Files und Code brauchen konsistente Ruecknahme. | Command-basierter History Stack pro Workspace/View. |
| Optimistic Update Layer | UI reagiert sofort, API/Storage bestaetigt spaeter. | Pending markers, rollback, conflict events. |
| Theme Engine | Schoenere Oberflaechen ohne harte CSS-Duplizierung. | Tokens, density modes, high contrast, reduced motion. |
| Responsive Adapter | Main und Mobile teilen dieselbe View-Idee, rendern aber passende Layouts. | `desktop`, `tablet`, `phone`, `compact` Layout Hints. |
| Empty/Error/Loading Contracts | Jede View zeigt professionelle Zustandsflaechen. | Standardisierte State Models mit CTA, Retry, Details. |
| Data Surface Primitives | Tabellen, Listen, Boards und Timelines werden schneller und konsistenter. | Sorting, filtering, grouping, virtualization, selection. |
| Canvas Scene Model | Canvas kann komplexer werden, ohne UI-Logik zu zerfasern. | Layers, nodes, edges, guides, transforms, hit testing. |
| Telemetry/Perf Hooks | UI kann echte Reaktionszeit messen. | view mount time, action latency, save latency, render cost. |
| A11y Contracts | Barrierefreiheit wird Teil des View-Manifests. | Labels, roles, keyboard maps, focus order hints. |

Wichtig: Die Engine soll den Views nicht die Gestaltung wegnehmen. Sie soll wiederkehrende Komplexitaet tragen, damit jede View hochwertiger aussehen und stabiler reagieren kann.

Status 2026-05-06:

- View Manifest v2 ist als erster Core-Schnitt angelegt: Kernviews beschreiben Titel, Navigation, Actions, Panels, Desktop-/Mobile-Modes, Shortcuts und Status-Signale.
- Nexus Main rendert daraus manifest-basierte Statusinformationen und eine `NexusV6ViewShell` fuer alle Views.
- Die v6-Shell erweitert jede Main-View um Fokusmodus, manifest-basierte Quick Navigation, Inspector Rail, Action-Modell, Panel-Uebersicht, Status-Signale und responsive Fallbacks.
- Noch offen sind Layout Schema v2, echte Command-Ausfuehrung, Panel Engine und die vollstaendige Migration von Sidebar/Toolbar/ViewPreload auf dieselbe Registry.

## View-spezifische UI Verbesserungen

| View | UI-Zielbild | Konkrete Verbesserungen |
| --- | --- | --- |
| Dashboard | Eine echte Arbeitszentrale statt Kartenuebersicht. | Resizable Widgets, Today Strip, Activity Feed, API/Sync Health, Quick Capture, kompakte Metriken, gespeicherte Layouts. |
| Notes | Schneller Schreibraum mit Strukturhilfe. | Drei Modi: Focus Editor, Split Preview, Library. Outline Rail, Backlinks, Tags, Magic Panel als Inspector, bessere Empty States. |
| Tasks | Operatives Board mit mehreren Perspektiven. | Board/Table/Timeline Mode, Swimlanes, Quick Filters, Bulk Actions, Detail Inspector, klare Drag/drop- und Touch-Alternative. |
| Reminders | Zeit- und Kontextansicht. | Agenda, Timeline, Calendar Strip, Snooze Sheet, wiederkehrende Regeln visuell editierbar, overdue cluster. |
| Canvas | Vollwertige kreative Flaeche. | Full-bleed Surface, Layer Panel, Inspector, Minimap, Smart Guides, Grid/Snap, Tool Palette, Zoom Controls, Export Panel. |
| Files | Workspace-Dateimanager statt Dateiliste. | Breadcrumb, Split Preview, Quick Actions, Upload/Dropzone, Recent Files, Type Filter, Path Trust Indicator. |
| Code View | Kleine IDE innerhalb Main. | Monaco Shell, Problems Bottom Panel, Run Output, Snippet Commands, File Context, safer execution states. |
| Flux | Prozess- und Ideenfluss als interaktive Map. | Node Graph oder Timeline, Stage Columns, Connection Lines, Focus Mode, Status Inspector, Convert to Task/Note. |
| Settings | Kontrollzentrum statt Optionsliste. | Suchbare Settings, Kategorien, Status Chips, Danger Zone, Preview fuer Theme/Density, API Connection Test. |
| Info | Systemueberblick, nicht Broschuere. | Version, Channel, API Host, Build Manifest, Runtime Health, Links zu Wiki/Diagnostics. |
| DevTools | Release Health Cockpit. | Feature Catalog, Layout Schema, Capability Report, Sync Events, Logs, Perf Timeline, Export Diagnostics. |
| Render Diagnostics | Support-Werkzeug. | Kompakter Debug Screen, Copy Report, visual render checks, failed asset list. |

## Reaktionsverhalten und Mikrointeraktionen

Die UI sollte nicht nur besser aussehen, sondern spuerbar direkter reagieren. Dafuer braucht Nexus einheitliche Regeln:

- Jede Primaeraktion gibt sofort Feedback innerhalb von 100 ms.
- Speichern zeigt `saving`, `saved`, `offline queued` oder `error` sichtbar, aber nicht stoerend.
- Lange Operationen bekommen Skeletons oder Progress, keine leeren Flaechen.
- Listen, Boards und grosse Canvas-Szenen brauchen Virtualisierung oder Chunking.
- Filter und Suche werden debounce-t, aber die Eingabe bleibt sofort fluessig.
- Requests sind abbrechbar, wenn View oder Filter gewechselt wird.
- Toasts melden Ergebnis, aber ersetzen keine dauerhaften Fehlerzustaende.
- Destruktive Aktionen nutzen ein eigenes Confirm-Dialog-System statt native `confirm()`.
- Command Palette findet Aktionen, Views, Dateien, Notizen und Einstellungen.
- Keyboard Shortcuts werden konsistent dokumentiert und in Tooltips angezeigt.
- Mobile nutzt Bottom Sheets und lange Touch Targets statt Desktop-Dialoge zu verkleinern.

## UI Acceptance Criteria

Eine View gilt UI-seitig als releasebereit, wenn:

- Sie bei leerem, normalem und stark gefuelltem Zustand gut aussieht.
- Sie bei langsamer API oder Offline-Modus einen verstaendlichen Zustand zeigt.
- Sie auf Desktop und Mobile ohne Ueberlappungen funktioniert.
- Sie eine klare Primaeraktion hat.
- Filter, Suche und Sortierung nicht das Layout verschieben.
- Text in Buttons, Tabs, Karten und Panels nicht ueberlaeuft.
- Alle Icon Buttons Tooltips haben.
- Keyboard und Touch Hauptflows funktionieren.
- Loading, Error und Empty States gestaltet sind.
- Die View dieselben Shell-/Toolbar-/Inspector-Regeln nutzt wie die anderen Views.

## Nexus Core

Staerken:

- `packages/nexus-core` buendelt Runtime, Views, Live Sync, Control API, Quick Capture, Today Layer, Render, Motion, Reminders, Code und DevTools.
- `createNexusRuntime` kapselt Connection, Performance, Control API, Heartbeat, Capability Report und Release Sync.
- Live Sync trennt Main/Mobile-Fallback-Views von serverseitiger Layout-/Feature-Konfiguration.
- View-Validierung ist im Ecosystem-Gate nachgewiesen.
- API Client normalisiert den Control Host strikt auf `https://nexus-api.cloud`, was Produktion schuetzt.

Risiken:

- Die harte Canonical-URL ist gut fuer Production, erschwert aber Staging, lokale QA und Preview-Deployments.
- Core braucht einen eigenen Package-Gate: Typecheck, Unit Tests, API Contract Fixtures, Build/Pack-Test.
- Fallback-Bundles muessen als offizieller Offline-/Degraded-Modus dokumentiert werden.
- View-Schema und Client-Faehigkeiten sollten versioniert und mit Contract Tests eingefroren werden.

Fertigstellen:

1. Eigenes Core-Gate einfuehren:

   ```powershell
   npm --prefix "packages/nexus-core" run typecheck
   npm --prefix "packages/nexus-core" run test
   npm --prefix "packages/nexus-core" run build
   ```

2. Falls Scripts fehlen, minimal ergaenzen:

   - TypeScript noEmit
   - Vitest/Jest fuer pure Runtime-Funktionen
   - Fixture-Test fuer Layout Schema, Feature Catalog und Release Manifest

3. Staging-Strategie entscheiden:

   - Production bleibt strikt canonical.
   - Development/CI darf explizit per Env einen lokalen oder Staging-Control-Host verwenden.
   - Jede Abweichung muss sichtbar geloggt und in Release Builds blockiert werden.

## Nexus API und Control Plane

Staerken:

- Control Plane hat breite Route-Abdeckung:
  - Auth/Login/Register/Session
  - Public Health und Bootstrap
  - Apps, Config, Policies, Devices, Metrics, Build Manifest, Commands, Audit, Guides
  - v2 Capabilities, Feature Catalog, Layout Schema, Layout Validation, Releases
  - Payment Plans, Checkout, Portal, Webhook, Admin State/Sessions
- Sicherheitsbaseline ist ernsthaft:
  - Loopback-Fallback fuer unsichere Host-Bindings
  - Keine wildcard trusted origins in sicherem Modus
  - Owner-only Control Panel
  - Signed Mutations
  - Verified Device Requirements
  - Ingest-Key-Hardening
  - Rate Limits
  - JSON Logging
- Production Runbook existiert und nennt Secret Store, nginx, systemd, TLS und env-basierte Ingest Keys.

Risiken:

- ~~Release-Daten wirken noch nicht sauber getrennt von Dev-Daten.~~ Geschlossen am 2026-05-10 im NexusAPI-Commit `f307229`: Runtime-JSONs werden ignoriert und nicht mehr nach `dist` kopiert.
- ~~In `data/users.json` sind neben Owner auch Admin/Developer/Viewer Seeds vorhanden.~~ Geschlossen fuer Git/Dist; Dev-User bleiben nur per `NEXUS_ENABLE_DEV_BOOTSTRAP_USERS`.
- ~~In `data/policies.json` sind lokale Ingest-Key-Werte erkennbar.~~ Geschlossen fuer Git/Dist; Production muss env-/Secret-basierte Keys nutzen.
- ~~Rust `target`-/Buildartefakte und Logs muessen aus Release-Repos und Commits herausgehalten werden.~~ Geschlossen fuer Git; `.gitignore` und `verify:release-data` sichern das ab.
- Der volle Node-vs-Rust-Contract-Gate und ein Hosted/Staging-Contractlauf bleiben offen.

Fertigstellen:

1. Release-Daten bereinigen:

   Status 2026-05-10: erledigt fuer Repo, Dist und Bootstrap-Defaults im NexusAPI-Commit `f307229`.

   - Keine lokalen Ingest Keys im Repo.
   - Keine Default-Produktionspasswoerter.
   - Dev Bootstrap User nur per `NEXUS_ENABLE_DEV_BOOTSTRAP_USERS=true`.
   - `NEXUS_REQUIRE_ENV_INGEST_KEYS=true` fuer Production.
   - Produktionsdaten in Secret Store oder deploy-spezifischen Volumes halten.

2. Git-Hygiene:

   Status 2026-05-10: erledigt fuer Runtime-JSON, Dist-Runtime-Daten, Rust-Targets, Logs und `.DS_Store`; `verify:release-data` ist als Guard vorhanden.

   - `target/`, Logs, Runtime-Dumps und lokale Daten in `.gitignore` pruefen.
   - Bereits versionierte Buildartefakte gezielt entfernen, falls sie im Repo liegen.

3. API-Gate in CI:

   ```powershell
   npm --prefix "..\NexusAPI\API\nexus-control-plane" run test:contract
   npm --prefix "..\NexusAPI\API\nexus-control-plane" run test:attack
   ```

4. Production Probe:

   - Hosted `/health` pruefen.
   - Public Bootstrap pruefen.
   - Auth Smoke mit Testuser in Staging.
   - Signed Mutation Smoke.
   - Device Approve/Revoke Smoke.
   - Audit Log Smoke.

## Nexus Code und Code Mobile

Staerken:

- Nexus Code ist deutlich mehr als ein Editor-Shell:
  - Monaco Editor
  - File Explorer
  - Tabs
  - Terminal
  - Suche
  - Git Panel
  - Debug Panel
  - Extensions/Settings
  - Command Palette/Spotlight
  - Problems
  - Disk Workspace in Electron
  - Runtime- und Release-Kompatibilitaetschecks
- Code Mobile adaptiert die IDE-Idee auf eine mobile Oberflaeche.

Blocker:

- ~~Beide Builds scheitern an Tailwind 4/PostCSS-Konfiguration.~~ Erledigt am 2026-05-06.
- Desktop Code sollte die Filesystem-Schutzlogik aus Main uebernehmen oder gleichwertig absichern.
- App-/Artifact-Namen wirken teilweise zu generisch oder kollisionsgefaehrdet.

Fertigstellen:

1. ~~Tailwind 4 korrekt anbinden:~~

   - `@tailwindcss/postcss` installieren oder auf das Vite-Plugin migrieren.
   - `postcss.config.js` in Desktop und Mobile aktualisieren.
   - Danach beide Builds erneut ausfuehren.

2. Filesystem-Grenzen haerten:

   - Allowed Roots wie in Main verwenden.
   - Delete/Rename/Write nur innerhalb erlaubter Workspace-Wurzeln.
   - Terminal-Befehle weiter blocken, aber Ergebnis auch in UI auditierbar machen.

3. Packaging klaeren:

   - Paketname fuer Code Mobile eindeutig machen.
   - Artifact-Namen klar von Nexus Main trennen.
   - Release-Channel, App-ID und Icons final pruefen.

## Nexus Wiki

Status:

- Build erfolgreich.
- `build:ci` erfolgreich.
- Perf Budget erfolgreich.
- i18n Check erfolgreich mit 74 Entries und 74 Translations.
- Suche und Filter wirken als ernsthafte Docs-Oberflaeche statt als statische Linkliste.
- Release Ready Checklist, Known Issues, Completion Plan und Visual Evidence Guide sind eigene Wiki-Eintraege.

Fertigstellen:

1. ~~Diese Completion-/Release-Plan-Datei im Wiki verlinken.~~ Erledigt: Wiki-Eintrag `release-completion-plan`.
2. ~~Known Issues und Release Checklist als eigene Wiki-Eintraege aufnehmen.~~ Erledigt: `release-known-issues` und `release-ready-checklist`.
3. ~~Screenshots oder kurze visuelle Guides fuer Main, Mobile, Code und Control ergaenzen.~~ Erledigt: `release-visual-evidence-guide` plus `docs/RELEASE_EVIDENCE_GUIDE.md`.
4. Encoding-Artefakte in sichtbaren Texten entfernen.
5. Mobile Browser Smoke:

   - Suche
   - Sprache wechseln
   - Kategorie filtern
   - Entry kopieren
   - Deep Link oeffnen

## Website `nexusproject.dev`

Status:

- `npm run build` erfolgreich.
- `npm run build:ci` erfolgreich.
- Bundle Budget erfolgreich.
- Struktur deckt Public Story, Ecosystem, Security/API, Developer, Account und Pricing ab.
- Payment Feature ist production-seitig vorsichtig gegated.

Blocker:

- ~~`npm run test:api:integration` scheitert in Node, weil `apiHostPolicy.ts` direkt `import.meta.env.MODE` liest.~~ Erledigt am 2026-05-06.
- Live-Payment-E2E wurde bewusst nicht ausgefuehrt.

Fertigstellen:

1. ~~`apiHostPolicy.ts` Node-sicher machen:~~

   - Vite env nur defensiv lesen.
   - In Node/tsx Tests auf `process.env` oder sichere Defaults fallen.
   - Danach Integrationstest erneut ausfuehren.

2. ~~API-Integration testen:~~

   ```powershell
   npm run test:api:integration
   ```

3. Payment-Release entscheiden:

   - Entweder Feature Flag bis Provider-Freigabe aus lassen.
   - Oder Staging Provider konfigurieren und E2E gegen Staging laufen lassen.

4. Browser-Smoke:

   - Startseite
   - Login Page
   - Account Page
   - Pricing
   - API Status/Bootstrap
   - Mobile Viewport

## P0 Blocker vor jedem Release Candidate

1. ~~Main und Mobile Build reparieren.~~

   Erledigt am 2026-05-06: `ignoreDeprecations: "6.0"`, CSS Side-Effect Declarations und Tailwind/PostCSS-Kompatibilitaet sind gesetzt; beide Builds laufen gruen.

   Aktueller Fehler:

   - TypeScript 6 wertet `baseUrl` als deprecated und blockiert `tsc -b`.
   - Nach Umgehung des Build-Modus fehlt eine CSS Side-Effect Declaration fuer `./index.css`.

   Optionen:

   - `ignoreDeprecations: "6.0"` in die relevanten `tsconfig.json` aufnehmen.
   - Oder `baseUrl`/Path-Setup modernisieren.
   - `src/vite-env.d.ts` oder eine CSS-Declaration ergaenzen:

     ```ts
     /// <reference types="vite/client" />
     ```

   Akzeptanz:

   ```powershell
   npm --prefix "Nexus Main" run build
   npm --prefix "Nexus Mobile" run build
   ```

2. ~~Nexus Code und Code Mobile Build reparieren.~~

   Erledigt am 2026-05-06: `@tailwindcss/postcss` ist eingebunden, Tailwind-4-`@apply`-Brueche sind bereinigt, beide Builds laufen gruen.

   Aktueller Fehler:

   - Tailwind 4 wird direkt als PostCSS Plugin genutzt.
   - Tailwind verlangt `@tailwindcss/postcss` oder eine passende Vite-Integration.

   Akzeptanz:

   ```powershell
   npm --prefix "Nexus Code" run build
   npm --prefix "Nexus Code Mobile" run build
   ```

3. ~~Website API Integration reparieren.~~

   Erledigt am 2026-05-06: `apiHostPolicy.ts` liest `import.meta.env` defensiv; `npm run test:api:integration` besteht.

   Akzeptanz:

   ```powershell
   cd "F:\Coding\Nexus Workspace\nexusproject.dev"
   npm run test:api:integration
   ```

4. ~~API Release-Daten bereinigen.~~

   Erledigt am 2026-05-10 im NexusAPI-Commit `f307229`: Runtime-JSONs, lokale Dist-Daten, `.DS_Store` und Rust-Targets sind aus Git entfernt; `.gitignore` und `verify:release-data` verhindern Rueckfaelle; Node/Rust Owner-Bootstrap erzeugt in Production keinen Admin mehr ohne explizites `NEXUS_OWNER_BOOTSTRAP_PASSWORD`.

   Akzeptanz:

   - Keine lokalen Ingest Keys in Repo-Daten.
   - Keine Dev-User in Production-Datensets.
   - Production verlangt env-basierte Secrets.
   - Runbook und Deployment stimmen ueberein.

5. ~~RC Gate als ein Kommando oder CI-Workflow definieren.~~

   Status 2026-05-07:

   - Erledigt als `npm run release:gate`.
   - Fast-Modus fuer schnelle lokale RC-Vorpruefung: `npm run release:gate -- --fast`.
   - API Contract/Attack Tests sind optional zuschaltbar: `npm run release:gate -- --with-api-contract`.
   - GitHub Actions Workflow `.github/workflows/release-gate.yml` ist angelegt.

   Mindestumfang:

   ```powershell
   npm run verify:single-react
   npm run verify:ecosystem
   npm run doctor:release
   npm --prefix "Nexus Main" run build
   npm --prefix "Nexus Mobile" run build
   npm --prefix "Nexus Code" run build
   npm --prefix "Nexus Code Mobile" run build
   npm --prefix "Nexus Wiki" run build:ci
   cd "F:\Coding\Nexus Workspace\nexusproject.dev"
   npm run build:ci
   npm run test:api:integration
   ```

## P1 Release-Hardening

1. Gemeinsames UI-System und View-Shell einfuehren.

   Ziel:

   - Views wirken wie ein zusammenhaengendes Produkt.
   - Main und Mobile teilen Layout- und Interaktionskonzepte.
   - Toolbars, Inspector Rails, Statusleisten, Empty/Error/Loading States und Confirm Dialogs sind konsistent.
   - Core liefert View Manifest, Layout Schema, Command Registry, Panel Engine und Interaction State als stabile Grundlage.

   Akzeptanz:

   - Mindestens Dashboard, Notes, Tasks und Canvas nutzen die neue Shell.
   - Jede dieser Views hat klare Desktop- und Mobile-Regeln.
   - Keine Textueberlaeufe, keine verschachtelten Cards, keine springenden Toolbars.
   - Primaeraktionen, Filter, Suche und Statusfeedback sind einheitlich.

   Status 2026-05-07:

   - Erster Shell-Schnitt in Nexus Main umgesetzt: `MainShellLayout` plus `MainViewHost`, reduzierte Status-Bar, Error Boundaries und stabile View-Mount-Schicht.
   - Zweiter v6-Schnitt umgesetzt: `NexusV6ViewShell` rahmt alle Main-Views mit modernem Header, Fokusmodus, kompakter Quick Navigation, optionaler Inspector Rail, Panel-Modell und responsiven Regeln.
   - Refinement umgesetzt: Content-Flaeche priorisiert, Inspector standardmaessig geschlossen, sichtbares Action/Activity-Modell entfernt, transparente blurry Gradient-/Glow-Surfaces verstaerkt.
   - Product-Page-Angleichung umgesetzt: Main nutzt die `nexusproject.dev`-artige Space-/Cosmic-Palette, Cyan/Indigo/Violet-Glows, Grid/Noise-Anmutung, glass panels und Avenir/Plus-Jakarta/Outfit-nahe Typografie.
   - Notes-Refinement umgesetzt: Header/Orb sind kompakter, Notes Library, Editor, Preview, Formatting Toolbar und Statuszeile nutzen ein klareres v6-Schreiblayout mit stabileren Flaechen und responsivem Stack.
   - Dashboard-/Shell-Refinement umgesetzt: Dashboard-Hero, Today Layer, Resume-Lane und Widget Grid sind dichter und uebersichtlicher; globale v6-Abstaende, View Header, Workbench-Gaps, View-Enhancer-Bar und Nexus Toolbar sind kompakter und geben Main-Content/Controls mehr Flaeche.
   - Interaktionsstabilitaet verbessert: Dashboard-Widget-Drag nutzt nur noch minimale Scale-Werte, Hover-Scale wurde im Grid neutralisiert und der Widget-Swap-Hinweis erscheint nur im Layout-Edit-Modus.
   - Notes-Release-Polish umgesetzt: grosse Button-Panels wurden zu einem schmalen Command-Strip verdichtet, Advanced Markdown/Nexus Blocks liegen im Blocks Menu, Format-Toolbar und Tags sind kleiner, Sidebar/List Rows sind enger und Editor/Preview bekommen mehr Hoehe.
   - Dashboard Layout Editor erweitert: Drag/drop tauscht Widgets jetzt auch ueber Zeilen hinweg explizit nach Ziel-Widget und kann freie Zielpositionen als Insert behandeln; die Pointer-Zeilenerkennung nutzt den echten Grid-Gap.
   - UI-Cleanup umgesetzt: globale Context-Bar entfernt, Status-Bar auf Kerninfos reduziert, Sidebar-Metriken und Quick Actions schlanker gemacht, v6-Header-Actions reduziert und Hover-Bewegungen fuer Actions/Panels stabilisiert.
   - Core liefert erste View-Manifeste fuer gemeinsame Titel, Actions, Panels, Modes und Statussignale.
   - Core liefert jetzt Layout Schema v2, Panel Engine, resolved Command Registry und einen Execution Hook; `NexusV6ViewShell` nutzt diese Daten fuer Inspector, Commands und Layout-Diagnose.
   - Dashboard und Notes haben sichtbare v6-Refinements inklusive Dashboard-Layout-Editor-Verbesserung.
   - Tasks-Polish umgesetzt: kompaktere Command-/Mode-Leisten, schmalere Stats, ruhigere Board-Spalten, stabilere Karten ohne Klickziel-Verschiebung und klarere Drop-Zonen.
   - Canvas-Polish umgesetzt: Sidebar startet geschlossen fuer mehr Flaeche, Toolbar-Ziele sind ruhiger, Jump Search ist prominenter, Double-click Quick Add trifft nur leere Flaechen, und die Stage erklaert Ctrl+P/[[wiki]]-Flow.
   - Flux-Hardening umgesetzt: Urgent Flow triagiert To-do Tasks nach Doing und oeffnet laufende Tasks zur Review, statt sie automatisch als Done zu markieren.
   - Offen bleibt die tiefere Extraktion gemeinsamer Toolbar-/Inspector-Primitiven fuer Main/Mobile.

2. Main-App-Struktur konsolidieren.

   Ziel:

   - Eine zentrale View Registry.
   - Eine Shell/Host-Komposition.
   - Keine doppelte Navigation in `App.tsx`, `mainViewHost.tsx` und `mainAppConfig.ts`.

   Status 2026-05-06:

   - `App.tsx` nutzt die zentrale Shell/Host-Komposition und enthaelt keinen zweiten toten Inline-Shell-Renderblock mehr.
   - Alle Main-View-Instanzen laufen durch `NexusV6ViewShell`; Quick Navigation prewarmt Ziel-Views ueber die bestehende Preload-Pipeline.
   - Boot- und Preload-Konstanten sind in `mainAppConfig.ts` gebuendelt.
   - `mainViewRegistry.ts` zentralisiert Core-Manifest-Metadaten, Icons, Main/Footer/Developer-Gruppen, Preload-Prioritaeten, Heavy-Views und persistente View-Caches.
   - Sidebar, `viewPreload.tsx` und `mainAppConfig.ts` nutzen diese Registry; Toolbar/Command Palette und Mobile sollen als naechstes folgen.

3. Encoding und Copy bereinigen.

   Ziel:

   - Alle deutschen Umlaute, Symbole und Markdown-Seeds sind UTF-8-korrekt.
   - Keine sichtbaren UTF-8-Mojibake-Artefakte in UI-Texten oder Dokumentation.
   - Ein kleiner Test sucht nach typischen Mojibake-Sequenzen.

   Status 2026-05-06:

   - `tools/verify-encoding.mjs` und `npm run verify:encoding` sind angelegt.
   - Der Check scannt Source- und Docs-Pfade und besteht aktuell.

4. View-Smoke-Matrix bauen.

   Pro View:

   - Oeffnen
   - Create
   - Edit
   - Delete/Archive
   - Persistenz nach Reload
   - Offline/API-Fallback
   - Mobile Layout
   - Keyboard oder Touch-Hauptflow

5. API Contract und Attack Tests in CI.

   Ziel:

   - Node und Rust Control Plane bleiben verhaltensgleich.
   - Unsichere Origins, unsignierte Mutations und schwache Keys werden blockiert.

   Status 2026-05-10:

   - NexusAPI-Commit `0428020` erweitert `.github/workflows/control-plane-contract.yml` zum `Control Plane Release Gate`.
   - Der Gate-Job laeuft auf Ubuntu mit Node 22 und Rust stable.
   - Enthalten sind `verify:release-data`, `build:node`, `cargo fmt --check`, `npm run build`, `test:attack` und `test:contract`.
   - Lokale Evidence: `test:attack` besteht mit 23/23 Checks.
   - Offen: GitHub-Run fuer `0428020` bzw. naechsten Release-Candidate als Evidence speichern und Hosted/Staging-Contractlauf dokumentieren.

6. ~~Electron Security fuer Nexus Code angleichen.~~

   Ziel:

   - Context Isolation, Sandbox und Navigation bleiben hart.
   - Filesystem-Mutationen laufen nur innerhalb erlaubter Roots.
   - Terminal-Ausfuehrung bleibt begrenzt und auditierbar.

   Status 2026-05-10:

   - `Nexus Code/electron/main.cjs` registriert Workspace Roots nur ueber `dialog:open-folder`.
   - Datei-IPC (`read-directory`, `read-file`, `write-file`, `mkdir`, `delete`, `rename`) prueft Canonical Paths gegen diese Roots und schuetzt Workspace-Metadaten.
   - Terminal-IPC validiert Session-IDs, begrenzt parallele Sessions, startet nur in Workspace-CWDs und blockt Netzwerk-/Systemmutationen sowie offensichtlich destruktive Befehle.
   - `preload.cjs` normalisiert Pfade, Textgroessen und Terminal-Channels, bevor Payloads den Main Process erreichen.
   - `verify:ecosystem` enthaelt statische Checks fuer WebPreferences, Workspace-FS-Sandbox, Terminal-Sandbox, Navigation Guards und Preload-Validation.

7. Signing und Notarization.

   Ziel:

   - Windows Signierung definiert.
   - macOS `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` gesetzt.
   - `xcrun notarytool` im macOS Build Runner vorhanden.
   - Android Signing/Keystore dokumentiert.

   Status 2026-05-10:

   - Main/Code macOS Package-Konfiguration nutzt jetzt `hardenedRuntime: true` plus `build/entitlements.mac.plist`.
   - `tools/electron-pack-mac.mjs` kann bei `NEXUS_MAC_NOTARIZE=true` DMGs mit `xcrun notarytool submit --wait` notarizen und danach staplen.
   - `tools/verify-signing-env.mjs` prueft macOS-, Windows- und Android-Signing-Secrets; `npm run verify:signing` ist optional/warnend, `npm run verify:signing:required` failt hart.
   - `.github/workflows/build-installers.yml` hat `signing_required`/`notarize_macos` Inputs, prueft Secrets vor dem Build und erzeugt `SHA256SUMS.txt`.
   - Doku: `docs/SIGNING_AND_NOTARIZATION.md`.
   - Offen: Secrets wirklich in GitHub setzen und einen signierten/notarisierten Runner als Evidence speichern.

8. Control UI Deployment klaeren.

   `verify:ecosystem` erwartet offenbar einen lokalen privaten Control-Workspace. Fuer Release braucht es eine dokumentierte Entscheidung:

   - Ist Control UI Teil dieses Releases?
   - Liegt es in `NexusAPI`, in einem privaten Workspace oder wird es separat versioniert?
   - Welcher Build ist der offizielle?

## P2 Produktpolitur und Ideen

1. ~~Release Health Dashboard.~~

   Erledigt: Nexus Main DevTools hat einen Release-Health-Tab mit API/Base-Status, View-Smoke-Checkliste, Packaging/Signing-Gates, Runtime-View-Map, Report-Copy und JSON-Export. `verify:ecosystem` prueft Dashboard und Tab statisch mit.

2. ~~Gefuehrtes Onboarding.~~

   Erledigt: `WelcomeWalkthrough` fuehrt neue Nutzer nicht nur textlich durch Nexus, sondern gibt ihnen eine lokal gespeicherte Start-Checkliste mit direkten Aktionen in Website/Views.

   Enthalten:

   - Website-Account erstellen oder pruefen
   - App-Login und Remember-Me bewusst setzen
   - Workspace-Ordner festlegen
   - Vorhandene Daten optional importieren
   - Erste Projekt-Note schreiben
   - Task/Reminder initialisieren
   - Canvas-Hub erstellen
   - InfoView als Handbuch oeffnen

3. ~~Diagnose-Export fuer Support.~~

   Erledigt: DevTools Release Health erzeugt ein redigiertes Support-Diagnostics-Bundle und eine kopierbare Issue-Vorlage. Es exportiert keine Secrets, keine Note-Inhalte, keine Dateipfade und keine LocalStorage-Werte.

   Enthalten sind:

   - App Version
   - Runtime-/Renderer-Status als grobe Buckets
   - Release Health Score und offene Checks
   - Runtime View Map
   - Gate-Kommandos fuer Reproduktion

4. Staging/Canary Channel.

   Client-Grundstein erledigt: `resolveMainRuntimeChannelConfig` trennt Stable, Canary und Dev, blockt lokale Overrides ausserhalb von Dev/Admin-Kontext, markiert Canary als signed-manifest-pflichtig und gibt Channel/API im Bootflow sowie Release Health sichtbar aus.

   - Stable: nur canonical production API.
   - Canary: explizite Staging API per signiertem Manifest.
   - Dev: local API erlaubt, aber sichtbar markiert.
   - Offen fuer Public RC: Signaturpruefung des Canary-Manifests server-/control-seitig hart erzwingen und als Evidence dokumentieren.

5. ~~Template Packs.~~

   Erledigt: Nexus Main hat jetzt einen zentralen Template-Pack-Katalog fuer Notes, Task Boards, Canvas Layouts, Code Snippets und Flux Workflows. Die InfoView zeigt die Packs nach Kategorie, beschreibt Ziel-View/Tier/Best-Use und kopiert jeden Pack als Markdown-Starter in die Zwischenablage.

   - Notes Templates
   - Task Boards
   - Canvas Layouts
   - Code Snippets
   - Flux Workflows

6. ~~Backup und Restore.~~

   Erledigt: Settings > Workspace hat jetzt ein Backup/Restore Center mit versionierten lokalen IndexedDB-Backups, JSON Export/Import, Import Preview, Konfliktliste und automatischem Safety-Backup direkt vor jedem Restore.

   - Crash-sicherer Workspace Snapshot.
   - Versionierte lokale Backups.
   - Import Preview mit Konfliktliste.

7. ~~Control Feature-Flag Editor.~~

   Erledigt: DevTools hat jetzt einen Feature-Flags-Tab mit lokalem Catalog-Draft, Feature Toggle/Edit, Layout-Schema-JSON-Guard, stufenweisem Rollout-Plan, Report Export/Copy, Import/Reset und Audit Trail. `verify:ecosystem` prueft Core-Logik und DevTools-UI statisch mit. Hinweis: Das ist bewusst eine lokale Admin-/Release-Vorbereitung; Production-Schreibzugriffe muessen weiter ueber Hosted Control Plane mit Admin-Auth, Server-Audit und Rollback-Token laufen.

   - Feature Catalog editieren
   - Layout Schema validieren
   - Release Rollout stufenweise promoten
   - Audit Log sichtbar machen

8. ~~Notes Editor QoL und Markdown Details.~~

   Erledigt: Notes schuetzt normale Enter-/Zeilenumbruch-Eingaben gegen globale QuickSwitch-Handler, Toolbar-/Blocks-/Emoji-Buttons behalten die Textarea-Selection, Details/Toggle erzeugt `nexus-details` statt rohem HTML, Notes und Canvas rendern den Block sauber und interaktive Buttons defaulten appweit auf `type=button`.

   - Zeilenumbrueche im Editor stabil
   - Markdown-only Details statt HTML-Snippet
   - Selection-safe Toolbar Inserts
   - Appweite Button-Submit-Fallen reduziert

## Empfohlener Fertigstellungsablauf

### Phase 1: Build-Basis stabilisieren

Ziel: Alle Apps bauen lokal reproduzierbar.

Schritte:

1. ~~TypeScript-6-Blocker in Main/Mobile beheben.~~
2. ~~CSS Side-Effect Declaration ergaenzen.~~
3. ~~Tailwind-4-PostCSS in Code/Code Mobile migrieren.~~
4. ~~Alle vier App-Builds erneut ausfuehren.~~
5. ~~`verify:ecosystem` danach erneut laufen lassen.~~

Status 2026-05-06: Phase 1 ist erledigt. Main, Mobile, Code und Code Mobile bauen; `verify:single-react` und `verify:ecosystem` bestehen.

Exit-Kriterium:

- Main, Mobile, Code und Code Mobile bauen ohne Fehler.
- Keine neuen Ecosystem-Verify-Fails.

### Phase 2: API und Daten release-sauber machen

Ziel: Keine Dev-Secrets oder lokalen Daten im Releasepfad.

Schritte:

1. Ingest Keys aus Repo-Daten entfernen.
2. Dev-User Seeds aus Production-Daten entfernen.
3. Production Env erzwingen.
4. Contract- und Attack-Tests laufen lassen. Status: CI-Gate ist in NexusAPI `0428020` angelegt; lokaler Attack-Smoke besteht; finaler GitHub-/Hosted-Run offen.
5. Hosted API Health und Bootstrap pruefen.

Exit-Kriterium:

- API Contract Tests bestehen im GitHub/VPS-Runner.
- Attack Smoke besteht lokal und im GitHub/VPS-Runner.
- Production Runbook passt zu realer Config.

### Phase 3: View-RC pruefen

Ziel: Jede Hauptview hat einen bestandenen Nutzerflow.

Schritte:

1. Desktop Main in Dev/Preview starten.
2. Mobile Preview starten.
3. Pro View die Smoke-Matrix abarbeiten.
4. Persistenz und Reload testen.
5. Mobile Layout und Touch-Flows testen.
6. Fehler und Luecken als Issues oder Checklist Items erfassen.

Exit-Kriterium:

- Jede View hat mindestens einen dokumentierten Happy Path.
- Kritische Destructive Flows sind bestaetigt.
- Keine leeren oder toten Primaeraktionen.

### Phase 4: Website und Wiki finalisieren

Ziel: Public Story und Dokumentation sind konsistent mit dem Produktstand.

Schritte:

1. Website Integrationstest reparieren.
2. Website Browser-Smoke laufen lassen.
3. ~~Wiki Known Issues und Release Checklist verlinken.~~ Erledigt: neue Wiki-Entries fuer Checklist, Known Issues und Completion Plan.
4. ~~Screenshots oder kurze visuelle Belege ergaenzen.~~ Erledigt: Visual Evidence Guide definiert Pflichtbelege fuer Main, Mobile, Code, Code Mobile, Control, Website und Wiki.
5. Build CI fuer beide erneut ausfuehren.

Exit-Kriterium:

- Website `build:ci` und API Integration bestehen.
- Wiki `build:ci` besteht.
- Public Texte versprechen nur, was App/API aktuell leisten.

### Phase 5: Packaging und Release Candidate

Ziel: Installierbare Artefakte und klare Release Notes.

Schritte:

1. Versionen synchronisieren.
2. Release Channel setzen.
3. Windows/macOS/Android Signing vorbereiten.
4. Installer/Packages bauen. Status: Main/Code Targets und CI-Matrix sind fuer Windows, macOS und Linux AppImage/deb konfiguriert; reale Artefakt-Builds muessen vor RC auf den jeweiligen Runnern durchlaufen.
5. Fresh-install Smoke auf sauberem System.
6. Upgrade Smoke von vorherigem lokalen Build.
7. Release Notes schreiben:

   - Neue Features
   - Bekannte Einschraenkungen
   - Systemanforderungen
   - Datenschutz/Security-Hinweise
   - Rollback-Hinweise

Exit-Kriterium:

- Artefakte installierbar.
- App startet ohne Dev-Server.
- Login/API-Fallback verhaelt sich kontrolliert.
- Keine Secrets im Bundle.
- Release Notes und Wiki passen.

## Definition of Done fuer Nexus 1.0/RC

Ein Nexus Release Candidate ist fertig, wenn:

- Alle App-Builds bestehen.
- Ecosystem Verify besteht.
- Release Doctor keine harten Failures zeigt und Warnungen bewusst akzeptiert oder behoben sind.
- Website und Wiki CI bestehen.
- API Contract und Attack Tests bestehen.
- Keine Dev-Secrets oder lokalen Keys in release-relevanten Daten liegen.
- Jede Hauptview einen dokumentierten Smoke bestanden hat.
- macOS/Windows/Android Packaging-Entscheidungen dokumentiert sind.
- Public Website und Wiki keine nicht erfuellten Produktversprechen machen.
- Known Issues ehrlich dokumentiert sind.

## Naechste konkrete Arbeitsliste

1. ~~Main/Mobile TypeScript und CSS Build fixen.~~
2. ~~Code/Code Mobile Tailwind 4 Build fixen.~~
3. ~~Website `import.meta.env` Node-Fallback fixen.~~
4. ~~API Daten und Git-Hygiene bereinigen.~~ Erledigt im NexusAPI-Commit `f307229`; `verify:release-data` und Runbook sind aktualisiert.
5. API Contract/Attack Tests laufen lassen. Status: CI-Gate erweitert in NexusAPI `0428020`, Node `test:attack` besteht mit 23/23 Checks; offen bleiben GitHub-Run-Evidence fuer Node-vs-Rust-Contract und Hosted/Staging-Evidence.
6. Gemeinsame View-Shell, Tokens und UI-Komponenten definieren. Status: in Arbeit, Main nutzt jetzt `MainShellLayout`/`MainViewHost`, `NexusV6ViewShell`, reduzierte Status-Bar, v6-Tokens und Core-View-Manifeste; v6-Shell, View-Enhancer, Notes Command-Strip und Nexus Toolbar sind auf mehr Content-Space, transparente Blur/Gradient-Glows, optionalen Inspector, kompaktere Header und stabilere Controls getrimmt.
7. ~~Core um View Manifest v2, Layout Schema v2, Command Registry und Panel Engine erweitern.~~ Erledigt als Core-Grundlage: `packages/nexus-core/src/views.ts` liefert Layout Schema v2, Panel Engine, resolved Command Registry und `executeNexusViewCommand`; Nexus Main nutzt diese Daten in `NexusV6ViewShell`. Offen bleibt die view-spezifische Handler-Anbindung pro Feature.
8. Dashboard, Notes, Tasks und Canvas als erste Views auf die neue Shell migrieren. Status: Basis erledigt, alle Main-Views laufen durch `NexusV6ViewShell`; Dashboard und Notes haben zusaetzlich interne v6-Layout-Refinements erhalten, globale Shell/Sidebar/Toolbar/Status-Bar sind cleaner und ruhiger, Dashboard-Widget-Animationen und vertikales Widget-Swapping sind verbessert; Tasks und Canvas haben jetzt ebenfalls einen sichtbaren v6-Polish-Schnitt mit mehr Content-Flaeche, kleineren Controls, stabileren Klickzielen, Obsidian-naeherem Canvas-Jump-Flow und Flux-Safety-Hardening erhalten. Offen bleibt die gemeinsame Toolbar-/Inspector-Primitive-Extraktion.
9. Main-App-Registry konsolidieren oder tote Host-Dateien entfernen. Status: grosser Teil erledigt, zentrale Host-Dateien werden genutzt, toter Inline-Shell-Code ist entfernt, Boot-/Preload-Konfig liegt in `mainAppConfig.ts`, und `mainViewRegistry.ts` speist Sidebar, ViewPreload, Boot-Prioritaeten, Heavy-View-Liste und persistenten Cache. Offen: Toolbar/Command Palette und Mobile voll auf Registry ziehen.
10. ~~Encoding-Artefakte repo-weit suchen und Gate ergaenzen.~~ Erledigt: `npm run verify:encoding` scannt Source/Docs und besteht aktuell.
11. ~~View-Smoke-Matrix als Markdown oder Testplan ins Wiki uebernehmen.~~ Erledigt: `docs/VIEW_SMOKE_MATRIX.md` plus Wiki-Eintrag `release-view-smoke-matrix`.
12. ~~Release CI Job definieren.~~ Erledigt: `npm run release:gate` plus `.github/workflows/release-gate.yml`.
13. Signing/Notarization/Android Keystore final dokumentieren.
14. ~~Installer-Target-/CI-Matrix fuer Main und Code auf Windows, macOS und Linux AppImage erweitern.~~ Erledigt: `build-installers.yml` enthaelt jetzt Linux-Jobs fuer Main/Code, Uploads fuer `.AppImage`/`.deb`, und `verify:ecosystem` validiert die Packaging-Targets.
15. ~~Notes Guide-Markdowns als v6-Release-Readmes visuell ausbauen.~~ Erledigt: alle Starter-Guides haben neue v6-Release-IDs und mehr Markdown-/Magic-/Emoji-Struktur.
