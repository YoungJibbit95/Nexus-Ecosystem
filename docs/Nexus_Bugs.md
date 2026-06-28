# Nexus Bugs und Todo Listen

Stand: 2026-06-27

## Notes Bugs

```nexus-checklist
Notes Emojis Menue soll nicht extenden, sondern als schwebendes Menue ueber der Toolbar erscheinen | true
Magic Menue oeffnet ohne dass offene Emoji-/Block-Menues die Toolbar zerlegen | true
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
API ist komplett broken, Logins funktionieren nicht mehr, irgendwas ist komplett kaputt | false
Control Page zeigt echte aktive Nutzer statt Online Apps im Nutzer-Metric-Slot | true
Website nutzt fuer aktive Nutzer echte Nutzer-Metriken und labelt technische Clients separat | true
```

## Website und API Todo

```nexus-checklist
Maus-Glow Toggle mit Checkbox oben links machen | true
Website-Text ab API/Developer/Account/Pricing konkreter und weniger Beta-lastig halten | true
Screenshots nach Stabilitaetsblock neu capturen | false
VPS Autoupdate Deploy ueber GitHub Actions starten | true
GitHub Deploy-Secrets fuer `srv1513091.hstgr.cloud` setzen und Live-API neu starten | false
```

---

## Nexus Launcher Plan

Der Launcher bleibt ein eigener Meilenstein nach dem Release-Polish-Block. Ziel:
Installer fuer Nexus Desktop-Produkte, Orientierung am Nexus Main Design,
Installation von Nexus Main und Nexus Code je nach Tier, Auto-Update-Option fuer
GitHub Download/Build/Install und klarer Status fuer fehlende Berechtigungen.
