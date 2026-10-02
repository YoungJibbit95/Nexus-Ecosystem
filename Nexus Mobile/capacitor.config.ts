import type { CapacitorConfig } from '@capacitor/cli';

// Release builds stay non-debuggable; local Android debugging is explicit opt-in.
const enableDevelopmentWebViewDebugging =
  process.env.NEXUS_MOBILE_BUILD === 'development'
  && process.env.NEXUS_MOBILE_WEBVIEW_DEBUGGING === 'true';

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
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: enableDevelopmentWebViewDebugging,
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
  },
};

export default config;
