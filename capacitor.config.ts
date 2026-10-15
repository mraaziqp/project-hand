import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'za.co.arpcloudsolutions.benchos',
  appName: 'BENCH-OS',
  webDir: 'dist',
  backgroundColor: '#050811',
  android: {
    // The UI is bundled in the APK; only /api calls go to the hosted server.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
