import type { ExpoConfig } from 'expo/config';

const WEB_HOST = 'tetoco.jflores.tech';

const config: ExpoConfig = {
  name: 'Te Tocó',
  slug: 'te-toco',
  owner: 'j0nvthvn1',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'tetoco',
  userInterfaceStyle: 'light',
  android: {
    package: 'tech.jflores.tetoco',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // App Links: los links personales abren la app si está instalada
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: WEB_HOST, pathPrefix: '/r/' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    '@react-native-community/datetimepicker',
  ],
  experiments: {
    reactCompiler: true,
  },
  extra: {
    eas: { projectId: '5e39f1d6-686b-4b76-81f4-97de1618e7b3' },
  },
};

export default config;
