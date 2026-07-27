import { mockStore } from '@/api/mockData';
import { fromOwnerTable, rpcOwner } from '@/api/contract/ownerClient';
import { mapPortalAppointment } from '@/api/contract/portalMappers';
import { delay, requireLiveSupabase, shouldUseMockApi } from '@/api/repositories/_utils';
import { resolveCallerOrganizationId } from '@/api/repositories/_org';
import { DomainError, fromSupabaseError } from '@/lib/errors';
import type { Appointment, AppointmentSlot } from '@/types/domain';

type OwnerRow = Record<string, unknown>;

function isOwnerRow(value: unknown): value is OwnerRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function listAppointments(): Promise<Appointment[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [...mockStore.appointments];
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'appointments')
    .select('*')
    .order('starts_at', { ascending: true });
  if (error) throw fromSupabaseError(error);
  return (data ?? []).filter(isOwnerRow).map(mapPortalAppointment);
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  if (shouldUseMockApi()) {
    await delay();
    return mockStore.appointments.find((a) => a.id === id) ?? null;
  }
  const supabase = requireLiveSupabase();
  const { data, error } = await fromOwnerTable(supabase, 'appointments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw fromSupabaseError(error);
  return data && isOwnerRow(data) ? mapPortalAppointment(data) : null;
}

/**
 * `availability_slots` does not exist in rc.3 -- there is no owner surface to
 * query. This is an authoritative "no slots" answer, not an unavailable
 * surface, so it never throws `CONTRACT_SURFACE_UNAVAILABLE`.
 */
export async function listAvailableSlots(): Promise<AppointmentSlot[]> {
  if (shouldUseMockApi()) {
    await delay();
    return [];
  }
  return [];
}

export interface BookSlotInput {
  slotId: string;
  title: string;
  notes?: string;
}

/**
 * Legacy slot-based booking API. `availability_slots` / `book_appointment_slot`
 * (the old capacity-claim RPC) no longer exist in rc.3 -- live callers must
 * surface `FEATURE_DISABLED` as a configuration error rather than crash.
 * Use `requestAppointment` (-> `book_portal_appointment`) instead.
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

  throw DomainError.configuration('FEATURE_DISABLED:appointments_booking');
}

/**
 * Cancels an appointment via `cancel_portal_appointment`. Fails closed with
 * `FEATURE_DISABLED` (mapped from the RPC exception) while
 * `appointments_booking` remains off.
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

  const supabase = requireLiveSupabase();
  const { data, error } = await rpcOwner(supabase, 'cancel_appointment', {
    p_appointment_id: id,
    p_reason: reason ?? undefined,
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) return mapPortalAppointment(data);

  const appointment = await getAppointment(id);
  if (!appointment) throw DomainError.notFound('Appointment not found');
  return appointment;
}

/**
 * Requests a new appointment via `book_portal_appointment` once the caller's
 * organization can be resolved. Fails closed with `FEATURE_DISABLED` (mapped
 * from the RPC exception) while `appointments_booking` remains off -- never
 * crashes.
 */
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

  const supabase = requireLiveSupabase();
  const organizationId = await resolveCallerOrganizationId(supabase);
  const { data, error } = await rpcOwner(supabase, 'book_appointment_slot', {
    p_organization_id: organizationId,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_timezone: 'Europe/Amsterdam',
    p_location: input.location ?? undefined,
  });
  if (error) throw fromSupabaseError(error);
  if (isOwnerRow(data)) return mapPortalAppointment(data);

  const appointmentId = typeof data === 'string' ? data : null;
  if (appointmentId) {
    const booked = await getAppointment(appointmentId);
    if (booked) return booked;
  }
  throw DomainError.configuration('Owner appointment response has an unexpected shape.');
}

export const appointmentsRepository = {
  list: listAppointments,
  get: getAppointment,
  request: requestAppointment,
  listAvailableSlots,
  bookSlot,
  cancelAppointment,
};
