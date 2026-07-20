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
import { loginSchema, type LoginInput } from '@/validation/auth';

export interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
}

export function LoginForm({ onSuccess, onForgotPassword, onRegister }: LoginFormProps) {
  const { t } = useTranslation(['auth', 'errors', 'common']);
  const { signIn, isDemoMode } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email.trim(), values.password);
      onSuccess?.();
    } catch (err) {
      const key = err instanceof Error ? err.message : 'errors.generic';
      setFormError(t(key.startsWith('errors.') ? key : 'errors.auth.invalidCredentials'));
    }
  });

  return (
    <View style={styles.form}>
      <View style={styles.header}>
        <Text variant="title">{t('auth:login.title')}</Text>
        <Text variant="body" color="textSecondary">
          {t('auth:login.subtitle')}
        </Text>
        {isDemoMode ? (
          <Text variant="caption" color="champagneGold">
            {t('auth:login.demoHint')}
          </Text>
        ) : null}
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:login.email')}
            placeholder={t('auth:login.emailPlaceholder')}
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
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label={t('auth:login.password')}
            placeholder={t('auth:login.passwordPlaceholder')}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message ? t(errors.password.message) : undefined}
          />
        )}
      />

      {formError ? (
        <Text variant="caption" color="error">
          {formError}
        </Text>
      ) : null}

      <Button
        title={t('auth:login.submit')}
        variant="gold"
        fullWidth
        loading={isSubmitting}
        onPress={onSubmit}
      />

      <Pressable onPress={onForgotPassword} accessibilityRole="link">
        <Text variant="label" color="champagneGold" align="center">
          {t('auth:login.forgotPassword')}
        </Text>
      </Pressable>

      <View style={styles.footer}>
        <Text variant="body" color="textSecondary">
          {t('auth:login.noAccount')}{' '}
        </Text>
        <Pressable onPress={onRegister} accessibilityRole="link">
          <Text variant="body" color="champagneGold" weight="semibold">
            {t('auth:login.createAccount')}
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
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
});
