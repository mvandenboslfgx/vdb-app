import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { radii, spacing } from '@/theme';

export interface BrandMarkProps {
  subtitle?: string;
  compact?: boolean;
  /** Hide wordmark text and show only the logo mark. */
  markOnly?: boolean;
}

const logoSource = require('../../assets/brand/logo-mark.png');

/** Official VDB Digital brand mark + optional wordmark. */
export function BrandMark({
  subtitle,
  compact = false,
  markOnly = false,
}: BrandMarkProps) {
  const size = compact ? 40 : 56;

  return (
    <View style={[styles.wrap, compact && styles.compact]} accessibilityRole="header">
      <Image
        source={logoSource}
        style={{ width: size, height: size, borderRadius: radii.md }}
        accessibilityLabel="VDB Digital"
      />
      {markOnly ? null : (
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
      )}
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
  textCol: {
    gap: 2,
    flexShrink: 1,
  },
});
