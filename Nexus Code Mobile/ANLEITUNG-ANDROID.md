# Nexus Code — Android Studio Anleitung

## Voraussetzungen (einmalig installieren)

### 1. Node.js 20 LTS
→ https://nodejs.org/en/download
Nach Installation: Terminal öffnen → `node -v` → sollte `v20.x.x` zeigen

### 2. Android Studio
→ https://developer.android.com/studio
- Installer herunterladen & installieren
- Android Studio öffnen → "More Actions" → "SDK Manager"
- Stelle sicher dass "Android 14 (API 34)" installiert ist

---

## App starten (Schritt für Schritt)

### Windows

1. Diesen Ordner öffnen
2. Doppelklick auf `SETUP-ANDROID.bat`
3. Warten bis Android Studio sich öffnet

### Mac / Linux

1. Terminal im Projektordner öffnen
2. `./SETUP-ANDROID.sh` eingeben → Enter
3. Für iOS: `./SETUP-ANDROID.sh ios`

---

## In Android Studio

Sobald Android Studio sich öffnet:

```
┌─────────────────────────────────────────────────────────┐
│  Android Studio                                         │
│                                                         │
│  [1] Unten siehst du den Gradle-Sync Fortschrittsbalken │
│      ████████████░░░░░ Gradle: sync...                  │
│      → Warte bis er fertig ist (~2-5 Min beim 1. Mal)  │
│                                                         │
│  [2] Oben in der Toolbar:                               │
│      ┌──────────┐  ┌──────────────────────┐  ▶         │
│      │  app   ▼ │  │  Pixel 8 Pro (API 34)│  Run       │
│      └──────────┘  └──────────────────────┘            │
│                                                         │
│  [3] Gerät auswählen:                                   │
│      → Emulator: Device Manager > + New > Pixel 8 Pro  │
│      → Echtes Gerät: USB anschließen (s.u.)            │
│                                                         │
│  [4] Grünen ▶ Play-Button klicken → App läuft!         │
└─────────────────────────────────────────────────────────┘
```

---

## Echtes Android-Gerät anschließen

1. **USB-Debugging aktivieren** auf dem Handy:
   - Einstellungen → Über das Telefon
   - "Build-Nummer" **7x tippen** (bis "Sie sind jetzt Entwickler")
   - Einstellungen → Entwickleroptionen → USB-Debugging: **AN**

2. **USB-Kabel anschließen** (Computer ↔ Handy)

3. Auf dem Handy: "USB-Debugging zulassen?" → **Zulassen**

4. In Android Studio erscheint dein Gerät in der Dropdown-Liste

5. ▶ Play-Button → App wird direkt auf dein Handy installiert

---

## Häufige Fehler

| Fehler | Lösung |
|---|---|
| `Gradle sync failed` | File → Invalidate Caches → Restart |
| `SDK not found` | SDK Manager öffnen → Android 14 installieren |
| `JAVA_HOME not set` | Android Studio Settings → Build Tools → JDK location setzen |
| App startet, weißer Screen | `npm run build` erneut ausführen, dann `npx cap sync android` |
| `adb: device not found` | USB-Debugging prüfen, anderen USB-Port probieren |

---

## Änderungen am Code deployen

Wenn du den React-Code änderst:

```bash
# Schnell (nur Web-Assets aktualisieren):
npm run cap:sync

# Dann in Android Studio:
# ▶ Run klicken (oder Shift+F10)
```

---

## iOS (macOS erforderlich)

```bash
./SETUP-ANDROID.sh ios
```

Öffnet Xcode. Dann:
1. Xcode → Signing & Capabilities → Team auswählen
2. Simulator oder Gerät auswählen
3. ▶ Run

