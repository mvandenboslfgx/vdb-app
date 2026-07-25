import { mockStore } from '@/api/mockData';
import { delay, shouldUseMockApi } from '@/api/repositories/_utils';
import { DomainError } from '@/lib/errors';
import type { Appointment, AppointmentSlot } from '@/types/domain';

export async function listAppointments(): Promise<Appointment[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.appointments];
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:appointments');
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.appointments.find((a) => a.id === id) ?? null;
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:appointments');
}

/**
 * List slots that are still bookable (RLS also enforces `is_bookable = true`
 * for non-staff, this filter just avoids fetching rows the caller cannot
 * book anyway).
 */
export async function listAvailableSlots(): Promise<AppointmentSlot[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [];
  }
  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:appointments');
}

export interface BookSlotInput {
  slotId: string;
  title: string;
  notes?: string;
}

/**
 * Book a slot via the `book_appointment_slot` SECURITY DEFINER RPC. The
 * database performs the atomic capacity check + booked_count claim -- this
 * repository never writes to `availability_slots` directly.
 */
export async function bookSlot(input: BookSlotInput): Promise<Appointment> {
  if (shouldUseMockApi()) {
    await delay();
    const appointment: Appointment = {
      id: `appt-${Date.now()}`,
      title: input.title,
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      status: 'requested',
      location: null,
      timezone: 'Europe/Amsterdam',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.appointments.push(appointment);
    return appointment;
  }

  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:appointments');
}

/**
 * Cancel an appointment via the `cancel_appointment` SECURITY DEFINER RPC.
 * Freeing the linked slot's `booked_count` is handled by the
 * `trg_appointment_slot_capacity` trigger, not by this repository.
 */
export async function cancelAppointment(id: string, reason?: string): Promise<Appointment> {
  if (shouldUseMockApi()) {
    await delay();
    const appointment = mockStore.appointments.find((a) => a.id === id);
    if (!appointment) throw DomainError.notFound('Appointment not found');
    appointment.status = 'cancelled';
    appointment.updatedAt = new Date().toISOString();
    return { ...appointment };
  }

  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:appointments');
}

export async function requestAppointment(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string | null;
}): Promise<Appointment> {
  if (shouldUseMockApi()) {
    await delay();
    const appointment: Appointment = {
      id: `appt-${Date.now()}`,
      title: input.title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: 'requested',
      location: input.location ?? null,
      timezone: 'Europe/Amsterdam',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockStore.appointments.push(appointment);
    return appointment;
  }

  throw DomainError.configuration('CONTRACT_SURFACE_UNAVAILABLE:appointments');
}

export const appointmentsRepository = {
  list: listAppointments,
  get: getAppointment,
  request: requestAppointment,
  listAvailableSlots,
  bookSlot,
  cancelAppointment,
};
