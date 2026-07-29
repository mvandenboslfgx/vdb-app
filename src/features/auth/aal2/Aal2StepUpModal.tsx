import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Text, TextInput } from '@/design-system';
import { challengeAndVerifyTotp, type Aal2Status, isValidTotpCodeFormat } from '@/lib/auth/aal2';
import { colors, radii, spacing } from '@/theme';

export type Aal2StepUpOutcome = 'verified' | 'cancelled' | 'enrollment_required';

type Props = {
  visible: boolean;
  status: Aal2Status | null;
  onComplete: (outcome: Aal2StepUpOutcome) => void;
};

export function Aal2StepUpModal({ visible, status, onComplete }: Props) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setCode('');
      setBusy(false);
      setError(null);
    }
  }, [visible]);

  if (!visible || !status) return null;

  if (status.enrollmentRequired) {
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => onComplete('cancelled')}
      >
        <View style={styles.backdrop} testID="aal2-step-up-modal">
          <View style={styles.card}>
            <Text variant="title">{t('aal2.enrollmentTitle')}</Text>
            <Text variant="body" color="textSecondary" style={styles.body}>
              {t('aal2.enrollmentBody')}
            </Text>
            <Button
              testID="btn-aal2-enrollment-ack"
              title={tc('close')}
              variant="gold"
              onPress={() => onComplete('enrollment_required')}
            />
            <Button
              testID="btn-aal2-cancel"
              title={tc('cancel')}
              variant="secondary"
              onPress={() => onComplete('cancelled')}
            />
          </View>
        </View>
      </Modal>
    );
  }

  async function onVerify() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await challengeAndVerifyTotp(code);
      if (result.ok) {
        onComplete('verified');
        return;
      }
      if (result.code === 'enrollment_required') {
        onComplete('enrollment_required');
        return;
      }
      setError(
        result.code === 'expired_challenge'
          ? t('aal2.expired')
          : result.code === 'session'
            ? t('aal2.sessionError')
            : t('aal2.invalidCode'),
      );
    } catch {
      setError(t('aal2.sessionError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onComplete('cancelled')}>
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (!busy) onComplete('cancelled');
        }}
        testID="aal2-step-up-modal"
      >
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <Text variant="title">{t('aal2.title')}</Text>
          <Text variant="body" color="textSecondary" style={styles.body}>
            {t('aal2.body')}
          </Text>
          <TextInput
            testID="input-aal2-totp"
            label={t('aal2.codeLabel')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            secureTextEntry
            maxLength={8}
            editable={!busy}
          />
          {error ? (
            <Text testID="text-aal2-error" variant="caption" color="error">
              {error}
            </Text>
          ) : null}
          <Button
            testID="btn-aal2-verify"
            title={t('aal2.verify')}
            variant="gold"
            loading={busy}
            disabled={busy || !isValidTotpCodeFormat(code)}
            onPress={() => void onVerify()}
          />
          <Button
            testID="btn-aal2-cancel"
            title={tc('cancel')}
            variant="secondary"
            disabled={busy}
            onPress={() => onComplete('cancelled')}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  body: { marginBottom: spacing.sm },
});
