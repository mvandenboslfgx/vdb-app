import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/design-system/Button';
import { Text } from '@/design-system/Text';
import { TextInput } from '@/design-system/TextInput';
import { useAuth } from '@/providers/AuthProvider';
import { spacing } from '@/theme';
import { registerSchema, type RegisterInput } from '@/validation/auth';

export interface RegisterFormProps {
  onSuccess?: (result: { needsEmailConfirmation: boolean }) => void;
  onSignIn?: () => void;
}

export function RegisterForm({ onSuccess, onSignIn }: RegisterFormProps) {
  const { t } = useTranslation(['auth', 'errors', 'common']);
  const { signUp, isDemoMode } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: undefined as unknown as true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await signUp({
        email: values.email.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || undefined,
      });
      onSuccess?.(result);
    } catch (err) {
      const key = err instanceof Error ? err.message : 'errors.generic';
      setFormError(
        t(key.startsWith('errors.') ? key : isDemoMode ? 'errors.auth.demoOnly' : 'errors.generic'),
      );
    }
  });

  return (
    <View style={styles.form}>
      <View style={styles.header}>
        <Text variant="title">{t('auth:register.title')}</Text>
        <Text variant="body" color="textSecondary">
          {t('auth:register.subtitle')}
        </Text>
      </View>

      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:register.fullName')}
            placeholder={t('auth:register.fullNamePlaceholder')}
            autoComplete="name"
            textContentType="name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.fullName?.message ? t(errors.fullName.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:register.email')}
            placeholder={t('auth:register.emailPlaceholder')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message ? t(errors.email.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:register.phone')}
            placeholder={t('auth:register.phonePlaceholder')}
            hint={t('common:optional')}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.phone?.message ? t(errors.phone.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:register.password')}
            placeholder={t('auth:register.passwordPlaceholder')}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message ? t(errors.password.message) : undefined}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:register.confirmPassword')}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message ? t(errors.confirmPassword.message) : undefined}
          />
        )}
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => {
          const next = !accepted;
          setAccepted(next);
          setValue('acceptTerms', next as true, { shouldValidate: true });
        }}
        style={styles.termsRow}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxChecked]} />
        <Text variant="body" color="textSecondary" style={styles.termsText}>
          {t('auth:register.acceptTerms')}
        </Text>
      </Pressable>
      {errors.acceptTerms?.message ? (
        <Text variant="caption" color="error">
          {t(errors.acceptTerms.message)}
        </Text>
      ) : null}

      {formError ? (
        <Text variant="caption" color="error">
          {formError}
        </Text>
      ) : null}

      <Button
        title={t('auth:register.submit')}
        variant="gold"
        fullWidth
        loading={isSubmitting}
        onPress={onSubmit}
      />

      <View style={styles.footer}>
        <Text variant="body" color="textSecondary">
          {t('auth:register.haveAccount')}{' '}
        </Text>
        <Pressable onPress={onSignIn} accessibilityRole="link">
          <Text variant="body" color="champagneGold" weight="semibold">
            {t('auth:register.signIn')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#3A3A3E',
    borderRadius: 6,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#C7A66A',
    borderColor: '#C7A66A',
  },
  termsText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
});
