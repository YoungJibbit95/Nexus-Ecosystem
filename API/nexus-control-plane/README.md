# Nexus Control Plane

Zentraler Management-Service fuer das Nexus Ecosystem.

## Features

- Auth + Rollenmodell (`admin`, `developer`, `viewer`, `agent`)
- Config API (global + app-spezifisch)
- Policy API (Rate-Limits, Ingest-Regeln, Origins)
- Command API mit Idempotency-Key-Unterstuetzung
- Event Ingest API fuer App-Runtimes
- Audit-Log und Metrics Summary
- Guide-Endpunkte fuer Dokumentation in der Control UI

## Start

```bash
npm --prefix "./API/nexus-control-plane" run dev
```

Service URL: `http://localhost:4399`

## Wichtige Endpunkte

- `POST /auth/login`
- `GET /api/v1/session`
- `POST /api/v1/events/batch`
- `GET /api/v1/apps`
- `GET|PUT /api/v1/config/global`
- `GET|PUT /api/v1/config/apps/:appId`
- `GET|PUT /api/v1/policies`
- `GET|POST /api/v1/commands`
- `GET /api/v1/audit`
- `GET /api/v1/guides`
- `GET /api/v1/devices`
- `POST /api/v1/devices/approve`
- `POST /api/v1/devices/revoke`

## Sicherheit

- Sliding Window Rate Limiting
- CORS Policy via `trustedOrigins`
- Rollenbasierte API-Berechtigung
- Owner-Only Mutations-Lock (`ownerUsernames` + `restrictMutationsToOwner`)
- Device-Verification fuer privilegierte Rollen (admin/developer)
- Ingest-Schutz via Bearer Token oder `x-nexus-ingest-key`
- Audit-Trail fuer Aenderungen

Hinweis:

- Fuer Login- und Session-Flows im Control UI wird `X-Nexus-Device-Id` verwendet.
- `trustedOrigins` sollte eine echte Allowlist sein (keine `*` Wildcard).
- Lokale Defaults enthalten `localhost`/`127.0.0.1` Ports fuer die Nexus Apps + Control UI sowie `capacitor://localhost`/`ionic://localhost`.
- Mutierende Endpunkte (Config/Policies/Devices/Commands) koennen auf Owner-Accounts begrenzt werden; default Owner: `youngjibbit`.

## Datenablage

Standard-Pfad:

- `API/nexus-control-plane/data/users.json`
- `API/nexus-control-plane/data/global-config.json`
- `API/nexus-control-plane/data/app-config.json`
- `API/nexus-control-plane/data/policies.json`
- `API/nexus-control-plane/data/commands.json`
- `API/nexus-control-plane/data/audit-log.json`
- `API/nexus-control-plane/data/registry.json`
- `API/nexus-control-plane/data/devices.json`

Override per Env:

- `NEXUS_CONTROL_DATA_DIR`
- `NEXUS_CONTROL_PORT`
- `NEXUS_CONTROL_HOST` (nur `127.0.0.1`/`localhost` werden akzeptiert)
