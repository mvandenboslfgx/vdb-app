import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { spacing } from '@/theme';

export interface FeatureUnavailableStateProps {
  title: string;
  description?: string;
  testID?: string;
}

/** Deliberate unavailable state for feature-flagged / contract-disabled surfaces. */
export function FeatureUnavailableState({
  title,
  description,
  testID,
}: FeatureUnavailableStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary" testID={testID}>
      <Text variant="subtitle" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary" align="center" style={styles.description}>
          {description}
        </Text>
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
});
