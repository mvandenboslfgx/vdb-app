import { useQuery } from '@tanstack/react-query';

import { createNotificationsRepository } from '@/features/notifications/api/notificationsRepository';
import { queryKeys } from '@/lib/queryClient';

const repo = createNotificationsRepository();

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => repo.list(),
  });
}
