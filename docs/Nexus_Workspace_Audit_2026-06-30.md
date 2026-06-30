# Nexus Workspace Audit 2026-06-30

Audit-Modus: ohne Security-Plugin, lokale statische Review plus vorhandene Tests, Contracts, npm Audits und Secret-Heuristiken.

## Scope

Geprueft wurde der Workspace `F:\Coding\Nexus Workspace` mit diesen Repos und Oberflaechen:

| Bereich | Pfad | Rolle |
| --- | --- | --- |
| Nexus Ecosystem | `Nexus-Ecosystem` | Main, Mobile, Code, Code Mobile, Wiki, shared `nexus-core` |
| Nexus API | `NexusAPI` | Control Plane, Schemas, Control UI, Control Desktop |
| Nexus Launcher | `Nexus Launcher` | Avalonia Launcher, Feed, Update, Download-Gating |
| Website | `nexusproject.dev` | Public site, Account Portal, Payments, Download manifest |

Grenzen: kein externer Pentest gegen produktive Hosts, keine Credentials benutzt, keine Fixes angewendet. Die Befunde sind lokal aus Code, Konfiguration und Testausfuehrung abgeleitet.

## Kurzfazit

Der Workspace hat viele gute Sicherheitskontrollen: Control-Plane-Baseline, signierte Mutationen, Device-Gates, Payment-Webhooks mit Signatur/Replayschutz, API-Host-Allowlists, Launcher-Trust-Policy und saubere npm Audits. Kritisch bleiben vor allem lokale Electron-Bridges und Ingest/Payment-Contract-Kanten.

Priorisierte Befunde:

| ID | Schwere | Bereich | Kurzbeschreibung |
| --- | --- | --- | --- |
| F-01 | Hoch | Nexus Main | Renderer kann Codeausfuehrung im Main-Prozess anstossen; Child-Prozesse erben `process.env` und laufen aus dem Home-Verzeichnis. |
| F-02 | Hoch/Mittel | Nexus Code | Terminal-Bridge erlaubt beliebige Shell-Commands in Workspace-CWD mit voller Umgebung; Blocklist ist keine robuste Sandbox. |
| F-03 | Mittel/Hoch | Ingest/API | `VITE_NEXUS_CONTROL_INGEST_KEY` ist clientseitig sichtbar; Batch-App wird autorisiert, aber einzelne Events koennen fremde `event.source` setzen. |
| F-04 | Mittel/Hoch | Payments | `paid`-Plaene duerfen `0` Cent haben; `0`-Cent-Checkout wird sofort `completed` und kann Entitlement setzen. |
| F-05 | Mittel | Control Plane | Rate Limits ignorieren `X-Forwarded-For`, obwohl Nginx es setzt; hinter Proxy teilen Clients denselben Key. |
| F-06 | Mittel | Control Plane Auth | Owner-Login auto-approvt neue Devices und schwaecht damit die Device-Pruefung fuer den wichtigsten Account. |
| F-07 | Niedrig/Mittel | Control Desktop | `verify:ecosystem` ist 80/82, wegen Pack-Script-Contract und Preload-IPC-Oberflaeche. |
| F-08 | Niedrig/Mittel | Nexus Main | Electron Security Header Hook ist absichtlich No-Op; sichere WebPreferences sind vorhanden, aber Defense-in-depth fehlt. |
| F-09 | Niedrig/Mittel | Shared Code Runtime | `new Function` wird fuer Code-Simulationen im Client genutzt. |
| F-10 | Niedrig/Mittel | CORS Config | CORS unterstuetzt credentialed Wildcard-Subdomains, falls Policies so konfiguriert werden. |

## Findings

### F-01: Nexus Main IPC-Codeausfuehrung mit voller Host-Umgebung

Schwere: Hoch

