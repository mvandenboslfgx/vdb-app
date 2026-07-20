import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors, hitSlop, radii } from '@/theme';

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  icon: string;
  tone?: 'default' | 'gold' | 'danger';
}

export function IconButton({ label, icon, tone = 'default', style, ...rest }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop.md}
      style={({ pressed }) => [
        styles.base,
        toneStyles[tone],
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <Text variant="subtitle" color={tone === 'gold' ? 'champagneGold' : tone === 'danger' ? 'error' : 'textPrimary'}>
        {icon}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  pressed: {
    opacity: 0.8,
  },
});

const toneStyles = StyleSheet.create({
  default: {},
  gold: {
    borderColor: colors.champagneGoldDim,
  },
  danger: {
    borderColor: colors.error,
    backgroundColor: colors.errorMuted,
  },
});
