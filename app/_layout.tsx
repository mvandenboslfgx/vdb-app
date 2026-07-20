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

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
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