Evidenz:
- `Nexus Main/electron/ipc-handlers.cjs:341` registriert `ipcMain.handle('code:execute', ...)`.
- `Nexus Main/electron/ipc-handlers.cjs:342-380` nimmt `lang`, `code`, `fileName`, schreibt Code in ein Temp-Verzeichnis und waehlt Runtime-Attempts.
- `Nexus Main/electron/ipc-handlers.cjs:142-145` startet Prozesse mit `cwd: os.homedir()` und `env: { ...process.env, FORCE_COLOR: '0' }`.

Impact:
- Das ist eine sehr starke lokale Codeausfuehrungsbruecke. Wenn Renderer-Code kompromittiert wird, ein unsicherer Markdown-/Snippet-Pfad entsteht oder ein Nutzer fremden Code ausfuehrt, kann der Prozess Umgebungsvariablen, lokale Dateien und Netzwerkzugriff des Benutzers nutzen.
- `cwd: os.homedir()` vergroessert den Zugriffskontext unnoetig. Das vollstaendige Vererben von `process.env` kann Tokens/Secrets aus lokalen Sessions weiterreichen.

Vorhandene Kontrollen:
- Main Window nutzt `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`, `sandbox: true`, `webviewTag: false` in `Nexus Main/electron/main-window.cjs:41-50`.
- Navigation und Popups werden begrenzt in `Nexus Main/electron/main-window.cjs:127-138`.

Empfehlung:
- Feature standardmaessig deaktivieren oder mit explizitem Consent/Gate pro Ausfuehrung versehen.
- Child-Prozesse mit minimaler Env-Allowlist starten, `cwd` auf isoliertes Temp- oder Workspace-Sandbox-Verzeichnis setzen.
- Separate Worker/Sandbox pro Sprache nutzen, harte Timeouts und spaeter CPU/Memory-Limits.
- Keine Shell/Bash-Ausfuehrung ohne zusaetzliche lokale Vertrauensentscheidung.

### F-02: Nexus Code Terminal-Bridge ist eine privilegierte Shell-Oberflaeche

Schwere: Hoch/Mittel

Evidenz:
- Blocklisten fuer Netzwerk-/Systembefehle stehen in `Nexus Code/electron/main.cjs:23-50`.
- `terminal:run` akzeptiert freie Commands in `Nexus Code/electron/main.cjs:888-948`.
- Ausfuehrung erfolgt mit `spawn(..., { cwd: resolvedCwd, env: { ...process.env, FORCE_COLOR: "1" } })` in `Nexus Code/electron/main.cjs:949-953`.
- Datei-IPC ist deutlich besser begrenzt: Workspace-Root-Realpath-Checks in `Nexus Code/electron/main.cjs:105-204`, Dateioperationen mit Root-/Metadata-Schutz in `Nexus Code/electron/main.cjs:606-682`.

Impact:
- Fuer eine IDE ist eine Terminal-Bridge erwartbar. Sicherheitsrelevant wird sie, sobald Renderer-XSS, Extension-Code oder kompromittierte UI-States Zugriff auf `electronAPI` bekommen.
- Blocklists lassen sich erfahrungsgemaess umgehen, und alle Child-Prozesse erben lokale Environment-Secrets.

Empfehlung:
- Terminal-Bridge als "powerful local capability" behandeln: klare Nutzerbestaetigung fuer erstmalige Aktivierung pro Workspace.
- Env scrubben oder Allowlist nutzen.
- Riskante Commands nicht nur per Regex blocken, sondern sensitive Operationen ueber getrennte, bewusst freigegebene Capabilities modellieren.
- Optional: Terminal nur fuer lokale, explizit gewaehlte Workspace-Roots und mit Audit-/Session-Indicator.

### F-03: Client-Ingest-Key ist kein Secret und Events koennen Cross-App-Spoofing erzeugen

Schwere: Mittel/Hoch

