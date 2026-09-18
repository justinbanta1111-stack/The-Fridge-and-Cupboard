// Capacitor configuration for The Fridge & Cupboard native builds

import type { CapacitorConfig } from '@capacitor/cli';

// The iOS workflow sets CAP_TARGET=ios before `cap sync ios`, so only the
// iPhone build returns to the live-site configuration. Android keeps the
// bundled configuration it ships with today — unchanged.
const iosShell = process.env.CAP_TARGET === 'ios';

const config: CapacitorConfig = {
  appId: 'com.thefridgeandcupboard.app',
  appName: 'The Fridge & Cupboard',
  webDir: 'dist/client',
  // RESTORED to the last known working iOS configuration: the app loads the
  // live production site, exactly as the build that ran correctly on iPhone.
  // Do not switch back to a bundled-only webDir without re-testing on device.
  server: {
    ...(iosShell ? { url: 'https://thefridgeandcupboard.com', cleartext: false } : { iosScheme: 'capacitor' }),
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
