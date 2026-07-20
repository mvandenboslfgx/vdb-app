import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors, radii, spacing } from '@/theme';

type BadgeTone = 'neutral' | 'gold' | 'success' | 'warning' | 'error' | 'info';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text variant="caption" weight="medium" color={textColor[tone]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
});

const toneStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.surfaceElevated, borderColor: colors.borderSubtle },
  gold: { backgroundColor: '#2A2318', borderColor: colors.champagneGoldDim },
  success: { backgroundColor: colors.successMuted, borderColor: colors.success },
  warning: { backgroundColor: colors.warningMuted, borderColor: colors.warning },
  error: { backgroundColor: colors.errorMuted, borderColor: colors.error },
  info: { backgroundColor: colors.infoMuted, borderColor: colors.info },
});

const textColor: Record<BadgeTone, keyof typeof colors> = {
  neutral: 'textSecondary',
  gold: 'champagneGoldLight',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
};