Evidenz:
- Lokale App-Configs enthalten `VITE_NEXUS_CONTROL_INGEST_KEY` in `.env.local`; diese Dateien sind per `.gitignore` ignoriert, also kein Commit-Leak, aber `VITE_*` wird in Renderer/Web-Bundles eingebettet.
- Clients senden `X-Nexus-Ingest-Key` in `packages/nexus-core/src/api/control/client/flush.ts:68-79` und `packages/nexus-core/src/api/control/client/view-access.ts:104-110`.
- Server akzeptiert Ingest-Key pro `appId` in `NexusAPI/API/nexus-control-plane/src/server/helpers/ingest.mjs:11-16`.
- Event-Batch-Route autorisiert den Batch in `src/server/routes/auth/ingest-routes.mjs:91-99`.
- Schema validiert `payload.appId` und jedes `event.source`, aber erzwingt keine Gleichheit in `NexusAPI/API/schemas/src/contracts/events.mjs:31-61`.
- Speicherung nutzt `const appId = event.source` in `NexusAPI/API/nexus-control-plane/src/store/app-config-runtime-methods.mjs:159-164`.

Impact:
- Jeder Nutzer mit App-Bundle kann den Ingest-Key extrahieren und Events an die Control Plane senden.
- Mit einem gueltigen Key fuer App A kann ein Angreifer Events mit `event.source = App B` einspeisen und Status/Metriken anderer Apps verfaelschen.
- Es sieht nicht nach Entitlement-Bypass aus: View-Validation ignoriert request-UserTier fuer Access in `ingest-routes.mjs:45-51`. Trotzdem koennen Telemetrie, Health, Metriken und Betriebssicht manipuliert werden.

Empfehlung:
- Ingest-Key nicht als Secret behandeln, sondern als public app identifier mit Rate Limits und begrenzter Wirkung.
- Server muss `event.source` auf `payload.appId` setzen oder Events ablehnen, wenn sie abweichen.
- Fuer sensitive Read-Flows keinen clientseitig sichtbaren Ingest-Key akzeptieren, sondern Session/Auth oder kurzlebige serverseitige Tokens.
- Separate Rate-Limits pro App, Origin, IP und optional Device-ID.

### F-04: `paid`-Plan mit 0 Cent kann sofort Entitlement setzen

Schwere: Mittel/Hoch

Evidenz:
- Amount wird auf `>= 0` normalisiert in `NexusAPI/API/schemas/src/contracts/payments.mjs:65-68`.
- `normalizePaymentPlan` erzwingt fuer `tier: 'paid'` keinen Betrag `> 0` in `payments.mjs:183-203`.
- Checkout-Session wird bei `plan.amountCents > 0 ? 'pending' : 'completed'` gesetzt in `NexusAPI/API/nexus-control-plane/src/store/payments-methods.mjs:521-524`.
- Completed Sessions setzen Entitlements in `payments-methods.mjs:396-407` und werden direkt nach Erstellung angewendet in `payments-methods.mjs:580-582`.
- Public Checkout Route ist anonym erreichbar, wenn Runtime und Config aktiv sind, in `NexusAPI/API/nexus-control-plane/src/server/routes/v2/payments-routes.mjs:245-319`.
- Gute Default-Kontrolle: Payments sind runtime-seitig default aus, siehe `payments-methods.mjs:82-97`.

Impact:
- Bei einer Fehlkonfiguration "public active paid plan amountCents=0" kann ein anonymer Checkout ohne Provider-Zahlung ein Paid-Entitlement setzen.
- Das ist eher ein Config-Integrity-Bug als ein Default-Exploit, aber mit hohem Schaden, wenn Payments live aktiviert werden.

Empfehlung:
- Schema/Admin-Validation: `tier === 'paid'` muss `amountCents > 0` haben.
- Nullpreis nur fuer `tier: 'free'` oder explizite Promo-/Manual-Plan-Typen erlauben.
- Entitlements erst nach verifiziertem Provider-Webhook oder expliziter Admin-Aktion setzen.
- Contract-Test hinzufuegen: paid plan mit 0 Cent wird abgelehnt.

### F-05: Rate-Limit-Key ignoriert Proxy-Client-IP

Schwere: Mittel

