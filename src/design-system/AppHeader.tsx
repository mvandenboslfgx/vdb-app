import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { BrandMark } from '@/design-system/BrandMark';
import { colors, spacing } from '@/theme';

export interface AppHeaderProps {
  subtitle?: string;
  onNotificationsPress?: () => void;
  notificationsLabel?: string;
  showNotifications?: boolean;
  testID?: string;
}

/** Compact premium header: brand mark + optional notifications. */
export function AppHeader({
  subtitle,
  onNotificationsPress,
  notificationsLabel = 'Notifications',
  showNotifications = false,
  testID = 'app-header',
}: AppHeaderProps) {
  return (
    <View style={styles.row} testID={testID} accessibilityRole="header">
      <View style={styles.brand}>
        <BrandMark compact subtitle={subtitle} />
      </View>
      {showNotifications && onNotificationsPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notificationsLabel}
          onPress={onNotificationsPress}
          hitSlop={12}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          testID="app-header-notifications"
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  brand: {
    flex: 1,
    flexShrink: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfacePrimary,
  },
  pressed: {
    opacity: 0.85,
  },
});
