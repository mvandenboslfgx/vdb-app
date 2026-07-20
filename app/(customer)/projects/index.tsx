import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { listProjects } from '@/api/repositories/projectsRepository';
import {
  Button,
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import type { Project } from '@/types/domain';
import { spacing } from '@/theme';

export default function ProjectsScreen() {
  const { t } = useTranslation('projects');
  const { t: tc } = useTranslation('common');
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setProjects(await listProjects());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label={t('loading')} />;
  if (error) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll>
      <Text variant="title" style={styles.title}>
        {t('title')}
      </Text>
      <Button
        title={t('requestCta')}
        variant="secondary"
        style={styles.cta}
        onPress={() => router.push('/(customer)/projects/request')}
      />
      {projects.length === 0 ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyHint')}
          actionLabel={t('requestCta')}
          onAction={() => router.push('/(customer)/projects/request')}
        />
      ) : (
        projects.map((project) => (
          <ListRow
            key={project.id}
            title={project.title}
            subtitle={project.description}
            right={<StatusPill label={t(`status.${project.status}`)} tone="gold" />}
            onPress={() => router.push(`/(customer)/projects/${project.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.md },
  cta: { marginBottom: spacing.lg },
});
