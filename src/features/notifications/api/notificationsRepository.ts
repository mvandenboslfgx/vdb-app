import { delay, mockNotifications } from '@/features/_shared/mockData';
import type { NotificationItem } from '@/types';

export interface NotificationsRepository {
  list(): Promise<NotificationItem[]>;
}

class MockNotificationsRepository implements NotificationsRepository {
  async list(): Promise<NotificationItem[]> {
    await delay();
    return [...mockNotifications];
  }
}

export function createNotificationsRepository(): NotificationsRepository {
  return new MockNotificationsRepository();
}
