import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financeos.app',
  appName: 'Finance OS',
  webDir: 'public',
  server: {
    url: 'https://finance-os-blue-eight.vercel.app', // IMPORTANT: Replace with actual URL if different
    cleartext: true
  }
};

export default config;
