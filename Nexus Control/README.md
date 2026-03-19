# Nexus Control

Zentrale UI fuer das gesamte Nexus Ecosystem.

## Funktionen

- Login gegen den Nexus Control Plane Service
- Dashboard mit App Registry und Metrics
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

Dieser Command startet auch den Control Plane Service und öffnet den Browser automatisch.

## Build

```bash
npm --prefix "./Nexus Control" run build
```

Artefakte: `Nexus Control/dist`

## Voraussetzungen

- Laufender Control Plane Service (Default: `http://localhost:4399`)

## API Einstellungen in der UI

- `Control API URL`
- `Ingest Key` (optional, fuer Copy/Paste und operative Dokumentation)

## Mobile Support

Die UI ist responsive und auf kleine Displays optimiert (Tabs, Stack-Layout, scrollbare Tabellen).
