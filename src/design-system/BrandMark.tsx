import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors, radii, spacing } from '@/theme';

export interface BrandMarkProps {
  subtitle?: string;
  compact?: boolean;
}

/** Temporary brand mark until official logo assets land in assets/brand. */
export function BrandMark({ subtitle, compact = false }: BrandMarkProps) {
  return (
    <View style={[styles.wrap, compact && styles.compact]} accessibilityRole="header">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <Text variant={compact ? 'label' : 'subtitle'} weight="bold" color="champagneGold">
          VDB
        </Text>
      </View>
      <View style={styles.textCol}>
        <Text variant={compact ? 'body' : 'title'} weight="semibold">
          VDB Digital
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compact: {
    gap: spacing.sm,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.champagneGold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  markCompact: {
    width: 40,
    height: 40,
  },
  textCol: {
    gap: 2,
    flexShrink: 1,
  },
});
