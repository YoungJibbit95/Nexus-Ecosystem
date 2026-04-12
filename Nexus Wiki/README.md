# Nexus Wiki

Interaktive Referenzdoku fuer das Nexus Ecosystem (React + Vite).

## Zielbild

Die Wiki-Seite ist die tiefe, technische Referenz zur Produktseite und zur In-App-InfoView.

- Website: Produktstory mit Belegen
- InfoView: kompakte In-App-Handlungsdoku
- Wiki: detaillierte Architektur-, View- und Workflow-Referenz

## Inhaltsschwerpunkte (aktuell)

- Render Pipeline Guide
- Motion Engine Guide
- Surface Classes / Effect Classes
- Render Diagnostics View
- InfoView als Product Brain
- Why Nexus feels native
- Today/Continue Workflow Surface Philosophie
- Workspace Handoff + Reminder Health (mobile)
- Dokumentationslandkarte (README / InfoView / Website / Wiki)

## Navigation und Suche

- klare Bereichsstruktur ueber Sektionen + Filter (App/Kategorie)
- globale Suche mit Synonym-Erweiterung
- Synonyme fuer Render/Motion/Diagnostics/InfoView/Handoff/Today integriert
- Treffer springen direkt in den passenden Guide-Block

## Wichtige Dateien

- `src/pages/WikiPage.tsx`
- `src/pages/wikiPageData.ts`
- `src/data/wikiEntriesPrimary.ts`
- `src/data/wikiEntriesSecondary.ts`
- `src/data/wikiViewMatrix.ts`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run build:ci`
- `npm run perf:budget`
- `npm run preview`
- `npm run lint`

## Performance und Sicherheit

- Bundle-Budget-Checks fuer CI
- code-splitting / lazy loading
- Security Header + CSP in Dev/Preview-Konfiguration
- Suchlogik mit normalisierten Tokens + fuzzy fallback
