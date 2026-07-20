import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/design-system/Text';
import { colors, motion, radii, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  fullWidth,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={[
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPressIn={(e) => {
        scale.value = withTiming(0.97, { duration: motion.fast });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: motion.fast });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'gold' || variant === 'primary' ? colors.backgroundPrimary : colors.champagneGold}
        />
      ) : (
        <Text
          variant={size === 'sm' ? 'label' : 'body'}
          weight="semibold"
          color={textColorForVariant(variant)}
        >
          {title}
        </Text>
      )}
    </AnimatedPressable>
  );
}

function textColorForVariant(variant: ButtonVariant): keyof typeof colors {
  switch (variant) {
    case 'primary':
      return 'backgroundPrimary';
    case 'gold':
      return 'backgroundPrimary';
    case 'danger':
      return 'textPrimary';
    case 'secondary':
    case 'ghost':
      return 'textPrimary';
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    minHeight: 44,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40 },
  md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 48 },
  lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, minHeight: 52 },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.textPrimary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  danger: {
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: colors.error,
  },
  gold: {
    backgroundColor: colors.champagneGold,
  },
});
