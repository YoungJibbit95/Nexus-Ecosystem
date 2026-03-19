import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.youngjibbit95.nexus',
  appName: 'Nexus',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['fonts.googleapis.com', 'fonts.gstatic.com'],
  },
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a14',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#0a0a14',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
  },
};

export default config;
