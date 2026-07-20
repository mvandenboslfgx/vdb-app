import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

export default function AuthLayout() {
  const { t } = useTranslation('auth');

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundPrimary },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.backgroundPrimary },
      }}
    >
      <Stack.Screen name="login" options={{ title: t('login.title') }} />
      <Stack.Screen name="register" options={{ title: t('register.title') }} />
      <Stack.Screen name="forgot-password" options={{ title: t('forgot.title') }} />
      <Stack.Screen name="verify-email" options={{ title: t('verify.title') }} />
      <Stack.Screen name="reset-password" options={{ title: t('reset.title') }} />
    </Stack>
  );
}
