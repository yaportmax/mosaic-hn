import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mosaic HN',
  slug: 'mosaic-hn',
  version: '1.0.0',
  orientation: 'default',
  icon: './assets/icon.png',
  scheme: 'mosaichn',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'org.mosaichn.reader',
    deploymentTarget: '16.4',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIFileSharingEnabled: true,
      LSSupportsOpeningDocumentsInPlace: true
    },
    privacyManifests: {
      NSPrivacyAccessedAPITypes: []
    }
  },
  android: {
    package: 'org.mosaichn.reader',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F36C21'
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: true
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png'
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 180, resizeMode: 'contain', backgroundColor: '#0E0E10', dark: { backgroundColor: '#0E0E10' } }],
    ['expo-sqlite', { enableFTS: true, useSQLCipher: false }],
    'expo-document-picker'
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    themeRegistryUrl: '',
    eas: { projectId: 'REPLACE_WITH_EAS_PROJECT_ID' }
  }
};

export default config;
