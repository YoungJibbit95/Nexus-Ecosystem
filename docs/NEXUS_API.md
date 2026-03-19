# NexusAPI

`@nexus/api` ist die zentrale Runtime fuer Verbindung, Performance und optionales Control-Plane Forwarding.

Code-Location: `.nexus-private/NexusAPI/API/nexus-api`

## Kernmodule

- `NexusConnectionManager`
- `NexusPerformanceManager`
- `NexusControlClient`
- `createNexusRuntime`

## Event-Typen

- `heartbeat`
- `state-sync`
- `navigation`
- `performance-metric`
- `performance-summary`
- `command`
- `config-update`
- `custom`

## Start in einer App

```ts
import { createNexusRuntime } from '@nexus/api'

const runtime = createNexusRuntime({
  appId: 'main',
  appVersion: '5.0.0',
  control: {
    enabled: true,
    baseUrl: 'http://localhost:4399',
    ingestKey: 'main-local-dev-key',
  },
})

runtime.start()
runtime.connection.syncState('main.activeView', 'dashboard')
runtime.performance.trackViewRender('main:dashboard')
```

## Transport

1. `BroadcastChannel` (primaerer Kanal)
2. `localStorage` Event-Fallback

## Guard Rails

- Payload-Grenze im Connection-Layer (`maxPayloadBytes`)
- Event-Validation und Event-Age-Filter
- Set-basierte Event-Deduplizierung
- Metrik-Rate-Limit (`maxMetricsPerMinute`, default `120`)
- Ring Buffer fuer lokale Analyse

## Verbindung zur Control Plane

Wenn `control.enabled` aktiv ist, sendet der Runtime-Layer Events in Batches an:

- `POST /api/v1/events/batch`
- `POST /api/v1/views/validate` (View-Zugriff / Paywall-Check)

Typische Vite Env Variablen:

- `VITE_NEXUS_CONTROL_URL`
- `VITE_NEXUS_CONTROL_INGEST_KEY`
- `VITE_NEXUS_USER_ID` (optional, User-Template Mapping)
- `VITE_NEXUS_USERNAME` (optional, User-Template Mapping)
- `VITE_NEXUS_USER_TIER` (`free`/`paid`, optionaler Override)

## View Validation / Paywalls

Apps koennen View-Transitions gegen die Control Plane pruefen:

```ts
const access = await runtime.control.validateViewAccess('dashboard', {
  userTier: 'free',
})

if (!access.allowed) {
  console.warn(access.requiredTier) // z. B. \"paid\"
}
```

Die Regeln kommen aus `policies.paywalls` (Control Plane) und koennen im Nexus Control Panel im Tab `Paywalls` gepflegt werden.

Hinweis:

- Root-`dev`/`build` Commands erzwingen eine aktive Control Plane automatisch via `tools/run-with-control-plane.mjs`.
