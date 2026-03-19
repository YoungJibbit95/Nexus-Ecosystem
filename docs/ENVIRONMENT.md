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
- `NEXUS_CONTROL_DATA_DIR` (default `.nexus-private/NexusAPI/API/nexus-control-plane/data`)
- `NEXUS_CONTROL_GUIDES_DIR` (default `.nexus-private/NexusAPI/API/nexus-control-plane/guides`)
- `NEXUS_CONTROL_UI_PORT` (default `5180`, fuer Dev-UI Scripts)
- `NEXUS_CONTROL_UI_URL` (optional override, z. B. fuer Browser-Open)
- `NEXUS_CONTROL_NO_OPEN` (`true` => Browser wird nicht auto-geoeffnet)
- `NEXUS_DEV_OPEN_CONTROL` (`false` => `dev:all` oeffnet keine Control-UI URL)
- `NEXUS_MUTATION_SIGNING_SECRETS` (CSV, z. B. `youngjibbit:secretA,trusteddev:secretB`)
- `NEXUS_ENFORCE_SECURITY_BASELINE` (default `true`, blockiert Start bei unsicherer Policy-Baseline)
- `NEXUS_BUILD_MANIFEST_PATH` (optional Pfad fuer Build-Manifest Endpoint)
- `NEXUS_PRIVATE_REPO_HINT` (optional Hint fuer Public Bootstrap Endpoint, default `YoungJibbit95/NexusAPI`)
- `NEXUS_CONTROL_PLANE_VERSION` (optional Versionslabel fuer Public Bootstrap Endpoint)

## Control UI Build / GitHub Pages

- `NEXUS_CONTROL_UI_DEFAULT_API_URL` (build-time Ziel-API fuer `runtime-config.json`)
- `NEXUS_CONTROL_UI_BOOTSTRAP_PATH` (build-time Bootstrap Endpoint, default `/api/v1/public/bootstrap`)
- `NEXUS_CONTROL_PRIVATE_REPO_HINT` (build-time Repo-Hinweis im UI)
- `NEXUS_CONTROL_UI_FORCE_API_URL` (`true` sperrt API URL Input im UI auf runtime-config)

## Private API Source (NexusAPI)

- `NEXUS_PRIVATE_API_REQUIRED` (default `true`, Private API ist verpflichtend)
- `NEXUS_PRIVATE_API_REPO` (default `https://github.com/YoungJibbit95/NexusAPI.git`)
- `NEXUS_PRIVATE_API_BRANCH` (default `main`)
- `NEXUS_PRIVATE_API_DIR` (default `.nexus-private/NexusAPI`)

## Nexus Main (Electron Security)

- `NEXUS_ALLOWED_FS_ROOTS` (optional, `path.delimiter` getrennt)
  - steuert, aus welchen Root-Pfaden IPC `fs:read`/`fs:write` zugelassen ist
  - default: Home-Verzeichnis des aktuellen Users

## Hinweise

- Ingest Keys werden ueber Policies verwaltet (`/api/v1/policies`).
- Device-Allowlist wird ueber `/api/v1/devices/*` gepflegt.
- Signierte Mutationen werden ueber `X-Nexus-Signature-*` Header + `NEXUS_MUTATION_SIGNING_SECRETS` validiert.
- `dev:all` startet den Core-Stack ohne Mobile Native IDEs.
- Mobile Dev-Start erfolgt nativ ueber Capacitor (`npm run dev:mobile:android|ios`, `npm run dev:code-mobile:android|ios`).
- Fuer Production keine Default Credentials nutzen.
