import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';

import { Text } from '@/design-system/Text';
import { syncControlledFieldValue } from '@/lib/auth/syncControlledFieldValue';
import { colors, radii, spacing, typography } from '@/theme';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput(
  {
    label,
    error,
    hint,
    style,
    onFocus,
    onBlur,
    onChangeText,
    onEndEditing,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <RNTextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onChangeText={onChangeText}
        onEndEditing={(e) => {
          // Maestro / some IMEs update native text without reliable onChangeText.
          const text = syncControlledFieldValue('', e.nativeEvent.text);
          onChangeText?.(text);
          onEndEditing?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="error" style={styles.meta}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={styles.meta}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    marginBottom: spacing.xxs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfacePrimary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.size.md,
  },
  inputFocused: {
    borderColor: colors.champagneGoldDim,
  },
  inputError: {
    borderColor: colors.error,
  },
  meta: {
    marginTop: spacing.xxs,
  },
});
