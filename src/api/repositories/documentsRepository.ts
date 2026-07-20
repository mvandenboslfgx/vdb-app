import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { getSupabase } from '@/lib/supabase';
import type { Document, DocumentStatus } from '@/types/domain';
import type { DocumentReviewDecisionInput } from '@/validation/documents';

export async function listDocuments(): Promise<Document[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.documents];
  }
  const supabase = getSupabase();
  if (!supabase) return [...mockStore.documents];
  const { data, error } = await supabase.from('documents').select('*').order('updated_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Document[];
}

export async function getDocument(id: string): Promise<Document | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.documents.find((d) => d.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return mockStore.documents.find((d) => d.id === id) ?? null;
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Document | null;
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
    if (!doc) throw new Error('Document not found');
    doc.status = status;
    doc.updatedAt = new Date().toISOString();
    return { ...doc };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('documents')
    .update({ status, review_comment: input.comment ?? null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Document;
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
