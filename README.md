# Nexus Ecosystem

Zentrales Monorepo für alle Nexus-Varianten.

- GitHub Repository: [Nexus-Ecosystem](https://github.com/YoungJibbit95/Nexus-Ecosystem.git)
- Projektboard: [GitHub Project #2](https://github.com/users/YoungJibbit95/projects/2)

## Ziele

- Eine gemeinsame technische Basis für alle Nexus-Apps
- Konsistentes Design und Verhalten zwischen Desktop und Mobile
- Mobile bleibt responsive, übernimmt aber Main-Standards für UI-Verhalten
- Klare Build- und Entwicklungsabläufe über einen Root-Entry-Point

## Apps im Ecosystem

- `Nexus Main`: Desktop-App (Electron + React)
- `Nexus Mobile`: Mobile App (Capacitor + React)
- `Nexus Code`: Code-Workspace (Desktop)
- `Nexus Code Mobile`: Code-Workspace (Mobile)
- `API`: Service-/Backend-Bereich

## Neue Core-Schicht

`packages/nexus-core` ist die gemeinsame Verbindung zwischen Main und Mobile.

Enthalten sind:

- gemeinsame Runtime-Helfer (Font, Accessibility, Density, Typografie, Safe Areas)
- gemeinsame View-Metadaten (`NEXUS_VIEW_META`)
- Ecosystem-Metadaten und App-Targets

Damit laufen Main und Mobile über dieselben Basisregeln für Design-Runtime, ohne die mobile Layout-Optimierung zu verlieren.

## Neue NexusAPI-Schicht

`packages/nexus-api` verbindet jetzt alle vier Frontend-Apps:

- `Nexus Main`
- `Nexus Mobile`
- `Nexus Code`
- `Nexus Code Mobile`

Die NexusAPI übernimmt:

- app-übergreifendes Connection-Management per Event-Bus (`BroadcastChannel` + `localStorage` Fallback)
- Heartbeats und Peer-Status (`online`/`stale`)
- zentrale State- und Navigation-Sync Events
- globales Performance-Monitoring (View-Render, Paint, Long Tasks, JS Heap Snapshots)

Jede App startet beim Boot eine Runtime via `createNexusRuntime(...)` und reportet Navigation + View-Performance in denselben Bus.

## Global Assets

Gemeinsame Assets liegen im Root unter `assets/global`:

- `assets/global/branding/nexus-brand.tokens.json`
- `assets/global/connection/topology.json`
- `assets/global/performance/budgets.json`

Damit sind Branding, Verbindungsregeln und Performance-Ziele zentral versioniert und für alle Nexus-Varianten nutzbar.

## Wie Main und Mobile verbunden sind

1. Beide Projekte importieren Runtime- und Meta-Logik aus `@nexus/core`
2. Beide Vite-Configs nutzen denselben Alias auf `packages/nexus-core/src`
3. Beide TSConfigs sind mit denselben Path-Aliases verdrahtet
4. Mobile bleibt eigenständig in der Shell (Header, Bottom Nav, Safe Area), übernimmt aber Main-nahe Verhaltensebene

## Performance-Entscheidungen

- keine zusätzliche Runtime-Abhängigkeit für den Core
- nur schlanke Utility-Funktionen im Shared Layer
- Vite `fs.allow` sauber auf Repo-Root gesetzt, um Cross-Package-Imports stabil zu halten
- getrennte Dev-Ports (`Main: 5173`, `Mobile: 5174`, `Code: 5175`, `Code Mobile: 5176`) für parallele Entwicklung

## Development

Vom Repo-Root aus:

```bash
npm run dev:main
npm run dev:mobile
npm run dev:code
npm run dev:code-mobile
```

## Build

Einzeln:

```bash
npm run build:main
npm run build:mobile
npm run build:code
npm run build:code-mobile
```

Alles:

```bash
npm run build
```

Alle Varianten (inkl. Nexus Code / Nexus Code Mobile):

```bash
npm run build:all
```

## Delivery-Workflow (empfohlen)

1. Für jede Änderung ein Issue im Project #2 anlegen
2. Branch aus dem Repo erstellen
3. Änderungen lokal validieren (`build:*`)
4. PR erstellen und mit Projektboard verknüpfen
5. Nach Merge Release-Notes pro App aktualisieren

Weitere Details:

- `docs/NEXUS_API.md`
- `docs/PROJECT_BOARD.md`

## Nächste Ausbau-Stufe

- weitere gemeinsame Domain-Layer (Store-Schemas, View-Registries)
- dedizierte Sync-/Migration-Strategie für plattformübergreifende Daten
- gemeinsame UI-Komponentenbibliothek für Main/Mobile mit Mobile Overrides
