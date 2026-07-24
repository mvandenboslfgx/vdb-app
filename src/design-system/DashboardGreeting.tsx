import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/design-system/Text';
import { spacing, typography } from '@/theme';

export interface DashboardGreetingProps {
  fullName?: string | null;
  now?: Date;
  testID?: string;
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? '';
}

function greetingKey(hour: number): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

/** Time-based greeting with profile first name; never shows roles or seed codes. */
export function DashboardGreeting({
  fullName,
  now = new Date(),
  testID = 'dashboard-greeting',
}: DashboardGreetingProps) {
  const { t } = useTranslation('customer');
  const name = firstName(fullName ?? '');
  const key = useMemo(() => greetingKey(now.getHours()), [now]);

  const title = name
    ? t(`dashboard.${key}`, { name })
    : t('dashboard.greetingWelcomeBack');

  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="header">
      <Text style={styles.title} weight="medium" maxFontSizeMultiplier={1.35}>
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.context} maxFontSizeMultiplier={1.4}>
        {t('dashboard.greetingContext')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.size.greeting,
    lineHeight: typography.size.greeting * typography.lineHeight.tight,
    color: '#F5F5F3',
  },
  context: {
    maxWidth: 340,
  },
});
