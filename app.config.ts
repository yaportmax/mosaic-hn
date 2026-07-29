import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mosaic HN',
  slug: 'mosaic-hn',
  version: '1.0.0',
  description: 'A local-first, deeply customizable, open-source Hacker News reader.',
  githubUrl: 'https://github.com/yaportmax/mosaic-hn',
  platforms: ['ios', 'android'],
  orientation: 'default',
  icon: './assets/icon.png',
  scheme: 'mosaichn',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.maxyaport.mosaichn',
    buildNumber: '1',
    deploymentTarget: '16.4',
    config: { usesNonExemptEncryption: false },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: []
    }
  },
  android: {
    package: 'com.maxyaport.mosaichn',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F36C21'
    },
    predictiveBackGestureEnabled: true
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#0E0E10', dark: { backgroundColor: '#0E0E10' } }],
    ['expo-sqlite', { enableFTS: true, useSQLCipher: false }],
    'expo-document-picker'
  ],
  experiments: { typedRoutes: true },
  extra: { themeRegistryUrl: '', sourceRepository: 'https://github.com/yaportmax/mosaic-hn' }
};

export default config;