Evidenz:
- Control Plane nutzt `const remoteAddress = req.socket.remoteAddress || 'unknown'` in `NexusAPI/API/nexus-control-plane/src/server.mjs:267`.
- Globaler Rate-Key nutzt `${remoteAddress}:${authHash}` in `server.mjs:311-315`.
- Endpoint-Limits nutzen fuer Login/Payments/etc. ebenfalls `remoteAddress` in `server.mjs:323-331`.
- Nginx setzt `X-Forwarded-For` in `deploy/ubuntu/nginx-nexus-api.cloud.conf:48-65` und weiteren Locations `72-90`.

Impact:
- Hinter Nginx sieht die Node-App wahrscheinlich nur `127.0.0.1`. Dadurch koennen viele echte Clients denselben Rate-Limit-Bucket teilen.
- Ein Client kann Login-, Payment- oder Event-Endpunkte fuer andere Nutzer ausbremsen.

Empfehlung:
- Trusted-Proxy-Client-IP-Funktion einfuehren: `X-Forwarded-For` nur auswerten, wenn `req.socket.remoteAddress` ein vertrauenswuerdiger Loopback/Proxy ist.
- Rate-Limit-Key fuer Auth ggf. aus Client-IP + normalized identifier + device label bilden.
- Tests fuer direkte Node-Nutzung und Nginx-Proxy-Simulation hinzufuegen.

### F-06: Owner-Device-Auto-Approval untergraebt Device-Gate

Schwere: Mittel

Evidenz:
- Login ermittelt Device-Verifikation in `NexusAPI/API/nexus-control-plane/src/server/routes/auth/login-route.mjs:63-83`.
- Wenn der User Owner ist, wird das Device auto-approved in `login-route.mjs:83-104`.
- Device-Gates sind ansonsten stark: `requireVerifiedDeviceForRoles` und Owner-only Mutations in `src/server/helpers/authz.mjs:47-88`.

Impact:
- Fuer den Owner-Account reicht ein kompromittiertes Passwort plus beliebige Device-ID, um ein neues Admin/Developer-Device zu approven.
- Damit ist Device Verification fuer den wichtigsten Account kein zweiter Faktor, sondern eher ein Komfort-/Audit-Mechanismus.

Empfehlung:
- Auto-Approval nur fuer ersten Bootstrap erlauben, wenn noch kein Admin-Device existiert.
- Danach Owner-Device-Approval nur ueber bereits verifiziertes Device, Recovery-Code oder signierte Out-of-band-Aktion.
- Alarm/Audit bei jedem neuen Owner-Device.

### F-07: Control Desktop Release-Verifier ist nicht gruen

Schwere: Niedrig/Mittel

Evidenz:
- `npm run verify:ecosystem` Ergebnis: `80/82 Checks erfolgreich`.
- Fehlgeschlagen: `control-desktop-pack-scripts` und `control-desktop-preload-no-node-bridges`.
- Verifier erwartet fuer `pack` direkt `npm run build:ui && electron-builder --dir`, siehe `Nexus-Ecosystem/tools/verify-ecosystem.mjs:128-136`.
- Paket delegiert `pack` auf `build`; `build` enthaelt den erwarteten Befehl, siehe `NexusAPI/Nexus Control Desktop/package.json:13-18`.
- Preload exponiert IPC-Methoden in `NexusAPI/Nexus Control Desktop/src/preload.cjs:1-9`.
- IPC gibt Runtime Config/Desktop Info zurueck in `NexusAPI/Nexus Control Desktop/src/main.cjs:119-127`.

Impact:
- Pack-Script wirkt wie Contract-Drift, nicht wie Sicherheitsbug.
- Preload-IPC ist klein und navigationsgeschuetzt, aber der Verifier wollte keine IPC-/Node-Bruecke. `configPath` im Renderer ist unnoetige lokale Pfad-Exposition.

Empfehlung:
- Entweder `pack` exakt an den Contract angleichen oder Verifier bewusst auf Delegation erweitern.
- Preload-Oberflaeche dokumentieren und minimieren: kein `configPath` im Renderer, wenn nicht zwingend noetig.
- Verifier-Kriterium auf "keine beliebigen IPC/Node-Bridges" praezisieren, falls diese zwei Methoden gewollt sind.

