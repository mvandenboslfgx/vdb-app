import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/theme';

export interface DividerProps {
  style?: StyleProp<ViewStyle>;
  spacingSize?: 'sm' | 'md' | 'lg';
}

export function Divider({ style, spacingSize = 'md' }: DividerProps) {
  return <View style={[styles.line, spacingStyles[spacingSize], style]} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    alignSelf: 'stretch',
  },
});

const spacingStyles = StyleSheet.create({
  sm: { marginVertical: spacing.sm },
  md: { marginVertical: spacing.md },
  lg: { marginVertical: spacing.lg },
});
