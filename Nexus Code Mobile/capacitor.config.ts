import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexus.code',
  appName: 'Nexus Code',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#060614',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#060614',
    captureInput: true,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#060614',
    scrollEnabled: false,
  },
};

export default config;
