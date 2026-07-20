import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { documentsRepository } from '@/api/repositories/documentsRepository';
import { queryKeys } from '@/lib/queryClient';
import type { DocumentReviewDecisionInput } from '@/validation/documents';

export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => documentsRepository.list(),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.document(id) : ['documents', 'missing'],
    queryFn: () => documentsRepository.get(id!),
    enabled: Boolean(id),
  });
}

export function useDocumentReview(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentReviewDecisionInput) =>
      documentsRepository.submitReviewDecision(documentId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.documents });
      void qc.invalidateQueries({ queryKey: queryKeys.document(documentId) });
    },
  });
}
