import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  getProject,
  listMilestones,
  listUpdates,
} from '@/api/repositories/projectsRepository';
import {
  ErrorState,
  LoadingState,
  Screen,
  StatusPill,
  Text,
} from '@/design-system';
import type { Project, ProjectMilestone, ProjectUpdate } from '@/types/domain';
import { spacing } from '@/theme';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('projects');
  const { t: tc } = useTranslation('common');
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const [p, m, u] = await Promise.all([
        getProject(id),
        listMilestones(id),
        listUpdates(id),
      ]);
      setProject(p);
      setMilestones(m);
      setUpdates(u);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error || !project) {
    return <ErrorState title={t('error')} retryLabel={tc('retry')} onRetry={() => void load()} />;
  }

  return (
    <Screen scroll testID="screen-project-detail">
      <View style={styles.header}>
        <Text variant="title">{project.title}</Text>
        <StatusPill label={t(`status.${project.status}`)} tone="gold" />
      </View>
      <Text variant="body" color="textSecondary" style={styles.body}>
        {project.description}
      </Text>
      <Text variant="label" color="textMuted">
        {t('progress')}: {project.progressPercent}%
      </Text>
      {project.nextMilestone ? (
        <Text variant="body" style={styles.meta}>
          {t('nextMilestone')}: {project.nextMilestone}
        </Text>
      ) : null}

      <Text variant="subtitle" style={styles.section}>
        {t('milestones')}
      </Text>
      {milestones.map((m) => (
        <Text key={m.id} variant="body" color="textSecondary" style={styles.row}>
          {m.title}
        </Text>
      ))}

      <Text variant="subtitle" style={styles.section}>
        {t('updates')}
      </Text>
      {updates.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('noUpdates')}
        </Text>
      ) : (
        updates.map((u) => (
          <View key={u.id} style={styles.update}>
            <Text variant="body" weight="medium">
              {u.title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {u.body}
            </Text>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.lg },
  body: { marginBottom: spacing.md },
  meta: { marginTop: spacing.sm },
  section: { marginTop: spacing['2xl'], marginBottom: spacing.md },
  row: { marginBottom: spacing.sm },
  update: { gap: spacing.xs, marginBottom: spacing.lg },
});
