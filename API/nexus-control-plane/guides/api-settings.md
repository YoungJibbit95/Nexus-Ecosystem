# API Settings Guide

## Ziel

Dieses Dokument erklaert die wichtigsten Einstellungen fuer die Zusammenarbeit zwischen Apps und Control Plane.

## Client-seitige Variablen

- `VITE_NEXUS_CONTROL_URL`: URL des Control Plane Service
- `VITE_NEXUS_CONTROL_INGEST_KEY`: App-spezifischer Ingest-Key
- `X-Nexus-Device-Id`: Header fuer Device-Verification (Control UI / Admin Sessions)

## Server-seitige Variablen

- `NEXUS_CONTROL_PORT`
- `NEXUS_CONTROL_HOST`
- `NEXUS_CONTROL_DATA_DIR`

## Policies

- `trustedOrigins`: CORS Allowlist
- `rateLimitPerMinute`: globale Request-Grenze
- `maxEventsPerBatch`: Schutz gegen uebergrosse Ingest-Payloads
- `allowAnonymousIngest`: nur fuer lokale Tests sinnvoll
- `ingestKeys`: Key pro App-ID

## Betriebsempfehlung

1. `allowAnonymousIngest` deaktiviert lassen
2. `trustedOrigins` auf echte Domains begrenzen
3. Ingest Keys regelmaessig rotieren
4. Device-Allowlist fuer `admin`/`developer` aktiv pflegen (`/api/v1/devices/*`)
5. Audit-Log periodisch pruefen
