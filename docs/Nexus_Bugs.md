# Nexus Bugs und Todo Listen

Stand: 2026-06-30

## Notes Bugs

```nexus-checklist
Notes Magic elemente und Text sind auf der View seit eimmer noch nicht editierbar | false
Notes Emojis Menue soll nicht extenden, sondern als schwebendes Menue ueber der Toolbar erscheinen | true
Magic Menue oeffnet ohne dass offene Emoji-/Block-Menues die Toolbar zerlegen | true
Notes Sidebar Tags werden bei vielen Tags hart abgeschnitten und haben keinen Mehr-/Expand-Zustand | false
Notes Unified Bar kann bei mittleren Breiten Formatbuttons, Statuschips oder Titel verdrängen | false
Notes Magic Edit Chip kann in enger Preview Blockinhalt ueberdecken oder zu dominant wirken | false
Unified Bar hat sehr viele Funktionen und Buttons der anderen Bars entfernt müssen wieder integriert werden | false
```

## Notes Todo

```nexus-checklist
Reminders und Tasks Magic Elemente und Verknüpfung hinzufügen | true
Alle Magic Elemente auf der View Seite per Mausklick auch editierbar machen | true
Dokumentation in InfoView einfacher und besser machen aber detailreich lassen | true
Notes Split und Edit View mehr Raum geben damit man den Text besser sehen kann | true
Buttons und Bars uebersichtlicher und einfacher zu verstehen machen | true
Notes Store von Editor-Draft-State trennen | true
Markdown/Emoji/Magic Daten in kleinere Module auslagern | true
Notes Tags aus der Format-Leiste nehmen und in eine kompakte Status-Leiste verschieben | true
Notes Toolbar- und Statusbar-Breakpoints fuer 980px bis 1400px glätten | false
Notes Magic Preview Edit-Modus visuell ruhiger machen, ohne die Klickbarkeit wieder zu verlieren | false
Notes Edit und View Panels resizable width integrieren damit man die sich in der mitte so breit draggen kann wie man will | true
```

---

## Globale Bugs

```nexus-checklist
Global Schriftgroesse clampen, damit der Slider die UI nicht zerlegt | true
Panel Hintergruende fuer Sidebar/App Panels sichtbar verdrahten | true
Sidebar Rail Modus als echte Rail mit stabiler Breite behandeln | true
Panel Radius Slider global ueber Shell/Glass Tokens anwenden | true
Nexus Toolbar zeigt offene und erledigte Tasks an | true
Dashboard Layout Editor beim Draggen per rAF/Position-Layout beruhigen | true
InfoView mit Suche, View-Guides und Referenzen erweitern | true
Light Mode Kontrast fuer Popover, Menues, Inputs und Modals zentral absichern statt pro View nachpatchen | false
Popover und Dropdowns koennen durch lokale Overflow-/Z-Index-Regeln in Panels abgeschnitten werden | false
UI Sprache mischt Deutsch und Englisch in Calendar, Files, InfoView und Website-Passagen | false
Mehrere Views nutzen feste Pane-Breiten, die den Hauptinhalt bei mittleren Breiten quetschen | false
```

## Global Todo

```nexus-checklist
Calender View hinzufügen die mit Notes, Reminders, Tasks, Flux, Code verknüpft ist | true
Leistungsanzeige fuer Glass Optionen in Settings adden | true
Notes UI weniger cramped und nutzerfreundlicher machen | true
DevTools UI weiter verdichten und besser gruppieren | true
App Backgrounds sichtbarer machen, damit Settings-Aenderungen im Shell-Look wirklich ankommen | true
App Backgrounds optional animierbar machen und in Settings steuerbar machen | true
Glass Performance Anzeige mit Kostentreibern und Release-Safe/Balanced Presets ausbauen | true
GitHub UI-Gates fuer Main, Website und API-Deploy-Automation ergaenzen | true
Wiederholte UI-CSS-Passes in index.css konsolidieren, damit spaetere Regeln fruehere Regeln nicht heimlich ueberschreiben | false
Responsive UI-Smoke fuer 1366, 1180, 980, 760 und 460px als feste Release-Pruefung aufnehmen | false
View-spezifische Toolbars auf gleiche Breakpoint-Logik bringen, damit Controls nicht je View anders umbrechen | false
```

## Calendar Bugs

```nexus-checklist
Calender Text ist im White Mode überall weiß statt dunkel | true
Calendar Composer verliert Tags unter 1080px komplett, ohne sichtbaren Ersatz oder Hinweis | true
Calendar Month Cells blenden unter 520px Counts und Items aus, wodurch die Monatsansicht fast leer wirkt | true
Calendar Topbar, Composer und Stats koennen bei langen Labels zu viel Vertikalraum verbrauchen | true
Calendar Import Panel drueckt den Kalender nach unten statt als ruhiger Overlay-/Drawer-Zustand zu wirken | true
```

