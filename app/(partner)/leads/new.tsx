import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { createLead } from '@/api/repositories/partnersRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { colors, radii, spacing } from '@/theme';

export default function NewLeadScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!name.trim() || !email.trim() || !consent) return;
    setLoading(true);
    try {
      await createLead({ name, email, phone, consentConfirmed: consent });
      router.back();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('leads')}</Text>
      <View style={styles.form}>
        <TextInput label={t('apply.contactName')} value={name} onChangeText={setName} />
        <TextInput
          label={t('apply.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput label={t('apply.phone')} value={phone} onChangeText={setPhone} />
        <Pressable onPress={() => setConsent((v) => !v)} style={styles.check}>
          <Text variant="body" color={consent ? 'champagneGold' : 'textSecondary'}>
            {consent ? '✓ ' : '○ '}
            {t('apply.acceptTerms')}
          </Text>
        </Pressable>
        <Button
          title={tc('actions.submit')}
          variant="gold"
          fullWidth
          loading={loading}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: spacing.xl, gap: spacing.lg },
  check: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
