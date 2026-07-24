import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { spacing } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  testID?: string;
}

export function SectionHeader({ title, testID }: SectionHeaderProps) {
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={styles.title} weight="semibold">
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing['2xl'],
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    color: '#F5F5F3',
  },
});
