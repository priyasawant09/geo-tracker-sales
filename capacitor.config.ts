import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.geosales.app',
  appName: 'geosales-tracker',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      permissions: {
        location: 'always'
      }
    }
  }
};

export default config;
