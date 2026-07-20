import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { submitPartnerApplication } from '@/api/repositories/partnersRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { colors, radii, spacing } from '@/theme';

export default function PartnerApplyScreen() {
  const { t } = useTranslation('partners');
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [motivation, setMotivation] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit() {
    if (!companyName.trim() || !contactName.trim() || !email.trim() || !acceptTerms) return;
    setLoading(true);
    try {
      await submitPartnerApplication({
        companyName,
        contactName,
        email,
        phone,
        motivation,
      });
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen>
        <Text variant="title">{t('apply.success')}</Text>
        <Button
          title={t('title')}
          variant="gold"
          style={styles.cta}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">{t('apply.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('apply.subtitle')}
      </Text>
      <View style={styles.form}>
        <TextInput label={t('apply.companyName')} value={companyName} onChangeText={setCompanyName} />
        <TextInput label={t('apply.contactName')} value={contactName} onChangeText={setContactName} />
        <TextInput
          label={t('apply.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput label={t('apply.phone')} value={phone} onChangeText={setPhone} />
        <TextInput
          label={t('apply.motivation')}
          placeholder={t('apply.motivationPlaceholder')}
          value={motivation}
          onChangeText={setMotivation}
          multiline
          style={styles.area}
        />
        <Pressable onPress={() => setAcceptTerms((v) => !v)} style={styles.check}>
          <Text variant="body" color={acceptTerms ? 'champagneGold' : 'textSecondary'}>
            {acceptTerms ? '✓ ' : '○ '}
            {t('apply.acceptTerms')}
          </Text>
        </Pressable>
        <Button
          title={t('apply.submit')}
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
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  area: { minHeight: 100, textAlignVertical: 'top' },
  check: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cta: { marginTop: spacing.xl },
});
