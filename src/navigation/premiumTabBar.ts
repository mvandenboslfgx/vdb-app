import type { EdgeInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/theme';

const TAB_BAR_CONTENT_HEIGHT = 56;

/** Shared premium tab bar chrome for customer / partner / admin shells. */
export function premiumTabBarOptions(insets: EdgeInsets) {
  const bottom = Math.max(insets.bottom, 8);
  return {
    headerStyle: { backgroundColor: colors.backgroundPrimary },
    headerTintColor: colors.textPrimary,
    headerShadowVisible: false,
    tabBarStyle: {
      backgroundColor: colors.tabBarBackground,
      borderTopColor: colors.tabBarBorder,
      borderTopWidth: 1,
      height: TAB_BAR_CONTENT_HEIGHT + bottom,
      paddingTop: 8,
      paddingBottom: bottom,
      elevation: 0,
      shadowOpacity: 0,
    },
    tabBarActiveTintColor: colors.champagneGold,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarLabelStyle: {
      fontSize: typography.size.xs - 1,
      fontWeight: typography.weight.medium,
      marginTop: 2,
    },
    tabBarItemStyle: {
      minHeight: 44,
      paddingVertical: 2,
    },
    sceneStyle: { backgroundColor: colors.backgroundPrimary },
  };
}

export const PREMIUM_TAB_BAR_BASE_HEIGHT = TAB_BAR_CONTENT_HEIGHT;
