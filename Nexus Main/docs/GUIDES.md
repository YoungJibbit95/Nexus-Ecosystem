# Nexus v6 Guides

Diese Datei ist der kurze Arbeitszettel fuer Nexus Main. Die tiefe, schoenere Doku liegt in der InfoView und im Nexus Wiki; hier steht, wie man im Alltag schnell zurechtkommt.

## Start

- App starten, Login pruefen und den Hosted-API-Bootflow nicht ueberspringen.
- Wenn die App beim Start stoppt, zuerst Session, API-URL und Control-Plane-Status pruefen.
- Fuer Release-Smokes: Dashboard, Notes, Tasks, Canvas, Settings und InfoView einmal oeffnen.

## Dashboard

- Das Dashboard ist die Kommandozentrale: offene Tasks, naechste Reminder, Arbeitskontext und schnelle Einstiege.
- `Layout bearbeiten` aktiviert den Editor fuer Widgets.
- Widgets koennen per Drag and Drop verschoben werden; die Steuerung fuer hoch/runter und Spaltenwechsel bleibt als Backup sichtbar.
- `Reset Layout` stellt ein sauberes Standardlayout wieder her.

## Notes

- Fokus liegt auf Schreiben, Lesen und schneller Struktur.
- Modi: `edit`, `split`, `preview`.
- Magic Blocks in Markdown: `nexus-list`, `nexus-alert`, `nexus-progress`, `nexus-timeline`, `nexus-grid`, `nexus-card`, `nexus-kanban`.
- Blocks- und Emoji-Menues muessen ueber Editor und Panels liegen, damit nichts beim Schreiben verschwindet.
- Die Sidebar sollte nur Orientierung geben, nicht den Editor dominieren.

## Tasks

- Status-Flow: `todo`, `doing`, `done`.
- Tasks sollen direkt lesbar sein, ohne zusaetzliche Innen-Rechtecke oder unruhige Container.
- Prioritaet, Datum, Beschreibung und Subtasks gehoeren in die Details, nicht in ueberladene Karten.

## Reminders

- Filter: `upcoming`, `soon`, `overdue`, `done`, `all`.
- Wichtige Schnellaktionen: `+15m`, `+1h`, erledigen, erledigte ausblenden.
- Toasts sollen freundlich stoeren: klar, kurz und mit Snooze-Option.

## Files

- Workspaces gruppieren Dateien nach Kontext.
- Grid ist gut fuer Uebersicht, List fuer Review und Verwaltung.
- Verknuepfungen zu Notes, Code, Tasks und Reminders halten den Arbeitsfluss zusammen.

## Canvas

- Canvas soll sich naeher an Obsidian anfuehlen: leichtes Platzieren, klare Verbindungen, ruhige Navigation.
- Magic Builder Templates: `mindmap`, `roadmap`, `sprint`, `risk-matrix`, `decision-flow`, `meeting-hub`, `delivery-map`, `project brief`.
- Auto-Layouts: `mindmap`, `timeline`, `board`.
- Doppelklick erzeugt schnell neue Nodes.
- Bewegungen duerfen nie Klickziele wegschieben, waehrend der Nutzer gerade interagiert.

## Flux

- Flux ist fuer Verbindungen, Flow-Zustaende und Systemuebersicht gedacht.
- Wichtige Knoten und Status muessen auch ohne Erklaertext erfassbar bleiben.
- Animationen sollen Zusammenhaenge zeigen, aber nicht vom Arbeiten ablenken.

## Code

- Monaco Editor mit Multi-Language-Support.
- `Ctrl+Enter` fuehrt JS/TS aus.
- HTML/CSS koennen im Split-/Preview-Modus geprueft werden.
- JSON-Formatierung und Validierung bleiben schnelle Alltagswerkzeuge.

## DevTools

- Visual Builder fuer CSS/Tailwind-Ideen.
- Nuetzliche Gruppen: spacing, color, typography, layout, animation.
- DevTools sind fuer Arbeit am System, nicht fuer normale Nutzerfuehrung.

## Settings

- Theme Library zuerst nutzen, danach Details feinjustieren.
- Wichtige Bereiche: Theme, Panel Background, App Background, Glow, Motion, Layout, Editor, Import/Export.
- Theme-Export nutzt `nexus-theme-v6.json`.
- Import muss schema-geprueft bleiben und geschuetzte Felder nicht ueberschreiben.
- Gute Settings sind ruhig: genug Kontrolle, aber keine Wand aus Schaltern.

## InfoView

- InfoView ist das In-App-Handbuch.
- Jede Main-View braucht einen eigenen Guide-Tab mit Daily Flow, Quality Bar, Release Check und Wiki-Themen.
- Texte sollen menschlich klingen: konkret, handlungsnah und ohne generische Produktfloskeln.

## Terminal + Spotlight

- Terminal oeffnet unten mittig.
- Spotlight: `Shift` zweimal oder `Cmd/Ctrl + K`.
- Nuetzliche Commands: `help`, `views`, `goto <view>`, `search <query>`, `canvas template brief <name>`, `macro start <name>`, `macro stop`, `macro run <name>`, `undo`, `redo`.
