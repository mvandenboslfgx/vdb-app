import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

export default function MoreLayout() {
  const { t } = useTranslation('customer');
  const { t: tp } = useTranslation('partners');

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundPrimary },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('profile.title'), headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: t('profile.notifications') }} />
      <Stack.Screen name="diagnostics" options={{ title: 'Diagnostics' }} />
      <Stack.Screen name="partner-apply" options={{ title: tp('apply.title', { defaultValue: 'Partner worden' }) }} />
      <Stack.Screen name="account-deletion" options={{ title: t('profile.deleteAccount') }} />
    </Stack>
  );
}
