# Nexus Security Guide

Dieser Guide beschreibt, wie Security im Nexus Ecosystem funktioniert und wie du sie korrekt betreibst.

## 1) Sicherheitsmodell im Runtime-/Control-Stack

### Rollenmodell (Server-seitig erzwungen)

- Rollen: `admin`, `developer`, `viewer`, `agent`
- Rechte werden im Control Plane erzwungen (`requireSession(...)` je Route), nicht nur im UI.
- Beispiel:
  - `admin`: Policies + Device-Approve/Revoke
  - `developer`: Config/Commands (ohne Policy-Admin)
  - `viewer`: read-only

Wichtig: Auch wenn jemand im Browser UI-Elemente manipuliert, blockt der Server unzulaessige Aktionen.

### Device Verification fuer privilegierte Rollen

- Login verlangt `X-Nexus-Device-Id` Header.
- Fuer `admin`/`developer` muss das Device in der Allowlist freigegeben sein.
- Policy-Felder:
  - `requireVerifiedDeviceForRoles`
- `allowFirstAdminDeviceBootstrap`

### Owner-Only API Mutationen

- Policies enthalten:
  - `ownerUsernames`
  - `restrictMutationsToOwner`
- Wenn `restrictMutationsToOwner=true`, duerfen mutierende API-Routen nur von Owner-Usern ausgefuehrt werden.
- Aktueller Owner im Repo: `youngjibbit`.

### Owner-Only Control Panel Zugriff

- Policies enthalten:
  - `ownerOnlyControlPanel`
  - `controlPanelAllowedUsernames`
- Wenn `ownerOnlyControlPanel=true`, werden nicht erlaubte User bereits beim Login abgewiesen (`CONTROL_PANEL_OWNER_ONLY`).
- Default im Repo: nur `youngjibbit`.

Betroffene Mutationen:

- `PUT /api/v1/config/global`
- `PUT /api/v1/config/apps/:appId`
- `PUT /api/v1/policies`
- `POST /api/v1/devices/approve`
- `POST /api/v1/devices/revoke`
- `POST /api/v1/commands`
- `PUT /api/v2/features/catalog`
- `PUT /api/v2/layout/schema`
- `POST /api/v2/releases/promote`

### Kryptografische Signaturpflicht fuer Mutationen

Mutierende Endpunkte erwarten zusaetzlich HMAC-Signaturen:

- `X-Nexus-Signature-Ts` (Unix Sekunden)
- `X-Nexus-Signature-Nonce` (einmalig)
- `X-Nexus-Signature-V1` (HMAC-SHA256)

Serverseitig erzwungen:

- Zeitfenster (`mutationSignatureMaxSkewSec`)
- Replay-Schutz via Nonce-Cache (`mutationSignatureNonceTtlSec`)
- Benutzerbezogene Secret-Allowlist aus `NEXUS_MUTATION_SIGNING_SECRETS`

Ohne gueltige Signatur werden Mutationen geblockt.

Empfehlung:

- `allowFirstAdminDeviceBootstrap: true` nur bei Erstinstallation.
- Danach auf `false` setzen (in diesem Repo bereits so gesetzt).

### CORS / trustedOrigins

- `trustedOrigins` ist eine Allowlist. Die globale Wildcard `*` sollte nicht genutzt werden.
- Erlaubt sind exakte Origins und optional eng gefasste Subdomain-Patterns wie `https://*.example.com`.
- Nur Origins eintragen, die wirklich auf die Control Plane zugreifen.
- Fuer Laufzeit-Overrides ohne Policy-Edit: `NEXUS_EXTRA_TRUSTED_ORIGINS` verwenden.

### Ingest-Sicherheit

- Event Ingest nur mit gueltigem Bearer Token oder passendem `X-Nexus-Ingest-Key`.
- Ingest Keys sind app-spezifisch (`main`, `mobile`, `code`, `code-mobile`).
- API-v2 Read/Capability-Endpunkte koennen ebenfalls mit Ingest-Key (app-gebunden) genutzt werden.

### UI-Schema Sicherheit (Whitelist Renderer)

