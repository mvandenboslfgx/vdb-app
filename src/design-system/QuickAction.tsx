import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/design-system/Text';
import { colors, radii, spacing } from '@/theme';

export interface QuickActionProps {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  onPress: () => void;
  testID?: string;
}

export function QuickAction({ label, icon, onPress, testID }: QuickActionProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.champagneGold} />
      </View>
      <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

export function QuickActionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfacePrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  label: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
