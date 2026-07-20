import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function ReviewsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundPrimary },
        headerTintColor: colors.champagneGold,
        headerTitleStyle: { color: colors.textPrimary },
        contentStyle: { backgroundColor: colors.backgroundPrimary },
      }}
    />
  );
}
