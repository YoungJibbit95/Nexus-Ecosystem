#!/usr/bin/env bash
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────
GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'
YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

echo ""
echo -e "${BLUE}  ============================================${NC}"
echo -e "${BLUE}   NEXUS CODE  |  Mobile Setup${NC}"
echo -e "${BLUE}  ============================================${NC}"
echo ""

# ── Ziel: Android oder iOS ────────────────────────────────────────
TARGET="${1:-android}"

# ── Node.js prüfen ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}[FEHLER] Node.js nicht gefunden!${NC}"
  echo "  → https://nodejs.org (Version 20 LTS empfohlen)"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js $(node -v)"

# ── npm prüfen ────────────────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo -e "${RED}[FEHLER] npm nicht gefunden!${NC}"
  exit 1
fi
echo -e "${GREEN}[OK]${NC} npm $(npm -v)"

# ── Schritt 1: npm install ───────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/4] Installiere Dependencies...${NC}"
npm install
echo -e "${GREEN}[OK]${NC} node_modules installiert"

# ── Schritt 2: Vite Build ─────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/4] Baue Web-App (Vite)...${NC}"
npm run build
echo -e "${GREEN}[OK]${NC} dist/ Ordner erstellt"

# ── Schritt 3: Plattform hinzufügen & sync ────────────────────────
echo ""
echo -e "${YELLOW}[3/4] Richte ${TARGET}-Plattform ein...${NC}"
npx cap add "$TARGET" 2>/dev/null || echo "  (Plattform bereits vorhanden)"
npx cap sync "$TARGET"
echo -e "${GREEN}[OK]${NC} ${TARGET}-Projekt synchronisiert"

# ── Schritt 4: IDE öffnen ─────────────────────────────────────────
echo ""
echo -e "${YELLOW}[4/4] Öffne IDE...${NC}"
npx cap open "$TARGET"

# ── Fertig ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}  ============================================${NC}"
echo -e "${GREEN}   FERTIG!${NC}"
echo -e "${GREEN}  ============================================${NC}"
echo ""

if [[ "$TARGET" == "android" ]]; then
  echo -e "  ${CYAN}Nächste Schritte in Android Studio:${NC}"
  echo ""
  echo "  1. Warte auf Gradle-Sync (Balken unten)"
  echo "     Beim ersten Mal: 2–5 Minuten"
  echo ""
  echo "  2. Gerät/Emulator auswählen (Dropdown oben)"
  echo "     Echtes Gerät: USB-Debugging aktivieren"
  echo "     Einstellungen > Über das Telefon >"
  echo "     Build-Nummer 7x tippen > Entwickleroptionen"
  echo ""
  echo "  3. Grünen ▶ Play-Button klicken"
else
  echo -e "  ${CYAN}Nächste Schritte in Xcode:${NC}"
  echo ""
  echo "  1. Signing & Capabilities → Team auswählen"
  echo "  2. Simulator oder Gerät auswählen"
  echo "  3. ▶ Run klicken"
fi
echo ""