### F-08: Nexus Main Security Headers sind No-Op

Schwere: Niedrig/Mittel

Evidenz:
- `Nexus Main/electron/security.cjs:3-8` ist absichtlich `no-op`.
- Positive Gegenkontrolle: sichere WebPreferences in `Nexus Main/electron/main-window.cjs:41-50`.

Impact:
- Kein direkter Exploit, weil die Electron-WebPreferences gut gesetzt sind.
- Defense-in-depth fehlt: CSP, Permissions-Policy, COOP/CORP-Entscheidungen werden nicht zentral erzwungen.

Empfehlung:
- Fuer lokale/gebundelte Inhalte CSP per Meta-Tag oder Response/Header-Mechanismus definieren.
- Fuer externe Oeffnungen strikt bei `shell.openExternal` bleiben und niemals remote UI im privileged Window laden.

### F-09: Clientseitige `new Function`-Simulatoren

Schwere: Niedrig/Mittel

Evidenz:
- JavaScript-Ausfuehrung ueber `new Function(..., code)` in `Nexus-Ecosystem/packages/nexus-core/src/code/executionEngine.ts:67-96`.
- Python-/Java-Simulation wertet Ausdruecke ebenfalls per `new Function` aus in `executionEngine.ts:184-192` und `207-209`.

Impact:
- Im Browser-/Renderer-Kontext ist das niedriger als Node-Execution, aber gespeicherter oder fremder Code koennte UI-Kontext ausnutzen, wenn der Pfad untrusted Inhalte automatisch ausfuehrt.

Empfehlung:
- Execution nur nach Nutzeraktion.
- In Web Worker/iframe mit enger CSP auslagern.
- Keine gespeicherten Snippets automatisch ausfuehren.

### F-10: Credentialed CORS plus Wildcard-Subdomains als Config-Risiko

Schwere: Niedrig/Mittel

Evidenz:
- Wildcard-Regeln `https://*.domain` werden in `NexusAPI/API/nexus-control-plane/src/server/helpers/cors.mjs:50-72` akzeptiert.
- Wenn erlaubt, werden Credentials gesetzt in `cors.mjs:153-159`.
- Baseline blockt globale Wildcard `*`, aber nicht Subdomain-Wildcards, siehe `src/server/helpers/baseline.mjs:38-44`.

Impact:
- Kein aktiver Fund in den geprueften Defaults.
- Falls ein kompromittierbarer Subdomain-Origin in `trustedOrigins` per Wildcard enthalten ist, kann er credentialed CORS nutzen.

Empfehlung:
- Fuer credentialed API-CORS exakte Origins bevorzugen.
- Subdomain-Wildcards nur fuer nicht-sensitive, nicht-credentialed Endpunkte erlauben.

## Positive Kontrollen und Nicht-Funde

