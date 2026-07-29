import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { submitPartnerApplication } from '@/api/repositories/partnersRepository';
import { Button, Screen, Text, TextInput } from '@/design-system';
import { colors, radii, spacing } from '@/theme';
import { partnerApplicationSchema, type CanonicalPartnerType } from '@/validation/partner';

export default function PartnerApplyScreen() {
  const { t } = useTranslation('partners');
  const { t: te } = useTranslation('errors');
  const router = useRouter();
  const [partnerType, setPartnerType] = useState<CanonicalPartnerType | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [kvkNumber, setKvkNumber] = useState('');
  const [motivation, setMotivation] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit() {
    setFormError(null);
    const parsed = partnerApplicationSchema.safeParse({
      partnerType: partnerType ?? undefined,
      companyName,
      contactName,
      email,
      phone,
      kvkNumber: partnerType === 'INDIVIDUAL' ? '' : kvkNumber,
      motivation,
      acceptPartnerTerms: acceptTerms ? true : undefined,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = typeof issue?.message === 'string' ? issue.message : 'errors.validation.generic';
      setFormError(key.startsWith('errors.') ? te(key.replace(/^errors\./, '') as never) : key);
      return;
    }
    setLoading(true);
    try {
      await submitPartnerApplication(parsed.data);
      setDone(true);
    } catch {
      setFormError(te('generic'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Screen testID="screen-partner-apply-success">
        <Text variant="title">{t('apply.success')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('apply.pendingHint')}
        </Text>
        <Button
          testID="btn-partner-apply-done"
          title={t('title')}
          variant="gold"
          style={styles.cta}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="screen-partner-apply">
      <Text variant="title">{t('apply.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('apply.subtitle')}
      </Text>
      <View style={styles.form}>
        <Text variant="subtitle">{t('apply.partnerType')}</Text>
        <View style={styles.typeRow}>
          <Button
            testID="btn-partner-type-individual"
            title={t('apply.typeIndividual')}
            variant={partnerType === 'INDIVIDUAL' ? 'gold' : 'secondary'}
            size="sm"
            onPress={() => {
              setPartnerType('INDIVIDUAL');
              setKvkNumber('');
            }}
          />
          <Button
            testID="btn-partner-type-business"
            title={t('apply.typeBusiness')}
            variant={partnerType === 'BUSINESS' ? 'gold' : 'secondary'}
            size="sm"
            onPress={() => setPartnerType('BUSINESS')}
          />
        </View>
        <Text variant="caption" color="textMuted">
          {t('apply.partnerTypeHint')}
        </Text>

        {partnerType === 'BUSINESS' ? (
          <>
            <TextInput
              testID="input-partner-apply-company"
              label={t('apply.companyNameRequired')}
              placeholder={t('apply.companyNameHint')}
              value={companyName}
              onChangeText={setCompanyName}
            />
            <TextInput
              testID="input-partner-apply-kvk"
              label={t('apply.kvkNumberRequired')}
              value={kvkNumber}
              onChangeText={setKvkNumber}
              keyboardType="number-pad"
              maxLength={8}
            />
          </>
        ) : null}

        <TextInput
          testID="input-partner-apply-contact"
          label={t('apply.contactName')}
          value={contactName}
          onChangeText={setContactName}
        />
        <TextInput
          testID="input-partner-apply-email"
          label={t('apply.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="input-partner-apply-phone"
          label={t('apply.phone')}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          testID="input-partner-apply-motivation"
          label={t('apply.motivation')}
          placeholder={t('apply.motivationPlaceholder')}
          value={motivation}
          onChangeText={setMotivation}
          multiline
          style={styles.area}
        />
        <Pressable
          testID="btn-partner-apply-accept-terms"
          onPress={() => setAcceptTerms((v) => !v)}
          style={styles.check}
        >
          <Text variant="body" color={acceptTerms ? 'champagneGold' : 'textSecondary'}>
            {acceptTerms ? '✓ ' : '○ '}
            {t('apply.acceptTerms')}
          </Text>
        </Pressable>
        {formError ? (
          <Text testID="text-partner-apply-error" variant="caption" color="error">
            {formError}
          </Text>
        ) : null}
        <Text variant="caption" color="textMuted">
          {t('apply.kycUnavailable')}
        </Text>
        <Button
          testID="btn-partner-apply-submit"
          title={t('apply.submit')}
          variant="gold"
          fullWidth
          loading={loading}
          disabled={!partnerType}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  area: { minHeight: 100, textAlignVertical: 'top' },
  check: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cta: { marginTop: spacing.xl },
});
