// Capacitor configuration for The Fridge & Cupboard native builds

const config: CapacitorConfig = {
  appId: 'com.thefridgeandcupboard.app',
  appName: 'The Fridge & Cupboard',
  webDir: 'dist',
  server: {
    // Load the live production site so web updates appear instantly
    // without resubmitting to the App Store / Play Store.
    url: 'https://thefridgeandcupboard.com',
    cleartext: false,
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
  },
};

export default config;
