# @nexus/api

Shared Runtime API fuer alle Nexus-Apps.

## Module

- `NexusConnectionManager`
- `NexusPerformanceManager`
- `NexusControlClient`
- `createNexusRuntime(...)`

## Aufgabe

- Cross-App Event-Bus
- Navigation- und State-Sync
- Performance-Metriken + Summary
- Optionales Forwarding in den Nexus Control Plane Service

## Runtime Beispiel

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
runtime.connection.sendNavigation('dashboard')
runtime.performance.trackViewRender('main:dashboard')
```

## Security & Performance Guards

- `maxPayloadBytes` in Connection Manager
- Event-Validation + Event-Age Guard
- Set-basierte Event-Deduplizierung
- Performance Rate-Limit (`maxMetricsPerMinute`)
- Ring Buffer fuer lokale Metriken

## Event-Typen

- `heartbeat`
- `state-sync`
- `navigation`
- `performance-metric`
- `performance-summary`
- `command`
- `config-update`
- `custom`
