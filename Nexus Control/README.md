# Nexus Control

Zentrale UI fuer das gesamte Nexus Ecosystem.

## Funktionen

- Login gegen den Nexus Control Plane Service
- Rollenbasiertes UI-Gating (Admin-Bereiche klar getrennt)
- Dashboard mit App Registry und Metrics
- Build-Tab mit `build/manifest.json` Anzeige
- Live-Sync Tab (v2): Feature Catalog, Layout Schema, Release Promotion, Capabilities
- Global/App Config Management
- Command Center mit Idempotency-Key Support
- Security Policy Verwaltung
- Device-Allowlist Verwaltung fuer Admin/Developer Zugriff
- Audit-Log Einsicht
- Integrierte API Guides

## Code Struktur (maintainable)

- `src/entry.js`: rendert das modulare UI-Shell-Layout und startet dann die App-Logik
- `src/layout/`: modulare HTML-Sections/Tabs (statt monolithischem `index.html`)
- `src/control/constants.js`: zentrale Konstanten
- `src/control/state.js`: Session/API-State + Persistenz
- `src/control/dom.js`: DOM-Mapping
- `src/control/helpers.js`: Utility-/Parser-/Crypto-Helper
- `src/control/core.js`: API-Client, Handshake, Session- und Tab-Logik
- `src/control/workspace.js`: Daten-Loader/Renderer fuer Tabs
- `src/control/events.js`: Event-Handler und UI-Aktionen
- `src/styles/`: modulare CSS-Schichten (statt monolithischer `styles.css`)

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

- Laufender Control Plane Service (Public Default: `https://nexus-api.dev`, lokal optional `http://127.0.0.1:4399`)

## Runtime Config (UI -> Private API)

Die UI laedt beim Start `runtime-config.json` und zeigt einen Handshake-Status im Header.

Felder:

- `controlApiUrl`: Ziel-URL der Control Plane API
- `bootstrapPath`: Public Probe Endpoint (default: `/api/v1/public/bootstrap`)
- `privateRepoHint`: optionaler Anzeige-Hinweis auf eine private API-Quelle
- `forceApiUrl`: sperrt die URL im UI auf den Runtime-Wert

Beispiel:

```json
{
  "controlApiUrl": "https://api.example.com",
  "bootstrapPath": "/api/v1/public/bootstrap",
  "privateRepoHint": "",
  "forceApiUrl": true
}
```

## Server Deployment (ohne GitHub Pages)

Control UI wird auf dem API-Server gehostet (z. B. `https://nexus-api.dev/control`).

Empfohlen:

1. `npm --prefix "./Nexus Control" run build`
2. `dist/` in den Webroot des API-Servers deployen
3. `runtime-config.json` mit `controlApiUrl=https://nexus-api.dev` ausliefern
4. UI-Origin in `trustedOrigins` bzw. `NEXUS_EXTRA_TRUSTED_ORIGINS` erlauben

Wichtig:

- Admin/Mutation bleibt durch Owner-Lock, Device-Verifizierung und Signaturpflicht serverseitig geschuetzt.
- Bei gehosteter UI darf die API URL nie `localhost/127.0.0.1` sein.

Bei Handshake-/Login-Fehlern (`failed to fetch`) pruefe:

- API URL ist korrekt und ueber HTTPS erreichbar.
- Keine Loopback-URL (`localhost`/`127.0.0.1`) auf gehosteter UI.
- API-Origin ist in `trustedOrigins` oder `NEXUS_EXTRA_TRUSTED_ORIGINS` enthalten.

Siehe auch: [`docs/CONTROL_PANEL_HOSTED_SETUP.md`](../docs/CONTROL_PANEL_HOSTED_SETUP.md)

## API Einstellungen in der UI

- `Control API URL`
- `Ingest Key` (optional, fuer Copy/Paste und operative Dokumentation)
- `Mutation Signing Secret` (nur Session-Speicher, notwendig fuer mutierende API-Aktionen)

## Live-Sync Builder (v2)

Im Tab `Live Sync` kannst du:

1. `Catalog + Schema + Release` fuer eine App/Channel laden
2. Schema validieren (`POST /api/v2/layout/validate`)
3. Staging Catalog speichern (`PUT /api/v2/features/catalog?channel=staging`)
4. Staging Schema speichern (`PUT /api/v2/layout/schema?...&channel=staging`)
5. Staging -> Production promoten (`POST /api/v2/releases/promote`)

Hinweis:

- Save/Promote sind Owner/Admin-Mutationen mit Signaturpflicht.
- Read-Operationen sind fuer `viewer` ebenfalls verfuegbar.

## Mobile Support

Die UI ist responsive und auf kleine Displays optimiert (Tabs, Stack-Layout, scrollbare Tabellen).
