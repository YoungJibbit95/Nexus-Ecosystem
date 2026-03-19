# Environment Variables

## App Runtime (optional)

- `VITE_NEXUS_CONTROL_URL`
- `VITE_NEXUS_CONTROL_INGEST_KEY`

Diese Variablen koennen in folgenden Apps gesetzt werden:

- `Nexus Main`
- `Nexus Mobile`
- `Nexus Code`
- `Nexus Code Mobile`

## Control Plane Server

- `NEXUS_CONTROL_PORT` (default `4399`)
- `NEXUS_CONTROL_HOST` (default `127.0.0.1`, externe Hosts werden ignoriert)
- `NEXUS_CONTROL_DATA_DIR` (default `API/nexus-control-plane/data`)
- `NEXUS_CONTROL_GUIDES_DIR` (default `API/nexus-control-plane/guides`)
- `NEXUS_CONTROL_UI_PORT` (default `5180`, fuer Dev-UI Scripts)
- `NEXUS_CONTROL_UI_URL` (optional override, z. B. fuer Browser-Open)
- `NEXUS_CONTROL_NO_OPEN` (`true` => Browser wird nicht auto-geoeffnet)
- `NEXUS_DEV_OPEN_CONTROL` (`false` => `dev:all` oeffnet keine Control-UI URL)

## Nexus Main (Electron Security)

- `NEXUS_ALLOWED_FS_ROOTS` (optional, `path.delimiter` getrennt)
  - steuert, aus welchen Root-Pfaden IPC `fs:read`/`fs:write` zugelassen ist
  - default: Home-Verzeichnis des aktuellen Users

## Hinweise

- Ingest Keys werden ueber Policies verwaltet (`/api/v1/policies`).
- Device-Allowlist wird ueber `/api/v1/devices/*` gepflegt.
- `dev:all` startet den Core-Stack ohne Mobile Native IDEs.
- Mobile Dev-Start erfolgt nativ ueber Capacitor (`npm run dev:mobile:android|ios`, `npm run dev:code-mobile:android|ios`).
- Fuer Production keine Default Credentials nutzen.
