// Capacitor configuration for The Fridge & Cupboard native builds

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thefridgeandcupboard.app',
  appName: 'The Fridge & Cupboard',
  webDir: 'dist/client',
  // Both native apps launch the app installed in webDir. Internet-only work
  // (AI, authentication, scanning and payments) is routed to the live API by
  // src/lib/native-api-origin.ts; the app itself is never a remote web shell.
  server: {
    iosScheme: 'capacitor',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0b0b0f',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0b0b0f',
    },
  },
};

export default config;
