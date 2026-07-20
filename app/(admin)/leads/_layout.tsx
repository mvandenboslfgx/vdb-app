import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AdminLeadsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundPrimary },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
      }}
    />
  );
}