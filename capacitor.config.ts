import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bookcircle.app',
  appName: 'book-circle',
  webDir: 'out',
  server: {
    // Use localhost for development, replace with your production URL later
    url: 'http://localhost:3000',
    cleartext: true
  }
};

export default config;
