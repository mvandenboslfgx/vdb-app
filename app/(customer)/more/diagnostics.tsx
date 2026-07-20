import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getRepositoryAdapter } from '@/api/repositories/_utils';
import { Button, Screen, Text } from '@/design-system';
import { clientEnv, isDevelopment } from '@/config/env';
import { getSupabase } from '@/lib/supabase';
import { isFeatureEnabled } from '@/security/featureFlags';
import { colors, radii, spacing } from '@/theme';

type ProbeStatus = 'idle' | 'checking' | 'ok' | 'fail' | 'n/a';

interface ProbeRow {
  label: string;
  value: string;
  status?: ProbeStatus;
}

function hostOnly(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '(invalid-url)';
  }
}

/**
 * Development-only diagnostics. Preview/production must never expose this route
 * as a public entry — gated by APP_ENV at render time.
 */
export default function DevDiagnosticsScreen() {
  const { t } = useTranslation('common');
  const [authStatus, setAuthStatus] = useState<ProbeStatus>('idle');
  const [authDetail, setAuthDetail] = useState('—');
  const [dbStatus, setDbStatus] = useState<ProbeStatus>('idle');
  const [dbDetail, setDbDetail] = useState('—');
  const [realtimeStatus, setRealtimeStatus] = useState<ProbeStatus>('idle');
  const [storageStatus, setStorageStatus] = useState<ProbeStatus>('idle');

  const runProbes = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthStatus('fail');
      setAuthDetail('no client');
      setDbStatus('fail');
      setDbDetail('no client');
      setRealtimeStatus('n/a');
      setStorageStatus('n/a');
      return;
    }

    setAuthStatus('checking');
    setDbStatus('checking');
    setRealtimeStatus('checking');
    setStorageStatus('checking');

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setAuthStatus('fail');
        setAuthDetail(error.name);
      } else {
        setAuthStatus('ok');
        setAuthDetail(data.session ? 'session present' : 'anonymous / signed out');
      }
    } catch {
      setAuthStatus('fail');
      setAuthDetail('exception');
    }

    try {
      const { error } = await supabase.from('feature_flags').select('key').limit(1);
      if (error) {
        setDbStatus('fail');
        setDbDetail(error.code ?? 'query error');
      } else {
        setDbStatus('ok');
        setDbDetail('feature_flags readable');
      }
    } catch {
      setDbStatus('fail');
      setDbDetail('exception');
    }

    try {
      const channel = supabase.channel(`diag-${Date.now()}`);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          void supabase.removeChannel(channel);
          reject(new Error('timeout'));
        }, 4000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timer);
            void supabase.removeChannel(channel);
            resolve();
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timer);
            void supabase.removeChannel(channel);
            reject(new Error(status));
          }
        });
      });
      setRealtimeStatus('ok');
    } catch {
      setRealtimeStatus('fail');
    }

    try {
      const { error } = await supabase.storage.from('documents').list('', { limit: 1 });
      // Permission errors still prove the endpoint is reachable.
      if (error && /fetch|network|Failed to fetch/i.test(error.message)) {
        setStorageStatus('fail');
      } else {
        setStorageStatus('ok');
      }
    } catch {
      setStorageStatus('fail');
    }
  }, []);

  useEffect(() => {
    if (isDevelopment) {
      void runProbes();
    }
  }, [runProbes]);

  if (!isDevelopment) {
    return (
      <Screen testID="screen-dev-diagnostics-blocked">
        <Text variant="title">{t('diagnostics.blockedTitle')}</Text>
        <Text variant="body" color="textSecondary" style={styles.subtitle}>
          {t('diagnostics.blockedBody')}
        </Text>
      </Screen>
    );
  }

  const adapter = getRepositoryAdapter();
  const rows: ProbeRow[] = [
    { label: t('diagnostics.appEnv'), value: clientEnv.appEnv },
    { label: t('diagnostics.adapter'), value: adapter },
    { label: t('diagnostics.supabaseHost'), value: hostOnly(clientEnv.supabaseUrl) },
    { label: t('diagnostics.hasConfig'), value: String(clientEnv.hasSupabaseConfig) },
    { label: t('diagnostics.demoMode'), value: String(clientEnv.useMockData) },
    {
      label: t('diagnostics.appVersion'),
      value: Constants.expoConfig?.version ?? '—',
    },
    {
      label: t('diagnostics.buildNumber'),
      value: String(Constants.expoConfig?.android?.versionCode ?? '—'),
    },
    { label: t('diagnostics.auth'), value: authDetail, status: authStatus },
    { label: t('diagnostics.database'), value: dbDetail, status: dbStatus },
    { label: t('diagnostics.realtime'), value: realtimeStatus, status: realtimeStatus },
    { label: t('diagnostics.storage'), value: storageStatus, status: storageStatus },
    {
      label: t('diagnostics.push'),
      value: isFeatureEnabled('pushNotifications') ? 'flag on' : 'fail-closed',
    },
    {
      label: t('diagnostics.checkout'),
      value: isFeatureEnabled('mollieCheckout') ? 'flag on' : 'fail-closed',
    },
  ];

  return (
    <Screen scroll testID="screen-dev-diagnostics">
      <Text variant="title">{t('diagnostics.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('diagnostics.subtitle')}
      </Text>
      <Text variant="caption" color="warning" style={styles.warn}>
        {t('diagnostics.noSecrets')}
      </Text>

      {rows.map((row) => (
        <View key={row.label} style={styles.row} testID={`diag-row-${row.label}`}>
          <Text variant="label" color="textMuted">
            {row.label}
          </Text>
          <Text variant="body">
            {row.status && row.status !== 'idle' ? `[${row.status}] ` : ''}
            {row.value}
          </Text>
        </View>
      ))}

      <Button
        testID="btn-diagnostics-refresh"
        title={t('diagnostics.refresh')}
        variant="gold"
        onPress={() => void runProbes()}
        style={styles.refresh}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.md },
  warn: { marginBottom: spacing.lg },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  refresh: { marginTop: spacing.lg },
});
