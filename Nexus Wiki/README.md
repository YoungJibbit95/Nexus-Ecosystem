# Nexus Wiki

Interaktive Referenzdokumentation fuer das Nexus Ecosystem (React + Vite).
Die Wiki ist die tiefe technische Ebene zwischen Repo-README, In-App-InfoView und Produktwebsite.

Aktueller Stand: `Nexus Wiki Layout v5` mit Atlas-/Roadmap-Navigation, sticky Suche, App-/Kategorie-Filtern,
Markdown-Lab, View-Matrix und UI-Engine-Referenzen.

## Rolle im Doku-System

- `README.md` (Root): Einstieg + Architekturrahmen
- `InfoView` (Main/Mobile): kompakte In-App-Hilfe
- `Nexus Wiki`: detaillierte technische Referenz und View-Matrix
- `nexusproject.dev`: Produkt-/Story-Kommunikation

## Inhaltsschwerpunkte

- Getting Started, App-Rollen und Release-Gates
- Nexus Main View Guides fuer Dashboard, Notes, Tasks, Reminders, Canvas, Files, Flux, DevTools, Settings und Info
- Mobile-, Code-, Code-Mobile- und Control-Guides mit aktuellen Keybinds
- Markdown Lab fuer Notes + Canvas inklusive `nexus-list`, `nexus-alert`, `nexus-progress`, `nexus-timeline`, `nexus-grid`, `nexus-card`, `nexus-kanban` und Inline Badges
- Render Pipeline (Measure/Resolve/Allocate/Commit/Cleanup)
- Motion Engine und Degradation-Strategien
- Surface-/Effect-Klassen
- Diagnostics- und Performance-Prinzipien
- View-Atlas ueber Main/Mobile/Code/Code Mobile/Control
- Workspace-, Handoff- und Reminder-Flow-Referenzen

## UI/UX Stand

- Sticky globale Suche mit Tippfehler-/Synonym-Suche
- Vollstaendige DE/EN-Umschaltung fuer UI-Texte, Entry-Inhalte, Guide-Schritte, Featurelisten und Markdown-Snippets
- Schnellsuche-Chips fuer zentrale Themen wie `nexus-kanban`, Canvas Magic, Render Diagnostics und Keybinds
- Roadmap-artige Guide-Darstellung pro App
- Groessere offene Content-Surfaces statt kleiner, enger Karten
- Mobile Overflow-Schutz ueber globale `overflow-x` Guards und komprimierte Roadmap-Marker
- `content-visibility: auto` fuer schwere Guide-Karten, damit lange Wiki-Seiten schneller scrollen

## Wichtige Dateien

- `src/pages/WikiPage.tsx`
- `src/pages/wikiPageData.ts`
- `src/data/wikiEntryTranslations.ts`
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
- Keine privaten API-, Payment- oder Infrastrukturdetails in der oeffentlichen Wiki dokumentieren.
