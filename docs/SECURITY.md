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

Empfehlung:

- `allowFirstAdminDeviceBootstrap: true` nur bei Erstinstallation.
- Danach auf `false` setzen (in diesem Repo bereits so gesetzt).

### CORS / trustedOrigins

- `trustedOrigins` ist eine Allowlist, keine Wildcard.
- Nur Origins eintragen, die wirklich auf die Control Plane zugreifen.
- Keine `*` in produktiven oder sensiblen Setups.

### Ingest-Sicherheit

- Event Ingest nur mit gueltigem Bearer Token oder passendem `X-Nexus-Ingest-Key`.
- Ingest Keys sind app-spezifisch (`main`, `mobile`, `code`, `code-mobile`).

### Electron-Haertung (Nexus Main)

- `contextIsolation: true`, `sandbox: true`, `webSecurity: true`
- Navigation und Popup-Open werden gefiltert
- Strengere Security Header/CSP
- IPC Dateizugriffe nur in erlaubten Root-Pfaden (`NEXUS_ALLOWED_FS_ROOTS`) mit Groessenlimits

## 2) So benutzt du die Security richtig

## First Boot

1. Starte Control Plane + UI: `npm run dev:control:open`
2. Logge dich als `admin` ein (mit Device-ID aus UI).
3. Pruefe `devices` Tab und gib nur vertrauenswuerdige Devices frei.
4. Setze/halte `allowFirstAdminDeviceBootstrap: false` nach Erstfreigabe.

Alternative (CLI Bootstrap):

```bash
npm run security:make-admin -- --username <name> --password <passwort> --device-id <deviceId>
```

Damit wird der User als `admin` gesetzt/erstellt und das Device fuer `admin,developer` freigegeben.

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

Dieses Repo enthaelt dafuer bereits:

- `.github/CODEOWNERS`
- `.github/workflows/security-verify.yml`
- `.github/pull_request_template.md`

Hinweis: Die eigentliche Erzwingung passiert in den GitHub Repository Settings (nicht nur durch Dateien im Repo).
