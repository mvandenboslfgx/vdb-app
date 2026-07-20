import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { createLead } from '@/api/repositories/partnersRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { DomainError } from '@/lib/errors';
import { colors, radii, spacing } from '@/theme';

export default function NewLeadScreen() {
  const { t } = useTranslation('partners');
  const { t: tc } = useTranslation('common');
  const { t: te } = useTranslation('errors');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!name.trim() || !email.trim() || !consent || loading) return;
    setError(null);
    setLoading(true);
    try {
      await createLead({
        name,
        email,
        phone: phone || undefined,
        interest: interest || undefined,
        notes: notes || undefined,
        consentConfirmed: consent,
      });
      router.back();
    } catch (err) {
      setError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll testID="screen-lead-new">
      <Text variant="title">{t('leads')}</Text>
      <View style={styles.form}>
        <TextInput
          testID="input-lead-name"
          label={t('apply.contactName')}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          testID="input-lead-email"
          label={t('apply.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="input-lead-phone"
          label={t('apply.phone')}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          testID="input-lead-interest"
          label={t('leadInterest')}
          value={interest}
          onChangeText={setInterest}
        />
        <TextInput
          testID="input-lead-notes"
          label={t('leadNotes')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Pressable
          testID="check-lead-consent"
          onPress={() => setConsent((v) => !v)}
          style={styles.check}
        >
          <Text variant="body" color={consent ? 'champagneGold' : 'textSecondary'}>
            {consent ? '\u2713 ' : '\u25CB '}
            {t('leadConsent')}
          </Text>
        </Pressable>
        {error ? (
          <Text testID="text-lead-error" variant="caption" color="error">
            {error}
          </Text>
        ) : null}
        <Button
          testID="btn-lead-submit"
          title={tc('actions.submit')}
          variant="gold"
          fullWidth
          loading={loading}
          disabled={!name.trim() || !email.trim() || !consent || loading}
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