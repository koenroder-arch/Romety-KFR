import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.romety.app',
  appName: 'Romety',
  webDir: 'dist',
  plugins: {
    // Het scherm krimpt netjes als het toetsenbord opengaat. Zo blijven balken die
    // onderaan vast staan op hun plek in plaats van onder/boven het toetsenbord te schieten.
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
