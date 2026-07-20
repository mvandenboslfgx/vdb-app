import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design-system/Button';
import { Text } from '@/design-system/Text';
import { spacing } from '@/theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <Text variant="subtitle" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary" align="center" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
    gap: spacing.sm,
  },
  description: {
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.md,
  },
});
