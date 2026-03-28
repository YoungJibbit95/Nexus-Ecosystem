# Nexus Wiki

Interaktive Wiki-Website fuer das Nexus Ecosystem (React + Vite).

## Scripts

- `npm run dev` startet den lokalen Dev-Server auf Port `3000`
- `npm run build` erzeugt den Produktions-Build
- `npm run build:ci` baut und prueft Bundle-Budgets
- `npm run perf:budget` validiert Bundle-Groessen
- `npm run preview` startet die Preview
- `npm run lint` fuehrt `tsc --noEmit` aus

## Fokus

- klare Guide-Navigation nach App + Kategorie
- globale Suche mit Synonymen
- DE/EN Sprachumschaltung fuer komplette UI
- space-themed Produktdesign im Wiki-Layout

## Sicherheit & Performance

- Security-Header/CSP in Vite dev/preview
- CSP/Referrer/Permissions auch im HTML gesetzt
- Code-Splitting via manual chunks
- Bundle-Budget-Check fuer CI

## Relevante Dateien

- `src/pages/WikiPage.tsx`: Navigation, Suche, i18n, Content-Rendering
- `src/data/wikiData.ts`: Wiki-Content/Guides/Matrix
- `src/components/SpaceBackground.tsx`: adaptive Hintergrund-Animation
- `scripts/check-bundle-budget.mjs`: Bundle-Budget-Check
