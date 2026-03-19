# Nexus Mobile — Capacitor Setup

## Prerequisites
- Node.js 18+
- Android Studio (for Android)
- Xcode 15+ (for iOS, macOS only)
- JDK 17 (for Android)

## First-time Setup

```bash
# Install dependencies
npm install

# Install Capacitor CLI globally (optional)
npm install -g @capacitor/cli

# Build the web app
npm run build

# Add Android platform
npx cap add android

# Add iOS platform (macOS only)
npx cap add ios

# Sync the built files into native projects
npx cap sync
```

## Development

```bash
# Start Vite dev server
npm run dev

# Live reload on Android (connect device or start emulator first)
npx cap run android --livereload --external

# Live reload on iOS
npx cap run ios --livereload --external
```

## Building for Release

### Android
```bash
npm run build
npx cap sync android
# Then open in Android Studio:
npx cap open android
# Build > Generate Signed Bundle/APK
```

### iOS
```bash
npm run build
npx cap sync ios
# Then open in Xcode:
npx cap open ios
# Product > Archive
```

## Key Files
- `capacitor.config.ts` — Capacitor configuration
- `src/lib/useMobile.ts` — Mobile detection hook
- `src/components/MobileNav.tsx` — Bottom navigation bar
- `src/App.tsx` — Responsive layout (mobile vs desktop)

## Notes
- Monaco Editor is replaced with a textarea on mobile for performance
- Bottom navigation shows 4 primary views + a "More" drawer
- Safe area insets handled automatically for notch/home bar
- Haptic feedback available via `@capacitor/haptics`
