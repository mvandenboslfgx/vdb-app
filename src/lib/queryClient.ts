import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 2,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryClient = createQueryClient();

export const queryKeys = {
  profile: ['profile'] as const,
  customerDashboard: ['customer', 'dashboard'] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  conversations: ['conversations'] as const,
  messages: (id: string) => ['messages', id] as const,
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  quotes: ['quotes'] as const,
  quote: (id: string) => ['quotes', id] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,
  appointments: ['appointments'] as const,
  tickets: ['tickets'] as const,
  ticket: (id: string) => ['tickets', id] as const,
  partnerDashboard: ['partner', 'dashboard'] as const,
  leads: ['leads'] as const,
  commissions: ['commissions'] as const,
  adminDashboard: ['admin', 'dashboard'] as const,
  notifications: ['notifications'] as const,
} as const;