- Das Layout-Schema erlaubt nur registrierte Komponenten (`componentWhitelist`).
- Unbekannte Component-Typen werden serverseitig bei Validation/Save verworfen.
- Kein Remote-JS / keine dynamische Script-Ausfuehrung aus der API.

### Command-Sicherheit (kein Self-Escalation Pfad)

- Command-Erstellung ist owner-only.
- Commands schreiben nicht in `users.json` oder Rollenfelder.
- Es gibt keinen API-Endpunkt, der per Command Userrechte hochstuft.

### Electron-Haertung (Nexus Main)

- `contextIsolation: true`, `sandbox: true`, `webSecurity: true`
- Navigation und Popup-Open werden gefiltert
- Keine globalen Session-Overrides (`defaultSession`, `webRequest`, `setProxy`)
- IPC Dateizugriffe nur in erlaubten Root-Pfaden (`NEXUS_ALLOWED_FS_ROOTS`) mit Groessenlimits

### Lokale Netzwerkgrenzen

- Interne Server binden ausschliesslich an `127.0.0.1`
- Kein Binding auf `0.0.0.0`
- Port-Konflikte werden vor Start erkannt
- Server reagieren auf `SIGINT`/`SIGTERM` mit sauberem Shutdown

### API-Betrieb fuer Dev/Build

- Root-`build` laeuft standardmaessig API-unabhaengig.
- Lokale API-Integration ist optional ueber `npm run dev:all:with-local-api` und `npm run build:ecosystem:with-local-api`.
- `tools/build-ecosystem.mjs` kann mit `--with-control-plane` explizit einen lokalen API-Guard aktivieren.

## 2) So benutzt du die Security richtig

## First Boot

1. Starte Control Plane + UI: `npm run dev:control:open`
2. Logge dich als `admin` ein (mit Device-ID aus UI).
3. Pruefe `devices` Tab und gib nur vertrauenswuerdige Devices frei.
4. Setze/halte `allowFirstAdminDeviceBootstrap: false` nach Erstfreigabe.

Admin-/Device-Bootstrap und Secret-Rotation laufen ausschliesslich im privaten NexusAPI-Operations-Setup.
Im oeffentlichen Ecosystem-Repo gibt es dafuer absichtlich keine Root-CLI-Kommandos.

Signatur-Secret Beispiel (serverseitige Umgebung):

```bash
export NEXUS_MUTATION_SIGNING_SECRETS="youngjibbit:<secret>"
```

Trusted Devs zulaessen:

```bash
export NEXUS_MUTATION_SIGNING_SECRETS="youngjibbit:<secretA>,trusteddev:<secretB>"
```

## Day-to-Day

1. Fuer Admin/Developer immer mit freigegebenem Device arbeiten.
2. `trustedOrigins` bei neuen UIs/WebViews ergaenzen (nicht wildcards).
3. Ingest Keys regelmaessig rotieren.
4. Audit-Log auf ungewoehnliche Commands/Login-Fehler pruefen.

## 3) GitHub-seitige Trennung (Security vs User-Ebene)

Im Code ist die Trennung serverseitig bereits aktiv. Fuer GitHub musst du zusaetzlich Repository-Regeln aktivieren:

1. Branch Protection fuer `main` aktivieren.
2. Require PR + Required Status Checks aktivieren.
3. CODEOWNERS-Review fuer Security-kritische Pfade erzwingen.
4. Direkte Pushes auf `main` verbieten.
5. Optional: separate Teams fuer App-Feature vs Security-Review.

Empfohlene Betriebsstrategie:

- Open Source Core kann public bleiben.
- Produktive Control-Plane-Deployments, Secrets und Signatur-Keys in private Infrastruktur/Repos auslagern.
- Fuer dieses Setup kann die private Repo `NexusAPI` als Quelle genutzt werden (`npm run api:private:sync`).

Dieses Repo enthaelt dafuer bereits:

- `.github/SECURITY.md`
- `.github/CODEOWNERS`
- `.github/dependabot.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/security-verify.yml`
- `.github/pull_request_template.md`

Hinweis: Die eigentliche Erzwingung passiert in den GitHub Repository Settings (nicht nur durch Dateien im Repo).
