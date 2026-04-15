# Developer Guide

## Zielbild

Das Ecosystem ist API-first:

- Features kommen aus `Feature Catalog` (v2)
- Layout kommt aus `UI Schema` (v2)
- Release-Stand kommt aus `Release Snapshot` (v2)
- Apps nutzen den Shared Core (`packages/nexus-core/src/liveSync.ts`) fuer View-Orchestrierung

## Feature-Workflow

1. Feature-Logik in Main/Mobile oder Code/Code-Mobile implementieren.
2. Shared Mapping in `packages/nexus-core/src/liveSync.ts` pflegen (`VIEW_FEATURE_MAP`).
3. Catalog in `staging` aktualisieren (Control UI `Live Sync` Tab).
4. Schema in `staging` aktualisieren/validieren.
5. Parity + Build + Verify ausfuehren.
6. Promotion `staging -> production`.

## Kompatibilitaet

- `minClientVersion` im UI-Schema muss mit App-Version passen.
- `compatMatrix[appId]` definiert zulaessige Versionen.
- Runtime prueft ueber `runtime.resolveCompatibility(...)`.
- Navigation-Contract fuer Mobile:
  - `bottom-nav` = Phone-Standard
  - `tabs` = eigener Tabs-Renderer (kein stilles Fallback)
  - `sidebar` = Tablet/Large-Screen

## Pflicht-Checks vor Promotion

```bash
npm run verify:ecosystem
npm run measure:startup-sync
npm --prefix "./Nexus Main" run build
npm --prefix "./Nexus Mobile" run build
npm --prefix "./Nexus Code" run build
npm --prefix "./Nexus Code Mobile" run build
npm --prefix "../Nexus Control" run build
```

## Security-Regeln

- v2 Mutationen sind Owner-only + signiert.
- Keine Policy-Abschwaechung fuer `ownerOnlyControlPanel` und `restrictMutationsToOwner`.
- Nur Whitelist-Komponenten im Layout-Schema verwenden.

## Offline-Modus (Security-First)

- Bei API-Ausfall gibt es keinen lokalen API-Fallback und keine alternativen Datenquellen.
- Stattdessen wird nur ein strikt begrenzter `free`-Tier-Offline-Modus aktiviert.
- Nicht freigegebene Views bleiben gesperrt (`OFFLINE_FREE_TIER_BLOCKED`), damit kein Premium-Zugriff offline "durchrutscht".
- Sobald die API wieder erreichbar ist, gilt wieder die normale serverseitige View-Validation.

## Relevante Dateien

- `packages/nexus-core/src/liveSync.ts`
- `packages/nexus-core/src/quickCapture.ts`
- `packages/nexus-core/src/todayLayer.ts`
- `Nexus Main/src/App.tsx`
- `Nexus Mobile/src/App.tsx`
- `Nexus Code/src/App.jsx`
- `Nexus Code Mobile/src/App.jsx`
- `../Nexus Control/src/app.js`
- `docs/PARITY_MATRIX.md`
