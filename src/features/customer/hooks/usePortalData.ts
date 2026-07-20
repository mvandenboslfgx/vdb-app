import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  appointmentsRepository,
  documentsRepository,
  invoicesRepository,
  messagesRepository,
  quotesRepository,
  supportRepository,
} from '@/api/repositories';

export function useQuotes() {
  return useQuery({ queryKey: ['customer', 'quotes'], queryFn: quotesRepository.list });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['customer', 'quotes', id],
    queryFn: () => quotesRepository.get(id),
    enabled: Boolean(id),
  });
}

export function useQuoteActions() {
  const qc = useQueryClient();
  return {
    accept: useMutation({
      mutationFn: quotesRepository.accept,
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      },
    }),
    reject: useMutation({
      mutationFn: (id: string) => quotesRepository.reject(id),
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      },
    }),
  };
}

export function useInvoices() {
  return useQuery({ queryKey: ['customer', 'invoices'], queryFn: invoicesRepository.list });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['customer', 'invoices', id],
    queryFn: () => invoicesRepository.get(id),
    enabled: Boolean(id),
  });
}

export function useInvoiceCheckout() {
  return useMutation({ mutationFn: invoicesRepository.startCheckout });
}

export function useConversations() {
  return useQuery({
    queryKey: ['customer', 'conversations'],
    queryFn: messagesRepository.listConversations,
  });
}

export function useConversationMessages(id: string) {
  return useQuery({
    queryKey: ['customer', 'messages', id],
    queryFn: () => messagesRepository.getMessages(id),
    enabled: Boolean(id),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => messagesRepository.send(conversationId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'messages', conversationId] });
      await qc.invalidateQueries({ queryKey: ['customer', 'conversations'] });
    },
  });
}

export function useDocuments() {
  return useQuery({ queryKey: ['customer', 'documents'], queryFn: documentsRepository.list });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['customer', 'documents', id],
    queryFn: () => documentsRepository.get(id),
    enabled: Boolean(id),
  });
}

export function useAppointments() {
  return useQuery({
    queryKey: ['customer', 'appointments'],
    queryFn: appointmentsRepository.list,
  });
}

export function useSupportTickets() {
  return useQuery({ queryKey: ['customer', 'support'], queryFn: supportRepository.list });
}

export function useSupportTicket(id: string) {
  return useQuery({
    queryKey: ['customer', 'support', id],
    queryFn: () => supportRepository.get(id),
    enabled: Boolean(id),
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: supportRepository.create,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'support'] });
    },
  });
}
