import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design-system/Button';
import { Text } from '@/design-system/Text';
import { colors, radii, spacing } from '@/theme';

export interface ErrorStateProps {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, retryLabel, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.panel}>
        <Text variant="subtitle" align="center">
          {title}
        </Text>
        {description ? (
          <Text variant="body" color="textSecondary" align="center">
            {description}
          </Text>
        ) : null}
        {retryLabel && onRetry ? (
          <Button title={retryLabel} onPress={onRetry} variant="secondary" style={styles.retry} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorMuted,
  },
  retry: {
    marginTop: spacing.md,
  },
});
