@echo off
setlocal enabledelayedexpansion
title Nexus Code — Android Studio Setup
color 0B

echo.
echo  ============================================
echo   NEXUS CODE  ^|  Android Studio Setup
echo  ============================================
echo.

:: ── 1. Node.js prüfen ────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [FEHLER] Node.js ist nicht installiert!
    echo.
    echo  Bitte installiere Node.js 20 LTS von:
    echo  https://nodejs.org/en/download
    echo.
    echo  Danach dieses Skript erneut ausfuehren.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: ── 2. Java / JDK prüfen ─────────────────────────────────────────
where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [FEHLER] Java / JDK nicht gefunden!
    echo.
    echo  Android Studio braucht JDK 17+.
    echo  Empfehlung: Android Studio installieren, es bringt JDK mit.
    echo  https://developer.android.com/studio
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('java -version 2^>^&1 ^| findstr version') do set JAVA_VER=%%v
echo  [OK] Java gefunden

echo.
echo  ---- Schritt 1/4: Dependencies installieren ----
call npm install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [FEHLER] npm install fehlgeschlagen!
    echo  Tipp: Loesche node_modules und package-lock.json und versuche es erneut.
    pause
    exit /b 1
)
echo  [OK] npm install abgeschlossen

echo.
echo  ---- Schritt 2/4: Web-App bauen (Vite) ----
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [FEHLER] Vite Build fehlgeschlagen!
    echo  Schau in die Fehlermeldung oben.
    pause
    exit /b 1
)
echo  [OK] dist/ Ordner erstellt

echo.
echo  ---- Schritt 3/4: Android-Plattform einrichten ----
call npx cap add android 2>nul
echo  [INFO] Android hinzugefuegt (oder bereits vorhanden)

call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo  [FEHLER] Capacitor Sync fehlgeschlagen!
    pause
    exit /b 1
)
echo  [OK] Android-Projekt synchronisiert

echo.
echo  ---- Schritt 4/4: Android Studio oeffnen ----
call npx cap open android
echo.
echo  ============================================
echo   FERTIG! Android Studio sollte sich oeffnen
echo  ============================================
echo.
echo  Naechste Schritte in Android Studio:
echo.
echo  1. Warte auf Gradle-Sync (Fortschrittsbalken unten)
echo     Das dauert beim ersten Mal 2-5 Minuten.
echo.
echo  2. Oben in der Toolbar: Gerät/Emulator auswaehlen
echo     - Echtes Gerät: USB-Debugging aktivieren (Einstellungen > Entwickler)
echo     - Emulator: AVD Manager > Create Virtual Device
echo.
echo  3. Gruenen Play-Pfeil ▶ klicken — fertig!
echo.
echo  Fuer iOS: macOS + Xcode benoetigt.
echo  Befehl: npm run cap:ios
echo.
pause
