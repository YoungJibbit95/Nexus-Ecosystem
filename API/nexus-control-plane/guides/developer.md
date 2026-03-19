# Nexus Control Plane Developer Guide

## Ziel

Der Control Plane Service ist das zentrale Management-Backend fuer das Nexus Ecosystem.

## Kernbereiche

- Auth und RBAC (`admin`, `developer`, `viewer`, `agent`)
- Config-Management (global + app-spezifisch)
- Policy-Management (Ingest-Regeln, Rate-Limits, Origins)
- Command Queue mit Idempotency-Key-Schutz
- App Registry und Metrics Summary
- Audit-Log fuer sicherheitsrelevante Aktionen

## Schnellstart

```bash
npm --prefix "./API/nexus-control-plane" run dev
```

Default URL: `http://localhost:4399`

## Default Accounts (nur Local Dev)

- `admin / change-me-now`
- `developer / developer-local`
- `viewer / viewer-local`

## API-Flows

1. `POST /auth/login`
2. Bearer Token in `Authorization` Header verwenden
3. Device-ID in Header senden: `X-Nexus-Device-Id`
4. Settings ueber `PUT /api/v1/config/global` und `PUT /api/v1/config/apps/:appId` pflegen
5. Runtime-Events ueber `POST /api/v1/events/batch` ingesten
6. Admin-Geraete ueber `POST /api/v1/devices/approve` freigeben

## Security-Hinweise

- Fuer produktive Umgebungen unbedingt Default-Passwoerter ersetzen.
- `trustedOrigins` auf echte Domains begrenzen.
- `ingestKeys` rotieren und nicht im Klartext in Clients committen.
- Nur verifizierte Device-IDs fuer `admin`/`developer` zulassen.
