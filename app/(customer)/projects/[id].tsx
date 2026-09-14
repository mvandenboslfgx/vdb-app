import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getProject, listMilestones, listUpdates } from '@/api/repositories/projectsRepository';
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  Screen,
  SectionHeader,
  StatusPill,
  Text,
} from '@/design-system';
import type { Project, ProjectMilestone, ProjectUpdate } from '@/types/domain';
import { colors, spacing } from '@/theme';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation('projects');
  const { t: tc } = useTranslation('common');
  const { t: td } = useTranslation('documents');
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
      const [p, m, u] = await Promise.all([getProject(id), listMilestones(id), listUpdates(id)]);
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
      <Button
        testID="btn-project-upload-document"
        title={td('upload')}
        variant="secondary"
        style={styles.uploadCta}
        onPress={() => router.push(`/(customer)/documents/upload?projectId=${project.id}`)}
      />
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

      <SectionHeader title={t('milestones')} />
      {milestones.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('noUpdates')}
        </Text>
      ) : (
        <Card style={styles.listCard}>
          {milestones.map((m, index) => (
            <View
              key={m.id}
              style={[styles.milestoneRow, index > 0 && styles.milestoneRowDivider]}
            >
              <Text variant="body" color="textSecondary">
                {m.title}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title={t('updates')} />
      {updates.length === 0 ? (
        <Text variant="caption" color="textMuted">
          {t('noUpdates')}
        </Text>
      ) : (
        updates.map((u) => (
          <Card key={u.id} style={styles.update}>
            <Text variant="body" weight="medium">
              {u.title}
            </Text>
            <Text variant="caption" color="textSecondary">
              {u.body}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, marginBottom: spacing.lg },
  uploadCta: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
  body: { marginBottom: spacing.md },
  meta: { marginTop: spacing.sm },
  listCard: { padding: 0, overflow: 'hidden' },
  milestoneRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  milestoneRowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  update: { gap: spacing.xs, marginBottom: spacing.md },
});
