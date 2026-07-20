import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandMark, Screen, Text } from '@/design-system';
import { spacing } from '@/theme';

export function ConfigurationErrorScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Screen scroll>
      <View style={styles.wrap} accessibilityRole="alert">
        <BrandMark subtitle="Software & Project Portal" />
        <Text variant="title" color="error">
          {title}
        </Text>
        <Text variant="body" color="textSecondary">
          {message}
        </Text>
        <Text variant="caption" color="textMuted">
          Development: set EXPO_PUBLIC_ENABLE_DEMO_MODE=true for UI-only demo, or configure
          EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY for local/staging Supabase.
          Preview/production never allow demo mode.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
});
