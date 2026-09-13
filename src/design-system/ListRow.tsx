import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors, radii, spacing, typography } from '@/theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
}

export function ListRow({ title, subtitle, meta, left, right, onPress, testID }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.content}>
        <Text style={styles.title} weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {meta ? (
          <Text variant="caption" color="textMuted">
            {meta}
          </Text>
        ) : null}
        {right}
        {onPress ? (
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={styles.card}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfacePrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  left: {
    marginRight: spacing.xs,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: typography.size.lg,
    lineHeight: typography.size.lg * typography.lineHeight.normal,
    color: colors.textPrimary,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
