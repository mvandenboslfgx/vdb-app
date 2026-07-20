import React from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type TextVariant = 'display' | 'title' | 'subtitle' | 'body' | 'label' | 'caption' | 'mono';
type TextWeight = keyof typeof typography.weight;
type TextColor = keyof typeof colors;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  color?: TextColor;
  align?: TextStyle['textAlign'];
}

export function Text({
  variant = 'body',
  weight,
  color = 'textPrimary',
  align,
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        styles.base,
        variantStyles[variant],
        weight ? { fontWeight: typography.weight[weight] } : null,
        { color: colors[color], textAlign: align },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fontFamily.regular,
  },
});

const variantStyles = StyleSheet.create({
  display: {
    fontSize: typography.size['4xl'],
    lineHeight: typography.size['4xl'] * typography.lineHeight.tight,
    fontWeight: typography.weight.bold,
  },
  title: {
    fontSize: typography.size['2xl'],
    lineHeight: typography.size['2xl'] * typography.lineHeight.tight,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    fontSize: typography.size.xl,
    lineHeight: typography.size.xl * typography.lineHeight.normal,
    fontWeight: typography.weight.medium,
  },
  body: {
    fontSize: typography.size.md,
    lineHeight: typography.size.md * typography.lineHeight.relaxed,
    fontWeight: typography.weight.regular,
  },
  label: {
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    fontWeight: typography.weight.medium,
  },
  caption: {
    fontSize: typography.size.xs,
    lineHeight: typography.size.xs * typography.lineHeight.normal,
    fontWeight: typography.weight.regular,
  },
  mono: {
    fontSize: typography.size.sm,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
    fontFamily: typography.fontFamily.mono,
  },
});
