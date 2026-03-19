# 🚀 Nexus Code Mobile

> Ein hochmoderner, nativer Code-Editor für **Android & iOS**, entwickelt mit **React, Vite und Capacitor 7**.

Nexus Code Mobile bringt das volle Erlebnis eines Desktop-Code-Editors auf dein Smartphone oder Tablet. Es kombiniert die Geschwindigkeit von Vite mit der Flexibilität von Monaco Editor und der Power von Capacitor, um eine erstklassige Entwicklungsumgebung für unterwegs zu bieten.

---

## ✨ Hauptfunktionen

Nexus Code Mobile ist vollgepackt mit Funktionen, die man normalerweise nur in Desktop-IDEs findet:

*   **💻 Leistungsstarker Editor**: Vollständige Syntax-Hervorhebung und IntelliSense für zahlreiche Sprachen, basierend auf dem Monaco Editor (dem Herzstück von VS Code).
*   **📁 Nativer Dateimanager**: Voller Zugriff auf das lokale Dateisystem deines Geräts (Dokumente-Verzeichnis) über eine robuste Capacitor-Bridge.
*   **🌿 Git-Integration**: Verwalte deine Repositories direkt vom Handy aus. Committen, Pushen und Pullst sind nahtlos integriert.
*   **🐚 Simuliertes Terminal**: Führe grundlegende Befehle in einem integrierten Terminal aus, um deinen Workflow zu optimieren.
*   **🔍 Globale Suche**: Finde und ersetze Text in deinem gesamten Projekt mit blitzschneller Geschwindigkeit.
*   **🧩 Erweiterungssystem**: Passe deinen Editor mit verschiedenen Panels und Tools an deine Bedürfnisse an.
*   **🛠 Debug-Werkzeuge**: Behalte Probleme im Blick mit dem integrierten Problems-Panel und Debug-Optionen.
*   **🌓 Modernes UI/UX**: Ein flüssiges, responsives Design mit Dark-Mode-Support, entwickelt mit Framer Motion und Radix UI.

---

## 🛠 Tech Stack

Das Projekt nutzt modernste Web-Technologien:

- **Framework**: [React 18](https://reactjs.org/)
- **Build-Tool**: [Vite](https://vitejs.dev/)
- **Native Bridge**: [Capacitor 7](https://capacitorjs.com/)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animationen**: [Framer Motion](https://www.framer.com/motion/)
- **Zustandsverwaltung**: [TanStack Query](https://tanstack.com/query/latest)

---

## 🚀 Installation & Setup

Stelle sicher, dass du **Node.js (v20+)** und **Android Studio** (für Android) bzw. **Xcode** (für iOS) installiert hast.

### Schnelles Setup

#### Windows
Führe die Datei `SETUP-ANDROID.bat` per Doppelklick aus. Das Script installiert alle Abhängigkeiten, baut die App und öffnet Android Studio automatisch.

#### macOS / Linux
Öffne das Terminal im Projektordner und führe das Setup-Script aus:

```bash
# Für Android
./SETUP-ANDROID.sh

# Für iOS (nur Mac)
./SETUP-ANDROID.sh ios
```

### Manuelle Installation

Falls du die Schritte einzeln ausführen möchtest:

1. **Abhängigkeiten installieren**:
   ```bash
   npm install
   ```
2. **Web-App bauen**:
   ```bash
   npm run build
   ```
3. **Plattform synchronisieren**:
   ```bash
   # Android
   npx cap sync android
   # iOS
   npx cap sync ios
   ```
4. **IDE öffnen**:
   ```bash
   npx cap open android # oder ios
   ```

---

## 👨‍💻 Entwickler-Informationen

### Scripts
- `npm run dev`: Startet den lokalen Vite-Dev-Server (Browser).
- `npm run build`: Erstellt den Produktions-Build der Web-App.
- `npm run cap:sync`: Baut die App und synchronisiert sie mit den nativen Projekten.
- `npm run lint`: Prüft den Code auf Fehler mit ESLint.

### Projektstruktur
- `src/components/editor`: Enthält alle Kern-Komponenten des Editors (Terminal, Git, Sidebars etc.).
- `src/lib/nativeFS.js`: Die Brücke zwischen der Web-App und dem nativen Dateisystem.
- `src/pages/Editor.jsx`: Die Hauptseite, die alle Komponenten zusammenführt.

---

## 📄 Lizenz

Dieses Projekt ist unter der [MIT-Lizenz](LICENSE) lizenziert. (Platzhalter - Bitte Lizenzdatei prüfen/erstellen falls nötig).

---

*Entwickelt mit ❤️ von [youngjibbit95](https://github.com/youngjibbit95)*
