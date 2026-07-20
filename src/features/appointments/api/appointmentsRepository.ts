import { delay, mockAppointments } from '@/features/_shared/mockData';
import type { Appointment } from '@/types';

export interface AppointmentsRepository {
  list(): Promise<Appointment[]>;
}

class MockAppointmentsRepository implements AppointmentsRepository {
  async list(): Promise<Appointment[]> {
    await delay();
    return [...mockAppointments];
  }
}

export function createAppointmentsRepository(): AppointmentsRepository {
  return new MockAppointmentsRepository();
}
