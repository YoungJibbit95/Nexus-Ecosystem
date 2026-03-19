# 🚀 Nexus Mobile

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/YoungJibbit95/Nexus-Mobile)
[![Framework](https://img.shields.io/badge/framework-React-61dafb.svg)](https://reactjs.org/)
[![Tooling](https://img.shields.io/badge/tooling-Vite-646cff.svg)](https://vitejs.dev/)
[![Mobile](https://img.shields.io/badge/mobile-Capacitor-119eff.svg)](https://capacitorjs.com/)
[![Styling](https://img.shields.io/badge/styling-Tailwind_CSS-38b2ac.svg)](https://tailwindcss.com/)

**Nexus Mobile** ist eine moderne, funktionsreiche All-in-One-Produktivitätslösung für Web und Mobile. Es kombiniert einen leistungsstarken Code-Editor, ein Notizbuch, ein Erinnerungssystem, Aufgabenlisten und vieles mehr in einer nahtlosen, reaktionsschnellen Oberfläche.

---

## ✨ Hauptfunktionen

Nexus Mobile wurde entwickelt, um alle deine täglichen Werkzeuge an einem Ort zu vereinen:

- 💻 **Moderner Code-Editor**: Ein leistungsstarker Editor (basiert auf Monaco Editor für Desktop, optimiert als Textarea für Mobile) für schnelle Bearbeitungen unterwegs.
- 🎨 **Digitales Canvas**: Ein interaktives Whiteboard zum Skizzieren von Ideen, Flussdiagrammen oder schnellen Notizen.
- 📝 **Intelligentes Notizbuch**: Organisiere deine Gedanken mit einem flexiblen Notepad, das Markdown unterstützt.
- ⚡ **Nexus Flux**: Ein Echtzeit-Aktivitätsstream und System-Pulse, der alle deine Aktionen übersichtlich protokolliert.
- 📅 **Erinnerungs- & Aufgabensystem**: Verpasse nie wieder eine Deadline mit integrierten Remindern und einer intuitiven Todo-Liste.
- 📂 **Dateimanager**: Behalte den Überblick über deine Projektdateien direkt in der App.
- 📊 **Persönliches Dashboard**: Eine zentrale Übersicht über alle deine Aktivitäten und anstehenden Aufgaben.
- ⚙️ **Anpassbar**: Umfangreiche Einstellungen, um die App an deinen Workflow anzupassen.
- 🛠️ **DevTools Integriert**: Eingebaute Entwicklerwerkzeuge für schnelles Debugging und Performance-Checks.

---

## 📱 Mobile Optimierung

Nexus Mobile nutzt **Capacitor**, um eine native App-Erfahrung zu bieten:

- **Echtzeit-Haptic Feedback** für eine physische Rückmeldung bei Interaktionen.
- **Adaptive Navigation**: Eine intuitive Bottom-Nav für Mobile, die auf Desktop zu einer Sidebar wechselt.
- **Notch-Handling**: Automatische Berücksichtigung von Safe-Areas für moderne Smartphones.
- **Leistung**: Ressourcenintensive Komponenten werden auf mobilen Geräten automatisch optimiert.

---

## 🛠️ Installation & Setup

### Voraussetzungen
- **Node.js**: Version 18 oder höher
- **npm**: Standardmäßig bei Node.js dabei
- **Android Studio**: Für die Android-Entwicklung
- **Xcode**: (Nur macOS) Für die iOS-Entwicklung
- **JDK 17**: Für Android-Builds

### Erste Schritte

1. **Repository klonen**
   ```bash
   git clone https://github.com/YoungJibbit95/Nexus-Mobile.git
   cd nexus-mobile
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Web-App bauen**
   ```bash
   npm run build
   ```

4. **Capacitor Plattformen hinzufügen** (einmalig)
   ```bash
   npx cap add android
   npx cap add ios
   ```

5. **Native Projekte synchronisieren**
   ```bash
   npx cap sync
   ```

---

## 🚀 Entwicklung

### Lokaler Server (Web)
Starte den Vite-Development-Server für eine schnelle Web-Ansicht:
```bash
npm run dev
```

### Mobile Live-Reload
Verbinde dein Gerät oder starte einen Simulator und führe folgenden Befehl aus, um Änderungen sofort zu sehen:

- **Android:**
  ```bash
  npx cap run android --livereload --external
  ```
- **iOS:**
  ```bash
  npx cap run ios --livereload --external
  ```

---

## 🏗️ Tech-Stack

- **Frontend:** React 18
- **Build-Tool:** Vite
- **Styling:** Tailwind CSS & Framer Motion (Animationen)
- **Mobile Bridge:** Capacitor 6
- **Zustandsverwaltung:** Zustand
- **Editor:** Monaco Editor
- **Icons:** Lucide React

---

## 📄 Lizenz

Nexus Mobile ist ein Projekt von [youngjibbit95](https://github.com/youngjibbit95). Alle Rechte vorbehalten.

---

*Entwickelt mit ❤️ für Produktivität und Code-Exzellenz.*
