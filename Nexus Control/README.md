# Nexus Control

Zentrale UI fuer das gesamte Nexus Ecosystem.

## Funktionen

- Login gegen den Nexus Control Plane Service
- Rollenbasiertes UI-Gating (Admin-Bereiche klar getrennt)
- Dashboard mit App Registry und Metrics
- Build-Tab mit `build/manifest.json` Anzeige
- Global/App Config Management
- Command Center mit Idempotency-Key Support
- Security Policy Verwaltung
- Device-Allowlist Verwaltung fuer Admin/Developer Zugriff
- Audit-Log Einsicht
- Integrierte API Guides

## Start (Dev)

```bash
npm --prefix "./Nexus Control" run dev
```

Default URL UI: `http://localhost:5180`

## One-Command Start (Root)

```bash
npm run dev:control:open
```

Dieser Command startet auch den Control Plane Service und oeffnet den Browser automatisch.

## Build

```bash
npm --prefix "./Nexus Control" run build
```

Artefakte: `Nexus Control/dist`

## Voraussetzungen

- Laufender Control Plane Service (Default: `http://localhost:4399`)

## Runtime Config (UI -> Private API)

Die UI laedt beim Start `runtime-config.json` und zeigt einen Handshake-Status im Header.

Felder:

- `controlApiUrl`: Ziel-URL der Control Plane API
- `bootstrapPath`: Public Probe Endpoint (default: `/api/v1/public/bootstrap`)
- `privateRepoHint`: Anzeige-Hinweis auf private API-Quelle
- `forceApiUrl`: sperrt die URL im UI auf den Runtime-Wert

Beispiel:

```json
{
  "controlApiUrl": "https://api.example.com",
  "bootstrapPath": "/api/v1/public/bootstrap",
  "privateRepoHint": "YoungJibbit95/NexusAPI",
  "forceApiUrl": true
}
```

## GitHub Pages Deployment

Workflow: `.github/workflows/deploy-control-pages.yml`

Optional vorher in GitHub Repository Variables setzen:

- `NEXUS_CONTROL_PUBLIC_API_URL` -> oeffentliche HTTPS URL deiner Control Plane

Fehlt die Variable, deployt die UI trotzdem mit lokalem Fallback (`http://127.0.0.1:4399`) und entsperrter API-URL im UI.

Dann:

1. GitHub Pages fuer das Repo aktivieren.
2. Workflow `Deploy Nexus Control (GitHub Pages)` ausfuehren oder auf `main` pushen.
3. Pages-UI oeffnen und Handshake pruefen (`Backend Handshake: ok ...`).

Wichtig:

- Die API bleibt privat verwaltet (Repo `YoungJibbit95/NexusAPI`), nur der Endpoint ist konsumierbar.
- CORS `trustedOrigins` muss deine Pages-Origin enthalten, z. B. `https://youngjibbit95.github.io`.
- Admin/Mutation bleibt durch Owner-Lock, Device-Verifizierung und Signaturpflicht serverseitig geschuetzt.

## API Einstellungen in der UI

- `Control API URL`
- `Ingest Key` (optional, fuer Copy/Paste und operative Dokumentation)
- `Mutation Signing Secret` (nur Session-Speicher, notwendig fuer mutierende API-Aktionen)

## Mobile Support

Die UI ist responsive und auf kleine Displays optimiert (Tabs, Stack-Layout, scrollbare Tabellen).
