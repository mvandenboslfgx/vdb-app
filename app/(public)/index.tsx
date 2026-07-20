import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandMark, Button, Divider, Screen, Text } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { resolveHomeRoute } from '@/security/roles';
import { spacing } from '@/theme';

export default function PublicWelcomeScreen() {
  const { t } = useTranslation('public');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const { isDemoMode, enterDemoAs } = useAuth();

  function enterDemo(role: 'customer' | 'partner' | 'admin') {
    enterDemoAs(role);
    const roles =
      role === 'admin'
        ? (['customer', 'staff', 'admin'] as const)
        : role === 'partner'
          ? (['customer', 'partner'] as const)
          : (['customer'] as const);
    router.replace(resolveHomeRoute(roles));
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <BrandMark subtitle={t('welcome.subtitle')} />
        <Text variant="body" color="textSecondary" style={styles.tagline}>
          {t('welcome.subtitle')}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title={t('welcome.ctaLogin')}
          variant="gold"
          fullWidth
          onPress={() => router.push('/(auth)/login')}
        />
        <Button
          title={t('welcome.ctaRegister')}
          variant="secondary"
          fullWidth
          onPress={() => router.push('/(auth)/register')}
        />
        <View style={styles.links}>
          <Button
            title={t('welcome.openPrivacy')}
            variant="ghost"
            onPress={() => router.push('/(public)/privacy')}
          />
          <Button
            title={t('welcome.openTerms')}
            variant="ghost"
            onPress={() => router.push('/(public)/terms')}
          />
        </View>
      </View>

      {isDemoMode ? (
        <View style={styles.demo}>
          <Divider />
          <Text variant="label" color="champagneGold">
            {tc('demoMode')}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('welcome.demoHint')}
          </Text>
          <Button title={t('welcome.demoCustomer')} variant="secondary" fullWidth onPress={() => enterDemo('customer')} />
          <Button title={t('welcome.demoPartner')} variant="secondary" fullWidth onPress={() => enterDemo('partner')} />
          <Button title={t('welcome.demoAdmin')} variant="secondary" fullWidth onPress={() => enterDemo('admin')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing['5xl'],
    gap: spacing['2xl'],
  },
  hero: { marginTop: spacing['5xl'], gap: spacing.lg },
  tagline: { marginTop: spacing.sm },
  actions: { gap: spacing.md },
  links: { gap: spacing.xs },
  demo: { gap: spacing.md },
});
