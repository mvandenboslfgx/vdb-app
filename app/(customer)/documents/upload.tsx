import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { uploadProjectDocument } from '@/api/repositories/documentsRepository';
import { listProjects } from '@/api/repositories/projectsRepository';
import { Button, ListRow, Screen, Text, TextInput } from '@/design-system';
import { DomainError } from '@/lib/errors';
import type { Project } from '@/types/domain';
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/validation/documents';
import { spacing } from '@/theme';

interface SelectedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export default function DocumentUploadScreen() {
  const { projectId: projectIdParam } = useLocalSearchParams<{ projectId?: string }>();
  const { t } = useTranslation('documents');
  const { t: te } = useTranslation('errors');
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string | null>(projectIdParam ?? null);
  const [loadingProjects, setLoadingProjects] = useState(!projectIdParam);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const loadProjects = useCallback(async () => {
    if (projectIdParam) return;
    setLoadingProjects(true);
    try {
      setProjects(await listProjects());
    } finally {
      setLoadingProjects(false);
    }
  }, [projectIdParam]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function onPickFile() {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: [...ALLOWED_UPLOAD_MIME_TYPES],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (
      !asset.mimeType ||
      !(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(asset.mimeType)
    ) {
      setError(t('uploadForm.mimeNotAllowed'));
      return;
    }
    if ((asset.size ?? 0) > MAX_UPLOAD_BYTES) {
      setError(t('uploadForm.tooLarge'));
      return;
    }
    setFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType,
      size: asset.size ?? 0,
    });
    if (!title.trim()) setTitle(asset.name);
  }

  async function onSubmit() {
    if (!file || !title.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    setProgress(0);
    try {
      await uploadProjectDocument({
        projectId,
        title: title.trim(),
        category: category.trim() || null,
        uri: file.uri,
        mimeType: file.mimeType,
        fileName: file.name,
        byteSize: file.size,
        onProgress: setProgress,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof DomainError ? err.toUserMessage() : te('generic'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Screen testID="screen-document-upload-success">
        <Text variant="title">{t('uploadForm.success')}</Text>
        <Button
          testID="btn-document-upload-done"
          title={t('title')}
          variant="gold"
          style={styles.cta}
          onPress={() => router.replace('/(customer)/documents')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll testID="screen-document-upload">
      <Text variant="title">{t('uploadForm.title')}</Text>
      <Text variant="body" color="textSecondary" style={styles.subtitle}>
        {t('uploadForm.subtitle')}
      </Text>

      <View style={styles.form}>
        {!projectIdParam ? (
          <View style={styles.projectPicker}>
            <Text variant="label" color="textSecondary">
              {t('uploadForm.project')}
            </Text>
            <ListRow
              title={t('uploadForm.noProject')}
              onPress={() => setProjectId(null)}
              right={projectId === null ? <Text color="champagneGold">✓</Text> : undefined}
            />
            {loadingProjects
              ? null
              : projects.map((p) => (
                  <ListRow
                    key={p.id}
                    title={p.title}
                    onPress={() => setProjectId(p.id)}
                    right={projectId === p.id ? <Text color="champagneGold">✓</Text> : undefined}
                  />
                ))}
          </View>
        ) : null}

        <TextInput
          testID="input-document-upload-title"
          label={t('uploadForm.docTitle')}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          testID="input-document-upload-category"
          label={t('uploadForm.category')}
          value={category}
          onChangeText={setCategory}
        />

        <Button
          testID="btn-document-upload-pick"
          title={file ? t('uploadForm.changeFile') : t('uploadForm.pickFile')}
          variant="secondary"
          onPress={() => void onPickFile()}
        />
        {file ? (
          <Text testID="text-document-upload-filename" variant="caption" color="textSecondary">
            {file.name} ({Math.ceil(file.size / 1024)} KB)
          </Text>
        ) : null}

        {progress !== null ? (
          <Text testID="text-document-upload-progress" variant="caption" color="textMuted">
            {t('uploadForm.progress', { percent: progress })}
          </Text>
        ) : null}
        {error ? (
          <Text testID="text-document-upload-error" variant="caption" color="error">
            {error}
          </Text>
        ) : null}

        <Button
          testID="btn-document-upload-submit"
          title={submitting ? t('uploadForm.uploading') : t('uploadForm.submit')}
          variant="gold"
          fullWidth
          loading={submitting}
          disabled={!file || !title.trim() || submitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.sm, marginBottom: spacing.xl },
  form: { gap: spacing.lg },
  projectPicker: { gap: spacing.sm, marginBottom: spacing.md },
  cta: { marginTop: spacing.xl },
});
