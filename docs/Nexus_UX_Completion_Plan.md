# Nexus UX Completion Plan

Stand: 2026-06-27

## Zielbild

Nexus soll sich wie ein ruhiges, professionelles Arbeitswerkzeug anfuehlen:
schnelle Orientierung, wenig Suchaufwand, klare Statusanzeigen, stabile
Layouts und nur dort visuelle Show, wo sie die Arbeit nicht stoert.

## Offene Fragen an dich

1. Soll Nexus Main Desktop bis zum Release klar vor Mobile, Code und Launcher priorisiert werden?
2. Soll DevTools ein sichtbares Nutzer-Feature bleiben oder als Developer-/Admin-Werkzeug staerker gegated werden?
3. Soll der Default-Look eher "Balanced Glass" bleiben oder auf "ruhig, kontrastreich, arbeitsorientiert" wechseln?

Bis du anders entscheidest, arbeite ich mit diesen Annahmen:
Nexus Main Desktop zuerst, DevTools sichtbar aber besser gruppiert, Default-Look
ruhig mit optionalem Showcase-Modus.

## Arbeitsweise

- Bugs aus `docs/Nexus_Bugs.md` werden nicht nur nach Checkbox-Status, sondern im echten UI-Fluss geprueft.
- Keine grossen Datenmodell- oder API-Vertragsaenderungen im UX-Polish-Pass.
- Jede View bekommt zuerst Orientierung, Status, klare Primaeraktionen und stabile Responsive-Regeln.
- Nach jedem Codeblock: `npm run build` im betroffenen Paket oder ein engerer Typecheck, wenn ein Build zu teuer ist.
- Runtime-Smokes werden getrennt von Build-Erfolg dokumentiert, weil Main/Mobile am hosted Control/API Bootstrap scheitern koennen, wenn Credentials fehlen.

## Prioritaet 1: Main App UX

### Settings

- Settings-Suche fuer Module, damit Nutzer nicht durch alle Kategorien scrollen muessen.
- Zusammenfassung der aktuellen Arbeitsumgebung in der Sidebar: Theme, Dichte, Motion, Renderer.
- Advanced/Experimental klar als Modus-Schalter behandeln und sichtbarer vom normalen Nutzerfluss trennen.
- Presets als Startpunkt staerken, Detailregler darunter gruppieren.
- Reset/Import/Export in Maintenance-Zone halten, nicht mit normalen Design-Controls vermischen.

### Notes

- Status im Editor direkt sichtbar machen: Speicherzustand, Autosave, Modus.
- Format-Toolbar kompakt halten; Tags bleiben in der Statusleiste, nicht in der Format-Leiste.
- Split/Edit/Preview mit klaren Labels und Tooltips versehen.
- Sidebar als Navigation + Filter behandeln, nicht als zweite Toolbar.
- Langfristig: Emoji- und Magic-Daten aus `NotesView.tsx` in kleinere Module verschieben.

### DevTools

- Top-Level-Tabs mit Zweckbeschreibung und aktivem Arbeitsmodus versehen.
- Builder-Toolbar in Gruppen strukturieren: Mode, Viewport, Run/Export, Library.
- Release Health als echte QA-Startseite aufwerten.
- Feature Flags staerker als Produkt-/Release-Entscheidung sichtbar machen, nicht nur als Formular.
- Langfristig: grosse Inline-Controls aus `DevToolsView.tsx` in stabile Panels splitten.

## Prioritaet 2: Product Page, API, Control

- Product Page Texte ab API/Developer/Account/Pricing konkret halten: was ist live, was ist Preview, was braucht Account/API.
- Screenshots nach dem Stabilitaetsblock neu capturen.
- Aktive Nutzer, technische Clients und Sessions dauerhaft getrennt labeln.
- Deploy-/Autoupdate-Status in Control und Docs mit einem klaren Release Gate verbinden.
- GitHub Secrets fuer VPS Deploy bleiben ein externer Schritt, der nicht lokal verifiziert werden kann.

## Prioritaet 3: Wiki und Nutzerhilfe

- Wiki/InfoView als self-help System pflegen: Schnellstart, haeufige Probleme, API/Account/Checkout, Release Notes.
- Screenshots und Texte aus App/Product Page/Wiki synchron halten.
- `Nexus_Bugs.md` nach jedem Polish-Block aktualisieren: erledigt, offen, Folgepaket.

## Erste Umsetzung

- Settings: Modul-Suche und sichtbare Settings-Zusammenfassung.
- Notes: Editor-Status und Modus-Beschriftung direkt im Header.
- DevTools: Tab-Metadaten, aktive Zweckbeschreibung und klarere Header-Struktur.

