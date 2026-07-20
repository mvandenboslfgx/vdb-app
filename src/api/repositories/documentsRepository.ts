import { mockStore } from '@/api/mockData';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import { mapDocument } from '@/lib/mappers';
import type { Tables } from '@/types/database.generated';
import type { Document, DocumentStatus } from '@/types/domain';
import type { DocumentReviewDecisionInput } from '@/validation/documents';

type DocumentRow = Tables<'documents'>;
type DocumentVersionRow = Tables<'document_versions'>;

async function fetchVersions(
  supabase: ReturnType<typeof requireLiveSupabase>,
  versionIds: string[],
): Promise<Map<string, DocumentVersionRow>> {
  const map = new Map<string, DocumentVersionRow>();
  if (versionIds.length === 0) return map;
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .in('id', versionIds);
  if (error) throw fromSupabaseError(error);
  for (const row of data ?? []) {
    map.set(row.id, row);
  }
  return map;
}

function toDocuments(rows: DocumentRow[], versions: Map<string, DocumentVersionRow>): Document[] {
  return rows.map((row) =>
    mapDocument(row, row.current_version_id ? versions.get(row.current_version_id) : null),
  );
}

export async function listDocuments(): Promise<Document[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.documents];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw fromSupabaseError(error);
  const rows = data ?? [];
  const versionIds = rows.map((r) => r.current_version_id).filter((id): id is string => Boolean(id));
  const versions = await fetchVersions(supabase, versionIds);
  return toDocuments(rows, versions);
}

export async function getDocument(id: string): Promise<Document | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.documents.find((d) => d.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw fromSupabaseError(error);
  if (!data) return null;
  const versions = await fetchVersions(supabase, data.current_version_id ? [data.current_version_id] : []);
  return toDocuments([data], versions)[0]!;
}

export async function submitReviewDecision(
  id: string,
  input: DocumentReviewDecisionInput,
): Promise<Document> {
  const statusMap: Record<DocumentReviewDecisionInput['decision'], DocumentStatus> = {
    approved: 'approved',
    changes_requested: 'changes_requested',
    rejected: 'rejected',
  };
  const status = statusMap[input.decision];

  if (shouldUseMockApi()) {
    await delay();
    const doc = mockStore.documents.find((d) => d.id === id);
    if (!doc) throw DomainError.notFound('Document not found');
    doc.status = status;
    doc.updatedAt = new Date().toISOString();
    return { ...doc };
  }

  const supabase = requireLiveSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw DomainError.unauthorized('You must be signed in to review a document.');
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (docError) throw fromSupabaseError(docError);
  if (!doc) throw DomainError.notFound('Document not found');
  if (!doc.current_version_id) {
    throw DomainError.validation('Document has no version to review yet.');
  }

  const { error: reviewError } = await supabase.from('document_reviews').insert({
    document_id: id,
    document_version_id: doc.current_version_id,
    reviewer_id: userData.user.id,
    decision: input.decision,
    comment: input.comment || null,
  });
  if (reviewError) throw fromSupabaseError(reviewError);

  const { data: updated, error: updateError } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (updateError) throw fromSupabaseError(updateError);

  const versions = await fetchVersions(supabase, [doc.current_version_id]);
  return toDocuments([updated], versions)[0]!;
}

/** @deprecated Prefer submitReviewDecision */
export async function reviewDocument(
  id: string,
  decision: 'approved' | 'changes_requested' | 'rejected',
  comment?: string,
): Promise<Document> {
  return submitReviewDecision(id, { decision, comment: comment ?? '' });
}

export const documentsRepository = {
  list: listDocuments,
  get: getDocument,
  submitReviewDecision,
  reviewDocument,
};
