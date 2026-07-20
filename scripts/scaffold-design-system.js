const fs = require('fs');
const path = require('path');

const root = process.cwd();

function w(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.replace(/\r?\n/g, '\n'));
  console.log('wrote', rel);
}

w(
  'src/design-system/components/Text.tsx',
  `import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme';

type Variant = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: keyof typeof colors;
  children: React.ReactNode;
}

export function Text({
  variant = 'body',
  color = 'textPrimary',
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[styles.base, typography[variant], { color: colors[color] }, style]}
      maxFontSizeMultiplier={1.4}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false },
});
`,
);

w(
  'src/design-system/components/Button.tsx',
  `import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, minTouchTarget, radii, spacing } from '../../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      onPressIn={(e) => {
        scale.value = withTiming(0.98, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 120 });
        onPressOut?.(e);
      }}
      style={(state) => [
        styles.base,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        (isDisabled || state.pressed) && styles.dimmed,
        animatedStyle,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'primary' ? colors.backgroundPrimary : colors.champagneGold
            }
          />
        ) : (
          <Text
            variant="button"
            color={
              variant === 'primary'
                ? 'backgroundPrimary'
                : variant === 'danger'
                  ? 'error'
                  : 'textPrimary'
            }
          >
            {label}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  dimmed: { opacity: 0.55 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.champagneGold },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  ghost: { backgroundColor: colors.transparent },
  danger: {
    backgroundColor: colors.errorMuted,
    borderWidth: 1,
    borderColor: colors.error,
  },
});
`,
);

w(
  'src/design-system/components/TextInput.tsx',
  `import React from 'react';
import {
  TextInput as RNTextInput,
  View,
  StyleSheet,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import { Text } from './Text';

export interface AppTextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, style, ...rest }: AppTextInputProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <RNTextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        maxFontSizeMultiplier={1.35}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { textTransform: 'uppercase' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfacePrimary,
    color: colors.textPrimary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...typography.body,
  },
  inputError: { borderColor: colors.error },
  error: { marginTop: 2 },
});
`,
);

w(
  'src/design-system/components/Screen.tsx',
  `import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

export interface ScreenProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Screen({
  children,
  scroll,
  padded = true,
  refreshing,
  onRefresh,
  header,
  footer,
  style,
  ...rest
}: ScreenProps) {
  const content = (
    <View style={[padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={colors.champagneGold}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  padded: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xxxl },
});
`,
);

w(
  'src/design-system/components/StatusPill.tsx',
  `import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from './Text';

type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'gold';

const toneMap: Record<Tone, { bg: string; fg: keyof typeof colors }> = {
  neutral: { bg: colors.surfaceElevated, fg: 'textSecondary' },
  success: { bg: colors.successMuted, fg: 'success' },
  warning: { bg: colors.warningMuted, fg: 'warning' },
  error: { bg: colors.errorMuted, fg: 'error' },
  gold: { bg: '#2A2418', fg: 'champagneGoldLight' },
};

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: Tone;
}) {
  const t = toneMap[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]} accessibilityRole="text">
      <Text variant="label" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
});
`,
);

w(
  'src/design-system/components/EmptyState.tsx',
  `import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { Text } from './Text';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Text variant="headline">{title}</Text>
      {description ? (
        <Text variant="body" color="textSecondary" style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    alignItems: 'flex-start',
  },
  desc: { marginBottom: spacing.sm },
});
`,
);

w(
  'src/design-system/components/LoadingState.tsx',
  `import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { Text } from './Text';

export function LoadingState({ label }: { label?: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.champagneGold} size="large" />
      {label ? (
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});
`,
);

w(
  'src/design-system/components/ErrorState.tsx',
  `import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { Text } from './Text';
import { Button } from './Button';

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
}: {
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text variant="headline" color="error">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary">
          {description}
        </Text>
      ) : null}
      {retryLabel && onRetry ? (
        <Button label={retryLabel} onPress={onRetry} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, padding: spacing.xl },
});
`,
);

w(
  'src/design-system/components/ListRow.tsx',
  `import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, minTouchTarget, spacing } from '../../theme';
import { Text } from './Text';

export function ListRow({
  title,
  subtitle,
  meta,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <View style={styles.textCol}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? (
        <Text variant="caption" color="textMuted">
          {meta}
        </Text>
      ) : null}
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  textCol: { flex: 1, gap: 2 },
});
`,
);

w(
  'src/design-system/components/OfflineBanner.tsx',
  `import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { Text } from './Text';

export function OfflineBanner({ message }: { message: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text variant="caption" color="warning">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
`,
);

w(
  'src/design-system/components/Divider.tsx',
  `import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

export function Divider() {
  return <View style={styles.line} />;
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.md,
  },
});
`,
);

w(
  'src/design-system/components/BrandMark.tsx',
  `import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../../theme';
import { Text } from './Text';

/** Temporary brand placeholder until official logo assets are provided. */
export function BrandMark({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.mark}>
        <Text variant="headline" color="champagneGold">
          VDB
        </Text>
      </View>
      <View style={styles.textCol}>
        <Text variant="title">VDB Digital</Text>
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
  wrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
  textCol: { gap: 2 },
});
`,
);

w(
  'src/design-system/index.ts',
  `export { Text } from './components/Text';
export { Button } from './components/Button';
export { TextInput } from './components/TextInput';
export { Screen } from './components/Screen';
export { StatusPill } from './components/StatusPill';
export { EmptyState } from './components/EmptyState';
export { LoadingState } from './components/LoadingState';
export { ErrorState } from './components/ErrorState';
export { ListRow } from './components/ListRow';
export { OfflineBanner } from './components/OfflineBanner';
export { Divider } from './components/Divider';
export { BrandMark } from './components/BrandMark';
`,
);

console.log('design-system scaffold complete');
