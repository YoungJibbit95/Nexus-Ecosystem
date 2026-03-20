# NexusAPI (Public Overview)

`@nexus/api` ist die gemeinsame Runtime fuer die Nexus-Apps.

Code-Location: `.nexus-private/NexusAPI/API/nexus-api`

## Zweck

- einheitliche Runtime fuer Main, Mobile, Code und Code Mobile
- gemeinsame Event-/State-Sync-Schicht
- zentrale Performance-Erfassung
- optionaler Control-Plane Connector (nur ueber erlaubte Config)

## Kernmodule

- `NexusConnectionManager`
- `NexusPerformanceManager`
- `NexusControlClient`
- `createNexusRuntime`

## Verwendung in Apps

```ts
import { createNexusRuntime } from '@nexus/api'

const runtime = createNexusRuntime({
  appId: 'main',
  appVersion: '5.0.0',
  control: {
    enabled: true,
    baseUrl: import.meta.env.VITE_NEXUS_CONTROL_URL,
    ingestKey: import.meta.env.VITE_NEXUS_CONTROL_INGEST_KEY,
  },
})

runtime.start()
```

## Security-Rahmen

- keine Remote-Code-Ausfuehrung aus Runtime-Konfiguration
- clientseitige Guards fuer Payload-Groesse und Event-Qualitaet
- serverseitige Authorisierung bleibt im privaten Control-Plane Layer
- mutierende Aktionen sind owner-/signatur-/device-gebunden

## Was dieses Dokument bewusst nicht enthaelt

Dieses Public-Dokument enthaelt **keine** detaillierte interne Route-Liste,
keine sensiblen Mutationsablaeufe und keine operativen Secrets.

Detaillierte API-Operations-Doku bleibt im privaten `NexusAPI`-Repository.
