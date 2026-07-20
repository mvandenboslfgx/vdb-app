import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { messagesRepository } from '@/api/repositories/messagesRepository';
import { queryKeys } from '@/lib/queryClient';

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => messagesRepository.listConversations(),
  });
}

export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationId ? queryKeys.messages(conversationId) : ['messages', 'missing'],
    queryFn: () => messagesRepository.listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { senderId: string; senderName: string; body: string }) =>
      messagesRepository.sendMessage({ conversationId, ...input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      void qc.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
