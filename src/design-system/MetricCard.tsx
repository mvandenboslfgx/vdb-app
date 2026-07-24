import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors, radii, spacing } from '@/theme';

export interface MetricCardProps {
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** Compact overview metric with icon, value, and detail. */
export function MetricCard({
  title,
  value,
  detail,
  icon,
  onPress,
  accessibilityLabel,
  testID,
}: MetricCardProps) {
  const { width } = useWindowDimensions();
  const twoCol = width >= 360;

  const body = (
    <>
      <View style={styles.top}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.champagneGold} />
        {onPress ? (
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
        ) : null}
      </View>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {title}
      </Text>
      <Text variant="subtitle" weight="semibold" style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted" numberOfLines={2}>
        {detail}
      </Text>
    </>
  );

  const style = [styles.card, twoCol ? styles.half : styles.full];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${title}: ${value}. ${detail}`}
        onPress={onPress}
        style={({ pressed }) => [...style, pressed && styles.pressed]}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      style={style}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel ?? `${title}: ${value}. ${detail}`}
    >
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfacePrimary,
    borderColor: colors.borderSubtle,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.xs,
    minHeight: 112,
  },
  half: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48.5%',
  },
  full: {
    width: '100%',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textPrimary,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.88,
  },
});
