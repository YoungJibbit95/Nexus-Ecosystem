# User Guide

## Erste Inbetriebnahme

```bash
npm run setup
npm run dev:control:open
```

Danach kannst du Apps starten:

- `npm run dev:main` (Electron)
- `npm run dev:code` (Electron)
- `npm run dev:mobile:android` / `npm run dev:mobile:ios` (Capacitor)
- `npm run dev:code-mobile:android` / `npm run dev:code-mobile:ios` (Capacitor)

## Was passiert bei Updates?

- Apps laden zur Laufzeit Release/Catalog/Layout von der API.
- Mobile und Code-Mobile uebernehmen neue **stable** Features automatisch, wenn kompatibel.
- Bei inkompatibler Version blockt die App unsafe Views und zeigt einen Hinweis.

## Paywalls / View-Zugriff

- View-Zugriff wird serverseitig geprueft.
- Ohne passenden Tier-Zugriff werden Views nicht geoeffnet.
- Ergebnis wird in der App als Hinweis angezeigt.

## Control Panel Nutzung (Owner/Admin)

1. Login mit freigegebenem Device.
2. Tab `Live Sync`:
   - Runtime laden
   - Schema validieren
   - Catalog/Schema in staging speichern
   - Promotion nach production
3. Tab `Paywalls`: Tier-Views und User-Templates pflegen.

## Fallback-Verhalten

- Wenn API kurzfristig nicht erreichbar ist, bleiben letzte gecachte Runtime-Daten aktiv.
- Mutierende Aktionen sind ohne Signatur blockiert.
- Relevante Errors erscheinen im Status-Bereich der Control UI.
