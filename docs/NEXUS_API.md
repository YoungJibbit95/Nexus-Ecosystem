# NexusAPI

`@nexus/api` ist die zentrale Runtime fuer Verbindung und Performance im Nexus Ecosystem.

## Kernmodule

- `NexusConnectionManager`
- `NexusPerformanceManager`
- `createNexusRuntime`

## Event-Typen

- `heartbeat`
- `state-sync`
- `navigation`
- `performance-metric`
- `performance-summary`
- `custom`

## Start in einer App

```ts
import { createNexusRuntime } from '@nexus/api'

const runtime = createNexusRuntime({ appId: 'main', appVersion: '5.0.0' })
runtime.start()

runtime.connection.syncState('main.activeView', 'dashboard')
runtime.performance.trackViewRender('main:dashboard')
```

## Transport

1. `BroadcastChannel` (primaerer Kanal)
2. `localStorage` Event-Fallback

## Ziel

Ein einheitlicher Kommunikations- und Monitoring-Layer fuer Main, Mobile, Code und Code Mobile.
