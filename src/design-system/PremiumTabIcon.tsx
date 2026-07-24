import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { colors } from '@/theme';

export type PremiumTabIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface PremiumTabIconProps {
  name: PremiumTabIconName;
  focused: boolean;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

/** Vector tab icon — never Unicode / Text glyphs. */
export function PremiumTabIcon({
  name,
  focused,
  size = 24,
  activeColor = colors.champagneGold,
  inactiveColor = colors.textMuted,
}: PremiumTabIconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={focused ? activeColor : inactiveColor}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
