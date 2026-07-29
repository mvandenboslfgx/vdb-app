import { colors } from '@/theme';

/** Shared Stack chrome for nested feature stacks (no default route-segment titles). */
export const premiumStackScreenOptions = {
  headerStyle: { backgroundColor: colors.backgroundPrimary },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.backgroundPrimary },
  headerBackTitle: '',
} as const;

/** List/index screens that render their own in-content title must hide the Stack header. */
export const stackIndexHiddenHeader = {
  headerShown: false,
} as const;
