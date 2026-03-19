# @nexus/schemas

Zentrale Contracts und Validierungsfunktionen fuer das Nexus Ecosystem.

## Zweck

- Einheitliche App-IDs, Rollen und Event-Typen
- Validierung fuer Event-Ingest, Commands, Policies und Config-Patches
- Re-Use im Control-Plane-Service und in Verifikations-Checks

## Einstieg

```js
import {
  validateEventBatch,
  validateCommandInput,
  validatePolicyDocument,
  APP_IDS,
} from '@nexus/schemas'
```

## Enthalten

- `APP_IDS`
- `ROLE_IDS`
- `EVENT_TYPES`
- `validateEventBatch(payload)`
- `validateCommandInput(payload)`
- `validatePolicyDocument(payload)`
- `validateConfigPatch(payload)`
- Device-Verification Policy Felder (`requireVerifiedDeviceForRoles`, `allowFirstAdminDeviceBootstrap`)

## Hinweise

- Die Validierung ist absichtlich leichtgewichtig und dependency-frei.
- Fuer hochkritische Production-Umgebungen sollten die Regeln mit formalen JSON-Schemas ergaenzt werden.
