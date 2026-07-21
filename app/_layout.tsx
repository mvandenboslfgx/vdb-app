import 'react-native-gesture-handler';

import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { ConfigurationErrorScreen } from '@/components/ConfigurationErrorScreen';
import { clientEnv } from '@/config/env';
import { AppProviders } from '@/providers/AppProviders';
import { colors } from '@/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

function needsConfigurationGate(): boolean {
  return !clientEnv.hasSupabaseConfig && !clientEnv.useMockData;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Font download can fail transiently when Metro/adb reverse flaps; do not redbox the whole tree.
  useEffect(() => {
    if (error) {
      console.warn('[fonts] SpaceMono failed to load; continuing with system fonts', error.message);
      void SplashScreen.hideAsync();
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Proceed once fonts resolve OR fail — never hang splash forever.
  if (!loaded && !error) {
    return null;
  }

  if (needsConfigurationGate()) {
    return (
      <ConfigurationErrorScreen
        title="Configuration required"
        message="Supabase is not configured and demo mode is disabled. The app will not silently fall back to demo data."
      />
    );
  }

  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundPrimary },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(partner)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}