## Calendar Todo

```nexus-checklist
Calendar CSS in einen eindeutigen Modulblock oder eigene Datei ziehen und doppelte Regeln aus index.css entfernen | false
Calendar Mobile- und Touch-Smoke fuer Drag-Reschedule, Quick Composer und Import nachziehen | false
Calendar Texte und Labels auf eine Sprache und kurze Nutzerbegriffe bringen | true
Calender Days größer und den Content darin übersichtlicher und schöner machen. | true
Obere Bars und Buttons etwas weniger cramped | true
```

## Files Bugs

```nexus-checklist
Workspace Flow Dropdown Button soll ein richtiges Dropdown Menüp sein und nicht die Bar scrollable machen sodas ma nrunter scrollen muss | true
Files Detail Pane und Explorer haben feste Breiten und quetschen den Arbeitsbereich bei mittleren Breiten | false
Files Shortcuts 1-6, R, U, W und G sind nicht sichtbar erklaert und koennen Nutzer ueberraschen | false
Files Workspace Scope ist noch missverstaendlich, weil Nexus-Daten und echter Workspace-Ordner nebeneinander stehen | false
Files Detail Pane nimmt auf kleinen Hoehen bis 270px weg und kann die Dateiliste zu stark verkleinern | false
```

## Flux Todo

```nexus-checklist
Flux UI Cleaner machen und recoden | false
```

## Files Todo

```nexus-checklist
Files Explorer und Detail Pane einklappbar oder resizebar machen, ohne neue Datei-Funktionen einzubauen | false
Files Workspace-Begriffe in UI und InfoView klarer erklaeren: Nexus Items, Workspace, echter Ordner | false
Files Shortcuts nur view-lokal und mit sichtbarer Hilfe/Tooltip behandeln | false
```

## Settings Bugs

```nexus-checklist
Settings wirkt in mehreren Modulen noch zu technisch und textlastig fuer nicht technische Nutzer | false
Settings Header-Chips fuer Advanced, Experimental, Mode, Panel und Motion lesen sich wie Debug-Status statt Nutzerfuehrung | false
Settings Preview- und Reglergruppen erzeugen in Light Mode viel Leerraum und wenig visuelle Prioritaet | false
```

## Settings Todo

```nexus-checklist
Settings Texte sind im Light Mode teilweise zu hell | true
Settings einfache Presets und sichere Hauptregler klarer vor Detailreglern priorisieren | false
Settings technische Labels in nutzernaehere Begriffe umschreiben, ohne Optionen umzubauen | false
Settings Mobile- und Small-Height-Layout fuer grosse Reglergruppen separat pruefen | false
```

---

## Nutzeranmerkungen

### Testperson 1

```nexus-list
- TP 1 sagt es macht Spass mit der App zu arbeiten.
- TP 1 sagt vieles funktioniert einfach.
- TP 1 fand die Website informationstechnisch gut.
- Screenshots sind nicht aktuell und bleiben als eigenes Folgepaket offen.
- Informationen muessen aktuell bleiben und Nutzer muessen sich selbst helfen koennen.
- Dokumentation ist wichtig und muss einfacher verstaendlich sein.
```

---

## Website und API Bugs

```nexus-checklist
Website Login Page: E-Mail bestaetigt zeigt bei Nein keinen gruenen Haken mehr | true
API: Metrics Summary liefert echte aktive Nutzer separat von technischen Clients | true
API ist komplett broken, Logins funktionieren nicht mehr, irgendwas ist komplett kaputt | true
Control Page zeigt echte aktive Nutzer statt Online Apps im Nutzer-Metric-Slot | true
Website nutzt fuer aktive Nutzer echte Nutzer-Metriken und labelt technische Clients separat | true
Website Download Buttons duerfen nur aktiv wirken, wenn Datei, Manifest und Checksum wirklich verfuegbar sind | true
```

## Website und API Todo

```nexus-checklist
Maus-Glow Toggle mit Checkbox oben links machen | true
Website-Text ab API/Developer/Account/Pricing konkreter und weniger Beta-lastig halten | true
Screenshots nach Stabilitaetsblock neu capturen | false
VPS Autoupdate Deploy ueber GitHub Actions starten | true
GitHub Deploy-Secrets fuer `srv1513091.hstgr.cloud` setzen und Live-API neu starten | true
Website Calendar-Text nach Screenshot-Refresh mit echten aktuellen Bildern abgleichen | false
```

---

## Nexus Launcher Plan

Der Launcher bleibt ein eigener Meilenstein nach dem Release-Polish-Block. Ziel:
Installer fuer Nexus Desktop-Produkte, Orientierung am Nexus Main Design,
Installation von Nexus Main und Nexus Code je nach Tier, Auto-Update-Option fuer
GitHub Download/Build/Install und klarer Status fuer fehlende Berechtigungen.
