# Nexus Wiki

Interaktive Referenzdokumentation fuer das Nexus Ecosystem (React + Vite).
Die Wiki ist die tiefe technische Ebene zwischen Repo-README und In-App-InfoView.

## Rolle im Doku-System

- `README.md` (Root): Einstieg + Architekturrahmen
- `InfoView` (Main/Mobile): kompakte In-App-Hilfe
- `Nexus Wiki`: detaillierte technische Referenz und View-Matrix
- `nexusproject.dev`: Produkt-/Story-Kommunikation

## Inhaltsschwerpunkte

- Render Pipeline (Measure/Resolve/Allocate/Commit/Cleanup)
- Motion Engine und Degradation-Strategien
- Surface-/Effect-Klassen
- Diagnostics- und Performance-Prinzipien
- View-Atlas ueber Main/Mobile
- Workspace-, Handoff- und Reminder-Flow-Referenzen

## Wichtige Dateien

- `src/pages/WikiPage.tsx`
- `src/pages/wikiPageData.ts`
- `src/data/wikiEntriesPrimary.ts`
- `src/data/wikiEntriesSecondary.ts`
- `src/data/wikiViewMatrix.ts`

## Scripts

```bash
npm install
npm run dev
npm run build
npm run build:ci
npm run perf:budget
npm run preview
npm run lint
```

## Hinweise

- Inhalte sollen mit `Nexus Main/src/views/InfoView.tsx`, `Nexus Mobile/src/views/InfoView.tsx` und `packages/nexus-core/src/render/*` konsistent bleiben.
- Feature-Claims nur dokumentieren, wenn sie im Code verifiziert sind.