- `npm audit --omit=dev --json`: 0 bekannte Vulnerabilities in allen lockfile-basierten Node-Projekten.
- `npm audit --json`: ebenfalls 0 bekannte Vulnerabilities inkl. Dev-Abhaengigkeiten.
- Secret-Heuristik fand keine hart codierten Live-Tokens der Muster `sk-*`, `sk-proj-*`, `github_pat_*`, `ghp_*`, `AKIA*` oder Private-Key-Blobs.
- `.env.local` mit Ingest-Keys ist ignoriert und nicht versioniert. Architekturhinweis bleibt: `VITE_*` ist clientseitig sichtbar.
- Website-API-Hosts werden gegen Allowlists und Production-Origin-Pattern validiert in `nexusproject.dev/src/lib/apiHostPolicy.ts:100-180`.
- Website speichert Bearer-Session nicht mehr in `localStorage`; alte Werte werden entfernt, siehe `nexusproject.dev/src/lib/systemOverviewApi.ts:655-704`.
- Website-Produktsecurity-Test bestaetigt Storage, Checkout und Download-Manifest.
- Control UI migriert Token/Ingest-Key/Signing-Secret aus altem `localStorage` in `sessionStorage`, siehe `NexusAPI/Nexus Control/src/control/state.js:46-125`.
- `dangerouslySetInnerHTML` im Code SyntaxHighlighter escaped Inhalte vor dem Rendern, siehe `Nexus Code/src/components/editor/SyntaxHighlighter.jsx:45-49` und `103-138`.
- Control UI `innerHTML`-Listen nutzen `escapeHtml`, siehe `NexusAPI/Nexus Control/src/control/helpers/formatting.js:18-23` und `workspace/admin-scripts.js:88-98`.
- Launcher Trust Policy begrenzt API-Roots auf `https://nexus-api.cloud` oder Loopback Dev, siehe `Nexus Launcher/src/Nexus.Launcher.Core/Security/LauncherTrustPolicy.cs:48-70`.
- Launcher Downloads nutzen API-brokered trusted URLs und senden Bearer nur an vertrauenswuerdige URLs, siehe `Nexus Launcher/src/Nexus.Launcher.Api/NexusApiClient.cs:125-144`.
- Launcher Feed-Signatur ist fuer nicht-Dev verpflichtend, siehe `Nexus Launcher/tools/generate-launcher-feed.mjs:95-104`.
- Control-Plane Launcher Download-Gating prueft Session, Token-Zugehoerigkeit und Cache-Existenz fail-closed in `NexusAPI/API/nexus-control-plane/src/server/routes/v2/launcher-routes.mjs:89-143`.

## Ausgefuehrte lokale Pruefungen

| Pruefung | Ergebnis |
| --- | --- |
| `npm audit --omit=dev --json` pro lockfile-basiertem Node-Projekt | 0 critical, 0 high, 0 moderate, 0 low in allen geprueften Projekten |
| `npm audit --json` pro lockfile-basiertem Node-Projekt | 0 critical, 0 high, 0 moderate, 0 low in allen geprueften Projekten |
| Secret-Heuristik ueber Workspace ohne `node_modules`, Build, Caches, Locks | Keine harten Live-Token-Muster; nur Actions-Secret-Refs, lokale ignorierte `.env.local`-Ingest-Keys und Test-/Runtime-Token-Code |
| `NexusAPI/API/nexus-control-plane npm run test:security-regression` | PASS |
| `NexusAPI/API/nexus-control-plane npm run test:launcher` | PASS |
| `NexusAPI/API/nexus-control-plane npm run test:attack` | 23 passed, 0 failed |
| `NexusAPI/API/nexus-control-plane npm run test:contract` | PASS, Node/Rust parity guard und Core Views |
| `nexusproject.dev npm run test:product:security` | PASS |
| `Nexus Launcher npm run test` | PASS, 72 .NET Tests |
| `Nexus-Ecosystem npm run verify:encoding` | OK |
| `Nexus-Ecosystem npm run verify:ecosystem` | FAIL, 80/82 wegen Control Desktop Contract/Preload |

## Empfohlene Fix-Reihenfolge

1. F-01 und F-02: Electron-Codeausfuehrung/Terminal-Bridges env-scrubben, Consent-Gates und Sandbox/Workspace-Beschraenkung verschaerfen.
2. F-03: Ingest serverseitig auf Batch-App pinnen und Ingest-Key als public capability modellieren.
3. F-04: Paid-0-Cent-Plan im Schema/Admin/Contracts verbieten.
4. F-05: Trusted-Proxy-IP-Aufloesung fuer Rate Limits implementieren.
5. F-06: Owner-Device-Auto-Approval nach Bootstrap abschalten oder ueber Recovery/Existing-Device absichern.
6. F-07: Control Desktop Verifier und Preload-Contract klaeren, damit `verify:ecosystem` wieder gruen wird.
7. F-08 bis F-10 als Hardening-Paket: CSP/Header, clientseitige Eval-Sandbox, exact CORS origins.

## Hinweise zu Arbeitsbaum und Artefakten

Vor dem Audit waren bereits lokale Aenderungen in mehreren Repos vorhanden. Dieser Audit hat keine bestehenden Dateien repariert oder revertiert; neu erstellt wurde nur dieser Bericht.
