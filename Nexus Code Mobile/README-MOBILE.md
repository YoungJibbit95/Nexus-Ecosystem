# Nexus Code — Mobile (Android & iOS)

Code-Editor App auf Basis von **React + Vite + Capacitor 7**.  
Selbes Design, selbe Funktionen wie die Desktop-Version — läuft nativ auf Android & iOS.

---

## Schritt-für-Schritt: Android Studio

### Voraussetzungen

| Tool | Version | Download |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| Android Studio | Ladybug+ | https://developer.android.com/studio |
| JDK | 17 | Im Android Studio enthalten |

> **Android Studio muss installiert sein**, bevor du anfängst.  
> Beim ersten Start: *Standard Installation* wählen → alles automatisch.

---

### Setup (Windows)

1. Projekt-Ordner entpacken
2. Doppelklick auf **`SETUP-ANDROID.bat`**
3. Warten (ca. 3–5 Minuten)
4. Android Studio öffnet sich automatisch

---

### Setup (Mac / Linux)

```bash
# Terminal im Projekt-Ordner öffnen, dann:
./SETUP-ANDROID.sh
```

Für iOS (nur Mac):
```bash
./SETUP-ANDROID.sh ios
```

---

### Manuell (falls Script nicht klappt)

```bash
# 1. Dependencies
npm install

# 2. Web-App bauen
npm run build

# 3. Android hinzufügen & synchronisieren
npx cap add android
npx cap sync android

# 4. Android Studio öffnen
npx cap open android
```

---

## In Android Studio: App starten

Nach dem Öffnen in Android Studio:

```
Schritt 1: Gradle Sync abwarten
          → Unten siehst du "Gradle: sync..." — warten bis "BUILD SUCCESSFUL"
          → Dauert beim ersten Mal 2–5 Minuten (lädt Abhängigkeiten)

Schritt 2: Gerät auswählen (oben in der Toolbar)
          → Echtes Gerät: USB-Debugging am Handy aktivieren
            Einstellungen → Info → 7x auf "Build-Nummer" tippen → Entwickleroptionen → USB-Debugging AN
          → Emulator: "Device Manager" → "+ Create Device" → Pixel 8 → API 34

Schritt 3: Run-Button klicken
          → Grüner ▶ Pfeil oben rechts (oder Shift+F10)
          → App wird gebaut und auf Gerät/Emulator installiert
```

### Gradle Sync Fehler? Das hilft meistens:

```
File → Sync Project with Gradle Files
```
oder
```
Build → Clean Project → dann nochmal Build → Make Project
```

---

## Nach Code-Änderungen: App neu synchronisieren

```bash
npm run sync
```
Dann in Android Studio: **Run ▶**  
(kein neues `cap add` nötig — nur beim ersten Mal)

---

## iOS (nur Mac + Xcode)

```bash
./SETUP-ANDROID.sh ios
# oder manuell:
npx cap add ios && npx cap sync ios && npx cap open ios
```

In Xcode:
1. Links oben App-Target anklicken
2. **Signing & Capabilities** → Team auswählen (Apple ID reicht)
3. Simulator oder iPhone auswählen → **▶ Run**

---

## Projektstruktur

```
Nexus-Code-mobile/
├── src/
│   ├── lib/
│   │   └── nativeFS.js          ← Capacitor Filesystem Bridge
│   ├── pages/
│   │   └── Editor.jsx           ← Haupt-Editor (aktualisiert)
│   └── components/editor/
│       └── TitleBar.jsx         ← Mobile-optimierte TitleBar
├── capacitor.config.ts          ← Capacitor Konfiguration
├── package.json
├── vite.config.js
├── SETUP-ANDROID.bat            ← Windows Setup-Script
└── SETUP-ANDROID.sh             ← Mac/Linux Setup-Script
```

**Nach `npm run setup:android` werden hinzugefügt:**
```
├── android/                     ← Android Studio Projekt
│   ├── app/
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── assets/public/   ← Vite Build landet hier
└── ios/                         ← Xcode Projekt (nach setup:ios)
```

---

## Was sich gegenüber der Electron-Version geändert hat

| Bereich | Electron (vorher) | Capacitor (jetzt) |
|---|---|---|
| Framework | Electron | Capacitor 7 |
| Dateisystem | `window.electronAPI.readFile()` | `@capacitor/filesystem` |
| Ordner öffnen | Native Dialog | Dialog-Prompt + Documents-Dir |
| Terminal | Echter Shell-Spawn | Simuliertes Terminal |
| Router | BrowserRouter | HashRouter |
| Fenster-Controls | macOS Traffic Lights | Mobile Menübar |
| Status Bar | Electron Frame | `@capacitor/status-bar` |

