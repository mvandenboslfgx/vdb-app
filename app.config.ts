import type { ExpoConfig, ConfigContext } from 'expo/config';

const APP_VERSION = '1.0.0';
const VERSION_CODE = 1;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'VDB Digital',
  slug: 'vdb-digital',
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'vdbdigital',
  userInterfaceStyle: 'dark',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'nl.vdbdigital.app',
    associatedDomains: ['applinks:vdbdigital.nl'],
  },
  android: {
    package: 'nl.vdbdigital.app',
    versionCode: VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#050505',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'vdbdigital.nl',
            pathPrefix: '/app',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#050505',
      },
    ],
    'expo-secure-store',
    'expo-web-browser',
    'expo-localization',
    'expo-font',
    '@sentry/react-native',
    [
      'expo-image-picker',
      {
        // Photos/documents only — no video mic capture in v1
        photosPermission: 'VDB Digital needs photo access to attach images to documents and support.',
        cameraPermission: 'VDB Digital needs camera access to capture document photos.',
        microphonePermission: false,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#C7A66A',
        defaultChannel: 'default',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '',
    },
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  },
  owner: process.env.EAS_OWNER,
});
