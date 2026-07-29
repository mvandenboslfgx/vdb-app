import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, hitSlop, radii } from '@/theme';

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  tone?: 'default' | 'gold' | 'danger';
}

export function IconButton({ label, icon, tone = 'default', style, ...rest }: IconButtonProps) {
  const color =
    tone === 'gold' ? colors.champagneGold : tone === 'danger' ? colors.error : colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={hitSlop.md}
      style={({ pressed }) => [styles.base, toneStyles[tone], pressed && styles.pressed, style]}
      {...rest}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color} />
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
