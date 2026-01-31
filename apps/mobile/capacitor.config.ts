import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hrportal.app',
  appName: 'HR Portal',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
