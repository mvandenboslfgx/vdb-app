import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import React, { useState, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { initI18n, i18n } from '@/i18n';
import { createQueryClient } from '@/lib/queryClient';
import { initObservability } from '@/lib/observability';
import { AuthProvider } from '@/providers/AuthProvider';
import { FeatureFlagsProvider } from '@/providers/FeatureFlagsProvider';
import { NetworkProvider } from '@/providers/NetworkProvider';
import { colors } from '@/theme';

initObservability();
initI18n();

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <NetworkProvider>
              <AuthProvider>
                <FeatureFlagsProvider>
                  <StatusBar style="light" />
                  {children}
                </FeatureFlagsProvider>
              </AuthProvider>
            </NetworkProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
});
