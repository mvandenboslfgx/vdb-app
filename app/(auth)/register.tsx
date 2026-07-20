import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text, TextInput } from '@/design-system';
import { useAuth } from '@/providers/AuthProvider';
import { resolveHomeRoute } from '@/security/roles';
import { colors, radii, spacing } from '@/theme';
import { registerSchema } from '@/validation/auth';

export default function RegisterScreen() {
  const { t } = useTranslation('auth');
  const { t: te } = useTranslation('errors');
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const parsed = registerSchema.safeParse({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      acceptTerms: acceptTerms ? true : undefined,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? te('generic');
      setError(msg.startsWith('errors.') ? te(msg.replace(/^errors\./, '') as 'generic') : msg);
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || undefined,
      });
      if (result.needsEmailConfirmation) {
        router.replace('/(auth)/verify-email');
      } else {
        router.replace(resolveHomeRoute(['customer']));
      }
    } catch {
      setError(te('auth.userExists'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('register.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('register.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput
          label={t('register.fullName')}
          placeholder={t('register.fullNamePlaceholder')}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          label={t('register.email')}
          placeholder={t('register.emailPlaceholder')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          label={t('register.phone')}
          placeholder={t('register.phonePlaceholder')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          label={t('register.password')}
          placeholder={t('register.passwordPlaceholder')}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          label={t('register.confirmPassword')}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <Pressable
          onPress={() => setAcceptTerms((v) => !v)}
          style={[styles.check, acceptTerms && styles.checkOn]}
        >
          <Text variant="body" color={acceptTerms ? 'champagneGold' : 'textSecondary'}>
            {acceptTerms ? '✓ ' : '○ '}
            {t('register.acceptTerms')}
          </Text>
        </Pressable>
        {error ? (
          <Text variant="caption" color="error">
            {error}
          </Text>
        ) : null}
        <Button
          title={t('register.submit')}
          onPress={() => void onSubmit()}
          loading={loading}
          variant="gold"
          fullWidth
        />
        <Link href="/(auth)/login">
          <Text variant="body" color="textSecondary" align="center">
            {t('register.haveAccount')} {t('register.signIn')}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  check: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  checkOn: { borderColor: colors.champagneGoldDim },
});
